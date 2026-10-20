-- =====================================================================
-- Fase 2 — migration 8: regra única de consumo (Modelagem_Fase2.md, seção 3)
--
-- bancos_horas_janela              janela de apuração do mês em America/Sao_Paulo (D-16, RC-05)
-- bancos_horas_consumo_itens       apontamentos e tickets que contam no banco, um por linha
-- bancos_horas_consumo             o mesmo, somado por grupo e item de configuração
-- bancos_horas_requerimentos       requerimentos que descontam do banco (RC-66, D-01)
--
-- Os filtros são os do motor atual (RC-61 a RC-65). Muda: a empresa é ligada
-- pelas organizações do Aranda (RC-60), a duração é o minuto real (A3) e a
-- soma é feita no banco, sem limite de linhas (RC-69).
--
-- Só cria funções; nenhuma tabela é alterada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Acesso: quem vê o Controle novo ou a Geração de Books; o sync-api
-- (service role); conexões diretas sem JWT (migrations e SQL Editor).
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.pode_consultar_bancos_horas()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claims JSONB := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
BEGIN
  IF v_claims IS NULL OR v_claims ->> 'role' = 'service_role' THEN
    RETURN TRUE;
  END IF;
  RETURN has_screen_permission('bancos_horas_controle'::text, 'view'::text)
      OR has_screen_permission('geracao_books'::text, 'view'::text);
END;
$$;

-- ---------------------------------------------------------------------
-- Janela do mês de referência. Fim exclusivo.
--   dia início 1: mês civil (o dia fim é ignorado)
--   dia início > 1: do dia início do mês até o dia fim do mês seguinte
--   (dia fim 0 = véspera do dia início)
-- Função pura, sem acesso a dados: SECURITY INVOKER.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bancos_horas_janela(
  p_ano INTEGER, p_mes INTEGER, p_dia_inicio INTEGER DEFAULT 1, p_dia_fim INTEGER DEFAULT 0
)
RETURNS TABLE (inicio TIMESTAMPTZ, fim TIMESTAMPTZ)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH base AS (
    SELECT make_date(p_ano, p_mes, 1) AS primeiro_dia,
           (make_date(p_ano, p_mes, 1) + interval '1 month')::date AS primeiro_dia_seguinte
  ), dias AS (
    SELECT CASE WHEN p_dia_inicio > 1 THEN primeiro_dia + (p_dia_inicio - 1) ELSE primeiro_dia END AS de,
           CASE WHEN p_dia_inicio > 1
                THEN primeiro_dia_seguinte + (CASE WHEN p_dia_fim > 0 THEN p_dia_fim ELSE p_dia_inicio - 1 END)
                ELSE primeiro_dia_seguinte END AS ate
      FROM base
  )
  SELECT de::timestamp AT TIME ZONE 'America/Sao_Paulo',
         ate::timestamp AT TIME ZONE 'America/Sao_Paulo'
    FROM dias;
$$;

-- ---------------------------------------------------------------------
-- Itens de consumo (apontamentos e tickets) da empresa na janela
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bancos_horas_consumo_itens(
  p_empresa_id UUID, p_ano INTEGER, p_mes INTEGER, p_dia_inicio INTEGER DEFAULT 1, p_dia_fim INTEGER DEFAULT 0
)
RETURNS TABLE (fonte TEXT, item_id UUID, grupo TEXT, item_configuracao TEXT, minutos INTEGER, tickets INTEGER)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_inicio TIMESTAMPTZ;
  v_fim TIMESTAMPTZ;
BEGIN
  IF NOT pode_consultar_bancos_horas() THEN
    RAISE EXCEPTION 'Sem permissão para consultar o consumo dos bancos de horas.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT j.inicio, j.fim INTO v_inicio, v_fim FROM bancos_horas_janela(p_ano, p_mes, p_dia_inicio, p_dia_fim) j;

  RETURN QUERY
  WITH orgs AS (
    SELECT lower(trim(o.nome_organizacao)) AS nome
      FROM empresas_organizacoes_aranda o
     WHERE o.empresa_id = p_empresa_id AND o.ativo
  )
  -- Apontamentos (RC-61 a RC-63); duração = minuto real (A3), texto só se faltar
  SELECT 'apontamento'::text,
         a.id,
         a.caso_grupo,
         a.item_configuracao,
         COALESCE(round(a.tempo_gasto_minutos)::integer,
                  CASE WHEN a.tempo_gasto_horas ~ '^\d+:\d{2}(:\d{2})?$'
                       THEN split_part(a.tempo_gasto_horas, ':', 1)::integer * 60
                            + split_part(a.tempo_gasto_horas, ':', 2)::integer
                       ELSE 0 END),
         0
    FROM apontamentos_aranda a
   WHERE lower(trim(a.org_us_final)) IN (SELECT nome FROM orgs)
     AND a.data_atividade >= v_inicio AND a.data_atividade < v_fim
     AND a.ativi_interna = 'Não'
     AND a.item_configuracao <> '000000 - PROJETOS APL'
     AND a.tipo_chamado IN ('IM', 'RF', 'PM')
     AND a.caso_grupo ILIKE ANY (ARRAY['%AMS APL%', '%AMS - APL%', '%AMS - ATENDIMENTO%', '%AMS T&M%'])
     AND a.cod_resolucao IN (SELECT c.codigo FROM codigos_resolucao_banco c WHERE c.conta_horas)
  UNION ALL
  -- Tickets fechados (RC-52, RC-64); nro_solicitacao é único na tabela
  SELECT 'ticket'::text,
         t.id,
         t.nome_grupo::text,
         t.item_configuracao::text,
         0,
         1
    FROM apontamentos_tickets_aranda t
   WHERE lower(trim(t.organizacao)) IN (SELECT nome FROM orgs)
     AND t.status = 'Closed'
     AND t.data_fechamento >= v_inicio AND t.data_fechamento < v_fim
     AND t.item_configuracao <> '000000 - PROJETOS APL'
     AND t.nome_grupo ILIKE ANY (ARRAY['%AMS APL%', '%AMS - APL%', '%AMS - ATENDIMENTO%', '%AMS T&M%'])
     AND t.cod_resolucao IN (SELECT c.codigo FROM codigos_resolucao_banco c WHERE c.conta_tickets);
