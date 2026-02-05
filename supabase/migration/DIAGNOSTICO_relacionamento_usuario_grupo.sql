-- ============================================================================
-- DIAGNÓSTICO: Como usuários se relacionam com grupos?
-- ============================================================================

-- 1. Listar TODAS as tabelas do schema public
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Buscar qualquer coluna que referencie user_groups
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name LIKE '%group%'
ORDER BY table_name, column_name;

-- 3. Verificar foreign keys que apontam para user_groups
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_name = 'user_groups';

-- 4. Verificar se há alguma view que relaciona usuários e grupos
SELECT 
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%user%'
    OR table_name LIKE '%group%'
    OR table_name LIKE '%member%'
  );

-- 5. Buscar em todas as colunas por 'user' e 'group'
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    column_name LIKE '%user%'
    OR column_name LIKE '%group%'
  )
ORDER BY table_name, column_name;
