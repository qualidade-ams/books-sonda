-- ============================================================================
-- Migration: Adicionar Políticas Authenticated para Taxas
-- Data: 2025-01-14
-- Descrição: Adiciona políticas RLS para usuários authenticated visualizarem
--            e gerenciarem taxas através do sistema de permissões
-- ============================================================================

-- 🎯 OBJETIVO:
-- Permitir que usuários autenticados com permissões adequadas possam:
-- - Visualizar taxas (SELECT)
-- - Criar taxas (INSERT)
-- - Atualizar taxas (UPDATE)
-- - Deletar taxas (DELETE)

-- 🔒 SEGURANÇA:
-- Todas as políticas usam has_screen_permission() para verificar permissões
-- baseadas no sistema de permissões do Books SND

-- ============================================================================
-- PARTE 1: POLÍTICAS PARA taxas_clientes
-- ============================================================================

-- Remover políticas antigas de authenticated (se existirem)
DROP POLICY IF EXISTS "Usuários podem visualizar taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Usuários podem criar taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Usuários podem atualizar taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Usuários podem deletar taxas" ON taxas_clientes;

-- Criar políticas OTIMIZADAS para authenticated
-- ✅ PERFORMANCE: Usa (SELECT auth.uid()) para melhor performance
-- ✅ SEGURANÇA: Verifica permissões através de has_screen_permission()

CREATE POLICY "Usuários podem visualizar taxas" ON taxas_clientes
    FOR SELECT 
    TO authenticated
    USING (
        has_screen_permission('cadastro_taxas_clientes', 'view')
    );

CREATE POLICY "Usuários podem criar taxas" ON taxas_clientes
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        has_screen_permission('cadastro_taxas_clientes', 'create')
    );

CREATE POLICY "Usuários podem atualizar taxas" ON taxas_clientes
    FOR UPDATE 
    TO authenticated
    USING (
        has_screen_permission('cadastro_taxas_clientes', 'edit')
    )
    WITH CHECK (
        has_screen_permission('cadastro_taxas_clientes', 'edit')
    );

CREATE POLICY "Usuários podem deletar taxas" ON taxas_clientes
    FOR DELETE 
    TO authenticated
    USING (
        has_screen_permission('cadastro_taxas_clientes', 'delete')
    );

-- ============================================================================
-- PARTE 2: POLÍTICAS PARA valores_taxas_funcoes
-- ============================================================================

-- Remover políticas antigas de authenticated (se existirem)
DROP POLICY IF EXISTS "Usuários podem visualizar valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Usuários podem criar valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Usuários podem atualizar valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Usuários podem deletar valores" ON valores_taxas_funcoes;

-- Criar políticas OTIMIZADAS para authenticated
-- Valores de taxas seguem as mesmas permissões da tela de taxas

CREATE POLICY "Usuários podem visualizar valores" ON valores_taxas_funcoes
    FOR SELECT 
    TO authenticated
    USING (
        has_screen_permission('cadastro_taxas_clientes', 'view')
    );

CREATE POLICY "Usuários podem criar valores" ON valores_taxas_funcoes
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        has_screen_permission('cadastro_taxas_clientes', 'create')
    );

CREATE POLICY "Usuários podem atualizar valores" ON valores_taxas_funcoes
    FOR UPDATE 
    TO authenticated
    USING (
        has_screen_permission('cadastro_taxas_clientes', 'edit')
    )
    WITH CHECK (
        has_screen_permission('cadastro_taxas_clientes', 'edit')
    );

CREATE POLICY "Usuários podem deletar valores" ON valores_taxas_funcoes
    FOR DELETE 
    TO authenticated
    USING (
        has_screen_permission('cadastro_taxas_clientes', 'delete')
    );

-- ============================================================================
-- PARTE 3: GARANTIR QUE RLS ESTÁ HABILITADO
-- ============================================================================

ALTER TABLE taxas_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE valores_taxas_funcoes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PARTE 4: ADICIONAR COMENTÁRIOS DE DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON POLICY "Usuários podem visualizar taxas" ON taxas_clientes IS 
'Permite que usuários autenticados com permissão de visualização na tela cadastro_taxas_clientes possam ver taxas';

COMMENT ON POLICY "Usuários podem criar taxas" ON taxas_clientes IS 
'Permite que usuários autenticados com permissão de criação na tela cadastro_taxas_clientes possam criar taxas';

COMMENT ON POLICY "Usuários podem atualizar taxas" ON taxas_clientes IS 
'Permite que usuários autenticados com permissão de edição na tela cadastro_taxas_clientes possam atualizar taxas';

COMMENT ON POLICY "Usuários podem deletar taxas" ON taxas_clientes IS 
'Permite que usuários autenticados com permissão de deleção na tela cadastro_taxas_clientes possam deletar taxas';

