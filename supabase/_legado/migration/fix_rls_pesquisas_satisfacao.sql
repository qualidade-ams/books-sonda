-- =====================================================
-- CORREÇÃO: Políticas RLS para pesquisas_satisfacao
-- =====================================================
-- Permite que a API Node.js (service key) insira dados
-- Mantém controle de acesso para usuários normais
-- Data: 2025-01-XX
-- =====================================================

-- Passo 1: Remover políticas antigas se existirem
DROP POLICY IF EXISTS "pesquisas_select_policy" ON pesquisas_satisfacao;
DROP POLICY IF EXISTS "pesquisas_insert_policy" ON pesquisas_satisfacao;
DROP POLICY IF EXISTS "pesquisas_update_policy" ON pesquisas_satisfacao;
DROP POLICY IF EXISTS "pesquisas_delete_policy" ON pesquisas_satisfacao;

-- Passo 2: Garantir que RLS está habilitado
ALTER TABLE pesquisas_satisfacao ENABLE ROW LEVEL SECURITY;

-- Passo 3: Criar política para SELECT
-- Permite que usuários autenticados vejam pesquisas baseado em permissões
CREATE POLICY "pesquisas_satisfacao_select_policy"
ON pesquisas_satisfacao
FOR SELECT
TO authenticated
USING (
  -- Service role tem acesso total
  auth.jwt() ->> 'role' = 'service_role'
  OR
  -- Usuários autenticados com permissões adequadas
  EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN screen_permissions sp ON uga.group_id = sp.group_id
    WHERE uga.user_id = auth.uid()
      AND sp.screen_key IN ('lancar_pesquisas', 'enviar_pesquisas')
      AND sp.permission_level IN ('view', 'edit')
  )
);

-- Passo 4: Criar política para INSERT
-- Permite service role e usuários com permissão de edição
CREATE POLICY "pesquisas_satisfacao_insert_policy"
ON pesquisas_satisfacao
FOR INSERT
TO authenticated
WITH CHECK (
  -- Service role tem acesso total (API Node.js)
  auth.jwt() ->> 'role' = 'service_role'
  OR
  -- Usuários com permissão de edição
  EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN screen_permissions sp ON uga.group_id = sp.group_id
    WHERE uga.user_id = auth.uid()
      AND sp.screen_key = 'lancar_pesquisas'
      AND sp.permission_level = 'edit'
  )
);

-- Passo 5: Criar política para UPDATE
-- Permite service role e usuários com permissão de edição
CREATE POLICY "pesquisas_satisfacao_update_policy"
ON pesquisas_satisfacao
FOR UPDATE
TO authenticated
USING (
  -- Service role tem acesso total
  auth.jwt() ->> 'role' = 'service_role'
  OR
  -- Usuários com permissão de edição
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
  -- Service role tem acesso total
  auth.jwt() ->> 'role' = 'service_role'
  OR
  -- Usuários com permissão de edição
  EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN screen_permissions sp ON uga.group_id = sp.group_id
    WHERE uga.user_id = auth.uid()
      AND sp.screen_key = 'lancar_pesquisas'
      AND sp.permission_level = 'edit'
  )
);

-- Passo 6: Criar política para DELETE
-- Permite service role e usuários com permissão de edição
CREATE POLICY "pesquisas_satisfacao_delete_policy"
ON pesquisas_satisfacao
FOR DELETE
TO authenticated
USING (
  -- Service role tem acesso total
  auth.jwt() ->> 'role' = 'service_role'
  OR
  -- Usuários com permissão de edição
  EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN screen_permissions sp ON uga.group_id = sp.group_id
    WHERE uga.user_id = auth.uid()
      AND sp.screen_key = 'lancar_pesquisas'
      AND sp.permission_level = 'edit'
  )
);

-- Passo 7: Verificar políticas criadas
DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'pesquisas_satisfacao';
  
  IF v_policy_count >= 4 THEN
    RAISE NOTICE '✓ % políticas RLS criadas com sucesso para pesquisas_satisfacao', v_policy_count;
  ELSE
    RAISE WARNING '⚠ Apenas % políticas encontradas. Esperado: 4', v_policy_count;
  END IF;
END $$;

-- Passo 8: Mensagens finais
DO $$
BEGIN
  RAISE NOTICE '✓ Políticas RLS configuradas com sucesso para pesquisas_satisfacao';
  RAISE NOTICE '✓ Service role (API) tem acesso total para INSERT/UPDATE/DELETE';
  RAISE NOTICE '✓ Usuários autenticados precisam de permissões adequadas';
  RAISE NOTICE '✓ Migração concluída - Sincronização com SQL Server deve funcionar';
END $$;
