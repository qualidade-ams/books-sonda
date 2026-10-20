-- =====================================================
-- SOLUÇÃO TEMPORÁRIA: Desabilitar triggers de auditoria para profiles
-- =====================================================
-- ⚠️ ATENÇÃO: Esta é uma solução temporária para permitir
--    a criação de usuários enquanto a correção definitiva
--    não é aplicada.
-- 
-- ⚠️ IMPORTANTE: Os logs de auditoria NÃO serão registrados
--    enquanto os triggers estiverem desabilitados!
-- =====================================================

-- Desabilitar trigger de auditoria
ALTER TABLE profiles DISABLE TRIGGER audit_profiles_trigger;

-- Desabilitar trigger de campos de auditoria
ALTER TABLE profiles DISABLE TRIGGER set_profiles_audit_fields;

-- Verificar status
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '⚠️ TRIGGERS DESABILITADOS TEMPORARIAMENTE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Os triggers de auditoria para profiles foram desabilitados.';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Agora você pode criar usuários normalmente.';
    RAISE NOTICE '❌ MAS os logs de auditoria NÃO serão registrados!';
    RAISE NOTICE '';
    RAISE NOTICE 'Para reabilitar os triggers com a correção:';
    RAISE NOTICE '1. Execute: fix_profiles_audit_trigger_null_user.sql';
    RAISE NOTICE '2. Execute: SOLUCAO_DEFINITIVA_reabilitar_triggers.sql';
    RAISE NOTICE '';
END $$;
