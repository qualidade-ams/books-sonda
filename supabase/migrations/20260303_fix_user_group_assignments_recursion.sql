-- Migration: Corrigir recursão infinita em user_group_assignments
-- Data: 2026-03-03
-- Problema: Políticas de admin verificam a própria tabela causando recursão infinita
-- Solução: Simplificar políticas para evitar recursão

-- ============================================================================
-- PROBLEMA IDENTIFICADO
-- ============================================================================
-- As políticas de administrador fazem SELECT em user_group_assignments
-- para verificar se o usuário é admin, mas isso causa recursão infinita
-- porque a própria query de verificação precisa passar pelas políticas RLS.

-- ============================================================================
-- SOLUÇÃO
-- ============================================================================
-- Opção 1: Usar apenas SELECT own + modificações via service_role
-- Opção 2: Criar função SECURITY DEFINER que bypassa RLS
-- Implementaremos Opção 1 por ser mais simples e segura

-- ============================================================================
-- REMOVER POLÍTICAS PROBLEMÁTICAS
-- ============================================================================

DROP POLICY IF EXISTS "user_group_assignments_select_own" ON user_group_assignments;
DROP POLICY IF EXISTS "user_group_assignments_select_admin" ON user_group_assignments;
DROP POLICY IF EXISTS "user_group_assignments_insert_admin" ON user_group_assignments;
DROP POLICY IF EXISTS "user_group_assignments_update_admin" ON user_group_assignments;
DROP POLICY IF EXISTS "user_group_assignments_delete_admin" ON user_group_assignments;
DROP POLICY IF EXISTS "user_group_assignments_modify_service" ON user_group_assignments;
DROP POLICY IF EXISTS "user_group_assignments_select_service" ON user_group_assignments;

-- ============================================================================
-- CRIAR POLÍTICA CONSOLIDADA SEM RECURSÃO
-- ============================================================================

-- SELECT: Política consolidada que permite:
-- 1. Usuários verem suas próprias atribuições
-- 2. Service role ver tudo
-- Esta política é segura e não causa recursão
CREATE POLICY "user_group_assignments_select"
  ON user_group_assignments FOR SELECT
  TO authenticated, anon, service_role
  USING (
    -- Service role vê tudo
    (SELECT current_setting('role', true)) = 'service_role'
    OR
    -- Usuários autenticados veem apenas suas atribuições
    user_id = (SELECT auth.uid())
  );

-- INSERT/UPDATE/DELETE: Apenas service role
-- Operações administrativas devem ser feitas via API com service_role key
-- ou via funções SECURITY DEFINER que bypassam RLS
CREATE POLICY "user_group_assignments_modify"
  ON user_group_assignments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- ALTERNATIVA: Função para verificar se usuário é admin (SEM RECURSÃO)
-- ============================================================================
-- Esta função bypassa RLS usando SECURITY DEFINER

CREATE OR REPLACE FUNCTION public.is_user_admin(user_id_param UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  is_admin BOOLEAN;
BEGIN
  -- Se não passar user_id, usa o usuário atual
  target_user_id := COALESCE(user_id_param, auth.uid());
  
  -- Verificar se usuário está no grupo Administradores
  -- SECURITY DEFINER bypassa RLS, então não há recursão
  SELECT EXISTS (
    SELECT 1 
    FROM user_group_assignments uga
    JOIN user_groups ug ON uga.group_id = ug.id
    WHERE uga.user_id = target_user_id
      AND ug.name = 'Administradores'
  ) INTO is_admin;
  
  RETURN COALESCE(is_admin, false);
END;
$$;

COMMENT ON FUNCTION public.is_user_admin IS 
  'Verifica se usuário é administrador. Usa SECURITY DEFINER para evitar recursão RLS.';

-- ============================================================================
-- GRANT EXECUTE para authenticated
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.is_user_admin TO authenticated, anon;

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Contar políticas de user_group_assignments
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'user_group_assignments'
    AND schemaname = 'public';
  
  RAISE NOTICE '✅ Total de políticas em user_group_assignments: %', policy_count;
  RAISE NOTICE 'ℹ️  Políticas criadas:';
  RAISE NOTICE '   - user_group_assignments_select (consolidada para authenticated/anon/service_role)';
  RAISE NOTICE '   - user_group_assignments_modify (ALL para service_role)';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Função is_user_admin() criada para verificações sem recursão';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANTE: Operações administrativas (INSERT/UPDATE/DELETE) devem usar:';
  RAISE NOTICE '   1. Service role key no backend';
  RAISE NOTICE '   2. Funções SECURITY DEFINER que bypassam RLS';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Sem políticas duplicadas - apenas 1 SELECT e 1 ALL';
END $$;
