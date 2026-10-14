-- Adicionar tela de Monitoramento de Vigências ao sistema de permissões
-- Data: 19/09/2025

-- Inserir a nova tela no sistema de permissões
INSERT INTO screens (key, name, description, category, route)
VALUES (
  'monitoramento_vigencias',
  'Monitoramento de Vigências',
  'Monitoramento e controle de vigências de contratos',
  'admin',
  '/admin/monitoramento-vigencias'
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  route = EXCLUDED.route;

-- Configurar permissão de edição para o grupo de administradores padrão
INSERT INTO screen_permissions (group_id, screen_key, permission_level, created_at)
SELECT 
  ug.id,
  'monitoramento_vigencias',
  'edit',
  NOW()
FROM user_groups ug
WHERE ug.is_default_admin = true
ON CONFLICT (group_id, screen_key) DO UPDATE SET
  permission_level = EXCLUDED.permission_level;

-- Comentário explicativo
COMMENT ON TABLE screens IS 'Telas do sistema para controle de permissões. Inclui tela de Monitoramento de Vigências para controle de contratos vencidos.';

-- Log da operação
INSERT INTO logs_sistema (
  operacao, 
  detalhes, 
  data_operacao
) VALUES (
  'adicionar_tela_monitoramento_vigencias',
  'Adicionada tela de Monitoramento de Vigências ao sistema de permissões com permissão de edição para administradores',
  NOW()
);