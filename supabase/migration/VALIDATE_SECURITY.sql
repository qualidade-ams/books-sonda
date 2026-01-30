-- =====================================================
-- Script de Validação de Segurança - Supabase
-- Data: 2026-01-30
-- Descrição: Verifica todas as vulnerabilidades de segurança
--            no banco de dados
-- =====================================================

-- 1. VERIFICAR TABELAS SEM RLS
-- =====================================================
SELECT 
  '🔍 TABELAS SEM RLS' as categoria,
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS Habilitado'
    ELSE '❌ RLS DESABILITADO - VULNERABILIDADE CRÍTICA'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE 'sql_%'
ORDER BY rowsecurity, tablename;

-- 2. VERIFICAR FUNÇÕES COM search_path VULNERÁVEL
-- =====================================================
SELECT 
  '🔍 FUNÇÕES INSEGURAS' as categoria,
  proname as function_name,
  prosecdef as is_security_definer,
  CASE 
    WHEN proconfig IS NULL OR NOT ('search_path=public' = ANY(proconfig)) 
    THEN '⚠️ VULNERABILIDADE: search_path não definido'
    ELSE '✅ Seguro'
  END as security_status,
  proconfig as config_settings
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND prokind = 'f'
  AND prosecdef = true
ORDER BY 
  CASE 
    WHEN proconfig IS NULL OR NOT ('search_path=public' = ANY(proconfig)) 
    THEN 0 
    ELSE 1 
  END,
  proname;

-- 3. VERIFICAR POLÍTICAS RLS
-- =====================================================
WITH table_policies AS (
  SELECT 
    schemaname,
    tablename,
    COUNT(*) as policy_count,
    array_agg(cmd) as commands,
    array_agg(qual) as policy_expressions
  FROM pg_policies 
  WHERE schemaname = 'public'
  GROUP BY schemaname, tablename
)
SELECT 
  '🔍 POLÍTICAS RLS' as categoria,
  t.tablename,
  COALESCE(tp.policy_count, 0) as policies,
  CASE 
    WHEN tp.policy_count >= 4 AND 
         'SELECT' = ANY(tp.commands) AND
         'INSERT' = ANY(tp.commands) AND
         'UPDATE' = ANY(tp.commands) AND
         'DELETE' = ANY(tp.commands)
    THEN '✅ Políticas Completas'
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
  AND t.tablename NOT LIKE 'pg_%'
  AND t.tablename NOT LIKE 'sql_%'
  AND t.rowsecurity = true
ORDER BY 
  CASE 
    WHEN tp.policy_count >= 4 THEN 2
    WHEN tp.policy_count > 0 THEN 1
    ELSE 0
  END,
  t.tablename;

-- 4. RESUMO GERAL DE SEGURANÇA
-- =====================================================
WITH security_summary AS (
  SELECT 
    COUNT(*) FILTER (WHERE rowsecurity = false) as tables_without_rls,
    COUNT(*) FILTER (WHERE rowsecurity = true) as tables_with_rls,
    COUNT(*) as total_tables
  FROM pg_tables 
  WHERE schemaname = 'public'
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT LIKE 'sql_%'
),
function_summary AS (
  SELECT 
    COUNT(*) FILTER (
      WHERE proconfig IS NULL OR NOT ('search_path=public' = ANY(proconfig))
    ) as vulnerable_functions,
    COUNT(*) FILTER (
      WHERE 'search_path=public' = ANY(proconfig)
    ) as secure_functions,
    COUNT(*) as total_functions
  FROM pg_proc 
  WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND prokind = 'f'
    AND prosecdef = true
)
SELECT 
  '📊 RESUMO DE SEGURANÇA' as categoria,
  ss.tables_without_rls as "Tabelas sem RLS",
  ss.tables_with_rls as "Tabelas com RLS",
  ss.total_tables as "Total de Tabelas",
  fs.vulnerable_functions as "Funções Vulneráveis",
  fs.secure_functions as "Funções Seguras",
  fs.total_functions as "Total de Funções",
  CASE 
    WHEN ss.tables_without_rls = 0 AND fs.vulnerable_functions = 0 
    THEN '✅ BANCO SEGURO'
    WHEN ss.tables_without_rls > 0 OR fs.vulnerable_functions > 0
    THEN '⚠️ VULNERABILIDADES ENCONTRADAS'
    ELSE '❓ VERIFICAÇÃO INCOMPLETA'
  END as "Status Geral"
FROM security_summary ss, function_summary fs;

-- 5. AÇÕES RECOMENDADAS
-- =====================================================
DO $$
DECLARE
  v_tables_without_rls integer;
  v_vulnerable_functions integer;
BEGIN
  -- Contar tabelas sem RLS
  SELECT COUNT(*) INTO v_tables_without_rls
  FROM pg_tables 
  WHERE schemaname = 'public'
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT LIKE 'sql_%'
    AND rowsecurity = false;
  
  -- Contar funções vulneráveis
  SELECT COUNT(*) INTO v_vulnerable_functions
  FROM pg_proc 
  WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND prokind = 'f'
    AND prosecdef = true
    AND (proconfig IS NULL OR NOT ('search_path=public' = ANY(proconfig)));
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '📋 AÇÕES RECOMENDADAS';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
  IF v_tables_without_rls > 0 THEN
    RAISE NOTICE '❌ % tabela(s) sem RLS encontrada(s)', v_tables_without_rls;
    RAISE NOTICE '   → Execute: ALTER TABLE <nome_tabela> ENABLE ROW LEVEL SECURITY;';
    RAISE NOTICE '   → Crie políticas RLS apropriadas para cada tabela';
  ELSE
    RAISE NOTICE '✅ Todas as tabelas têm RLS habilitado';
  END IF;
  
  IF v_vulnerable_functions > 0 THEN
    RAISE NOTICE '❌ % função(ões) vulnerável(eis) encontrada(s)', v_vulnerable_functions;
    RAISE NOTICE '   → Adicione SET search_path = public a cada função';
    RAISE NOTICE '   → Use CREATE OR REPLACE FUNCTION ... SET search_path = public';
  ELSE
    RAISE NOTICE '✅ Todas as funções SECURITY DEFINER estão seguras';
  END IF;
  
  IF v_tables_without_rls = 0 AND v_vulnerable_functions = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 PARABÉNS! Seu banco de dados está seguro!';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Execute a migration 20260130000001_fix_sync_control_security.sql';
    RAISE NOTICE '    para corrigir as vulnerabilidades encontradas.';
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;
