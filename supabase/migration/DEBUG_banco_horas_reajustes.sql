-- Script de Debug: Verificar dados na tabela banco_horas_reajustes
-- Data: 2026-01-22

-- 1. Verificar estrutura da tabela
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'banco_horas_reajustes'
ORDER BY ordinal_position;

-- 2. Verificar dados existentes
SELECT 
  id,
  calculo_id,
  empresa_id,
  mes,
  ano,
  tipo_reajuste,
  observacao,
  valor_reajuste_horas,
  ativo,
  created_at,
  created_by
FROM banco_horas_reajustes
ORDER BY created_at DESC
LIMIT 10;

-- 3. Verificar se há reajustes ativos
SELECT 
  COUNT(*) as total_reajustes,
  COUNT(CASE WHEN ativo = true THEN 1 END) as reajustes_ativos,
  COUNT(CASE WHEN calculo_id IS NOT NULL THEN 1 END) as com_calculo_id
FROM banco_horas_reajustes;

-- 4. Verificar relação com banco_horas_versoes
SELECT 
  v.id as versao_id,
  v.versao_nova,
  v.tipo_mudanca,
  v.calculo_id,
  v.motivo,
  r.id as reajuste_id,
  r.tipo_reajuste,
  r.observacao,
  r.ativo
FROM banco_horas_versoes v
LEFT JOIN banco_horas_reajustes r ON r.calculo_id = v.calculo_id AND r.ativo = true
WHERE v.tipo_mudanca = 'reajuste'
ORDER BY v.created_at DESC
LIMIT 10;

-- 5. Verificar se campo observacao existe e tem dados
SELECT 
  id,
  calculo_id,
  tipo_reajuste,
  CASE 
    WHEN observacao IS NULL THEN 'NULL'
    WHEN observacao = '' THEN 'VAZIO'
    ELSE 'TEM DADOS: ' || LEFT(observacao, 50)
  END as status_observacao,
  LENGTH(observacao) as tamanho_observacao
FROM banco_horas_reajustes
WHERE ativo = true
ORDER BY created_at DESC
LIMIT 10;
