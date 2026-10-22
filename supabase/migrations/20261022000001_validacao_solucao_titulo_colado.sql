-- Fix: validação do campo Solução — título CAUSA colado ao texto
--
-- Cenário corrigido (IM 9513569):
--   No Aranda os títulos da solução são blocos formatados. No texto puro que
--   chega pelo sync eles vêm colados à primeira palavra do parágrafo:
--   "CAUSAO ambiente estava...". Os outros títulos não exigem fim de palavra
--   e passavam ("CENÁRIOCliente", "PREVENÇÃOMonitorar"), mas CAUSA usa
--   "causas?\M" (para não casar "causado") e era acusada como faltante.
--
-- Regra acordada — CAUSA conta quando aparece:
--   • como palavra inteira em qualquer lugar do texto (regra que já existia), ou
--   • no começo de uma linha, mesmo com texto colado depois.
--   "causado" no meio da frase continua não valendo.
--
-- Única mudança: a linha de CAUSA no LATERAL do TIPO 6. O resto da função é
-- idêntico a 20261019000001_fix_troca_codigo_resolucao_mes_vigente.

CREATE OR REPLACE FUNCTION public.detectar_inconsistencias()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  resultado JSONB;
  v_ano_inicio TEXT;
  v_data_limite TIMESTAMPTZ;
  v_ic999999 JSONB;
  v_sem_atualizacao JSONB;
  v_mes_diferente JSONB;
  v_tempo_excessivo JSONB;
  v_troca_codigo_resolucao JSONB;
  v_validacao_solucao JSONB;
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
  -- Referência = última nota pública; sem nota pública, a data de abertura
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
      CASE WHEN data_ultima_nota_publica IS NOT NULL
        THEN 'Chamado com status "' || status || '" sem nota pública há ' ||
          FLOOR(EXTRACT(EPOCH FROM (NOW() - data_ultima_nota_publica)) / 86400)::INT ||
          ' dia(s). Última nota pública: ' || to_char(data_ultima_nota_publica AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY')
        ELSE 'Chamado com status "' || status || '" aberto há ' ||
          FLOOR(EXTRACT(EPOCH FROM (NOW() - data_abertura)) / 86400)::INT ||
          ' dia(s) sem nota pública'
      END AS descricao_inconsistencia,
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
      AND COALESCE(data_ultima_nota_publica, data_abertura) <= v_data_limite
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

  -- TIPO 5: Troca de código de resolução que mudou o desconto do banco de horas.
  -- Considera só a ÚLTIMA troca de cada chamado (item_id = nro_solicitacao).
  -- Entra quando o "Banco=S/N" do old_value é diferente do new_value
  -- (N→S ou S→N). Não entra quando são iguais (N→N, S→S) ou quando o old_value
  -- é NULL / não tem "Banco=". Se a última troca deixar de mudar o banco, a
  -- inconsistência some do retorno e o sync-api a marca como resolvida.
  -- A data da troca entra na chave_unica: uma nova troca gera uma nova linha e
  -- a anterior é resolvida automaticamente.
  -- Só entra quando a troca é em mês/ano diferente da abertura do chamado e
  -- quando existe ao menos um apontamento (data_sistema) em mês ANTERIOR ao
  -- mês da troca. Caso todos os apontamentos antes da troca sejam do próprio
  -- mês da troca (mês vigente), não há impacto retroativo e o chamado é excluído.
  -- O tempo exibido soma TODOS os apontamentos antes da troca (incluindo os do
  -- mês vigente), pois representa o volume total que mudou de classificação.
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_troca_codigo_resolucao
  FROM (
    WITH ultima_troca AS (
      SELECT DISTINCT ON (m.item_id)
        m.item_id, m.old_value, m.new_value, m.created
      FROM codigo_resolucao_modificacoes_aranda m
      ORDER BY m.item_id, m.created DESC, m.id_externo DESC
    ),
    troca_banco AS (
      SELECT
        u.*,
        UPPER(SUBSTRING(u.old_value FROM '[Bb][Aa][Nn][Cc][Oo]\s*=\s*([SsNn])')) AS banco_anterior,
        UPPER(SUBSTRING(u.new_value FROM '[Bb][Aa][Nn][Cc][Oo]\s*=\s*([SsNn])')) AS banco_atual
      FROM ultima_troca u
    )
    SELECT
      'tickets' AS origem,
      CASE
        WHEN tk.cod_tipo = 'Solicitação' THEN 'RF ' || tk.nro_solicitacao
        WHEN tk.cod_tipo = 'Incidente' THEN 'IM ' || tk.nro_solicitacao
        WHEN tk.cod_tipo = 'Problema' THEN 'PM ' || tk.nro_solicitacao
        ELSE tk.nro_solicitacao
      END AS nro_chamado,
      NULL::TEXT AS nro_tarefa,
      CASE WHEN tk.cod_tipo = 'Solicitação' THEN 'RF' WHEN tk.cod_tipo = 'Incidente' THEN 'IM' WHEN tk.cod_tipo = 'Problema' THEN 'PM' ELSE NULL END AS tipo_chamado,
      tk.item_configuracao,
      'troca_codigo_resolucao' AS tipo_inconsistencia,
      'Código de resolução alterado de "' || tb.old_value || '" para "' || tb.new_value || '" em ' ||
        to_char(tb.created, 'DD/MM/YYYY HH24:MI') ||
        CASE WHEN tb.banco_atual = 'S'
          THEN ' (passou a descontar do banco de horas)'
          ELSE ' (deixou de descontar do banco de horas)'
        END AS descricao_inconsistencia,
      tk.data_abertura,
      tb.created AS data_atividade,
      NULL::TIMESTAMPTZ AS data_sistema,
      -- HH:MM sem truncar acima de 99 horas
      LPAD(FLOOR(ta.minutos / 60)::TEXT, GREATEST(2, LENGTH(FLOOR(ta.minutos / 60)::TEXT)), '0') || ':' || LPAD((ta.minutos % 60)::TEXT, 2, '0') AS tempo_gasto_horas,
      ta.minutos AS tempo_gasto_minutos,
      tk.organizacao AS empresa,
      tk.nome_responsavel AS analista,
      tk.status AS status_chamado,
      tb.new_value AS cod_resolucao,
      tb.old_value AS cod_resolucao_anterior,
      'tickets-' ||
        CASE WHEN tk.cod_tipo = 'Solicitação' THEN 'RF ' WHEN tk.cod_tipo = 'Incidente' THEN 'IM ' WHEN tk.cod_tipo = 'Problema' THEN 'PM ' ELSE '' END
        || tk.nro_solicitacao || '-troca_codigo_resolucao-' || to_char(tb.created, 'YYYY-MM-DD"T"HH24:MI:SS') AS chave_unica
    FROM troca_banco tb
    JOIN apontamentos_tickets_aranda tk ON tk.nro_solicitacao = tb.item_id
    CROSS JOIN LATERAL (
      SELECT
        -- Soma TODOS os apontamentos antes da troca (inclusive os do mês vigente),
        -- pois representa o volume total cuja classificação foi alterada.
        COALESCE(SUM(ROUND(a.tempo_gasto_minutos)), 0)::INT AS minutos,
        -- Gate: só entra no monitoramento se há ao menos 1 apontamento de
        -- mês ANTERIOR ao mês da troca. Se todos são do mês vigente,
        -- não há impacto retroativo em período já fechado.
        BOOL_OR(
          date_trunc('month', a.data_sistema AT TIME ZONE 'America/Sao_Paulo')
          < date_trunc('month', tb.created AT TIME ZONE 'America/Sao_Paulo')
        ) AS tem_retroativo
      FROM apontamentos_aranda a
      WHERE a.nro_chamado = tb.item_id
        AND a.data_sistema < tb.created
    ) ta
    WHERE tb.banco_anterior IS NOT NULL
      AND tb.banco_atual IS NOT NULL
      AND tb.banco_anterior <> tb.banco_atual
      AND date_trunc('month', tb.created AT TIME ZONE 'America/Sao_Paulo')
          <> date_trunc('month', tk.data_abertura AT TIME ZONE 'America/Sao_Paulo')
      AND ta.tem_retroativo = true   -- ← substituiu "ta.minutos > 0"
      AND tk.data_abertura >= v_ano_inicio::TIMESTAMPTZ
      -- Filtro de ticket elegível
      AND tk.status <> 'Cancelled'
      AND (tk.item_configuracao IS NULL OR tk.item_configuracao <> '000000 - PROJETOS APL')
      AND tk.caso_pai = 'SIM'
      AND tk.nome_grupo NOT IN ('AMS - FABRICA ABAP (SAP)', 'AMS - QUALIDADE E PROCESSOS', 'AMS APL - TÉCNICO', 'AMS PROJ - MP PROJETOS', 'AMS SAS - N2', 'CA SDM')
      AND tk.nome_grupo NOT LIKE 'AMS DX %'
      AND tk.nome_grupo NOT LIKE 'AMS PRJ %'
      AND tk.nome_grupo NOT LIKE 'AMS SAP %'
      AND tk.nome_grupo NOT LIKE 'BPO %'
      AND tk.nome_grupo NOT LIKE 'PROJETOS APL %'
  ) t;

  -- TIPO 6: Validação do campo Solução
  -- O texto da solução precisa conter CENÁRIO, CAUSA, SOLUÇÃO PALIATIVA,
  -- SOLUÇÃO DEFINITIVA e PREVENÇÃO. lower() + classes com e sem acento:
  -- não diferencia maiúsculas/minúsculas nem exige acento. "causas?\M" exige
  -- fim de palavra (não casa "causado"), mas aceita texto colado antes.
  -- No começo de linha CAUSA vale mesmo colada ao texto seguinte: o título
  -- formatado do Aranda chega no texto puro como "CAUSAO ambiente...".
  -- (?n) faz o ^ casar depois de cada quebra de linha.
  -- Uma linha por chamado (as palavras faltantes não entram na chave_unica):
  -- quando o analista completa a solução, a inconsistência some do retorno e
  -- o sync-api a marca como resolvida; se completar só parte, a descrição é
  -- atualizada com o que ainda falta.
  -- data_solucao é gravada pelo sync-api no horário local sem fuso, por isso
  -- o corte é feito direto no valor gravado (mesmo padrão de v_ano_inicio).
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_validacao_solucao
  FROM (
    SELECT
      'tickets' AS origem,
      CASE
        WHEN tk.cod_tipo = 'Solicitação' THEN 'RF ' || tk.nro_solicitacao
        WHEN tk.cod_tipo = 'Incidente' THEN 'IM ' || tk.nro_solicitacao
        WHEN tk.cod_tipo = 'Problema' THEN 'PM ' || tk.nro_solicitacao
        ELSE tk.nro_solicitacao
      END AS nro_chamado,
      NULL::TEXT AS nro_tarefa,
      CASE WHEN tk.cod_tipo = 'Solicitação' THEN 'RF' WHEN tk.cod_tipo = 'Incidente' THEN 'IM' WHEN tk.cod_tipo = 'Problema' THEN 'PM' ELSE NULL END AS tipo_chamado,
      tk.item_configuracao,
      'validacao_solucao' AS tipo_inconsistencia,
      'Palavras faltando no campo Solução: ' || f.faltantes AS descricao_inconsistencia,
      tk.data_abertura,
      tk.data_solucao AS data_atividade,
      NULL::TIMESTAMPTZ AS data_sistema,
      NULL::TEXT AS tempo_gasto_horas,
      NULL::INT AS tempo_gasto_minutos,
      tk.organizacao AS empresa,
      tk.nome_responsavel AS analista,
      tk.status AS status_chamado,
      tk.cod_resolucao,
      'tickets-' ||
        CASE WHEN tk.cod_tipo = 'Solicitação' THEN 'RF ' WHEN tk.cod_tipo = 'Incidente' THEN 'IM ' WHEN tk.cod_tipo = 'Problema' THEN 'PM ' ELSE '' END
        || tk.nro_solicitacao || '-validacao_solucao' AS chave_unica
    FROM apontamentos_tickets_aranda tk
    CROSS JOIN LATERAL (
      SELECT array_to_string(ARRAY_REMOVE(ARRAY[
        CASE WHEN lower(tk.solucao) !~ 'cen[aá]rio' THEN 'CENÁRIO' END,
        CASE WHEN lower(tk.solucao) !~ 'causas?\M'
              AND lower(tk.solucao) !~ '(?n)^\s*causa' THEN 'CAUSA' END,
        CASE WHEN lower(tk.solucao) !~ 'solu[cç][aã]o\s+paliativa' THEN 'SOLUÇÃO PALIATIVA' END,
        CASE WHEN lower(tk.solucao) !~ 'solu[cç][aã]o\s+definitiva' THEN 'SOLUÇÃO DEFINITIVA' END,
        CASE WHEN lower(tk.solucao) !~ 'preven[cç][aã]o' THEN 'PREVENÇÃO' END
      ], NULL), ', ') AS faltantes
    ) f
    WHERE tk.data_solucao >= '2026-10-13'::TIMESTAMPTZ
      AND tk.status IN ('Resolved', 'Problem-Fixed', 'Closed')
      AND tk.solucao IS NOT NULL
      AND btrim(tk.solucao) <> ''
      AND f.faltantes <> ''
      -- Filtro de ticket elegível
      AND (tk.item_configuracao IS NULL OR tk.item_configuracao <> '000000 - PROJETOS APL')
      AND tk.caso_pai = 'SIM'
      AND tk.nome_grupo NOT IN ('AMS - FABRICA ABAP (SAP)', 'AMS - QUALIDADE E PROCESSOS', 'AMS APL - TÉCNICO', 'AMS PROJ - MP PROJETOS', 'AMS SAS - N2', 'CA SDM')
      AND tk.nome_grupo NOT LIKE 'AMS DX %'
      AND tk.nome_grupo NOT LIKE 'AMS PRJ %'
      AND tk.nome_grupo NOT LIKE 'AMS SAP %'
      AND tk.nome_grupo NOT LIKE 'BPO %'
      AND tk.nome_grupo NOT LIKE 'PROJETOS APL %'
  ) t;

  -- Montar resultado
  resultado := jsonb_build_object(
    'ic_999999', v_ic999999,
    'sem_atualizacao', v_sem_atualizacao,
    'mes_diferente', v_mes_diferente,
    'tempo_excessivo', v_tempo_excessivo,
    'troca_codigo_resolucao', v_troca_codigo_resolucao,
    'validacao_solucao', v_validacao_solucao,
    'totais', jsonb_build_object(
      'ic_999999', jsonb_array_length(v_ic999999),
      'sem_atualizacao', jsonb_array_length(v_sem_atualizacao),
      'mes_diferente', jsonb_array_length(v_mes_diferente),
      'tempo_excessivo', jsonb_array_length(v_tempo_excessivo),
      'troca_codigo_resolucao', jsonb_array_length(v_troca_codigo_resolucao),
      'validacao_solucao', jsonb_array_length(v_validacao_solucao),
      'total', jsonb_array_length(v_ic999999) + jsonb_array_length(v_sem_atualizacao) + jsonb_array_length(v_mes_diferente) + jsonb_array_length(v_tempo_excessivo) + jsonb_array_length(v_troca_codigo_resolucao) + jsonb_array_length(v_validacao_solucao)
    )
  );

  RETURN resultado;
END;
$$;

COMMENT ON FUNCTION public.detectar_inconsistencias() IS 'Detecta inconsistências em tickets e apontamentos. SET LOCAL statement_timeout=60s para garantir execução completa. Otimizado com date_trunc e índices covering.';
