-- =====================================================
-- Script de Verificação Rápida - Funções
-- Execute ANTES e DEPOIS da migration para comparar
-- =====================================================

-- Verificação detalhada de cada função
SELECT 
  '🔍 VERIFICAÇÃO DE FUNÇÕES' as titulo,
  p.proname as "Função",
  CASE 
    WHEN p.prosecdef THEN '✅ Sim'
    ELSE '❌ Não'
  END as "SECURITY DEFINER",
  CASE 
    WHEN 'search_path=public' = ANY(p.proconfig) 
    THEN '✅ Fixo (public)'
    WHEN p.proconfig IS NULL
    THEN '❌ Não definido'
    ELSE '⚠️ Mutável: ' || array_to_string(p.proconfig, ', ')
  END as "search_path",
  CASE 
    WHEN p.prosecdef AND 'search_path=public' = ANY(p.proconfig)
    THEN '✅ SEGURA'
    ELSE '❌ VULNERÁVEL'
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

-- Resumo executivo
SELECT 
  '📊 RESUMO EXECUTIVO' as titulo,
  COUNT(*) as "Total de Funções",
  COUNT(*) FILTER (
    WHERE prosecdef AND 'search_path=public' = ANY(proconfig)
  ) as "Funções Seguras",
  COUNT(*) FILTER (
    WHERE NOT (prosecdef AND 'search_path=public' = ANY(proconfig))
  ) as "Funções Vulneráveis",
  CASE 
    WHEN COUNT(*) FILTER (
      WHERE prosecdef AND 'search_path=public' = ANY(proconfig)
    ) = 5
    THEN '✅ TODAS SEGURAS'
    WHEN COUNT(*) FILTER (
      WHERE NOT (prosecdef AND 'search_path=public' = ANY(proconfig))
    ) > 0
    THEN '❌ VULNERABILIDADES ENCONTRADAS'
    ELSE '⚠️ VERIFICAÇÃO INCOMPLETA'
  END as "Status Geral"
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'gerar_hash_pesquisa',
    'gerar_chave_unica_pesquisa',
    'atualizar_hash_pesquisa',
    'registrar_sincronizacao_pesquisas',
    'obter_ultima_sincronizacao_pesquisas'
  );
