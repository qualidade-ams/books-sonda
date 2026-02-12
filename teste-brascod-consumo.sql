-- ============================================================================
-- TESTE DE CONSUMO - EMPRESA BRASCOD (com vírgula no nome)
-- Data: 12/02/2026
-- Objetivo: Validar correção da query .or() para empresas com vírgula no nome
-- ============================================================================

-- 1. BUSCAR DADOS DA EMPRESA BRASCOD
-- ============================================================================
SELECT 
  id,
  nome_abreviado,
  nome_completo,
  status,
  tipo_contrato
FROM empresas_clientes
WHERE nome_abreviado ILIKE '%BRASCOD%'
   OR nome_completo ILIKE '%BRASCOD%';

-- Resultado esperado:
-- id: [UUID da empresa]
-- nome_abreviado: BRASCOD
-- nome_completo: BRASCOD - COMERCIO, IMPORTACAO EEXPORTACAO LTDA
-- status: ativo
-- tipo_contrato: [tipo configurado]


-- 2. BUSCAR APONTAMENTOS ARANDA PARA BRASCOD EM 01/2026
-- ============================================================================
-- Esta query simula o que o código TypeScript faz após a correção

SELECT 
  nro_chamado,
  tipo_chamado,
  org_us_final,
  item_configuracao,
  ativi_interna,
  cod_resolucao,
  data_atividade,
  data_sistema,
  tempo_gasto_horas,
  tempo_gasto_minutos,
  -- Validação de mesmo mês
  CASE 
    WHEN EXTRACT(MONTH FROM data_atividade) = EXTRACT(MONTH FROM data_sistema)
     AND EXTRACT(YEAR FROM data_atividade) = EXTRACT(YEAR FROM data_sistema)
    THEN 'SIM'
    ELSE 'NÃO'
  END AS mesmo_mes
FROM apontamentos_aranda
WHERE 
  -- REGRA 1: Atividade não interna
  ativi_interna = 'Não'
  
  -- REGRA 2: Não é projeto APL
  AND item_configuracao != '000000 - PROJETOS APL'
  
  -- REGRA 3: Não é tipo PM
  AND tipo_chamado != 'PM'
  
  -- REGRA 4: Data atividade em 01/2026
  AND data_atividade >= '2026-01-01 00:00:00'
  AND data_atividade <= '2026-01-31 23:59:59'
  
  -- REGRA 5: Empresa BRASCOD (nome abreviado OU nome completo)
  AND (
    org_us_final ILIKE '%BRASCOD%'
    OR org_us_final ILIKE '%BRASCOD - COMERCIO, IMPORTACAO EEXPORTACAO LTDA%'
  )
  
  -- REGRA 6: Código de resolução válido
  AND cod_resolucao IN (
    'Alocação - T&M',
    'AMS SAP',
    'Aplicação de Nota / Licença - Contratados',
    'Consultoria',
    'Consultoria - Banco de Dados',
    'Consultoria - Nota Publicada',
    'Consultoria - Solução Paliativa',
    'Dúvida',
    'Erro de classificação na abertura',
    'Erro de programa específico (SEM SLA)',
    'Levantamento de Versão / Orçamento',
    'Monitoramento DBA',
    'Nota Publicada',
    'Parametrização / Cadastro',
    'Parametrização / Funcionalidade',
    'Validação de Arquivo'
  )
ORDER BY data_atividade DESC;

-- Resultado esperado:
-- Lista de apontamentos que atendem TODAS as regras
-- Coluna 'mesmo_mes' deve ser 'SIM' para ser contabilizado


