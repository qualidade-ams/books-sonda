-- =====================================================================
-- Fase 2 — migration 9: fechamento do mês (Modelagem_Fase2.md, seções 2 e 6)
--
-- 1. Leitura: quem vê o Controle novo ou a Geração de Books lê o cadastro dos
--    bancos (parâmetros, escopo, baseline, repasse), os reajustes e as
--    observações. Antes, só quem tinha a permissão de Parâmetros lia os bancos.
-- 2. bancos_horas_registrar_fechamento(jsonb): grava numa transação só o mês de
--    todos os bancos da empresa, com itens, transferências e observações
--    automáticas.
--      geracao_book: se o mês já está fechado, não reabre (D-11) e devolve o existente
--      retificacao: nova versão vigente; as anteriores ficam (D-05, D-09)
--    Só quem tem Edição na Geração de Books (ou o sync-api, com service role).
--
-- O resultado é calculado pelo motor (src/services/bancosHoras); a função só
-- valida e grava. Nenhuma tabela atual é alterada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Leitura
-- ---------------------------------------------------------------------

DO $$
DECLARE
  v_tabela TEXT;
BEGIN
  FOREACH v_tabela IN ARRAY ARRAY['bancos_horas', 'bancos_horas_escopo', 'bancos_horas_baseline', 'bancos_horas_repasse'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_tabela || '_select', v_tabela);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING ('
      || 'has_screen_permission(''bancos_horas_parametros''::text, ''view''::text) '
      || 'OR has_screen_permission(''bancos_horas_controle''::text, ''view''::text) '
      || 'OR has_screen_permission(''geracao_books''::text, ''view''::text))',
      v_tabela || '_select', v_tabela);
  END LOOP;

  FOREACH v_tabela IN ARRAY ARRAY['bancos_horas_reajustes', 'bancos_horas_observacoes'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_tabela || '_select', v_tabela);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING ('
      || 'has_screen_permission(''bancos_horas_controle''::text, ''view''::text) '
      || 'OR has_screen_permission(''geracao_books''::text, ''view''::text))',
      v_tabela || '_select', v_tabela);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 2. Gravação do fechamento
