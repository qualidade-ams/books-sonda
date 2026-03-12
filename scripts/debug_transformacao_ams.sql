/**
 * Script para debugar transformação de clientes com "-AMS"
 * 
 * Verifica:
 * 1. Quantos registros têm "-AMS" no cliente
 * 2. Quantos têm solicitante preenchido
 * 3. Quantos foram transformados corretamente para "SONDA INTERNO"
 */

-- ============================================
-- PASSO 1: Registros com "-AMS" no cliente
-- ============================================

SELECT 
  COUNT(*) as total_com_ams,
  COUNT(CASE WHEN solicitante IS NOT NULL AND solicitante != '' THEN 1 END) as com_solicitante,
  COUNT(CASE WHEN solicitante IS NULL OR solicitante = '' THEN 1 END) as sem_solicitante
FROM pesquisas_satisfacao
WHERE origem = 'sql_server'
  AND cliente LIKE '%-%AMS%';

-- ============================================
-- PASSO 2: Verificar transformações
-- ============================================

-- Registros que DEVERIAM ser "SONDA INTERNO" mas não são
SELECT 
  id,
  empresa,
  cliente,
  solicitante,
  nro_caso,
  created_at
FROM pesquisas_satisfacao
WHERE origem = 'sql_server'
  AND cliente LIKE '%-%AMS%'
  AND empresa != 'SONDA INTERNO'
  AND (solicitante IS NOT NULL AND solicitante != '')
ORDER BY created_at DESC
LIMIT 20;

-- ============================================
-- PASSO 3: Registros corretamente transformados
-- ============================================

SELECT 
  COUNT(*) as total_transformados_corretamente
FROM pesquisas_satisfacao
WHERE origem = 'sql_server'
  AND empresa = 'SONDA INTERNO';

-- Ver exemplos de transformações corretas
SELECT 
  id,
  empresa,
  cliente,
  solicitante,
  nro_caso,
  created_at
FROM pesquisas_satisfacao
WHERE origem = 'sql_server'
  AND empresa = 'SONDA INTERNO'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- PASSO 4: Análise detalhada de casos problemáticos
-- ============================================

-- Casos com "-AMS" que não foram transformados
SELECT 
  empresa,
  cliente,
  solicitante,
  COUNT(*) as total,
  CASE 
    WHEN solicitante IS NULL OR solicitante = '' THEN 'Solicitante vazio'
    WHEN empresa = 'SONDA INTERNO' THEN 'Transformado corretamente'
    ELSE 'NÃO TRANSFORMADO (BUG!)'
  END as status_transformacao
FROM pesquisas_satisfacao
WHERE origem = 'sql_server'
  AND cliente LIKE '%-%AMS%'
GROUP BY empresa, cliente, solicitante
ORDER BY COUNT(*) DESC
LIMIT 30;

-- ============================================
-- PASSO 5: Corrigir registros não transformados
-- ============================================

-- ⚠️ EXECUTAR APENAS APÓS CONFIRMAR QUE HÁ REGISTROS INCORRETOS

-- Atualizar registros com "-AMS" que têm solicitante mas não foram transformados
UPDATE pesquisas_satisfacao
SET 
  empresa = 'SONDA INTERNO',
  cliente = solicitante,
  updated_at = NOW()
WHERE origem = 'sql_server'
  AND cliente LIKE '%-%AMS%'
  AND empresa != 'SONDA INTERNO'
  AND solicitante IS NOT NULL
  AND solicitante != ''
  AND status = 'pendente'; -- Só atualizar registros pendentes

-- Verificar quantos foram atualizados
SELECT 
  COUNT(*) as total_corrigidos
FROM pesquisas_satisfacao
WHERE origem = 'sql_server'
  AND empresa = 'SONDA INTERNO'
  AND updated_at > NOW() - INTERVAL '1 minute';

-- ============================================
-- RESUMO FINAL
-- ============================================

SELECT 
  'Total com -AMS' as metrica,
  COUNT(*) as valor
FROM pesquisas_satisfacao
WHERE origem = 'sql_server'
  AND cliente LIKE '%-%AMS%'

UNION ALL

SELECT 
  'Transformados para SONDA INTERNO' as metrica,
  COUNT(*) as valor
FROM pesquisas_satisfacao
WHERE origem = 'sql_server'
  AND empresa = 'SONDA INTERNO'

UNION ALL

SELECT 
  'NÃO transformados (com solicitante)' as metrica,
  COUNT(*) as valor
FROM pesquisas_satisfacao
WHERE origem = 'sql_server'
  AND cliente LIKE '%-%AMS%'
  AND empresa != 'SONDA INTERNO'
  AND solicitante IS NOT NULL
  AND solicitante != ''

UNION ALL

SELECT 
  'NÃO transformados (sem solicitante)' as metrica,
  COUNT(*) as valor
FROM pesquisas_satisfacao
WHERE origem = 'sql_server'
  AND cliente LIKE '%-%AMS%'
  AND empresa != 'SONDA INTERNO'
  AND (solicitante IS NULL OR solicitante = '');
