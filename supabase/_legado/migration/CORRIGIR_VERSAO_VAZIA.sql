-- Corrigir versão que foi criada vazia
-- Data: 2026-01-22

-- Atualizar a versão com os dados corretos
UPDATE banco_horas_versoes
SET 
  calculo_id = 'e1b9c8bc-1315-46fc-b67e-212d80e6823c',
  versao_anterior = 0,
  versao_nova = 1,
  tipo_mudanca = 'reajuste',
  motivo = 'Reajuste manual aplicado',
  dados_anteriores = '{}',
  dados_novos = jsonb_build_object(
    'empresa_id', 'bb8199f7-f447-4179-804f-0bab7525c6d2',
    'mes', 12,
    'ano', 2025,
    'reajuste_aplicado', true
  )
WHERE id = '0fd5d3e9-aade-438b-8f47-f85fcf1a5e0c';

-- Verificar se foi atualizado
SELECT 
  id,
  calculo_id,
  versao_anterior,
  versao_nova,
  tipo_mudanca,
  motivo,
  dados_novos,
  created_at
FROM banco_horas_versoes
WHERE id = '0fd5d3e9-aade-438b-8f47-f85fcf1a5e0c';

-- Verificar relacionamento com reajuste
SELECT 
  v.id as versao_id,
  v.versao_nova,
  v.tipo_mudanca,
  v.motivo,
  v.calculo_id,
  r.id as reajuste_id,
  r.tipo_reajuste,
  r.observacao,
  r.valor_reajuste_horas
FROM banco_horas_versoes v
LEFT JOIN banco_horas_reajustes r ON r.calculo_id = v.calculo_id AND r.ativo = true
WHERE v.id = '0fd5d3e9-aade-438b-8f47-f85fcf1a5e0c';
