-- =====================================================
-- CORRIGIR POLÍTICAS RLS DO BASELINE_HISTORICO
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. REMOVER POLÍTICAS ANTIGAS
DROP POLICY IF EXISTS "authenticated_select_baseline_historico" ON baseline_historico;
DROP POLICY IF EXISTS "authenticated_insert_baseline_historico" ON baseline_historico;
DROP POLICY IF EXISTS "authenticated_update_baseline_historico" ON baseline_historico;
DROP POLICY IF EXISTS "authenticated_delete_baseline_historico" ON baseline_historico;

-- 2. REMOVER FUNÇÃO ANTIGA
DROP FUNCTION IF EXISTS user_can_access_baseline_historico();

-- 3. CRIAR FUNÇÃO DE PERMISSÃO CORRIGIDA
CREATE OR REPLACE FUNCTION user_can_access_baseline_historico()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Permitir acesso para usuários autenticados que têm permissão nas telas relacionadas
  RETURN EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN user_groups ug ON uga.group_id = ug.id
    JOIN screen_permissions sp ON sp.group_id = ug.id
    WHERE uga.user_id = (SELECT auth.uid())
      AND sp.screen_key IN ('cadastro_empresas', 'controle_banco_horas', 'admin', 'gerenciar_empresas')
      AND sp.permission_level IN ('view', 'edit')
  );
END;
$$;

-- 4. CRIAR POLÍTICAS RLS PERMISSIVAS
CREATE POLICY "authenticated_select_baseline_historico"
  ON baseline_historico FOR SELECT
  TO authenticated
  USING (
    -- Permitir se usuário tem permissão OU se é service_role
    user_can_access_baseline_historico() OR auth.jwt()->>'role' = 'service_role'
  );

CREATE POLICY "authenticated_insert_baseline_historico"
  ON baseline_historico FOR INSERT
  TO authenticated
  WITH CHECK (
    user_can_access_baseline_historico() OR auth.jwt()->>'role' = 'service_role'
  );

CREATE POLICY "authenticated_update_baseline_historico"
  ON baseline_historico FOR UPDATE
  TO authenticated
  USING (
    user_can_access_baseline_historico() OR auth.jwt()->>'role' = 'service_role'
  );

CREATE POLICY "authenticated_delete_baseline_historico"
  ON baseline_historico FOR DELETE
  TO authenticated
  USING (
    user_can_access_baseline_historico() OR auth.jwt()->>'role' = 'service_role'
  );

-- 5. GARANTIR PERMISSÕES
GRANT SELECT, INSERT, UPDATE, DELETE ON baseline_historico TO authenticated;
GRANT ALL ON baseline_historico TO service_role;

-- 6. VERIFICAR POLÍTICAS
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as comando,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING definido'
    ELSE 'Sem USING'
  END as using_status,
  CASE 
    WHEN with_check IS NOT NULL THEN 'WITH CHECK definido'
    ELSE 'Sem WITH CHECK'
  END as check_status
FROM pg_policies 
WHERE tablename = 'baseline_historico'
ORDER BY cmd;

-- 7. TESTAR ACESSO
DO $$
DECLARE
  total_records INTEGER;
  rls_enabled BOOLEAN;
BEGIN
  -- Verificar se RLS está habilitado
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'baseline_historico';
  
  -- Contar registros
  SELECT COUNT(*) INTO total_records FROM baseline_historico;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ RLS Habilitado: %', rls_enabled;
  RAISE NOTICE '📊 Total de registros: %', total_records;
  RAISE NOTICE '🔒 Políticas criadas: 4 (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '========================================';
END $$;
