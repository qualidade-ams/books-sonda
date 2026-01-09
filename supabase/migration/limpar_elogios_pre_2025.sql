-- ============================================
-- LIMPAR PESQUISAS ANTERIORES A 2025
-- ============================================
-- Remove registros anteriores a 2025 para forçar
-- sincronização completa de todos os dados de 2025

-- 1. Verificar quantos registros existem antes de 2025
SELECT 
  COUNT(*) as total_pre_2025,
  MIN(data_resposta) as data_mais_antiga,
  MAX(data_resposta) as data_mais_recente
FROM pesquisas
WHERE data_resposta < '2026-01-01T00:00:00.000Z';

-- 2. Deletar registros anteriores a 2025 (se houver)
DELETE FROM pesquisas
WHERE data_resposta < '2026-01-01T00:00:00.000Z';

-- 3. Verificar registros restantes
SELECT 
  COUNT(*) as total_registros,
  MIN(data_resposta) as data_mais_antiga,
  MAX(data_resposta) as data_mais_recente,
  COUNT(DISTINCT DATE(data_resposta)) as dias_com_dados
FROM pesquisas;

-- 4. Verificar por origem
SELECT 
  origem,
  COUNT(*) as total,
  MIN(data_resposta) as primeira_data,
  MAX(data_resposta) as ultima_data
FROM pesquisas
GROUP BY origem;

-- Mensagem
SELECT '✅ Banco limpo - Pronto para sincronizar todos os dados de 2026!' as status;
