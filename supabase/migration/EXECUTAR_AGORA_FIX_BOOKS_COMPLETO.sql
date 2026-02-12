-- ============================================================================
-- SCRIPT DE CORREÇÃO COMPLETA - SISTEMA DE BOOKS (INCLUINDO RLS)
-- ============================================================================
-- Descrição: Corrige função de permissões, cadastra tela e corrige RLS
-- Data: 10/02/2026
-- IMPORTANTE: Executar este script no Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PASSO 1: Corrigir função de permissões
-- ============================================================================

DROP FUNCTION IF EXISTS public.user_has_books_permission(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.user_has_books_permission(required_level TEXT DEFAULT 'view')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role sempre tem acesso
  IF current_setting('role', true) = 'service_role' THEN
    RETURN true;
  END IF;

  -- Verificar se usuário tem permissão na tela 'geracao_books'
  -- CORRIGIDO: Usa user_group_assignments em vez de p.group_id
  RETURN EXISTS (
    SELECT 1
    FROM profiles p
    JOIN user_group_assignments uga ON p.id = uga.user_id
    JOIN user_groups ug ON uga.group_id = ug.id
    JOIN screen_permissions sp ON sp.group_id = ug.id
    WHERE p.id = (SELECT auth.uid())
      AND sp.screen_key = 'geracao_books'
      AND (
        (required_level = 'view' AND sp.permission_level IN ('view', 'edit')) OR
        (required_level = 'edit' AND sp.permission_level = 'edit')
      )
  );
END;
$$;

COMMENT ON FUNCTION public.user_has_books_permission(TEXT) IS 'Verifica se usuário tem permissão para acessar books. Usa user_group_assignments para relacionar usuário com grupo.';

-- ============================================================================
-- PASSO 2: Corrigir políticas RLS da tabela books
-- ============================================================================

-- Remover políticas antigas que podem estar causando conflito
DROP POLICY IF EXISTS "Users can view books" ON public.books;
DROP POLICY IF EXISTS "Users can insert books" ON public.books;
DROP POLICY IF EXISTS "Users can update books" ON public.books;
DROP POLICY IF EXISTS "Users can delete books" ON public.books;
DROP POLICY IF EXISTS "authenticated_select_books" ON public.books;
DROP POLICY IF EXISTS "authenticated_insert_books" ON public.books;
DROP POLICY IF EXISTS "authenticated_update_books" ON public.books;
DROP POLICY IF EXISTS "authenticated_delete_books" ON public.books;

-- Garantir que RLS está habilitado
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS otimizadas usando a função de permissão
CREATE POLICY "authenticated_select_books"
  ON public.books FOR SELECT
  TO authenticated
  USING (user_has_books_permission('view'));

CREATE POLICY "authenticated_insert_books"
  ON public.books FOR INSERT
  TO authenticated
  WITH CHECK (user_has_books_permission('edit'));

CREATE POLICY "authenticated_update_books"
  ON public.books FOR UPDATE
  TO authenticated
  USING (user_has_books_permission('edit'))
  WITH CHECK (user_has_books_permission('edit'));

CREATE POLICY "authenticated_delete_books"
  ON public.books FOR DELETE
  TO authenticated
  USING (user_has_books_permission('edit'));

-- ============================================================================
-- PASSO 3: Cadastrar tela no sistema de permissões
-- ============================================================================

INSERT INTO public.screens (key, name, description, category, route)
VALUES (
  'geracao_books',
  'Geração de Books',
  'Gerar e gerenciar relatórios de books para clientes',
  'Books',
  '/admin/geracao-books'
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  route = EXCLUDED.route;

-- ============================================================================
-- PASSO 4: Configurar permissões para grupos
-- ============================================================================

-- Conceder permissão de edição para Administradores
INSERT INTO public.screen_permissions (group_id, screen_key, permission_level)
SELECT 
  ug.id,
  'geracao_books',
  'edit'
FROM public.user_groups ug
WHERE ug.name = 'Administradores'
ON CONFLICT (group_id, screen_key) DO UPDATE SET
  permission_level = EXCLUDED.permission_level;

-- Conceder permissão de visualização para Gestores
INSERT INTO public.screen_permissions (group_id, screen_key, permission_level)
SELECT 
  ug.id,
  'geracao_books',
  'view'
FROM public.user_groups ug
WHERE ug.name = 'Gestores'
ON CONFLICT (group_id, screen_key) DO UPDATE SET
  permission_level = EXCLUDED.permission_level;

-- ============================================================================
-- PASSO 5: Verificar configuração
-- ============================================================================

DO $$
DECLARE
  screen_exists BOOLEAN;
  admin_permission_exists BOOLEAN;
  gestor_permission_exists BOOLEAN;
  function_exists BOOLEAN;
  rls_enabled BOOLEAN;
  policies_count INTEGER;
  admin_count INTEGER;
  gestor_count INTEGER;
BEGIN
  -- Mensagens de progresso
  RAISE NOTICE '========================================';
  RAISE NOTICE 'APLICANDO CORREÇÕES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Função user_has_books_permission corrigida';
  RAISE NOTICE '✅ Políticas RLS da tabela books corrigidas';
  RAISE NOTICE '✅ Tela geracao_books cadastrada';
  RAISE NOTICE '✅ Permissão de edição concedida para Administradores';
  RAISE NOTICE '✅ Permissão de visualização concedida para Gestores';
  RAISE NOTICE '';
  
  -- Verificar se tela existe
  SELECT EXISTS (
    SELECT 1 FROM public.screens WHERE key = 'geracao_books'
  ) INTO screen_exists;
  
  -- Verificar se função existe
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'user_has_books_permission'
  ) INTO function_exists;
  
  -- Verificar se RLS está habilitado
  SELECT rowsecurity
  INTO rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'books';
  
  -- Contar políticas RLS
  SELECT COUNT(*)
  INTO policies_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'books';
  
  -- Verificar se permissão de admin existe
  SELECT EXISTS (
    SELECT 1 
    FROM public.screen_permissions sp
    JOIN public.user_groups ug ON sp.group_id = ug.id
    WHERE sp.screen_key = 'geracao_books'
      AND ug.name = 'Administradores'
      AND sp.permission_level = 'edit'
  ) INTO admin_permission_exists;
  
  -- Verificar se permissão de gestor existe
  SELECT EXISTS (
    SELECT 1 
    FROM public.screen_permissions sp
    JOIN public.user_groups ug ON sp.group_id = ug.id
    WHERE sp.screen_key = 'geracao_books'
      AND ug.name = 'Gestores'
      AND sp.permission_level = 'view'
  ) INTO gestor_permission_exists;
  
  -- Contar usuários em cada grupo
  SELECT COUNT(DISTINCT uga.user_id)
  INTO admin_count
  FROM public.user_group_assignments uga
  JOIN public.user_groups ug ON uga.group_id = ug.id
  WHERE ug.name = 'Administradores';
  
  SELECT COUNT(DISTINCT uga.user_id)
  INTO gestor_count
  FROM public.user_group_assignments uga
  JOIN public.user_groups ug ON uga.group_id = ug.id
  WHERE ug.name = 'Gestores';
  
  -- Exibir resultados
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICAÇÃO DE CONFIGURAÇÃO';
  RAISE NOTICE '========================================';
  
  IF function_exists THEN
    RAISE NOTICE '✅ Função user_has_books_permission: OK';
  ELSE
    RAISE WARNING '❌ Função user_has_books_permission: NÃO ENCONTRADA';
  END IF;
  
  IF rls_enabled THEN
    RAISE NOTICE '✅ RLS habilitado na tabela books: OK';
    RAISE NOTICE '   └─ % políticas RLS configuradas', policies_count;
  ELSE
    RAISE WARNING '❌ RLS NÃO HABILITADO na tabela books';
  END IF;
  
  IF screen_exists THEN
    RAISE NOTICE '✅ Tela geracao_books: CADASTRADA';
  ELSE
    RAISE WARNING '❌ Tela geracao_books: NÃO CADASTRADA';
  END IF;
  
  IF admin_permission_exists THEN
    RAISE NOTICE '✅ Permissão Administradores (edit): CONFIGURADA';
    RAISE NOTICE '   └─ % usuários com acesso', admin_count;
  ELSE
    RAISE WARNING '❌ Permissão Administradores: NÃO CONFIGURADA';
  END IF;
  
  IF gestor_permission_exists THEN
    RAISE NOTICE '✅ Permissão Gestores (view): CONFIGURADA';
    RAISE NOTICE '   └─ % usuários com acesso', gestor_count;
  ELSE
    RAISE WARNING '⚠️ Permissão Gestores: NÃO CONFIGURADA (opcional)';
  END IF;
  
  RAISE NOTICE '========================================';
  
  IF function_exists AND screen_exists AND admin_permission_exists AND rls_enabled AND policies_count >= 4 THEN
    RAISE NOTICE '🎉 CONFIGURAÇÃO COMPLETA E FUNCIONAL!';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Próximos passos:';
    RAISE NOTICE '1. Limpar cache do navegador (Ctrl + Shift + Delete)';
    RAISE NOTICE '2. Fazer hard refresh (Ctrl + F5)';
    RAISE NOTICE '3. Acessar /admin/geracao-books';
    RAISE NOTICE '4. Testar geração de books';
  ELSE
    RAISE WARNING '⚠️ CONFIGURAÇÃO INCOMPLETA - Verifique os erros acima';
  END IF;
END $$;
