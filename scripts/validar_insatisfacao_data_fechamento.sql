-- Script para validar o cálculo de % Insatisfação (Total) usando data_fechamento
-- Baseado na regra: pesquisas com data_fechamento no ano/mês E status = 'enviado_plano_acao'

-- 1. Total de pesquisas com data_fechamento em 2025
SELECT 
  'Total de pesquisas com data_fechamento em 2025' as metrica,
  COUNT(*) as total
FROM pesquisas_satisfacao
WHERE data_fechamento IS NOT NULL
  AND EXTRACT(YEAR FROM data_fechamento::timestamp) = 2025;

-- 2. Pesquisas com status enviado_plano_acao e data_fechamento em 2025
SELECT 
  'Pesquisas com status enviado_plano_acao em 2025' as metrica,
  COUNT(*) as total
FROM pesquisas_satisfacao
WHERE data_fechamento IS NOT NULL
  AND EXTRACT(YEAR FROM data_fechamento::timestamp) = 2025
  AND status = 'enviado_plano_acao';

-- 3. Cálculo da porcentagem
SELECT 
  'CÁLCULO % INSATISFAÇÃO (TOTAL)' as titulo,
  (SELECT COUNT(*) FROM pesquisas_satisfacao 
   WHERE data_fechamento IS NOT NULL 
   AND EXTRACT(YEAR FROM data_fechamento::timestamp) = 2025) as total_pesquisas,
  (SELECT COUNT(*) FROM pesquisas_satisfacao 
   WHERE data_fechamento IS NOT NULL 
   AND EXTRACT(YEAR FROM data_fechamento::timestamp) = 2025 
   AND status = 'enviado_plano_acao') as com_plano_acao,
  ROUND(
    (SELECT COUNT(*) FROM pesquisas_satisfacao 
     WHERE data_fechamento IS NOT NULL 
     AND EXTRACT(YEAR FROM data_fechamento::timestamp) = 2025 
     AND status = 'enviado_plano_acao')::numeric * 100.0 / 
    NULLIF((SELECT COUNT(*) FROM pesquisas_satisfacao 
            WHERE data_fechamento IS NOT NULL 
            AND EXTRACT(YEAR FROM data_fechamento::timestamp) = 2025), 0),
    1
  ) as percentual;

-- 4. Distribuição de status em 2025 (data_fechamento)
SELECT 
  status,
  COUNT(*) as total
FROM pesquisas_satisfacao
WHERE data_fechamento IS NOT NULL
  AND EXTRACT(YEAR FROM data_fechamento::timestamp) = 2025
GROUP BY status
ORDER BY total DESC;

-- 5. Verificar pesquisas sem data_fechamento
SELECT 
  'Pesquisas SEM data_fechamento' as metrica,
  COUNT(*) as total
FROM pesquisas_satisfacao
WHERE data_fechamento IS NULL;
