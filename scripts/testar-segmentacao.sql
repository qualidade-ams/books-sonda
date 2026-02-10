-- ============================================================================
-- Script: Testar Segmentação de Empresas
-- ============================================================================

-- 1. Verificar estrutura da coluna
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'requerimentos'
  AND column_name LIKE '%segmentacao%'
ORDER BY column_name;

-- 2. Verificar se a view foi criada corretamente
-- ============================================================================
SELECT 
  table_name,
  view_definition
FROM information_schema.views
WHERE table_name = 'vw_requerimentos_completo';

-- 3. Testar a view (buscar últimos 5 requerimentos)
-- ============================================================================
SELECT 
  id,
  chamado,
  cliente_nome,
  empresa_segmentacao_nome,
  created_at
FROM vw_requerimentos_completo
ORDER BY created_at DESC
LIMIT 5;

-- 4. Verificar cliente ANGLO e suas configurações
-- ============================================================================
SELECT 
  id,
  nome_abreviado,
  baseline_segmentado,
  segmentacao_config
FROM empresas_clientes
WHERE nome_abreviado = 'ANGLO';
