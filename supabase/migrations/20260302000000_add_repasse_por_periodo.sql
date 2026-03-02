-- Migration: Adicionar campos de repasse por período
-- Data: 2026-03-02
-- Descrição: Adiciona campos para configuração de repasse diferenciado por período

-- Adicionar coluna tipo_repasse_especial
ALTER TABLE empresas_clientes 
ADD COLUMN IF NOT EXISTS tipo_repasse_especial VARCHAR(20) DEFAULT 'simples';

-- Adicionar colunas de configuração de repasse por período
ALTER TABLE empresas_clientes 
ADD COLUMN IF NOT EXISTS duracao_periodo_meses INTEGER,
ADD COLUMN IF NOT EXISTS percentual_dentro_periodo INTEGER,
ADD COLUMN IF NOT EXISTS percentual_entre_periodos INTEGER,
ADD COLUMN IF NOT EXISTS periodos_ate_zerar INTEGER;

-- Adicionar comentários para documentação
COMMENT ON COLUMN empresas_clientes.tipo_repasse_especial IS 'Tipo de repasse especial: simples (percentual fixo) ou por_periodo (percentuais diferentes dentro e entre períodos)';
COMMENT ON COLUMN empresas_clientes.duracao_periodo_meses IS 'Duração de cada período em meses (ex: 3 para trimestral)';
COMMENT ON COLUMN empresas_clientes.percentual_dentro_periodo IS 'Percentual de repasse entre meses do mesmo período';
COMMENT ON COLUMN empresas_clientes.percentual_entre_periodos IS 'Percentual de repasse ao mudar de período';
COMMENT ON COLUMN empresas_clientes.periodos_ate_zerar IS 'Quantidade de períodos até zerar o saldo';

-- Adicionar constraints de validação
ALTER TABLE empresas_clientes 
ADD CONSTRAINT check_tipo_repasse_especial 
CHECK (tipo_repasse_especial IN ('simples', 'por_periodo'));

ALTER TABLE empresas_clientes 
ADD CONSTRAINT check_duracao_periodo_meses 
CHECK (duracao_periodo_meses IS NULL OR (duracao_periodo_meses >= 1 AND duracao_periodo_meses <= 12));

ALTER TABLE empresas_clientes 
ADD CONSTRAINT check_percentual_dentro_periodo 
CHECK (percentual_dentro_periodo IS NULL OR (percentual_dentro_periodo >= 0 AND percentual_dentro_periodo <= 100));

ALTER TABLE empresas_clientes 
ADD CONSTRAINT check_percentual_entre_periodos 
CHECK (percentual_entre_periodos IS NULL OR (percentual_entre_periodos >= 0 AND percentual_entre_periodos <= 100));

ALTER TABLE empresas_clientes 
ADD CONSTRAINT check_periodos_ate_zerar 
CHECK (periodos_ate_zerar IS NULL OR (periodos_ate_zerar >= 1 AND periodos_ate_zerar <= 12));

-- Atualizar empresas existentes com repasse especial para tipo 'simples'
UPDATE empresas_clientes 
SET tipo_repasse_especial = 'simples' 
WHERE possui_repasse_especial = true 
  AND tipo_repasse_especial IS NULL;
