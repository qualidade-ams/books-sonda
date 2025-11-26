-- =====================================================
-- RESETAR ÚLTIMA SINCRONIZAÇÃO
-- =====================================================
-- Use este script para forçar uma ressincronização completa
-- =====================================================

-- Opção 1: Deletar TODOS os registros do SQL Server
-- (Use com cuidado - apaga todos os dados sincronizados)
-- DELETE FROM pesquisas_satisfacao WHERE origem = 'sql_server';

-- Opção 2: Alterar a data de criação para forçar ressincronização
-- Altera todos os registros para uma data antiga (2025-01-01)
UPDATE pesquisas_satisfacao 
SET created_at = '2025-01-01T00:00:00.000Z'
WHERE origem = 'sql_server';

-- Opção 3: Alterar apenas registros de um período específico
-- Exemplo: Alterar registros de novembro de 2025
-- UPDATE pesquisas_satisfacao 
-- SET created_at = '2025-01-01T00:00:00.000Z'
-- WHERE origem = 'sql_server'
--   AND created_at >= '2025-11-01'
--   AND created_at < '2025-12-01';

-- Verificar resultado
SELECT 
  COUNT(*) as total_registros,
  MIN(created_at) as primeira_sincronizacao,
  MAX(created_at) as ultima_sincronizacao
FROM pesquisas_satisfacao
WHERE origem = 'sql_server';

-- Mensagem de confirmação
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ÚLTIMA SINCRONIZAÇÃO RESETADA';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Próxima sincronização será INCREMENTAL';
  RAISE NOTICE '✓ Buscará registros após: 2025-01-01';
  RAISE NOTICE '========================================';
END $$;
