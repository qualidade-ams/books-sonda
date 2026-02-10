-- ============================================================================
-- Script: Verificar Formato do mes_cobranca
-- ============================================================================
-- Verifica o formato exato do campo mes_cobranca nos requerimentos

-- 1. Verificar requerimento específico com empresa_segmentacao_nome = "NIQUEL"
-- ============================================================================
SELECT 
  id,
  chamado,
  empresa_segmentacao_nome,
  mes_cobranca,
  LENGTH(mes_cobranca) as tamanho_mes_cobranca,
  POSITION('/' IN mes_cobranca) as posicao_barra,
  POSITION('-' IN mes_cobranca) as posicao_hifen,
  SPLIT_PART(mes_cobranca, '/', 1) as parte_1_barra,
  SPLIT_PART(mes_cobranca, '/', 2) as parte_2_barra,
  SPLIT_PART(mes_cobranca, '-', 1) as parte_1_hifen,
  SPLIT_PART(mes_cobranca, '-', 2) as parte_2_hifen,
  horas_funcional,
  horas_tecnico,
  (horas_funcional + horas_tecnico) as total_horas,
  created_at
FROM requerimentos
WHERE cliente_id = '3f028c57-b9ca-4b07-bf9d-238ce361c7bd'  -- ANGLO
  AND empresa_segmentacao_nome = 'NIQUEL'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Verificar todos os formatos de mes_cobranca no sistema
-- ============================================================================
SELECT 
  DISTINCT mes_cobranca,
  LENGTH(mes_cobranca) as tamanho,
  CASE 
    WHEN mes_cobranca LIKE '%/%' THEN 'Formato MM/YYYY'
    WHEN mes_cobranca LIKE '%-%' THEN 'Formato YYYY-MM'
    ELSE 'Formato desconhecido'
  END as formato_detectado,
  COUNT(*) as quantidade
FROM requerimentos
WHERE mes_cobranca IS NOT NULL
GROUP BY mes_cobranca
ORDER BY mes_cobranca DESC;

-- 3. Verificar requerimentos de fevereiro/2026
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
  TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI:SS') as data_criacao
FROM requerimentos
WHERE mes_cobranca IN ('02/2026', '2026-02', '2/2026')
ORDER BY created_at DESC;

-- 4. Contar requerimentos por empresa de segmentação e mês
-- ============================================================================
SELECT 
  empresa_segmentacao_nome,
  mes_cobranca,
  COUNT(*) as total_requerimentos,
  SUM(horas_funcional) as total_funcional,
  SUM(horas_tecnico) as total_tecnico,
  SUM(horas_funcional + horas_tecnico) as total_geral
FROM requerimentos
WHERE cliente_id = '3f028c57-b9ca-4b07-bf9d-238ce361c7bd'  -- ANGLO
  AND empresa_segmentacao_nome IS NOT NULL
GROUP BY empresa_segmentacao_nome, mes_cobranca
ORDER BY empresa_segmentacao_nome, mes_cobranca;
