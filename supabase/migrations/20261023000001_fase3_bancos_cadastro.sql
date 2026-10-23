-- =====================================================================
-- Fase 3 — migration 19: cadastro dos bancos na tela Empresas
-- (docs/especificacoes/Modelagem_Fase3.md, seção 4; decisão de 23/10/2026)
--
--   bancos_horas_criar()          cria o banco com escopo, baseline e repasse iniciais
--                                 numa transação só (falha no meio não deixa banco
--                                 pela metade, e a tela não apaga bancos)
--   bancos_horas_inativar()       inativa o banco com motivo obrigatório, que vai
--                                 para a auditoria (app.motivo), e grava quando e
--                                 quem inativou
--   bancos_horas_nova_vigencia()  troca a vigência de baseline ou de repasse numa
--                                 transação só: fecha a aberta no mês anterior e
--                                 abre a nova, com motivo. Não começa em mês fechado.
--
-- As regras da Fase 1 continuam nos gatilhos (padrão não inativa com outros
-- ativos, baseline obrigatório pelo tipo, percentuais do repasse por período,
-- vigências sem sobreposição) e valem também por aqui.
-- =====================================================================

-- Sem usuário na sessão (SQL Editor, service role) libera; senão, Edição em
-- Parâmetros dos bancos, a mesma chave das políticas de bancos_horas
CREATE OR REPLACE FUNCTION public.pode_editar_bancos_horas()
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
  RETURN has_screen_permission('bancos_horas_parametros'::text, 'edit'::text);
END;
$$;

