-- =====================================================
-- COPIE E COLE ESTE SCRIPT COMPLETO NO SUPABASE SQL EDITOR
-- Depois clique em RUN
-- =====================================================

-- Alterar search_path das funções existentes
ALTER FUNCTION public.gerar_hash_pesquisa(jsonb) SET search_path = public;
ALTER FUNCTION public.gerar_chave_unica_pesquisa(text, text, text, text) SET search_path = public;
ALTER FUNCTION public.registrar_sincronizacao_pesquisas(text, integer, integer, jsonb) SET search_path = public;
ALTER FUNCTION public.obter_ultima_sincronizacao_pesquisas(text) SET search_path = public;

-- Verificar resultado
SELECT 
  proname as "Função",
  CASE 
    WHEN 'search_path=public' = ANY(proconfig) 
    THEN '✅ SEGURA'
    ELSE '❌ VULNERÁVEL'
  END as "Status"
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN (
    'gerar_hash_pesquisa',
    'gerar_chave_unica_pesquisa',
    'registrar_sincronizacao_pesquisas',
    'obter_ultima_sincronizacao_pesquisas'
  )
ORDER BY proname;
