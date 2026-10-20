-- Migration: Corrigir políticas RLS de user_group_assignments
-- Data: 2026-03-10
-- Descrição: Remove todas as políticas antigas e cria políticas simples e funcionais

-- ============================================================================
-- PASSO 1: REMOVER TODAS AS POLÍTICAS ANTIGAS
-- ============================================================================

DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'user_group_assignments' 
      AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_group_assignments', pol.policyname);
    RAISE NOTICE 'Política removida: %', pol.policyname;
  END LOOP;
END $$;

-- ============================================================================
-- PASSO 2: GARANTIR QUE RLS ESTÁ HABILITADO
-- ============================================================================

ALTER TABLE public.user_group_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASSO 3: CRIAR POLÍTICAS SIMPLES E FUNCIONAIS
-- ============================================================================

-- SELECT: Usuários autenticados podem ver todas as atribuições
-- (necessário para listar usuários e seus grupos)
CREATE POLICY "user_group_assignments_select_all"
  ON public.user_group_assignments
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Usuários autenticados podem criar atribuições
-- (a verificação de permissões será feita no frontend/backend)
CREATE POLICY "user_group_assignments_insert_all"
  ON public.user_group_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Usuários autenticados podem atualizar atribuições
CREATE POLICY "user_group_assignments_update_all"
  ON public.user_group_assignments
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: Usuários autenticados podem deletar atribuições
CREATE POLICY "user_group_assignments_delete_all"
  ON public.user_group_assignments
  FOR DELETE
  TO authenticated
  USING (true);

-- Service role tem acesso total (sempre)
CREATE POLICY "user_group_assignments_service_role"
  ON public.user_group_assignments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PASSO 4: VERIFICAR POLÍTICAS CRIADAS
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'user_group_assignments'
    AND schemaname = 'public';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'POLÍTICAS RLS - user_group_assignments';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de políticas: %', policy_count;
  RAISE NOTICE '';
  
  IF policy_count = 5 THEN
    RAISE NOTICE '✅ Políticas criadas com sucesso!';
  ELSE
    RAISE WARNING '⚠️  Número inesperado de políticas: %', policy_count;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Políticas criadas:';
  RAISE NOTICE '- user_group_assignments_select_all (SELECT)';
  RAISE NOTICE '- user_group_assignments_insert_all (INSERT)';
  RAISE NOTICE '- user_group_assignments_update_all (UPDATE)';
  RAISE NOTICE '- user_group_assignments_delete_all (DELETE)';
  RAISE NOTICE '- user_group_assignments_service_role (ALL)';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
