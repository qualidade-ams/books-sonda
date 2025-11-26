-- =====================================================
-- CORRIGIR LIMITE DE 1000 REGISTROS - PESQUISAS
-- =====================================================
-- Este script remove qualquer limitação de RLS que possa
-- estar impedindo o carregamento de todos os registros
-- =====================================================

-- 1. Verificar se RLS está habilitado
SELECT 
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables 
WHERE tablename = 'pesquisas_satisfacao';

-- 2. Listar políticas RLS ativas
SELECT 
  policyname,
  roles::text as roles,
  cmd as comando,
  permissive as permissivo,
  qual as expressao_using,
  with_check as expressao_check
FROM pg_policies
WHERE tablename = 'pesquisas_satisfacao'
ORDER BY policyname;

-- 3. Contar registros diretamente (sem RLS)
SELECT COUNT(*) as total_real FROM pesquisas_satisfacao;

-- 4. Contar registros com RLS (como usuário autenticado)
-- Execute isso logado na aplicação para comparar

-- =====================================================
-- SOLUÇÃO: Remover políticas limitantes
-- =====================================================

-- Opção 1: Desabilitar RLS temporariamente (NÃO RECOMENDADO EM PRODUÇÃO)
-- ALTER TABLE pesquisas_satisfacao DISABLE ROW LEVEL SECURITY;

-- Opção 2: Criar política permissiva para SELECT (RECOMENDADO)
-- Remove políticas antigas de SELECT se existirem
DROP POLICY IF EXISTS "Permitir leitura de pesquisas" ON pesquisas_satisfacao;
DROP POLICY IF EXISTS "Usuários podem ler pesquisas" ON pesquisas_satisfacao;
DROP POLICY IF EXISTS "select_pesquisas_satisfacao" ON pesquisas_satisfacao;

-- Criar nova política permissiva para SELECT
CREATE POLICY "Permitir leitura completa de pesquisas"
ON pesquisas_satisfacao
FOR SELECT
TO authenticated
USING (true); -- Permite ler TODOS os registros sem limite

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar políticas após correção
SELECT 
  policyname,
  cmd as comando,
  qual as expressao
FROM pg_policies
WHERE tablename = 'pesquisas_satisfacao'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- Contar registros novamente
SELECT COUNT(*) as total_apos_correcao FROM pesquisas_satisfacao;

-- Verificar últimos registros
SELECT 
  id,
  empresa,
  cliente,
  origem,
  created_at
FROM pesquisas_satisfacao
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- LOG DE EXECUÇÃO
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Políticas RLS corrigidas para pesquisas_satisfacao';
  RAISE NOTICE '✅ Agora todos os registros podem ser lidos sem limite';
  RAISE NOTICE '📊 Total de registros: %', (SELECT COUNT(*) FROM pesquisas_satisfacao);
END $$;
