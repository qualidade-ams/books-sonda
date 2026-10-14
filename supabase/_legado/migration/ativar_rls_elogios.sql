-- ============================================
-- ATIVAR RLS - TABELA PESQUISAS
-- ============================================
-- Ativa Row Level Security e cria políticas adequadas

-- 1. Habilitar RLS na tabela
ALTER TABLE pesquisas ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas se existirem
DROP POLICY IF EXISTS "service_role_all_pesquisas" ON pesquisas;
DROP POLICY IF EXISTS "users_select_pesquisas" ON pesquisas;
DROP POLICY IF EXISTS "users_insert_pesquisas" ON pesquisas;
DROP POLICY IF EXISTS "users_update_pesquisas" ON pesquisas;
DROP POLICY IF EXISTS "users_delete_pesquisas" ON pesquisas;

-- 3. Criar política para service_role (API de sincronização)
CREATE POLICY "service_role_all_pesquisas" ON pesquisas
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Criar políticas para usuários autenticados com permissões

-- SELECT: Usuários podem ver pesquisas se tiverem permissão na tela
CREATE POLICY "users_select_pesquisas" ON pesquisas
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

-- INSERT: Usuários podem inserir se tiverem permissão de edição
CREATE POLICY "users_insert_pesquisas" ON pesquisas
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

-- UPDATE: Usuários podem atualizar se tiverem permissão de edição
CREATE POLICY "users_update_pesquisas" ON pesquisas
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

-- DELETE: Usuários podem deletar se tiverem permissão de edição
CREATE POLICY "users_delete_pesquisas" ON pesquisas
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

-- 5. Verificar status do RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'pesquisas';

-- 6. Verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'pesquisas'
ORDER BY policyname;

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ RLS ativado com sucesso!';
  RAISE NOTICE '✅ 5 políticas criadas:';
  RAISE NOTICE '   - service_role_all_pesquisas (API de sincronização)';
  RAISE NOTICE '   - users_select_pesquisas (visualização)';
  RAISE NOTICE '   - users_insert_pesquisas (inserção)';
  RAISE NOTICE '   - users_update_pesquisas (atualização)';
  RAISE NOTICE '   - users_delete_pesquisas (exclusão)';
END $$;
