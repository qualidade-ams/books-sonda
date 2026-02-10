-- =====================================================
-- Migration: Permitir baseline_horas e baseline_tickets NULL
-- Data: 2026-02-10
-- Descrição: Permite que baseline_horas seja NULL quando
--            tipo de contrato é "tickets" e vice-versa
-- =====================================================

-- 1. Remover constraint NOT NULL de baseline_horas
ALTER TABLE baseline_historico 
  ALTER COLUMN baseline_horas DROP NOT NULL;

-- 2. Adicionar constraint CHECK condicional
-- Garante que pelo menos um dos campos (horas OU tickets) seja preenchido
ALTER TABLE baseline_historico
  ADD CONSTRAINT check_baseline_preenchido 
  CHECK (
    baseline_horas IS NOT NULL OR baseline_tickets IS NOT NULL
  );

-- 3. Comentários explicativos
COMMENT ON COLUMN baseline_historico.baseline_horas IS 
'Baseline de horas mensal (DECIMAL). Pode ser NULL se tipo_contrato for apenas "tickets".';

COMMENT ON COLUMN baseline_historico.baseline_tickets IS 
'Baseline de tickets mensal (INTEGER). Pode ser NULL se tipo_contrato for apenas "horas".';

COMMENT ON CONSTRAINT check_baseline_preenchido ON baseline_historico IS 
'Garante que pelo menos um dos campos (baseline_horas OU baseline_tickets) seja preenchido.';

-- 4. Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Migration concluída com sucesso!';
  RAISE NOTICE '📊 Campos baseline_horas e baseline_tickets agora podem ser NULL';
  RAISE NOTICE '✅ Constraint adicionada: pelo menos um campo deve ser preenchido';
END $$;
