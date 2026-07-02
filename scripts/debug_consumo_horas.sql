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
    'Alocação T&M (Banco=S| SLA=N)',
    'AMS SAP',
    'AMS SAP (Banco=S| SLA=S)',
    'Aplicação de Nota / Licença - Contratados',
    'Aplicação de Nota / Licença (Banco=S |SLA=N)',
    'Consultoria',
    'Consultoria (Banco=S| SLA=S)',
    'Consultoria - Banco de Dados',
    'Consultoria - Banco de Dados (Banco=S| SLA=S)',
    'Consultoria - Nota Publicada',
    'Consultoria - Nota Publicada (Banco=S| SLA=S)',
    'Consultoria - Solução Paliativa',
    'Consultoria - Solução Paliativa (Banco=S| SLA=S)',
    'Dúvida',
    'Dúvida (Banco=S |SLA=N)',
    'Erro de classificação na abertura',
    'Erro de classificação de abertura (Banco=S| SLA=N)',
    'Erro de classificação na abertura (Banco=S |SLA=N)',
    'Erro de programa especifico (SEM SLA)',
    'Erro de programa especifico (Banco=S| SLA=N)',
    'Levantamento de Versão / Orçamento',
    'Levantamento de Versão /Orçamento (Banco=S |SLA=N)',
    'Monitoramento DBA',
    'Monitoramento DBA (Banco=S |SLA=N)',
    'Nota Publicada',
    'Nota Publicada (Banco=S |SLA=N)',
    'Parametrização / Cadastro',
    'Parametrização / Cadastro (Banco=S |SLA=N)',
    'Parametrização / Funcionalidade',
    'Parametrização / Funcionalidade (Banco=S |SLA=N)',
    'Validação de Arquivo',
    'Validação de Arquivo (Banco=S| SLA=N)'
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
    'Alocação - T&M (Banco=S |SLA=N)',
    'Alocação - T&M (Banco=S| SLA=N)',
    'AMS SAP',
    'AMS SAP (Banco=S |SLA=S)',
    'AMS SAP (Banco=S| SLA=S)',
    'Aplicação de Nota / Licença - Contratados',
    'Aplicação de Nota / Licença (Banco=S |SLA=N)',
    'Consultoria',
    'Consultoria (Banco=S |SLA=S)',
    'Consultoria (Banco=S| SLA=S)',
    'Consultoria - Banco de Dados',
    'Consultoria - Banco de Dados (Banco=S |SLA=S)',
    'Consultoria - Banco de Dados (Banco=S| SLA=S)',
    'Consultoria - Nota Publicada',
    'Consultoria - Nota Publicada (Banco=S |SLA=S)',
    'Consultoria - Nota Publicada (Banco=S| SLA=S)',
    'Consultoria - Solução Paliativa',
    'Consultoria - Solução Paliativa (Banco=S |SLA=S)',
    'Consultoria - Solução Paliativa (Banco=S| SLA=S)',
    'Dúvida',
    'Dúvida (Banco=S |SLA=N)',
    'Erro de classificação na abertura',
    'Erro de classificação na abertura (Banco=S| SLA=N)',
    'Erro de classificação na abertura (Banco=S |SLA=N)',
    'Erro de programa especifico (SEM SLA)',
    'Erro de programa especifico (Banco=S |SLA=N)',
    'Erro de programa especifico (Banco=S| SLA=N)',
    'Levantamento de Versão / Orçamento',
    'Levantamento de Versão / Orçamento (Banco=S |SLA=N)',
    'Levantamento de Versão /Orçamento (Banco=S |SLA=N)',
    'Monitoramento DBA',
    'Monitoramento DBA (Banco=S |SLA=N)',
    'Nota Publicada',
    'Nota Publicada (Banco=S |SLA=N)',
    'Parametrização / Cadastro',
    'Parametrização / Cadastro (Banco=S |SLA=N)',
    'Parametrização / Funcionalidade',
    'Parametrização / Funcionalidade (Banco=S |SLA=N)',
    'Validação de Arquivo',
    'Validação de Arquivo (Banco=S |SLA=N)',
    'Validação de Arquivo (Banco=S| SLA=N)'
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
