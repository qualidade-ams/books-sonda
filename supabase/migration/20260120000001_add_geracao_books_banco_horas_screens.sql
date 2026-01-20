-- Migration: Adicionar telas Geração de Books e Controle de Banco de Horas
-- Data: 2026-01-20
-- Descrição: Adiciona as novas telas do menu Comunicação ao sistema de permissões

-- Adicionar tela Geração de Books
INSERT INTO screens (key, name, description, category, route)
VALUES (
  'geracao_books',
  'Geração de Books',
  'Gere e envie relatórios de books para os clientes',
  'Comunicação',
  '/admin/geracao-books'
)
ON CONFLICT (key) DO NOTHING;

-- Adicionar tela Controle de Banco de Horas
INSERT INTO screens (key, name, description, category, route)
VALUES (
  'controle_banco_horas',
  'Controle de Banco de Horas',
  'Gerencie o banco de horas dos colaboradores',
  'Comunicação',
  '/admin/controle-banco-horas'
)
ON CONFLICT (key) DO NOTHING;

-- Conceder permissões para o grupo Administradores
-- Permissão para Geração de Books
INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, 'geracao_books', 'edit'
FROM user_groups ug 
WHERE ug.name = 'Administradores'
ON CONFLICT (group_id, screen_key) 
DO UPDATE SET permission_level = EXCLUDED.permission_level;

-- Permissão para Controle de Banco de Horas
INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, 'controle_banco_horas', 'edit'
FROM user_groups ug 
WHERE ug.name = 'Administradores'
ON CONFLICT (group_id, screen_key) 
DO UPDATE SET permission_level = EXCLUDED.permission_level;

-- Verificar se as telas foram criadas corretamente
SELECT 
  s.key,
  s.name,
  s.category,
  s.route,
  COUNT(sp.id) as permissions_count
FROM screens s
LEFT JOIN screen_permissions sp ON s.key = sp.screen_key
WHERE s.key IN ('geracao_books', 'controle_banco_horas')
GROUP BY s.key, s.name, s.category, s.route
ORDER BY s.key;
