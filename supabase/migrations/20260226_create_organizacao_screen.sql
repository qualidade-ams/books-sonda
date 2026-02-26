-- Migration: Criar tela de Organograma no sistema de permissões
-- Data: 2026-02-26
-- Descrição: Adiciona a tela de organograma ao sistema de permissões

-- Inserir tela no sistema
INSERT INTO public.screens (key, name, description, category, route)
VALUES (
  'organograma',
  'Organograma',
  'Visualização e gerenciamento da estrutura organizacional hierárquica da empresa',
  'Administração',
  '/admin/organograma'
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  route = EXCLUDED.route;

-- Conceder permissão de edição para Administradores
INSERT INTO public.screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, 'organograma', 'edit'
FROM public.user_groups ug 
WHERE ug.name = 'Administradores'
ON CONFLICT (group_id, screen_key) 
DO UPDATE SET permission_level = EXCLUDED.permission_level;

-- Conceder permissão de visualização para Gerentes (opcional)
INSERT INTO public.screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, 'organograma', 'view'
FROM public.user_groups ug 
WHERE ug.name = 'Gerentes'
ON CONFLICT (group_id, screen_key) 
DO UPDATE SET permission_level = EXCLUDED.permission_level;

-- Comentários
COMMENT ON COLUMN public.screens.key IS 'Chave única da tela (organograma)';
