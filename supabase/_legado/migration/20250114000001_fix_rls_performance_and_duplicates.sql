-- ============================================================================
-- Migration: Correção de Performance RLS e Políticas Duplicadas
-- Data: 2025-01-14
-- Descrição: Corrige problemas de performance em políticas RLS que re-avaliam
--            auth.uid() para cada linha e remove políticas duplicadas.
-- ============================================================================

-- 🚨 PROBLEMAS DETECTADOS:
-- 1. PERFORMANCE: Políticas que usam auth.uid() sem SELECT re-avaliam para cada linha
-- 2. DUPLICATAS: Múltiplas políticas permissivas para mesma ação causam conflitos
-- 3. INCONSISTÊNCIA: Políticas antigas coexistindo com políticas novas

-- ============================================================================
-- PARTE 1: CORRIGIR PERFORMANCE - TABELA taxas_clientes
-- ============================================================================

-- Remover política antiga com problema de performance
DROP POLICY IF EXISTS "taxas_clientes_authenticated_users" ON taxas_clientes;

-- Remover outras políticas antigas que possam existir
DROP POLICY IF EXISTS "Permitir leitura de taxas para usuários autenticados" ON taxas_clientes;
DROP POLICY IF EXISTS "Permitir inserção de taxas para usuários autenticados" ON taxas_clientes;
DROP POLICY IF EXISTS "Permitir atualização de taxas para usuários autenticados" ON taxas_clientes;
DROP POLICY IF EXISTS "Permitir exclusão de taxas para usuários autenticados" ON taxas_clientes;

-- Remover políticas corretas para recriar (garantir consistência)
DROP POLICY IF EXISTS "Usuários podem ver taxas com permissão" ON taxas_clientes;
DROP POLICY IF EXISTS "Usuários podem inserir taxas com permissão" ON taxas_clientes;
DROP POLICY IF EXISTS "Usuários podem atualizar taxas com permissão" ON taxas_clientes;
DROP POLICY IF EXISTS "Usuários podem excluir taxas com permissão" ON taxas_clientes;
DROP POLICY IF EXISTS "Service role tem acesso completo" ON taxas_clientes;

-- Recriar políticas OTIMIZADAS com has_screen_permission()
-- ✅ PERFORMANCE: has_screen_permission() já usa (SELECT auth.uid()) internamente

CREATE POLICY "Usuários podem ver taxas com permissão" ON taxas_clientes
    FOR SELECT USING (has_screen_permission('taxas', 'view'));

CREATE POLICY "Usuários podem inserir taxas com permissão" ON taxas_clientes
    FOR INSERT WITH CHECK (has_screen_permission('taxas', 'create'));

CREATE POLICY "Usuários podem atualizar taxas com permissão" ON taxas_clientes
    FOR UPDATE USING (has_screen_permission('taxas', 'edit'))
    WITH CHECK (has_screen_permission('taxas', 'edit'));

CREATE POLICY "Usuários podem excluir taxas com permissão" ON taxas_clientes
    FOR DELETE USING (has_screen_permission('taxas', 'delete'));

-- NOTA: Políticas para service_role serão criadas na migration 20250114000002
-- para evitar duplicatas e otimizar performance

-- ============================================================================
-- PARTE 2: CORRIGIR PERFORMANCE - TABELA valores_taxas_funcoes
-- ============================================================================

-- Remover política antiga com problema de performance
DROP POLICY IF EXISTS "valores_taxas_funcoes_authenticated_users" ON valores_taxas_funcoes;

-- Remover outras políticas antigas que possam existir
DROP POLICY IF EXISTS "Permitir leitura de valores para usuários autenticados" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Permitir inserção de valores para usuários autenticados" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Permitir atualização de valores para usuários autenticados" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Permitir exclusão de valores para usuários autenticados" ON valores_taxas_funcoes;

-- Remover políticas corretas para recriar (garantir consistência)
DROP POLICY IF EXISTS "Usuários podem ver valores de taxas com permissão" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Usuários podem inserir valores de taxas com permissão" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Usuários podem atualizar valores de taxas com permissão" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Usuários podem excluir valores de taxas com permissão" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Service role tem acesso completo" ON valores_taxas_funcoes;

