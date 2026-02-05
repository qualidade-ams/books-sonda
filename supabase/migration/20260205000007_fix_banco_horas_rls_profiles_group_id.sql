-- Migration: Correção RLS usando profiles.group_id (sem user_group_members)
-- Data: 2026-02-05
-- Descrição: Versão alternativa que assume profiles tem group_id diretamente

-- ============================================================================
-- PASSO 1: REMOVER TODAS AS POLÍTICAS ANTIGAS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can insert own banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can update own banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can delete own banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Authenticated users can view banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Authenticated users can insert banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Authenticated users can update banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Authenticated users can delete banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Service role can manage banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "authenticated_select_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "authenticated_insert_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "authenticated_update_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "authenticated_delete_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "service_role_all_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can view calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can insert calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can update calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can delete calculos" ON banco_horas_calculos;

-- ============================================================================
-- PASSO 2: GARANTIR QUE RLS ESTÁ HABILITADO
-- ============================================================================

ALTER TABLE banco_horas_calculos ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASSO 3: CRIAR FUNÇÃO DE VERIFICAÇÃO (usando profiles.group_id)
-- ============================================================================

DROP FUNCTION IF EXISTS public.user_has_banco_horas_permission();

CREATE OR REPLACE FUNCTION public.user_has_banco_horas_permission()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_uuid UUID;
  has_permission BOOLEAN;
BEGIN
  -- Obter UUID do usuário autenticado
  user_uuid := (SELECT auth.uid());
  
  -- Se não há usuário autenticado, negar acesso
  IF user_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar se o usuário tem permissão
  -- Usa profiles.group_id diretamente (sem user_group_members)
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    JOIN screen_permissions sp ON sp.group_id = p.group_id
    WHERE p.id = user_uuid
      AND sp.screen_key IN ('controle_banco_horas', 'geracao_books_banco_horas', 'auditoria_banco_horas')
      AND sp.permission_level IN ('view', 'edit')
  ) INTO has_permission;
  
  RETURN COALESCE(has_permission, FALSE);
END;
$$;

COMMENT ON FUNCTION public.user_has_banco_horas_permission() IS 
  'Verifica se o usuário tem permissão para banco de horas. Usa profiles.group_id diretamente.';

-- ============================================================================
-- PASSO 4: CRIAR NOVAS POLÍTICAS
-- ============================================================================

CREATE POLICY "authenticated_select_banco_horas_calculos"
  ON banco_horas_calculos
  FOR SELECT
  TO authenticated
  USING (user_has_banco_horas_permission());

CREATE POLICY "authenticated_insert_banco_horas_calculos"
  ON banco_horas_calculos
  FOR INSERT
  TO authenticated
  WITH CHECK (user_has_banco_horas_permission());

CREATE POLICY "authenticated_update_banco_horas_calculos"
  ON banco_horas_calculos
  FOR UPDATE
  TO authenticated
  USING (user_has_banco_horas_permission())
  WITH CHECK (user_has_banco_horas_permission());

CREATE POLICY "authenticated_delete_banco_horas_calculos"
  ON banco_horas_calculos
  FOR DELETE
  TO authenticated
  USING (user_has_banco_horas_permission());

CREATE POLICY "service_role_all_banco_horas_calculos"
  ON banco_horas_calculos
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PASSO 5: VERIFICAR DUPLICATAS
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
    GROUP BY tablename, cmd
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION '❌ ERRO: Políticas duplicadas!';
  END IF;
  
  RAISE NOTICE '✅ Políticas criadas com sucesso (5 políticas)';
END $$;

-- ============================================================================
-- RESUMO
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '
╔════════════════════════════════════════════════════════════════╗
║  Migration aplicada com sucesso!                               ║
╠════════════════════════════════════════════════════════════════╣
║  ✅ Políticas antigas removidas                                ║
║  ✅ RLS habilitado                                             ║
║  ✅ Função corrigida (usa profiles.group_id)                   ║
║  ✅ 5 políticas criadas                                        ║
║  ✅ Sem duplicatas                                             ║
╚════════════════════════════════════════════════════════════════╝
  ';
END $$;
