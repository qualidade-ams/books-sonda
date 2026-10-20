-- =====================================================
-- DIAGNÓSTICO COMPLETO - Tabela profiles
-- =====================================================
-- Execute este SQL para diagnosticar todos os problemas
-- possíveis que podem estar impedindo a criação de usuários
-- =====================================================

-- 1. Verificar todos os triggers da tabela profiles
SELECT '========================================' AS info;
SELECT '1. TRIGGERS DA TABELA PROFILES' AS info;
SELECT '========================================' AS info;

SELECT 
    t.tgname AS trigger_name,
    p.proname AS function_name,
    CASE t.tgenabled
        WHEN 'O' THEN '✅ HABILITADO'
        WHEN 'D' THEN '❌ DESABILITADO'
        WHEN 'R' THEN '⚠️ REPLICA'
        WHEN 'A' THEN '⚠️ ALWAYS'
    END AS status,
    CASE 
        WHEN t.tgtype & 2 = 2 THEN 'BEFORE'
        WHEN t.tgtype & 64 = 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END AS timing,
    CASE 
        WHEN t.tgtype & 4 = 4 THEN 'INSERT'
        WHEN t.tgtype & 8 = 8 THEN 'DELETE'
        WHEN t.tgtype & 16 = 16 THEN 'UPDATE'
        ELSE 'MULTIPLE'
    END AS event
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'profiles'
AND NOT t.tgisinternal
ORDER BY t.tgname;

-- 2. Verificar políticas RLS
SELECT '========================================' AS info;
SELECT '2. POLÍTICAS RLS DA TABELA PROFILES' AS info;
SELECT '========================================' AS info;

SELECT 
    policyname AS policy_name,
    cmd AS command,
    permissive,
    roles,
    qual AS using_expression,
    with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 3. Verificar se RLS está habilitado
SELECT '========================================' AS info;
SELECT '3. STATUS DO RLS' AS info;
SELECT '========================================' AS info;

SELECT 
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'profiles';

-- 4. Verificar constraints da tabela
SELECT '========================================' AS info;
SELECT '4. CONSTRAINTS DA TABELA PROFILES' AS info;
SELECT '========================================' AS info;

SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    CASE contype
        WHEN 'c' THEN 'CHECK'
        WHEN 'f' THEN 'FOREIGN KEY'
        WHEN 'p' THEN 'PRIMARY KEY'
        WHEN 'u' THEN 'UNIQUE'
        WHEN 't' THEN 'TRIGGER'
        WHEN 'x' THEN 'EXCLUSION'
    END AS type_description
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass
ORDER BY conname;

-- 5. Verificar a função audit_trigger_function
SELECT '========================================' AS info;
SELECT '5. FUNÇÃO AUDIT_TRIGGER_FUNCTION' AS info;
SELECT '========================================' AS info;

SELECT 
    proname AS function_name,
    CASE 
        WHEN prosrc LIKE '%current_user_id := NULL%' THEN '✅ CORRIGIDA (aceita NULL)'
        ELSE '❌ NÃO CORRIGIDA (não aceita NULL)'
    END AS status,
    LENGTH(prosrc) AS code_length
FROM pg_proc 
WHERE proname = 'audit_trigger_function';

-- 6. Verificar a função set_audit_fields
SELECT '========================================' AS info;
SELECT '6. FUNÇÃO SET_AUDIT_FIELDS' AS info;
SELECT '========================================' AS info;

SELECT 
    proname AS function_name,
    prosrc AS source_code
FROM pg_proc 
WHERE proname = 'set_audit_fields';

-- 7. Testar inserção manual em permission_audit_logs
SELECT '========================================' AS info;
SELECT '7. TESTE DE INSERÇÃO EM PERMISSION_AUDIT_LOGS' AS info;
SELECT '========================================' AS info;

DO $$
DECLARE
    test_id UUID;
BEGIN
    test_id := gen_random_uuid();
    
    BEGIN
        INSERT INTO permission_audit_logs (
            table_name,
            record_id,
            action,
            new_values,
            changed_by
        ) VALUES (
            'test_diagnostico',
            test_id,
            'INSERT',
            '{"test": "diagnostico"}'::jsonb,
            NULL
        );
        
        RAISE NOTICE '✅ Inserção manual em permission_audit_logs: SUCESSO';
        
        -- Limpar teste
        DELETE FROM permission_audit_logs WHERE table_name = 'test_diagnostico';
        RAISE NOTICE '✅ Limpeza do teste: SUCESSO';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '❌ Erro ao inserir em permission_audit_logs: %', SQLERRM;
    END;
END $$;

-- 8. Verificar estrutura da tabela profiles
SELECT '========================================' AS info;
SELECT '8. ESTRUTURA DA TABELA PROFILES' AS info;
SELECT '========================================' AS info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 9. Verificar se há dados na tabela profiles
SELECT '========================================' AS info;
SELECT '9. CONTAGEM DE REGISTROS' AS info;
SELECT '========================================' AS info;

SELECT 
    COUNT(*) AS total_profiles,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) AS created_last_7_days
FROM profiles;

-- 10. Resumo e Recomendações
SELECT '========================================' AS info;
SELECT '10. RESUMO DO DIAGNÓSTICO' AS info;
SELECT '========================================' AS info;

DO $$
DECLARE
    triggers_habilitados INTEGER;
    rls_habilitado BOOLEAN;
    funcao_corrigida BOOLEAN;
BEGIN
    -- Contar triggers habilitados
    SELECT COUNT(*) INTO triggers_habilitados
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'profiles'
    AND t.tgname IN ('audit_profiles_trigger', 'set_profiles_audit_fields')
    AND t.tgenabled = 'O';
    
    -- Verificar RLS
    SELECT rowsecurity INTO rls_habilitado
    FROM pg_tables
    WHERE tablename = 'profiles';
    
    -- Verificar se função foi corrigida
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'audit_trigger_function'
        AND prosrc LIKE '%current_user_id := NULL%'
    ) INTO funcao_corrigida;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RESUMO DO DIAGNÓSTICO';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Triggers habilitados: %', triggers_habilitados;
    RAISE NOTICE 'RLS habilitado: %', rls_habilitado;
    RAISE NOTICE 'Função corrigida: %', funcao_corrigida;
    RAISE NOTICE '';
    
    IF triggers_habilitados > 0 AND NOT funcao_corrigida THEN
        RAISE WARNING '⚠️ PROBLEMA IDENTIFICADO:';
        RAISE WARNING 'Triggers estão habilitados mas a função NÃO foi corrigida!';
        RAISE WARNING '';
        RAISE WARNING 'SOLUÇÃO:';
        RAISE WARNING '1. Desabilite os triggers temporariamente';
        RAISE WARNING '2. Corrija a função audit_trigger_function';
        RAISE WARNING '3. Reabilite os triggers';
    ELSIF triggers_habilitados = 0 THEN
        RAISE NOTICE '✅ Triggers estão desabilitados - Sistema deve funcionar';
    ELSIF funcao_corrigida THEN
        RAISE NOTICE '✅ Função corrigida - Sistema deve funcionar';
    END IF;
    
    RAISE NOTICE '';
END $$;