-- 3. CALCULAR TOTAL DE HORAS (simulando o código TypeScript)
-- ============================================================================
WITH apontamentos_validos AS (
  SELECT 
    nro_chamado,
    tempo_gasto_horas,
    tempo_gasto_minutos,
    data_atividade,
    data_sistema,
    -- Validação de mesmo mês
    CASE 
      WHEN EXTRACT(MONTH FROM data_atividade) = EXTRACT(MONTH FROM data_sistema)
       AND EXTRACT(YEAR FROM data_atividade) = EXTRACT(YEAR FROM data_sistema)
      THEN 1
      ELSE 0
    END AS mesmo_mes
  FROM apontamentos_aranda
  WHERE 
    ativi_interna = 'Não'
    AND item_configuracao != '000000 - PROJETOS APL'
    AND tipo_chamado != 'PM'
    AND data_atividade >= '2026-01-01 00:00:00'
    AND data_atividade <= '2026-01-31 23:59:59'
    AND (
      org_us_final ILIKE '%BRASCOD%'
      OR org_us_final ILIKE '%BRASCOD - COMERCIO, IMPORTACAO EEXPORTACAO LTDA%'
    )
    AND cod_resolucao IN (
      'Alocação - T&M',
      'AMS SAP',
      'Aplicação de Nota / Licença - Contratados',
      'Consultoria',
      'Consultoria - Banco de Dados',
      'Consultoria - Nota Publicada',
      'Consultoria - Solução Paliativa',
      'Dúvida',
      'Erro de classificação na abertura',
      'Erro de programa específico (SEM SLA)',
      'Levantamento de Versão / Orçamento',
      'Monitoramento DBA',
      'Nota Publicada',
      'Parametrização / Cadastro',
      'Parametrização / Funcionalidade',
      'Validação de Arquivo'
    )
)
SELECT 
  COUNT(*) AS total_apontamentos,
  SUM(CASE WHEN mesmo_mes = 1 THEN 1 ELSE 0 END) AS apontamentos_contabilizados,
  SUM(CASE WHEN mesmo_mes = 0 THEN 1 ELSE 0 END) AS apontamentos_excluidos,
  -- Somar minutos (convertendo tempo_gasto_horas para minutos)
  SUM(
    CASE 
      WHEN mesmo_mes = 1 THEN
        CASE 
          WHEN tempo_gasto_horas IS NOT NULL THEN
            -- Converter HH:MM para minutos
            (CAST(SPLIT_PART(tempo_gasto_horas, ':', 1) AS INTEGER) * 60) +
            CAST(SPLIT_PART(tempo_gasto_horas, ':', 2) AS INTEGER)
          WHEN tempo_gasto_minutos IS NOT NULL THEN
            tempo_gasto_minutos
          ELSE 0
        END
      ELSE 0
    END
  ) AS total_minutos,
  -- Converter minutos para HH:MM
  LPAD(CAST(FLOOR(SUM(
    CASE 
      WHEN mesmo_mes = 1 THEN
        CASE 
          WHEN tempo_gasto_horas IS NOT NULL THEN
            (CAST(SPLIT_PART(tempo_gasto_horas, ':', 1) AS INTEGER) * 60) +
            CAST(SPLIT_PART(tempo_gasto_horas, ':', 2) AS INTEGER)
          WHEN tempo_gasto_minutos IS NOT NULL THEN
            tempo_gasto_minutos
          ELSE 0
        END
      ELSE 0
    END
  ) / 60) AS TEXT), 2, '0') || ':' ||
  LPAD(CAST(ROUND(SUM(
    CASE 
      WHEN mesmo_mes = 1 THEN
        CASE 
          WHEN tempo_gasto_horas IS NOT NULL THEN
            (CAST(SPLIT_PART(tempo_gasto_horas, ':', 1) AS INTEGER) * 60) +
            CAST(SPLIT_PART(tempo_gasto_horas, ':', 2) AS INTEGER)
          WHEN tempo_gasto_minutos IS NOT NULL THEN
            tempo_gasto_minutos
          ELSE 0
        END
      ELSE 0
    END
  ) % 60) AS TEXT), 2, '0') AS total_horas_formatado
FROM apontamentos_validos;

-- Resultado esperado:
-- total_apontamentos: Total de registros encontrados
-- apontamentos_contabilizados: Registros onde data_atividade e data_sistema estão no mesmo mês
-- apontamentos_excluidos: Registros excluídos por estarem em meses diferentes
-- total_minutos: Total de minutos contabilizados
-- total_horas_formatado: Total em formato HH:MM


-- 4. BUSCAR TICKETS ARANDA PARA BRASCOD EM 01/2026
-- ============================================================================
SELECT 
  nro_solicitacao,
  organizacao,
  status,
  data_fechamento,
  data_abertura
FROM apontamentos_tickets_aranda
WHERE 
  -- Data de fechamento em 01/2026
  data_fechamento >= '2026-01-01 00:00:00'
  AND data_fechamento <= '2026-01-31 23:59:59'
  
  -- Status fechado
  AND status = 'Closed'
  
  -- Empresa BRASCOD (nome abreviado OU nome completo)
  AND (
    organizacao ILIKE '%BRASCOD%'
    OR organizacao ILIKE '%BRASCOD - COMERCIO, IMPORTACAO EEXPORTACAO LTDA%'
  )
ORDER BY data_fechamento DESC;

-- Resultado esperado:
-- Lista de tickets fechados em 01/2026 para BRASCOD


-- 5. CONTAR TICKETS
-- ============================================================================
SELECT 
  COUNT(*) AS total_tickets
FROM apontamentos_tickets_aranda
WHERE 
  data_fechamento >= '2026-01-01 00:00:00'
  AND data_fechamento <= '2026-01-31 23:59:59'
  AND status = 'Closed'
  AND (
    organizacao ILIKE '%BRASCOD%'
    OR organizacao ILIKE '%BRASCOD - COMERCIO, IMPORTACAO EEXPORTACAO LTDA%'
  );

-- Resultado esperado:
-- total_tickets: Número de tickets fechados no período


-- ============================================================================
-- VALIDAÇÃO FINAL
-- ============================================================================
-- Compare os resultados acima com o que o sistema Books SND está mostrando
-- na tela de Banco de Horas para BRASCOD em 01/2026.
--
-- Se os valores baterem, a correção está funcionando corretamente!
-- ============================================================================
