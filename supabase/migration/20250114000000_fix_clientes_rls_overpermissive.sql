-- ============================================================================
-- Migration: Correção de Políticas RLS Permissivas na Tabela clientes
-- Data: 2025-01-14
-- Descrição: Remove políticas RLS inseguras que permitem acesso irrestrito
--            (USING (true) ou WITH CHECK (true)) e garante que apenas as
--            políticas corretas baseadas em permissões estejam ativas.
-- ============================================================================

-- 🚨 PROBLEMA DETECTADO:
-- Políticas com USING (true) ou WITH CHECK (true) permitem acesso irrestrito,
-- efetivamente desabilitando o Row Level Security para operações específicas.
-- Isso é uma vulnerabilidade crítica de segurança.

-- ============================================================================
-- PASSO 1: Remover Políticas Inseguras
-- ============================================================================

-- Remover política de INSERT insegura
DROP POLICY IF EXISTS "clientes_create_access" ON clientes;

-- Remover política de DELETE insegura
DROP POLICY IF EXISTS "clientes_delete_access" ON clientes;

-- Remover política de UPDATE insegura
DROP POLICY IF EXISTS "clientes_update_access" ON clientes;

-- Remover qualquer outra política que possa ter sido criada manualmente
DROP POLICY IF EXISTS "clientes_read_access" ON clientes;
DROP POLICY IF EXISTS "clientes_select_access" ON clientes;

-- ============================================================================
-- PASSO 2: Verificar e Recriar Políticas Corretas (se necessário)
-- ============================================================================

-- As políticas corretas já devem existir da migration client_books_rls_policies.sql
-- Mas vamos garantir que elas existam com DROP IF EXISTS + CREATE

-- Remover políticas antigas (se existirem) para recriar
DROP POLICY IF EXISTS "Usuários podem visualizar clientes se têm permissão" ON clientes;
DROP POLICY IF EXISTS "Usuários podem inserir clientes se têm permissão de edição" ON clientes;
DROP POLICY IF EXISTS "Usuários podem atualizar clientes se têm permissão de edição" ON clientes;
DROP POLICY IF EXISTS "Usuários podem deletar clientes se têm permissão de edição" ON clientes;
DROP POLICY IF EXISTS "Service role tem acesso completo" ON clientes;

-- Recriar políticas corretas com verificação de permissões

-- SELECT: Usuários podem visualizar clientes se têm permissão 'view' ou 'edit'
CREATE POLICY "Usuários podem visualizar clientes se têm permissão" ON clientes
    FOR SELECT USING (has_screen_permission('clientes', 'view'));

-- INSERT: Usuários podem inserir clientes se têm permissão 'edit'
CREATE POLICY "Usuários podem inserir clientes se têm permissão de edição" ON clientes
    FOR INSERT WITH CHECK (has_screen_permission('clientes', 'edit'));

-- UPDATE: Usuários podem atualizar clientes se têm permissão 'edit'
CREATE POLICY "Usuários podem atualizar clientes se têm permissão de edição" ON clientes
    FOR UPDATE USING (has_screen_permission('clientes', 'edit'))
    WITH CHECK (has_screen_permission('clientes', 'edit'));

-- DELETE: Usuários podem deletar clientes se têm permissão 'edit'
CREATE POLICY "Usuários podem deletar clientes se têm permissão de edição" ON clientes
    FOR DELETE USING (has_screen_permission('clientes', 'edit'));

-- NOTA: Políticas para service_role serão criadas na migration 20250114000002
-- para evitar duplicatas e otimizar performance

-- ============================================================================
-- PASSO 3: Garantir que RLS está habilitado
-- ============================================================================

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASSO 4: Verificação de Segurança
-- ============================================================================

-- Comentários para documentação
COMMENT ON TABLE clientes IS 'Tabela de clientes com RLS habilitado. Acesso controlado por permissões de tela via função has_screen_permission().';

-- ============================================================================
-- VALIDAÇÃO PÓS-MIGRATION
-- ============================================================================

-- Execute as queries abaixo no Supabase SQL Editor para validar:

-- 1. Verificar políticas ativas na tabela clientes
-- SELECT 
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd,
--   qual,
--   with_check
-- FROM pg_policies 
-- WHERE schemaname = 'public' AND tablename = 'clientes'
-- ORDER BY policyname;

-- 2. Verificar se RLS está habilitado
-- SELECT 
--   schemaname,
--   tablename,
--   rowsecurity
-- FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename = 'clientes';

-- 3. Verificar se há políticas permissivas (DEVE RETORNAR VAZIO)
-- SELECT 
--   policyname,
--   cmd,
--   CASE 
--     WHEN qual = 'true' THEN '⚠️ VULNERABILIDADE: USING (true)'
--     WHEN with_check = 'true' THEN '⚠️ VULNERABILIDADE: WITH CHECK (true)'
--     ELSE '✅ Seguro'
--   END as security_status
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
--   AND tablename = 'clientes'
--   AND (qual = 'true' OR with_check = 'true');

-- ============================================================================
-- RESULTADO ESPERADO
-- ============================================================================

-- Após executar esta migration, a tabela clientes deve ter 4 políticas para authenticated:
-- 1. "Usuários podem visualizar clientes se têm permissão" (SELECT)
-- 2. "Usuários podem inserir clientes se têm permissão de edição" (INSERT)
-- 3. "Usuários podem atualizar clientes se têm permissão de edição" (UPDATE)
-- 4. "Usuários podem deletar clientes se têm permissão de edição" (DELETE)

-- Políticas para service_role serão adicionadas na migration 20250114000002

-- Todas as políticas devem usar has_screen_permission() para verificação de permissões.
-- NENHUMA política deve usar USING (true) ou WITH CHECK (true).
