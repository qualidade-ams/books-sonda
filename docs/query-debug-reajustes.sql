-- Query para Debug de Reajustes de Tickets
-- Data: 2026-01-26
-- Problema: Reajustes não estão sendo exibidos corretamente

-- 1. Verificar reajustes salvos no banco
SELECT 
  id,
  mes,
  ano,
  tipo_reajuste,
  valor_reajuste_horas,
  valor_reajuste_tickets,
  observacao,
  ativo,
  created_at,
  created_by
FROM banco_horas_reajustes
WHERE mes = 10
  AND ano = 2025
  AND ativo = true
ORDER BY created_at;

-- 2. Verificar cálculo na versão mais recente
SELECT 
  versao,
  mes,
  ano,
  baseline_tickets,
  repasses_mes_anterior_tickets,
  saldo_a_utilizar_tickets,
  consumo_tickets,
  requerimentos_tickets,
  reajustes_tickets,
  consumo_total_tickets,
  saldo_tickets,
  repasse_tickets,
  created_at
FROM banco_horas_versoes
WHERE mes = 10
  AND ano = 2025
  AND ativo = true
ORDER BY versao DESC
LIMIT 1;

-- 3. Verificar todas as versões do mês
SELECT 
  versao,
  tipo_alteracao,
  reajustes_tickets,
  created_at,
  created_by
FROM banco_horas_versoes
WHERE mes = 10
  AND ano = 2025
  AND ativo = true
ORDER BY versao DESC;

-- 4. Verificar se há reajustes com valor NULL
SELECT 
  COUNT(*) as total_reajustes,
  COUNT(valor_reajuste_tickets) as com_tickets,
  COUNT(valor_reajuste_horas) as com_horas
FROM banco_horas_reajustes
WHERE mes = 10
  AND ano = 2025
  AND ativo = true;

-- 5. Verificar soma manual dos reajustes
SELECT 
  tipo_reajuste,
  SUM(COALESCE(valor_reajuste_tickets, 0)) as total_tickets,
  COUNT(*) as quantidade
FROM banco_horas_reajustes
WHERE mes = 10
  AND ano = 2025
  AND ativo = true
GROUP BY tipo_reajuste;
