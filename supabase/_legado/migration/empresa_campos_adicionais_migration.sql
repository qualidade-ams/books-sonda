-- Migração para adicionar campos adicionais na tabela empresas_clientes
-- Campos: book_personalizado, anexo, vigencia_inicial, vigencia_final
-- Data: 2025-09-16

-- Adicionar novos campos na tabela empresas_clientes
ALTER TABLE empresas_clientes 
ADD COLUMN IF NOT EXISTS book_personalizado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS anexo BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS vigencia_inicial DATE,
ADD COLUMN IF NOT EXISTS vigencia_final DATE;

-- Adicionar comentários para documentação dos novos campos
COMMENT ON COLUMN empresas_clientes.book_personalizado IS 'Indica se a empresa usa book personalizado. Quando TRUE, não aparece no Controle de Disparos padrão, mas sim na tela Disparos Personalizados';
COMMENT ON COLUMN empresas_clientes.anexo IS 'Indica se a empresa permite anexos nos disparos personalizados. Quando TRUE, na tela Disparos Personalizados haverá opção para anexar arquivos';
COMMENT ON COLUMN empresas_clientes.vigencia_inicial IS 'Data de início da vigência do contrato da empresa';
COMMENT ON COLUMN empresas_clientes.vigencia_final IS 'Data de fim da vigência do contrato da empresa. Quando atingida, o status será automaticamente alterado para inativo';

-- Criar índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_empresas_clientes_book_personalizado ON empresas_clientes(book_personalizado);
CREATE INDEX IF NOT EXISTS idx_empresas_clientes_vigencia ON empresas_clientes(vigencia_final) WHERE vigencia_final IS NOT NULL;

-- Criar função para inativação automática por vigência
CREATE OR REPLACE FUNCTION inativar_empresas_vencidas()
RETURNS INTEGER AS $$
DECLARE
    empresas_inativadas INTEGER := 0;
BEGIN
    -- Atualizar status das empresas com vigência vencida
    UPDATE empresas_clientes 
    SET 
        status = 'inativo',
        data_status = NOW(),
        descricao_status = 'Inativado automaticamente por vigência vencida em ' || vigencia_final::text,
        updated_at = NOW()
    WHERE 
        vigencia_final IS NOT NULL 
        AND vigencia_final < CURRENT_DATE - INTERVAL '1 day'
        AND status = 'ativo';
    
    GET DIAGNOSTICS empresas_inativadas = ROW_COUNT;
    
    -- Log da operação
    INSERT INTO logs_sistema (
        operacao, 
        detalhes, 
        data_operacao
    ) VALUES (
        'inativacao_automatica_vigencia',
        'Inativadas ' || empresas_inativadas || ' empresas por vigência vencida',
        NOW()
    );
    
    RETURN empresas_inativadas;
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, registrar no log (se a tabela existir)
        BEGIN
            INSERT INTO logs_sistema (
                operacao, 
                detalhes, 
                data_operacao
            ) VALUES (
                'erro_inativacao_vigencia',
                'Erro ao inativar empresas: ' || SQLERRM,
                NOW()
            );
        EXCEPTION
            WHEN OTHERS THEN
                -- Se não conseguir nem logar, apenas retornar 0
                NULL;
        END;
        RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- Criar tabela de logs do sistema (se não existir)
CREATE TABLE IF NOT EXISTS logs_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operacao VARCHAR(100) NOT NULL,
    detalhes TEXT,
    data_operacao TIMESTAMP DEFAULT NOW()
);

-- Criar índice na tabela de logs
CREATE INDEX IF NOT EXISTS idx_logs_sistema_operacao ON logs_sistema(operacao);
CREATE INDEX IF NOT EXISTS idx_logs_sistema_data ON logs_sistema(data_operacao);

-- Adicionar comentário na tabela de logs
COMMENT ON TABLE logs_sistema IS 'Tabela para registrar logs de operações automáticas do sistema';

-- Registrar nova tela no sistema de permissões para Disparos Personalizados
INSERT INTO screens (key, name, description, category, route) VALUES
('disparos_personalizados', 'Disparos Personalizados', 'Controle de disparos para empresas com book personalizado', 'Administração', '/admin/disparos-personalizados')
ON CONFLICT (key) DO NOTHING;

-- Criar trigger para validar vigências (opcional - para garantir que vigencia_inicial <= vigencia_final)
CREATE OR REPLACE FUNCTION validar_vigencias()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar se vigência inicial não é posterior à final
    IF NEW.vigencia_inicial IS NOT NULL AND NEW.vigencia_final IS NOT NULL THEN
        IF NEW.vigencia_inicial > NEW.vigencia_final THEN
            RAISE EXCEPTION 'A vigência inicial não pode ser posterior à vigência final';
        END IF;
    END IF;
    
    -- Se está definindo uma vigência final vencida (dia anterior) e status é ativo, alertar
    IF NEW.vigencia_final IS NOT NULL AND NEW.vigencia_final < CURRENT_DATE - INTERVAL '1 day' AND NEW.status = 'ativo' THEN
        -- Permitir, mas registrar no log
        BEGIN
            INSERT INTO logs_sistema (
                operacao, 
                detalhes, 
                data_operacao
            ) VALUES (
                'vigencia_passado_definida',
                'Empresa ' || NEW.nome_completo || ' (ID: ' || NEW.id || ') teve vigência final definida no passado: ' || NEW.vigencia_final,
                NOW()
            );
        EXCEPTION
            WHEN OTHERS THEN
                -- Se não conseguir logar, continuar normalmente
                NULL;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de validação
DROP TRIGGER IF EXISTS trigger_validar_vigencias ON empresas_clientes;
CREATE TRIGGER trigger_validar_vigencias
    BEFORE INSERT OR UPDATE ON empresas_clientes
    FOR EACH ROW
    EXECUTE FUNCTION validar_vigencias();

-- Instruções para configurar execução automática da função de inativação
-- NOTA: Para execução automática diária, configure um cron job ou use pg_cron extension:
-- 
-- Exemplo com pg_cron (se disponível):
-- SELECT cron.schedule('inativar-empresas-vencidas', '0 2 * * *', 'SELECT inativar_empresas_vencidas();');
-- 
-- Ou configure um cron job no sistema operacional:
-- 0 2 * * * psql -d sua_database -c "SELECT inativar_empresas_vencidas();"

-- Atualizar comentário da tabela principal
COMMENT ON TABLE empresas_clientes IS 'Tabela de empresas clientes para o sistema de books. Inclui controle de vigência e configurações de book personalizado';

-- Exemplo de consulta para testar os novos campos
-- SELECT 
--     nome_completo,
--     status,
--     book_personalizado,
--     anexo,
--     vigencia_inicial,
--     vigencia_final,
--     CASE 
--         WHEN vigencia_final IS NOT NULL AND vigencia_final < CURRENT_DATE THEN 'VENCIDA'
--         WHEN vigencia_final IS NOT NULL AND vigencia_final <= CURRENT_DATE + INTERVAL '30 days' THEN 'VENCE_BREVE'
--         ELSE 'OK'
--     END as status_vigencia
-- FROM empresas_clientes
-- ORDER BY vigencia_final ASC NULLS LAST;
