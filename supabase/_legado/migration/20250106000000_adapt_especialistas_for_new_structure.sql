-- =====================================================
-- MIGRAÇÃO: Adaptar tabela especialistas para nova estrutura
-- Data: 2025-01-06
-- Descrição: Adapta a tabela especialistas para receber dados
--           da nova estrutura da tabela AMSespecialistas do SQL Server
--           que agora só tem: user_name, user_email, user_active
-- =====================================================

-- A tabela especialistas já existe e está bem estruturada
-- Vamos apenas garantir que os campos estão otimizados para os novos dados

-- 1. Verificar se a tabela existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'especialistas') THEN
        RAISE EXCEPTION 'Tabela especialistas não existe. Execute primeiro a migração create_especialistas_simple.sql';
    END IF;
END $$;

-- 2. Adicionar comentários para documentar o mapeamento dos campos
COMMENT ON TABLE especialistas IS 'Tabela de especialistas/consultores. Dados sincronizados da tabela AMSespecialistas do SQL Server.';

COMMENT ON COLUMN especialistas.id IS 'ID único UUID gerado pelo Supabase';
COMMENT ON COLUMN especialistas.origem IS 'Origem do registro: sql_server (sincronizado) ou manual (criado no sistema)';
COMMENT ON COLUMN especialistas.id_externo IS 'ID único gerado para registros do SQL Server (formato: AMSespecialistas|user_name|user_email)';
COMMENT ON COLUMN especialistas.codigo IS 'Campo legado - não usado para registros da nova estrutura (sempre NULL para sql_server)';
COMMENT ON COLUMN especialistas.nome IS 'Nome do especialista (mapeado de AMSespecialistas.user_name)';
COMMENT ON COLUMN especialistas.email IS 'Email do especialista (mapeado de AMSespecialistas.user_email)';
COMMENT ON COLUMN especialistas.telefone IS 'Telefone - não disponível no SQL Server (sempre NULL para sql_server)';
COMMENT ON COLUMN especialistas.cargo IS 'Cargo - não disponível no SQL Server (sempre NULL para sql_server)';
COMMENT ON COLUMN especialistas.departamento IS 'Departamento - não disponível no SQL Server (sempre NULL para sql_server)';
COMMENT ON COLUMN especialistas.empresa IS 'Empresa - não disponível no SQL Server (sempre NULL para sql_server)';
COMMENT ON COLUMN especialistas.especialidade IS 'Especialidade - não disponível no SQL Server (sempre NULL para sql_server)';
COMMENT ON COLUMN especialistas.nivel IS 'Nível - não disponível no SQL Server (sempre NULL para sql_server)';
COMMENT ON COLUMN especialistas.observacoes IS 'Observações - não disponível no SQL Server (sempre NULL para sql_server)';
COMMENT ON COLUMN especialistas.status IS 'Status do especialista (mapeado de AMSespecialistas.user_active: true=ativo, false=inativo)';
COMMENT ON COLUMN especialistas.autor_id IS 'ID do usuário que criou o registro (NULL para registros do sql_server)';
COMMENT ON COLUMN especialistas.autor_nome IS 'Nome do autor (sempre "SQL Server Sync" para registros do sql_server)';

-- 3. Garantir que os índices estão otimizados para as consultas mais comuns
-- (Os índices já foram criados na migração anterior, mas vamos garantir)

-- Índice para busca por origem (importante para filtrar sql_server vs manual)
CREATE INDEX IF NOT EXISTS idx_especialistas_origem ON especialistas(origem);

-- Índice para busca por status (ativo/inativo)
CREATE INDEX IF NOT EXISTS idx_especialistas_status ON especialistas(status);

-- Índice para busca por nome (campo mais usado em buscas)
CREATE INDEX IF NOT EXISTS idx_especialistas_nome ON especialistas(nome);