-- Motivo obrigatório, até 500 caracteres; devolve o texto limpo
CREATE OR REPLACE FUNCTION public.exigir_motivo(p_motivo TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_motivo TEXT := trim(coalesce(p_motivo, ''));
BEGIN
  IF v_motivo = '' THEN
    RAISE EXCEPTION 'Informe o motivo da alteração.';
  END IF;
  IF length(v_motivo) > 500 THEN
    RAISE EXCEPTION 'O motivo passa de 500 caracteres.';
  END IF;
  RETURN v_motivo;
END;
$$;

-- ---------------------------------------------------------------------
-- 1. Criar banco: banco, escopo, baseline e repasse numa transação só
-- ---------------------------------------------------------------------

-- p_banco: colunas de bancos_horas (as ausentes ficam com o padrão; a ordem é a
-- última da empresa e a origem é manual). p_escopo: [{produto_id, modulo_id}].
-- p_baseline e p_repasse: a primeira vigência, a partir do início do banco.
CREATE OR REPLACE FUNCTION public.bancos_horas_criar(
  p_banco JSONB, p_escopo JSONB, p_baseline JSONB, p_repasse JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b bancos_horas%ROWTYPE;
  v_id UUID;
BEGIN
  IF NOT pode_editar_bancos_horas() THEN
    RAISE EXCEPTION 'Sem permissão para alterar os bancos de horas.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  b := jsonb_populate_record(NULL::bancos_horas, p_banco);

  INSERT INTO bancos_horas (
    empresa_id, nome, descricao, padrao, visivel_cliente, ordem, tipo_contrato, periodo_apuracao,
    inicio_vigencia, fim_vigencia, dia_inicio_apuracao, dia_fim_apuracao, taxa_produto, taxa_tipo_hora,
    repasse_especial, duracao_periodo_meses, periodos_ate_zerar, consome_outros_bancos,
    filtro_ic_operador, filtro_ic_valor, origem
  ) VALUES (
    b.empresa_id, b.nome, b.descricao, coalesce(b.padrao, false), coalesce(b.visivel_cliente, true),
    (SELECT coalesce(max(o.ordem), 0) + 1 FROM bancos_horas o WHERE o.empresa_id = b.empresa_id),
    b.tipo_contrato, b.periodo_apuracao, b.inicio_vigencia, b.fim_vigencia,
    coalesce(b.dia_inicio_apuracao, 1), coalesce(b.dia_fim_apuracao, 0), b.taxa_produto,
    coalesce(b.taxa_tipo_hora, 'excedente'), coalesce(b.repasse_especial, 'nenhum'),
    b.duracao_periodo_meses, b.periodos_ate_zerar, coalesce(b.consome_outros_bancos, false),
    b.filtro_ic_operador, b.filtro_ic_valor, 'manual'
  )
  RETURNING id INTO v_id;

  INSERT INTO bancos_horas_escopo (banco_id, produto_id, modulo_id)
  SELECT v_id, e.produto_id, e.modulo_id
    FROM jsonb_to_recordset(coalesce(p_escopo, '[]'::jsonb)) AS e(produto_id UUID, modulo_id UUID);

  INSERT INTO bancos_horas_baseline (banco_id, baseline_minutos, baseline_tickets, credito, data_inicio, motivo)
  VALUES (v_id, (p_baseline ->> 'baseline_minutos')::integer, (p_baseline ->> 'baseline_tickets')::integer,
          coalesce(p_baseline ->> 'credito', 'mensal'), b.inicio_vigencia, 'Cadastro do banco');

  INSERT INTO bancos_horas_repasse (banco_id, percentual_mensal, percentual_dentro_periodo, percentual_entre_periodos, data_inicio, motivo)
  VALUES (v_id, (p_repasse ->> 'percentual_mensal')::numeric, (p_repasse ->> 'percentual_dentro_periodo')::numeric,
          (p_repasse ->> 'percentual_entre_periodos')::numeric, b.inicio_vigencia, 'Cadastro do banco');

  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------
-- 2. Inativar banco com motivo
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bancos_horas_inativar(p_banco_id UUID, p_motivo TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_motivo TEXT;
BEGIN
  IF NOT pode_editar_bancos_horas() THEN
    RAISE EXCEPTION 'Sem permissão para alterar os bancos de horas.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  v_motivo := exigir_motivo(p_motivo);

  PERFORM set_config('app.motivo', v_motivo, true);
  UPDATE bancos_horas
     SET ativo = false, inativado_em = now(), inativado_por = (SELECT auth.uid())
   WHERE id = p_banco_id AND ativo;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Banco não encontrado ou já inativo.';
  END IF;
  PERFORM set_config('app.motivo', '', true);
END;
$$;

-- ---------------------------------------------------------------------
-- 3. Nova vigência de baseline ou de repasse
-- ---------------------------------------------------------------------

-- p_tipo: 'baseline' ({baseline_minutos, baseline_tickets, credito}) ou
-- 'repasse' ({percentual_mensal, percentual_dentro_periodo, percentual_entre_periodos}).
-- Devolve o id da vigência nova.
CREATE OR REPLACE FUNCTION public.bancos_horas_nova_vigencia(
  p_banco_id UUID, p_tipo TEXT, p_desde DATE, p_valores JSONB, p_motivo TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_motivo TEXT;
  v_banco RECORD;
  v_fechado DATE;
  v_aberta_id UUID;
  v_aberta_inicio DATE;
  v_credito TEXT;
  v_id UUID;
  v_valores JSONB := coalesce(p_valores, '{}'::jsonb);
BEGIN
  IF NOT pode_editar_bancos_horas() THEN
    RAISE EXCEPTION 'Sem permissão para alterar os bancos de horas.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_tipo NOT IN ('baseline', 'repasse') THEN
    RAISE EXCEPTION 'Tipo de vigência desconhecido: %.', p_tipo;
  END IF;
  v_motivo := exigir_motivo(p_motivo);
  IF p_desde IS NULL OR extract(day FROM p_desde) <> 1 THEN
    RAISE EXCEPTION 'A vigência começa no dia 1 do mês.';
  END IF;

  SELECT id, inicio_vigencia INTO v_banco FROM bancos_horas WHERE id = p_banco_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Banco não encontrado.';
  END IF;
  IF p_desde < v_banco.inicio_vigencia THEN
    RAISE EXCEPTION 'A vigência não pode começar antes do início do banco (%).', to_char(v_banco.inicio_vigencia, 'MM/YYYY');
  END IF;

  -- Mês fechado não muda (D-11): a vigência nova começa depois do último fechado
  SELECT max(make_date(f.ano, f.mes, 1)) INTO v_fechado
    FROM bancos_horas_fechamentos f
   WHERE f.banco_id = p_banco_id AND f.vigente;
  IF v_fechado IS NOT NULL AND p_desde <= v_fechado THEN
    RAISE EXCEPTION 'O mês % está fechado: a vigência nova começa depois dele.', to_char(v_fechado, 'MM/YYYY');
  END IF;

  IF p_tipo = 'baseline' THEN
    SELECT id, data_inicio, credito INTO v_aberta_id, v_aberta_inicio, v_credito
      FROM bancos_horas_baseline WHERE banco_id = p_banco_id AND data_fim IS NULL;
  ELSE
    SELECT id, data_inicio INTO v_aberta_id, v_aberta_inicio
      FROM bancos_horas_repasse WHERE banco_id = p_banco_id AND data_fim IS NULL;
  END IF;
  IF v_aberta_id IS NOT NULL AND p_desde <= v_aberta_inicio THEN
    RAISE EXCEPTION 'A vigência nova precisa começar depois de %.', to_char(v_aberta_inicio, 'MM/YYYY');
  END IF;

  PERFORM set_config('app.motivo', v_motivo, true);

  IF p_tipo = 'baseline' THEN
    UPDATE bancos_horas_baseline SET data_fim = p_desde - 1 WHERE id = v_aberta_id;
    INSERT INTO bancos_horas_baseline (banco_id, baseline_minutos, baseline_tickets, credito, data_inicio, motivo)
    VALUES (
      p_banco_id,
      (v_valores ->> 'baseline_minutos')::integer,
      (v_valores ->> 'baseline_tickets')::integer,
      coalesce(v_valores ->> 'credito', v_credito, 'mensal'),
      p_desde,
      v_motivo
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE bancos_horas_repasse SET data_fim = p_desde - 1 WHERE id = v_aberta_id;
    INSERT INTO bancos_horas_repasse (banco_id, percentual_mensal, percentual_dentro_periodo, percentual_entre_periodos, data_inicio, motivo)
    VALUES (
      p_banco_id,
      (v_valores ->> 'percentual_mensal')::numeric,
      (v_valores ->> 'percentual_dentro_periodo')::numeric,
      (v_valores ->> 'percentual_entre_periodos')::numeric,
      p_desde,
      v_motivo
    )
    RETURNING id INTO v_id;
  END IF;

  PERFORM set_config('app.motivo', '', true);
  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.bancos_horas_criar(JSONB, JSONB, JSONB, JSONB) IS
  'Cria o banco com escopo, baseline e repasse iniciais numa transação só';
COMMENT ON FUNCTION public.bancos_horas_inativar(UUID, TEXT) IS
  'Inativa o banco com motivo (auditoria), gravando quando e quem inativou';
COMMENT ON FUNCTION public.bancos_horas_nova_vigencia(UUID, TEXT, DATE, JSONB, TEXT) IS
  'Troca a vigência de baseline ou repasse numa transação: fecha a aberta e abre a nova, fora de mês fechado';

REVOKE ALL ON FUNCTION public.pode_editar_bancos_horas() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.exigir_motivo(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bancos_horas_criar(JSONB, JSONB, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bancos_horas_criar(JSONB, JSONB, JSONB, JSONB) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.bancos_horas_inativar(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.bancos_horas_nova_vigencia(UUID, TEXT, DATE, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bancos_horas_inativar(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bancos_horas_nova_vigencia(UUID, TEXT, DATE, JSONB, TEXT) TO authenticated, service_role;
