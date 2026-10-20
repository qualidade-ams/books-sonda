-- =====================================================
-- Migração: Adicionar Triggers de Auditoria para Tabela profiles
-- Descrição: Adiciona triggers de auditoria para rastrear operações
--            de criação, edição e exclusão de usuários na tabela profiles
-- Data: 2025-01-12
-- =====================================================

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

-- Atualizar a função de auditoria para incluir profiles
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    audit_table_name TEXT;
BEGIN
    -- Lista de tabelas que devem ser auditadas
    IF TG_TABLE_NAME IN ('user_groups', 'screen_permissions', 'user_group_assignments', 'empresas_clientes', 'clientes', 'grupos_responsaveis', 'email_templates', 'historico_disparos', 'requerimentos', 'profiles') THEN
        audit_table_name := TG_TABLE_NAME;
        
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO permission_audit_logs (table_name, record_id, action, old_values, changed_by)
            VALUES (audit_table_name, OLD.id::TEXT, 'DELETE', to_jsonb(OLD), auth.uid());
            RETURN OLD;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO permission_audit_logs (table_name, record_id, action, old_values, new_values, changed_by)
            VALUES (audit_table_name, NEW.id::TEXT, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
            RETURN NEW;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO permission_audit_logs (table_name, record_id, action, new_values, changed_by)
            VALUES (audit_table_name, NEW.id::TEXT, 'INSERT', to_jsonb(NEW), auth.uid());
            RETURN NEW;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS audit_profiles_trigger ON profiles;

-- Criar trigger de auditoria para profiles
CREATE TRIGGER audit_profiles_trigger
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Adicionar trigger para campos de auditoria (created_by, updated_by)
DROP TRIGGER IF EXISTS set_profiles_audit_fields ON profiles;

CREATE TRIGGER set_profiles_audit_fields
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- Verificar se os triggers foram criados com sucesso
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'profiles' 
    AND t.tgname IN ('audit_profiles_trigger', 'set_profiles_audit_fields');
    
    IF trigger_count = 2 THEN
        RAISE NOTICE '✅ Triggers de auditoria criados com sucesso para tabela profiles';
        RAISE NOTICE '   - audit_profiles_trigger: Registra INSERT, UPDATE e DELETE';
        RAISE NOTICE '   - set_profiles_audit_fields: Preenche campos created_by e updated_by';
    ELSE
        RAISE WARNING '⚠️ Esperado 2 triggers, mas foram criados %', trigger_count;
    END IF;
END $$;

-- Registrar migração no log de auditoria
INSERT INTO permission_audit_logs (
    table_name,
    record_id,
    action,
    new_values,
    changed_by
) VALUES (
    'migration_log',
    gen_random_uuid(),
    'INSERT',
    jsonb_build_object(
        'migration_name', 'add_profiles_audit_trigger',
        'description', 'Adicionado trigger de auditoria para tabela profiles (usuários do sistema)',
        'tables_affected', ARRAY['profiles'],
        'triggers_created', ARRAY['audit_profiles_trigger', 'set_profiles_audit_fields'],
        'date', NOW()
    ),
    NULL
);

-- Mensagem final
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Migração concluída com sucesso!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Triggers de auditoria adicionados para tabela profiles';
    RAISE NOTICE 'Agora todas as operações de criação, edição e exclusão';
    RAISE NOTICE 'de usuários serão registradas automaticamente nos logs de auditoria.';
    RAISE NOTICE '';
END $$;
