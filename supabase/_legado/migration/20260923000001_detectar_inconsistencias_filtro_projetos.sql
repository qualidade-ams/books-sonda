-- =====================================================================
-- Inconsistências: aplicar o filtro de chamados elegíveis (mesmo usado nos
-- Books) em TODOS os tipos de inconsistência.
--
-- Motivo: chamados de projeto (ex.: grupos "AMS PRJ %", "PROJETOS APL %",
-- IC "000000 - PROJETOS APL") e casos filhos estavam aparecendo em
-- "Inconsistências Detectadas" e não devem.
--
-- Filtro de ticket elegível:
--   status <> 'Cancelled'
--   item_configuracao IS NULL OR item_configuracao <> '000000 - PROJETOS APL'
--   caso_pai = 'SIM'
--   nome_grupo NOT IN (...lista...) e NOT LIKE 'AMS DX %', 'AMS PRJ %',
--   'AMS SAP %', 'BPO %', 'PROJETOS APL %'
--
-- - Tipos de ticket (ic_999999, sem_atualizacao): filtro direto na tabela
--   apontamentos_tickets_aranda.
-- - Tipos de apontamento (mes_diferente, tempo_excessivo): apontamentos_aranda
--   não tem caso_pai/nome_grupo, então o apontamento só entra se o ticket
--   correspondente (nro_chamado = nro_solicitacao) passar no mesmo filtro.
--
-- Inconsistências ativas que deixarem de ser retornadas são marcadas como
-- 'resolvida' automaticamente pelo sync-api na próxima execução.
--
-- Única alteração em relação à versão anterior: cláusulas WHERE. O formato
-- do retorno (JSON) e as chaves únicas não mudaram.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.detectar_inconsistencias()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  resultado JSONB;
  v_ano_inicio TEXT;
  v_data_limite TIMESTAMPTZ;
  v_ic999999 JSONB;
  v_sem_atualizacao JSONB;
  v_mes_diferente JSONB;
  v_tempo_excessivo JSONB;
