-- ============================================================================
-- Script de Validação de Performance e Duplicatas RLS
-- Execute este script no Supabase SQL Editor APÓS aplicar a migration
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAR POLÍTICAS POR TABELA
-- ============================================================================

SELECT '📋 POLÍTICAS - TABELA taxas_clientes' as titulo;

SELECT 
  policyname as "Nome da Política",
  cmd as "Comando",
  roles::text as "Roles",
  CASE 
    WHEN qual IS NOT NULL THEN left(qual, 80) || '...'
    ELSE 'N/A'
  END as "USING Clause (resumo)"
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'taxas_clientes'
ORDER BY 
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
  CASE 
    WHEN qual IS NOT NULL THEN left(qual, 80) || '...'
    ELSE 'N/A'
  END as "USING Clause (resumo)"
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'valores_taxas_funcoes'
ORDER BY 
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
  CASE 
    WHEN qual IS NOT NULL THEN left(qual, 80) || '...'
    ELSE 'N/A'
  END as "USING Clause (resumo)"
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY 
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    WHEN 'ALL' THEN 5
  END;

-- ============================================================================
-- 2. DETECTAR PROBLEMAS DE PERFORMANCE
-- ============================================================================

SELECT '🚀 VERIFICAÇÃO DE PERFORMANCE' as titulo;

SELECT 
  tablename as "Tabela",
  policyname as "Política",
  cmd as "Comando",
  CASE 
    -- Detectar auth.uid() sem SELECT
    WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%' 
    THEN '⚠️ PERFORMANCE: auth.uid() re-avalia para cada linha'
    
    -- Detectar current_setting() sem SELECT
    WHEN qual LIKE '%current_setting%' AND qual NOT LIKE '%(SELECT current_setting%'
    THEN '⚠️ PERFORMANCE: current_setting() re-avalia para cada linha'
    
    -- Detectar auth.role() sem SELECT
    WHEN qual LIKE '%auth.role()%' AND qual NOT LIKE '%(SELECT auth.role())%'
    THEN '⚠️ PERFORMANCE: auth.role() re-avalia para cada linha'
    
    -- Verificar WITH CHECK também
    WHEN with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%'
    THEN '⚠️ PERFORMANCE: WITH CHECK usa auth.uid() sem SELECT'
    
    ELSE '✅ Otimizado'
  END as "Status de Performance",
  CASE 
    WHEN qual LIKE '%has_screen_permission%' THEN '✅ Usa has_screen_permission (otimizado)'
    WHEN qual LIKE '%(SELECT auth.uid())%' THEN '✅ Usa (SELECT auth.uid())'
    WHEN qual LIKE '%(SELECT auth.role())%' THEN '✅ Usa (SELECT auth.role())'
    ELSE 'Verificar manualmente'
  END as "Tipo de Otimização"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('taxas_clientes', 'valores_taxas_funcoes', 'profiles')
ORDER BY 
  CASE 
    WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%' THEN 1
    WHEN qual LIKE '%current_setting%' AND qual NOT LIKE '%(SELECT current_setting%' THEN 1
    WHEN qual LIKE '%auth.role()%' AND qual NOT LIKE '%(SELECT auth.role())%' THEN 1
    ELSE 2
  END,
  tablename, cmd;

-- Se a query acima retornar apenas "✅ Otimizado", está tudo correto!

-- ============================================================================
-- 3. DETECTAR POLÍTICAS DUPLICADAS
-- ============================================================================

SELECT '🔍 VERIFICAÇÃO DE DUPLICATAS' as titulo;

SELECT 
  tablename as "Tabela",
  cmd as "Comando",
  roles::text as "Roles",
  COUNT(*) as "Quantidade de Políticas",
  array_agg(policyname) as "Nomes das Políticas",
  CASE 
    WHEN COUNT(*) > 1 THEN '⚠️ DUPLICATA DETECTADA - Múltiplas políticas permissivas'
    ELSE '✅ Sem duplicatas'
  END as "Status"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('taxas_clientes', 'valores_taxas_funcoes', 'profiles')
  AND permissive = 'PERMISSIVE'  -- Apenas políticas permissivas
GROUP BY tablename, cmd, roles::text
ORDER BY 
  CASE WHEN COUNT(*) > 1 THEN 1 ELSE 2 END,
  tablename, cmd;

-- Se a query acima retornar apenas "✅ Sem duplicatas", está correto!

-- ============================================================================
-- 4. CONTAGEM DE POLÍTICAS POR TABELA
-- ============================================================================

SELECT '📊 ESTATÍSTICAS DE POLÍTICAS' as titulo;

SELECT 
  tablename as "Tabela",
  COUNT(*) as "Total de Políticas",
  COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as "SELECT",
  COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as "INSERT",
  COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as "UPDATE",
  COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as "DELETE",
  COUNT(CASE WHEN cmd = 'ALL' THEN 1 END) as "ALL",
  CASE 
    WHEN COUNT(*) = 5 THEN '✅ Quantidade correta (5 políticas)'
    WHEN COUNT(*) > 5 THEN '⚠️ Mais de 5 políticas - pode haver duplicatas'
    ELSE '⚠️ Menos de 5 políticas - pode estar incompleto'
  END as "Status"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('taxas_clientes', 'valores_taxas_funcoes', 'profiles')
GROUP BY tablename
ORDER BY tablename;

-- RESULTADO ESPERADO: Cada tabela deve ter exatamente 5 políticas
-- (1 SELECT, 1 INSERT, 1 UPDATE, 1 DELETE, 1 ALL)

