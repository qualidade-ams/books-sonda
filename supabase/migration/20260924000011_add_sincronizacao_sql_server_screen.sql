-- =====================================================================
-- Tela "Sincronização SQL Server" (Administração): agendamentos,
-- execução manual e histórico. Substitui o botão "Sincronizar SQL Server"
-- da tela Lançar Pesquisas.
--
-- Permissões: cada grupo recebe o mesmo nível que já tem em
-- lancar_pesquisas, para quem sincronizava lá continuar podendo.
-- =====================================================================

INSERT INTO screens (key, name, description, category, route)
VALUES (
  'sincronizacao_sql_server',
  'Sincronização SQL Server',
  'Agendamento, execução manual e histórico da sincronização com o SQL Server Aranda',
  'Administração',
  '/admin/sincronizacao-sql-server'
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  route = EXCLUDED.route;

INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT sp.group_id, 'sincronizacao_sql_server', sp.permission_level
FROM screen_permissions sp
WHERE sp.screen_key = 'lancar_pesquisas'
ON CONFLICT (group_id, screen_key)
DO UPDATE SET permission_level = EXCLUDED.permission_level;

-- Administradores sempre com edição
INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, 'sincronizacao_sql_server', 'edit'
FROM user_groups ug
WHERE ug.name = 'Administradores'
ON CONFLICT (group_id, screen_key)
DO UPDATE SET permission_level = EXCLUDED.permission_level;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM screens WHERE key = 'sincronizacao_sql_server') THEN
    RAISE EXCEPTION 'Falha ao criar screen "sincronizacao_sql_server"';
  END IF;
END $$;
