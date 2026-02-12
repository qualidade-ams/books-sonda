-- ============================================================================
-- CORREÇÃO SIMPLES - SISTEMA DE BOOKS
-- ============================================================================
-- Versão simplificada sem mensagens de verificação
-- Execute este script se o script completo der erro
-- ============================================================================

-- Remover função antiga
DROP FUNCTION IF EXISTS public.user_has_books_permission(TEXT) CASCADE;

-- Criar função corrigida
CREATE OR REPLACE FUNCTION public.user_has_books_permission(required_level TEXT DEFAULT 'view')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN true;
  END IF;

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

-- Cadastrar tela
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

-- Permissão para Administradores
INSERT INTO public.screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, 'geracao_books', 'edit'
FROM public.user_groups ug
WHERE ug.name = 'Administradores'
ON CONFLICT (group_id, screen_key) DO UPDATE SET permission_level = EXCLUDED.permission_level;

-- Permissão para Gestores
INSERT INTO public.screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, 'geracao_books', 'view'
FROM public.user_groups ug
WHERE ug.name = 'Gestores'
ON CONFLICT (group_id, screen_key) DO UPDATE SET permission_level = EXCLUDED.permission_level;

-- Pronto! Agora:
-- 1. Limpe o cache do navegador (Ctrl + Shift + Delete)
-- 2. Faça hard refresh (Ctrl + F5)
-- 3. Acesse /admin/geracao-books
