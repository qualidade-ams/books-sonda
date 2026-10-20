-- =====================================================
-- MIGRATION: ADICIONAR TELA DE CADASTRO DE TAXAS
-- =====================================================
-- Adiciona a tela de Cadastro de Taxas de Clientes ao sistema de permissões

-- Inserir a nova tela no sistema de permissões
INSERT INTO screens (key, name, description, category, route)
VALUES (
  'cadastro_taxas_clientes',
  'Cadastro de Taxas de Clientes',
  'Gerenciamento de taxas de clientes por vigência e tipo de produto',
  'client_books',
  '/admin/cadastro-taxas-clientes'
)
ON CONFLICT (key) DO NOTHING;

-- Conceder permissões de edição para o grupo Administradores
INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, 'cadastro_taxas_clientes', 'edit'
FROM user_groups ug 
WHERE ug.is_default_admin = true
ON CONFLICT (group_id, screen_key) DO NOTHING;
