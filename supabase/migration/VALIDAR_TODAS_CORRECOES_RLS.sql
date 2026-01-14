-- ============================================================================
-- Script de Validação Completa - Todas as Correções RLS
-- Execute este script no Supabase SQL Editor APÓS aplicar TODAS as migrations
-- ============================================================================

-- Migrations que devem ser executadas em ordem:
-- 1. 20250114000000_fix_clientes_rls_overpermissive.sql
-- 2. 20250114000001_fix_rls_performance_and_duplicates.sql
-- 3. 20250114000002_fix_service_role_policies.sql

-- ============================================================================
-- 1. RESUMO EXECUTIVO
-- ============================================================================

SELECT '📈 RESUMO EXECUTIVO - TODAS AS TABELAS' as titulo;

WITH policy_stats AS (
  SELECT 
    tablename,
    COUNT(*) as total_policies,
    COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_count,
    COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_count,
    COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_count,
    COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_count,
    COUNT(CASE WHEN cmd = 'ALL' THEN 1 END) as all_count,
    -- Detectar problemas de performance
    COUNT(CASE 
      WHEN (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%') OR
           (qual LIKE '%auth.jwt()%' AND qual NOT LIKE '%(SELECT auth.jwt())%') OR
           (qual LIKE '%current_setting%' AND qual NOT LIKE '%(SELECT current_setting%') OR
           (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%') OR
           (with_check LIKE '%auth.jwt()%' AND with_check NOT LIKE '%(SELECT auth.jwt())%')
      THEN 1 
    END) as performance_issues,
    -- Detectar políticas permissivas
    COUNT(CASE WHEN qual = 'true' OR with_check = 'true' THEN 1 END) as permissive_issues
  FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename IN ('clientes', 'taxas_clientes', 'valores_taxas_funcoes', 'profiles')
  GROUP BY tablename
)
SELECT 
  tablename as "Tabela",
  total_policies as "Total",
  select_count as "SELECT",
  insert_count as "INSERT",
  update_count as "UPDATE",
  delete_count as "DELETE",
  all_count as "ALL",
  performance_issues as "Problemas Performance",
  permissive_issues as "Políticas Permissivas",
  CASE 
    WHEN performance_issues = 0 AND permissive_issues = 0 AND all_count = 0
    THEN '✅ CORRETO'
    WHEN performance_issues > 0
    THEN '⚠️ Problemas de performance'
    WHEN permissive_issues > 0
    THEN '⚠️ Políticas permissivas'
    WHEN all_count > 0
    THEN '⚠️ Políticas FOR ALL (duplicatas)'
    ELSE '⚠️ Verificar'
  END as "Status"
FROM policy_stats
ORDER BY tablename;

-- RESULTADO ESPERADO:
-- clientes: 8 políticas (4 SELECT, 4 INSERT, 4 UPDATE, 4 DELETE, 0 ALL) - ✅ CORRETO
-- taxas_clientes: 8 políticas (4 SELECT, 4 INSERT, 4 UPDATE, 4 DELETE, 0 ALL) - ✅ CORRETO
-- valores_taxas_funcoes: 8 políticas (4 SELECT, 4 INSERT, 4 UPDATE, 4 DELETE, 0 ALL) - ✅ CORRETO
-- profiles: 5 políticas (1 SELECT, 1 INSERT, 1 UPDATE, 1 DELETE, 1 ALL) - ✅ CORRETO

-- ============================================================================
-- 2. VERIFICAR POLÍTICAS FOR ALL (DEVE RETORNAR APENAS profiles)
-- ============================================================================

SELECT '🔍 POLÍTICAS FOR ALL' as titulo;

SELECT 
  tablename as "Tabela",
  policyname as "Nome da Política",
  roles::text as "Roles",
  CASE 
    WHEN tablename = 'profiles' THEN '✅ OK (profiles pode ter FOR ALL para service_role)'
    ELSE '⚠️ REMOVER - Causa duplicatas'
  END as "Status"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('clientes', 'taxas_clientes', 'valores_taxas_funcoes', 'profiles')
  AND cmd = 'ALL'
ORDER BY tablename;

-- RESULTADO ESPERADO: Apenas 1 linha (profiles - Service role acesso completo)

-- ============================================================================
-- 3. VERIFICAR DUPLICATAS POR ROLE E AÇÃO
-- ============================================================================

SELECT '🔍 VERIFICAÇÃO DE DUPLICATAS' as titulo;

SELECT 
  tablename as "Tabela",
  cmd as "Comando",
  roles::text as "Roles",
  COUNT(*) as "Quantidade",
  array_agg(policyname) as "Nomes das Políticas",
  CASE 
    WHEN COUNT(*) > 1 THEN '⚠️ DUPLICATA DETECTADA'
    ELSE '✅ Sem duplicatas'
  END as "Status"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('clientes', 'taxas_clientes', 'valores_taxas_funcoes', 'profiles')
  AND permissive = 'PERMISSIVE'
GROUP BY tablename, cmd, roles::text
HAVING COUNT(*) > 1
ORDER BY tablename, cmd;

-- RESULTADO ESPERADO: Nenhuma linha (sem duplicatas)

-- ============================================================================
-- 4. VERIFICAR PROBLEMAS DE PERFORMANCE
-- ============================================================================

SELECT '🚀 VERIFICAÇÃO DE PERFORMANCE' as titulo;

SELECT 
  tablename as "Tabela",
  policyname as "Política",
  cmd as "Comando",
  CASE 
    WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%' 
    THEN '⚠️ auth.uid() sem SELECT'
    WHEN qual LIKE '%auth.jwt()%' AND qual NOT LIKE '%(SELECT auth.jwt())%'
    THEN '⚠️ auth.jwt() sem SELECT'
    WHEN qual LIKE '%current_setting%' AND qual NOT LIKE '%(SELECT current_setting%'
    THEN '⚠️ current_setting() sem SELECT'
    WHEN with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%'
    THEN '⚠️ WITH CHECK: auth.uid() sem SELECT'
    WHEN with_check LIKE '%auth.jwt()%' AND with_check NOT LIKE '%(SELECT auth.jwt())%'
    THEN '⚠️ WITH CHECK: auth.jwt() sem SELECT'
    ELSE '✅ Otimizado'
  END as "Status Performance"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('clientes', 'taxas_clientes', 'valores_taxas_funcoes', 'profiles')
  AND (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%') OR
    (qual LIKE '%auth.jwt()%' AND qual NOT LIKE '%(SELECT auth.jwt())%') OR
    (qual LIKE '%current_setting%' AND qual NOT LIKE '%(SELECT current_setting%') OR
    (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%') OR
    (with_check LIKE '%auth.jwt()%' AND with_check NOT LIKE '%(SELECT auth.jwt())%')
  )
ORDER BY tablename, policyname;

-- RESULTADO ESPERADO: Nenhuma linha (todas otimizadas)

-- ============================================================================
-- 5. VERIFICAR POLÍTICAS PERMISSIVAS (USING true / WITH CHECK true)
-- ============================================================================

SELECT '🚨 VERIFICAÇÃO DE POLÍTICAS PERMISSIVAS' as titulo;

SELECT 
  tablename as "Tabela",
  policyname as "Política",
  cmd as "Comando",
  CASE 
    WHEN qual = 'true' THEN '⚠️ USING (true) - Permissivo'
    WHEN with_check = 'true' THEN '⚠️ WITH CHECK (true) - Permissivo'
    ELSE '✅ Seguro'
  END as "Status",
  CASE 
    WHEN tablename = 'profiles' AND roles::text LIKE '%service_role%' 
    THEN '✅ OK (service_role pode ter acesso completo)'
    WHEN qual = 'true' OR with_check = 'true'
    THEN '⚠️ CORRIGIR - Vulnerabilidade de segurança'
    ELSE '✅ OK'
  END as "Ação Necessária"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('clientes', 'taxas_clientes', 'valores_taxas_funcoes', 'profiles')
  AND (qual = 'true' OR with_check = 'true')
ORDER BY 
  CASE WHEN roles::text LIKE '%service_role%' THEN 2 ELSE 1 END,
  tablename;

-- RESULTADO ESPERADO: Apenas políticas de service_role com status "✅ OK"

-- ============================================================================
-- 6. LISTAR TODAS AS POLÍTICAS POR TABELA
-- ============================================================================

SELECT '📋 POLÍTICAS - TABELA clientes' as titulo;

SELECT 
  policyname as "Nome da Política",
  cmd as "Comando",
  roles::text as "Roles",
  left(qual, 60) || '...' as "USING (resumo)"
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'clientes'
ORDER BY 
  CASE 
    WHEN roles::text LIKE '%authenticated%' THEN 1
    WHEN roles::text LIKE '%service_role%' THEN 2
    ELSE 3
  END,
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    WHEN 'ALL' THEN 5
  END;

-- ============================================================================

SELECT '📋 POLÍTICAS - TABELA taxas_clientes' as titulo;

SELECT 
  policyname as "Nome da Política",
  cmd as "Comando",
  roles::text as "Roles",
  left(qual, 60) || '...' as "USING (resumo)"
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'taxas_clientes'
ORDER BY 
  CASE 
    WHEN roles::text LIKE '%authenticated%' THEN 1
    WHEN roles::text LIKE '%service_role%' THEN 2
    ELSE 3
  END,
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    WHEN 'ALL' THEN 5
  END;

-- ============================================================================

SELECT '📋 POLÍTICAS - TABELA valores_taxas_funcoes' as titulo;

SELECT 
  policyname as "Nome da Política",
  cmd as "Comando",
  roles::text as "Roles",
  left(qual, 60) || '...' as "USING (resumo)"
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'valores_taxas_funcoes'
ORDER BY 
  CASE 
    WHEN roles::text LIKE '%authenticated%' THEN 1
    WHEN roles::text LIKE '%service_role%' THEN 2
    ELSE 3
  END,
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    WHEN 'ALL' THEN 5
  END;

-- ============================================================================

SELECT '📋 POLÍTICAS - TABELA profiles' as titulo;

SELECT 
  policyname as "Nome da Política",
  cmd as "Comando",
  roles::text as "Roles",
  left(qual, 60) || '...' as "USING (resumo)"
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY 
  CASE 
    WHEN roles::text LIKE '%authenticated%' THEN 1
    WHEN roles::text LIKE '%service_role%' THEN 2
    ELSE 3
  END,
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    WHEN 'ALL' THEN 5
  END;

-- ============================================================================
-- 7. VERIFICAR RLS HABILITADO
-- ============================================================================

SELECT '🔒 STATUS DO ROW LEVEL SECURITY' as titulo;

SELECT 
  tablename as "Tabela",
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS Habilitado'
    ELSE '❌ RLS DESABILITADO - VULNERABILIDADE CRÍTICA'
  END as "Status RLS"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('clientes', 'taxas_clientes', 'valores_taxas_funcoes', 'profiles')
ORDER BY tablename;

-- ============================================================================
-- INTERPRETAÇÃO DOS RESULTADOS
-- ============================================================================

-- ✅ SISTEMA TOTALMENTE CORRETO:
-- 
-- RESUMO EXECUTIVO:
-- - clientes: 8 políticas (4 authenticated + 4 service_role) - 0 problemas
-- - taxas_clientes: 8 políticas (4 authenticated + 4 service_role) - 0 problemas
-- - valores_taxas_funcoes: 8 políticas (4 authenticated + 4 service_role) - 0 problemas
-- - profiles: 5 políticas (1 SELECT authenticated, 4 service_role) - 0 problemas
--
-- POLÍTICAS FOR ALL:
-- - Apenas profiles tem FOR ALL (service_role) - OK
--
-- DUPLICATAS:
-- - Nenhuma duplicata detectada
--
-- PERFORMANCE:
-- - Todas as políticas otimizadas com (SELECT auth.uid()) ou (SELECT auth.jwt())
--
-- POLÍTICAS PERMISSIVAS:
-- - Apenas service_role tem USING (true) - OK (necessário para operações administrativas)
--
-- RLS:
-- - Habilitado em todas as tabelas

SELECT '✅ VALIDAÇÃO COMPLETA CONCLUÍDA' as resultado;
