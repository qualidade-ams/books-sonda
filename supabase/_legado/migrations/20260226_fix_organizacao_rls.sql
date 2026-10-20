-- Migration de Correção: Atualizar políticas RLS do organograma
-- Data: 2026-02-26
-- Descrição: Corrige políticas RLS permissivas para usar controle de acesso adequado

-- ============================================================================
-- PASSO 1: Remover políticas antigas (permissivas)
-- ============================================================================
DROP POLICY IF EXISTS "authenticated_select_organizacao" ON public.organizacao_estrutura;
DROP POLICY IF EXISTS "authenticated_insert_organizacao" ON public.organizacao_estrutura;
DROP POLICY IF EXISTS "authenticated_update_organizacao" ON public.organizacao_estrutura;
DROP POLICY IF EXISTS "authenticated_delete_organizacao" ON public.organizacao_estrutura;

-- ============================================================================
-- PASSO 2: Criar função de verificação de permissão (se não existir)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.user_has_organograma_permission(required_level TEXT DEFAULT 'view')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles p
    JOIN user_groups ug ON p.group_id = ug.id
    JOIN screen_permissions sp ON sp.group_id = ug.id
    WHERE p.id = (SELECT auth.uid())
      AND sp.screen_key = 'organograma'
      AND (
        (required_level = 'view' AND sp.permission_level IN ('view', 'edit')) OR
        (required_level = 'edit' AND sp.permission_level = 'edit')
      )
  );
END;
$$;

COMMENT ON FUNCTION public.user_has_organograma_permission IS 'Verifica se usuário tem permissão para acessar organograma. SECURITY DEFINER com search_path fixo para segurança.';

-- ============================================================================
-- PASSO 3: Criar novas políticas RLS com controle de permissões
-- ============================================================================

-- Política SELECT: Requer permissão 'view' ou 'edit'
CREATE POLICY "authenticated_select_organizacao"
  ON public.organizacao_estrutura FOR SELECT
  TO authenticated
  USING (user_has_organograma_permission('view'));

-- Política INSERT: Requer permissão 'edit'
CREATE POLICY "authenticated_insert_organizacao"
  ON public.organizacao_estrutura FOR INSERT
  TO authenticated
  WITH CHECK (user_has_organograma_permission('edit'));

-- Política UPDATE: Requer permissão 'edit'
CREATE POLICY "authenticated_update_organizacao"
  ON public.organizacao_estrutura FOR UPDATE
  TO authenticated
  USING (user_has_organograma_permission('edit'));

-- Política DELETE: Requer permissão 'edit'
CREATE POLICY "authenticated_delete_organizacao"
  ON public.organizacao_estrutura FOR DELETE
  TO authenticated
  USING (user_has_organograma_permission('edit'));

-- ============================================================================
-- PASSO 4: Garantir que RLS está habilitado
-- ============================================================================
ALTER TABLE public.organizacao_estrutura ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASSO 5: Verificar se não há políticas duplicadas
-- ============================================================================
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT tablename, cmd, COUNT(*) as total
    FROM pg_policies 
    WHERE schemaname = 'public'
      AND tablename = 'organizacao_estrutura'
    GROUP BY tablename, cmd
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION '❌ ERRO: Políticas duplicadas detectadas! Execute novamente a migration.';
  ELSE
    RAISE NOTICE '✅ Nenhuma política duplicada';
  END IF;
END $$;

-- ============================================================================
-- PASSO 6: Verificar se políticas não são permissivas
-- ============================================================================
DO $$
DECLARE
  permissive_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO permissive_count
  FROM pg_policies 
  WHERE schemaname = 'public'
    AND tablename = 'organizacao_estrutura'
    AND (
      qual = 'true' OR 
      qual LIKE '%true%' OR 
      with_check = 'true' OR 
      with_check LIKE '%true%'
    );
  
  IF permissive_count > 0 THEN
    RAISE EXCEPTION '❌ ERRO: Políticas permissivas detectadas! Verifique a configuração.';
  ELSE
    RAISE NOTICE '✅ Todas as políticas usam controle de acesso adequado';
  END IF;
END $$;

-- ============================================================================
-- RESULTADO
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Políticas RLS corrigidas com sucesso!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Políticas criadas:';
  RAISE NOTICE '- SELECT: Requer permissão view ou edit';
  RAISE NOTICE '- INSERT: Requer permissão edit';
  RAISE NOTICE '- UPDATE: Requer permissão edit';
  RAISE NOTICE '- DELETE: Requer permissão edit';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Sistema de organograma está seguro!';
  RAISE NOTICE '========================================';
END $$;
