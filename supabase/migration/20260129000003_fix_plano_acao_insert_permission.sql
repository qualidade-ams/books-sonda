-- =====================================================
-- Migration: Correção de Permissão INSERT - Planos de Ação
-- Data: 2026-01-29
-- Descrição: Corrige política RLS que impede criação de planos de ação
-- =====================================================

-- =====================================================
-- PROBLEMA IDENTIFICADO
-- =====================================================
-- A política RLS atual exige permissão 'create' que não existe no sistema
-- O sistema usa apenas: 'view', 'edit', 'delete'
-- Usuários com permissão 'edit' devem poder criar planos de ação

-- =====================================================
-- PARTE 1: Remover Política Problemática
-- =====================================================

DROP POLICY IF EXISTS "Usuários podem inserir planos com permissão" ON planos_acao;

-- =====================================================
-- PARTE 2: Criar Política Corrigida
-- =====================================================

-- Permitir INSERT para usuários com permissão 'edit' (que inclui criar)
CREATE POLICY "Usuários podem inserir planos com permissão" ON planos_acao
  AS PERMISSIVE
  FOR INSERT 
  WITH CHECK (
    -- Verificar se usuário tem permissão 'edit' na tela plano_acao
    has_screen_permission('plano_acao', 'edit')
  );

COMMENT ON POLICY "Usuários podem inserir planos com permissão" ON planos_acao IS 
'Política corrigida: usuários com permissão edit podem criar planos de ação';

-- =====================================================
-- PARTE 3: Garantir que Administradores Têm Permissão
-- =====================================================

-- Verificar e conceder permissão 'edit' para administradores se não existir
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
      AND permission_level = 'edit'
    ) INTO v_permission_exists;

    IF NOT v_permission_exists THEN
      -- Conceder permissão de edição
      INSERT INTO screen_permissions (group_id, screen_key, permission_level)
      VALUES (v_admin_group_id, 'plano_acao', 'edit')
      ON CONFLICT (group_id, screen_key) 
      DO UPDATE SET permission_level = 'edit';
      
      RAISE NOTICE '✅ Permissão edit concedida ao grupo administrador';
    ELSE
      RAISE NOTICE '✅ Grupo administrador já tem permissão edit';
    END IF;
  ELSE
    RAISE WARNING '⚠️ Grupo administrador não encontrado!';
  END IF;
END $$;

-- =====================================================
-- PARTE 4: Verificar Outras Políticas RLS
-- =====================================================

-- Garantir que todas as políticas estão otimizadas
DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICAÇÃO: Políticas RLS de planos_acao ===';
  
  -- Contar políticas por ação
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'planos_acao'
  AND cmd = 'SELECT';
  RAISE NOTICE 'Políticas SELECT: % (esperado: 1)', v_policy_count;
  
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'planos_acao'
  AND cmd = 'INSERT';
  RAISE NOTICE 'Políticas INSERT: % (esperado: 1)', v_policy_count;
  
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'planos_acao'
  AND cmd = 'UPDATE';
  RAISE NOTICE 'Políticas UPDATE: % (esperado: 1)', v_policy_count;
  
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'planos_acao'
  AND cmd = 'DELETE';
  RAISE NOTICE 'Políticas DELETE: % (esperado: 1)', v_policy_count;
END $$;

-- =====================================================
-- PARTE 5: Verificar Permissões dos Grupos
-- =====================================================

-- Listar grupos com permissão na tela plano_acao
SELECT 
  ug.name as grupo,
  sp.permission_level as nivel_permissao,
  CASE 
    WHEN sp.permission_level = 'edit' THEN '✅ Pode criar planos'
    WHEN sp.permission_level = 'view' THEN '⚠️ Apenas visualizar'
    WHEN sp.permission_level = 'delete' THEN '✅ Pode criar e deletar'
    ELSE '❌ Sem permissão'
  END as status_criacao
FROM screen_permissions sp
JOIN user_groups ug ON sp.group_id = ug.id
WHERE sp.screen_key = 'plano_acao'
ORDER BY ug.name;

-- =====================================================
-- PARTE 6: Teste de Permissão (Simulação)
-- =====================================================

-- Verificar se a função has_screen_permission está funcionando
DO $$
DECLARE
  v_user_id UUID;
  v_has_permission BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TESTE: Verificação de Permissão ===';
  
  -- Pegar primeiro usuário administrador
  SELECT uga.user_id INTO v_user_id
  FROM user_group_assignments uga
  JOIN user_groups ug ON uga.group_id = ug.id
  WHERE LOWER(ug.name) LIKE '%administrador%' OR LOWER(ug.name) LIKE '%admin%'
  LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    RAISE NOTICE 'Testando permissão para usuário: %', v_user_id;
    
    -- Simular verificação de permissão
    -- (Nota: has_screen_permission usa auth.uid(), então este é apenas informativo)
    SELECT EXISTS (
      SELECT 1
      FROM user_group_assignments uga
      JOIN screen_permissions sp ON uga.group_id = sp.group_id
      WHERE uga.user_id = v_user_id
      AND sp.screen_key = 'plano_acao'
      AND sp.permission_level IN ('edit', 'delete')
    ) INTO v_has_permission;
    
    IF v_has_permission THEN
      RAISE NOTICE '✅ Usuário tem permissão para criar planos de ação';
    ELSE
      RAISE WARNING '⚠️ Usuário NÃO tem permissão para criar planos de ação';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ Nenhum usuário administrador encontrado para teste';
  END IF;
END $$;

-- =====================================================
-- LOG FINAL
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Correção de Permissão INSERT Concluída';
  RAISE NOTICE '📋 Política RLS atualizada';
  RAISE NOTICE '👥 Permissões verificadas';
  RAISE NOTICE '🔧 Sistema pronto para criar planos de ação';
  RAISE NOTICE '========================================';
END $$;
