-- Verificar dados completos da versão problemática
-- Data: 2026-01-22

SELECT 
  id,
  calculo_id,
  versao_anterior,
  versao_nova,
  dados_anteriores,
  dados_novos,
  motivo,
  tipo_mudanca,
  created_at,
  created_by
FROM banco_horas_versoes
WHERE id = '0fd5d3e9-aade-438b-8f47-f85fcf1a5e0c';

-- Verificar se há outras versões para o mesmo cálculo
SELECT 
  v.id,
  v.calculo_id,
  v.versao_nova,
  v.tipo_mudanca,
  v.motivo,
  c.empresa_id,
  c.mes,
  c.ano
FROM banco_horas_versoes v
LEFT JOIN banco_horas_calculos c ON c.id = v.calculo_id
WHERE c.empresa_id = 'bb8199f7-f447-4179-804f-0bab7525c6d2'
ORDER BY v.created_at DESC;

-- Verificar se existe cálculo para dezembro/2025
SELECT 
  id,
  empresa_id,
  mes,
  ano,
  created_at,
  updated_at
FROM banco_horas_calculos
WHERE empresa_id = 'bb8199f7-f447-4179-804f-0bab7525c6d2'
  AND mes = 12
  AND ano = 2025;
