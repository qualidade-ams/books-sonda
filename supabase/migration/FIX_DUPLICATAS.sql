-- =====================================================
-- CORREÇÃO DE FUNÇÕES DUPLICADAS
-- Problema: Existem 2 versões de cada função (segura + vulnerável)
-- Solução: Identificar e remover as versões vulneráveis
-- =====================================================

-- PASSO 1: Identificar todas as versões das funções
SELECT 
  '🔍 IDENTIFICANDO DUPLICATAS' as secao,
  p.oid as function_oid,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  CASE 
    WHEN 'search_path=public' = ANY(p.proconfig) 
    THEN '✅ SEGURA'
    ELSE '❌ VULNERÁVEL'
  END as status,
  p.proconfig as config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'gerar_hash_pesquisa',
    'gerar_chave_unica_pesquisa',
    'registrar_sincronizacao_pesquisas',
    'obter_ultima_sincronizacao_pesquisas'
  )
ORDER BY p.proname, status DESC;

-- PASSO 2: Remover TODAS as versões vulneráveis
DO $$
DECLARE
  v_function record;
  v_drop_command text;
  v_removed integer := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🗑️ REMOVENDO FUNÇÕES VULNERÁVEIS';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
  FOR v_function IN
    SELECT 
      p.oid,
      p.proname,
      pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'gerar_hash_pesquisa',
        'gerar_chave_unica_pesquisa',
        'registrar_sincronizacao_pesquisas',
        'obter_ultima_sincronizacao_pesquisas'
      )
      AND (p.proconfig IS NULL OR NOT ('search_path=public' = ANY(p.proconfig)))
  LOOP
    v_drop_command := format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', 
                             v_function.proname, 
                             v_function.args);
    
    EXECUTE v_drop_command;
    v_removed := v_removed + 1;
    
    RAISE NOTICE '✅ Removida: %.%(%) - VULNERÁVEL', 
                 'public', v_function.proname, v_function.args;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 Total de funções vulneráveis removidas: %', v_removed;
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- PASSO 3: Verificar se ainda existem funções vulneráveis
DO $$
DECLARE
  v_vulnerable integer;
  v_secure integer;
  v_total integer;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE proconfig IS NULL OR NOT ('search_path=public' = ANY(proconfig))),
    COUNT(*) FILTER (WHERE 'search_path=public' = ANY(proconfig)),
    COUNT(*)
  INTO v_vulnerable, v_secure, v_total
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'gerar_hash_pesquisa',
      'gerar_chave_unica_pesquisa',
      'registrar_sincronizacao_pesquisas',
      'obter_ultima_sincronizacao_pesquisas'
    );
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '📊 RESULTADO FINAL';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE 'Total de funções: %', v_total;
  RAISE NOTICE 'Funções seguras: %', v_secure;
  RAISE NOTICE 'Funções vulneráveis: %', v_vulnerable;
  RAISE NOTICE '';
  
  IF v_vulnerable = 0 AND v_secure >= 4 THEN
    RAISE NOTICE '🎉 SUCESSO! Todas as funções estão seguras!';
  ELSIF v_vulnerable > 0 THEN
    RAISE NOTICE '⚠️ ATENÇÃO: Ainda existem % funções vulneráveis', v_vulnerable;
    RAISE NOTICE '   Execute este script novamente';
  ELSE
    RAISE NOTICE '⚠️ ATENÇÃO: Apenas % funções encontradas (esperado: 4)', v_secure;
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- PASSO 4: Listar funções restantes
SELECT 
  '✅ FUNÇÕES FINAIS' as secao,
  p.proname as "Função",
  pg_get_function_identity_arguments(p.oid) as "Argumentos",
  CASE 
    WHEN 'search_path=public' = ANY(p.proconfig) 
    THEN '✅ SEGURA'
    ELSE '❌ VULNERÁVEL'
  END as "Status"
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'gerar_hash_pesquisa',
    'gerar_chave_unica_pesquisa',
    'registrar_sincronizacao_pesquisas',
    'obter_ultima_sincronizacao_pesquisas'
  )
ORDER BY p.proname, "Status" DESC;
