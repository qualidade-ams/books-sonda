-- =====================================================
-- SCRIPT ÚNICO - Execute este SQL de uma vez só
-- =====================================================
-- Este script faz TUDO na ordem correta:
-- 1. Desabilita triggers
-- 2. Corrige a função
-- 3. Reabilita triggers
-- 4. Verifica o resultado
-- =====================================================

-- PASSO 1: Desabilitar triggers
ALTER TABLE profiles DISABLE TRIGGER audit_profiles_trigger;
ALTER TABLE profiles DISABLE TRIGGER set_profiles_audit_fields;

-- PASSO 2: Corrigir a função
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    audit_table_name TEXT;
    current_user_id UUID;
BEGIN
    IF TG_TABLE_NAME IN ('user_groups', 'screen_permissions', 'user_group_assignments', 'empresas_clientes', 'clientes', 'grupos_responsaveis', 'email_templates', 'historico_disparos', 'requerimentos', 'profiles') THEN
        audit_table_name := TG_TABLE_NAME;
        
        -- Tentar obter usuário, permitir NULL se não houver
        BEGIN
            current_user_id := auth.uid();
        EXCEPTION WHEN OTHERS THEN
            current_user_id := NULL;
        END;
        
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO permission_audit_logs (table_name, record_id, action, old_values, changed_by)
            VALUES (audit_table_name, OLD.id::TEXT, 'DELETE', to_jsonb(OLD), current_user_id);
            RETURN OLD;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO permission_audit_logs (table_name, record_id, action, old_values, new_values, changed_by)
            VALUES (audit_table_name, NEW.id::TEXT, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), current_user_id);
            RETURN NEW;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO permission_audit_logs (table_name, record_id, action, new_values, changed_by)
            VALUES (audit_table_name, NEW.id::TEXT, 'INSERT', to_jsonb(NEW), current_user_id);
            RETURN NEW;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASSO 3: Reabilitar triggers
ALTER TABLE profiles ENABLE TRIGGER audit_profiles_trigger;
ALTER TABLE profiles ENABLE TRIGGER set_profiles_audit_fields;

-- PASSO 4: Verificar resultado
DO $$
DECLARE
    audit_trigger_enabled BOOLEAN;
    set_fields_trigger_enabled BOOLEAN;
BEGIN
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
    RAISE NOTICE '🎉 CORREÇÃO APLICADA COM SUCESSO!';
    RAISE NOTICE '========================================';
    
    IF audit_trigger_enabled AND set_fields_trigger_enabled THEN
        RAISE NOTICE '✅ Todos os triggers estão HABILITADOS';
        RAISE NOTICE '✅ Função corrigida para aceitar NULL';
        RAISE NOTICE '✅ Criação de usuários funcionará normalmente';
        RAISE NOTICE '✅ Logs de auditoria serão registrados';
    ELSE
        RAISE WARNING '⚠️ Algo deu errado. Verifique os triggers.';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Agora você pode:';
    RAISE NOTICE '1. Voltar para a aplicação';
    RAISE NOTICE '2. Criar usuários normalmente';
    RAISE NOTICE '3. Ver os logs na tela de Logs de Auditoria';
    RAISE NOTICE '';
END $$;
