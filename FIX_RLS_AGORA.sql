-- ============================================================================
-- SCRIPT DE CORREÇÃO IMEDIATA - Execute AGORA no Supabase SQL Editor
-- ============================================================================
-- Este script corrige o erro 406 (Not Acceptable) causado por políticas RLS duplicadas

-- PASSO 1: Remover TODAS as políticas antigas
DROP POLICY IF EXISTS "authenticated_select_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "authenticated_insert_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "authenticated_update_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "authenticated_delete_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "service_role_all_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "temp_authenticated_select_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "temp_authenticated_insert_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "temp_authenticated_update_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "temp_authenticated_delete_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "allow_authenticated_select_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "allow_authenticated_insert_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "allow_authenticated_update_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "allow_authenticated_delete_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can view calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can insert calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can update calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can delete calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Authenticated users can view calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Admins can insert calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Admins can update calculos" ON banco_horas_calculos;

-- PASSO 2: Garantir que RLS está habilitado
ALTER TABLE banco_horas_calculos ENABLE ROW LEVEL SECURITY;

-- PASSO 3: Criar políticas corretas (SIMPLES - sem verificação de permissões)
CREATE POLICY "authenticated_select_banco_horas_calculos"
  ON banco_horas_calculos
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_insert_banco_horas_calculos"
  ON banco_horas_calculos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_update_banco_horas_calculos"
  ON banco_horas_calculos
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "authenticated_delete_banco_horas_calculos"
  ON banco_horas_calculos
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "service_role_all_banco_horas_calculos"
  ON banco_horas_calculos
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- PASSO 4: Verificar políticas criadas
SELECT 
  policyname,
  cmd as acao
FROM pg_policies 
WHERE tablename = 'banco_horas_calculos'
ORDER BY policyname;

-- Deve retornar exatamente 5 políticas:
-- authenticated_delete_banco_horas_calculos | DELETE
-- authenticated_insert_banco_horas_calculos | INSERT
-- authenticated_select_banco_horas_calculos | SELECT
-- authenticated_update_banco_horas_calculos | UPDATE
-- service_role_all_banco_horas_calculos     | ALL

-- PASSO 5: Deletar cálculos antigos da TK ELEVADORES
DELETE FROM banco_horas_calculos
WHERE empresa_id = '32d36d53-92ff-4b9e-bc96-575b73c787ac';

-- PASSO 6: Confirmar que foram deletados
SELECT COUNT(*) as calculos_restantes
FROM banco_horas_calculos
WHERE empresa_id = '32d36d53-92ff-4b9e-bc96-575b73c787ac';

-- Deve retornar: calculos_restantes = 0

-- ============================================================================
-- PRONTO! Agora:
-- 1. Pressione Ctrl+Shift+R no navegador para limpar cache
-- 2. Acesse a tela de Controle de Banco de Horas
-- 3. Selecione TK ELEVADORES
-- 4. Os cálculos devem ser gerados automaticamente
-- ============================================================================
