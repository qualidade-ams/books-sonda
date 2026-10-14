-- Encontrar o calculo_id correto e atualizar o reajuste
-- Data: 2026-01-22

-- 1. Verificar se existe cálculo para dezembro/2025
SELECT 
  id as calculo_id,
  empresa_id,
  mes,
  ano,
  created_at
FROM banco_horas_calculos
WHERE empresa_id = 'bb8199f7-f447-4179-804f-0bab7525c6d2'
  AND mes = 12
  AND ano = 2025
ORDER BY created_at DESC;

-- 2. Se existir, atualizar o reajuste com o calculo_id correto
-- IMPORTANTE: Execute apenas se o SELECT acima retornar um resultado!
-- Substitua 'CALCULO_ID_AQUI' pelo ID retornado acima

/*
UPDATE banco_horas_reajustes
SET calculo_id = 'CALCULO_ID_AQUI'
WHERE id = '7824e294-47d0-4e26-972a-6817edaf020e';
*/

-- 3. Verificar se foi atualizado
SELECT 
  r.id,
  r.calculo_id,
  r.mes,
  r.ano,
  r.tipo_reajuste,
  r.observacao,
  c.id as calculo_existe
FROM banco_horas_reajustes r
LEFT JOIN banco_horas_calculos c ON c.id = r.calculo_id
WHERE r.id = '7824e294-47d0-4e26-972a-6817edaf020e';
