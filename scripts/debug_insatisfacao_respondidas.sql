-- Script para debugar cálculo de % Insatisfação (Respondidas)
-- Verificar como está sendo calculado o valor 13

-- 1. Total de pesquisas com data_resposta em fevereiro/2026
SELECT 
  COUNT(*) as total_com_data_resposta,
  'Pesquisas com data_resposta em fevereiro/2026' as descricao
FROM pesquisas_satisfacao
WHERE EXTRACT(YEAR FROM data_resposta) = 2026
  AND EXTRACT(MONTH FROM data_resposta) = 2;

-- 2. Pesquisas que têm plano de ação associado (insatisfação)
-- Verificar quantas pesquisas de fevereiro/2026 têm plano de ação
SELECT 
  COUNT(DISTINCT ps.id) as pesquisas_com_plano_acao,
  'Pesquisas de fevereiro/2026 com plano de ação' as descricao
FROM pesquisas_satisfacao ps
INNER JOIN planos_acao pa ON pa.pesquisa_id = ps.id
WHERE EXTRACT(YEAR FROM ps.data_resposta) = 2026
  AND EXTRACT(MONTH FROM ps.data_resposta) = 2;

-- 3. Detalhes das pesquisas com plano de ação
SELECT 
  ps.id,
  ps.nro_caso,
  ps.empresa,
  ps.prestador,
  ps.data_resposta,
  ps.status,
  pa.id as plano_acao_id,
  pa.status as plano_status
FROM pesquisas_satisfacao ps
INNER JOIN planos_acao pa ON pa.pesquisa_id = ps.id
WHERE EXTRACT(YEAR FROM ps.data_resposta) = 2026
  AND EXTRACT(MONTH FROM ps.data_resposta) = 2
ORDER BY ps.data_resposta;

-- 4. Cálculo da porcentagem
SELECT 
  COUNT(DISTINCT ps.id) FILTER (WHERE pa.id IS NOT NULL) as pesquisas_com_plano,
  COUNT(*) as total_respondidas,
  ROUND(
    (COUNT(DISTINCT ps.id) FILTER (WHERE pa.id IS NOT NULL)::numeric / COUNT(*)::numeric) * 100,
    1
  ) as percentual_insatisfacao
FROM pesquisas_satisfacao ps
LEFT JOIN planos_acao pa ON pa.pesquisa_id = ps.id
WHERE EXTRACT(YEAR FROM ps.data_resposta) = 2026
  AND EXTRACT(MONTH FROM ps.data_resposta) = 2;

-- 5. Verificar se há pesquisas duplicadas
SELECT 
  ps.id,
  ps.nro_caso,
  ps.empresa,
  ps.data_resposta,
  COUNT(pa.id) as qtd_planos_acao
FROM pesquisas_satisfacao ps
LEFT JOIN planos_acao pa ON pa.pesquisa_id = ps.id
WHERE EXTRACT(YEAR FROM ps.data_resposta) = 2026
  AND EXTRACT(MONTH FROM ps.data_resposta) = 2
GROUP BY ps.id, ps.nro_caso, ps.empresa, ps.data_resposta
HAVING COUNT(pa.id) > 1
ORDER BY qtd_planos_acao DESC;
