-- =====================================================
-- Migration: Correção de Permissão SELECT - Planos de Ação
-- Data: 2026-01-29
-- Descrição: Permite visualização de planos para usuários com permissão edit
-- =====================================================

-- =====================================================
-- PROBLEMA IDENTIFICADO
-- =====================================================
-- A política RLS de SELECT exige permissão 'view'
-- Mas usuários com permissão 'edit' também devem poder visualizar
-- Resultado: Tela vazia mesmo após criar planos de ação com sucesso

-- =====================================================
-- PARTE 1: Remover Política Restritiva
-- =====================================================

DROP POLICY IF EXISTS "Usuários podem ver planos com permissão" ON planos_acao;

-- =====================================================
-- PARTE 2: Criar Política Flexível
-- =====================================================

-- Permitir SELECT para usuários com permissão 'view', 'edit' ou 'delete'
CREATE POLICY "Usuários podem ver planos com permissão" ON planos_acao
  AS PERMISSIVE
  FOR SELECT 
  USING (
    -- Usuário tem permissão view, edit ou delete
    has_screen_permission('plano_acao', 'view') OR
    has_screen_permission('plano_acao', 'edit') OR
    has_screen_permission('plano_acao', 'delete')
  );

COMMENT ON POLICY "Usuários podem ver planos com permissão" ON planos_acao IS 
'Política flexível: usuários com permissão view, edit ou delete podem visualizar planos de ação';

-- =====================================================
-- PARTE 3: Verificar Políticas Atuais
-- =====================================================

DO $$
DECLARE
  v_policy_count INTEGER;
  v_policy_name TEXT;
  v_policy_cmd TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICAÇÃO: Políticas RLS de planos_acao ===';
  
  -- Listar todas as políticas
  FOR v_policy_name, v_policy_cmd IN 
    SELECT policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'planos_acao'
    ORDER BY cmd
  LOOP
    RAISE NOTICE '  ✅ % (%)', v_policy_name, v_policy_cmd;
  END LOOP;
  
  -- Contar políticas por ação
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'planos_acao'
  AND cmd = 'SELECT';
  
  IF v_policy_count = 1 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Política SELECT: OK (1 política)';
  ELSE
    RAISE WARNING '⚠️ Política SELECT: % políticas encontradas (esperado: 1)', v_policy_count;
  END IF;
END $$;

-- =====================================================
-- PARTE 4: Verificar Permissões dos Grupos
-- =====================================================

-- Listar grupos e suas permissões
SELECT 
  ug.name as grupo,
  sp.permission_level as nivel_permissao,
  CASE 
    WHEN sp.permission_level IN ('view', 'edit', 'delete') THEN '✅ Pode visualizar planos'
    ELSE '❌ Não pode visualizar'
  END as status_visualizacao
FROM screen_permissions sp
JOIN user_groups ug ON sp.group_id = ug.id
WHERE sp.screen_key = 'plano_acao'
ORDER BY ug.name;

-- =====================================================
-- PARTE 5: Teste de Permissão (Simulação)
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
  v_group_name TEXT;
  v_permission_level TEXT;
  v_can_view BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TESTE: Verificação de Permissão de Visualização ===';
  
  -- Pegar primeiro usuário administrador
  SELECT uga.user_id, ug.name, sp.permission_level
  INTO v_user_id, v_group_name, v_permission_level
  FROM user_group_assignments uga
  JOIN user_groups ug ON uga.group_id = ug.id
  JOIN screen_permissions sp ON ug.id = sp.group_id
  WHERE (LOWER(ug.name) LIKE '%administrador%' OR LOWER(ug.name) LIKE '%admin%')
  AND sp.screen_key = 'plano_acao'
  LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    RAISE NOTICE 'Testando permissão para usuário: %', v_user_id;
    RAISE NOTICE 'Grupo: %', v_group_name;
    RAISE NOTICE 'Nível de permissão: %', v_permission_level;
    
    -- Verificar se pode visualizar
    SELECT (v_permission_level IN ('view', 'edit', 'delete')) INTO v_can_view;
    
    IF v_can_view THEN
      RAISE NOTICE '✅ Usuário PODE visualizar planos de ação';
    ELSE
      RAISE WARNING '⚠️ Usuário NÃO PODE visualizar planos de ação';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ Nenhum usuário administrador encontrado para teste';
  END IF;
END $$;

-- =====================================================
-- PARTE 6: Contar Planos de Ação Existentes
-- =====================================================

DO $$
DECLARE
  v_total_planos INTEGER;
  v_planos_abertos INTEGER;
  v_planos_concluidos INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== ESTATÍSTICAS: Planos de Ação ===';
  
  -- Contar total
  SELECT COUNT(*) INTO v_total_planos FROM planos_acao;
  RAISE NOTICE 'Total de planos: %', v_total_planos;
  
  -- Contar por status
  SELECT COUNT(*) INTO v_planos_abertos 
  FROM planos_acao 
  WHERE status_plano = 'aberto';
  RAISE NOTICE 'Planos abertos: %', v_planos_abertos;
  
  SELECT COUNT(*) INTO v_planos_concluidos 
  FROM planos_acao 
  WHERE status_plano = 'concluido';
  RAISE NOTICE 'Planos concluídos: %', v_planos_concluidos;
  
  IF v_total_planos > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Existem planos de ação no banco de dados';
    RAISE NOTICE '📋 Após aplicar esta migration, eles devem aparecer na tela';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ Nenhum plano de ação encontrado no banco';
    RAISE NOTICE '📝 Crie um novo plano para testar a visualização';
  END IF;
END $$;

-- =====================================================
-- LOG FINAL
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Correção de Permissão SELECT Concluída';
  RAISE NOTICE '📋 Política RLS atualizada';
  RAISE NOTICE '👁️ Usuários com edit podem visualizar';
  RAISE NOTICE '🔧 Sistema pronto para exibir planos';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TESTE MANUAL:';
  RAISE NOTICE '1. Faça login como administrador';
  RAISE NOTICE '2. Acesse /admin/plano-acao';
  RAISE NOTICE '3. Verifique se os planos aparecem';
  RAISE NOTICE '========================================';
END $$;
