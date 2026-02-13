-- ============================================================================
-- Diagnóstico: Problema de matching de nomes para A.PHARMA
-- ============================================================================
-- Cliente: A.PHARMA está em branco mas possui dados no banco
-- Apontamentos existem como "A.PHARMA DISTRIBUIDORA LTDA"
-- Precisamos verificar como está cadastrado na tabela empresas_clientes

-- ============================================================================
-- STEP 1: Verificar como A.PHARMA está cadastrado
-- ============================================================================

SELECT 
  id,
  nome_abreviado,
  nome_completo,
  ativo
FROM empresas_clientes
WHERE nome_abreviado ILIKE '%PHARMA%'
   OR nome_completo ILIKE '%PHARMA%'
ORDER BY nome_abreviado;

-- ============================================================================
-- STEP 2: Verificar apontamentos para A.PHARMA DISTRIBUIDORA LTDA
-- ============================================================================

SELECT 
  COUNT(*) as total_apontamentos,
  SUM(tempo_gasto_minutos) as total_minutos,
  EXTRACT(YEAR FROM data_atividade) as ano,
  EXTRACT(MONTH FROM data_atividade) as mes
FROM apontamentos_aranda
WHERE org_us_final ILIKE '%A.PHARMA%'
  AND ativi_interna = 'Não'
  AND item_configuracao != '000000 - PROJETOS APL'
  AND tipo_chamado IN ('IM', 'RF', 'PM')
GROUP BY ano, mes
ORDER BY ano DESC, mes DESC;

-- ============================================================================
-- STEP 3: Verificar variações de nome no org_us_final
-- ============================================================================

SELECT DISTINCT
  org_us_final,
  COUNT(*) as quantidade_apontamentos
FROM apontamentos_aranda
WHERE org_us_final ILIKE '%PHARMA%'
  AND ativi_interna = 'Não'
GROUP BY org_us_final
ORDER BY quantidade_apontamentos DESC;

-- ============================================================================
-- STEP 4: Verificar se existe cálculo para A.PHARMA
-- ============================================================================

SELECT 
  bhc.id,
  ec.nome_abreviado,
  ec.nome_completo,
  bhc.mes,
  bhc.ano,
  bhc.consumo_horas,
  bhc.consumo_tickets
FROM banco_horas_calculos bhc
JOIN empresas_clientes ec ON ec.id = bhc.empresa_id
WHERE (ec.nome_abreviado ILIKE '%PHARMA%' OR ec.nome_completo ILIKE '%PHARMA%')
  AND bhc.ano = 2025
  AND bhc.mes = 10
ORDER BY bhc.ano DESC, bhc.mes DESC;

-- ============================================================================
-- STEP 5: Testar matching com diferentes variações de nome
-- ============================================================================

-- Teste 1: Busca com "A.PHARMA"
SELECT 
  COUNT(*) as total,
  'A.PHARMA' as nome_busca
FROM apontamentos_aranda
WHERE org_us_final ILIKE '%A.PHARMA%'
  AND ativi_interna = 'Não'
  AND item_configuracao != '000000 - PROJETOS APL'
  AND tipo_chamado IN ('IM', 'RF', 'PM')
  AND EXTRACT(YEAR FROM data_atividade) = 2025
  AND EXTRACT(MONTH FROM data_atividade) = 10;

-- Teste 2: Busca com "ASPEN PHARMA"
SELECT 
  COUNT(*) as total,
  'ASPEN PHARMA' as nome_busca
FROM apontamentos_aranda
WHERE org_us_final ILIKE '%ASPEN PHARMA%'
  AND ativi_interna = 'Não'
  AND item_configuracao != '000000 - PROJETOS APL'
  AND tipo_chamado IN ('IM', 'RF', 'PM')
  AND EXTRACT(YEAR FROM data_atividade) = 2025
  AND EXTRACT(MONTH FROM data_atividade) = 10;

-- Teste 3: Busca com "ASPEN"
SELECT 
  COUNT(*) as total,
  'ASPEN' as nome_busca
FROM apontamentos_aranda
WHERE org_us_final ILIKE '%ASPEN%'
  AND ativi_interna = 'Não'
  AND item_configuracao != '000000 - PROJETOS APL'
  AND tipo_chamado IN ('IM', 'RF', 'PM')
  AND EXTRACT(YEAR FROM data_atividade) = 2025
  AND EXTRACT(MONTH FROM data_atividade) = 10;

-- ============================================================================
-- STEP 6: Verificar item_configuracao dos apontamentos A.PHARMA
-- ============================================================================

SELECT 
  item_configuracao,
  COUNT(*) as quantidade,
  SUM(tempo_gasto_minutos) as total_minutos
FROM apontamentos_aranda
WHERE org_us_final ILIKE '%A.PHARMA%'
  AND ativi_interna = 'Não'
  AND tipo_chamado IN ('IM', 'RF', 'PM')
  AND EXTRACT(YEAR FROM data_atividade) = 2025
  AND EXTRACT(MONTH FROM data_atividade) = 10
GROUP BY item_configuracao
ORDER BY quantidade DESC;

-- ============================================================================
-- DIAGNÓSTICO ESPERADO:
-- ============================================================================
-- 
-- PROBLEMA PROVÁVEL:
-- - A.PHARMA está cadastrado na tabela empresas_clientes com nome diferente
-- - Exemplo: "ASPEN PHARMA" ou "ASPEN PHARMA INDUSTRIA"
-- - Mas os apontamentos vêm como "A.PHARMA DISTRIBUIDORA LTDA"
-- - O matching por ILIKE não está funcionando porque os nomes são muito diferentes
--
-- SOLUÇÕES POSSÍVEIS:
-- 1. Atualizar nome_abreviado em empresas_clientes para "A.PHARMA"
-- 2. Adicionar alias/apelidos para empresas (nova coluna)
-- 3. Criar tabela de mapeamento de nomes (nome_aranda → empresa_id)
-- 4. Usar fuzzy matching mais inteligente
--
-- ============================================================================
