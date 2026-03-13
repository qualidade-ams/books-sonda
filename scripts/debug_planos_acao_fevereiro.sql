-- Script para debugar planos de ação de fevereiro/2026
-- Verificar quantos planos de ação existem e suas datas

-- 1. Total de planos de ação criados em fevereiro/2026
SELECT 
  COUNT(*) as total_planos_fevereiro,
  'Planos de ação criados em fevereiro/2026' as descricao
FROM planos_acao
WHERE EXTRACT(YEAR FROM criado_em) = 2026
  AND EXTRACT(MONTH FROM criado_em) = 2;

-- 2. Planos de ação com pesquisas que têm data_resposta em fevereiro/2026
SELECT 
  COUNT(DISTINCT pa.id) as planos_com_pesquisa_fevereiro,
  'Planos de ação com pesquisa respondida em fevereiro/2026' as descricao
FROM planos_acao pa
INNER JOIN pesquisas_satisfacao ps ON ps.id = pa.pesquisa_id
WHERE EXTRACT(YEAR FROM ps.data_resposta) = 2026
  AND EXTRACT(MONTH FROM ps.data_resposta) = 2;

-- 3. Detalhes dos planos de ação e suas pesquisas
SELECT 
  pa.id as plano_id,
  pa.criado_em as plano_criado_em,
  ps.id as pesquisa_id,
  ps.nro_caso,
  ps.empresa,
  ps.data_resposta,
  ps.data_fechamento,
  ps.status as pesquisa_status
FROM planos_acao pa
INNER JOIN pesquisas_satisfacao ps ON ps.id = pa.pesquisa_id
WHERE EXTRACT(YEAR FROM ps.data_resposta) = 2026
  AND EXTRACT(MONTH FROM ps.data_resposta) = 2
ORDER BY ps.data_resposta;

-- 4. Comparar: planos criados em fevereiro vs pesquisas respondidas em fevereiro
SELECT 
  'Planos criados em fevereiro' as tipo,
  COUNT(*) as quantidade
FROM planos_acao
WHERE EXTRACT(YEAR FROM criado_em) = 2026
  AND EXTRACT(MONTH FROM criado_em) = 2

UNION ALL

SELECT 
  'Pesquisas respondidas em fevereiro com plano' as tipo,
  COUNT(DISTINCT pa.id) as quantidade
FROM planos_acao pa
INNER JOIN pesquisas_satisfacao ps ON ps.id = pa.pesquisa_id
WHERE EXTRACT(YEAR FROM ps.data_resposta) = 2026
  AND EXTRACT(MONTH FROM ps.data_resposta) = 2;

-- 5. Verificar se há planos de ação sem pesquisa associada
SELECT 
  COUNT(*) as planos_sem_pesquisa
FROM planos_acao pa
LEFT JOIN pesquisas_satisfacao ps ON ps.id = pa.pesquisa_id
WHERE ps.id IS NULL;
