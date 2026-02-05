-- Query para verificar os dados da EXXONMOBIL na tabela taxas_clientes
-- Execute no Supabase SQL Editor para verificar se os dados estão corretos

-- 1. Verificar se existe registro para EXXONMOBIL
SELECT 
  tc.id,
  tc.cliente_id,
  ec.nome_abreviado,
  ec.nome_completo,
  tc.ticket_excedente_simples,
  tc.created_at,
  tc.updated_at
FROM taxas_clientes tc
JOIN empresas_clientes ec ON tc.cliente_id = ec.id
WHERE ec.nome_abreviado ILIKE '%EXXON%' 
   OR ec.nome_completo ILIKE '%EXXON%';

-- 2. Verificar todos os registros da tabela taxas_clientes
SELECT 
  tc.id,
  tc.cliente_id,
  ec.nome_abreviado,
  tc.ticket_excedente_simples
FROM taxas_clientes tc
JOIN empresas_clientes ec ON tc.cliente_id = ec.id
ORDER BY ec.nome_abreviado;

-- 3. Verificar se o campo ticket_excedente_simples existe na tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'taxas_clientes'
  AND column_name = 'ticket_excedente_simples';

-- 4. Verificar empresas ativas com AMS (que aparecem no banco de horas)
SELECT 
  id,
  nome_abreviado,
  nome_completo,
  status,
  tem_ams,
  template_padrao
FROM empresas_clientes
WHERE status = 'ativo' 
  AND tem_ams = true
  AND (nome_abreviado ILIKE '%EXXON%' OR nome_completo ILIKE '%EXXON%');