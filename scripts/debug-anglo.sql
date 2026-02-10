-- ============================================================================
-- Script: Debug Cliente ANGLO
-- ============================================================================

-- 1. Verificar dados do cliente ANGLO
-- ============================================================================
SELECT 
  id,
  nome_abreviado,
  baseline_segmentado,
  segmentacao_config,
  ativo
FROM empresas_clientes
WHERE nome_abreviado = 'ANGLO';

-- 2. Verificar se o campo baseline_segmentado existe
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'empresas_clientes'
  AND column_name IN ('baseline_segmentado', 'segmentacao_config')
ORDER BY column_name;

-- 3. Listar todos os clientes com baseline_segmentado = true
-- ============================================================================
SELECT 
  id,
  nome_abreviado,
  baseline_segmentado,
  segmentacao_config
FROM empresas_clientes
WHERE baseline_segmentado = true;