--
-- p_fechamento:
-- {
--   "empresa_id", "ano", "mes", "motivo": "geracao_book" | "retificacao",
--   "bancos": [{
--     "banco_id", "nome_banco", "fim_periodo", "transicao_periodo", "percentual_repasse",
--     "taxa_hora", "taxa_ticket", "valor_excedente_horas", "valor_excedente_tickets",
--     "valor_a_faturar", "alertas": [texto], "parametros": {...},
--     "horas" | "tickets": null | { "baseline", "repasse_anterior", "saldo_a_utilizar",
--        "consumo", "requerimentos", "reajustes", "consumo_total", "saldo",
--        "consumido_outros", "cedido_outros", "saldo_final", "repasse", "excedente" },
--     "observacoes": [{ "origem": "consumo_entre_bancos" | "faturamento", "texto" }],
--     "itens": [{ "tipo", "item_id", "minutos", "tickets" }]
--   }],
--   "transferencias": [{ "cedente_id", "consumidor_id", "unidade", "quantidade" }]  -- ids de banco
-- }
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bancos_horas_registrar_fechamento(p_fechamento JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claims JSONB := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  v_empresa UUID := (p_fechamento ->> 'empresa_id')::uuid;
  v_ano SMALLINT := (p_fechamento ->> 'ano')::smallint;
  v_mes SMALLINT := (p_fechamento ->> 'mes')::smallint;
  v_motivo TEXT := p_fechamento ->> 'motivo';
  v_bancos UUID[];
  v_banco JSONB;
  v_h JSONB;
  v_t JSONB;
  v_banco_id UUID;
  v_fechamento_id UUID;
  v_versao SMALLINT;
  v_ids JSONB := '{}'::jsonb;
  v_retorno JSONB := '[]'::jsonb;
BEGIN
  IF NOT (v_claims IS NULL OR v_claims ->> 'role' = 'service_role'
          OR has_screen_permission('geracao_books'::text, 'edit'::text)) THEN
    RAISE EXCEPTION 'Sem permissão para fechar o mês dos bancos de horas.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_motivo IS NULL OR v_motivo NOT IN ('geracao_book', 'retificacao') THEN
    RAISE EXCEPTION 'Motivo de fechamento inválido: %', v_motivo USING ERRCODE = 'check_violation';
  END IF;

  SELECT array_agg((b ->> 'banco_id')::uuid) INTO v_bancos
    FROM jsonb_array_elements(COALESCE(p_fechamento -> 'bancos', '[]'::jsonb)) b;
  IF v_bancos IS NULL THEN
    RAISE EXCEPTION 'Fechamento sem bancos.' USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(v_bancos) AS u(banco_id)
     WHERE NOT EXISTS (SELECT 1 FROM bancos_horas b WHERE b.id = u.banco_id AND b.empresa_id = v_empresa)
  ) THEN
    RAISE EXCEPTION 'O fechamento tem banco que não é da empresa.' USING ERRCODE = 'check_violation';
  END IF;

  -- Um fechamento por vez para a empresa e o mês
  PERFORM pg_advisory_xact_lock(hashtext('bancos_horas_fechamento:' || v_empresa::text || ':' || v_ano || '-' || v_mes));

  IF EXISTS (SELECT 1 FROM bancos_horas_fechamentos f
              WHERE f.banco_id = ANY (v_bancos) AND f.ano = v_ano AND f.mes = v_mes AND f.vigente) THEN
    IF v_motivo = 'geracao_book' THEN
      -- D-11: regerar o Book usa o que já foi fechado
      SELECT jsonb_agg(jsonb_build_object('banco_id', f.banco_id, 'fechamento_id', f.id, 'versao', f.versao))
        INTO v_retorno
        FROM bancos_horas_fechamentos f
       WHERE f.banco_id = ANY (v_bancos) AND f.ano = v_ano AND f.mes = v_mes AND f.vigente;
      RETURN jsonb_build_object('acao', 'existente', 'fechamentos', v_retorno);
    END IF;
    UPDATE bancos_horas_fechamentos SET vigente = FALSE
     WHERE banco_id = ANY (v_bancos) AND ano = v_ano AND mes = v_mes AND vigente;
  ELSIF v_motivo = 'retificacao' THEN
    RAISE EXCEPTION 'O mês %/% não está fechado: não há o que retificar.', v_mes, v_ano
      USING ERRCODE = 'check_violation';
  END IF;

  FOR v_banco IN SELECT * FROM jsonb_array_elements(p_fechamento -> 'bancos') LOOP
    v_banco_id := (v_banco ->> 'banco_id')::uuid;
    v_h := NULLIF(v_banco -> 'horas', 'null'::jsonb);
    v_t := NULLIF(v_banco -> 'tickets', 'null'::jsonb);

    SELECT COALESCE(max(versao), 0) + 1 INTO v_versao
      FROM bancos_horas_fechamentos WHERE banco_id = v_banco_id AND ano = v_ano AND mes = v_mes;

    INSERT INTO bancos_horas_fechamentos (
      banco_id, mes, ano, versao, vigente, motivo, nome_banco, fim_periodo, transicao_periodo,
      baseline_minutos, repasse_anterior_minutos, saldo_a_utilizar_minutos, consumo_minutos, requerimentos_minutos,
      reajustes_minutos, consumo_total_minutos, saldo_minutos, consumido_outros_minutos, cedido_outros_minutos,
      saldo_final_minutos, repasse_minutos, excedente_minutos,
      baseline_tickets, repasse_anterior_tickets, saldo_a_utilizar_tickets, consumo_tickets, requerimentos_tickets,
      reajustes_tickets, consumo_total_tickets, saldo_tickets, consumido_outros_tickets, cedido_outros_tickets,
      saldo_final_tickets, repasse_tickets, excedente_tickets,
      percentual_repasse, taxa_hora, taxa_ticket, valor_excedente_horas, valor_excedente_tickets, valor_a_faturar,
      alertas, parametros, fechado_por
    ) VALUES (
      v_banco_id, v_mes, v_ano, v_versao, TRUE, v_motivo, v_banco ->> 'nome_banco',
      COALESCE((v_banco ->> 'fim_periodo')::boolean, FALSE), COALESCE((v_banco ->> 'transicao_periodo')::boolean, FALSE),
      (v_h ->> 'baseline')::int, (v_h ->> 'repasse_anterior')::int, (v_h ->> 'saldo_a_utilizar')::int,
      (v_h ->> 'consumo')::int, (v_h ->> 'requerimentos')::int, (v_h ->> 'reajustes')::int,
      (v_h ->> 'consumo_total')::int, (v_h ->> 'saldo')::int, (v_h ->> 'consumido_outros')::int,
      (v_h ->> 'cedido_outros')::int, (v_h ->> 'saldo_final')::int, (v_h ->> 'repasse')::int, (v_h ->> 'excedente')::int,
      (v_t ->> 'baseline')::int, (v_t ->> 'repasse_anterior')::int, (v_t ->> 'saldo_a_utilizar')::int,
      (v_t ->> 'consumo')::int, (v_t ->> 'requerimentos')::int, (v_t ->> 'reajustes')::int,
      (v_t ->> 'consumo_total')::int, (v_t ->> 'saldo')::int, (v_t ->> 'consumido_outros')::int,
      (v_t ->> 'cedido_outros')::int, (v_t ->> 'saldo_final')::int, (v_t ->> 'repasse')::int, (v_t ->> 'excedente')::int,
      (v_banco ->> 'percentual_repasse')::numeric, (v_banco ->> 'taxa_hora')::numeric, (v_banco ->> 'taxa_ticket')::numeric,
      COALESCE((v_banco ->> 'valor_excedente_horas')::numeric, 0), COALESCE((v_banco ->> 'valor_excedente_tickets')::numeric, 0),
      COALESCE((v_banco ->> 'valor_a_faturar')::numeric, 0),
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_banco -> 'alertas', '[]'::jsonb))), '{}'),
      COALESCE(v_banco -> 'parametros', '{}'::jsonb),
      (SELECT auth.uid())
    )
    RETURNING id INTO v_fechamento_id;

    v_ids := v_ids || jsonb_build_object(v_banco_id::text, v_fechamento_id);
    v_retorno := v_retorno || jsonb_build_array(
      jsonb_build_object('banco_id', v_banco_id, 'fechamento_id', v_fechamento_id, 'versao', v_versao));

    INSERT INTO bancos_horas_fechamento_itens (fechamento_id, tipo, item_id, minutos, tickets)
    SELECT v_fechamento_id, i ->> 'tipo', (i ->> 'item_id')::uuid,
           COALESCE((i ->> 'minutos')::int, 0), COALESCE((i ->> 'tickets')::int, 0)
      FROM jsonb_array_elements(COALESCE(v_banco -> 'itens', '[]'::jsonb)) i;

    -- Só automáticas: a constraint recusa "manual" ou "ajuste" com fechamento
    INSERT INTO bancos_horas_observacoes (banco_id, mes, ano, texto, origem, fechamento_id)
    SELECT v_banco_id, v_mes, v_ano, o ->> 'texto', o ->> 'origem', v_fechamento_id
      FROM jsonb_array_elements(COALESCE(v_banco -> 'observacoes', '[]'::jsonb)) o;
  END LOOP;

  INSERT INTO bancos_horas_transferencias (fechamento_consumidor_id, fechamento_cedente_id, unidade, quantidade)
  SELECT (v_ids ->> (t ->> 'consumidor_id'))::uuid, (v_ids ->> (t ->> 'cedente_id'))::uuid,
         t ->> 'unidade', (t ->> 'quantidade')::int
    FROM jsonb_array_elements(COALESCE(p_fechamento -> 'transferencias', '[]'::jsonb)) t;

  RETURN jsonb_build_object('acao', 'criado', 'fechamentos', v_retorno);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bancos_horas_registrar_fechamento(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bancos_horas_registrar_fechamento(JSONB) TO authenticated, service_role;