-- Recriar políticas OTIMIZADAS
CREATE POLICY "Usuários podem ver valores de taxas com permissão" ON valores_taxas_funcoes
    FOR SELECT USING (has_screen_permission('taxas', 'view'));

CREATE POLICY "Usuários podem inserir valores de taxas com permissão" ON valores_taxas_funcoes
    FOR INSERT WITH CHECK (has_screen_permission('taxas', 'create'));

CREATE POLICY "Usuários podem atualizar valores de taxas com permissão" ON valores_taxas_funcoes
    FOR UPDATE USING (has_screen_permission('taxas', 'edit'))
    WITH CHECK (has_screen_permission('taxas', 'edit'));

CREATE POLICY "Usuários podem excluir valores de taxas com permissão" ON valores_taxas_funcoes
    FOR DELETE USING (has_screen_permission('taxas', 'delete'));

-- NOTA: Políticas para service_role serão criadas na migration 20250114000002
-- para evitar duplicatas e otimizar performance

-- ============================================================================
-- PARTE 3: CORRIGIR PERFORMANCE E DUPLICATAS - TABELA profiles
-- ============================================================================

-- 🚨 PROBLEMA: Múltiplas políticas permissivas para mesma ação
-- - SELECT: "Usuários podem ver próprio perfil" + "authenticated_users_can_read_all_profiles"
-- - UPDATE: "profiles_update" + "users_can_update_own_profile"

-- Remover TODAS as políticas antigas para começar do zero
DROP POLICY IF EXISTS "Usuários podem ver próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Usuários podem ver todos os perfis" ON profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON profiles;
DROP POLICY IF EXISTS "authenticated_users_can_read_all_profiles" ON profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can update profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can read profiles" ON profiles;
DROP POLICY IF EXISTS "service_role_can_insert_profiles" ON profiles;
DROP POLICY IF EXISTS "service_role_full_access" ON profiles;
DROP POLICY IF EXISTS "Administradores podem criar perfis" ON profiles;
DROP POLICY IF EXISTS "Administradores podem atualizar perfis" ON profiles;
DROP POLICY IF EXISTS "Administradores podem deletar perfis" ON profiles;

-- Recriar políticas OTIMIZADAS e SEM DUPLICATAS

-- Garantir que as políticas não existem antes de criar
DROP POLICY IF EXISTS "Usuários autenticados podem ver todos os perfis" ON profiles;
DROP POLICY IF EXISTS "Service role pode inserir perfis" ON profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Service role pode deletar perfis" ON profiles;
DROP POLICY IF EXISTS "Service role acesso completo" ON profiles;

-- SELECT: Usuários autenticados podem ver TODOS os perfis
-- ✅ PERFORMANCE: Usa (SELECT auth.role()) que é avaliado uma vez por query
-- Necessário para exibir nomes de autores de requerimentos e outros contextos
CREATE POLICY "Usuários autenticados podem ver todos os perfis" ON profiles
    FOR SELECT 
    TO authenticated
    USING ((SELECT auth.role()) = 'authenticated');

-- INSERT: Apenas service_role pode inserir (via trigger de criação de usuário)
CREATE POLICY "Service role pode inserir perfis" ON profiles
    FOR INSERT 
    TO service_role
    WITH CHECK (true);

-- UPDATE: Usuários podem atualizar APENAS seu próprio perfil
-- ✅ PERFORMANCE: Usa (SELECT auth.uid()) que é avaliado uma vez por query
CREATE POLICY "Usuários podem atualizar próprio perfil" ON profiles
    FOR UPDATE 
    TO authenticated
    USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);

-- DELETE: Apenas service_role pode deletar (operações administrativas)
CREATE POLICY "Service role pode deletar perfis" ON profiles
    FOR DELETE 
    TO service_role
    USING (true);

-- ALL: Service role tem acesso completo para operações de backup/admin
CREATE POLICY "Service role acesso completo" ON profiles
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- PARTE 4: GARANTIR QUE RLS ESTÁ HABILITADO
-- ============================================================================

