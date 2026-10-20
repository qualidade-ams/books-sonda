-- Migration: Fix percentual_repasse_mensal default value
-- Description: Atualiza o valor padrão do percentual_repasse_mensal para 100 quando NULL
-- Date: 2026-01-21

-- Atualizar registros existentes que têm percentual NULL para 100
UPDATE empresas_clientes
SET percentual_repasse_mensal = 100
WHERE percentual_repasse_mensal IS NULL;

-- Alterar a coluna para ter valor padrão de 100
ALTER TABLE empresas_clientes
ALTER COLUMN percentual_repasse_mensal SET DEFAULT 100;

-- Adicionar constraint para garantir que o valor esteja entre 0 e 100
ALTER TABLE empresas_clientes
ADD CONSTRAINT check_percentual_repasse_range 
CHECK (percentual_repasse_mensal >= 0 AND percentual_repasse_mensal <= 100);

-- Comentário explicativo
COMMENT ON COLUMN empresas_clientes.percentual_repasse_mensal IS 
'Percentual de repasse mensal do saldo positivo (0-100). Padrão: 100% (repassa todo o saldo positivo)';
