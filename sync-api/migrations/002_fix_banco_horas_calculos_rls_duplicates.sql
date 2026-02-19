-- ============================================================================
-- Migration: Fix RLS policies duplicates for banco_horas_calculos
-- Criado: 2026-02-18
-- Propósito: Corrigir políticas RLS duplicadas que causam erro 406
-- ============================================================================
-- ⚠️ IMPORTANTE: Seguindo rigorosamente o padrão security-validation.md
-- ============================================================================

-- PASSO 1: Remover TODAS as políticas antigas (CRÍTICO)
-- ============================================================================
-- Seguindo o padrão: SEMPRE remover políticas antigas ANTES de criar novas

DO $$
DECLARE
  pol RECORD;
BEGIN
  RAISE NOTICE '🔧 Iniciando remoção de políticas antigas...';
  
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'banco_horas_calculos' 
      AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON banco_horas_calculos', pol.policyname);
    RAISE NOTICE '✅ Política removida: %', pol.policyname;
  END LOOP;
  
  RAISE NOTICE '✅ Todas as políticas antigas foram removidas';
END $$;

-- PASSO 2: Garantir RLS habilitado
-- ============================================================================
ALTER TABLE banco_horas_calculos ENABLE ROW LEVEL SECURITY;

-- PASSO 3: Criar novas políticas (OTIMIZADAS PARA PERFORMANCE)
-- ============================================================================
-- Seguindo o padrão: usar (SELECT auth.uid()) em vez de auth.uid() direto

-- Policy para SELECT (read access)
CREATE POLICY "authenticated_select_banco_horas_calculos"
  ON banco_horas_calculos
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- Policy para INSERT (create access)
CREATE POLICY "authenticated_insert_banco_horas_calculos"
  ON banco_horas_calculos
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- Policy para UPDATE (edit access)
CREATE POLICY "authenticated_update_banco_horas_calculos"
  ON banco_horas_calculos
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- Policy para DELETE (delete access)
CREATE POLICY "authenticated_delete_banco_horas_calculos"
  ON banco_horas_calculos
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- PASSO 4: Garantir permissões de acesso
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON banco_horas_calculos TO authenticated;

-- PASSO 5: Verificar se não há duplicatas (VALIDAÇÃO CRÍTICA)
-- ============================================================================
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT tablename, cmd, COUNT(*) as total
    FROM pg_policies 
    WHERE tablename = 'banco_horas_calculos'
      AND schemaname = 'public'
    GROUP BY tablename, cmd
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION '❌ ERRO: Políticas duplicadas detectadas!';
  END IF;
  
  RAISE NOTICE '✅ Sem duplicatas - Migration aplicada com sucesso';
END $$;

-- PASSO 6: Relatório de políticas criadas
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '📊 Relatório de Políticas RLS - banco_horas_calculos';
  RAISE NOTICE '==================================================';
END $$;

SELECT 
  cmd as acao,
  policyname as nome_politica,
  roles
FROM pg_policies
WHERE tablename = 'banco_horas_calculos'
  AND schemaname = 'public'
ORDER BY cmd, policyname;

-- PASSO 7: Verificar contagem de políticas por ação
-- ============================================================================
SELECT 
  cmd as acao,
  COUNT(*) as total_politicas
FROM pg_policies
WHERE tablename = 'banco_horas_calculos'
  AND schemaname = 'public'
GROUP BY cmd
ORDER BY cmd;

-- ============================================================================
-- RESULTADO ESPERADO:
-- ============================================================================
-- Deve ter exatamente 4 políticas:
-- 1. authenticated_select_banco_horas_calculos (SELECT)
-- 2. authenticated_insert_banco_horas_calculos (INSERT)
-- 3. authenticated_update_banco_horas_calculos (UPDATE)
-- 4. authenticated_delete_banco_horas_calculos (DELETE)
--
-- Cada ação (SELECT, INSERT, UPDATE, DELETE) deve ter exatamente 1 política
-- ============================================================================

COMMENT ON TABLE banco_horas_calculos IS 'Tabela de cálculos de banco de horas - RLS corrigido em 2026-02-18';
