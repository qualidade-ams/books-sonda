-- Script de debug para verificar o percentual_repasse_mensal
-- Execute este script no Supabase SQL Editor para verificar os valores

-- Verificar todos os valores de percentual_repasse_mensal
SELECT 
  id,
  nome_abreviado,
  percentual_repasse_mensal,
  periodo_apuracao,
  tipo_contrato,
  inicio_vigencia
FROM empresas_clientes
WHERE tipo_contrato IS NOT NULL
ORDER BY nome_abreviado;

-- Verificar se há valores NULL
SELECT COUNT(*) as total_null
FROM empresas_clientes
WHERE percentual_repasse_mensal IS NULL;

-- Verificar distribuição de valores
SELECT 
  percentual_repasse_mensal,
  COUNT(*) as quantidade
FROM empresas_clientes
GROUP BY percentual_repasse_mensal
ORDER BY percentual_repasse_mensal;
