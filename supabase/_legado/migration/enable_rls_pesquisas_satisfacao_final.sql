-- =====================================================
-- REABILITAR RLS COM POLÍTICAS CORRETAS
-- =====================================================
-- Execute este script DEPOIS que a sincronização funcionar
-- para reativar a segurança com políticas adequadas
-- =====================================================

-- Passo 1: Habilitar RLS
ALTER TABLE pesquisas_satisfacao ENABLE ROW LEVEL SECURITY;

-- Passo 2: Remover políticas antigas
DROP POLICY IF EXISTS service_role_all_access ON pesquisas_satisfacao;
DROP POLICY IF EXISTS authenticated_select ON pesquisas_satisfacao;
DROP POLICY IF EXISTS authenticated_insert ON pesquisas_satisfacao;
DROP POLICY IF EXISTS authenticated_update ON pesquisas_satisfacao;
DROP POLICY IF EXISTS authenticated_delete ON pesquisas_satisfacao;
DROP POLICY IF EXISTS bypass_rls_for_service_role ON pesquisas_satisfacao;
DROP POLICY IF EXISTS authenticated_all_access ON pesquisas_satisfacao;

-- Passo 3: Criar política permissiva para service_role
CREATE POLICY "service_role_bypass"
ON pesquisas_satisfacao
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Passo 4: Criar política permissiva para authenticated
-- Permite tudo para usuários autenticados (simplificado)
CREATE POLICY "authenticated_full_access"
ON pesquisas_satisfacao
AS PERMISSIVE
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Passo 5: Verificar configuração
DO $$
DECLARE
  v_rls_enabled BOOLEAN;
  v_policy_count INTEGER;
BEGIN
  SELECT rowsecurity INTO v_rls_enabled
  FROM pg_tables 
  WHERE tablename = 'pesquisas_satisfacao';
  
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'pesquisas_satisfacao';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CONFIGURAÇÃO FINAL RLS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS Habilitado: %', CASE WHEN v_rls_enabled THEN '✓ SIM' ELSE '✗ NÃO' END;
  RAISE NOTICE 'Total de Políticas: %', v_policy_count;
  RAISE NOTICE '========================================';
  
  IF v_rls_enabled AND v_policy_count >= 2 THEN
    RAISE NOTICE '✓ RLS reabilitado com sucesso';
    RAISE NOTICE '✓ Service role tem acesso total';
    RAISE NOTICE '✓ Usuários autenticados têm acesso total';
    RAISE NOTICE '✓ Sistema protegido contra acesso não autenticado';
  ELSE
    RAISE WARNING '⚠ Configuração incompleta';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;
