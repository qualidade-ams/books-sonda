-- ============================================
-- RECRIAR POLÍTICAS RLS - PESQUISAS
-- ============================================
-- Remove políticas existentes e recria corretamente

-- 1. Remover TODAS as políticas existentes
DROP POLICY IF EXISTS "service_role_all_pesquisas" ON pesquisas;
DROP POLICY IF EXISTS "users_select_pesquisas" ON pesquisas;
DROP POLICY IF EXISTS "users_insert_pesquisas" ON pesquisas;
DROP POLICY IF EXISTS "users_update_pesquisas" ON pesquisas;
DROP POLICY IF EXISTS "users_delete_pesquisas" ON pesquisas;

-- 2. Verificar se RLS está habilitado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'pesquisas' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE pesquisas ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS habilitado na tabela pesquisas';
  ELSE
    RAISE NOTICE 'RLS já estava habilitado';
  END IF;
END $$;

-- 3. Criar política para service_role (API de sincronização)
CREATE POLICY "service_role_all_pesquisas" ON pesquisas
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Criar políticas para usuários autenticados

-- SELECT: Visualizar pesquisas
CREATE POLICY "users_select_pesquisas" ON pesquisas
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_group_assignments uga
    JOIN screen_permissions sp ON sp.group_id = uga.group_id
    WHERE uga.user_id = auth.uid()
      AND sp.screen_key IN ('lancar_pesquisas', 'enviar_pesquisas')
      AND sp.permission_level IN ('view', 'edit')
  )
);

-- INSERT: Criar pesquisas
CREATE POLICY "users_insert_pesquisas" ON pesquisas
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_group_assignments uga
    JOIN screen_permissions sp ON sp.group_id = uga.group_id
    WHERE uga.user_id = auth.uid()
      AND sp.screen_key = 'lancar_pesquisas'
      AND sp.permission_level = 'edit'
  )
);

-- UPDATE: Atualizar pesquisas
CREATE POLICY "users_update_pesquisas" ON pesquisas
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_group_assignments uga
    JOIN screen_permissions sp ON sp.group_id = uga.group_id
    WHERE uga.user_id = auth.uid()
      AND sp.screen_key IN ('lancar_pesquisas', 'enviar_pesquisas')
      AND sp.permission_level = 'edit'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_group_assignments uga
    JOIN screen_permissions sp ON sp.group_id = uga.group_id
    WHERE uga.user_id = auth.uid()
      AND sp.screen_key IN ('lancar_pesquisas', 'enviar_pesquisas')
      AND sp.permission_level = 'edit'
  )
);

-- DELETE: Excluir pesquisas
CREATE POLICY "users_delete_pesquisas" ON pesquisas
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_group_assignments uga
    JOIN screen_permissions sp ON sp.group_id = uga.group_id
    WHERE uga.user_id = auth.uid()
      AND sp.screen_key = 'lancar_pesquisas'
      AND sp.permission_level = 'edit'
  )
);

-- 5. Verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'pesquisas'
ORDER BY policyname;

-- 6. Verificar status do RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'pesquisas';

-- Mensagem final
DO $$
BEGIN
  RAISE NOTICE '✅ Políticas RLS recriadas com sucesso!';
  RAISE NOTICE '✅ Total de 5 políticas:';
  RAISE NOTICE '   1. service_role_all_pesquisas (API)';
  RAISE NOTICE '   2. users_select_pesquisas (visualização)';
  RAISE NOTICE '   3. users_insert_pesquisas (inserção)';
  RAISE NOTICE '   4. users_update_pesquisas (atualização)';
  RAISE NOTICE '   5. users_delete_pesquisas (exclusão)';
END $$;