ALTER TABLE taxas_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE valores_taxas_funcoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PARTE 5: ADICIONAR COMENTÁRIOS DE DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON TABLE taxas_clientes IS 'Tabela de taxas de clientes com RLS otimizado. Acesso controlado por permissões de tela.';
COMMENT ON TABLE valores_taxas_funcoes IS 'Tabela de valores de taxas por função com RLS otimizado. Acesso controlado por permissões de tela.';
COMMENT ON TABLE profiles IS 'Tabela de perfis de usuários com RLS otimizado. Usuários autenticados podem ver todos os perfis mas só podem editar o próprio.';

-- ============================================================================
-- VALIDAÇÃO PÓS-MIGRATION
-- ============================================================================

-- Execute as queries abaixo no Supabase SQL Editor para validar:

-- 1. Verificar políticas da tabela taxas_clientes
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE schemaname = 'public' AND tablename = 'taxas_clientes'
-- ORDER BY cmd, policyname;

-- 2. Verificar políticas da tabela valores_taxas_funcoes
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE schemaname = 'public' AND tablename = 'valores_taxas_funcoes'
-- ORDER BY cmd, policyname;

-- 3. Verificar políticas da tabela profiles (NÃO DEVE HAVER DUPLICATAS)
-- SELECT policyname, cmd, roles::text, qual, with_check
-- FROM pg_policies 
-- WHERE schemaname = 'public' AND tablename = 'profiles'
-- ORDER BY cmd, policyname;

-- 4. Verificar se há políticas com performance ruim (DEVE RETORNAR VAZIO)
-- SELECT 
--   tablename,
--   policyname,
--   cmd,
--   CASE 
--     WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%' 
--     THEN '⚠️ PERFORMANCE: auth.uid() sem SELECT'
--     WHEN qual LIKE '%current_setting%' AND qual NOT LIKE '%(SELECT current_setting%'
--     THEN '⚠️ PERFORMANCE: current_setting() sem SELECT'
--     ELSE '✅ Otimizado'
--   END as performance_status
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
--   AND tablename IN ('taxas_clientes', 'valores_taxas_funcoes', 'profiles')
--   AND (
--     (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%') OR
--     (qual LIKE '%current_setting%' AND qual NOT LIKE '%(SELECT current_setting%')
--   );

-- 5. Verificar duplicatas de políticas (DEVE RETORNAR VAZIO)
-- SELECT 
--   tablename,
--   cmd,
--   roles::text,
--   COUNT(*) as policy_count,
--   array_agg(policyname) as policy_names
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
--   AND tablename IN ('taxas_clientes', 'valores_taxas_funcoes', 'profiles')
-- GROUP BY tablename, cmd, roles::text
-- HAVING COUNT(*) > 1;

-- ============================================================================
-- RESULTADO ESPERADO
-- ============================================================================

-- TABELA taxas_clientes: 4 políticas para authenticated
-- - SELECT: 1 política (has_screen_permission)
-- - INSERT: 1 política (has_screen_permission)
-- - UPDATE: 1 política (has_screen_permission)
-- - DELETE: 1 política (has_screen_permission)

-- TABELA valores_taxas_funcoes: 4 políticas para authenticated
-- - SELECT: 1 política (has_screen_permission)
-- - INSERT: 1 política (has_screen_permission)
-- - UPDATE: 1 política (has_screen_permission)
-- - DELETE: 1 política (has_screen_permission)

-- TABELA profiles: 5 políticas (SEM DUPLICATAS)
-- - SELECT: 1 política (authenticated users can read all)
-- - INSERT: 1 política (service_role only)
-- - UPDATE: 1 política (users can update own profile)
-- - DELETE: 1 política (service_role only)
-- - ALL: 1 política (service_role full access)

-- Políticas para service_role das tabelas taxas_clientes e valores_taxas_funcoes
-- serão adicionadas na migration 20250114000002

-- ✅ TODAS as políticas devem usar (SELECT auth.uid()) ou (SELECT auth.role())
-- ✅ NENHUMA política deve usar auth.uid() ou current_setting() diretamente
-- ✅ NENHUMA duplicata de políticas para mesma ação