BEGIN
  -- Aumentar timeout para operação pesada (service_role não tem limite, mas
  -- authenticated tem 8s - SET LOCAL garante execução completa em qualquer role)
  SET LOCAL statement_timeout = '60s';

  -- Configurar escopo temporal
  v_ano_inicio := (EXTRACT(YEAR FROM NOW()) - 1)::TEXT || '-01-01';
  v_data_limite := NOW() - INTERVAL '16 days';

  -- TIPO 1: IC 999999 (tickets com item_configuracao começando com 999999)
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_ic999999
  FROM (
    SELECT
      'tickets' AS origem,
      CASE
        WHEN cod_tipo = 'Solicitação' THEN 'RF ' || nro_solicitacao
        WHEN cod_tipo = 'Incidente' THEN 'IM ' || nro_solicitacao
        WHEN cod_tipo = 'Problema' THEN 'PM ' || nro_solicitacao
        ELSE nro_solicitacao
      END AS nro_chamado,
      NULL::TEXT AS nro_tarefa,
      CASE WHEN cod_tipo = 'Solicitação' THEN 'RF' WHEN cod_tipo = 'Incidente' THEN 'IM' WHEN cod_tipo = 'Problema' THEN 'PM' ELSE NULL END AS tipo_chamado,
      item_configuracao,
      'ic_999999' AS tipo_inconsistencia,
      'Item de Configuração inválido: ' || item_configuracao AS descricao_inconsistencia,
      data_abertura,
      data_abertura AS data_atividade,
      NULL::TIMESTAMPTZ AS data_sistema,
      NULL::TEXT AS tempo_gasto_horas,
      NULL::INT AS tempo_gasto_minutos,
      organizacao AS empresa,
      nome_responsavel AS analista,
      status AS status_chamado,
      cod_resolucao,
      'tickets-' ||
        CASE WHEN cod_tipo = 'Solicitação' THEN 'RF ' WHEN cod_tipo = 'Incidente' THEN 'IM ' WHEN cod_tipo = 'Problema' THEN 'PM ' ELSE '' END
        || nro_solicitacao || '-ic_999999' AS chave_unica
    FROM apontamentos_tickets_aranda
    WHERE data_abertura >= v_ano_inicio::TIMESTAMPTZ
      AND status NOT IN ('Cancelled', 'Closed')
      AND item_configuracao LIKE '999999%'
      -- Filtro de ticket elegível
      AND (item_configuracao IS NULL OR item_configuracao <> '000000 - PROJETOS APL')
      AND caso_pai = 'SIM'
      AND nome_grupo NOT IN ('AMS - FABRICA ABAP (SAP)', 'AMS - QUALIDADE E PROCESSOS', 'AMS APL - TÉCNICO', 'AMS PROJ - MP PROJETOS', 'AMS SAS - N2', 'CA SDM')
      AND nome_grupo NOT LIKE 'AMS DX %'
      AND nome_grupo NOT LIKE 'AMS PRJ %'
      AND nome_grupo NOT LIKE 'AMS SAP %'
      AND nome_grupo NOT LIKE 'BPO %'
      AND nome_grupo NOT LIKE 'PROJETOS APL %'
  ) t;

  -- TIPO 2: Sem atualização há 16+ dias
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_sem_atualizacao
  FROM (
    SELECT
      'tickets' AS origem,
      CASE
        WHEN cod_tipo = 'Solicitação' THEN 'RF ' || nro_solicitacao
        WHEN cod_tipo = 'Incidente' THEN 'IM ' || nro_solicitacao
        WHEN cod_tipo = 'Problema' THEN 'PM ' || nro_solicitacao
        ELSE nro_solicitacao
      END AS nro_chamado,
      NULL::TEXT AS nro_tarefa,
      CASE WHEN cod_tipo = 'Solicitação' THEN 'RF' WHEN cod_tipo = 'Incidente' THEN 'IM' WHEN cod_tipo = 'Problema' THEN 'PM' ELSE NULL END AS tipo_chamado,
      item_configuracao,
      'sem_atualizacao' AS tipo_inconsistencia,
      'Chamado com status "' || status || '" sem atualização há ' ||
        FLOOR(EXTRACT(EPOCH FROM (NOW() - data_ultimo_comentario)) / 86400)::INT ||
        ' dia(s). Último comentário: ' || to_char(data_ultimo_comentario, 'DD/MM/YYYY') AS descricao_inconsistencia,
      data_abertura,
      data_abertura AS data_atividade,
      NULL::TIMESTAMPTZ AS data_sistema,
      NULL::TEXT AS tempo_gasto_horas,
      NULL::INT AS tempo_gasto_minutos,
      organizacao AS empresa,
      nome_responsavel AS analista,
      status AS status_chamado,
      cod_resolucao,
      'tickets-' ||
        CASE WHEN cod_tipo = 'Solicitação' THEN 'RF ' WHEN cod_tipo = 'Incidente' THEN 'IM ' WHEN cod_tipo = 'Problema' THEN 'PM ' ELSE '' END
        || nro_solicitacao || '-sem_atualizacao' AS chave_unica
    FROM apontamentos_tickets_aranda
    WHERE data_abertura >= v_ano_inicio::TIMESTAMPTZ
      AND status IN ('Open', 'Hold', 'In Progress', 'Acknowledged', 'Resolved')
      AND data_ultimo_comentario IS NOT NULL
      AND data_ultimo_comentario <= v_data_limite
      -- Filtro de ticket elegível
      AND (item_configuracao IS NULL OR item_configuracao <> '000000 - PROJETOS APL')
      AND caso_pai = 'SIM'
      AND nome_grupo NOT IN ('AMS - FABRICA ABAP (SAP)', 'AMS - QUALIDADE E PROCESSOS', 'AMS APL - TÉCNICO', 'AMS PROJ - MP PROJETOS', 'AMS SAS - N2', 'CA SDM')
      AND nome_grupo NOT LIKE 'AMS DX %'
      AND nome_grupo NOT LIKE 'AMS PRJ %'
      AND nome_grupo NOT LIKE 'AMS SAP %'
      AND nome_grupo NOT LIKE 'BPO %'
      AND nome_grupo NOT LIKE 'PROJETOS APL %'
  ) t;

  -- TIPO 3: Mês diferente (usando date_trunc em vez de EXTRACT para ~8x mais rápido)
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_mes_diferente
  FROM (
    SELECT
      'apontamentos' AS origem,
      CASE WHEN a.tipo_chamado IS NOT NULL AND a.tipo_chamado != ''
        THEN a.tipo_chamado || ' ' || a.nro_chamado
        ELSE a.nro_chamado
      END AS nro_chamado,
      a.nro_tarefa,
      a.tipo_chamado,
      a.item_configuracao,
      'mes_diferente' AS tipo_inconsistencia,
      'Data Atividade (' || to_char(a.data_atividade, 'DD/MM/YYYY') || ') e Data Sistema (' || to_char(a.data_sistema, 'DD/MM/YYYY') || ') em meses diferentes' AS descricao_inconsistencia,
      a.data_abertura,
      a.data_atividade,
      a.data_sistema,
      CASE WHEN a.tempo_gasto_minutos IS NOT NULL
        THEN LPAD(FLOOR(a.tempo_gasto_minutos / 60)::TEXT, 2, '0') || ':' || LPAD((a.tempo_gasto_minutos::INT % 60)::TEXT, 2, '0')
        ELSE NULL
      END AS tempo_gasto_horas,
      a.tempo_gasto_minutos::INT AS tempo_gasto_minutos,
      a.org_us_final AS empresa,
      a.analista_tarefa AS analista,
      NULL::TEXT AS status_chamado,
      a.cod_resolucao,
      'apontamentos-' ||
        CASE WHEN a.tipo_chamado IS NOT NULL AND a.tipo_chamado != ''
          THEN a.tipo_chamado || ' ' || a.nro_chamado
          ELSE a.nro_chamado
        END || '-mes_diferente-' || to_char(a.data_atividade, 'YYYY-MM-DD')
        || CASE WHEN a.nro_tarefa IS NOT NULL AND a.nro_tarefa != '' THEN '-' || a.nro_tarefa ELSE '' END
        AS chave_unica
    FROM apontamentos_aranda a
    WHERE a.data_atividade >= v_ano_inicio::TIMESTAMPTZ
      AND a.data_atividade IS NOT NULL
      AND a.data_sistema IS NOT NULL
      AND date_trunc('month', a.data_atividade) != date_trunc('month', a.data_sistema)
      -- Filtro de ticket elegível (via ticket do apontamento)
      AND EXISTS (
        SELECT 1
        FROM apontamentos_tickets_aranda tk
        WHERE tk.nro_solicitacao = a.nro_chamado
          AND tk.status <> 'Cancelled'
          AND (tk.item_configuracao IS NULL OR tk.item_configuracao <> '000000 - PROJETOS APL')
          AND tk.caso_pai = 'SIM'
          AND tk.nome_grupo NOT IN ('AMS - FABRICA ABAP (SAP)', 'AMS - QUALIDADE E PROCESSOS', 'AMS APL - TÉCNICO', 'AMS PROJ - MP PROJETOS', 'AMS SAS - N2', 'CA SDM')
          AND tk.nome_grupo NOT LIKE 'AMS DX %'
          AND tk.nome_grupo NOT LIKE 'AMS PRJ %'
          AND tk.nome_grupo NOT LIKE 'AMS SAP %'
          AND tk.nome_grupo NOT LIKE 'BPO %'
          AND tk.nome_grupo NOT LIKE 'PROJETOS APL %'
      )
  ) t;

  -- TIPO 4: Tempo excessivo (> 10 horas = 600 minutos)
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_tempo_excessivo
  FROM (
    SELECT
      'apontamentos' AS origem,
      CASE WHEN a.tipo_chamado IS NOT NULL AND a.tipo_chamado != ''
        THEN a.tipo_chamado || ' ' || a.nro_chamado
        ELSE a.nro_chamado
      END AS nro_chamado,
      a.nro_tarefa,
      a.tipo_chamado,
      a.item_configuracao,
      'tempo_excessivo' AS tipo_inconsistencia,
      'Tempo gasto (' || LPAD(FLOOR(a.tempo_gasto_minutos / 60)::TEXT, 2, '0') || ':' || LPAD((a.tempo_gasto_minutos::INT % 60)::TEXT, 2, '0') || ') excede o limite de 10 horas' AS descricao_inconsistencia,
      a.data_abertura,
      a.data_atividade,
      a.data_sistema,
      LPAD(FLOOR(a.tempo_gasto_minutos / 60)::TEXT, 2, '0') || ':' || LPAD((a.tempo_gasto_minutos::INT % 60)::TEXT, 2, '0') AS tempo_gasto_horas,
      a.tempo_gasto_minutos::INT AS tempo_gasto_minutos,
      a.org_us_final AS empresa,
      a.analista_tarefa AS analista,
      NULL::TEXT AS status_chamado,
      a.cod_resolucao,
      'apontamentos-' ||
        CASE WHEN a.tipo_chamado IS NOT NULL AND a.tipo_chamado != ''
          THEN a.tipo_chamado || ' ' || a.nro_chamado
          ELSE a.nro_chamado
        END || '-tempo_excessivo-' || to_char(a.data_atividade, 'YYYY-MM-DD')
        || CASE WHEN a.nro_tarefa IS NOT NULL AND a.nro_tarefa != '' THEN '-' || a.nro_tarefa ELSE '' END
        AS chave_unica
    FROM apontamentos_aranda a
    WHERE a.data_atividade >= v_ano_inicio::TIMESTAMPTZ
      AND a.tempo_gasto_minutos > 600
      -- Filtro de ticket elegível (via ticket do apontamento)
      AND EXISTS (
        SELECT 1
        FROM apontamentos_tickets_aranda tk
        WHERE tk.nro_solicitacao = a.nro_chamado
          AND tk.status <> 'Cancelled'
          AND (tk.item_configuracao IS NULL OR tk.item_configuracao <> '000000 - PROJETOS APL')
          AND tk.caso_pai = 'SIM'
          AND tk.nome_grupo NOT IN ('AMS - FABRICA ABAP (SAP)', 'AMS - QUALIDADE E PROCESSOS', 'AMS APL - TÉCNICO', 'AMS PROJ - MP PROJETOS', 'AMS SAS - N2', 'CA SDM')
          AND tk.nome_grupo NOT LIKE 'AMS DX %'
          AND tk.nome_grupo NOT LIKE 'AMS PRJ %'
          AND tk.nome_grupo NOT LIKE 'AMS SAP %'
          AND tk.nome_grupo NOT LIKE 'BPO %'
          AND tk.nome_grupo NOT LIKE 'PROJETOS APL %'
      )
  ) t;

  -- Montar resultado
  resultado := jsonb_build_object(
    'ic_999999', v_ic999999,
    'sem_atualizacao', v_sem_atualizacao,
    'mes_diferente', v_mes_diferente,
    'tempo_excessivo', v_tempo_excessivo,
    'totais', jsonb_build_object(
      'ic_999999', jsonb_array_length(v_ic999999),
      'sem_atualizacao', jsonb_array_length(v_sem_atualizacao),
      'mes_diferente', jsonb_array_length(v_mes_diferente),
      'tempo_excessivo', jsonb_array_length(v_tempo_excessivo),
      'total', jsonb_array_length(v_ic999999) + jsonb_array_length(v_sem_atualizacao) + jsonb_array_length(v_mes_diferente) + jsonb_array_length(v_tempo_excessivo)
    )
  );

  RETURN resultado;
END;
$function$;
