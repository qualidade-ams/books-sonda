-- Migration: Corrigir política de DELETE em elogios
-- Data: 2026-01-23
-- Descrição: Permitir DELETE para usuários com permissão edit ou admin (não apenas admin)

-- =====================================================
-- PROBLEMA IDENTIFICADO:
-- =====================================================
-- A política atual exige permissão 'admin' para DELETE
-- Isso impede usuários com permissão 'edit' de excluir elogios
-- Resultado: DELETE falha silenciosamente no banco, mas frontend não detecta

-- =====================================================
-- SOLUÇÃO:
-- =====================================================
-- Permitir DELETE para usuários com permissão 'edit' OU 'admin'

-- Remover política antiga que exige apenas admin
DROP POLICY IF EXISTS "elogios_delete_with_permission" ON elogios;

-- Criar nova política que permite edit OU admin
CREATE POLICY "elogios_delete_with_permission" ON elogios
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM screen_permissions sp
      JOIN user_groups ug ON sp.group_id = ug.id
      JOIN user_group_assignments uga ON ug.id = uga.group_id
      WHERE uga.user_id = (SELECT auth.uid())
      AND sp.screen_key = 'lancar_elogios'
      AND sp.permission_level IN ('edit', 'admin')  -- ✅ PERMITE EDIT E ADMIN
    )
  );

-- Log de confirmação
DO $
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ CORREÇÃO APLICADA: Política de DELETE em elogios';
  RAISE NOTICE '================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Mudança:';
  RAISE NOTICE '  ANTES: Apenas usuários com permissão admin podiam excluir';
  RAISE NOTICE '  DEPOIS: Usuários com permissão edit OU admin podem excluir';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Segurança mantida:';
  RAISE NOTICE '  - Usuários ainda precisam ter permissão na tela lancar_elogios';
  RAISE NOTICE '  - Apenas usuários autenticados podem excluir';
  RAISE NOTICE '  - Permissão view não permite exclusão';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Correção aplicada com sucesso!';
  RAISE NOTICE '';
END $;