END;
$$;

-- ---------------------------------------------------------------------
-- Consumo somado por grupo e item de configuração (o que o classificador usa
-- nos meses abertos). O acesso é checado pela função de itens.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bancos_horas_consumo(
  p_empresa_id UUID, p_ano INTEGER, p_mes INTEGER, p_dia_inicio INTEGER DEFAULT 1, p_dia_fim INTEGER DEFAULT 0
)
RETURNS TABLE (fonte TEXT, grupo TEXT, item_configuracao TEXT, minutos INTEGER, tickets INTEGER, itens INTEGER)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT i.fonte, i.grupo, i.item_configuracao, sum(i.minutos)::integer, sum(i.tickets)::integer, count(*)::integer
    FROM bancos_horas_consumo_itens(p_empresa_id, p_ano, p_mes, p_dia_inicio, p_dia_fim) i
   GROUP BY i.fonte, i.grupo, i.item_configuracao;
$$;

-- ---------------------------------------------------------------------
-- Requerimentos que descontam do banco no mês de cobrança (mês civil, Q4).
-- Horas em decimal, como no requerimento: o motor soma por banco e só então
-- converte em minutos, igual ao cálculo atual.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bancos_horas_requerimentos(p_empresa_id UUID, p_ano INTEGER, p_mes INTEGER)
RETURNS TABLE (
  requerimento_id UUID, chamado TEXT, modulo TEXT, produto_id UUID, modulo_id UUID,
  banco_ajustado_id UUID, horas NUMERIC, tickets INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  IF NOT pode_consultar_bancos_horas() THEN
    RAISE EXCEPTION 'Sem permissão para consultar os requerimentos dos bancos de horas.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT r.id,
         r.chamado::text,
         r.modulo::text,
         mrp.produto_id,
         mrp.modulo_id,
         rb.banco_id,
         -- D-01: horas de gestor não descontam
         COALESCE(r.horas_funcional, 0) + COALESCE(r.horas_tecnico, 0),
         COALESCE(r.quantidade_tickets, 0)
    FROM requerimentos r
    LEFT JOIN modulos_requerimento_produto mrp ON mrp.modulo_requerimento = r.modulo
    LEFT JOIN requerimentos_bancos rb ON rb.requerimento_id = r.id
   WHERE r.cliente_id = p_empresa_id
     AND r.tipo_cobranca = 'Banco de Horas'
     AND r.mes_cobranca = lpad(p_mes::text, 2, '0') || '/' || p_ano
     AND r.enviado_faturamento
     AND r.status IN ('enviado_faturamento', 'faturado');
END;
$$;

-- ---------------------------------------------------------------------
-- Permissões de execução
-- ---------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.pode_consultar_bancos_horas() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION
  public.bancos_horas_janela(INTEGER, INTEGER, INTEGER, INTEGER),
  public.bancos_horas_consumo_itens(UUID, INTEGER, INTEGER, INTEGER, INTEGER),
  public.bancos_horas_consumo(UUID, INTEGER, INTEGER, INTEGER, INTEGER),
  public.bancos_horas_requerimentos(UUID, INTEGER, INTEGER)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.bancos_horas_janela(INTEGER, INTEGER, INTEGER, INTEGER),
  public.bancos_horas_consumo_itens(UUID, INTEGER, INTEGER, INTEGER, INTEGER),
  public.bancos_horas_consumo(UUID, INTEGER, INTEGER, INTEGER, INTEGER),
  public.bancos_horas_requerimentos(UUID, INTEGER, INTEGER)
TO authenticated, service_role;
