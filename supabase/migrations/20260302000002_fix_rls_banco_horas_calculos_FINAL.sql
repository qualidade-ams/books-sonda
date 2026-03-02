-- Migration: Corrigir políticas RLS duplicadas em banco_horas_calculos
-- Data: 2026-03-02
-- Descrição: Remove TODAS as políticas antigas e cria apenas as corretas

-- ============================================================================
-- PASSO 1: REMOVER TODAS AS POLÍTICAS ANTIGAS
-- ============================================================================

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE '🧹 Removendo todas as políticas antigas de banco_horas_calculos...';
  
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'banco_horas_calculos'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON banco_horas_calculos', policy_record.policyname);
    RAISE NOTICE '  ✅ Removida: %', policy_record.policyname;
  END LOOP;
  
  RAISE NOTICE '✅ Todas as políticas antigas foram removidas';
END $$;

-- ============================================================================
-- PASSO 2: GARANTIR QUE RLS ESTÁ HABILITADO
-- ============================================================================

ALTER TABLE banco_horas_calculos ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASSO 3: CRIAR POLÍTICAS CORRETAS
-- ============================================================================

-- Policy para SELECT (usuários autenticados podem visualizar)
CREATE POLICY "authenticated_select_banco_horas_calculos"
  ON banco_horas_calculos
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy para INSERT (usuários autenticados podem inserir)
CREATE POLICY "authenticated_insert_banco_horas_calculos"
  ON banco_horas_calculos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy para UPDATE (usuários autenticados podem atualizar)
CREATE POLICY "authenticated_update_banco_horas_calculos"
  ON banco_horas_calculos
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy para DELETE (usuários autenticados podem deletar)
CREATE POLICY "authenticated_delete_banco_horas_calculos"
  ON banco_horas_calculos
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy para service_role (acesso total, bypass RLS)
CREATE POLICY "service_role_all_banco_horas_calculos"
  ON banco_horas_calculos
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PASSO 4: VERIFICAR POLÍTICAS CRIADAS
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'banco_horas_calculos';
  
  RAISE NOTICE '📊 Total de políticas criadas: %', policy_count;
  
  IF policy_count = 5 THEN
    RAISE NOTICE '✅ Políticas criadas com sucesso!';
  ELSE
    RAISE WARNING '⚠️ Número de políticas diferente do esperado (esperado: 5, atual: %)', policy_count;
  END IF;
END $$;

-- ============================================================================
-- PASSO 5: LISTAR POLÍTICAS FINAIS
-- ============================================================================

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE '📋 Políticas finais de banco_horas_calculos:';
  
  FOR policy_record IN 
    SELECT 
      policyname,
      cmd as acao,
      roles::text as roles
    FROM pg_policies 
    WHERE tablename = 'banco_horas_calculos'
    ORDER BY policyname
  LOOP
    RAISE NOTICE '  - % (%) [%]', policy_record.policyname, policy_record.acao, policy_record.roles;
  END LOOP;
END $$;

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON POLICY "authenticated_select_banco_horas_calculos" ON banco_horas_calculos IS 
  'Permite que usuários autenticados visualizem cálculos de banco de horas';

COMMENT ON POLICY "authenticated_insert_banco_horas_calculos" ON banco_horas_calculos IS 
  'Permite que usuários autenticados insiram novos cálculos';

COMMENT ON POLICY "authenticated_update_banco_horas_calculos" ON banco_horas_calculos IS 
  'Permite que usuários autenticados atualizem cálculos existentes';

COMMENT ON POLICY "authenticated_delete_banco_horas_calculos" ON banco_horas_calculos IS 
  'Permite que usuários autenticados deletem cálculos';

COMMENT ON POLICY "service_role_all_banco_horas_calculos" ON banco_horas_calculos IS 
  'Permite acesso total para service_role (bypass RLS)';
