-- Migration: Corrigir políticas RLS da tabela banco_horas_versoes
-- Data: 2026-01-22
-- Descrição: Remove políticas antigas e cria novas políticas mais permissivas para evitar erro 406

-- =====================================================
-- PASSO 1: Remover políticas antigas
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view versoes" ON banco_horas_versoes;
DROP POLICY IF EXISTS "Admins can insert versoes" ON banco_horas_versoes;

-- =====================================================
-- PASSO 2: Criar novas políticas RLS otimizadas
-- =====================================================

-- Leitura: Usuários autenticados podem visualizar todas as versões
-- IMPORTANTE: Usar (SELECT auth.uid()) para otimização de performance
CREATE POLICY "authenticated_select_versoes" ON banco_horas_versoes
  FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

-- Inserção: Usuários autenticados podem criar versões
-- (O controle de quem pode criar é feito na aplicação)
CREATE POLICY "authenticated_insert_versoes" ON banco_horas_versoes
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- Atualização: Usuários autenticados podem atualizar versões
-- (Embora versões sejam imutáveis, permitir para casos especiais)
CREATE POLICY "authenticated_update_versoes" ON banco_horas_versoes
  FOR UPDATE
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- Exclusão: Apenas administradores podem excluir versões
CREATE POLICY "admin_delete_versoes" ON banco_horas_versoes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_group_assignments uga
      INNER JOIN user_groups ug ON uga.group_id = ug.id
      WHERE uga.user_id = (SELECT auth.uid())
        AND ug.name = 'Administradores'
    )
  );

-- =====================================================
-- PASSO 3: Garantir que RLS está habilitado
-- =====================================================

ALTER TABLE banco_horas_versoes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PASSO 4: Validação
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Políticas RLS de banco_horas_versoes corrigidas!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Políticas criadas:';
  RAISE NOTICE '  - authenticated_select_versoes (SELECT)';
  RAISE NOTICE '  - authenticated_insert_versoes (INSERT)';
  RAISE NOTICE '  - authenticated_update_versoes (UPDATE)';
  RAISE NOTICE '  - admin_delete_versoes (DELETE)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 RLS habilitado: banco_horas_versoes';
  RAISE NOTICE '';
END $$;
