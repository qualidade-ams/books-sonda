-- Migration: Corrigir políticas RLS da tabela user_group_assignments
-- Data: 2026-03-03
-- Problema: Erro 406 (Not Acceptable) ao buscar grupos do usuário
-- Solução: Remover políticas duplicadas e criar novas otimizadas

-- ============================================================================
-- PASSO 1: REMOVER TODAS AS POLÍTICAS ANTIGAS (evitar duplicação)
-- ============================================================================

DROP POLICY IF EXISTS "authenticated_select_user_group_assignments" ON public.user_group_assignments;
DROP POLICY IF EXISTS "authenticated_insert_user_group_assignments" ON public.user_group_assignments;
DROP POLICY IF EXISTS "authenticated_update_user_group_assignments" ON public.user_group_assignments;
DROP POLICY IF EXISTS "authenticated_delete_user_group_assignments" ON public.user_group_assignments;
DROP POLICY IF EXISTS "Users can view own assignments" ON public.user_group_assignments;
DROP POLICY IF EXISTS "Users can view assignments" ON public.user_group_assignments;
DROP POLICY IF EXISTS "Admins can manage assignments" ON public.user_group_assignments;

-- ============================================================================
-- PASSO 2: GARANTIR QUE RLS ESTÁ HABILITADO
-- ============================================================================

ALTER TABLE public.user_group_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASSO 3: CRIAR NOVAS POLÍTICAS RLS OTIMIZADAS
-- ============================================================================

-- SELECT: Usuários podem ver seus próprios assignments OU têm permissão de visualizar usuários
CREATE POLICY "authenticated_select_user_group_assignments"
  ON public.user_group_assignments FOR SELECT
  TO authenticated
  USING (
    -- Pode ver seus próprios assignments
    user_id = (SELECT auth.uid())
    OR
    -- Ou tem permissão de visualizar usuários
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_groups ug ON p.group_id = ug.id
      JOIN screen_permissions sp ON sp.group_id = ug.id
      WHERE p.id = (SELECT auth.uid())
        AND sp.screen_key = 'USUARIOS'
        AND sp.permission_level IN ('view', 'edit')
    )
  );

-- INSERT: Apenas usuários com permissão de edição em usuários podem criar assignments
CREATE POLICY "authenticated_insert_user_group_assignments"
  ON public.user_group_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_groups ug ON p.group_id = ug.id
      JOIN screen_permissions sp ON sp.group_id = ug.id
      WHERE p.id = (SELECT auth.uid())
        AND sp.screen_key = 'USUARIOS'
        AND sp.permission_level = 'edit'
    )
  );

-- UPDATE: Apenas usuários com permissão de edição em usuários podem atualizar assignments
CREATE POLICY "authenticated_update_user_group_assignments"
  ON public.user_group_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_groups ug ON p.group_id = ug.id
      JOIN screen_permissions sp ON sp.group_id = ug.id
      WHERE p.id = (SELECT auth.uid())
        AND sp.screen_key = 'USUARIOS'
        AND sp.permission_level = 'edit'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_groups ug ON p.group_id = ug.id
      JOIN screen_permissions sp ON sp.group_id = ug.id
      WHERE p.id = (SELECT auth.uid())
        AND sp.screen_key = 'USUARIOS'
        AND sp.permission_level = 'edit'
    )
  );

-- DELETE: Apenas usuários com permissão de edição em usuários podem deletar assignments
CREATE POLICY "authenticated_delete_user_group_assignments"
  ON public.user_group_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_groups ug ON p.group_id = ug.id
      JOIN screen_permissions sp ON sp.group_id = ug.id
      WHERE p.id = (SELECT auth.uid())
        AND sp.screen_key = 'USUARIOS'
        AND sp.permission_level = 'edit'
    )
  );

-- ============================================================================
-- PASSO 4: VERIFICAR SE NÃO HÁ DUPLICATAS
-- ============================================================================

DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT tablename, cmd, COUNT(*) as total
    FROM pg_policies 
    WHERE tablename = 'user_group_assignments'
    GROUP BY tablename, cmd
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION '❌ ERRO: Políticas duplicadas encontradas na tabela user_group_assignments!';
  END IF;
  
  RAISE NOTICE '✅ Sem duplicatas - Políticas RLS da tabela user_group_assignments configuradas corretamente';
END $$;

-- ============================================================================
-- PASSO 5: LOGS DE VERIFICAÇÃO
-- ============================================================================

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE '📋 Políticas RLS da tabela user_group_assignments:';
  FOR policy_record IN 
    SELECT policyname, cmd 
    FROM pg_policies 
    WHERE tablename = 'user_group_assignments'
    ORDER BY cmd, policyname
  LOOP
    RAISE NOTICE '  ✅ % - %', policy_record.cmd, policy_record.policyname;
  END LOOP;
END $$;
