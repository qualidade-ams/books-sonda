-- Script para confirmar o cálculo do valor 13 no card "% Insatisfação (Respondidas)"
-- Este valor representa: pesquisas com data_resposta em fevereiro/2026 que têm plano de ação

-- 1. Pesquisas com data_resposta em fevereiro/2026 que têm plano de ação
SELECT 
  COUNT(DISTINCT ps.id) as pesquisas_com_plano_acao,
  'Pesquisas com data_resposta em fevereiro/2026 que têm plano de ação' as descricao
FROM pesquisas_satisfacao ps
INNER JOIN planos_acao pa ON pa.pesquisa_id = ps.id
WHERE EXTRACT(YEAR FROM ps.data_resposta) = 2026
  AND EXTRACT(MONTH FROM ps.data_resposta) = 2;

-- 2. Total de pesquisas com data_resposta em fevereiro/2026
SELECT 
  COUNT(*) as total_pesquisas_respondidas,
  'Total de pesquisas com data_resposta em fevereiro/2026' as descricao
FROM pesquisas_satisfacao
WHERE EXTRACT(YEAR FROM data_resposta) = 2026
  AND EXTRACT(MONTH FROM data_resposta) = 2;

-- 3. Cálculo da porcentagem (deve dar o valor exibido no card)
SELECT 
  COUNT(DISTINCT ps.id) FILTER (WHERE pa.id IS NOT NULL) as numerador,
  COUNT(*) as denominador,
  ROUND(
    (COUNT(DISTINCT ps.id) FILTER (WHERE pa.id IS NOT NULL)::numeric / COUNT(*)::numeric) * 100,
    1
  ) as percentual
FROM pesquisas_satisfacao ps
LEFT JOIN planos_acao pa ON pa.pesquisa_id = ps.id
WHERE EXTRACT(YEAR FROM ps.data_resposta) = 2026
  AND EXTRACT(MONTH FROM ps.data_resposta) = 2;

-- 4. Detalhes das 13 pesquisas com plano de ação
SELECT 
  ps.id,
  ps.nro_caso,
  ps.empresa,
  ps.prestador,
  ps.data_resposta,
  ps.status as pesquisa_status,
  pa.id as plano_acao_id,
  pa.status_plano,
  pa.criado_em as plano_criado_em
FROM pesquisas_satisfacao ps
INNER JOIN planos_acao pa ON pa.pesquisa_id = ps.id
WHERE EXTRACT(YEAR FROM ps.data_resposta) = 2026
  AND EXTRACT(MONTH FROM ps.data_resposta) = 2
ORDER BY ps.data_resposta;

-- 5. Verificar se há pesquisas com múltiplos planos de ação
SELECT 
  ps.id,
  ps.nro_caso,
  ps.empresa,
  COUNT(pa.id) as qtd_planos
FROM pesquisas_satisfacao ps
INNER JOIN planos_acao pa ON pa.pesquisa_id = ps.id
WHERE EXTRACT(YEAR FROM ps.data_resposta) = 2026
  AND EXTRACT(MONTH FROM ps.data_resposta) = 2
GROUP BY ps.id, ps.nro_caso, ps.empresa
HAVING COUNT(pa.id) > 1;
