-- Script de diagnóstico para erro 406 no banco de horas

-- 1. Verificar se a tabela banco_horas_calculos existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'banco_horas_calculos'
) as tabela_existe;

-- 2. Verificar RLS na tabela banco_horas_calculos
SELECT 
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'banco_horas_calculos';

-- 3. Listar todas as políticas RLS da tabela
SELECT 
  policyname as nome_politica,
  cmd as comando,
  qual as condicao,
  with_check as verificacao
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'banco_horas_calculos'
ORDER BY cmd, policyname;

-- 4. Verificar se há cálculos na tabela
SELECT 
  COUNT(*) as total_calculos,
  COUNT(DISTINCT empresa_id) as total_empresas,
  MIN(created_at) as primeiro_calculo,
  MAX(created_at) as ultimo_calculo
FROM banco_horas_calculos;

-- 5. Verificar cálculos da empresa específica (CHIESI)
SELECT 
  id,
  empresa_id,
  mes,
  ano,
  baseline_tickets,
  baseline_horas,
  saldo_tickets,
  saldo_horas,
  created_at,
  updated_at
FROM banco_horas_calculos
WHERE empresa_id = 'd9095402-359a-42d7-915c-c0212f1dba7d' -- CHIESI
ORDER BY ano DESC, mes DESC
LIMIT 10;

-- 6. Verificar se o usuário atual tem permissão
SELECT 
  current_user as usuario_atual,
  current_setting('request.jwt.claims', true)::json->>'role' as role_jwt;

-- 7. Testar query que está falhando (simular o que o frontend faz)
SELECT *
FROM banco_horas_calculos
WHERE empresa_id = 'd9095402-359a-42d7-915c-c0212f1dba7d'
  AND mes = 1
  AND ano = 2026;

-- 8. Verificar se há políticas RLS muito restritivas
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual IS NULL THEN '⚠️ Política sem condição (pode bloquear tudo)'
    WHEN qual LIKE '%auth.uid()%' THEN '✅ Usa autenticação'
    WHEN qual LIKE '%true%' THEN '✅ Permite todos'
    ELSE '⚠️ Condição customizada: ' || qual
  END as analise
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'banco_horas_calculos';

-- 9. Verificar constraint única que pode estar causando conflito
SELECT
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'banco_horas_calculos'::regclass
  AND contype IN ('u', 'p'); -- unique e primary key

-- 10. SOLUÇÃO TEMPORÁRIA: Desabilitar RLS (APENAS PARA TESTE)
-- DESCOMENTE APENAS SE QUISER TESTAR SEM RLS
-- ALTER TABLE banco_horas_calculos DISABLE ROW LEVEL SECURITY;

-- 11. SOLUÇÃO: Criar política permissiva para authenticated users
-- DESCOMENTE PARA APLICAR
/*
-- Remover políticas duplicadas ou problemáticas
DROP POLICY IF EXISTS "Users can view own banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can insert own banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can update own banco_horas_calculos" ON banco_horas_calculos;

-- Criar políticas permissivas para authenticated users
CREATE POLICY "Authenticated users can view banco_horas_calculos"
  ON banco_horas_calculos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert banco_horas_calculos"
  ON banco_horas_calculos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update banco_horas_calculos"
  ON banco_horas_calculos FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete banco_horas_calculos"
  ON banco_horas_calculos FOR DELETE
  TO authenticated
  USING (true);
*/
