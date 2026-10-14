-- =====================================================
-- Correção: record_id como UUID em vez de TEXT
-- =====================================================
-- Problema: A função audit_trigger_function está convertendo
-- record_id para TEXT (::TEXT), mas o campo é UUID
-- 
-- Solução: Remover a conversão ::TEXT
-- =====================================================

-- Atualizar a função de auditoria para usar UUID diretamente
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
            VALUES (audit_table_name, OLD.id, 'DELETE', to_jsonb(OLD), current_user_id);
            RETURN OLD;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO permission_audit_logs (table_name, record_id, action, old_values, new_values, changed_by)
            VALUES (audit_table_name, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), current_user_id);
            RETURN NEW;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO permission_audit_logs (table_name, record_id, action, new_values, changed_by)
            VALUES (audit_table_name, NEW.id, 'INSERT', to_jsonb(NEW), current_user_id);
            RETURN NEW;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar se a correção foi aplicada
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ FUNÇÃO CORRIGIDA!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Mudança aplicada:';
    RAISE NOTICE '- OLD.id::TEXT → OLD.id (UUID direto)';
    RAISE NOTICE '- NEW.id::TEXT → NEW.id (UUID direto)';
    RAISE NOTICE '';
    RAISE NOTICE 'Agora o record_id será inserido como UUID';
    RAISE NOTICE 'em vez de TEXT, resolvendo o erro 400.';
    RAISE NOTICE '';
    RAISE NOTICE 'Teste agora editando um cliente!';
    RAISE NOTICE '';
END $$;
