-- SOLUÇÃO DEFINITIVA: Desabilitar RLS temporariamente para debug
-- ⚠️ ATENÇÃO: Isso remove a segurança! Use apenas para debug!

-- ============================================================================
-- OPÇÃO 1: Políticas Permissivas (RECOMENDADO)
-- ============================================================================

-- Tabela: books
DROP POLICY IF EXISTS "authenticated_select_books" ON public.books;
DROP POLICY IF EXISTS "authenticated_insert_books" ON public.books;
DROP POLICY IF EXISTS "authenticated_update_books" ON public.books;
DROP POLICY IF EXISTS "authenticated_delete_books" ON public.books;

CREATE POLICY "temp_all_access_books" ON public.books
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Tabela: user_group_assignments
DROP POLICY IF EXISTS "authenticated_select_user_group_assignments" ON public.user_group_assignments;
DROP POLICY IF EXISTS "authenticated_insert_user_group_assignments" ON public.user_group_assignments;
DROP POLICY IF EXISTS "authenticated_update_user_group_assignments" ON public.user_group_assignments;
DROP POLICY IF EXISTS "authenticated_delete_user_group_assignments" ON public.user_group_assignments;

CREATE POLICY "temp_all_access_user_group_assignments" ON public.user_group_assignments
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Tabela: empresa_produtos (se existir)
DROP POLICY IF EXISTS "authenticated_select_empresa_produtos" ON public.empresa_produtos;
DROP POLICY IF EXISTS "empresa_produtos_unified_access" ON public.empresa_produtos;

CREATE POLICY "temp_all_access_empresa_produtos" ON public.empresa_produtos
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ============================================================================
-- OPÇÃO 2: Desabilitar RLS Completamente (MAIS PERIGOSO)
-- ============================================================================

-- Descomente as linhas abaixo se a Opção 1 não funcionar:

-- ALTER TABLE public.books DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.user_group_assignments DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.empresa_produtos DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '⚠️ ATENÇÃO: Políticas permissivas temporárias criadas!';
  RAISE NOTICE '⚠️ TODOS os usuários autenticados têm acesso TOTAL!';
  RAISE NOTICE '⚠️ Remova estas políticas após identificar o problema!';
END $$;

-- Listar políticas atuais
SELECT 
  tablename,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE tablename IN ('books', 'user_group_assignments', 'empresa_produtos')
ORDER BY tablename, policyname;
