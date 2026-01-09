-- =====================================================
-- AJUSTAR SINCRONIZAÇÃO PARA 01/01/2026
-- =====================================================
-- Este script fará com que a próxima sincronização busque
-- apenas registros a partir de 01/01/2026 (ao invés de 2024)
-- =====================================================

-- SITUAÇÃO ATUAL: Buscando desde 01/01/2024
-- OBJETIVO: Buscar apenas a partir de 01/01/2026

-- IMPORTANTE: Escolha UMA das opções abaixo

-- Opção 1: Deletar TODOS os registros do SQL Server
-- (Use com cuidado - apaga todos os dados sincronizados desde 2024)
-- DELETE FROM pesquisas_satisfacao WHERE origem = 'sql_server';

-- Opção 2: Alterar a data de criação para 01/01/2026 (RECOMENDADO)
-- Altera todos os registros existentes para 2026-01-01
-- Próxima sincronização buscará apenas registros APÓS essa data
UPDATE pesquisas_satisfacao 
SET created_at = '2026-01-01T00:00:00.000Z'
WHERE origem = 'sql_server';

-- Opção 3: Deletar apenas registros antigos (antes de 2026)
-- Mantém registros de 2026 em diante, se existirem
-- DELETE FROM pesquisas_satisfacao 
-- WHERE origem = 'sql_server' 
--   AND created_at < '2026-01-01T00:00:00.000Z';

-- Verificar resultado ANTES da execução
SELECT 
  'ANTES DA ALTERAÇÃO' as status,
  COUNT(*) as total_registros,
  MIN(created_at) as primeira_sincronizacao,
  MAX(created_at) as ultima_sincronizacao,
  COUNT(*) FILTER (WHERE created_at >= '2024-01-01' AND created_at < '2026-01-01') as registros_2024_2025,
  COUNT(*) FILTER (WHERE created_at >= '2026-01-01') as registros_2026_em_diante
FROM pesquisas_satisfacao
WHERE origem = 'sql_server';

-- Verificar resultado APÓS a execução
SELECT 
  'APÓS A ALTERAÇÃO' as status,
  COUNT(*) as total_registros,
  MIN(created_at) as primeira_sincronizacao,
  MAX(created_at) as ultima_sincronizacao,
  COUNT(*) FILTER (WHERE created_at >= '2026-01-01') as registros_2026_em_diante
FROM pesquisas_satisfacao
WHERE origem = 'sql_server';

-- Mensagem de confirmação
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SINCRONIZAÇÃO AJUSTADA PARA 2026';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Próxima sincronização será INCREMENTAL';
  RAISE NOTICE '✓ Buscará registros após: 2026-01-01';
  RAISE NOTICE '✓ Não buscará mais registros de 2024/2025';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'IMPORTANTE:';
  RAISE NOTICE '- Execute uma nova sincronização no sistema';
  RAISE NOTICE '- Verifique se está buscando apenas dados de 2026+';
  RAISE NOTICE '========================================';
END $$;