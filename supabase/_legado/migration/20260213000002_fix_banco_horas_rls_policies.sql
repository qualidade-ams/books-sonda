-- ============================================================================
-- Migration: Fix RLS policies for banco_horas_calculos
-- Created: 2026-02-13
-- Purpose: Fix 406 (Not Acceptable) errors by correcting RLS policies
-- ============================================================================

-- STEP 1: Fix user_has_banco_horas_permission function
-- This function was using incorrect table structure (profiles.group_id doesn't exist)
-- ============================================================================

DROP FUNCTION IF EXISTS public.user_has_banco_horas_permission() CASCADE;

CREATE OR REPLACE FUNCTION public.user_has_banco_horas_permission()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has permission to access banco de horas screens
  -- Uses correct path: profiles → user_group_assignments → screen_permissions
  RETURN EXISTS (
    SELECT 1
    FROM profiles p
    JOIN user_group_assignments uga ON p.id = uga.user_id
    JOIN screen_permissions sp ON sp.group_id = uga.group_id
    WHERE p.id = (SELECT auth.uid())
      AND sp.screen_key IN ('BANCO_HORAS', 'CONTROLE_BANCO_HORAS', 'VISAO_CONSOLIDADA')
      AND sp.permission_level IN ('view', 'edit')
  );
END;
$$;

COMMENT ON FUNCTION public.user_has_banco_horas_permission IS 
'Verifica se usuário tem permissão para acessar telas de banco de horas. Usa caminho correto: profiles → user_group_assignments → screen_permissions';

-- ============================================================================
-- STEP 2: Remove ALL old policies from banco_horas_calculos
-- ============================================================================

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'banco_horas_calculos' 
      AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON banco_horas_calculos', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- ============================================================================
-- STEP 3: Enable RLS
-- ============================================================================

ALTER TABLE banco_horas_calculos ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Create new optimized policies
-- ============================================================================

-- Policy for SELECT (read access)
CREATE POLICY "authenticated_select_banco_horas_calculos"
  ON banco_horas_calculos
  FOR SELECT
  TO authenticated
  USING (user_has_banco_horas_permission());

-- Policy for INSERT (create access)
CREATE POLICY "authenticated_insert_banco_horas_calculos"
  ON banco_horas_calculos
  FOR INSERT
  TO authenticated
  WITH CHECK (user_has_banco_horas_permission());

-- Policy for UPDATE (edit access)
CREATE POLICY "authenticated_update_banco_horas_calculos"
  ON banco_horas_calculos
  FOR UPDATE
  TO authenticated
  USING (user_has_banco_horas_permission())
  WITH CHECK (user_has_banco_horas_permission());

-- Policy for DELETE (delete access)
CREATE POLICY "authenticated_delete_banco_horas_calculos"
  ON banco_horas_calculos
  FOR DELETE
  TO authenticated
  USING (user_has_banco_horas_permission());

-- ============================================================================
-- STEP 5: Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON banco_horas_calculos TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_banco_horas_permission TO authenticated;

-- ============================================================================
-- STEP 6: Verify no duplicate policies
-- ============================================================================

DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT tablename, cmd, COUNT(*) as total
    FROM pg_policies 
    WHERE tablename = 'banco_horas_calculos'
      AND schemaname = 'public'
    GROUP BY tablename, cmd
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION '❌ ERRO: Políticas duplicadas encontradas!';
  END IF;
  
  RAISE NOTICE '✅ Sem duplicatas - RLS configurado corretamente';
END $$;

-- ============================================================================
-- STEP 7: Test policies
-- ============================================================================

-- Verify policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'banco_horas_calculos'
  AND schemaname = 'public'
ORDER BY cmd, policyname;

-- Count policies per action
SELECT 
  cmd as acao,
  COUNT(*) as total_politicas
FROM pg_policies
WHERE tablename = 'banco_horas_calculos'
  AND schemaname = 'public'
GROUP BY cmd
ORDER BY cmd;

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- 
-- Should have exactly 4 policies:
-- 1. authenticated_select_banco_horas_calculos (SELECT)
-- 2. authenticated_insert_banco_horas_calculos (INSERT)
-- 3. authenticated_update_banco_horas_calculos (UPDATE)
-- 4. authenticated_delete_banco_horas_calculos (DELETE)
--
-- Each action (SELECT, INSERT, UPDATE, DELETE) should have exactly 1 policy
--
-- ============================================================================
