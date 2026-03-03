-- ============================================================================
-- Script de Verificação: Estrutura de Banco de Horas
-- Data: 2026-03-03
-- Propósito: Verificar estrutura de tabelas e políticas RLS
-- ============================================================================

-- VERIFICAÇÃO 1: Estrutura da tabela profiles
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- VERIFICAÇÃO 2: Verificar se existe user_group_assignments
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_group_assignments'
ORDER BY ordinal_position;

-- VERIFICAÇÃO 3: Políticas RLS de banco_horas_calculos
-- ============================================================================
SELECT 
  policyname,
  cmd as acao,
  roles,
  qual as condicao_using,
  with_check as condicao_with_check
FROM pg_policies
WHERE tablename = 'banco_horas_calculos'
  AND schemaname = 'public'
ORDER BY cmd, policyname;

-- VERIFICAÇÃO 4: Verificar duplicatas de políticas
-- ============================================================================
SELECT 
  tablename,
  cmd as acao,
  COUNT(*) as total_politicas,
  array_agg(policyname) as politicas
FROM pg_policies
WHERE tablename IN ('banco_horas_calculos', 'banco_horas_calculos_segmentados')
  AND schemaname = 'public'
GROUP BY tablename, cmd
HAVING COUNT(*) > 1;

-- VERIFICAÇÃO 5: Verificar função user_has_banco_horas_permission
-- ============================================================================
SELECT 
  proname as function_name,
  prosrc as source_code
FROM pg_proc
WHERE proname = 'user_has_banco_horas_permission'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- VERIFICAÇÃO 6: Testar permissão do usuário atual
-- ============================================================================
SELECT 
  auth.uid() as current_user_id,
  user_has_banco_horas_permission() as has_permission;

-- VERIFICAÇÃO 7: Grupos do usuário atual
-- ============================================================================
SELECT 
  uga.user_id,
  ug.id as group_id,
  ug.name as group_name
FROM user_group_assignments uga
JOIN user_groups ug ON uga.group_id = ug.id
WHERE uga.user_id = auth.uid();

-- VERIFICAÇÃO 8: Permissões de banco de horas do usuário atual
-- ============================================================================
SELECT 
  sp.screen_key,
  sp.permission_level,
  ug.name as group_name
FROM user_group_assignments uga
JOIN user_groups ug ON uga.group_id = ug.id
JOIN screen_permissions sp ON sp.group_id = ug.id
WHERE uga.user_id = auth.uid()
  AND sp.screen_key IN (
    'controle_banco_horas',
    'banco_horas_alocacoes',
    'banco_horas_visao_consolidada',
    'banco_horas_visao_segmentada'
  );
