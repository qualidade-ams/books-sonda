-- =====================================================================
-- Troca de código de resolução (novo tipo de inconsistência)
--
-- 1. Nova tabela codigo_resolucao_modificacoes_aranda: histórico de trocas de
--    código de resolução sincronizado pelo sync-api a partir da tabela
--    AMScodigoresolucao_Modificacao do SQL Server Aranda
--    (item_id = nº do chamado, old_value, new_value, created).
-- 2. inconsistencias_chamados.cod_resolucao_anterior: código antes da troca.
-- 3. CHECK de tipo_inconsistencia passa a aceitar 'troca_codigo_resolucao'
--    (historico_inconsistencias_chamados e, se existir, inconsistencias_chamados).
-- 4. detectar_inconsistencias(): novo TIPO 5 'troca_codigo_resolucao'. Demais
--    tipos inalterados.
--
-- RLS da tabela nova: leitura para usuários autenticados; escrita só pelo
-- service_role (sync-api), mesmo padrão de apontamentos_tickets_aranda.
-- =====================================================================

-- 1. Tabela de trocas de código de resolução
CREATE TABLE IF NOT EXISTS public.codigo_resolucao_modificacoes_aranda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_externo TEXT NOT NULL UNIQUE,
  item_id TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.codigo_resolucao_modificacoes_aranda IS 'Trocas de código de resolução dos chamados (origem: AMScodigoresolucao_Modificacao no SQL Server Aranda)';
COMMENT ON COLUMN public.codigo_resolucao_modificacoes_aranda.id_externo IS 'AMScodigoresolucao_Modificacao|{item_id}|{created}';
COMMENT ON COLUMN public.codigo_resolucao_modificacoes_aranda.item_id IS 'Nº do chamado (apontamentos_tickets_aranda.nro_solicitacao)';
COMMENT ON COLUMN public.codigo_resolucao_modificacoes_aranda.created IS 'Data/hora da troca no Aranda';

CREATE INDEX IF NOT EXISTS idx_cod_resolucao_modificacoes_item_created
  ON public.codigo_resolucao_modificacoes_aranda(item_id, created DESC);

CREATE INDEX IF NOT EXISTS idx_cod_resolucao_modificacoes_created
  ON public.codigo_resolucao_modificacoes_aranda(created DESC);

ALTER TABLE public.codigo_resolucao_modificacoes_aranda ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cod_resolucao_modificacoes_select_authenticated" ON public.codigo_resolucao_modificacoes_aranda;
DROP POLICY IF EXISTS "cod_resolucao_modificacoes_service_role_all" ON public.codigo_resolucao_modificacoes_aranda;

CREATE POLICY "cod_resolucao_modificacoes_select_authenticated"
  ON public.codigo_resolucao_modificacoes_aranda
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- INSERT/UPDATE/DELETE: apenas o sync-api (service_role)
CREATE POLICY "cod_resolucao_modificacoes_service_role_all"
  ON public.codigo_resolucao_modificacoes_aranda
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_codigo_resolucao_modificacoes_aranda_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_codigo_resolucao_modificacoes_aranda_updated_at ON public.codigo_resolucao_modificacoes_aranda;
CREATE TRIGGER trigger_update_codigo_resolucao_modificacoes_aranda_updated_at
  BEFORE UPDATE ON public.codigo_resolucao_modificacoes_aranda
  FOR EACH ROW
  EXECUTE FUNCTION public.update_codigo_resolucao_modificacoes_aranda_updated_at();

-- 2. Código de resolução anterior na inconsistência
ALTER TABLE public.inconsistencias_chamados
  ADD COLUMN IF NOT EXISTS cod_resolucao_anterior TEXT;

COMMENT ON COLUMN public.inconsistencias_chamados.cod_resolucao_anterior IS 'Código de resolução antes da troca (tipo troca_codigo_resolucao)';

-- 3. CHECK de tipo_inconsistencia
--    historico_inconsistencias_chamados: sempre recriado com a lista completa.
--    inconsistencias_chamados: o CREATE TABLE não está versionado; só recria
--    se já existir um CHECK na coluna.
DO $$
DECLARE
  v_constraint RECORD;
  v_tinha_check_inconsistencias BOOLEAN := false;
BEGIN
  FOR v_constraint IN
    SELECT rel.relname, con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname IN ('historico_inconsistencias_chamados', 'inconsistencias_chamados')
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%tipo_inconsistencia%'
  LOOP
    IF v_constraint.relname = 'inconsistencias_chamados' THEN
      v_tinha_check_inconsistencias := true;
    END IF;
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', v_constraint.relname, v_constraint.conname);
  END LOOP;

  ALTER TABLE public.historico_inconsistencias_chamados
    ADD CONSTRAINT historico_inconsistencias_chamados_tipo_inconsistencia_check
    CHECK (tipo_inconsistencia IN ('mes_diferente', 'data_invertida', 'tempo_excessivo', 'ic_999999', 'sem_atualizacao', 'troca_codigo_resolucao'));

  IF v_tinha_check_inconsistencias THEN
    ALTER TABLE public.inconsistencias_chamados
      ADD CONSTRAINT inconsistencias_chamados_tipo_inconsistencia_check
      CHECK (tipo_inconsistencia IN ('mes_diferente', 'data_invertida', 'tempo_excessivo', 'ic_999999', 'sem_atualizacao', 'troca_codigo_resolucao'));
  END IF;
END $$;

-- 4. Função de detecção com o TIPO 5
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
  v_troca_codigo_resolucao JSONB;
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

  -- TIPO 5: Troca de código de resolução que mudou o desconto do banco de horas.
  -- Considera só a ÚLTIMA troca de cada chamado (item_id = nro_solicitacao).
  -- Entra quando o "Banco=S/N" do old_value é diferente do new_value
  -- (N→S ou S→N). Não entra quando são iguais (N→N, S→S) ou quando o old_value
  -- é NULL / não tem "Banco=". Se a última troca deixar de mudar o banco, a
  -- inconsistência some do retorno e o sync-api a marca como resolvida.
  -- A data da troca entra na chave_unica: uma nova troca gera uma nova linha e
  -- a anterior é resolvida automaticamente.
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
      NULL::TEXT AS tempo_gasto_horas,
      NULL::INT AS tempo_gasto_minutos,
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
    WHERE tb.banco_anterior IS NOT NULL
      AND tb.banco_atual IS NOT NULL
      AND tb.banco_anterior <> tb.banco_atual
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

  -- Montar resultado
  resultado := jsonb_build_object(
    'ic_999999', v_ic999999,
    'sem_atualizacao', v_sem_atualizacao,
    'mes_diferente', v_mes_diferente,
    'tempo_excessivo', v_tempo_excessivo,
    'troca_codigo_resolucao', v_troca_codigo_resolucao,
    'totais', jsonb_build_object(
      'ic_999999', jsonb_array_length(v_ic999999),
      'sem_atualizacao', jsonb_array_length(v_sem_atualizacao),
      'mes_diferente', jsonb_array_length(v_mes_diferente),
      'tempo_excessivo', jsonb_array_length(v_tempo_excessivo),
      'troca_codigo_resolucao', jsonb_array_length(v_troca_codigo_resolucao),
      'total', jsonb_array_length(v_ic999999) + jsonb_array_length(v_sem_atualizacao) + jsonb_array_length(v_mes_diferente) + jsonb_array_length(v_tempo_excessivo) + jsonb_array_length(v_troca_codigo_resolucao)
    )
  );

  RETURN resultado;
END;
$function$;
