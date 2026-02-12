-- Migration: Adicionar tela de Geração de Books ao sistema de permissões
-- Descrição: Garante que a tela geracao_books está cadastrada e com permissões corretas

-- Inserir tela se não existir
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

-- Verificar se foi criado corretamente
DO $$
DECLARE
  screen_exists BOOLEAN;
  admin_permission_exists BOOLEAN;
BEGIN
  -- Verificar se tela existe
  SELECT EXISTS (
    SELECT 1 FROM public.screens WHERE key = 'geracao_books'
  ) INTO screen_exists;
  
  -- Verificar se permissão de admin existe
  SELECT EXISTS (
    SELECT 1 
    FROM public.screen_permissions sp
    JOIN public.user_groups ug ON sp.group_id = ug.id
    WHERE sp.screen_key = 'geracao_books'
      AND ug.name = 'Administradores'
      AND sp.permission_level = 'edit'
  ) INTO admin_permission_exists;
  
  IF screen_exists AND admin_permission_exists THEN
    RAISE NOTICE '✅ Tela geracao_books cadastrada com sucesso';
    RAISE NOTICE '✅ Permissões configuradas para Administradores e Gestores';
  ELSE
    RAISE WARNING '⚠️ Problema ao cadastrar tela ou permissões';
  END IF;
END $$;
