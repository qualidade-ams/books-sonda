-- Verificar políticas RLS das tabelas de organograma
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operacao,
  roles,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename IN ('organizacao_estrutura', 'organizacao_produto', 'organizacao_multiplos_superiores')
  AND schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- Verificar se RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE tablename IN ('organizacao_estrutura', 'organizacao_produto', 'organizacao_multiplos_superiores')
  AND schemaname = 'public';
