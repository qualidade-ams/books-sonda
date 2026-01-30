-- =====================================================
-- DIAGNÓSTICO COMPLETO - Funções Vulneráveis
-- Execute este script PRIMEIRO para entender o problema
-- =====================================================

-- 1. Verificar se as funções existem
SELECT 
  '🔍 FUNÇÕES EXISTENTES' as secao,
  p.proname as "Nome da Função",
  pg_get_functiondef(p.oid) as "Definição Completa"
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'gerar_hash_pesquisa',
    'gerar_chave_unica_pesquisa',
    'atualizar_hash_pesquisa',
    'registrar_sincronizacao_pesquisas',
    'obter_ultima_sincronizacao_pesquisas'
  )
ORDER BY p.proname;

-- 2. Verificar configuração de search_path
SELECT 
  '🔍 CONFIGURAÇÃO search_path' as secao,
  p.proname as "Função",
  p.prosecdef as "SECURITY DEFINER",
  p.proconfig as "Configuração",
  CASE 
    WHEN p.proconfig IS NULL THEN '❌ Nenhuma configuração'
    WHEN 'search_path=public' = ANY(p.proconfig) THEN '✅ search_path fixo'
    ELSE '⚠️ Configuração: ' || array_to_string(p.proconfig, ', ')
  END as "Status"
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'gerar_hash_pesquisa',
    'gerar_chave_unica_pesquisa',
    'atualizar_hash_pesquisa',
    'registrar_sincronizacao_pesquisas',
    'obter_ultima_sincronizacao_pesquisas'
  )
ORDER BY p.proname;

-- 3. Verificar owner das funções
SELECT 
  '🔍 OWNER DAS FUNÇÕES' as secao,
  p.proname as "Função",
  pg_catalog.pg_get_userbyid(p.proowner) as "Owner"
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'gerar_hash_pesquisa',
    'gerar_chave_unica_pesquisa',
    'atualizar_hash_pesquisa',
    'registrar_sincronizacao_pesquisas',
    'obter_ultima_sincronizacao_pesquisas'
  )
ORDER BY p.proname;

-- 4. Verificar dependências
SELECT 
  '🔍 DEPENDÊNCIAS' as secao,
  p.proname as "Função",
  COUNT(d.objid) as "Número de Dependências"
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
LEFT JOIN pg_depend d ON d.objid = p.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'gerar_hash_pesquisa',
    'gerar_chave_unica_pesquisa',
    'atualizar_hash_pesquisa',
    'registrar_sincronizacao_pesquisas',
    'obter_ultima_sincronizacao_pesquisas'
  )
GROUP BY p.proname
ORDER BY p.proname;
