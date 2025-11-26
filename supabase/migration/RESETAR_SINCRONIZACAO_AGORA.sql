-- =====================================================
-- RESETAR SINCRONIZAÇÃO PARA 2025-01-01
-- =====================================================
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- Passo 1: Deletar TODOS os registros sincronizados do SQL Server
DELETE FROM pesquisas_satisfacao 
WHERE origem = 'sql_server';

-- Passo 2: Verificar se foi deletado
SELECT 
  COUNT(*) as registros_restantes,
  COUNT(*) FILTER (WHERE origem = 'sql_server') as sql_server_restantes,
  COUNT(*) FILTER (WHERE origem = 'manual') as manuais_restantes
FROM pesquisas_satisfacao;

-- Passo 3: Confirmar
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pesquisas_satisfacao
  WHERE origem = 'sql_server';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESULTADO DO RESET';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Registros SQL Server restantes: %', v_count;
  
  IF v_count = 0 THEN
    RAISE NOTICE '✓ Todos os registros do SQL Server foram deletados';
    RAISE NOTICE '✓ Próxima sincronização será COMPLETA';
    RAISE NOTICE '✓ Buscará todos os registros desde 2025-01-01';
  ELSE
    RAISE WARNING '⚠ Ainda existem % registros', v_count;
  END IF;
  
  RAISE NOTICE '========================================';
END $$;
