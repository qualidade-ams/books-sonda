-- ============================================================================
-- Script de Validação de Segurança - Tabela clientes
-- Execute este script no Supabase SQL Editor APÓS aplicar a migration
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAR POLÍTICAS ATIVAS
-- ============================================================================

SELECT 
  '📋 POLÍTICAS ATIVAS NA TABELA CLIENTES' as titulo;

SELECT 
  policyname as "Nome da Política",
  cmd as "Comando",
  CASE 
    WHEN roles::text LIKE '%authenticated%' THEN 'Usuários Autenticados'
    WHEN roles::text LIKE '%service_role%' THEN 'Service Role'
    ELSE roles::text
  END as "Roles",
  CASE 
    WHEN qual IS NOT NULL THEN 
      CASE 
        WHEN qual = 'true' THEN '⚠️ INSEGURO: true'
        ELSE '✅ ' || left(qual, 50) || '...'
      END
    ELSE 'N/A'
  END as "USING Clause",
  CASE 
    WHEN with_check IS NOT NULL THEN 
      CASE 
        WHEN with_check = 'true' THEN '⚠️ INSEGURO: true'
        ELSE '✅ ' || left(with_check, 50) || '...'
      END
    ELSE 'N/A'
  END as "WITH CHECK Clause"
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'clientes'
ORDER BY 
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    WHEN 'ALL' THEN 5
    ELSE 6
  END,
  policyname;

-- ============================================================================
-- 2. VERIFICAR RLS HABILITADO
-- ============================================================================

SELECT 
  '🔒 STATUS DO ROW LEVEL SECURITY' as titulo;

SELECT 
  tablename as "Tabela",
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS Habilitado'
    ELSE '❌ RLS DESABILITADO - VULNERABILIDADE CRÍTICA'
  END as "Status RLS"
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'clientes';

-- ============================================================================
-- 3. DETECTAR POLÍTICAS PERMISSIVAS (VULNERABILIDADES)
-- ============================================================================

SELECT 
  '🚨 VERIFICAÇÃO DE VULNERABILIDADES' as titulo;

SELECT 
  policyname as "Política Vulnerável",
  cmd as "Comando",
  CASE 
    WHEN qual = 'true' THEN '⚠️ VULNERABILIDADE: USING (true) - Permite acesso irrestrito'
    WHEN with_check = 'true' THEN '⚠️ VULNERABILIDADE: WITH CHECK (true) - Permite inserção/atualização irrestrita'
    ELSE '✅ Seguro'
  END as "Tipo de Vulnerabilidade"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'clientes'
  AND (qual = 'true' OR with_check = 'true');

-- Se a query acima retornar VAZIO, significa que NÃO HÁ VULNERABILIDADES ✅

-- ============================================================================
-- 4. CONTAGEM DE POLÍTICAS
-- ============================================================================

SELECT 
  '📊 ESTATÍSTICAS DE POLÍTICAS' as titulo;

SELECT 
  COUNT(*) as "Total de Políticas",
  COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as "Políticas SELECT",
  COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as "Políticas INSERT",
  COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as "Políticas UPDATE",
  COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as "Políticas DELETE",
  COUNT(CASE WHEN cmd = 'ALL' THEN 1 END) as "Políticas ALL (Service Role)"
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'clientes';

-- RESULTADO ESPERADO:
-- Total: 5 políticas
-- SELECT: 1
-- INSERT: 1
-- UPDATE: 1
-- DELETE: 1
-- ALL: 1

-- ============================================================================
-- 5. VERIFICAR FUNÇÃO has_screen_permission
-- ============================================================================

SELECT 
  '🔧 VERIFICAÇÃO DA FUNÇÃO DE PERMISSÕES' as titulo;

SELECT 
  proname as "Nome da Função",
  CASE 
    WHEN prosecdef = true THEN '✅ SECURITY DEFINER habilitado'
    ELSE '⚠️ SECURITY DEFINER não habilitado'
  END as "Security Definer",
  CASE 
    WHEN proconfig IS NOT NULL AND 'search_path=public' = ANY(proconfig) THEN '✅ search_path fixo (seguro)'
    ELSE '⚠️ search_path não fixo (vulnerabilidade potencial)'
  END as "Search Path"
FROM pg_proc 
WHERE proname = 'has_screen_permission'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================================================
-- 6. TESTE DE PERMISSÕES (OPCIONAL)
-- ============================================================================

-- Descomente as linhas abaixo para testar se a função de permissões está funcionando
-- IMPORTANTE: Execute apenas se você tiver um usuário autenticado

-- SELECT 
--   '🧪 TESTE DE PERMISSÕES' as titulo;

-- SELECT 
--   'clientes' as screen_key,
--   'view' as required_level,
--   has_screen_permission('clientes', 'view') as "Tem Permissão View?",
--   has_screen_permission('clientes', 'edit') as "Tem Permissão Edit?";

-- ============================================================================
-- INTERPRETAÇÃO DOS RESULTADOS
-- ============================================================================

-- ✅ SEGURO:
-- - RLS habilitado na tabela clientes
-- - 5 políticas ativas (1 SELECT, 1 INSERT, 1 UPDATE, 1 DELETE, 1 ALL)
-- - Nenhuma política com USING (true) ou WITH CHECK (true)
-- - Função has_screen_permission com SECURITY DEFINER e search_path fixo
-- - Todas as políticas usam has_screen_permission() ou verificação de service_role

-- ⚠️ VULNERABILIDADES DETECTADAS:
-- - Se houver políticas com USING (true) ou WITH CHECK (true)
-- - Se RLS estiver desabilitado
-- - Se função has_screen_permission não tiver SECURITY DEFINER ou search_path fixo
-- - Se houver mais de 5 políticas (pode indicar políticas duplicadas ou inseguras)

-- ============================================================================
-- AÇÕES CORRETIVAS (se necessário)
-- ============================================================================

-- Se ainda houver vulnerabilidades após executar a migration:
-- 1. Execute novamente a migration: 20250114000000_fix_clientes_rls_overpermissive.sql
-- 2. Verifique se há políticas criadas manualmente no Dashboard do Supabase
-- 3. Remova manualmente políticas inseguras usando:
--    DROP POLICY IF EXISTS "nome_da_politica_insegura" ON clientes;
-- 4. Execute este script de validação novamente

SELECT 
  '✅ VALIDAÇÃO CONCLUÍDA' as resultado;
