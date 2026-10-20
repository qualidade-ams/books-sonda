-- =====================================================
-- REABILITAR TRIGGERS - Solução Final
-- =====================================================
-- Agora que as políticas RLS foram corrigidas,
-- podemos reabilitar os triggers com segurança
-- =====================================================

-- Passo 1: Garantir que a função está corrigida
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

-- Passo 2: Reabilitar os triggers
ALTER TABLE profiles ENABLE TRIGGER audit_profiles_trigger;
ALTER TABLE profiles ENABLE TRIGGER set_profiles_audit_fields;

-- Passo 3: Verificar status
DO $$
DECLARE
    audit_trigger_enabled BOOLEAN;
    set_fields_trigger_enabled BOOLEAN;
    funcao_corrigida BOOLEAN;
BEGIN
    -- Verificar triggers
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

    -- Verificar função
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'audit_trigger_function'
        AND prosrc LIKE '%current_user_id := NULL%'
    ) INTO funcao_corrigida;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎉 CONFIGURAÇÃO FINAL COMPLETA!';
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

    IF funcao_corrigida THEN
        RAISE NOTICE '✅ Função audit_trigger_function: CORRIGIDA';
    ELSE
        RAISE WARNING '❌ Função audit_trigger_function: NÃO CORRIGIDA';
    END IF;
    
    RAISE NOTICE '';
    
    IF audit_trigger_enabled AND set_fields_trigger_enabled AND funcao_corrigida THEN
        RAISE NOTICE '🎉 TUDO CONFIGURADO CORRETAMENTE!';
        RAISE NOTICE '';
        RAISE NOTICE 'Agora:';
        RAISE NOTICE '✅ Você pode criar usuários normalmente';
        RAISE NOTICE '✅ Logs de auditoria serão registrados';
        RAISE NOTICE '✅ Sistema totalmente funcional';
    ELSE
        RAISE WARNING '⚠️ Há problemas na configuração. Verifique acima.';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Teste agora:';
    RAISE NOTICE '1. Crie um novo usuário na interface';
    RAISE NOTICE '2. Vá em Logs de Auditoria';
    RAISE NOTICE '3. Filtre por "Usuários do Sistema"';
    RAISE NOTICE '4. Você deve ver o log da criação!';
    RAISE NOTICE '';
END $$;

-- Passo 4: Mostrar últimos logs de profiles (se houver)
SELECT 
    '📊 Últimos logs de auditoria de profiles:' AS info;

SELECT 
    changed_at,
    action,
    CASE 
        WHEN action = 'INSERT' THEN new_values->>'full_name'
        WHEN action = 'UPDATE' THEN new_values->>'full_name'
        WHEN action = 'DELETE' THEN old_values->>'full_name'
    END AS user_name,
    CASE 
        WHEN action = 'INSERT' THEN new_values->>'email'
        WHEN action = 'UPDATE' THEN new_values->>'email'
        WHEN action = 'DELETE' THEN old_values->>'email'
    END AS user_email,
    changed_by
FROM permission_audit_logs
WHERE table_name = 'profiles'
ORDER BY changed_at DESC
LIMIT 5;
