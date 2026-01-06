-- =====================================================
-- MIGRAÇÃO: Criar views seguras usando Security Definer Functions
-- Data: 2025-01-06
-- Descrição: Views não suportam RLS diretamente, então vamos
--           criar funções que aplicam as políticas de segurança
-- =====================================================

-- 1. Remover views antigas (se existirem)
DROP VIEW IF EXISTS v_especialistas_ativos;
DROP VIEW IF EXISTS v_especialistas_sql_server;

-- 2. Criar função para verificar permissão de especialistas
CREATE OR REPLACE FUNCTION has_especialistas_permission(required_level TEXT DEFAULT 'view')
RETURNS BOOLEAN AS $$
BEGIN
    -- Service role sempre tem acesso
    IF current_setting('role') = 'service_role' THEN
        RETURN TRUE;
    END IF;
    
    -- Verificar se usuário está autenticado
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar permissão através dos grupos
    RETURN EXISTS (
        SELECT 1 FROM user_group_assignments uga
        JOIN screen_permissions sp ON uga.group_id = sp.group_id
        JOIN screens s ON sp.screen_key = s.key
        WHERE uga.user_id = auth.uid()
          AND s.key = 'especialistas'
          AND (
            (required_level = 'view' AND sp.permission_level IN ('view', 'edit')) OR
            (required_level = 'edit' AND sp.permission_level = 'edit')
          )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Criar função segura para especialistas ativos
CREATE OR REPLACE FUNCTION get_especialistas_ativos()
RETURNS TABLE (
    id UUID,
    origem origem_especialista_enum,
    nome TEXT,
    email TEXT,
    telefone TEXT,
    cargo TEXT,
    departamento TEXT,
    empresa TEXT,
    especialidade TEXT,
    nivel TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Verificar permissão
    IF NOT has_especialistas_permission('view') THEN
        RAISE EXCEPTION 'Acesso negado: usuário não tem permissão para visualizar especialistas';
    END IF;
    
    -- Retornar dados se autorizado
    RETURN QUERY
    SELECT 
        e.id,
        e.origem,
        e.nome,
        e.email,
        e.telefone,
        e.cargo,
        e.departamento,
        e.empresa,
        e.especialidade,
        e.nivel,
        e.created_at,
        e.updated_at
    FROM especialistas e
    WHERE e.status = 'ativo'
    ORDER BY e.nome;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Criar função segura para especialistas do SQL Server
CREATE OR REPLACE FUNCTION get_especialistas_sql_server()
RETURNS TABLE (
    id UUID,
    id_externo TEXT,
    nome TEXT,
    email TEXT,
    status status_especialista_enum,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    nome_original TEXT,
    email_original TEXT
) AS $$
BEGIN
    -- Verificar permissão
    IF NOT has_especialistas_permission('view') THEN
        RAISE EXCEPTION 'Acesso negado: usuário não tem permissão para visualizar especialistas';
    END IF;
    
    -- Retornar dados se autorizado
    RETURN QUERY
    SELECT 
        e.id,
        e.id_externo,
        e.nome,
        e.email,
        e.status,
        e.created_at,
        e.updated_at,
        split_part(e.id_externo, '|', 2) as nome_original,
        split_part(e.id_externo, '|', 3) as email_original
    FROM especialistas e
    WHERE e.origem = 'sql_server'
    ORDER BY e.nome;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Recriar views como wrappers das funções (para compatibilidade)
CREATE VIEW v_especialistas_ativos AS
SELECT * FROM get_especialistas_ativos();

CREATE VIEW v_especialistas_sql_server AS
SELECT * FROM get_especialistas_sql_server();

-- 6. Documentar as views
COMMENT ON VIEW v_especialistas_ativos 
IS 'View segura de especialistas ativos. Acesso controlado pela função get_especialistas_ativos()';

COMMENT ON VIEW v_especialistas_sql_server 
IS 'View segura de especialistas do SQL Server. Acesso controlado pela função get_especialistas_sql_server()';

-- 7. Documentar as funções
COMMENT ON FUNCTION has_especialistas_permission(TEXT) 
IS 'Verifica se o usuário atual tem permissão para acessar dados de especialistas';

COMMENT ON FUNCTION get_especialistas_ativos() 
IS 'Retorna especialistas ativos com verificação de permissão integrada';

COMMENT ON FUNCTION get_especialistas_sql_server() 
IS 'Retorna especialistas do SQL Server com verificação de permissão integrada';

-- 8. Criar função de teste para verificar acesso
CREATE OR REPLACE FUNCTION test_especialistas_views_access()
RETURNS TABLE (
    test_name TEXT,
    result TEXT,
    details TEXT
) AS $$
DECLARE
    ativos_count INTEGER := 0;
    sql_server_count INTEGER := 0;
    has_permission BOOLEAN;
BEGIN
    -- Verificar permissão
    SELECT has_especialistas_permission('view') INTO has_permission;
    
    RETURN QUERY SELECT 
        'Permission Check'::TEXT,
        CASE WHEN has_permission THEN 'PASS' ELSE 'FAIL' END::TEXT,
        CASE 
            WHEN current_setting('role') = 'service_role' THEN 'Service role access'
            WHEN auth.uid() IS NULL THEN 'Not authenticated'
            WHEN has_permission THEN 'User has permission'
            ELSE 'User lacks permission'
        END::TEXT;
    
    -- Testar acesso às views apenas se tiver permissão
    IF has_permission THEN
        BEGIN
            SELECT COUNT(*) INTO ativos_count FROM v_especialistas_ativos;
            RETURN QUERY SELECT 
                'v_especialistas_ativos'::TEXT,
                'ACCESSIBLE'::TEXT,
                format('Found %s active specialists', ativos_count)::TEXT;
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT 
                'v_especialistas_ativos'::TEXT,
                'ERROR'::TEXT,
                SQLERRM::TEXT;
        END;
        
        BEGIN
            SELECT COUNT(*) INTO sql_server_count FROM v_especialistas_sql_server;
            RETURN QUERY SELECT 
                'v_especialistas_sql_server'::TEXT,
                'ACCESSIBLE'::TEXT,
                format('Found %s SQL Server specialists', sql_server_count)::TEXT;
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT 
                'v_especialistas_sql_server'::TEXT,
                'ERROR'::TEXT,
                SQLERRM::TEXT;
        END;
    ELSE
        RETURN QUERY SELECT 
            'Views Access'::TEXT,
            'BLOCKED'::TEXT,
            'User does not have permission to access views'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Executar teste
DO $$
DECLARE
    test_result RECORD;
BEGIN
    RAISE NOTICE '🧪 Testando acesso às views seguras:';
    
    FOR test_result IN SELECT * FROM test_especialistas_views_access() LOOP
        RAISE NOTICE '   %: % - %', test_result.test_name, test_result.result, test_result.details;
    END LOOP;
END $$;

-- 10. Mensagem final
DO $$
BEGIN
    RAISE NOTICE '✅ Views seguras criadas com sucesso!';
    RAISE NOTICE '🔒 Segurança implementada através de Security Definer Functions';
    RAISE NOTICE '👥 v_especialistas_ativos: get_especialistas_ativos()';
    RAISE NOTICE '🔧 v_especialistas_sql_server: get_especialistas_sql_server()';
    RAISE NOTICE '🛡️ Acesso controlado por has_especialistas_permission()';
    RAISE NOTICE '📋 Teste: SELECT * FROM test_especialistas_views_access()';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Como usar:';
    RAISE NOTICE '   - SELECT * FROM v_especialistas_ativos (view)';
    RAISE NOTICE '   - SELECT * FROM get_especialistas_ativos() (função direta)';
    RAISE NOTICE '   - SELECT * FROM v_especialistas_sql_server (view)';
    RAISE NOTICE '   - SELECT * FROM get_especialistas_sql_server() (função direta)';
END $$;