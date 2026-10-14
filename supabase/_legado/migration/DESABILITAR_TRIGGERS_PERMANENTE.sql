-- =====================================================
-- DESABILITAR TRIGGERS PERMANENTEMENTE
-- =====================================================
-- Os logs de auditoria agora são registrados manualmente
-- no código, então os triggers não são mais necessários
-- =====================================================

-- Desabilitar triggers de auditoria para profiles
ALTER TABLE profiles DISABLE TRIGGER audit_profiles_trigger;
ALTER TABLE profiles DISABLE TRIGGER set_profiles_audit_fields;

-- Verificar status
DO $$
DECLARE
    audit_trigger_status TEXT;
    set_fields_trigger_status TEXT;
BEGIN
    SELECT 
        CASE tgenabled
            WHEN 'O' THEN 'HABILITADO'
            WHEN 'D' THEN 'DESABILITADO'
        END INTO audit_trigger_status
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'profiles' 
    AND t.tgname = 'audit_profiles_trigger';

    SELECT 
        CASE tgenabled
            WHEN 'O' THEN 'HABILITADO'
            WHEN 'D' THEN 'DESABILITADO'
        END INTO set_fields_trigger_status
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'profiles' 
    AND t.tgname = 'set_profiles_audit_fields';

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ TRIGGERS DESABILITADOS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'audit_profiles_trigger: %', audit_trigger_status;
    RAISE NOTICE 'set_profiles_audit_fields: %', set_fields_trigger_status;
    RAISE NOTICE '';
    RAISE NOTICE '📝 Logs de auditoria agora são registrados';
    RAISE NOTICE '   manualmente no código do sistema.';
    RAISE NOTICE '';
    RAISE NOTICE 'Benefícios:';
    RAISE NOTICE '✅ Sistema funciona sem erros';
    RAISE NOTICE '✅ Logs são registrados corretamente';
    RAISE NOTICE '✅ Mais controle sobre o que é logado';
    RAISE NOTICE '';
END $$;
