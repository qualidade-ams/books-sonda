-- ============================================================================
-- Migration: Corrigir Políticas Duplicadas - Taxas
-- Data: 2025-01-14
-- Descrição: Remove TODAS as políticas existentes e recria apenas as corretas
--            para resolver problema de 12 políticas (deveria ser 8)
-- ============================================================================

-- 🚨 PROBLEMA DETECTADO:
-- - taxas_clientes: 12 políticas (3 SELECT, 3 INSERT, 3 UPDATE, 3 DELETE)
-- - valores_taxas_funcoes: 12 políticas (3 SELECT, 3 INSERT, 3 UPDATE, 3 DELETE)
-- - ESPERADO: 8 políticas (2 SELECT, 2 INSERT, 2 UPDATE, 2 DELETE)
--   - 4 para authenticated (SELECT, INSERT, UPDATE, DELETE)
--   - 4 para service_role (SELECT, INSERT, UPDATE, DELETE)

-- SOLUÇÃO:
-- 1. Remover TODAS as políticas existentes
-- 2. Recriar apenas as políticas corretas
-- 3. Validar que temos exatamente 8 políticas por tabela

-- ============================================================================
-- PARTE 1: LIMPAR TODAS AS POLÍTICAS DE taxas_clientes
-- ============================================================================

SELECT '🧹 LIMPANDO POLÍTICAS - taxas_clientes' as titulo;

-- Listar políticas antes da limpeza
SELECT 
  policyname as "Política (ANTES)",
  cmd as "Comando",
  roles::text as "Roles"
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'taxas_clientes'
ORDER BY roles::text, cmd;

-- Remover TODAS as políticas existentes
DROP POLICY IF EXISTS "Usuários podem visualizar taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Usuários podem criar taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Usuários podem atualizar taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Usuários podem deletar taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Service role pode visualizar taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Service role pode inserir taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Service role pode atualizar taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Service role pode deletar taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Service role tem acesso completo" ON taxas_clientes;

-- Remover qualquer outra política que possa existir (força bruta)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'taxas_clientes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON taxas_clientes', pol.policyname);
    RAISE NOTICE 'Removida política: %', pol.policyname;
  END LOOP;
END $$;

-- ============================================================================
-- PARTE 2: LIMPAR TODAS AS POLÍTICAS DE valores_taxas_funcoes
-- ============================================================================

SELECT '🧹 LIMPANDO POLÍTICAS - valores_taxas_funcoes' as titulo;

-- Listar políticas antes da limpeza
SELECT 
  policyname as "Política (ANTES)",
  cmd as "Comando",
  roles::text as "Roles"
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'valores_taxas_funcoes'
ORDER BY roles::text, cmd;

-- Remover TODAS as políticas existentes
DROP POLICY IF EXISTS "Usuários podem visualizar valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Usuários podem criar valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Usuários podem atualizar valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Usuários podem deletar valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Service role pode visualizar valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Service role pode inserir valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Service role pode atualizar valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Service role pode deletar valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Service role tem acesso completo" ON valores_taxas_funcoes;

-- Remover qualquer outra política que possa existir (força bruta)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'valores_taxas_funcoes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON valores_taxas_funcoes', pol.policyname);
    RAISE NOTICE 'Removida política: %', pol.policyname;
  END LOOP;
END $$;

-- ============================================================================
-- PARTE 3: RECRIAR POLÍTICAS CORRETAS - taxas_clientes
-- ============================================================================

SELECT '✨ RECRIANDO POLÍTICAS - taxas_clientes' as titulo;

-- Políticas para AUTHENTICATED (4 políticas)
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

-- Políticas para SERVICE_ROLE (4 políticas)
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
-- PARTE 4: RECRIAR POLÍTICAS CORRETAS - valores_taxas_funcoes
-- ============================================================================

SELECT '✨ RECRIANDO POLÍTICAS - valores_taxas_funcoes' as titulo;

-- Políticas para AUTHENTICATED (4 políticas)
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

-- Políticas para SERVICE_ROLE (4 políticas)
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
-- PARTE 5: GARANTIR QUE RLS ESTÁ HABILITADO
-- ============================================================================

ALTER TABLE taxas_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE valores_taxas_funcoes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PARTE 6: VALIDAÇÃO IMEDIATA
-- ============================================================================

SELECT '📊 VALIDAÇÃO - taxas_clientes' as titulo;

SELECT 
  policyname as "Política (DEPOIS)",
  cmd as "Comando",
  roles::text as "Roles"
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

SELECT '📊 VALIDAÇÃO - valores_taxas_funcoes' as titulo;

SELECT 
  policyname as "Política (DEPOIS)",
  cmd as "Comando",
  roles::text as "Roles"
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'valores_taxas_funcoes'
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

-- Resumo final
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
    WHEN total_policies = 8 AND select_count = 2 AND insert_count = 2 AND update_count = 2 AND delete_count = 2 AND all_count = 0
    THEN '✅ CORRETO'
    WHEN total_policies > 8
    THEN '⚠️ Ainda há políticas duplicadas'
    WHEN total_policies < 8
    THEN '⚠️ Faltam políticas'
    ELSE '⚠️ Verificar configuração'
  END as "Status"
FROM policy_stats
ORDER BY tablename;

-- ============================================================================
-- RESULTADO ESPERADO
-- ============================================================================

-- CADA TABELA DEVE TER EXATAMENTE 8 POLÍTICAS:
-- - 4 políticas para authenticated (SELECT, INSERT, UPDATE, DELETE)
-- - 4 políticas para service_role (SELECT, INSERT, UPDATE, DELETE)

-- ✅ Total: 8 políticas
-- ✅ SELECT: 2 políticas (1 authenticated + 1 service_role)
-- ✅ INSERT: 2 políticas (1 authenticated + 1 service_role)
-- ✅ UPDATE: 2 políticas (1 authenticated + 1 service_role)
-- ✅ DELETE: 2 políticas (1 authenticated + 1 service_role)
-- ✅ ALL: 0 políticas

-- ============================================================================
-- COMENTÁRIOS FINAIS
-- ============================================================================

COMMENT ON TABLE taxas_clientes IS 
'Tabela de taxas de clientes com RLS otimizado. 8 políticas: 4 authenticated + 4 service_role.';

COMMENT ON TABLE valores_taxas_funcoes IS 
'Tabela de valores de taxas com RLS otimizado. 8 políticas: 4 authenticated + 4 service_role.';

-- ============================================================================
-- TESTE FINAL
-- ============================================================================

-- Execute esta query para confirmar que tudo está correto:
-- SELECT 
--   tablename,
--   COUNT(*) as total,
--   array_agg(DISTINCT cmd ORDER BY cmd) as comandos,
--   array_agg(DISTINCT roles::text ORDER BY roles::text) as roles
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
--   AND tablename IN ('taxas_clientes', 'valores_taxas_funcoes')
-- GROUP BY tablename;

-- RESULTADO ESPERADO:
-- taxas_clientes | 8 | {DELETE,INSERT,SELECT,UPDATE} | {{authenticated},{service_role}}
-- valores_taxas_funcoes | 8 | {DELETE,INSERT,SELECT,UPDATE} | {{authenticated},{service_role}}

