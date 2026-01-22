-- Script para atualizar o percentual de repasse para 10%
-- Execute este script APENAS se você confirmar que o valor deve ser 10%

-- IMPORTANTE: Substitua 'NOME_DA_EMPRESA' pelo nome real da empresa
-- ou use o ID da empresa se souber

-- Opção 1: Atualizar por nome abreviado
UPDATE empresas_clientes
SET percentual_repasse_mensal = 10
WHERE nome_abreviado = 'NOME_DA_EMPRESA';

-- Opção 2: Atualizar por ID
-- UPDATE empresas_clientes
-- SET percentual_repasse_mensal = 10
-- WHERE id = 'uuid-da-empresa';

-- Opção 3: Atualizar TODAS as empresas para 10% (CUIDADO!)
-- UPDATE empresas_clientes
-- SET percentual_repasse_mensal = 10
-- WHERE tipo_contrato IS NOT NULL;

-- Verificar o resultado
SELECT 
  nome_abreviado,
  percentual_repasse_mensal
FROM empresas_clientes
WHERE tipo_contrato IS NOT NULL;