-- Índice para busca por email
CREATE INDEX IF NOT EXISTS idx_especialistas_email ON especialistas(email);

-- Índice único para id_externo (evita duplicatas na sincronização)
CREATE UNIQUE INDEX IF NOT EXISTS unique_especialistas_id_externo ON especialistas(id_externo) WHERE id_externo IS NOT NULL;

-- Índice composto para consultas por origem e status
CREATE INDEX IF NOT EXISTS idx_especialistas_origem_status ON especialistas(origem, status);

-- 4. Criar função para validar dados de especialistas do SQL Server
CREATE OR REPLACE FUNCTION validate_especialista_sql_server()
RETURNS TRIGGER AS $$
BEGIN
    -- Se for registro do SQL Server, aplicar validações específicas
    IF NEW.origem = 'sql_server' THEN
        -- Nome é obrigatório
        IF NEW.nome IS NULL OR trim(NEW.nome) = '' THEN
            RAISE EXCEPTION 'Nome é obrigatório para especialistas do SQL Server';
        END IF;
        
        -- id_externo deve seguir o padrão esperado
        IF NEW.id_externo IS NULL OR NEW.id_externo NOT LIKE 'AMSespecialistas|%' THEN
            RAISE EXCEPTION 'id_externo deve seguir o padrão AMSespecialistas|nome|email para registros do SQL Server';
        END IF;
        
        -- autor_nome deve ser "SQL Server Sync"
        IF NEW.autor_nome != 'SQL Server Sync' THEN
            NEW.autor_nome := 'SQL Server Sync';
        END IF;
        
        -- codigo deve ser NULL (não existe mais na nova estrutura)
        NEW.codigo := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar trigger para validação automática
DROP TRIGGER IF EXISTS trigger_validate_especialista_sql_server ON especialistas;
CREATE TRIGGER trigger_validate_especialista_sql_server
    BEFORE INSERT OR UPDATE ON especialistas
    FOR EACH ROW
    EXECUTE FUNCTION validate_especialista_sql_server();

-- 6. Criar função para estatísticas de especialistas
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

-- 7. Criar view para facilitar consultas de especialistas do SQL Server
CREATE OR REPLACE VIEW v_especialistas_sql_server AS
SELECT 
    id,
    id_externo,
    nome,
    email,
    status,
    created_at,
    updated_at,
    -- Extrair componentes do id_externo para facilitar análises
    split_part(id_externo, '|', 2) as nome_original,
    split_part(id_externo, '|', 3) as email_original
FROM especialistas 
WHERE origem = 'sql_server'
ORDER BY nome;

-- 8. Criar view para especialistas ativos (mais usada)
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

-- 9. Adicionar política RLS para a view (se necessário)
-- As views herdam as políticas da tabela base, mas vamos garantir

-- 10. Criar tabela de log se não existir (ANTES de inserir)
CREATE TABLE IF NOT EXISTS public.migration_log (
    id SERIAL PRIMARY KEY,
    migration_name TEXT UNIQUE NOT NULL,
    description TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Log da migração
INSERT INTO public.migration_log (migration_name, description, executed_at)
VALUES (
    '20250106000000_adapt_especialistas_for_new_structure',
    'Adaptação da tabela especialistas para nova estrutura da AMSespecialistas (sem user_id)',
    NOW()
) ON CONFLICT (migration_name) DO NOTHING;

-- Mensagem de sucesso
DO $$
BEGIN
    RAISE NOTICE 'Migração concluída com sucesso!';
    RAISE NOTICE 'Tabela especialistas adaptada para nova estrutura da AMSespecialistas';
    RAISE NOTICE 'Campos mapeados: user_name -> nome, user_email -> email, user_active -> status';
    RAISE NOTICE 'Funções criadas: validate_especialista_sql_server(), get_especialistas_stats()';
    RAISE NOTICE 'Views criadas: v_especialistas_sql_server, v_especialistas_ativos';
END $$;