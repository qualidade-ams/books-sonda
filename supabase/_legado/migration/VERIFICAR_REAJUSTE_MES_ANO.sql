-- Verificar mês e ano do reajuste existente
SELECT 
  id,
  empresa_id,
  mes,
  ano,
  tipo_reajuste,
  observacao,
  valor_reajuste_horas,
  calculo_id,
  ativo,
  created_at
FROM banco_horas_reajustes
WHERE empresa_id = 'bb8199f7-f447-4179-804f-0bab7525c6d2'
  AND ativo = true
ORDER BY created_at DESC;

-- Verificar versões existentes
SELECT 
  v.id,
  v.versao_nova,
  v.tipo_mudanca,
  v.motivo,
  v.calculo_id,
  c.mes,
  c.ano,
  c.empresa_id
FROM banco_horas_versoes v
LEFT JOIN banco_horas c ON c.id = v.calculo_id
WHERE c.empresa_id = 'bb8199f7-f447-4179-804f-0bab7525c6d2'
ORDER BY v.created_at DESC;
