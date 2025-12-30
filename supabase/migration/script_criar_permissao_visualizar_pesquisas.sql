-- =====================================================
-- Script para criar permissão "Visualizar Pesquisas"
-- Execute este script diretamente no Supabase Dashboard
-- =====================================================

-- 1. Inserir a nova tela no sistema de permissões
INSERT INTO screens (key, name, description, category, route)
VALUES (
  'visualizar_pesquisas',
  'Visualizar Pesquisas',
  'Visualização de todas as pesquisas de satisfação registradas no sistema',
  'Pesquisas de Satisfação',
  '/admin/visualizar-pesquisas'
)
ON CONFLICT (key) DO NOTHING;

-- 2. Dar permissão de visualização para o grupo Admin (se existir)
INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT 
  ug.id,
  'visualizar_pesquisas',
  'view'
FROM user_groups ug
WHERE ug.name = 'Admin'
ON CONFLICT (group_id, screen_key) DO NOTHING;

-- 3. Dar permissão de visualização para grupos que já têm acesso a "lancar_pesquisas"
INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT DISTINCT
  sp.group_id,
  'visualizar_pesquisas',
  'view'
FROM screen_permissions sp
WHERE sp.screen_key = 'lancar_pesquisas'
  AND sp.permission_level IN ('view', 'edit')
ON CONFLICT (group_id, screen_key) DO NOTHING;

-- 4. Verificar se as permissões foram criadas
SELECT 
  'RESULTADO' as status,
  ug.name as grupo,
  s.name as tela,
  sp.permission_level as nivel
FROM screen_permissions sp
JOIN user_groups ug ON sp.group_id = ug.id
JOIN screens s ON sp.screen_key = s.key
WHERE s.key = 'visualizar_pesquisas'
ORDER BY ug.name;

-- 5. Mostrar informações da nova tela
SELECT 
  'NOVA TELA CRIADA' as status,
  key,
  name,
  description,
  category,
  route
FROM screens 
WHERE key = 'visualizar_pesquisas';