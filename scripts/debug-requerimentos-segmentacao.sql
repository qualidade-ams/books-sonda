-- ============================================================================
-- Script: Debug Requerimentos com Segmentação
-- ============================================================================

-- 1. Verificar requerimentos do cliente ANGLO
-- ============================================================================
SELECT 
  id,
  chamado,
  cliente_id,
  empresa_segmentacao_nome,
  mes_cobranca,
  horas_funcional,
  horas_tecnico,
  tipo_cobranca,
  created_at
FROM requerimentos
WHERE cliente_id = '3f028c57-b9ca-4b07-bf9d-238ce361c7bd'  -- ANGLO
ORDER BY created_at DESC
LIMIT 10;

-- 2. Contar requerimentos por empresa de segmentação
-- ============================================================================
SELECT 
  empresa_segmentacao_nome,
  COUNT(*) as total,
  SUM(horas_funcional) as total_funcional,
  SUM(horas_tecnico) as total_tecnico
FROM requerimentos
WHERE cliente_id = '3f028c57-b9ca-4b07-bf9d-238ce361c7bd'  -- ANGLO
  AND empresa_segmentacao_nome IS NOT NULL
GROUP BY empresa_segmentacao_nome;

-- 3. Verificar requerimentos por mês e empresa
-- ============================================================================
SELECT 
  empresa_segmentacao_nome,
  mes_cobranca,
  COUNT(*) as total,
  SUM(horas_funcional) as total_funcional,
  SUM(horas_tecnico) as total_tecnico,
  SUM(horas_funcional + horas_tecnico) as total_geral
FROM requerimentos
WHERE cliente_id = '3f028c57-b9ca-4b07-bf9d-238ce361c7bd'  -- ANGLO
  AND empresa_segmentacao_nome IS NOT NULL
GROUP BY empresa_segmentacao_nome, mes_cobranca
ORDER BY empresa_segmentacao_nome, mes_cobranca;

-- 4. Verificar formato do campo mes_cobranca
-- ============================================================================
SELECT 
  DISTINCT mes_cobranca,
  COUNT(*) as quantidade
FROM requerimentos
WHERE cliente_id = '3f028c57-b9ca-4b07-bf9d-238ce361c7bd'  -- ANGLO
GROUP BY mes_cobranca
ORDER BY mes_cobranca;

-- 5. Verificar se há requerimentos sem empresa_segmentacao_nome
-- ============================================================================
SELECT 
  COUNT(*) as total_sem_segmentacao,
  SUM(horas_funcional + horas_tecnico) as horas_sem_segmentacao
FROM requerimentos
WHERE cliente_id = '3f028c57-b9ca-4b07-bf9d-238ce361c7bd'  -- ANGLO
  AND empresa_segmentacao_nome IS NULL;

-- 6. Listar todos os requerimentos com detalhes
-- ============================================================================
SELECT 
  chamado,
  empresa_segmentacao_nome,
  mes_cobranca,
  horas_funcional,
  horas_tecnico,
  (horas_funcional + horas_tecnico) as total_horas,
  tipo_cobranca,
  TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as data_criacao
FROM requerimentos
WHERE cliente_id = '3f028c57-b9ca-4b07-bf9d-238ce361c7bd'  -- ANGLO
ORDER BY created_at DESC;
