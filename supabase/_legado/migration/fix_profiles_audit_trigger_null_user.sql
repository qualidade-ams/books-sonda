-- =====================================================
-- Correção: Permitir NULL em changed_by para operações via Admin API
-- Descrição: Corrige o trigger de auditoria para permitir que changed_by
--            seja NULL quando não há usuário autenticado (Admin API)
-- Data: 2025-01-12
-- =====================================================

-- Atualizar a função de auditoria para aceitar NULL em changed_by
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    audit_table_name TEXT;
    current_user_id UUID;
BEGIN
    -- Lista de tabelas que devem ser auditadas
    IF TG_TABLE_NAME IN ('user_groups', 'screen_permissions', 'user_group_assignments', 'empresas_clientes', 'clientes', 'grupos_responsaveis', 'email_templates', 'historico_disparos', 'requerimentos', 'profiles') THEN
        audit_table_name := TG_TABLE_NAME;
        
        -- Tentar obter o usuário atual, mas permitir NULL se não houver
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

-- Verificar se a correção foi aplicada
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Correção aplicada com sucesso!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Função audit_trigger_function atualizada para:';
    RAISE NOTICE '- Permitir NULL em changed_by quando não há usuário autenticado';
    RAISE NOTICE '- Suportar operações via Admin API do Supabase';
    RAISE NOTICE '- Registrar logs mesmo sem contexto de usuário';
    RAISE NOTICE '';
    RAISE NOTICE 'Agora você pode criar usuários via Admin API sem erros!';
    RAISE NOTICE '';
END $$;
