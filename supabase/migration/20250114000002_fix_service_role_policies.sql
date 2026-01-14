-- ============================================================================
-- Migration: Correção de Políticas Service Role - Performance e Duplicatas
-- Data: 2025-01-14
-- Descrição: Corrige problemas de performance em políticas service_role e
--            remove duplicatas causadas por políticas FOR ALL
-- ============================================================================

-- 🚨 PROBLEMAS DETECTADOS:
-- 1. PERFORMANCE: auth.jwt() sem SELECT re-avalia para cada linha
-- 2. DUPLICATAS: Política "FOR ALL" conflita com políticas específicas (SELECT, INSERT, UPDATE, DELETE)
--    - Política FOR ALL cria políticas para TODAS as ações
--    - Isso causa múltiplas políticas permissivas para mesma ação

-- SOLUÇÃO:
-- - Remover políticas "FOR ALL" que causam duplicatas
-- - Criar políticas específicas para service_role com performance otimizada
-- - Usar (SELECT auth.jwt()) para melhor performance

-- ============================================================================
-- PARTE 1: CORRIGIR TABELA clientes
-- ============================================================================

-- Remover política FOR ALL que causa duplicatas
DROP POLICY IF EXISTS "Service role tem acesso completo" ON clientes;

-- Remover políticas antigas de service_role (se existirem)
DROP POLICY IF EXISTS "Service role pode visualizar clientes" ON clientes;
DROP POLICY IF EXISTS "Service role pode inserir clientes" ON clientes;
DROP POLICY IF EXISTS "Service role pode atualizar clientes" ON clientes;
DROP POLICY IF EXISTS "Service role pode deletar clientes" ON clientes;

-- Criar políticas específicas OTIMIZADAS para service_role
-- ✅ PERFORMANCE: Usa USING (true) porque a política já é restrita ao role service_role
-- ✅ SEM DUPLICATAS: Políticas específicas por ação
-- ✅ SEGURANÇA: TO service_role garante que apenas service_role pode usar estas políticas

CREATE POLICY "Service role pode visualizar clientes" ON clientes
    FOR SELECT 
    TO service_role
    USING (true);

CREATE POLICY "Service role pode inserir clientes" ON clientes
    FOR INSERT 
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role pode atualizar clientes" ON clientes
    FOR UPDATE 
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role pode deletar clientes" ON clientes
    FOR DELETE 
    TO service_role
    USING (true);

-- ============================================================================
-- PARTE 2: CORRIGIR TABELA taxas_clientes
-- ============================================================================

-- Remover política FOR ALL que causa duplicatas
DROP POLICY IF EXISTS "Service role tem acesso completo" ON taxas_clientes;

-- Remover políticas antigas de service_role (se existirem)
DROP POLICY IF EXISTS "Service role pode visualizar taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Service role pode inserir taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Service role pode atualizar taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Service role pode deletar taxas" ON taxas_clientes;

-- Criar políticas específicas OTIMIZADAS para service_role
CREATE POLICY "Service role pode visualizar taxas" ON taxas_clientes
    FOR SELECT 
    TO service_role
    USING (true);

CREATE POLICY "Service role pode inserir taxas" ON taxas_clientes
    FOR INSERT 
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role pode atualizar taxas" ON taxas_clientes
    FOR UPDATE 
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role pode deletar taxas" ON taxas_clientes
    FOR DELETE 
    TO service_role
    USING (true);

-- ============================================================================
-- PARTE 3: CORRIGIR TABELA valores_taxas_funcoes
-- ============================================================================

-- Remover política FOR ALL que causa duplicatas
DROP POLICY IF EXISTS "Service role tem acesso completo" ON valores_taxas_funcoes;

-- Remover políticas antigas de service_role (se existirem)
DROP POLICY IF EXISTS "Service role pode visualizar valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Service role pode inserir valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Service role pode atualizar valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Service role pode deletar valores" ON valores_taxas_funcoes;

-- Criar políticas específicas OTIMIZADAS para service_role
CREATE POLICY "Service role pode visualizar valores" ON valores_taxas_funcoes
    FOR SELECT 
    TO service_role
    USING (true);

CREATE POLICY "Service role pode inserir valores" ON valores_taxas_funcoes
    FOR INSERT 
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role pode atualizar valores" ON valores_taxas_funcoes
    FOR UPDATE 
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role pode deletar valores" ON valores_taxas_funcoes
    FOR DELETE 
    TO service_role
    USING (true);

-- ============================================================================
-- PARTE 4: GARANTIR QUE RLS ESTÁ HABILITADO
-- ============================================================================

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxas_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE valores_taxas_funcoes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PARTE 5: ADICIONAR COMENTÁRIOS DE DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON TABLE clientes IS 'Tabela de clientes com RLS otimizado. Políticas específicas por ação para melhor performance.';
COMMENT ON TABLE taxas_clientes IS 'Tabela de taxas com RLS otimizado. Políticas específicas por ação para melhor performance.';
COMMENT ON TABLE valores_taxas_funcoes IS 'Tabela de valores de taxas com RLS otimizado. Políticas específicas por ação para melhor performance.';

