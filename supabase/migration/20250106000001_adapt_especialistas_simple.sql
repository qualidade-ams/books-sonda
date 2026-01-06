-- =====================================================
-- MIGRAÇÃO SIMPLIFICADA: Adaptar tabela especialistas
-- Data: 2025-01-06
-- Descrição: Versão simplificada sem tabela de log
-- =====================================================

-- 1. Verificar se a tabela existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'especialistas') THEN
        RAISE EXCEPTION 'Tabela especialistas não existe. Execute primeiro a migração create_especialistas_simple.sql';
    END IF;
    RAISE NOTICE 'Tabela especialistas encontrada. Prosseguindo com adaptação...';
END $$;

-- 2. Adicionar comentários para documentar o mapeamento dos campos
COMMENT ON TABLE especialistas IS 'Especialistas/consultores. Sincronizado da AMSespecialistas (user_name, user_email, user_active)';
COMMENT ON COLUMN especialistas.nome IS 'Nome (mapeado de AMSespecialistas.user_name)';
COMMENT ON COLUMN especialistas.email IS 'Email (mapeado de AMSespecialistas.user_email)';
COMMENT ON COLUMN especialistas.status IS 'Status (mapeado de AMSespecialistas.user_active: true=ativo, false=inativo)';
COMMENT ON COLUMN especialistas.codigo IS 'Campo legado - sempre NULL para registros sql_server (user_id foi removido)';

-- 3. Garantir índices essenciais
CREATE INDEX IF NOT EXISTS idx_especialistas_origem ON especialistas(origem);
CREATE INDEX IF NOT EXISTS idx_especialistas_status ON especialistas(status);
CREATE INDEX IF NOT EXISTS idx_especialistas_nome ON especialistas(nome);
CREATE INDEX IF NOT EXISTS idx_especialistas_email ON especialistas(email);
CREATE UNIQUE INDEX IF NOT EXISTS unique_especialistas_id_externo ON especialistas(id_externo) WHERE id_externo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_especialistas_origem_status ON especialistas(origem, status);

-- 4. Função de validação para registros do SQL Server
CREATE OR REPLACE FUNCTION validate_especialista_sql_server()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.origem = 'sql_server' THEN
        -- Nome é obrigatório
        IF NEW.nome IS NULL OR trim(NEW.nome) = '' THEN
            RAISE EXCEPTION 'Nome é obrigatório para especialistas do SQL Server';
        END IF;
        
        -- id_externo deve seguir o padrão
        IF NEW.id_externo IS NULL OR NEW.id_externo NOT LIKE 'AMSespecialistas|%' THEN
            RAISE EXCEPTION 'id_externo deve seguir o padrão AMSespecialistas|nome|email';
        END IF;
        
        -- Ajustar campos automaticamente
        NEW.autor_nome := 'SQL Server Sync';
        NEW.codigo := NULL; -- user_id não existe mais
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar trigger
DROP TRIGGER IF EXISTS trigger_validate_especialista_sql_server ON especialistas;
CREATE TRIGGER trigger_validate_especialista_sql_server
    BEFORE INSERT OR UPDATE ON especialistas
    FOR EACH ROW
    EXECUTE FUNCTION validate_especialista_sql_server();

-- 6. Função de estatísticas
CREATE OR REPLACE FUNCTION get_especialistas_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total', COUNT(*),
        'ativos', COUNT(*) FILTER (WHERE status = 'ativo'),
        'inativos', COUNT(*) FILTER (WHERE status = 'inativo'),
        'sql_server', COUNT(*) FILTER (WHERE origem = 'sql_server'),
        'manuais', COUNT(*) FILTER (WHERE origem = 'manual'),
        'com_email', COUNT(*) FILTER (WHERE email IS NOT NULL AND email != ''),
        'sem_email', COUNT(*) FILTER (WHERE email IS NULL OR email = ''),
        'ultima_sincronizacao', MAX(updated_at) FILTER (WHERE origem = 'sql_server')
    ) INTO result
    FROM especialistas;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 7. Views úteis
CREATE OR REPLACE VIEW v_especialistas_sql_server AS
SELECT 
    id,
    id_externo,
    nome,
    email,
    status,
    created_at,
    updated_at,
    split_part(id_externo, '|', 2) as nome_original,
    split_part(id_externo, '|', 3) as email_original
FROM especialistas 
WHERE origem = 'sql_server'
ORDER BY nome;

CREATE OR REPLACE VIEW v_especialistas_ativos AS
SELECT 
    id,
    origem,
    nome,
    email,
    telefone,
    cargo,
    departamento,
    empresa,
    especialidade,
    nivel,
    created_at,
    updated_at
FROM especialistas 
WHERE status = 'ativo'
ORDER BY nome;

-- 8. Mensagem de sucesso
DO $$
BEGIN
    RAISE NOTICE '✅ Migração concluída com sucesso!';
    RAISE NOTICE '📋 Tabela especialistas adaptada para nova estrutura AMSespecialistas';
    RAISE NOTICE '🔗 Mapeamento: user_name->nome, user_email->email, user_active->status';
    RAISE NOTICE '🛡️ Validação automática ativada';
    RAISE NOTICE '📊 Função de estatísticas: SELECT get_especialistas_stats();';
    RAISE NOTICE '👁️ Views criadas: v_especialistas_sql_server, v_especialistas_ativos';
END $$;