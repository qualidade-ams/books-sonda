-- =====================================================
-- Migration: Corrigir tipos de campos da tabela apontamentos_tickets_aranda
-- Descrição: Ajustar tipos de dados para corresponder à estrutura real do SQL Server
-- Data: 2026-01-27
-- =====================================================

-- =====================================================
-- PARTE 1: Alterar tipos de campos de tempo gasto
-- =====================================================

-- Tempo gasto vem como string no formato "0d,02:40" (dias), "22:56" (horas), float (minutos)
-- Usar USING para conversão explícita caso já existam dados
ALTER TABLE apontamentos_tickets_aranda 
  ALTER COLUMN tempo_gasto_dias TYPE VARCHAR(50) 
  USING tempo_gasto_dias::VARCHAR(50);

ALTER TABLE apontamentos_tickets_aranda 
  ALTER COLUMN tempo_gasto_horas TYPE VARCHAR(50) 
  USING tempo_gasto_horas::VARCHAR(50);

ALTER TABLE apontamentos_tickets_aranda 
  ALTER COLUMN tempo_gasto_minutos TYPE DECIMAL(10,6)
  USING CASE 
    WHEN tempo_gasto_minutos IS NULL THEN NULL
    ELSE tempo_gasto_minutos::DECIMAL(10,6)
  END;

COMMENT ON COLUMN apontamentos_tickets_aranda.tempo_gasto_dias IS 'Tempo gasto em dias (formato: "0d,02:40")';
COMMENT ON COLUMN apontamentos_tickets_aranda.tempo_gasto_horas IS 'Tempo gasto em horas (formato: "22:56")';
COMMENT ON COLUMN apontamentos_tickets_aranda.tempo_gasto_minutos IS 'Tempo gasto em minutos (decimal)';

-- =====================================================
-- PARTE 2: Aumentar tamanho de campos VARCHAR
-- =====================================================

-- Campos que podem ter valores maiores que 10 caracteres
ALTER TABLE apontamentos_tickets_aranda 
  ALTER COLUMN chamado_reaberto TYPE VARCHAR(50),
  ALTER COLUMN violacao_sla TYPE VARCHAR(50),
  ALTER COLUMN tda_cumprido TYPE VARCHAR(50),
  ALTER COLUMN tds_cumprido TYPE VARCHAR(50);

-- =====================================================
-- PARTE 3: Ajustar campo tempo_real_tda
-- =====================================================

-- tempo_real_tda vem como float no SQL Server
-- Usar USING para conversão explícita (pode ter valores NULL ou vazios)
ALTER TABLE apontamentos_tickets_aranda 
  ALTER COLUMN tempo_real_tda TYPE DECIMAL(10,6) 
  USING CASE 
    WHEN tempo_real_tda IS NULL OR tempo_real_tda = '' THEN NULL
    ELSE tempo_real_tda::DECIMAL(10,6)
  END;

COMMENT ON COLUMN apontamentos_tickets_aranda.tempo_real_tda IS 'Tempo real de TDA (decimal)';

-- =====================================================
-- PARTE 4: Ajustar campo tempo_restante_tds_em_minutos
-- =====================================================

-- tempo_restante_tds_em_minutos vem como float no SQL Server
-- Usar USING para conversão explícita (pode ter valores NULL)
ALTER TABLE apontamentos_tickets_aranda 
  ALTER COLUMN tempo_restante_tds_em_minutos TYPE DECIMAL(10,2)
  USING CASE 
    WHEN tempo_restante_tds_em_minutos IS NULL THEN NULL
    ELSE tempo_restante_tds_em_minutos::DECIMAL(10,2)
  END;

COMMENT ON COLUMN apontamentos_tickets_aranda.tempo_restante_tds_em_minutos IS 'Tempo restante TDS em minutos (decimal)';

-- =====================================================
-- PARTE 5: Verificação
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Tipos de campos corrigidos na tabela apontamentos_tickets_aranda!';
  RAISE NOTICE '   - tempo_gasto_dias: INTEGER → VARCHAR(50)';
  RAISE NOTICE '   - tempo_gasto_horas: INTEGER → VARCHAR(50)';
  RAISE NOTICE '   - tempo_gasto_minutos: INTEGER → DECIMAL(10,6)';
  RAISE NOTICE '   - chamado_reaberto: VARCHAR(10) → VARCHAR(50)';
  RAISE NOTICE '   - violacao_sla: VARCHAR(10) → VARCHAR(50)';
  RAISE NOTICE '   - tda_cumprido: VARCHAR(10) → VARCHAR(50)';
  RAISE NOTICE '   - tds_cumprido: VARCHAR(10) → VARCHAR(50)';
  RAISE NOTICE '   - tempo_real_tda: VARCHAR(50) → DECIMAL(10,6)';
  RAISE NOTICE '   - tempo_restante_tds_em_minutos: INTEGER → DECIMAL(10,2)';
END $$;
