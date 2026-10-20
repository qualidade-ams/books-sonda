-- =====================================================================
-- Tela própria para a troca de código de resolução (Auditoria).
-- A tela "Inconsistência de Chamados" deixa de exibir esse tipo.
--
-- Permissões: cada grupo recebe na tela nova o mesmo nível que já tem em
-- inconsistencia_chamados, para quem via as trocas lá continuar vendo.
-- =====================================================================

INSERT INTO screens (key, name, description, category, route)
VALUES (
  'troca_codigo_resolucao',
  'Troca de Código de Resolução',
  'Trocas de código de resolução que mudaram a cobrança do banco de horas',
  'Auditoria',
  '/admin/auditoria/troca-codigo-resolucao'
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  route = EXCLUDED.route;

INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT sp.group_id, 'troca_codigo_resolucao', sp.permission_level
FROM screen_permissions sp
WHERE sp.screen_key = 'inconsistencia_chamados'
ON CONFLICT (group_id, screen_key)
DO UPDATE SET permission_level = EXCLUDED.permission_level;

-- Administradores sempre com edição
INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, 'troca_codigo_resolucao', 'edit'
FROM user_groups ug
WHERE ug.name = 'Administradores'
ON CONFLICT (group_id, screen_key)
DO UPDATE SET permission_level = EXCLUDED.permission_level;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM screens WHERE key = 'troca_codigo_resolucao') THEN
    RAISE EXCEPTION 'Falha ao criar screen "troca_codigo_resolucao"';
  END IF;
END $$;
