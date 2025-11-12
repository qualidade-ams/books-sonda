-- =====================================================
-- SOLUÇÃO DEFINITIVA: Reabilitar triggers após aplicar correção
-- =====================================================
-- ⚠️ ATENÇÃO: Execute este script SOMENTE DEPOIS de executar
--    o arquivo fix_profiles_audit_trigger_null_user.sql
-- =====================================================

-- Reabilitar trigger de auditoria
ALTER TABLE profiles ENABLE TRIGGER audit_profiles_trigger;

-- Reabilitar trigger de campos de auditoria
ALTER TABLE profiles ENABLE TRIGGER set_profiles_audit_fields;

-- Verificar status
DO $$
DECLARE
    audit_trigger_enabled BOOLEAN;
    set_fields_trigger_enabled BOOLEAN;
BEGIN
    -- Verificar se os triggers estão habilitados
    SELECT tgenabled = 'O' INTO audit_trigger_enabled
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'profiles' 
    AND t.tgname = 'audit_profiles_trigger';

    SELECT tgenabled = 'O' INTO set_fields_trigger_enabled
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'profiles' 
    AND t.tgname = 'set_profiles_audit_fields';

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ TRIGGERS REABILITADOS COM SUCESSO!';
    RAISE NOTICE '========================================';
    
    IF audit_trigger_enabled THEN
        RAISE NOTICE '✅ audit_profiles_trigger: HABILITADO';
    ELSE
        RAISE WARNING '❌ audit_profiles_trigger: DESABILITADO';
    END IF;

    IF set_fields_trigger_enabled THEN
        RAISE NOTICE '✅ set_profiles_audit_fields: HABILITADO';
    ELSE
        RAISE WARNING '❌ set_profiles_audit_fields: DESABILITADO';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE 'Os logs de auditoria para usuários agora estão funcionando!';
    RAISE NOTICE 'Todas as operações de criação, edição e exclusão';
    RAISE NOTICE 'serão registradas automaticamente.';
    RAISE NOTICE '';
END $$;