-- ============================================================================
-- VALIDAÇÃO PÓS-MIGRATION
-- ============================================================================

-- Execute as queries abaixo no Supabase SQL Editor para validar:

-- 1. Verificar políticas da tabela taxas_clientes (DEVE TER 8 POLÍTICAS)
SELECT '📋 POLÍTICAS - taxas_clientes' as titulo;

SELECT 
  policyname as "Nome da Política",
  cmd as "Comando",
  roles::text as "Roles",
  left(qual, 60) || '...' as "USING (resumo)"
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'taxas_clientes'
ORDER BY 
  CASE 
    WHEN roles::text = '{authenticated}' THEN 1
    WHEN roles::text = '{service_role}' THEN 2
    ELSE 3
  END,
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
  END;

-- RESULTADO ESPERADO:
-- - 4 políticas para authenticated (SELECT, INSERT, UPDATE, DELETE) usando has_screen_permission
-- - 4 políticas para service_role (SELECT, INSERT, UPDATE, DELETE) usando USING (true)

-- 2. Verificar se há políticas FOR ALL (DEVE RETORNAR VAZIO)
SELECT '🔍 VERIFICAR POLÍTICAS FOR ALL' as titulo;

SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('taxas_clientes', 'valores_taxas_funcoes')
  AND cmd = 'ALL';

-- 3. Verificar duplicatas (DEVE RETORNAR VAZIO)
SELECT '🔍 VERIFICAR DUPLICATAS' as titulo;

SELECT 
  tablename as "Tabela",
  cmd as "Comando",
  roles::text as "Roles",
  COUNT(*) as "Quantidade",
  CASE 
    WHEN COUNT(*) > 1 THEN '⚠️ DUPLICATA DETECTADA'
    ELSE '✅ OK'
  END as "Status"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('taxas_clientes', 'valores_taxas_funcoes')
  AND permissive = 'PERMISSIVE'
GROUP BY tablename, cmd, roles::text
HAVING COUNT(*) > 1;

-- 4. Resumo final
SELECT '📈 RESUMO FINAL' as titulo;

WITH policy_stats AS (
  SELECT 
    tablename,
    COUNT(*) as total_policies,
    COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_count,
    COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_count,
    COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_count,
    COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_count,
    COUNT(CASE WHEN cmd = 'ALL' THEN 1 END) as all_count
  FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename IN ('taxas_clientes', 'valores_taxas_funcoes')
  GROUP BY tablename
)
SELECT 
  tablename as "Tabela",
  total_policies as "Total",
  select_count as "SELECT",
  insert_count as "INSERT",
  update_count as "UPDATE",
  delete_count as "DELETE",
  all_count as "ALL",
  CASE 
    WHEN total_policies = 8 AND all_count = 0
    THEN '✅ CORRETO'
    WHEN all_count > 0
    THEN '⚠️ Políticas FOR ALL detectadas'
    ELSE '⚠️ Verificar quantidade de políticas'
  END as "Status"
FROM policy_stats
ORDER BY tablename;

-- ============================================================================
-- RESULTADO ESPERADO
-- ============================================================================

-- CADA TABELA DEVE TER 8 POLÍTICAS:
-- - 4 políticas para authenticated (SELECT, INSERT, UPDATE, DELETE)
--   - Usam has_screen_permission('cadastro_taxas_clientes', 'action')
-- - 4 políticas para service_role (SELECT, INSERT, UPDATE, DELETE)
--   - Usam USING (true) com TO service_role

-- ✅ NENHUMA política FOR ALL
-- ✅ NENHUMA duplicata de políticas
-- ✅ RLS habilitado em todas as tabelas
-- ✅ Usuários autenticados podem visualizar taxas se tiverem permissão

-- ============================================================================
-- EXPLICAÇÃO TÉCNICA
-- ============================================================================

-- POR QUE USAR has_screen_permission()?
-- - Sistema de permissões centralizado do Books SND
-- - Verifica se o usuário tem permissão para acessar a tela 'cadastro_taxas_clientes'
-- - Níveis de permissão: 'view', 'create', 'edit', 'delete'
-- - Integrado com sistema de grupos e permissões do banco

-- COMO FUNCIONA has_screen_permission()?
-- 1. Busca o usuário autenticado via (SELECT auth.uid())
-- 2. Verifica os grupos do usuário na tabela user_group_members
-- 3. Verifica as permissões dos grupos na tabela screen_permissions
-- 4. Retorna true se o usuário tem a permissão solicitada

-- PERFORMANCE:
-- - Função has_screen_permission() já usa (SELECT auth.uid()) internamente
-- - Otimizada para performance com índices adequados
-- - Cache de permissões no lado do cliente

