-- =====================================================
-- LIMPAR REGISTROS COM GRUPO "AMS SAP%"
-- =====================================================
-- Remove registros existentes que foram importados antes
-- do filtro ser implementado na API de sincronização
-- =====================================================

-- 1. Verificar quantos registros serão deletados
SELECT 
  COUNT(*) as total_para_deletar,
  COUNT(DISTINCT empresa) as empresas_afetadas,
  COUNT(DISTINCT cliente) as clientes_afetados
FROM pesquisas_satisfacao
WHERE grupo LIKE 'AMS SAP%';

-- 2. Ver exemplos dos registros que serão deletados
SELECT 
  id,
  empresa,
  grupo,
  cliente,
  nro_caso,
  data_resposta,
  created_at
FROM pesquisas_satisfacao
WHERE grupo LIKE 'AMS SAP%'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Listar todos os grupos que começam com "AMS SAP"
SELECT 
  grupo,
  COUNT(*) as quantidade
FROM pesquisas_satisfacao
WHERE grupo LIKE 'AMS SAP%'
GROUP BY grupo
ORDER BY quantidade DESC;

-- =====================================================
-- EXECUTAR LIMPEZA
-- =====================================================

-- 4. Deletar registros com grupo "AMS SAP%"
DELETE FROM pesquisas_satisfacao
WHERE grupo LIKE 'AMS SAP%';

-- =====================================================
-- VERIFICAÇÃO PÓS-LIMPEZA
-- =====================================================

-- 5. Verificar se ainda existem registros com "AMS SAP%"
SELECT COUNT(*) as registros_restantes
FROM pesquisas_satisfacao
WHERE grupo LIKE 'AMS SAP%';
-- Deve retornar 0

-- 6. Verificar total de registros após limpeza
SELECT 
  COUNT(*) as total_registros,
  COUNT(*) FILTER (WHERE origem = 'sql_server') as sql_server,
  COUNT(*) FILTER (WHERE origem = 'manual') as manual
FROM pesquisas_satisfacao;

-- 7. Listar grupos únicos restantes
SELECT 
  grupo,
  COUNT(*) as quantidade
FROM pesquisas_satisfacao
WHERE grupo IS NOT NULL
GROUP BY grupo
ORDER BY quantidade DESC
LIMIT 20;

-- =====================================================
-- LOG DE EXECUÇÃO
-- =====================================================
DO $$
DECLARE
  registros_deletados INTEGER;
BEGIN
  -- Contar registros deletados
  SELECT COUNT(*) INTO registros_deletados
  FROM pesquisas_satisfacao
  WHERE grupo LIKE 'AMS SAP%';
  
  IF registros_deletados > 0 THEN
    RAISE NOTICE '⚠️ ATENÇÃO: % registros com grupo "AMS SAP%%" foram encontrados', registros_deletados;
    RAISE NOTICE '✅ Execute o DELETE acima para remover esses registros';
  ELSE
    RAISE NOTICE '✅ Nenhum registro com grupo "AMS SAP%%" encontrado';
    RAISE NOTICE '✅ Banco de dados limpo!';
  END IF;
END $$;
