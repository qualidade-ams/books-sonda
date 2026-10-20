-- Corrigir calculo_id da versão que está NULL
-- Data: 2026-01-22

-- 1. Verificar versões com calculo_id NULL
SELECT 
  v.id as versao_id,
  v.versao_nova,
  v.versao_anterior,
  v.tipo_mudanca,
  v.motivo,
  v.calculo_id,
  v.created_at,
  v.dados_novos->>'empresa_id' as empresa_id_dados,
  v.dados_novos->>'mes' as mes_dados,
  v.dados_novos->>'ano' as ano_dados
FROM banco_horas_versoes v
WHERE v.calculo_id IS NULL
ORDER BY v.created_at DESC;

-- 2. Encontrar o calculo_id correto baseado nos dados da versão
-- Vamos usar os dados de empresa_id, mes e ano dos dados_novos
SELECT 
  v.id as versao_id,
  v.versao_nova,
  v.dados_novos->>'empresa_id' as empresa_id,
  v.dados_novos->>'mes' as mes,
  v.dados_novos->>'ano' as ano,
  c.id as calculo_id_correto,
  c.created_at as calculo_created_at
FROM banco_horas_versoes v
LEFT JOIN banco_horas_calculos c ON 
  c.empresa_id::text = v.dados_novos->>'empresa_id'
  AND c.mes::text = v.dados_novos->>'mes'
  AND c.ano::text = v.dados_novos->>'ano'
WHERE v.calculo_id IS NULL
ORDER BY v.created_at DESC;

-- 3. Atualizar a versão com o calculo_id correto
-- IMPORTANTE: Verifique o resultado do SELECT acima antes de executar!
-- Substitua os valores conforme necessário

/*
UPDATE banco_horas_versoes
SET calculo_id = 'e1b9c8bc-1315-46fc-b67e-212d80e6823c'
WHERE id = 'ID_DA_VERSAO_AQUI'
  AND calculo_id IS NULL;
*/

-- 4. Verificar se foi atualizado
SELECT 
  v.id as versao_id,
  v.versao_nova,
  v.calculo_id,
  v.tipo_mudanca,
  c.mes,
  c.ano,
  c.empresa_id
FROM banco_horas_versoes v
LEFT JOIN banco_horas_calculos c ON c.id = v.calculo_id
ORDER BY v.created_at DESC
LIMIT 5;
