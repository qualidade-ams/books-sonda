-- =====================================================
-- Migration: Corrigir RLS da Tabela screen_permissions
-- Data: 2026-02-10
-- Descrição: Corrige políticas RLS que estão bloqueando
--            acesso à tabela screen_permissions
-- =====================================================

-- ⚠️ PROBLEMA: Políticas RLS muito restritivas estão bloqueando
-- acesso legítimo à tabela screen_permissions, causando erro CORS

-- 1. Remover TODAS as políticas antigas (evitar duplicação)
-- Lista completa de políticas conhecidas que podem existir
DROP POLICY IF EXISTS "Usuários autenticados podem ver permissões" ON screen_permissions;
DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar permissões" ON screen_permissions;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar screen_permissions" ON screen_permissions;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir screen_permissions" ON screen_permissions;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar screen_permissions" ON screen_permissions;
DROP POLICY IF EXISTS "Service role full access screen_permissions" ON screen_permissions;
DROP POLICY IF EXISTS "Users can read relevant permissions" ON screen_permissions;
DROP POLICY IF EXISTS "authenticated_select_screen_permissions" ON screen_permissions;
DROP POLICY IF EXISTS "authenticated_insert_screen_permissions" ON screen_permissions;
DROP POLICY IF EXISTS "authenticated_update_screen_permissions" ON screen_permissions;
DROP POLICY IF EXISTS "authenticated_delete_screen_permissions" ON screen_permissions;
DROP POLICY IF EXISTS "screen_permissions_select" ON screen_permissions;
DROP POLICY IF EXISTS "screen_permissions_insert" ON screen_permissions;
DROP POLICY IF EXISTS "screen_permissions_update" ON screen_permissions;
DROP POLICY IF EXISTS "screen_permissions_delete" ON screen_permissions;

-- 2. Garantir que RLS está habilitado
ALTER TABLE screen_permissions ENABLE ROW LEVEL SECURITY;

-- 3. Criar função de verificação de permissão otimizada
CREATE OR REPLACE FUNCTION public.user_can_manage_permissions()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Usuários autenticados podem ler suas próprias permissões
  -- Apenas administradores podem modificar
  RETURN EXISTS (
    SELECT 1
    FROM profiles p
    JOIN user_group_assignments uga ON p.id = uga.user_id
    JOIN user_groups ug ON uga.group_id = ug.id
    WHERE p.id = (SELECT auth.uid())
      AND ug.name = 'Administradores'
  );
END;
$$;

-- 4. Criar políticas RLS otimizadas

-- SELECT: Todos os usuários autenticados podem ler permissões
-- (necessário para o sistema de permissões funcionar)
CREATE POLICY "authenticated_select_screen_permissions"
  ON screen_permissions FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Apenas administradores
CREATE POLICY "authenticated_insert_screen_permissions"
  ON screen_permissions FOR INSERT
  TO authenticated
  WITH CHECK (user_can_manage_permissions());

-- UPDATE: Apenas administradores
CREATE POLICY "authenticated_update_screen_permissions"
  ON screen_permissions FOR UPDATE
  TO authenticated
  USING (user_can_manage_permissions());

-- DELETE: Apenas administradores
CREATE POLICY "authenticated_delete_screen_permissions"
  ON screen_permissions FOR DELETE
  TO authenticated
  USING (user_can_manage_permissions());

-- 5. Mensagem de sucesso
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Contar políticas criadas
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'screen_permissions';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration concluída com sucesso!';
  RAISE NOTICE '🔒 Políticas RLS de screen_permissions corrigidas:';
  RAISE NOTICE '   - Total de políticas: %', policy_count;
  RAISE NOTICE '   - SELECT: Todos os usuários autenticados (necessário)';
  RAISE NOTICE '   - INSERT/UPDATE/DELETE: Apenas administradores';
  RAISE NOTICE '   - Função otimizada com SECURITY DEFINER';
  RAISE NOTICE '⚠️  Erro CORS deve ser resolvido';
  RAISE NOTICE '🔄 Recarregue a aplicação (Ctrl+Shift+R)';
END $$;
