-- Script para debugar o cálculo de HORAS CONSUMO
-- Execute este script no Supabase SQL Editor para ver os apontamentos

-- 1. Ver TODOS os apontamentos do período (sem filtros de cod_resolucao)
SELECT 
  nro_chamado,
  nro_tarefa,
  tipo_chamado,
  tempo_gasto_horas,
  cod_resolucao,
  analista_tarefa,
  data_atividade,
  org_us_final,
  ativi_interna,
  item_configuracao
FROM apontamentos_aranda
WHERE org_us_final ILIKE '%RAINBOW%' -- SUBSTITUIR pelo nome da empresa
  AND ativi_interna = 'Não'
  AND tipo_chamado IN ('IM', 'RF')
  AND item_configuracao != '000000 - PROJETOS APL'
  AND data_atividade >= '2026-01-01' -- SUBSTITUIR pela data início
  AND data_atividade < '2026-02-01'  -- SUBSTITUIR pela data fim
ORDER BY data_atividade DESC;

-- 2. Ver apontamentos EXCLUÍDOS pelo filtro de cod_resolucao
SELECT 
  nro_chamado,
  nro_tarefa,
  tipo_chamado,
  tempo_gasto_horas,
  cod_resolucao,
  analista_tarefa,
  data_atividade
FROM apontamentos_aranda
WHERE org_us_final ILIKE '%RAINBOW%' -- SUBSTITUIR pelo nome da empresa
  AND ativi_interna = 'Não'
  AND tipo_chamado IN ('IM', 'RF')
  AND item_configuracao != '000000 - PROJETOS APL'
  AND data_atividade >= '2026-01-01' -- SUBSTITUIR pela data início
  AND data_atividade < '2026-02-01'  -- SUBSTITUIR pela data fim
  AND cod_resolucao NOT IN (
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

-- 3. Calcular total de horas COM filtro de cod_resolucao (atual)
SELECT 
  COUNT(*) as total_registros,
  SUM(
    CAST(SPLIT_PART(tempo_gasto_horas, ':', 1) AS INTEGER) + 
    (CAST(SPLIT_PART(tempo_gasto_horas, ':', 2) AS INTEGER) / 60.0)
  ) as total_horas_decimal
FROM apontamentos_aranda
WHERE org_us_final ILIKE '%RAINBOW%' -- SUBSTITUIR pelo nome da empresa
  AND ativi_interna = 'Não'
  AND tipo_chamado IN ('IM', 'RF')
  AND item_configuracao != '000000 - PROJETOS APL'
  AND data_atividade >= '2026-01-01' -- SUBSTITUIR pela data início
  AND data_atividade < '2026-02-01'  -- SUBSTITUIR pela data fim
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
  );

-- 4. Calcular total de horas SEM filtro de cod_resolucao (deveria ser 20:55)
SELECT 
  COUNT(*) as total_registros,
  SUM(
    CAST(SPLIT_PART(tempo_gasto_horas, ':', 1) AS INTEGER) + 
    (CAST(SPLIT_PART(tempo_gasto_horas, ':', 2) AS INTEGER) / 60.0)
  ) as total_horas_decimal
FROM apontamentos_aranda
WHERE org_us_final ILIKE '%RAINBOW%' -- SUBSTITUIR pelo nome da empresa
  AND ativi_interna = 'Não'
  AND tipo_chamado IN ('IM', 'RF')
  AND item_configuracao != '000000 - PROJETOS APL'
  AND data_atividade >= '2026-01-01' -- SUBSTITUIR pela data início
  AND data_atividade < '2026-02-01'; -- SUBSTITUIR pela data fim

-- 5. Ver quais cod_resolucao existem nos dados
SELECT 
  cod_resolucao,
  COUNT(*) as quantidade,
  SUM(
    CAST(SPLIT_PART(tempo_gasto_horas, ':', 1) AS INTEGER) + 
    (CAST(SPLIT_PART(tempo_gasto_horas, ':', 2) AS INTEGER) / 60.0)
  ) as total_horas
FROM apontamentos_aranda
WHERE org_us_final ILIKE '%RAINBOW%' -- SUBSTITUIR pelo nome da empresa
  AND ativi_interna = 'Não'
  AND tipo_chamado IN ('IM', 'RF')
  AND item_configuracao != '000000 - PROJETOS APL'
  AND data_atividade >= '2026-01-01' -- SUBSTITUIR pela data início
  AND data_atividade < '2026-02-01'  -- SUBSTITUIR pela data fim
GROUP BY cod_resolucao
ORDER BY total_horas DESC;
