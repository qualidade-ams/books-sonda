-- =====================================================
-- SCRIPT: Validação Automática de Segurança
-- Descrição: Executa todas as verificações de segurança
--           conforme diretrizes do steering security-validation.md
-- =====================================================

-- 1. Verificação de Funções Inseguras
SELECT 
  '🔍 VERIFICAÇÃO DE FUNÇÕES INSEGURAS' as check_type,
  '' as separator;

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
  AND proname NOT LIKE 'pg_%'
  AND proname NOT LIKE 'sql_%'
ORDER BY proname;

-- 2. Verificação de RLS
SELECT 
  '🔒 VERIFICAÇÃO DE RLS' as check_type,
  '' as separator;

SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS Habilitado'
    ELSE '⚠️ RLS DESABILITADO - VULNERABILIDADE CRÍTICA'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE 'sql_%'
ORDER BY tablename;

-- 3. Verificação de Políticas RLS e Performance
SELECT 
  '🛡️ VERIFICAÇÃO DE POLÍTICAS RLS' as check_type,
  '' as separator;

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
ORDER BY t.tablename;

-- 4. Resumo de Segurança
SELECT 
  '📊 RESUMO DE SEGURANÇA' as check_type,
  '' as separator;

WITH security_summary AS (
  -- Funções inseguras
  SELECT 
    'Funções Inseguras' as category,
    COUNT(*) as total_count,
    COUNT(*) FILTER (
      WHERE proconfig IS NULL OR NOT ('search_path=public' = ANY(proconfig))
    ) as vulnerable_count
  FROM pg_proc 
  WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND prokind = 'f'
    AND proname NOT LIKE 'pg_%'
    AND proname NOT LIKE 'sql_%'
  
  UNION ALL
  
  -- Tabelas sem RLS
  SELECT 
    'Tabelas sem RLS' as category,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE rowsecurity = false) as vulnerable_count
  FROM pg_tables 
  WHERE schemaname = 'public'
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT LIKE 'sql_%'
  
  UNION ALL
  
  -- Tabelas sem políticas
  SELECT 
    'Tabelas sem Políticas' as category,
    COUNT(DISTINCT t.tablename) as total_count,
    COUNT(DISTINCT t.tablename) FILTER (
      WHERE NOT EXISTS (
        SELECT 1 FROM pg_policies p 
        WHERE p.tablename = t.tablename AND p.schemaname = 'public'
      )
    ) as vulnerable_count
  FROM pg_tables t
  WHERE t.schemaname = 'public'
    AND t.tablename NOT LIKE 'pg_%'
    AND t.tablename NOT LIKE 'sql_%'
)
SELECT 
  category,
  total_count,
  vulnerable_count,
  CASE 
    WHEN vulnerable_count = 0 THEN '✅ Seguro'
    WHEN vulnerable_count < total_count THEN '⚠️ Parcialmente Vulnerável'
    ELSE '❌ Totalmente Vulnerável'
  END as security_status,
  ROUND((total_count - vulnerable_count) * 100.0 / NULLIF(total_count, 0), 1) || '%' as security_percentage
FROM security_summary
ORDER BY vulnerable_count DESC;

-- 5. Alertas Críticos
SELECT 
  '🚨 ALERTAS CRÍTICOS' as check_type,
  '' as separator;

-- Funções críticas sem search_path
SELECT 
  'CRÍTICO: Função sem search_path' as alert_type,
  proname as item_name,
  'Função SECURITY DEFINER sem search_path é vulnerável a ataques' as description
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND prokind = 'f'
  AND prosecdef = true
  AND (proconfig IS NULL OR NOT ('search_path=public' = ANY(proconfig)))
  AND proname NOT LIKE 'pg_%'
  AND proname NOT LIKE 'sql_%'

UNION ALL

-- Tabelas críticas sem RLS
SELECT 
  'CRÍTICO: Tabela sem RLS' as alert_type,
  tablename as item_name,
  'Tabela sem RLS permite acesso irrestrito aos dados' as description
FROM pg_tables 
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE 'sql_%'
  AND tablename IN ('users', 'user_groups', 'screen_permissions', 'especialistas', 'elogios')

UNION ALL

-- Tabelas importantes sem políticas
SELECT 
  'CRÍTICO: Tabela sem políticas RLS' as alert_type,
  t.tablename as item_name,
  'Tabela com RLS habilitado mas sem políticas bloqueia todo acesso' as description
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p 
    WHERE p.tablename = t.tablename AND p.schemaname = 'public'
  )
  AND t.tablename NOT LIKE 'pg_%'
  AND t.tablename NOT LIKE 'sql_%';

-- 6. Recomendações
SELECT 
  '💡 RECOMENDAÇÕES' as check_type,
  '' as separator;

SELECT 
  'Para corrigir funções inseguras, execute:' as recommendation,
  'DROP FUNCTION IF EXISTS ' || proname || '() CASCADE; CREATE OR REPLACE FUNCTION public.' || proname || '() ... SECURITY DEFINER SET search_path = public;' as sql_fix
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND prokind = 'f'
  AND prosecdef = true
  AND (proconfig IS NULL OR NOT ('search_path=public' = ANY(proconfig)))
  AND proname NOT LIKE 'pg_%'
  AND proname NOT LIKE 'sql_%'
LIMIT 3;

-- Mensagem final
SELECT 
  '✅ VALIDAÇÃO DE SEGURANÇA CONCLUÍDA' as final_message,
  'Execute as correções recomendadas para resolver vulnerabilidades' as action_required;