-- ============================================================================
-- 5. VERIFICAR RLS HABILITADO
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
  AND tablename IN ('taxas_clientes', 'valores_taxas_funcoes', 'profiles')
ORDER BY tablename;

-- ============================================================================
-- 6. ANÁLISE DETALHADA DE PERFORMANCE (OPCIONAL)
-- ============================================================================

SELECT '🔬 ANÁLISE DETALHADA DE PERFORMANCE' as titulo;

SELECT 
  tablename as "Tabela",
  policyname as "Política",
  cmd as "Comando",
  -- Analisar USING clause
  CASE 
    WHEN qual LIKE '%has_screen_permission%' THEN '✅ Usa função otimizada'
    WHEN qual LIKE '%(SELECT auth.uid())%' THEN '✅ auth.uid() com SELECT'
    WHEN qual LIKE '%(SELECT auth.role())%' THEN '✅ auth.role() com SELECT'
    WHEN qual LIKE '%auth.uid()%' THEN '❌ auth.uid() SEM SELECT'
    WHEN qual LIKE '%auth.role()%' THEN '❌ auth.role() SEM SELECT'
    WHEN qual LIKE '%current_setting%' THEN '❌ current_setting() SEM SELECT'
    WHEN qual = 'true' THEN '⚠️ USING (true) - permissivo'
    ELSE '✅ Outro (verificar)'
  END as "USING Performance",
  -- Analisar WITH CHECK clause
  CASE 
    WHEN with_check IS NULL THEN 'N/A'
    WHEN with_check LIKE '%has_screen_permission%' THEN '✅ Usa função otimizada'
    WHEN with_check LIKE '%(SELECT auth.uid())%' THEN '✅ auth.uid() com SELECT'
    WHEN with_check LIKE '%auth.uid()%' THEN '❌ auth.uid() SEM SELECT'
    WHEN with_check = 'true' THEN '⚠️ WITH CHECK (true) - permissivo'
    ELSE '✅ Outro (verificar)'
  END as "WITH CHECK Performance"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('taxas_clientes', 'valores_taxas_funcoes', 'profiles')
ORDER BY 
  CASE 
    WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%' THEN 1
    WHEN with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%' THEN 1
    ELSE 2
  END,
  tablename, cmd;

-- ============================================================================
-- 7. RESUMO EXECUTIVO
-- ============================================================================

SELECT '📈 RESUMO EXECUTIVO' as titulo;

WITH policy_stats AS (
  SELECT 
    COUNT(*) as total_policies,
    COUNT(CASE WHEN tablename = 'taxas_clientes' THEN 1 END) as taxas_clientes_count,
    COUNT(CASE WHEN tablename = 'valores_taxas_funcoes' THEN 1 END) as valores_taxas_count,
    COUNT(CASE WHEN tablename = 'profiles' THEN 1 END) as profiles_count,
    -- Detectar problemas de performance
    COUNT(CASE 
      WHEN (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%') OR
           (qual LIKE '%current_setting%' AND qual NOT LIKE '%(SELECT current_setting%') OR
           (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
      THEN 1 
    END) as performance_issues,
    -- Detectar duplicatas
    (SELECT COUNT(*) FROM (
      SELECT tablename, cmd, roles::text
      FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename IN ('taxas_clientes', 'valores_taxas_funcoes', 'profiles')
        AND permissive = 'PERMISSIVE'
      GROUP BY tablename, cmd, roles::text
      HAVING COUNT(*) > 1
    ) duplicates) as duplicate_policies
  FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename IN ('taxas_clientes', 'valores_taxas_funcoes', 'profiles')
)
SELECT 
  total_policies as "Total de Políticas",
  taxas_clientes_count as "taxas_clientes",
  valores_taxas_count as "valores_taxas_funcoes",
  profiles_count as "profiles",
  performance_issues as "Problemas de Performance",
  duplicate_policies as "Políticas Duplicadas",
  CASE 
    WHEN performance_issues = 0 AND duplicate_policies = 0 AND 
         taxas_clientes_count = 5 AND valores_taxas_count = 5 AND profiles_count = 5
    THEN '✅ TUDO CORRETO - Sistema otimizado e sem duplicatas'
    WHEN performance_issues > 0
    THEN '⚠️ ATENÇÃO: Problemas de performance detectados'
    WHEN duplicate_policies > 0
    THEN '⚠️ ATENÇÃO: Políticas duplicadas detectadas'
    ELSE '⚠️ ATENÇÃO: Verificar contagem de políticas'
  END as "Status Geral"
FROM policy_stats;

-- ============================================================================
-- INTERPRETAÇÃO DOS RESULTADOS
-- ============================================================================

-- ✅ SISTEMA SAUDÁVEL:
-- - Total de 15 políticas (5 por tabela)
-- - 0 problemas de performance
-- - 0 políticas duplicadas
-- - RLS habilitado em todas as tabelas
-- - Todas as políticas usam (SELECT auth.uid()) ou has_screen_permission()

-- ⚠️ AÇÕES NECESSÁRIAS SE HOUVER PROBLEMAS:
-- 1. Problemas de performance: Execute novamente a migration
-- 2. Políticas duplicadas: Identifique e remova manualmente as duplicatas
-- 3. RLS desabilitado: Execute ALTER TABLE ... ENABLE ROW LEVEL SECURITY
-- 4. Contagem incorreta: Verifique se há políticas antigas não removidas

SELECT '✅ VALIDAÇÃO CONCLUÍDA' as resultado;
