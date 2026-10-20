-- ============================================================================
-- CORREÇÃO SIMPLIFICADA DAS POLÍTICAS RLS DA TABELA ELOGIOS
-- ============================================================================
-- Data: 2026-01-19
-- Descrição: Versão simplificada que permite acesso a todos os usuários
--            autenticados (use temporariamente se houver urgência)
-- ============================================================================

-- 1. REMOVER TODAS AS POLÍTICAS ANTIGAS
-- ============================================================================
DROP POLICY IF EXISTS "Permitir leitura de elogios para usuários autenticados" ON elogios;
DROP POLICY IF EXISTS "Permitir inserção de elogios para usuários autenticados" ON elogios;
DROP POLICY IF EXISTS "Permitir atualização de elogios para usuários autenticados" ON elogios;
DROP POLICY IF EXISTS "Permitir exclusão de elogios para usuários autenticados" ON elogios;
DROP POLICY IF EXISTS "Usuários podem ver elogios com permissão" ON elogios;
DROP POLICY IF EXISTS "Usuários podem inserir elogios com permissão" ON elogios;
DROP POLICY IF EXISTS "Usuários podem atualizar elogios com permissão" ON elogios;
DROP POLICY IF EXISTS "Usuários podem excluir elogios com permissão" ON elogios;
DROP POLICY IF EXISTS "elogios_select_policy" ON elogios;
DROP POLICY IF EXISTS "elogios_insert_policy" ON elogios;
DROP POLICY IF EXISTS "elogios_update_policy" ON elogios;
DROP POLICY IF EXISTS "elogios_delete_policy" ON elogios;

-- 2. GARANTIR QUE RLS ESTÁ HABILITADO
-- ============================================================================
ALTER TABLE elogios ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR POLÍTICAS SIMPLIFICADAS (TODOS OS USUÁRIOS AUTENTICADOS)
-- ============================================================================

-- Política de SELECT - Todos os usuários autenticados podem ler
CREATE POLICY "elogios_authenticated_select" ON elogios
    FOR SELECT 
    TO authenticated 
    USING (true);

-- Política de INSERT - Todos os usuários autenticados podem criar
CREATE POLICY "elogios_authenticated_insert" ON elogios
    FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

-- Política de UPDATE - Todos os usuários autenticados podem atualizar
CREATE POLICY "elogios_authenticated_update" ON elogios
    FOR UPDATE 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- Política de DELETE - Todos os usuários autenticados podem excluir
CREATE POLICY "elogios_authenticated_delete" ON elogios
    FOR DELETE 
    TO authenticated 
    USING (true);

-- 4. VERIFICAR POLÍTICAS CRIADAS
-- ============================================================================
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'elogios'
ORDER BY policyname;

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
-- ⚠️ ATENÇÃO: Esta é uma configuração PERMISSIVA que permite que TODOS os
--    usuários autenticados tenham acesso total à tabela elogios.
--
-- 📝 RECOMENDAÇÃO: Use esta migration apenas temporariamente para resolver
--    o problema imediato. Depois, aplique a migration completa
--    (fix_elogios_rls_policies.sql) que implementa controle de acesso
--    baseado em permissões de tela.
--
-- 🔒 SEGURANÇA: Para produção, sempre use políticas RLS baseadas em
--    permissões específicas de usuário/grupo.
-- ============================================================================

COMMENT ON TABLE elogios IS 'Tabela de elogios com políticas RLS simplificadas (temporário) - 2026-01-19';
