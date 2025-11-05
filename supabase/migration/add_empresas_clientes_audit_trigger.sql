-- Migração para adicionar trigger de auditoria à tabela empresas_clientes
-- Data: Novembro 2024
-- Descrição: Adiciona auditoria completa para operações CRUD na tabela empresas_clientes

-- Verificar se a função de auditoria existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'audit_trigger_function'
    ) THEN
        RAISE EXCEPTION 'Função audit_trigger_function não encontrada. Execute primeiro a migração grups_and_profile_migration.sql';
    END IF;
END $$;

-- Atualizar a função de auditoria para incluir empresas_clientes
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    changed_by_value UUID;
BEGIN
    -- Expandir lista de tabelas auditadas para incluir empresas_clientes
    IF TG_TABLE_NAME NOT IN ('user_groups', 'screen_permissions', 'user_group_assignments', 'empresas_clientes', 'clientes', 'grupos_responsaveis', 'email_templates', 'historico_disparos', 'requerimentos', 'profiles') THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    changed_by_value := auth.uid();

    INSERT INTO permission_audit_logs (
        table_name, record_id, action, old_values, new_values, changed_by, ip_address, user_agent
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP IN ('DELETE','UPDATE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        changed_by_value,
        inet_client_addr(),
        COALESCE(current_setting('request.headers', true)::json->>'user-agent','Unknown')
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS audit_empresas_clientes_trigger ON empresas_clientes;

-- Criar trigger de auditoria para empresas_clientes
CREATE TRIGGER audit_empresas_clientes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON empresas_clientes
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Adicionar trigger para campos de auditoria (created_by, updated_by)
DROP TRIGGER IF EXISTS set_empresas_clientes_audit_fields ON empresas_clientes;

CREATE TRIGGER set_empresas_clientes_audit_fields
    BEFORE INSERT OR UPDATE ON empresas_clientes
    FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- Verificar se os triggers foram criados com sucesso
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'empresas_clientes' 
    AND t.tgname IN ('audit_empresas_clientes_trigger', 'set_empresas_clientes_audit_fields');
    
    IF trigger_count = 2 THEN
        RAISE NOTICE 'Triggers de auditoria para empresas_clientes criados com sucesso';
    ELSE
        RAISE WARNING 'Nem todos os triggers foram criados. Esperado: 2, Encontrado: %', trigger_count;
    END IF;
END $$;

-- Log da migração
INSERT INTO permission_audit_logs (
    table_name, 
    record_id, 
    action, 
    old_values, 
    new_values, 
    changed_by,
    ip_address,
    user_agent
) VALUES (
    'migration_log',
    'add_empresas_clientes_audit_trigger',
    'MIGRATION',
    NULL,
    jsonb_build_object(
        'migration_name', 'add_empresas_clientes_audit_trigger',
        'description', 'Adicionado trigger de auditoria para tabela empresas_clientes',
        'tables_affected', ARRAY['empresas_clientes'],
        'triggers_created', ARRAY['audit_empresas_clientes_trigger', 'set_empresas_clientes_audit_fields']
    ),
    '00000000-0000-0000-0000-000000000000', -- Sistema
    '127.0.0.1',
    'Migration Script'
);

COMMIT;