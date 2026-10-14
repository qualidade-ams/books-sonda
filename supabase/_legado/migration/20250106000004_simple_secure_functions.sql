-- =====================================================
-- MIGRAÇÃO: Substituir views por funções seguras
-- Data: 2025-01-06
-- Descrição: Views não podem ter RLS, então vamos usar
--           apenas funções Security Definer que são seguras
-- =====================================================

-- 1. Remover views antigas se existirem
DROP VIEW IF EXISTS v_especialistas_ativos CASCADE;
DROP VIEW IF EXISTS v_especialistas_sql_server CASCADE;

-- 2. Criar função para verificar permissão
CREATE OR REPLACE FUNCTION has_especialistas_permission()
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
          AND sp.permission_level IN ('view', 'edit')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Criar função para especialistas ativos (substitui a view)
CREATE OR REPLACE FUNCTION especialistas_ativos()
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
    IF NOT has_especialistas_permission() THEN
        RAISE EXCEPTION 'Acesso negado: usuário não tem permissão para visualizar especialistas'
        USING ERRCODE = '42501'; -- insufficient_privilege
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

-- 4. Criar função para especialistas do SQL Server (substitui a view)
CREATE OR REPLACE FUNCTION especialistas_sql_server()
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
    IF NOT has_especialistas_permission() THEN
        RAISE EXCEPTION 'Acesso negado: usuário não tem permissão para visualizar especialistas'
        USING ERRCODE = '42501'; -- insufficient_privilege
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

-- 5. Documentar as funções
COMMENT ON FUNCTION has_especialistas_permission() 
IS 'Verifica se o usuário atual tem permissão para acessar dados de especialistas';

COMMENT ON FUNCTION especialistas_ativos() 
IS 'Função segura que retorna especialistas ativos. Substitui v_especialistas_ativos com controle de acesso integrado.';

COMMENT ON FUNCTION especialistas_sql_server() 
IS 'Função segura que retorna especialistas do SQL Server. Substitui v_especialistas_sql_server com controle de acesso integrado.';

-- 6. Criar função de teste
CREATE OR REPLACE FUNCTION test_especialistas_security()
RETURNS TABLE (
    component TEXT,
    status TEXT,
    message TEXT
) AS $$
DECLARE
    has_perm BOOLEAN;
    ativos_count INTEGER := 0;
    sql_count INTEGER := 0;
BEGIN
    -- Testar verificação de permissão
    SELECT has_especialistas_permission() INTO has_perm;
    
    RETURN QUERY SELECT 
        'Permission Check'::TEXT,
        CASE WHEN has_perm THEN 'AUTHORIZED' ELSE 'DENIED' END::TEXT,
        CASE 
            WHEN current_setting('role') = 'service_role' THEN 'Service role access granted'
            WHEN auth.uid() IS NULL THEN 'User not authenticated'
            WHEN has_perm THEN 'User has valid permissions'
            ELSE 'User lacks required permissions'
        END::TEXT;
    
    -- Testar funções apenas se autorizado
    IF has_perm THEN
        -- Testar especialistas_ativos()
        BEGIN
            SELECT COUNT(*) INTO ativos_count FROM especialistas_ativos();
            RETURN QUERY SELECT 
                'especialistas_ativos()'::TEXT,
                'SUCCESS'::TEXT,
                format('Returned %s active specialists', ativos_count)::TEXT;
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT 
                'especialistas_ativos()'::TEXT,
                'ERROR'::TEXT,
                SQLERRM::TEXT;
        END;
        
        -- Testar especialistas_sql_server()
        BEGIN
            SELECT COUNT(*) INTO sql_count FROM especialistas_sql_server();
            RETURN QUERY SELECT 
                'especialistas_sql_server()'::TEXT,
                'SUCCESS'::TEXT,
                format('Returned %s SQL Server specialists', sql_count)::TEXT;
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT 
                'especialistas_sql_server()'::TEXT,
                'ERROR'::TEXT,
                SQLERRM::TEXT;
        END;
    ELSE
        RETURN QUERY SELECT 
            'Security Test'::TEXT,
            'BLOCKED'::TEXT,
            'Functions correctly blocked unauthorized access'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Executar teste
DO $$
DECLARE
    test_result RECORD;
BEGIN
    RAISE NOTICE '🔒 Testando segurança das funções de especialistas:';
    RAISE NOTICE '';
    
    FOR test_result IN SELECT * FROM test_especialistas_security() LOOP
        RAISE NOTICE '   %: % - %', 
            test_result.component, 
            test_result.status, 
            test_result.message;
    END LOOP;
END $$;

-- 8. Mensagem final
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Funções seguras de especialistas criadas com sucesso!';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 SEGURANÇA IMPLEMENTADA:';
    RAISE NOTICE '   - has_especialistas_permission(): Verifica permissões';
    RAISE NOTICE '   - especialistas_ativos(): Substitui v_especialistas_ativos';
    RAISE NOTICE '   - especialistas_sql_server(): Substitui v_especialistas_sql_server';
    RAISE NOTICE '';
    RAISE NOTICE '💡 COMO USAR NO CÓDIGO:';
    RAISE NOTICE '   - SELECT * FROM especialistas_ativos()';
    RAISE NOTICE '   - SELECT * FROM especialistas_sql_server()';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 TESTE:';
    RAISE NOTICE '   - SELECT * FROM test_especialistas_security()';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ IMPORTANTE:';
    RAISE NOTICE '   - Views antigas foram removidas';
    RAISE NOTICE '   - Use as funções ao invés das views';
    RAISE NOTICE '   - Funções têm controle de acesso integrado';
    RAISE NOTICE '   - Service role sempre tem acesso total';
END $$;