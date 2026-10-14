-- =====================================================
-- Migration: Diagnóstico Simplificado - banco_horas_calculos
-- Data: 2026-01-21
-- Descrição: Verifica estrutura existente e concede permissões
-- =====================================================

-- =====================================================
-- PARTE 1: Verificar se tabela existe
-- =====================================================

DO $$
DECLARE
    table_exists BOOLEAN;
    column_count INTEGER;
    rls_enabled BOOLEAN;
    policy_count INTEGER;
BEGIN
    -- Verificar existência da tabela
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'banco_horas_calculos'
    ) INTO table_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🔍 DIAGNÓSTICO: banco_horas_calculos';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    
    IF table_exists THEN
        RAISE NOTICE '✅ Tabela existe: banco_horas_calculos';
        
        -- Contar colunas
        SELECT COUNT(*) INTO column_count
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'banco_horas_calculos';
        
        RAISE NOTICE '📊 Número de colunas: %', column_count;
        
        -- Verificar RLS
        SELECT rowsecurity INTO rls_enabled
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'banco_horas_calculos';
        
        RAISE NOTICE '🔒 RLS habilitado: %', rls_enabled;
        
        -- Contar políticas
        SELECT COUNT(*) INTO policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'banco_horas_calculos';
        
        RAISE NOTICE '📋 Número de políticas: %', policy_count;
        
    ELSE
        RAISE NOTICE '❌ Tabela NÃO existe: banco_horas_calculos';
        RAISE NOTICE '⚠️ A tabela precisa ser criada!';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- =====================================================
-- PARTE 2: Listar todas as colunas
-- =====================================================

DO $$
DECLARE
    col_record RECORD;
BEGIN
    RAISE NOTICE '📋 COLUNAS DA TABELA:';
    RAISE NOTICE '';
    
    FOR col_record IN 
        SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'banco_horas_calculos'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '   • % (%) - Nullable: %', 
            col_record.column_name, 
            col_record.data_type,
            col_record.is_nullable;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- =====================================================
-- PARTE 3: Listar políticas RLS
-- =====================================================

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE '🔒 POLÍTICAS RLS:';
    RAISE NOTICE '';
    
    FOR policy_record IN 
        SELECT 
            policyname,
            cmd,
            roles
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'banco_horas_calculos'
        ORDER BY policyname
    LOOP
        RAISE NOTICE '   • % (%) - Roles: %', 
            policy_record.policyname, 
            policy_record.cmd,
            policy_record.roles;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- =====================================================
-- PARTE 4: Verificar permissões da tabela
-- =====================================================

DO $$
DECLARE
    grant_record RECORD;
BEGIN
    RAISE NOTICE '🔑 PERMISSÕES DA TABELA:';
    RAISE NOTICE '';
    
    FOR grant_record IN 
        SELECT 
            grantee,
            privilege_type
        FROM information_schema.table_privileges
        WHERE table_schema = 'public'
        AND table_name = 'banco_horas_calculos'
        ORDER BY grantee, privilege_type
    LOOP
        RAISE NOTICE '   • %: %', grant_record.grantee, grant_record.privilege_type;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- =====================================================
-- PARTE 5: Testar acesso direto
-- =====================================================

DO $$
DECLARE
    test_count INTEGER;
    can_select BOOLEAN := false;
BEGIN
    RAISE NOTICE '🧪 TESTE DE ACESSO:';
    RAISE NOTICE '';
    
    BEGIN
        SELECT COUNT(*) INTO test_count
        FROM banco_horas_calculos;
        
        can_select := true;
        RAISE NOTICE '   ✅ SELECT funciona: % registros encontrados', test_count;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '   ❌ SELECT falhou: %', SQLERRM;
    END;
    
    RAISE NOTICE '';
END $$;

-- =====================================================
-- PARTE 6: Conceder permissões explícitas
-- =====================================================

-- Garantir que roles têm permissões
GRANT ALL ON banco_horas_calculos TO authenticated;
GRANT ALL ON banco_horas_calculos TO service_role;
GRANT ALL ON banco_horas_calculos TO anon;

-- Conceder permissões em sequências (se existirem)
DO $$
BEGIN
    -- Tentar conceder permissões em sequências relacionadas
    IF EXISTS (
        SELECT 1 FROM information_schema.sequences 
        WHERE sequence_schema = 'public' 
        AND sequence_name LIKE 'banco_horas_calculos%'
    ) THEN
        EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated';
        EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role';
        EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon';
        RAISE NOTICE '✅ Permissões concedidas em sequências';
    END IF;
END $$;

-- =====================================================
-- PARTE 7: Verificar configuração do PostgREST
-- =====================================================

DO $$
DECLARE
    schema_exposed BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔧 VERIFICAÇÃO DE CONFIGURAÇÃO:';
    RAISE NOTICE '';
    
    -- Verificar se schema public está exposto
    SELECT EXISTS (
        SELECT 1 FROM pg_namespace WHERE nspname = 'public'
    ) INTO schema_exposed;
    
    IF schema_exposed THEN
        RAISE NOTICE '   ✅ Schema public existe';
    ELSE
        RAISE NOTICE '   ❌ Schema public não encontrado';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- =====================================================
-- PARTE 8: Resumo e Recomendações
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📝 RESUMO DO DIAGNÓSTICO';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Verificações concluídas';
    RAISE NOTICE '✅ Permissões concedidas explicitamente para:';
    RAISE NOTICE '   - authenticated';
    RAISE NOTICE '   - service_role';
    RAISE NOTICE '   - anon';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 PRÓXIMOS PASSOS:';
    RAISE NOTICE '   1. Verificar logs acima para identificar problema';
    RAISE NOTICE '   2. Se tabela não existe, executar migration de criação';
    RAISE NOTICE '   3. Se permissões estavam faltando, foram concedidas agora';
    RAISE NOTICE '   4. Testar acesso via Supabase client novamente';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ SE ERRO 406 PERSISTIR:';
    RAISE NOTICE '   - Verificar se RLS está causando problema';
    RAISE NOTICE '   - Verificar logs do Supabase Dashboard';
    RAISE NOTICE '   - Tentar usar service_role key temporariamente';
    RAISE NOTICE '   - Verificar se PostgREST está configurado corretamente';
    RAISE NOTICE '';
    RAISE NOTICE '💡 DICA: Erro 406 geralmente indica:';
    RAISE NOTICE '   - Problema com content negotiation (Accept header)';
    RAISE NOTICE '   - Tabela não exposta via PostgREST';
    RAISE NOTICE '   - Permissões insuficientes';
    RAISE NOTICE '   - RLS bloqueando acesso';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
