-- =====================================================
-- Migration: Adicionar tela de Auditoria de Banco de Horas
-- Data: 2026-01-21
-- Descrição: Adiciona a tela de auditoria no sistema de permissões
-- =====================================================

-- Inserir a tela no sistema de permissões
INSERT INTO screens (key, name, description, category, route)
VALUES (
  'auditoria_banco_horas',
  'Auditoria de Banco de Horas',
  'Visualização completa do log de auditoria do sistema de banco de horas com filtros e exportação',
  'Banco de Horas',
  '/admin/auditoria-banco-horas'
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  route = EXCLUDED.route;

-- Conceder permissão de visualização para Administradores
INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, 'auditoria_banco_horas', 'view'
FROM user_groups ug 
WHERE ug.name = 'Administradores'
ON CONFLICT (group_id, screen_key) DO UPDATE 
SET permission_level = EXCLUDED.permission_level;

-- Comentário explicativo
COMMENT ON TABLE banco_horas_audit_log IS 'Log completo de auditoria de todas as ações no sistema de banco de horas. Registra quem fez o quê, quando e de onde, com dados detalhados da ação.';

-- Verificação
DO $$
BEGIN
  RAISE NOTICE '✅ Tela "Auditoria de Banco de Horas" adicionada com sucesso';
  RAISE NOTICE '📍 Rota: /admin/auditoria-banco-horas';
  RAISE NOTICE '🔑 Screen Key: auditoria_banco_horas';
  RAISE NOTICE '👥 Permissão concedida para: Administradores (view)';
END $$;
