-- ============================================================================
-- DIAGNÓSTICO: Estrutura de Permissões
-- ============================================================================
-- Execute este SQL no Supabase SQL Editor para descobrir a estrutura real

-- 1. Verificar se user_group_members existe
SELECT 
  'user_group_members' as tabela,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_group_members'
  ) as existe;

-- 2. Verificar estrutura da tabela profiles
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 3. Verificar estrutura da tabela user_groups
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_groups'
ORDER BY ordinal_position;

-- 4. Verificar estrutura da tabela screen_permissions
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'screen_permissions'
ORDER BY ordinal_position;

-- 5. Listar todas as tabelas relacionadas a grupos/permissões
SELECT 
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%group%'
    OR table_name LIKE '%permission%'
    OR table_name LIKE '%member%'
  )
ORDER BY table_name;

-- 6. Verificar se profiles tem group_id
SELECT 
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'group_id'
  ) as profiles_tem_group_id;

-- ============================================================================
-- RESULTADO ESPERADO:
-- ============================================================================
-- Com base nos resultados acima, saberemos:
-- 1. Se user_group_members existe ou não
-- 2. Se profiles tem group_id diretamente
-- 3. Qual é a estrutura real de relacionamento entre usuários e grupos
-- ============================================================================
