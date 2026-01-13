-- Migration: Adicionar tela de Design System ao sistema de permissões
-- Data: 2025-01-13
-- Descrição: Registra a tela de Design System para configuração de permissões

-- Inserir a nova tela no sistema de permissões
INSERT INTO screens (key, name, description, category, route)
VALUES (
  'design_system',
  'Design System',
  'Biblioteca de componentes padronizados do Books SND',
  'Administração',
  '/admin/design-system'
)
ON CONFLICT (key) DO NOTHING;

-- Conceder permissão de edição para o grupo Administradores
INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT 
  ug.id,
  'design_system',
  'edit'
FROM user_groups ug
WHERE ug.name = 'Administradores'
ON CONFLICT (group_id, screen_key) DO UPDATE SET
  permission_level = EXCLUDED.permission_level;

-- Verificar se a inserção foi bem-sucedida
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM screens WHERE key = 'design_system') THEN
    RAISE NOTICE 'Tela Design System registrada com sucesso';
  ELSE
    RAISE EXCEPTION 'Falha ao registrar tela Design System';
  END IF;
END $$;