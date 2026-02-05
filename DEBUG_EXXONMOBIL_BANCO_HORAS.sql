-- Script de debug para verificar configuração da ExxonMobil no Banco de Horas

-- 1. Verificar dados da empresa ExxonMobil
SELECT 
  id,
  nome_completo,
  nome_abreviado,
  status,
  tem_ams,
  tipo_contrato,
  periodo_apuracao,
  inicio_vigencia,
  percentual_repasse_mensal
FROM empresas_clientes
WHERE nome_abreviado ILIKE '%exxon%' OR nome_completo ILIKE '%exxon%';

-- 2. Verificar se há cálculos de banco de horas para ExxonMobil
SELECT 
  bh.id,
  bh.empresa_id,
  ec.nome_abreviado,
  bh.mes,
  bh.ano,
  bh.baseline_tickets,
  bh.baseline_horas,
  bh.saldo_tickets,
  bh.saldo_horas,
  bh.created_at
FROM banco_horas bh
JOIN empresas_clientes ec ON ec.id = bh.empresa_id
WHERE ec.nome_abreviado ILIKE '%exxon%' OR ec.nome_completo ILIKE '%exxon%'
ORDER BY bh.ano DESC, bh.mes DESC
LIMIT 10;

-- 3. Verificar requerimentos da ExxonMobil
SELECT 
  r.id,
  r.chamado,
  r.mes_cobranca,
  r.tipo_cobranca,
  r.data_aprovacao,
  r.horas_funcionais,
  r.horas_tecnicas,
  ec.nome_abreviado
FROM requerimentos r
JOIN empresas_clientes ec ON ec.id = r.cliente_id
WHERE ec.nome_abreviado ILIKE '%exxon%' OR ec.nome_completo ILIKE '%exxon%'
ORDER BY r.mes_cobranca DESC
LIMIT 10;

-- 4. Verificar se tem_ams está TRUE e tipo_contrato
SELECT 
  nome_abreviado,
  tem_ams,
  status,
  tipo_contrato,
  CASE 
    WHEN tem_ams = true AND status = 'ativo' THEN '✅ Deve aparecer no dropdown'
    WHEN tem_ams = false THEN '❌ tem_ams = false (não aparece)'
    WHEN status != 'ativo' THEN '❌ Status não é ativo (não aparece)'
    ELSE '⚠️ Verificar outros filtros'
  END as status_dropdown,
  CASE 
    WHEN tipo_contrato ILIKE '%ambos%' THEN '✅ Tipo Ambos - Mostrará 2 tabelas'
    WHEN tipo_contrato ILIKE '%ticket%' THEN '📊 Tipo Ticket - Mostrará apenas tickets'
    WHEN tipo_contrato ILIKE '%hora%' THEN '⏱️ Tipo Horas - Mostrará apenas horas'
    ELSE '⚠️ Tipo não reconhecido'
  END as tipo_visualizacao
FROM empresas_clientes
WHERE nome_abreviado ILIKE '%exxon%' OR nome_completo ILIKE '%exxon%';

-- 5. Atualizar ExxonMobil se necessário (DESCOMENTE para executar)
-- UPDATE empresas_clientes
-- SET 
--   tem_ams = true,
--   tipo_contrato = 'Ambos',
--   status = 'ativo'
-- WHERE nome_abreviado ILIKE '%exxon%';

