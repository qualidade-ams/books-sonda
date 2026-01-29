-- =====================================================
-- CORREÇÃO: Remover duplicatas de pesquisas_satisfacao
-- =====================================================
-- Objetivo: Limpar registros duplicados antes de criar índice único
-- Data: 2026-01-29
-- =====================================================

-- Passo 1: Verificar duplicatas existentes
DO $$
DECLARE
  v_total_duplicatas INTEGER;
  v_total_registros INTEGER;
BEGIN
  -- Contar total de registros
  SELECT COUNT(*) INTO v_total_registros
  FROM pesquisas_satisfacao
  WHERE origem = 'sql_server';
  
  -- Contar duplicatas
  SELECT COUNT(*) INTO v_total_duplicatas
  FROM (
    SELECT chave_unica, COUNT(*) as total
    FROM pesquisas_satisfacao
    WHERE origem = 'sql_server' 
      AND chave_unica IS NOT NULL
    GROUP BY chave_unica
    HAVING COUNT(*) > 1
  ) duplicatas;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 DIAGNÓSTICO DE DUPLICATAS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de registros SQL Server: %', v_total_registros;
  RAISE NOTICE 'Chaves únicas duplicadas: %', v_total_duplicatas;
  RAISE NOTICE '========================================';
END $$;

-- Passo 2: Listar algumas duplicatas para análise
SELECT 
  chave_unica,
  COUNT(*) as total_duplicatas,
  MIN(created_at) as primeira_criacao,
  MAX(updated_at) as ultima_atualizacao,
  array_agg(id ORDER BY updated_at DESC) as ids
FROM pesquisas_satisfacao
WHERE origem = 'sql_server' 
  AND chave_unica IS NOT NULL
GROUP BY chave_unica
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 10;

-- Passo 3: Remover duplicatas mantendo apenas o registro mais recente
-- ATENÇÃO: Esta operação é IRREVERSÍVEL!
-- Certifique-se de ter backup antes de executar

DO $$
DECLARE
  v_duplicatas_removidas INTEGER := 0;
  v_registros_mantidos INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '🧹 INICIANDO LIMPEZA DE DUPLICATAS';
  RAISE NOTICE '========================================';
  
  -- Criar tabela temporária com IDs a serem removidos
  CREATE TEMP TABLE IF NOT EXISTS temp_ids_remover AS
  WITH duplicatas AS (
    SELECT 
      id,
      chave_unica,
      updated_at,
      created_at,
      ROW_NUMBER() OVER (
        PARTITION BY chave_unica 
        ORDER BY 
          updated_at DESC NULLS LAST,
          created_at DESC NULLS LAST,
          id DESC
      ) as rn
    FROM pesquisas_satisfacao
    WHERE origem = 'sql_server' 
      AND chave_unica IS NOT NULL
  )
  SELECT id, chave_unica
  FROM duplicatas 
  WHERE rn > 1;
  
  -- Contar registros a serem removidos
  SELECT COUNT(*) INTO v_duplicatas_removidas
  FROM temp_ids_remover;
  
  RAISE NOTICE '📊 Registros duplicados encontrados: %', v_duplicatas_removidas;
  
  -- Remover duplicatas
  IF v_duplicatas_removidas > 0 THEN
    DELETE FROM pesquisas_satisfacao
    WHERE id IN (SELECT id FROM temp_ids_remover);
    
    GET DIAGNOSTICS v_duplicatas_removidas = ROW_COUNT;
    
    RAISE NOTICE '✅ Duplicatas removidas: %', v_duplicatas_removidas;
  ELSE
    RAISE NOTICE '✅ Nenhuma duplicata encontrada';
  END IF;
  
  -- Contar registros mantidos
  SELECT COUNT(*) INTO v_registros_mantidos
  FROM pesquisas_satisfacao
  WHERE origem = 'sql_server';
  
  RAISE NOTICE '📊 Registros mantidos: %', v_registros_mantidos;
  RAISE NOTICE '========================================';
  
  -- Limpar tabela temporária
  DROP TABLE IF EXISTS temp_ids_remover;
END $$;

-- Passo 4: Verificar se ainda existem duplicatas
DO $$
DECLARE
  v_duplicatas_restantes INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_duplicatas_restantes
  FROM (
    SELECT chave_unica, COUNT(*) as total
    FROM pesquisas_satisfacao
    WHERE origem = 'sql_server' 
      AND chave_unica IS NOT NULL
    GROUP BY chave_unica
    HAVING COUNT(*) > 1
  ) duplicatas;
  
  IF v_duplicatas_restantes > 0 THEN
    RAISE WARNING '⚠️ ATENÇÃO: Ainda existem % chaves duplicadas!', v_duplicatas_restantes;
    RAISE WARNING '⚠️ Execute este script novamente ou investigue manualmente';
  ELSE
    RAISE NOTICE '✅ Nenhuma duplicata restante - banco limpo!';
  END IF;
END $$;

-- Passo 5: Tentar criar índice único (se ainda não existir)
DO $$
BEGIN
  -- Verificar se índice já existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_pesquisas_chave_unica_unique'
  ) THEN
    -- Criar índice único
    CREATE UNIQUE INDEX idx_pesquisas_chave_unica_unique 
    ON pesquisas_satisfacao(chave_unica) 
    WHERE origem = 'sql_server' AND chave_unica IS NOT NULL;
    
    RAISE NOTICE '✅ Índice único criado com sucesso';
  ELSE
    RAISE NOTICE 'ℹ️ Índice único já existe';
  END IF;
EXCEPTION
  WHEN unique_violation THEN
    RAISE WARNING '⚠️ Ainda existem duplicatas! Execute os passos anteriores novamente';
  WHEN OTHERS THEN
    RAISE WARNING '⚠️ Erro ao criar índice: %', SQLERRM;
END $$;

-- Passo 6: Relatório final
DO $$
DECLARE
  v_total_registros INTEGER;
  v_com_chave_unica INTEGER;
  v_sem_chave_unica INTEGER;
  v_duplicatas INTEGER;
BEGIN
  -- Contar registros
  SELECT COUNT(*) INTO v_total_registros
  FROM pesquisas_satisfacao
  WHERE origem = 'sql_server';
  
  SELECT COUNT(*) INTO v_com_chave_unica
  FROM pesquisas_satisfacao
  WHERE origem = 'sql_server' AND chave_unica IS NOT NULL;
  
  SELECT COUNT(*) INTO v_sem_chave_unica
  FROM pesquisas_satisfacao
  WHERE origem = 'sql_server' AND chave_unica IS NULL;
  
  SELECT COUNT(*) INTO v_duplicatas
  FROM (
    SELECT chave_unica, COUNT(*) as total
    FROM pesquisas_satisfacao
    WHERE origem = 'sql_server' 
      AND chave_unica IS NOT NULL
    GROUP BY chave_unica
    HAVING COUNT(*) > 1
  ) dup;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 RELATÓRIO FINAL';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de registros SQL Server: %', v_total_registros;
  RAISE NOTICE 'Com chave_unica: %', v_com_chave_unica;
  RAISE NOTICE 'Sem chave_unica: %', v_sem_chave_unica;
  RAISE NOTICE 'Duplicatas restantes: %', v_duplicatas;
  RAISE NOTICE '========================================';
  
  IF v_duplicatas = 0 THEN
    RAISE NOTICE '✅ SUCESSO: Banco limpo e pronto para sincronização incremental!';
  ELSE
    RAISE WARNING '⚠️ ATENÇÃO: Ainda existem duplicatas - execute novamente';
  END IF;
END $$;
