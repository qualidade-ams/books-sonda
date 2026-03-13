-- Script para debugar o cálculo de % Insatisfação (Total)
-- Verificar dados reais da tabela pesquisas_satisfacao

-- 1. Total de pesquisas do ano 2025 (baseado em ano_abertura)
SELECT 
  'Total de pesquisas 2025 (ano_abertura)' as metrica,
  COUNT(*) as total
FROM pesquisas_satisfacao
WHERE ano_abertura = 2025;

-- 2. Pesquisas com status enviado_plano_acao em 2025
SELECT 
  'Pesquisas com status enviado_plano_acao em 2025' as metrica,
  COUNT(*) as total
FROM pesquisas_satisfacao
WHERE ano_abertura = 2025
  AND status = 'enviado_plano_acao';

-- 3. Distribuição de status em 2025
SELECT 
  status,
  COUNT(*) as total,
  ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM pesquisas_satisfacao WHERE ano_abertura = 2025)), 2) as percentual
FROM pesquisas_satisfacao
WHERE ano_abertura = 2025
GROUP BY status
ORDER BY total DESC;

-- 4. Verificar se existem pesquisas com ano_abertura NULL
SELECT 
  'Pesquisas com ano_abertura NULL' as metrica,
  COUNT(*) as total
FROM pesquisas_satisfacao
WHERE ano_abertura IS NULL;

-- 5. Verificar distribuição por ano_abertura
SELECT 
  ano_abertura,
  COUNT(*) as total
FROM pesquisas_satisfacao
GROUP BY ano_abertura
ORDER BY ano_abertura DESC;

-- 6. Comparar com data_resposta (o que estava sendo usado antes)
SELECT 
  'Total de pesquisas 2025 (data_resposta)' as metrica,
  COUNT(*) as total
FROM pesquisas_satisfacao
WHERE data_resposta IS NOT NULL
  AND EXTRACT(YEAR FROM data_resposta::timestamp) = 2025;

-- 7. Pesquisas que têm plano de ação associado (método antigo)
SELECT 
  'Pesquisas com plano de ação (via join)' as metrica,
  COUNT(DISTINCT ps.id) as total
FROM pesquisas_satisfacao ps
INNER JOIN planos_acao pa ON pa.pesquisa_id = ps.id
WHERE ps.data_resposta IS NOT NULL
  AND EXTRACT(YEAR FROM ps.data_resposta::timestamp) = 2025;

-- 8. Detalhes das pesquisas com status enviado_plano_acao
SELECT 
  id,
  empresa,
  cliente,
  nro_caso,
  ano_abertura,
  mes_abertura,
  status,
  data_resposta,
  resposta
FROM pesquisas_satisfacao
WHERE ano_abertura = 2025
  AND status = 'enviado_plano_acao'
ORDER BY mes_abertura DESC, created_at DESC
LIMIT 20;

-- 9. Verificar se há pesquisas com status diferente mas que têm plano de ação
SELECT 
  ps.status,
  COUNT(*) as total_pesquisas,
  COUNT(pa.id) as total_com_plano
FROM pesquisas_satisfacao ps
LEFT JOIN planos_acao pa ON pa.pesquisa_id = ps.id
WHERE ps.ano_abertura = 2025
GROUP BY ps.status
ORDER BY total_com_plano DESC;

-- 10. Resumo final esperado vs atual
SELECT 
  'RESUMO COMPARATIVO' as titulo,
  (SELECT COUNT(*) FROM pesquisas_satisfacao WHERE ano_abertura = 2025) as total_pesquisas_2025,
  (SELECT COUNT(*) FROM pesquisas_satisfacao WHERE ano_abertura = 2025 AND status = 'enviado_plano_acao') as com_status_enviado_plano,
  (SELECT COUNT(DISTINCT ps.id) FROM pesquisas_satisfacao ps INNER JOIN planos_acao pa ON pa.pesquisa_id = ps.id WHERE ps.ano_abertura = 2025) as com_plano_acao_associado,
  ROUND(
    (SELECT COUNT(*) FROM pesquisas_satisfacao WHERE ano_abertura = 2025 AND status = 'enviado_plano_acao')::numeric * 100.0 / 
    NULLIF((SELECT COUNT(*) FROM pesquisas_satisfacao WHERE ano_abertura = 2025), 0),
    2
  ) as percentual_calculado;
