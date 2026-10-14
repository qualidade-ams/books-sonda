------------------------------------------------------
-- Migração de Permissões - Sistema de Gerenciamento de Clientes e Books
-- Registra as novas telas no sistema de permissões
------------------------------------------------------

------------------------------------------------------
-- 1. Inserir novas telas no sistema de permissões
------------------------------------------------------
INSERT INTO screens (key, name, description, category, route) VALUES
('empresas_clientes', 'Cadastro de Empresas', 'Gerenciamento de empresas clientes', 'client_books', '/admin/empresas-clientes'),
('clientes', 'Cadastro de Clientes', 'Gerenciamento de clientes', 'client_books', '/admin/clientes'),
('grupos_responsaveis', 'Grupos de Responsáveis', 'Gerenciamento de grupos de e-mail', 'client_books', '/admin/grupos-responsaveis'),
('controle_disparos', 'Controle de Disparos', 'Controle mensal de envio de books', 'client_books', '/admin/controle-disparos'),
('historico_books', 'Histórico de Books', 'Relatórios e histórico de envios', 'client_books', '/admin/historico-books')
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    route = EXCLUDED.route;

------------------------------------------------------
-- 2. Configurar permissões padrão para grupo admin
------------------------------------------------------
-- Atribuir permissões de edição para administradores em todas as novas telas
INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, s.key, 'edit'
FROM user_groups ug 
CROSS JOIN screens s
WHERE ug.is_default_admin = true 
AND s.key IN ('empresas_clientes', 'clientes', 'grupos_responsaveis', 'controle_disparos', 'historico_books')
ON CONFLICT (group_id, screen_key) DO UPDATE SET 
    permission_level = 'edit';

------------------------------------------------------
-- 3. Verificação das novas telas registradas
------------------------------------------------------
SELECT 'NOVAS TELAS REGISTRADAS' as status, key, name, description, category, route
FROM screens 
WHERE key IN ('empresas_clientes', 'clientes', 'grupos_responsaveis', 'controle_disparos', 'historico_books')
ORDER BY key;

------------------------------------------------------
-- 4. Verificação das permissões atribuídas
------------------------------------------------------
SELECT 'PERMISSÕES CONFIGURADAS' as status, ug.name as grupo, s.key as tela, sp.permission_level as nivel
FROM screen_permissions sp
JOIN user_groups ug ON sp.group_id = ug.id
JOIN screens s ON sp.screen_key = s.key
WHERE s.key IN ('empresas_clientes', 'clientes', 'grupos_responsaveis', 'controle_disparos', 'historico_books')
ORDER BY ug.name, s.key;