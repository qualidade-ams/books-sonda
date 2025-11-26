-- =====================================================
-- CORREÇÃO V2: Políticas RLS para pesquisas_satisfacao
-- =====================================================
-- Versão simplificada que garante acesso total para service role
-- Data: 2025-01-XX
-- =====================================================

-- Passo 1: Remover TODAS as políticas existentes
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'pesquisas_satisfacao'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON pesquisas_satisfacao', pol.policyname);
    RAISE NOTICE 'Removida política: %', pol.policyname;
  END LOOP;
END $$;

-- Passo 2: Garantir que RLS está habilitado
ALTER TABLE pesquisas_satisfacao ENABLE ROW LEVEL SECURITY;

-- Passo 3: Criar política PERMISSIVA para service role
-- Esta política permite TUDO para service role sem verificações adicionais
CREATE POLICY "service_role_all_access"
ON pesquisas_satisfacao
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Passo 4: Criar política para SELECT (usuários autenticados)
CREATE POLICY "authenticated_select"
ON pesquisas_satisfacao
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN screen_permissions sp ON uga.group_id = sp.group_id
    WHERE uga.user_id = auth.uid()
      AND sp.screen_key IN ('lancar_pesquisas', 'enviar_pesquisas')
      AND sp.permission_level IN ('view', 'edit')
  )
);

-- Passo 5: Criar política para INSERT (usuários autenticados)
CREATE POLICY "authenticated_insert"
ON pesquisas_satisfacao
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN screen_permissions sp ON uga.group_id = sp.group_id
    WHERE uga.user_id = auth.uid()
      AND sp.screen_key = 'lancar_pesquisas'
      AND sp.permission_level = 'edit'
  )
);

-- Passo 6: Criar política para UPDATE (usuários autenticados)
CREATE POLICY "authenticated_update"
ON pesquisas_satisfacao
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN screen_permissions sp ON uga.group_id = sp.group_id
    WHERE uga.user_id = auth.uid()
      AND sp.screen_key = 'lancar_pesquisas'
      AND sp.permission_level = 'edit'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN screen_permissions sp ON uga.group_id = sp.group_id
    WHERE uga.user_id = auth.uid()
      AND sp.screen_key = 'lancar_pesquisas'
      AND sp.permission_level = 'edit'
  )
);

-- Passo 7: Criar política para DELETE (usuários autenticados)
CREATE POLICY "authenticated_delete"
ON pesquisas_satisfacao
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN screen_permissions sp ON uga.group_id = sp.group_id
    WHERE uga.user_id = auth.uid()
      AND sp.screen_key = 'lancar_pesquisas'
      AND sp.permission_level = 'edit'
  )
);

-- Passo 8: Verificar políticas criadas
DO $$
DECLARE
  v_policy_count INTEGER;
  v_service_role_policy INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'pesquisas_satisfacao';
  
  SELECT COUNT(*)
  INTO v_service_role_policy
  FROM pg_policies
  WHERE tablename = 'pesquisas_satisfacao'
    AND policyname = 'service_role_all_access';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICAÇÃO DE POLÍTICAS RLS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de políticas: %', v_policy_count;
  RAISE NOTICE 'Política service_role: %', CASE WHEN v_service_role_policy > 0 THEN '✓ CRIADA' ELSE '✗ NÃO ENCONTRADA' END;
  RAISE NOTICE '========================================';
  
  IF v_policy_count >= 5 AND v_service_role_policy > 0 THEN
    RAISE NOTICE '✓ Configuração concluída com sucesso!';
    RAISE NOTICE '✓ Service role tem acesso TOTAL (sem restrições)';
    RAISE NOTICE '✓ Usuários autenticados controlados por permissões';
  ELSE
    RAISE WARNING '⚠ Configuração incompleta. Verifique as políticas.';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;
