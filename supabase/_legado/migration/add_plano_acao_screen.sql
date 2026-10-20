-- =====================================================
-- MIGRAÇÃO: REGISTRAR TELA PLANO DE AÇÃO
-- =====================================================
-- Registra a tela de Plano de Ação no sistema de permissões
-- =====================================================

-- =====================================================
-- 1. REGISTRAR TELA NO SISTEMA
-- =====================================================

-- Verificar se a tela já existe
DO $$
DECLARE
  v_screen_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM screens WHERE key = 'plano_acao'
  ) INTO v_screen_exists;

  IF NOT v_screen_exists THEN
    -- Inserir tela de Plano de Ação
    INSERT INTO screens (key, name, description, category, route)
    VALUES (
      'plano_acao',
      'Plano de Ação',
      'Gerenciamento de planos de ação para pesquisas de satisfação',
      'pesquisas',
      '/admin/plano-acao'
    );
    
    RAISE NOTICE '✅ Tela "Plano de Ação" registrada com sucesso';
  ELSE
    RAISE NOTICE '⚠️  Tela "Plano de Ação" já existe no sistema';
  END IF;
END $$;

-- =====================================================
-- 2. CONFIGURAR PERMISSÕES PARA ADMINISTRADORES
-- =====================================================

DO $$
DECLARE
  v_admin_group_id UUID;
  v_permission_exists BOOLEAN;
BEGIN
  -- Buscar grupo de administradores
  SELECT id INTO v_admin_group_id
  FROM user_groups
  WHERE LOWER(name) LIKE '%administrador%' OR LOWER(name) LIKE '%admin%'
  LIMIT 1;

  IF v_admin_group_id IS NOT NULL THEN
    -- Verificar se permissão já existe
    SELECT EXISTS (
      SELECT 1 
      FROM screen_permissions 
      WHERE group_id = v_admin_group_id 
      AND screen_key = 'plano_acao'
    ) INTO v_permission_exists;

    IF NOT v_permission_exists THEN
      -- Conceder permissão de edição para administradores
      INSERT INTO screen_permissions (group_id, screen_key, permission_level)
      VALUES (v_admin_group_id, 'plano_acao', 'edit');
      
      RAISE NOTICE '✅ Permissão de edição concedida ao grupo administrador';
    ELSE
      RAISE NOTICE '⚠️  Permissão já existe para o grupo administrador';
    END IF;
  ELSE
    RAISE NOTICE '⚠️  Grupo administrador não encontrado';
  END IF;
END $$;

-- =====================================================
-- 3. VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se a tela foi registrada
SELECT 
  s.key,
  s.name,
  s.description,
  s.category,
  s.route,
  COUNT(sp.id) as total_permissoes
FROM screens s
LEFT JOIN screen_permissions sp ON s.key = sp.screen_key
WHERE s.key = 'plano_acao'
GROUP BY s.key, s.name, s.description, s.category, s.route;

-- Listar grupos com permissão
SELECT 
  ug.name as grupo,
  sp.permission_level as nivel_permissao
FROM screen_permissions sp
JOIN user_groups ug ON sp.group_id = ug.id
WHERE sp.screen_key = 'plano_acao'
ORDER BY ug.name;

-- =====================================================
-- LOG DE EXECUÇÃO
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Tela Plano de Ação configurada';
  RAISE NOTICE '📋 Screen Key: plano_acao';
  RAISE NOTICE '🔗 Rota: /admin/plano-acao';
  RAISE NOTICE '👥 Permissões configuradas para administradores';
  RAISE NOTICE '========================================';
END $$;
