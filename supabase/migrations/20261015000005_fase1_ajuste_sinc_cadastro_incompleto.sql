-- =====================================================================
-- Fase 1 — migration 5: ajuste da sincronização para cadastro incompleto
--
-- Uma empresa com tipo de contrato mas sem período de apuração (hoje, a
-- HYPERA PHARMA, cliente novo) não tem banco no legado: o motor atual dá erro
-- "Período de apuração não configurado". O espelho passa a ignorar esse caso
-- (sem registrar falha), como já faz com quem não tem tipo de contrato. Quando
-- o cadastro for completado na tela atual, a sincronização cria o banco.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.sinc_banco_espelho(p_empresa_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e empresas_clientes%ROWTYPE;
  v_banco_id UUID;
  v_taxa TEXT;
  v_repasse TEXT;
  v_origem_anterior TEXT := COALESCE(current_setting('app.origem', true), '');
BEGIN
  SELECT * INTO e FROM empresas_clientes WHERE id = p_empresa_id;
  -- Cadastro incompleto no legado (sem tipo, início ou período): não há banco para espelhar
  IF NOT FOUND OR e.tipo_contrato IS NULL OR e.inicio_vigencia IS NULL OR e.periodo_apuracao IS NULL THEN
    RETURN;
  END IF;
  -- Só enquanto a empresa estiver no modelo legado
  IF NOT EXISTS (SELECT 1 FROM empresas WHERE id = p_empresa_id AND modelo_calculo = 'legado') THEN
    RETURN;
  END IF;

  SELECT id INTO v_banco_id FROM bancos_horas WHERE empresa_id = p_empresa_id AND espelha_legado;
  -- Empresa que já tem bancos próprios (sem espelho): não mexe
  IF v_banco_id IS NULL AND EXISTS (SELECT 1 FROM bancos_horas WHERE empresa_id = p_empresa_id) THEN
    RETURN;
  END IF;

  IF v_origem_anterior NOT IN ('carga') THEN
    PERFORM set_config('app.origem', 'sincronizacao', true);
  END IF;

  -- Taxa mais recente do cliente, como o motor atual faz
  SELECT CASE WHEN upper(tipo_produto) = 'GALLERY' THEN 'GALLERY' ELSE 'OUTROS' END INTO v_taxa
    FROM taxas_clientes WHERE cliente_id = p_empresa_id AND vigencia_inicio <= CURRENT_DATE
   ORDER BY vigencia_inicio DESC LIMIT 1;
  v_taxa := COALESCE(v_taxa, 'OUTROS');

  -- D-03: o "simples" não existe no modelo novo
  v_repasse := CASE WHEN e.possui_repasse_especial AND e.tipo_repasse_especial = 'por_periodo' THEN 'por_periodo' ELSE 'nenhum' END;

  IF v_banco_id IS NULL THEN
    INSERT INTO bancos_horas (
      empresa_id, nome, padrao, visivel_cliente, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia,
      dia_inicio_apuracao, dia_fim_apuracao, taxa_produto, repasse_especial, duracao_periodo_meses,
      periodos_ate_zerar, origem, espelha_legado
    ) VALUES (
      p_empresa_id, 'Banco de Horas', true, true, 1, e.tipo_contrato, e.periodo_apuracao,
      date_trunc('month', e.inicio_vigencia)::date,
      COALESCE(e.dia_inicio_apuracao, 1), COALESCE(e.dia_fim_apuracao, 0), v_taxa, v_repasse,
      CASE WHEN v_repasse = 'por_periodo' THEN e.duracao_periodo_meses END,
      CASE WHEN v_repasse = 'por_periodo' THEN e.periodos_ate_zerar END,
      'carga_legado', true
    )
    RETURNING id INTO v_banco_id;
  ELSE
    UPDATE bancos_horas SET
      tipo_contrato = e.tipo_contrato,
      periodo_apuracao = e.periodo_apuracao,
      inicio_vigencia = date_trunc('month', e.inicio_vigencia)::date,
      dia_inicio_apuracao = COALESCE(e.dia_inicio_apuracao, 1),
      dia_fim_apuracao = COALESCE(e.dia_fim_apuracao, 0),
      taxa_produto = v_taxa,
      repasse_especial = v_repasse,
      duracao_periodo_meses = CASE WHEN v_repasse = 'por_periodo' THEN e.duracao_periodo_meses END,
      periodos_ate_zerar = CASE WHEN v_repasse = 'por_periodo' THEN e.periodos_ate_zerar END
    WHERE id = v_banco_id;
  END IF;

  -- Baseline: mesmos ids do legado; ordem remove → atualiza → insere (evita
  -- sobreposição transitória na constraint de vigência)
  DELETE FROM bancos_horas_baseline b
   WHERE b.banco_id = v_banco_id
     AND NOT EXISTS (SELECT 1 FROM baseline_historico h WHERE h.id = b.id AND h.empresa_id = p_empresa_id);

  UPDATE bancos_horas_baseline b SET
    baseline_minutos = round(h.baseline_horas * 60)::integer,
    baseline_tickets = h.baseline_tickets,
    credito = CASE WHEN h.tipo_banco = 'anual' THEN 'anual' ELSE 'mensal' END,
    data_inicio = h.data_inicio,
    data_fim = h.data_fim,
    motivo = h.motivo,
    observacao = h.observacao
  FROM baseline_historico h
  WHERE h.id = b.id AND b.banco_id = v_banco_id
    AND (b.baseline_minutos, b.baseline_tickets, b.credito, b.data_inicio, b.data_fim, b.motivo, b.observacao)
        IS DISTINCT FROM
        (round(h.baseline_horas * 60)::integer, h.baseline_tickets, CASE WHEN h.tipo_banco = 'anual' THEN 'anual' ELSE 'mensal' END,
         h.data_inicio, h.data_fim, h.motivo, h.observacao);

  INSERT INTO bancos_horas_baseline (id, banco_id, baseline_minutos, baseline_tickets, credito, data_inicio, data_fim, motivo, observacao)
  SELECT h.id, v_banco_id, round(h.baseline_horas * 60)::integer, h.baseline_tickets,
         CASE WHEN h.tipo_banco = 'anual' THEN 'anual' ELSE 'mensal' END,
         h.data_inicio, h.data_fim, h.motivo, h.observacao
    FROM baseline_historico h
   WHERE h.empresa_id = p_empresa_id
     AND NOT EXISTS (SELECT 1 FROM bancos_horas_baseline b WHERE b.id = h.id)
   ORDER BY h.data_inicio;

  -- Repasse: mesmos ids; percentuais por período vêm da empresa (no legado não têm histórico)
  DELETE FROM bancos_horas_repasse r
   WHERE r.banco_id = v_banco_id
     AND NOT EXISTS (SELECT 1 FROM percentual_repasse_historico h WHERE h.id = r.id AND h.empresa_id = p_empresa_id);

  UPDATE bancos_horas_repasse r SET
    percentual_mensal = h.percentual,
    percentual_dentro_periodo = CASE WHEN v_repasse = 'por_periodo' THEN e.percentual_dentro_periodo END,
    percentual_entre_periodos = CASE WHEN v_repasse = 'por_periodo' THEN e.percentual_entre_periodos END,
    data_inicio = h.data_inicio,
    data_fim = h.data_fim,
    motivo = h.motivo,
    observacao = h.observacao
  FROM percentual_repasse_historico h
  WHERE h.id = r.id AND r.banco_id = v_banco_id
    AND (r.percentual_mensal, r.percentual_dentro_periodo, r.percentual_entre_periodos, r.data_inicio, r.data_fim, r.motivo, r.observacao)
        IS DISTINCT FROM
        (h.percentual,
         CASE WHEN v_repasse = 'por_periodo' THEN e.percentual_dentro_periodo END,
         CASE WHEN v_repasse = 'por_periodo' THEN e.percentual_entre_periodos END,
         h.data_inicio, h.data_fim, h.motivo, h.observacao);

  INSERT INTO bancos_horas_repasse (id, banco_id, percentual_mensal, percentual_dentro_periodo, percentual_entre_periodos, data_inicio, data_fim, motivo, observacao)
  SELECT h.id, v_banco_id, h.percentual,
         CASE WHEN v_repasse = 'por_periodo' THEN e.percentual_dentro_periodo END,
         CASE WHEN v_repasse = 'por_periodo' THEN e.percentual_entre_periodos END,
         h.data_inicio, h.data_fim, h.motivo, h.observacao
    FROM percentual_repasse_historico h
   WHERE h.empresa_id = p_empresa_id
     AND NOT EXISTS (SELECT 1 FROM bancos_horas_repasse r WHERE r.id = h.id)
   ORDER BY h.data_inicio;

  PERFORM set_config('app.origem', v_origem_anterior, true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sinc_banco_espelho(UUID) FROM PUBLIC, anon, authenticated;
