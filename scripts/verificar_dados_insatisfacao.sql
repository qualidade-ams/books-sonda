-- Verificar dados reais para o cálculo de % Insatisfação (Total)

-- 1. Total de pesquisas 2025 por ano_abertura
SELECT COUNT(*) as total_ano_abertura
FROM pesquisas_satisfacao
WHERE ano_abertura = 2025;

-- 2. Pesquisas com status enviado_plano_acao em 2025
SELECT COUNT(*) as total_enviado_plano
FROM pesquisas_satisfacao
WHERE ano_abertura = 2025
  AND status = 'enviado_plano_acao';

-- 3. Verificar se você quer usar created_at em vez de ano_abertura
SELECT COUNT(*) as total_created_at_2025
FROM pesquisas_satisfacao
WHERE EXTRACT(YEAR FROM created_at::timestamp) = 2025;

-- 4. Pesquisas com status enviado_plano_acao por created_at
SELECT COUNT(*) as total_enviado_plano_created
FROM pesquisas_satisfacao
WHERE EXTRACT(YEAR FROM created_at::timestamp) = 2025
  AND status = 'enviado_plano_acao';
