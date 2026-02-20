-- ============================================================================
-- Migration: Fix RLS policies for banco_horas_calculos_segmentados
-- Created: 2026-02-13
-- Purpose: Fix 406 (Not Acceptable) errors by correcting RLS policies
-- ============================================================================

-- STEP 1: Remove ALL old policies from banco_horas_calculos_segmentados
-- ============================================================================

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'banco_horas_calculos_segmentados' 
      AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON banco_horas_calculos_segmentados', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- ============================================================================
-- STEP 2: Enable RLS
-- ============================================================================

ALTER TABLE banco_horas_calculos_segmentados ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Create new optimized policies
-- ============================================================================

-- Policy for SELECT (read access)
CREATE POLICY "authenticated_select_banco_horas_segmentados"
  ON banco_horas_calculos_segmentados
  FOR SELECT
  TO authenticated
  USING (user_has_banco_horas_permission());

-- Policy for INSERT (create access)
CREATE POLICY "authenticated_insert_banco_horas_segmentados"
  ON banco_horas_calculos_segmentados
  FOR INSERT
  TO authenticated
  WITH CHECK (user_has_banco_horas_permission());

-- Policy for UPDATE (edit access)
CREATE POLICY "authenticated_update_banco_horas_segmentados"
  ON banco_horas_calculos_segmentados
  FOR UPDATE
  TO authenticated
  USING (user_has_banco_horas_permission())
  WITH CHECK (user_has_banco_horas_permission());

-- Policy for DELETE (delete access)
CREATE POLICY "authenticated_delete_banco_horas_segmentados"
  ON banco_horas_calculos_segmentados
  FOR DELETE
  TO authenticated
  USING (user_has_banco_horas_permission());

-- ============================================================================
-- STEP 4: Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON banco_horas_calculos_segmentados TO authenticated;

-- ============================================================================
-- STEP 5: Verify no duplicate policies
-- ============================================================================

DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT tablename, cmd, COUNT(*) as total
    FROM pg_policies 
    WHERE tablename = 'banco_horas_calculos_segmentados'
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
-- STEP 6: Test policies
-- ============================================================================

-- Verify policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'banco_horas_calculos_segmentados'
  AND schemaname = 'public'
ORDER BY cmd, policyname;

-- Count policies per action
SELECT 
  cmd as acao,
  COUNT(*) as total_politicas
FROM pg_policies
WHERE tablename = 'banco_horas_calculos_segmentados'
  AND schemaname = 'public'
GROUP BY cmd
ORDER BY cmd;

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- 
-- Should have exactly 4 policies:
-- 1. authenticated_select_banco_horas_segmentados (SELECT)
-- 2. authenticated_insert_banco_horas_segmentados (INSERT)
-- 3. authenticated_update_banco_horas_segmentados (UPDATE)
-- 4. authenticated_delete_banco_horas_segmentados (DELETE)
--
-- Each action (SELECT, INSERT, UPDATE, DELETE) should have exactly 1 policy
--
-- ============================================================================