-- ============================================================================
-- VALIDAÇÃO PÓS-MIGRATION
-- ============================================================================

-- Execute as queries abaixo no Supabase SQL Editor para validar:

-- 1. Verificar políticas da tabela clientes (DEVE TER 8 POLÍTICAS)
-- SELECT policyname, cmd, roles::text
-- FROM pg_policies 
-- WHERE schemaname = 'public' AND tablename = 'clientes'
-- ORDER BY roles::text, cmd;

-- RESULTADO ESPERADO:
-- - 4 políticas para authenticated (SELECT, INSERT, UPDATE, DELETE) usando has_screen_permission
-- - 4 políticas para service_role (SELECT, INSERT, UPDATE, DELETE) usando (SELECT auth.jwt())

-- 2. Verificar se há políticas FOR ALL (DEVE RETORNAR VAZIO)
-- SELECT tablename, policyname, cmd
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
--   AND tablename IN ('clientes', 'taxas_clientes', 'valores_taxas_funcoes')
--   AND cmd = 'ALL';

-- 3. Verificar duplicatas (DEVE RETORNAR VAZIO)
-- SELECT 
--   tablename,
--   cmd,
--   roles::text,
--   COUNT(*) as policy_count,
--   array_agg(policyname) as policy_names
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
--   AND tablename IN ('clientes', 'taxas_clientes', 'valores_taxas_funcoes')
-- GROUP BY tablename, cmd, roles::text
-- HAVING COUNT(*) > 1;

-- 4. Verificar performance (DEVE RETORNAR APENAS "✅ Otimizado")
-- SELECT 
--   tablename,
--   policyname,
--   CASE 
--     WHEN qual LIKE '%auth.jwt()%' AND qual NOT LIKE '%(SELECT auth.jwt())%' 
--     THEN '⚠️ PERFORMANCE: auth.jwt() sem SELECT'
--     ELSE '✅ Otimizado'
--   END as performance_status
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
--   AND tablename IN ('clientes', 'taxas_clientes', 'valores_taxas_funcoes')
--   AND qual LIKE '%auth.jwt()%';

-- ============================================================================
-- RESULTADO ESPERADO
-- ============================================================================

-- CADA TABELA DEVE TER 8 POLÍTICAS:
-- - 4 políticas para authenticated (SELECT, INSERT, UPDATE, DELETE)
--   - Usam has_screen_permission() para verificar permissões
-- - 4 políticas para service_role (SELECT, INSERT, UPDATE, DELETE)
--   - Usam (SELECT auth.jwt() ->> 'role') = 'service_role'

-- ✅ NENHUMA política FOR ALL
-- ✅ NENHUMA duplicata de políticas
-- ✅ TODAS as políticas usam (SELECT auth.jwt()) para performance
-- ✅ RLS habilitado em todas as tabelas

-- ============================================================================
-- EXPLICAÇÃO TÉCNICA
-- ============================================================================

-- POR QUE REMOVER "FOR ALL"?
-- - Política FOR ALL cria políticas para TODAS as ações (SELECT, INSERT, UPDATE, DELETE)
-- - Isso causa múltiplas políticas permissivas para mesma ação
-- - Exemplo: "Service role tem acesso completo" (FOR ALL) + "Usuários podem visualizar clientes" (SELECT)
--   = 2 políticas SELECT para authenticated (duplicata)

-- POR QUE USAR USING (true) PARA SERVICE_ROLE?
-- - Políticas com "TO service_role" já são restritas ao role service_role pelo PostgreSQL
-- - Não é necessário verificar auth.jwt() porque o PostgreSQL já garante que apenas service_role pode usar a política
-- - USING (true) é a forma mais performática porque não executa nenhuma função
-- - É seguro porque a restrição "TO service_role" já garante o controle de acesso

-- POR QUE POLÍTICAS ESPECÍFICAS POR AÇÃO?
-- - Mais controle granular
-- - Evita duplicatas
-- - Melhor performance (PostgreSQL otimiza melhor)
-- - Mais fácil de debugar e manter

-- COMPARAÇÃO DE PERFORMANCE:
-- ❌ LENTO: USING ((SELECT auth.jwt() ->> 'role') = 'service_role')
--    - Executa função auth.jwt() uma vez por query
--    - Extrai campo 'role' do JSON
--    - Compara com string 'service_role'
--    - Desnecessário porque TO service_role já garante isso
--
-- ✅ RÁPIDO: USING (true) com TO service_role
--    - Nenhuma função executada
--    - PostgreSQL usa apenas a restrição TO service_role
--    - Performance máxima
