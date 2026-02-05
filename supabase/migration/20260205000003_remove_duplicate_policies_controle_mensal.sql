-- Migration: Remover políticas duplicadas da tabela controle_mensal
-- Data: 2026-02-05
-- Descrição: Remove todas as políticas antigas e duplicadas, mantendo apenas as corretas

-- ============================================================================
-- REMOVER TODAS AS POLÍTICAS EXISTENTES
-- ============================================================================

-- Remover políticas antigas (nomes antigos)
DROP POLICY IF EXISTS "Usuários podem visualizar controle mensal se têm permissão" ON controle_mensal;
DROP POLICY IF EXISTS "Usuários podem inserir controle mensal se têm permissão de edição" ON controle_mensal;
DROP POLICY IF EXISTS "Usuários podem atualizar controle mensal se têm permissão de edição" ON controle_mensal;
DROP POLICY IF EXISTS "Usuários podem deletar controle mensal se têm permissão de edição" ON controle_mensal;

-- Remover políticas novas (nomes novos)
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar controle mensal" ON controle_mensal;
DROP POLICY IF EXISTS "Usuários com permissão podem inserir controle mensal" ON controle_mensal;
DROP POLICY IF EXISTS "Usuários com permissão podem atualizar controle mensal" ON controle_mensal;
DROP POLICY IF EXISTS "Usuários com permissão podem deletar controle mensal" ON controle_mensal;

-- Remover políticas genéricas (se existirem)
DROP POLICY IF EXISTS "controle_mensal_select_policy" ON controle_mensal;
DROP POLICY IF EXISTS "controle_mensal_insert_policy" ON controle_mensal;
DROP POLICY IF EXISTS "controle_mensal_update_policy" ON controle_mensal;
DROP POLICY IF EXISTS "controle_mensal_delete_policy" ON controle_mensal;

-- ============================================================================
-- CRIAR POLÍTICAS CORRETAS (SEM DUPLICATAS)
-- ============================================================================

-- SELECT: Todos os usuários autenticados podem visualizar
CREATE POLICY "controle_mensal_select_policy" ON controle_mensal
    FOR SELECT 
    TO authenticated
    USING (true);

-- INSERT: Usuários com permissão de edição
CREATE POLICY "controle_mensal_insert_policy" ON controle_mensal
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        has_screen_permission('controle_disparos', 'edit') OR
        has_screen_permission('geracao_books', 'edit')
    );

-- UPDATE: Usuários com permissão de edição
CREATE POLICY "controle_mensal_update_policy" ON controle_mensal
    FOR UPDATE 
    TO authenticated
    USING (
        has_screen_permission('controle_disparos', 'edit') OR
        has_screen_permission('geracao_books', 'edit')
    );

-- DELETE: Usuários com permissão de edição
CREATE POLICY "controle_mensal_delete_policy" ON controle_mensal
    FOR DELETE 
    TO authenticated
    USING (
        has_screen_permission('controle_disparos', 'edit') OR
        has_screen_permission('geracao_books', 'edit')
    );

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON POLICY "controle_mensal_select_policy" ON controle_mensal IS 
'Permite que todos os usuários autenticados visualizem o controle mensal (read-only)';

COMMENT ON POLICY "controle_mensal_insert_policy" ON controle_mensal IS 
'Permite inserção para usuários com permissão de edição em controle_disparos ou geracao_books';

COMMENT ON POLICY "controle_mensal_update_policy" ON controle_mensal IS 
'Permite atualização para usuários com permissão de edição em controle_disparos ou geracao_books';

COMMENT ON POLICY "controle_mensal_delete_policy" ON controle_mensal IS 
'Permite exclusão para usuários com permissão de edição em controle_disparos ou geracao_books';

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

-- Verificar se as políticas foram criadas corretamente
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'controle_mensal';
  
  IF policy_count = 4 THEN
    RAISE NOTICE '✅ Sucesso: 4 políticas criadas corretamente para controle_mensal';
  ELSE
    RAISE WARNING '⚠️ Atenção: Esperado 4 políticas, encontrado %', policy_count;
  END IF;
END $$;
