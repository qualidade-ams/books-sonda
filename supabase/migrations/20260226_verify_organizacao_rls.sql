-- Script de Verificação: Políticas RLS da tabela organizacao_estrutura
-- Data: 2026-02-26
-- Descrição: Verifica se as políticas RLS estão configuradas corretamente

-- ============================================================================
-- VERIFICAÇÃO 1: Verificar se RLS está habilitado
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS Habilitado'
    ELSE '❌ RLS DESABILITADO - VULNERABILIDADE CRÍTICA'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename = 'organizacao_estrutura';

-- ============================================================================
-- VERIFICAÇÃO 2: Verificar políticas RLS
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as acao,
  CASE 
    WHEN qual = 'true' OR qual LIKE '%true%' THEN '⚠️ POLÍTICA PERMISSIVA - VULNERABILIDADE'
    WHEN qual LIKE '%user_has_organograma_permission%' THEN '✅ Política com verificação de permissão'
    ELSE '✅ Política restritiva'
  END as security_status,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename = 'organizacao_estrutura'
ORDER BY cmd, policyname;

-- ============================================================================
-- VERIFICAÇÃO 3: Verificar se função de permissão existe e está segura
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
  AND proname = 'user_has_organograma_permission';

-- ============================================================================
-- VERIFICAÇÃO 4: Verificar políticas duplicadas
-- ============================================================================
SELECT 
  tablename,
  cmd as acao,
  array_agg(policyname) as politicas_duplicadas,
  COUNT(*) as total
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename = 'organizacao_estrutura'
GROUP BY tablename, cmd
HAVING COUNT(*) > 1;

-- ============================================================================
-- VERIFICAÇÃO 5: Verificar se tela está cadastrada no sistema de permissões
-- ============================================================================
SELECT 
  key,
  name,
  description,
  category,
  route,
  CASE 
    WHEN key = 'organograma' THEN '✅ Tela cadastrada'
    ELSE '❌ Tela não encontrada'
  END as status
FROM public.screens
WHERE key = 'organograma';

-- ============================================================================
-- VERIFICAÇÃO 6: Verificar permissões concedidas aos grupos
-- ============================================================================
SELECT 
  ug.name as grupo,
  sp.screen_key as tela,
  sp.permission_level as nivel_permissao,
  CASE 
    WHEN sp.permission_level IN ('view', 'edit') THEN '✅ Permissão válida'
    ELSE '⚠️ Permissão inválida'
  END as status
FROM public.screen_permissions sp
JOIN public.user_groups ug ON sp.group_id = ug.id
WHERE sp.screen_key = 'organograma'
ORDER BY ug.name;

-- ============================================================================
-- RESULTADO ESPERADO
-- ============================================================================
-- VERIFICAÇÃO 1: RLS deve estar habilitado (✅)
-- VERIFICAÇÃO 2: Todas as políticas devem usar user_has_organograma_permission (✅)
-- VERIFICAÇÃO 3: Função deve ter SECURITY DEFINER e search_path=public (✅)
-- VERIFICAÇÃO 4: Não deve haver políticas duplicadas (0 linhas)
-- VERIFICAÇÃO 5: Tela 'organograma' deve estar cadastrada (✅)
-- VERIFICAÇÃO 6: Administradores devem ter permissão 'edit' (✅)
