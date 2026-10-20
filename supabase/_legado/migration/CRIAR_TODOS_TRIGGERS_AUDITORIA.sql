-- =====================================================
-- Criar Todos os Triggers de Auditoria Faltantes
-- =====================================================
-- Este script cria os triggers de auditoria para todas
-- as tabelas que precisam de logs de auditoria
-- =====================================================

-- 1. GRUPOS RESPONSÁVEIS
DROP TRIGGER IF EXISTS audit_grupos_responsaveis_trigger ON grupos_responsaveis;
DROP TRIGGER IF EXISTS set_grupos_responsaveis_audit_fields ON grupos_responsaveis;

CREATE TRIGGER audit_grupos_responsaveis_trigger
    AFTER INSERT OR UPDATE OR DELETE ON grupos_responsaveis
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER set_grupos_responsaveis_audit_fields
    BEFORE INSERT OR UPDATE ON grupos_responsaveis
    FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- 2. EMAIL TEMPLATES
DROP TRIGGER IF EXISTS audit_email_templates_trigger ON email_templates;
DROP TRIGGER IF EXISTS set_email_templates_audit_fields ON email_templates;

CREATE TRIGGER audit_email_templates_trigger
    AFTER INSERT OR UPDATE OR DELETE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER set_email_templates_audit_fields
    BEFORE INSERT OR UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- 3. HISTÓRICO DE DISPAROS
DROP TRIGGER IF EXISTS audit_historico_disparos_trigger ON historico_disparos;
DROP TRIGGER IF EXISTS set_historico_disparos_audit_fields ON historico_disparos;

CREATE TRIGGER audit_historico_disparos_trigger
    AFTER INSERT OR UPDATE OR DELETE ON historico_disparos
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER set_historico_disparos_audit_fields
    BEFORE INSERT OR UPDATE ON historico_disparos
    FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- 4. REQUERIMENTOS
DROP TRIGGER IF EXISTS audit_requerimentos_trigger ON requerimentos;
DROP TRIGGER IF EXISTS set_requerimentos_audit_fields ON requerimentos;

CREATE TRIGGER audit_requerimentos_trigger
    AFTER INSERT OR UPDATE OR DELETE ON requerimentos
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER set_requerimentos_audit_fields
    BEFORE INSERT OR UPDATE ON requerimentos
    FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- 5. CLIENTES (completar)
DROP TRIGGER IF EXISTS set_clientes_audit_fields ON clientes;

CREATE TRIGGER set_clientes_audit_fields
    BEFORE INSERT OR UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- 6. EMPRESAS CLIENTES (completar)
DROP TRIGGER IF EXISTS set_empresas_clientes_audit_fields ON empresas_clientes;

CREATE TRIGGER set_empresas_clientes_audit_fields
    BEFORE INSERT OR UPDATE ON empresas_clientes
    FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- Verificar triggers criados
DO $$
DECLARE
    total_triggers INTEGER;
    grupos_resp_triggers INTEGER;
    email_templates_triggers INTEGER;
    historico_triggers INTEGER;
    requerimentos_triggers INTEGER;
BEGIN
    -- Contar triggers de grupos_responsaveis
    SELECT COUNT(*) INTO grupos_resp_triggers
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'grupos_responsaveis'
    AND t.tgname LIKE 'audit_%' OR t.tgname LIKE 'set_%';

    -- Contar triggers de email_templates
    SELECT COUNT(*) INTO email_templates_triggers
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'email_templates'
    AND t.tgname LIKE 'audit_%' OR t.tgname LIKE 'set_%';

    -- Contar triggers de historico_disparos
    SELECT COUNT(*) INTO historico_triggers
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'historico_disparos'
    AND t.tgname LIKE 'audit_%' OR t.tgname LIKE 'set_%';

    -- Contar triggers de requerimentos
    SELECT COUNT(*) INTO requerimentos_triggers
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'requerimentos'
    AND t.tgname LIKE 'audit_%' OR t.tgname LIKE 'set_%';

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ TRIGGERS CRIADOS COM SUCESSO!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Triggers por tabela:';
    RAISE NOTICE '- grupos_responsaveis: % triggers', grupos_resp_triggers;
    RAISE NOTICE '- email_templates: % triggers', email_templates_triggers;
    RAISE NOTICE '- historico_disparos: % triggers', historico_triggers;
    RAISE NOTICE '- requerimentos: % triggers', requerimentos_triggers;
    RAISE NOTICE '';
    
    IF grupos_resp_triggers >= 2 AND email_templates_triggers >= 2 AND 
       historico_triggers >= 2 AND requerimentos_triggers >= 2 THEN
        RAISE NOTICE '🎉 TODOS OS TRIGGERS FORAM CRIADOS!';
        RAISE NOTICE '';
        RAISE NOTICE 'Agora os logs de auditoria serão registrados para:';
        RAISE NOTICE '✅ Grupos Responsáveis';
        RAISE NOTICE '✅ Templates de E-mail';
        RAISE NOTICE '✅ Disparos de Books';
        RAISE NOTICE '✅ Requerimentos';
    ELSE
        RAISE WARNING '⚠️ Alguns triggers podem não ter sido criados corretamente.';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANTE: Os triggers estão HABILITADOS por padrão.';
    RAISE NOTICE 'Se houver problemas, desabilite-os e use logs manuais.';
    RAISE NOTICE '';
END $$;
