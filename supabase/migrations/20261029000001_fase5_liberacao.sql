-- =====================================================================
-- Fase 5 — migration 27: liberar e voltar para legado
-- (docs/especificacoes/Modelagem_Fase5.md, seções 3 e 4; decisões P1, P4 e P6)
--
--   bancos_horas_fechamentos   motivo "transicao": o último mês fechado no legado,
--                              com os valores do último Book (P1). O motor parte
--                              do repasse dele, e o cliente continua do saldo que viu
--   bancos_horas_registrar_fechamento  aceita "transicao" só dentro da liberação
--   liberar_empresa()          valida, grava o modelo multiplo e a transição
--   voltar_para_legado()       copia para o legado os reajustes e observações
--                              lançados no Controle novo (P4) e volta o modelo
--   lancamentos_para_legado()  o que a volta vai copiar, para a confirmação
--
-- Quem libera e volta: Edição na tela Comparação Legado x Novo (P6).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Motivo "transicao"
-- ---------------------------------------------------------------------

ALTER TABLE bancos_horas_fechamentos DROP CONSTRAINT IF EXISTS bancos_horas_fechamentos_motivo_check;
ALTER TABLE bancos_horas_fechamentos ADD CONSTRAINT bancos_horas_fechamentos_motivo_check
  CHECK (motivo IN ('geracao_book', 'retificacao', 'transicao'));

-- ---------------------------------------------------------------------
-- 2. Gravação do fechamento: igual à versão da migration 20261022000007,
--    mais o motivo "transicao" (blocos marcados com "Fase 5")
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
  -- Fase 5: a transição só é gravada por liberar_empresa, que confere a permissão dela
  IF v_motivo = 'transicao' THEN
    IF COALESCE(current_setting('app.liberacao', true), '') IS DISTINCT FROM v_empresa::text THEN
      RAISE EXCEPTION 'O fechamento de transição só é gravado pela liberação da empresa.'
        USING ERRCODE = 'check_violation';
    END IF;
  ELSIF NOT (v_claims IS NULL OR v_claims ->> 'role' = 'service_role'
             OR has_screen_permission('geracao_books'::text, 'edit'::text)) THEN
    RAISE EXCEPTION 'Sem permissão para fechar o mês dos bancos de horas.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_motivo IS NULL OR v_motivo NOT IN ('geracao_book', 'retificacao', 'transicao') THEN
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
    -- Retificação e transição (Fase 5) gravam nova versão
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

    -- Fase 3: a retificação aplica os retroativos aprovados do banco e do mês
    IF v_motivo = 'retificacao' THEN
      UPDATE bancos_horas_retroativos
         SET situacao = 'aplicado', fechamento_aplicado_id = v_fechamento_id
       WHERE banco_id = v_banco_id AND ano = v_ano AND mes = v_mes AND situacao = 'aprovado';
    END IF;
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

