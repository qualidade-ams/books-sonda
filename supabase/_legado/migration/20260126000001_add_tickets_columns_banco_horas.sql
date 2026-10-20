-- Migration: Adicionar colunas de tickets nas tabelas de banco de horas
-- Data: 2026-01-26
-- Problema: Sistema não estava salvando valores de tickets, apenas horas

-- =====================================================
-- 1. Adicionar colunas de tickets na tabela banco_horas_versoes
-- =====================================================

-- Baseline
ALTER TABLE banco_horas_versoes 
ADD COLUMN IF NOT EXISTS baseline_tickets DECIMAL(10,2) DEFAULT 0;

-- Repasses mês anterior
ALTER TABLE banco_horas_versoes 
ADD COLUMN IF NOT EXISTS repasses_mes_anterior_tickets DECIMAL(10,2) DEFAULT 0;

-- Saldo a utilizar
ALTER TABLE banco_horas_versoes 
ADD COLUMN IF NOT EXISTS saldo_a_utilizar_tickets DECIMAL(10,2) DEFAULT 0;

-- Consumo
ALTER TABLE banco_horas_versoes 
ADD COLUMN IF NOT EXISTS consumo_tickets DECIMAL(10,2) DEFAULT 0;

-- Requerimentos
ALTER TABLE banco_horas_versoes 
ADD COLUMN IF NOT EXISTS requerimentos_tickets DECIMAL(10,2) DEFAULT 0;

-- Reajustes
ALTER TABLE banco_horas_versoes 
ADD COLUMN IF NOT EXISTS reajustes_tickets DECIMAL(10,2) DEFAULT 0;

-- Consumo total
ALTER TABLE banco_horas_versoes 
ADD COLUMN IF NOT EXISTS consumo_total_tickets DECIMAL(10,2) DEFAULT 0;

-- Saldo
ALTER TABLE banco_horas_versoes 
ADD COLUMN IF NOT EXISTS saldo_tickets DECIMAL(10,2) DEFAULT 0;

-- Repasse
ALTER TABLE banco_horas_versoes 
ADD COLUMN IF NOT EXISTS repasse_tickets DECIMAL(10,2) DEFAULT 0;

-- Excedentes
ALTER TABLE banco_horas_versoes 
ADD COLUMN IF NOT EXISTS excedentes_tickets DECIMAL(10,2) DEFAULT 0;

-- =====================================================
-- 2. Comentários nas colunas
-- =====================================================

COMMENT ON COLUMN banco_horas_versoes.baseline_tickets IS 'Baseline mensal em tickets (para clientes tipo ticket)';
COMMENT ON COLUMN banco_horas_versoes.repasses_mes_anterior_tickets IS 'Repasses do mês anterior em tickets';
COMMENT ON COLUMN banco_horas_versoes.saldo_a_utilizar_tickets IS 'Saldo disponível para utilização em tickets';
COMMENT ON COLUMN banco_horas_versoes.consumo_tickets IS 'Consumo de chamados em tickets';
COMMENT ON COLUMN banco_horas_versoes.requerimentos_tickets IS 'Requerimentos aprovados em tickets';
COMMENT ON COLUMN banco_horas_versoes.reajustes_tickets IS 'Reajustes manuais em tickets (entradas - saídas)';
COMMENT ON COLUMN banco_horas_versoes.consumo_total_tickets IS 'Consumo total em tickets (consumo + requerimentos)';
COMMENT ON COLUMN banco_horas_versoes.saldo_tickets IS 'Saldo final em tickets';
COMMENT ON COLUMN banco_horas_versoes.repasse_tickets IS 'Repasse para próximo mês em tickets';
COMMENT ON COLUMN banco_horas_versoes.excedentes_tickets IS 'Excedentes em tickets (quando saldo negativo)';

-- =====================================================
-- 3. Verificar se migration foi aplicada com sucesso
-- =====================================================

DO $$
BEGIN
  -- Verificar se todas as colunas foram criadas
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'banco_horas_versoes' 
      AND column_name IN (
        'baseline_tickets',
        'repasses_mes_anterior_tickets',
        'saldo_a_utilizar_tickets',
        'consumo_tickets',
        'requerimentos_tickets',
        'reajustes_tickets',
        'consumo_total_tickets',
        'saldo_tickets',
        'repasse_tickets',
        'excedentes_tickets'
      )
  ) THEN
    RAISE NOTICE '✅ Migration aplicada com sucesso! Colunas de tickets adicionadas.';
  ELSE
    RAISE EXCEPTION '❌ Erro: Nem todas as colunas foram criadas!';
  END IF;
END $$;
