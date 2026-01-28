-- ============================================
-- Migration: Adicionar tela Inconsistência de Chamados
-- Data: 27/01/2026
-- Descrição: Criar screen para auditoria de inconsistências em chamados
-- ============================================

-- Criar screen para Inconsistência de Chamados
INSERT INTO screens (key, name, description, category, route)
VALUES (
  'inconsistencia_chamados',
  'Inconsistência de Chamados',
  'Auditoria de chamados com inconsistências detectadas (datas, tempo excessivo)',
  'Auditoria',
  '/admin/auditoria/inconsistencia-chamados'
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  route = EXCLUDED.route;

-- Conceder permissão de edição para Administradores
INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, 'inconsistencia_chamados', 'edit'
FROM user_groups ug 
WHERE ug.name = 'Administradores'
ON CONFLICT (group_id, screen_key) 
DO UPDATE SET permission_level = EXCLUDED.permission_level;

-- Comentários
COMMENT ON TABLE screens IS 'Tabela de telas do sistema com controle de permissões';

-- Verificar se a screen foi criada
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM screens WHERE key = 'inconsistencia_chamados') THEN
    RAISE NOTICE '✅ Screen "inconsistencia_chamados" criada com sucesso';
  ELSE
    RAISE EXCEPTION '❌ Falha ao criar screen "inconsistencia_chamados"';
  END IF;
END $$;