-- ---------------------------------------------------------------------
-- 3. Liberar
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.liberar_empresa(p_empresa_id UUID, p_fechamento JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_modelo TEXT;
  v_comparacao RECORD;
  v_ultimo RECORD;
  v_transicao JSONB;
BEGIN
  IF NOT has_screen_permission('bancos_horas_comparacao'::text, 'edit'::text) THEN
    RAISE EXCEPTION 'Sem permissão para liberar a empresa.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT modelo_calculo INTO v_modelo FROM empresas WHERE id = p_empresa_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empresa não encontrada.' USING ERRCODE = 'check_violation';
  END IF;
  IF v_modelo <> 'legado' THEN
    RAISE EXCEPTION 'A empresa já está liberada.' USING ERRCODE = 'check_violation';
  END IF;

  SELECT situacao, validada_em INTO v_comparacao FROM bancos_horas_comparacao WHERE empresa_id = p_empresa_id;
  IF v_comparacao.validada_em IS NULL THEN
    RAISE EXCEPTION 'Valide a comparação da empresa antes de liberar.' USING ERRCODE = 'check_violation';
  END IF;
  IF v_comparacao.situacao IS NULL OR v_comparacao.situacao = 'divergente' THEN
    RAISE EXCEPTION 'A comparação da empresa está Divergente: corrija e recalcule antes de liberar.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM bancos_horas WHERE empresa_id = p_empresa_id AND ativo) THEN
    RAISE EXCEPTION 'A empresa não tem banco ativo.' USING ERRCODE = 'check_violation';
  END IF;

  -- A transição é o último mês que o legado fechou (P1). Sem mês fechado, não há transição.
  SELECT ano, mes INTO v_ultimo FROM banco_horas_fechamentos
   WHERE empresa_id = p_empresa_id ORDER BY ano DESC, mes DESC LIMIT 1;
  IF FOUND THEN
    IF p_fechamento IS NULL
       OR p_fechamento ->> 'motivo' IS DISTINCT FROM 'transicao'
       OR (p_fechamento ->> 'ano')::int IS DISTINCT FROM v_ultimo.ano
       OR (p_fechamento ->> 'mes')::int IS DISTINCT FROM v_ultimo.mes THEN
      RAISE EXCEPTION 'A transição tem de ser o último mês fechado no legado (%/%).', v_ultimo.mes, v_ultimo.ano
        USING ERRCODE = 'check_violation';
    END IF;
  ELSIF p_fechamento IS NOT NULL THEN
    RAISE EXCEPTION 'A empresa não tem mês fechado no legado: não há transição.' USING ERRCODE = 'check_violation';
  END IF;

  PERFORM set_config('app.motivo', 'Liberação para o modelo novo', true);
  UPDATE empresas
     SET modelo_calculo = 'multiplo', modelo_alterado_em = NOW(), modelo_alterado_por = (SELECT auth.uid())
   WHERE id = p_empresa_id;

  IF p_fechamento IS NOT NULL THEN
    PERFORM set_config('app.liberacao', p_empresa_id::text, true);
    v_transicao := bancos_horas_registrar_fechamento(p_fechamento || jsonb_build_object('empresa_id', p_empresa_id));
    PERFORM set_config('app.liberacao', '', true);
  END IF;
  PERFORM set_config('app.motivo', '', true);

  RETURN jsonb_build_object('transicao', v_transicao);
END;
$$;

-- ---------------------------------------------------------------------
-- 4. O que a volta copia para o legado (P4): lançado no Controle novo
--    durante a liberação, ativo, manual, em banco que o cliente vê
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reajustes_para_legado(p_empresa_id UUID)
RETURNS SETOF bancos_horas_reajustes
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.*
    FROM bancos_horas_reajustes r
    JOIN bancos_horas b ON b.id = r.banco_id
    JOIN empresas e ON e.id = b.empresa_id
   WHERE e.id = p_empresa_id AND b.visivel_cliente
     AND r.ativo AND r.origem = 'manual' AND r.reajuste_legado_id IS NULL
     AND r.created_at >= e.modelo_alterado_em
   ORDER BY r.ano, r.mes, r.created_at;
$$;

CREATE OR REPLACE FUNCTION public.observacoes_para_legado(p_empresa_id UUID)
RETURNS SETOF bancos_horas_observacoes
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.*
    FROM bancos_horas_observacoes o
    JOIN bancos_horas b ON b.id = o.banco_id
    JOIN empresas e ON e.id = b.empresa_id
   WHERE e.id = p_empresa_id AND b.visivel_cliente
     AND o.ativo AND o.origem IN ('manual', 'ajuste')
     AND o.created_at >= e.modelo_alterado_em
   ORDER BY o.ano, o.mes, o.created_at;
$$;

CREATE OR REPLACE FUNCTION public.lancamentos_para_legado(p_empresa_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_screen_permission('bancos_horas_comparacao'::text, 'edit'::text) THEN
    RAISE EXCEPTION 'Sem permissão para voltar a empresa para o legado.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN jsonb_build_object(
    'reajustes', (SELECT count(*) FROM reajustes_para_legado(p_empresa_id)),
    'observacoes', (SELECT count(*) FROM observacoes_para_legado(p_empresa_id)));
END;
$$;

-- ---------------------------------------------------------------------
-- 5. Voltar para legado (CA-09)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.voltar_para_legado(p_empresa_id UUID, p_motivo TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_motivo TEXT := trim(COALESCE(p_motivo, ''));
  v_modelo TEXT;
  v_varios BOOLEAN;
  r RECORD;
  v_texto TEXT;
  v_legado UUID;
  v_reajustes INT := 0;
  v_observacoes INT := 0;
BEGIN
  IF NOT has_screen_permission('bancos_horas_comparacao'::text, 'edit'::text) THEN
    RAISE EXCEPTION 'Sem permissão para voltar a empresa para o legado.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_motivo = '' THEN
    RAISE EXCEPTION 'Informe o motivo.' USING ERRCODE = 'check_violation';
  END IF;

  SELECT modelo_calculo INTO v_modelo FROM empresas WHERE id = p_empresa_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empresa não encontrada.' USING ERRCODE = 'check_violation';
  END IF;
  IF v_modelo <> 'multiplo' THEN
    RAISE EXCEPTION 'A empresa já está no legado.' USING ERRCODE = 'check_violation';
  END IF;

  -- O legado tem um banco só: com vários bancos, o texto leva o nome do banco de origem
  v_varios := (SELECT count(*) FROM bancos_horas WHERE empresa_id = p_empresa_id AND visivel_cliente) > 1;

  -- A cópia acontece com a empresa ainda liberada: o espelho da Fase 4 ignora empresa
  -- fora do Legado, então a linha nova não volta duplicada. Ela fica ligada pelo
  -- reajuste_legado_id, e as edições seguintes no legado espelham nela.
  FOR r IN SELECT x.*, b.nome AS nome_banco
             FROM reajustes_para_legado(p_empresa_id) x JOIN bancos_horas b ON b.id = x.banco_id LOOP
    v_texto := trim(r.justificativa) || CASE WHEN v_varios THEN ' (' || r.nome_banco || ')' ELSE '' END;
    IF length(v_texto) < 3 THEN
      v_texto := v_texto || ' (modelo novo)';
    END IF;
    INSERT INTO banco_horas_reajustes (empresa_id, mes, ano, valor_reajuste_horas, valor_reajuste_tickets,
                                       tipo_reajuste, observacao, created_by, ativo)
    VALUES (p_empresa_id, r.mes, r.ano,
            lpad((r.minutos / 60)::text, 2, '0') || ':' || lpad((r.minutos % 60)::text, 2, '0'),
            r.tickets, r.tipo, v_texto, r.created_by, true)
    RETURNING id INTO v_legado;
    UPDATE bancos_horas_reajustes SET reajuste_legado_id = v_legado WHERE id = r.id;
    v_reajustes := v_reajustes + 1;
  END LOOP;

  FOR r IN SELECT x.*, b.nome AS nome_banco
             FROM observacoes_para_legado(p_empresa_id) x JOIN bancos_horas b ON b.id = x.banco_id LOOP
    INSERT INTO banco_horas_observacoes (empresa_id, mes, ano, observacao, tipo, created_by)
    VALUES (p_empresa_id, r.mes, r.ano,
            left(trim(r.texto) || CASE WHEN v_varios THEN ' (' || r.nome_banco || ')' ELSE '' END, 700),
            r.origem, r.created_by);
    v_observacoes := v_observacoes + 1;
  END LOOP;

  PERFORM set_config('app.motivo', v_motivo, true);
  UPDATE empresas
     SET modelo_calculo = 'legado', modelo_alterado_em = NOW(), modelo_alterado_por = (SELECT auth.uid())
   WHERE id = p_empresa_id;

  -- A empresa volta para a comparação: a validação é desfeita
  UPDATE bancos_horas_comparacao
     SET validada_por = NULL, validada_em = NULL, validacao_situacao = NULL
   WHERE empresa_id = p_empresa_id AND validada_em IS NOT NULL;
  PERFORM set_config('app.motivo', '', true);

  RETURN jsonb_build_object('reajustes', v_reajustes, 'observacoes', v_observacoes);
END;
$$;

REVOKE ALL ON FUNCTION public.liberar_empresa(UUID, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.voltar_para_legado(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lancamentos_para_legado(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.liberar_empresa(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.voltar_para_legado(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lancamentos_para_legado(UUID) TO authenticated;

-- Internas: só as funções acima usam
REVOKE ALL ON FUNCTION public.reajustes_para_legado(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.observacoes_para_legado(UUID) FROM PUBLIC, anon, authenticated;
