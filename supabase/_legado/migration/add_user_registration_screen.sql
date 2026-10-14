------------------------------------------------------
-- Adicionar tela "Cadastro de Usuários" ao sistema de permissões
------------------------------------------------------

-- Inserir nova tela no sistema
INSERT INTO screens (key, name, description, category, route) VALUES
('cadastro-usuarios','Cadastro de Usuários','Criação de novos usuários no sistema','admin','/admin/cadastro-usuarios')
ON CONFLICT (key) DO NOTHING;

-- Dar permissão de edição para o grupo de administradores
INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, 'cadastro-usuarios', 'edit'
FROM user_groups ug
WHERE ug.is_default_admin = true
ON CONFLICT (group_id, screen_key) DO UPDATE SET permission_level = 'edit';

-- Verificar se a tela foi adicionada corretamente
SELECT 'NOVA TELA ADICIONADA' as status, s.key, s.name, s.description, s.route
FROM screens s
WHERE s.key = 'cadastro-usuarios';

-- Verificar permissões do grupo admin
SELECT 'PERMISSÕES ADMIN' as status, ug.name as grupo, s.name as tela, sp.permission_level as nivel
FROM user_groups ug
JOIN screen_permissions sp ON ug.id = sp.group_id
JOIN screens s ON sp.screen_key = s.key
WHERE ug.is_default_admin = true AND s.key = 'cadastro-usuarios';
