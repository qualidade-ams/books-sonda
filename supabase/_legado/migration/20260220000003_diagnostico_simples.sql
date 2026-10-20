-- Diagnóstico Simples: Verificar tabela percentual_repasse_historico
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se a tabela existe
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'percentual_repasse_historico'
    ) THEN '✅ Tabela existe'
    ELSE '❌ Tabela NÃO existe - Execute a migration 20260220000001'
  END as status_tabela;

-- 2. Verificar colunas
SELECT 
  COUNT(*) as total_colunas,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Tabela tem colunas'
    ELSE '❌ Tabela sem colunas'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'percentual_repasse_historico';

-- 3. Verificar RLS
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS Habilitado'
    ELSE '❌ RLS Desabilitado'
  END as status_rls
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'percentual_repasse_historico';

-- 4. Listar políticas RLS
SELECT 
  policyname as politica,
  cmd as comando,
  CASE 
    WHEN qual IS NOT NULL THEN '✅ Tem condição'
    ELSE '⚠️ Sem condição'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'percentual_repasse_historico'
ORDER BY cmd;

-- 5. Verificar funções
SELECT 
  proname as funcao,
  CASE 
    WHEN prosecdef THEN '✅ SECURITY DEFINER'
    ELSE '❌ Sem SECURITY DEFINER'
  END as security,
  CASE 
    WHEN 'search_path=public' = ANY(proconfig) THEN '✅ search_path OK'
    ELSE '⚠️ search_path não definido'
  END as search_path
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname LIKE '%percentual_repasse%'
ORDER BY proname;

-- 6. Contar registros (se a tabela existir)
SELECT 
  COUNT(*) as total_registros,
  COUNT(CASE WHEN data_fim IS NULL THEN 1 END) as vigencias_ativas
FROM percentual_repasse_historico;

-- 7. Testar função de permissão
SELECT 
  CASE 
    WHEN user_can_access_percentual_repasse_historico() THEN '✅ Você tem permissão'
    ELSE '❌ Você NÃO tem permissão'
  END as status_permissao;
