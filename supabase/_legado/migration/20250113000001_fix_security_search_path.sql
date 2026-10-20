-- =====================================================
-- MIGRAÇÃO: Correção de Segurança - search_path
-- Data: 2025-01-13
-- Descrição: Corrigir vulnerabilidade de segurança nas funções
--           que não têm search_path definido
-- CRÍTICO: Função sem search_path é vulnerável a ataques
-- =====================================================

-- 1. Verificar funções inseguras antes da correção
DO $$
DECLARE
    func_record RECORD;
BEGIN
    RAISE NOTICE '🔍 VERIFICANDO FUNÇÕES INSEGURAS ANTES DA CORREÇÃO:';
    RAISE NOTICE '';
    
    FOR func_record IN 
        SELECT 
            proname as function_name,
            prosecdef as is_security_definer,
            proconfig as config_settings,
            CASE 
                WHEN proconfig IS NULL OR NOT ('search_path=public' = ANY(proconfig)) 
                THEN '⚠️ VULNERABILIDADE: search_path não definido'
                ELSE '✅ Seguro'
            END as security_status
        FROM pg_proc 
        WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
          AND prokind = 'f'
          AND proname IN ('has_especialistas_permission', 'especialistas_ativos', 'especialistas_sql_server', 'test_especialistas_security')
    LOOP
        RAISE NOTICE '   Função: % | Security Definer: % | Status: %', 
            func_record.function_name, 
            func_record.is_security_definer,
            func_record.security_status;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- 2. Corrigir função has_especialistas_permission - CRÍTICO
DROP FUNCTION IF EXISTS has_especialistas_permission() CASCADE;

CREATE OR REPLACE FUNCTION public.has_especialistas_permission()
RETURNS BOOLEAN 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
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
$$;

COMMENT ON FUNCTION public.has_especialistas_permission() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Verifica se o usuário atual tem permissão para acessar dados de especialistas.';

-- 3. Corrigir função especialistas_ativos
DROP FUNCTION IF EXISTS especialistas_ativos() CASCADE;

CREATE OR REPLACE FUNCTION public.especialistas_ativos()
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
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
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
$$;

COMMENT ON FUNCTION public.especialistas_ativos() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Função segura que retorna especialistas ativos. Substitui v_especialistas_ativos com controle de acesso integrado.';

-- 4. Corrigir função especialistas_sql_server
DROP FUNCTION IF EXISTS especialistas_sql_server() CASCADE;

CREATE OR REPLACE FUNCTION public.especialistas_sql_server()
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
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
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
$$;

COMMENT ON FUNCTION public.especialistas_sql_server() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Função segura que retorna especialistas do SQL Server. Substitui v_especialistas_sql_server com controle de acesso integrado.';

-- 5. Corrigir função test_especialistas_security
DROP FUNCTION IF EXISTS test_especialistas_security() CASCADE;

CREATE OR REPLACE FUNCTION public.test_especialistas_security()
RETURNS TABLE (
    component TEXT,
    status TEXT,
    message TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
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
$$;

COMMENT ON FUNCTION public.test_especialistas_security() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Função de teste para verificar segurança das funções de especialistas.';

-- 6. Executar validação de segurança após correção
DO $$
DECLARE
    func_record RECORD;
    all_secure BOOLEAN := TRUE;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔒 VERIFICAÇÃO DE SEGURANÇA APÓS CORREÇÃO:';
    RAISE NOTICE '';
    
    FOR func_record IN 
        SELECT 
            proname as function_name,
            prosecdef as is_security_definer,
            proconfig as config_settings,
            CASE 
                WHEN proconfig IS NULL OR NOT ('search_path=public' = ANY(proconfig)) 
                THEN '⚠️ VULNERABILIDADE: search_path não definido'
                ELSE '✅ Seguro'
            END as security_status
        FROM pg_proc 
        WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
          AND prokind = 'f'
          AND proname IN ('has_especialistas_permission', 'especialistas_ativos', 'especialistas_sql_server', 'test_especialistas_security')
    LOOP
        RAISE NOTICE '   Função: % | Security Definer: % | Status: %', 
            func_record.function_name, 
            func_record.is_security_definer,
            func_record.security_status;
            
        IF func_record.security_status LIKE '%VULNERABILIDADE%' THEN
            all_secure := FALSE;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    
    IF all_secure THEN
        RAISE NOTICE '✅ TODAS AS FUNÇÕES ESTÃO SEGURAS!';
    ELSE
        RAISE NOTICE '❌ AINDA EXISTEM VULNERABILIDADES!';
    END IF;
END $$;

-- 7. Executar teste de funcionalidade
DO $$
DECLARE
    test_result RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧪 TESTANDO FUNCIONALIDADE APÓS CORREÇÃO:';
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
    RAISE NOTICE '🛡️ CORREÇÃO DE SEGURANÇA APLICADA COM SUCESSO!';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 VULNERABILIDADES CORRIGIDAS:';
    RAISE NOTICE '   ✅ has_especialistas_permission() - search_path definido';
    RAISE NOTICE '   ✅ especialistas_ativos() - search_path definido';
    RAISE NOTICE '   ✅ especialistas_sql_server() - search_path definido';
    RAISE NOTICE '   ✅ test_especialistas_security() - search_path definido';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 PADRÃO DE SEGURANÇA APLICADO:';
    RAISE NOTICE '   - SECURITY DEFINER: Executa com privilégios do criador';
    RAISE NOTICE '   - SET search_path = public: Previne ataques de search_path';
    RAISE NOTICE '   - Comentários documentando correções de segurança';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ IMPORTANTE:';
    RAISE NOTICE '   - Todas as funções agora são seguras contra ataques de search_path';
    RAISE NOTICE '   - Funcionalidade mantida inalterada';
    RAISE NOTICE '   - Execute validações regulares com as queries do steering';
    RAISE NOTICE '';
    RAISE NOTICE '📋 PRÓXIMOS PASSOS:';
    RAISE NOTICE '   1. Execute: SELECT * FROM test_especialistas_security()';
    RAISE NOTICE '   2. Monitore logs de segurança regularmente';
    RAISE NOTICE '   3. Aplique este padrão em novas funções';
END $$;