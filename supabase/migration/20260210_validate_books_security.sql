-- ============================================================================
-- VALIDAÇÃO DE SEGURANÇA - Sistema de Books
-- Execute este script após aplicar a migration principal
-- ============================================================================

-- ============================================================================
-- 1. Verificar se há políticas duplicadas
-- ============================================================================
SELECT 
  tablename,
  cmd as acao,
  array_agg(policyname) as politicas_duplicadas,
  COUNT(*) as total
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('books', 'books_historico_geracao')
GROUP BY tablename, cmd
HAVING COUNT(*) > 1;

-- Resultado esperado: 0 linhas (sem duplicatas)

-- ============================================================================
-- 2. Verificar funções com SECURITY DEFINER
-- ============================================================================
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
  AND proname IN (
    'update_books_updated_at',
    'user_has_books_permission',
    'buscar_books_por_periodo'
  );

-- Resultado esperado: Todas as funções com '✅ Seguro'

-- ============================================================================
-- 3. Verificar RLS habilitado
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS Habilitado'
    ELSE '⚠️ RLS DESABILITADO - VULNERABILIDADE CRÍTICA'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('books', 'books_historico_geracao');

-- Resultado esperado: Todas as tabelas com '✅ RLS Habilitado'

-- ============================================================================
-- 4. Verificar políticas RLS completas
-- ============================================================================
WITH table_policies AS (
  SELECT 
    schemaname,
    tablename,
    COUNT(*) as policy_count,
    array_agg(cmd) as commands,
    array_agg(qual) as policy_expressions
  FROM pg_policies 
  WHERE schemaname = 'public'
    AND tablename IN ('books', 'books_historico_geracao')
  GROUP BY schemaname, tablename
)
SELECT 
  t.tablename,
  COALESCE(tp.policy_count, 0) as policies,
  CASE 
    WHEN t.tablename = 'books' AND tp.policy_count >= 4 AND 
         'SELECT' = ANY(tp.commands) AND
         'INSERT' = ANY(tp.commands) AND
         'UPDATE' = ANY(tp.commands) AND
         'DELETE' = ANY(tp.commands)
    THEN '✅ Políticas Completas (books)'
    WHEN t.tablename = 'books_historico_geracao' AND tp.policy_count >= 2 AND 
         'SELECT' = ANY(tp.commands) AND
         'INSERT' = ANY(tp.commands)
    THEN '✅ Políticas Completas (histórico)'
    WHEN tp.policy_count > 0 
    THEN '⚠️ Políticas Incompletas'
    ELSE '❌ SEM POLÍTICAS - VULNERABILIDADE CRÍTICA'
  END as policy_status,
  CASE 
    WHEN tp.policy_expressions IS NOT NULL AND 
         EXISTS (
           SELECT 1 FROM unnest(tp.policy_expressions) AS expr 
           WHERE expr LIKE '%auth.uid()%' AND expr NOT LIKE '%(SELECT auth.uid())%'
         )
    THEN '⚠️ PERFORMANCE: Políticas não otimizadas (auth.uid() sem SELECT)'
    ELSE '✅ Performance Otimizada'
  END as performance_status
FROM pg_tables t
LEFT JOIN table_policies tp ON t.tablename = tp.tablename
WHERE t.schemaname = 'public'
  AND t.tablename IN ('books', 'books_historico_geracao');

-- Resultado esperado: 
-- - books: '✅ Políticas Completas (books)' + '✅ Performance Otimizada'
-- - books_historico_geracao: '✅ Políticas Completas (histórico)' + '✅ Performance Otimizada'

-- ============================================================================
-- 5. Listar todas as políticas criadas
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as acao,
  roles,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING definido'
    ELSE 'USING não definido'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'WITH CHECK definido'
    ELSE 'WITH CHECK não definido'
  END as with_check_clause
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('books', 'books_historico_geracao')
ORDER BY tablename, cmd;

-- Resultado esperado: 6 políticas no total
-- books: 4 políticas (SELECT, INSERT, UPDATE, DELETE)
-- books_historico_geracao: 2 políticas (SELECT, INSERT)

-- ============================================================================
-- 6. Verificar views com SECURITY DEFINER
-- ============================================================================
SELECT 
  schemaname,
  viewname,
  viewowner,
  CASE 
    WHEN definition LIKE '%SECURITY DEFINER%' THEN '⚠️ View usa SECURITY DEFINER'
    ELSE '✅ View segura (security_invoker ou sem SECURITY DEFINER)'
  END as security_status
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('books_com_empresa');

-- Resultado esperado: '✅ View segura'

-- ============================================================================
-- 7. Testar permissões (simulação)
-- ============================================================================

-- Verificar se função de permissão existe
SELECT 
  proname,
  pronargs as num_args,
  prorettype::regtype as return_type
FROM pg_proc
WHERE proname = 'user_has_books_permission'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Resultado esperado: 1 linha com função encontrada

-- ============================================================================
-- RESUMO DE VALIDAÇÃO
-- ============================================================================

DO $$
DECLARE
  v_duplicates INTEGER;
  v_rls_disabled INTEGER;
  v_insecure_functions INTEGER;
  v_incomplete_policies INTEGER;
BEGIN
  -- Contar problemas
  SELECT COUNT(*) INTO v_duplicates
  FROM (
    SELECT tablename, cmd, COUNT(*) as total
    FROM pg_policies 
    WHERE schemaname = 'public'
      AND tablename IN ('books', 'books_historico_geracao')
    GROUP BY tablename, cmd
    HAVING COUNT(*) > 1
  ) duplicates;
  
  SELECT COUNT(*) INTO v_rls_disabled
  FROM pg_tables 
  WHERE schemaname = 'public'
    AND tablename IN ('books', 'books_historico_geracao')
    AND rowsecurity = false;
  
  SELECT COUNT(*) INTO v_insecure_functions
  FROM pg_proc 
  WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND prokind = 'f'
    AND proname IN ('update_books_updated_at', 'user_has_books_permission', 'buscar_books_por_periodo')
    AND (proconfig IS NULL OR NOT ('search_path=public' = ANY(proconfig)));
  
  -- Exibir resumo
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMO DE VALIDAÇÃO DE SEGURANÇA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Políticas duplicadas: %', v_duplicates;
  RAISE NOTICE 'Tabelas sem RLS: %', v_rls_disabled;
  RAISE NOTICE 'Funções inseguras: %', v_insecure_functions;
  RAISE NOTICE '========================================';
  
  IF v_duplicates = 0 AND v_rls_disabled = 0 AND v_insecure_functions = 0 THEN
    RAISE NOTICE '✅ VALIDAÇÃO PASSOU - Sistema seguro!';
  ELSE
    RAISE WARNING '⚠️ VALIDAÇÃO FALHOU - Corrija os problemas acima!';
  END IF;
END $$;
