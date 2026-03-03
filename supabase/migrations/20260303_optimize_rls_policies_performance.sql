-- Migration: Otimizar performance das políticas RLS
-- Data: 2026-03-03
-- Objetivo: Substituir auth.uid() por (SELECT auth.uid()) e remover políticas duplicadas

-- ============================================================================
-- PROBLEMA 1: Performance - auth.uid() reavaliado para cada linha
-- SOLUÇÃO: Usar (SELECT auth.uid()) que avalia apenas uma vez por query
-- ============================================================================

-- ============================================================================
-- PROBLEMA 2: Políticas duplicadas para SELECT
-- SOLUÇÃO: Remover políticas ALL e criar políticas específicas por operação
-- ============================================================================

-- ============================================================================
-- TABELA: books
-- ============================================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "books_select_authenticated" ON books;
DROP POLICY IF EXISTS "books_insert_authenticated" ON books;
DROP POLICY IF EXISTS "books_update_authenticated" ON books;
DROP POLICY IF EXISTS "books_delete_authenticated" ON books;

-- Criar políticas otimizadas
CREATE POLICY "books_select_public"
  ON books FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "books_insert_authenticated"
  ON books FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "books_update_authenticated"
  ON books FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "books_delete_authenticated"
  ON books FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- ============================================================================
-- TABELA: empresa_produtos
-- ============================================================================

-- Remover TODAS as políticas antigas (incluindo ALL que causa duplicata)
DROP POLICY IF EXISTS "empresa_produtos_select_public" ON empresa_produtos;
DROP POLICY IF EXISTS "empresa_produtos_modify_authenticated" ON empresa_produtos;
DROP POLICY IF EXISTS "empresa_produtos_insert_authenticated" ON empresa_produtos;
DROP POLICY IF EXISTS "empresa_produtos_update_authenticated" ON empresa_produtos;
DROP POLICY IF EXISTS "empresa_produtos_delete_authenticated" ON empresa_produtos;

-- Criar políticas otimizadas e específicas
CREATE POLICY "empresa_produtos_select_public"
  ON empresa_produtos FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "empresa_produtos_insert_authenticated"
  ON empresa_produtos FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "empresa_produtos_update_authenticated"
  ON empresa_produtos FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "empresa_produtos_delete_authenticated"
  ON empresa_produtos FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- ============================================================================
-- TABELA: empresas_clientes
-- ============================================================================

-- Remover TODAS as políticas antigas (incluindo ALL que causa duplicata)
DROP POLICY IF EXISTS "empresas_clientes_select_public" ON empresas_clientes;
DROP POLICY IF EXISTS "empresas_clientes_modify_authenticated" ON empresas_clientes;
DROP POLICY IF EXISTS "empresas_clientes_insert_authenticated" ON empresas_clientes;
DROP POLICY IF EXISTS "empresas_clientes_update_authenticated" ON empresas_clientes;
DROP POLICY IF EXISTS "empresas_clientes_delete_authenticated" ON empresas_clientes;

-- Criar políticas otimizadas e específicas
CREATE POLICY "empresas_clientes_select_public"
  ON empresas_clientes FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "empresas_clientes_insert_authenticated"
  ON empresas_clientes FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "empresas_clientes_update_authenticated"
  ON empresas_clientes FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "empresas_clientes_delete_authenticated"
  ON empresas_clientes FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- ============================================================================
-- TABELA: user_group_assignments
-- ============================================================================

-- Remover TODAS as políticas antigas (incluindo ALL que causa duplicata)
DROP POLICY IF EXISTS "user_group_assignments_select_own" ON user_group_assignments;
DROP POLICY IF EXISTS "user_group_assignments_select_admin" ON user_group_assignments;
DROP POLICY IF EXISTS "user_group_assignments_modify_admin" ON user_group_assignments;
DROP POLICY IF EXISTS "user_group_assignments_insert_admin" ON user_group_assignments;
DROP POLICY IF EXISTS "user_group_assignments_update_admin" ON user_group_assignments;
DROP POLICY IF EXISTS "user_group_assignments_delete_admin" ON user_group_assignments;

-- Criar políticas otimizadas
-- SELECT: Usuário vê suas próprias atribuições
CREATE POLICY "user_group_assignments_select_own"
  ON user_group_assignments FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- SELECT: Administradores veem todas as atribuições
CREATE POLICY "user_group_assignments_select_admin"
  ON user_group_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_group_assignments uga
      JOIN user_groups ug ON uga.group_id = ug.id
      WHERE uga.user_id = (SELECT auth.uid())
        AND ug.name = 'Administradores'
    )
  );

-- INSERT: Apenas administradores
CREATE POLICY "user_group_assignments_insert_admin"
  ON user_group_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_group_assignments uga
      JOIN user_groups ug ON uga.group_id = ug.id
      WHERE uga.user_id = (SELECT auth.uid())
        AND ug.name = 'Administradores'
    )
  );

-- UPDATE: Apenas administradores
CREATE POLICY "user_group_assignments_update_admin"
  ON user_group_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_group_assignments uga
      JOIN user_groups ug ON uga.group_id = ug.id
      WHERE uga.user_id = (SELECT auth.uid())
        AND ug.name = 'Administradores'
    )
  );

-- DELETE: Apenas administradores
CREATE POLICY "user_group_assignments_delete_admin"
  ON user_group_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_group_assignments uga
      JOIN user_groups ug ON uga.group_id = ug.id
      WHERE uga.user_id = (SELECT auth.uid())
        AND ug.name = 'Administradores'
    )
  );

-- ============================================================================
-- VERIFICAÇÃO: Checar se não há políticas duplicadas
-- ============================================================================

DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT tablename, cmd, COUNT(*) as total
    FROM pg_policies 
    WHERE tablename IN ('books', 'empresa_produtos', 'empresas_clientes', 'user_group_assignments')
      AND schemaname = 'public'
    GROUP BY tablename, cmd
    HAVING COUNT(*) > 1
      -- Exceção: user_group_assignments tem 2 SELECT intencionais (own + admin)
      AND NOT (tablename = 'user_group_assignments' AND cmd = 'SELECT' AND COUNT(*) = 2)
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION '❌ ERRO: Ainda existem políticas duplicadas!';
  END IF;
  
  RAISE NOTICE '✅ Sem políticas duplicadas problemáticas';
  RAISE NOTICE 'ℹ️  user_group_assignments tem 2 SELECT (intencional: own + admin)';
  RAISE NOTICE '   - user_group_assignments_select_own: usuários veem suas atribuições';
  RAISE NOTICE '   - user_group_assignments_select_admin: admins veem todas as atribuições';
  RAISE NOTICE '   Isso é um design correto, não uma duplicata problemática.';
END $$;

-- ============================================================================
-- COMENTÁRIOS FINAIS
-- ============================================================================

COMMENT ON POLICY "books_select_public" ON books IS 
  'Leitura pública de books. Performance otimizada.';

COMMENT ON POLICY "empresa_produtos_select_public" ON empresa_produtos IS 
  'Leitura pública de produtos. Performance otimizada.';

COMMENT ON POLICY "empresas_clientes_select_public" ON empresas_clientes IS 
  'Leitura pública de empresas. Performance otimizada.';

COMMENT ON POLICY "user_group_assignments_select_own" ON user_group_assignments IS 
  'Usuário vê suas próprias atribuições. Performance otimizada com (SELECT auth.uid()).';

COMMENT ON POLICY "user_group_assignments_select_admin" ON user_group_assignments IS 
  'Administradores veem todas as atribuições. Performance otimizada com (SELECT auth.uid()).';
