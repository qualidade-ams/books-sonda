-- ============================================================================
-- Migration: Fix banco_horas permission function
-- Data: 2026-03-03
-- Descrição: Corrige função user_has_banco_horas_permission para usar user_group_assignments
-- ============================================================================

-- PASSO 1: Remover políticas RLS que dependem da função
-- ============================================================================
DROP POLICY IF EXISTS "authenticated_select_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "authenticated_insert_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "authenticated_update_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "authenticated_delete_banco_horas_calculos" ON banco_horas_calculos;

DROP POLICY IF EXISTS "authenticated_select_banco_horas_segmentados" ON banco_horas_calculos_segmentados;
DROP POLICY IF EXISTS "authenticated_insert_banco_horas_segmentados" ON banco_horas_calculos_segmentados;
DROP POLICY IF EXISTS "authenticated_update_banco_horas_segmentados" ON banco_horas_calculos_segmentados;
DROP POLICY IF EXISTS "authenticated_delete_banco_horas_segmentados" ON banco_horas_calculos_segmentados;

-- PASSO 2: Remover função antiga
-- ============================================================================
DROP FUNCTION IF EXISTS public.user_has_banco_horas_permission();

-- PASSO 3: Criar função corrigida
-- ============================================================================
CREATE OR REPLACE FUNCTION public.user_has_banco_horas_permission()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Obter ID do usuário atual
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar permissão através de user_group_assignments
  RETURN EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN user_groups ug ON uga.group_id = ug.id
    JOIN screen_permissions sp ON sp.group_id = ug.id
    WHERE uga.user_id = current_user_id
      AND sp.screen_key IN (
        'controle_banco_horas',
        'banco_horas_alocacoes',
        'banco_horas_visao_consolidada',
        'banco_horas_visao_segmentada'
      )
      AND sp.permission_level IN ('view', 'edit')
  );
END;
$$;

COMMENT ON FUNCTION public.user_has_banco_horas_permission IS 'Verifica permissão de banco de horas através de user_group_assignments - Corrigido em 2026-03-03';

-- PASSO 4: Recriar políticas RLS para banco_horas_calculos
-- ============================================================================

-- Garantir RLS habilitado
ALTER TABLE banco_horas_calculos ENABLE ROW LEVEL SECURITY;

-- Criar novas políticas
CREATE POLICY "authenticated_select_banco_horas_calculos"
  ON banco_horas_calculos FOR SELECT TO authenticated
  USING (user_has_banco_horas_permission());

CREATE POLICY "authenticated_insert_banco_horas_calculos"
  ON banco_horas_calculos FOR INSERT TO authenticated
  WITH CHECK (user_has_banco_horas_permission());

CREATE POLICY "authenticated_update_banco_horas_calculos"
  ON banco_horas_calculos FOR UPDATE TO authenticated
  USING (user_has_banco_horas_permission())
  WITH CHECK (user_has_banco_horas_permission());

CREATE POLICY "authenticated_delete_banco_horas_calculos"
  ON banco_horas_calculos FOR DELETE TO authenticated
  USING (user_has_banco_horas_permission());

-- PASSO 5: Recriar políticas RLS para banco_horas_calculos_segmentados
-- ============================================================================

-- Garantir RLS habilitado
ALTER TABLE banco_horas_calculos_segmentados ENABLE ROW LEVEL SECURITY;

-- Criar novas políticas
CREATE POLICY "authenticated_select_banco_horas_segmentados"
  ON banco_horas_calculos_segmentados FOR SELECT TO authenticated
  USING (user_has_banco_horas_permission());

CREATE POLICY "authenticated_insert_banco_horas_segmentados"
  ON banco_horas_calculos_segmentados FOR INSERT TO authenticated
  WITH CHECK (user_has_banco_horas_permission());

CREATE POLICY "authenticated_update_banco_horas_segmentados"
  ON banco_horas_calculos_segmentados FOR UPDATE TO authenticated
  USING (user_has_banco_horas_permission())
  WITH CHECK (user_has_banco_horas_permission());

CREATE POLICY "authenticated_delete_banco_horas_segmentados"
  ON banco_horas_calculos_segmentados FOR DELETE TO authenticated
  USING (user_has_banco_horas_permission());

-- PASSO 6: Verificação
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Função user_has_banco_horas_permission corrigida';
  RAISE NOTICE '✅ Políticas RLS recriadas para banco_horas_calculos';
  RAISE NOTICE '✅ Políticas RLS recriadas para banco_horas_calculos_segmentados';
  RAISE NOTICE '';
  RAISE NOTICE '📋 A função agora usa user_group_assignments em vez de profiles.group_id';
END $$;

-- PASSO 7: Relatório de políticas
-- ============================================================================
SELECT 
  tablename,
  policyname,
  cmd as acao,
  qual as condicao_using,
  with_check as condicao_with_check
FROM pg_policies
WHERE tablename IN ('banco_horas_calculos', 'banco_horas_calculos_segmentados')
  AND schemaname = 'public'
ORDER BY tablename, cmd, policyname;
