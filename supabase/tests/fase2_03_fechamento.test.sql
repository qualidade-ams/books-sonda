-- =====================================================================
-- Teste da migration 20261015000009_fase2_fechamento.
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou.
-- Qualquer outra mensagem de erro diz qual verificação falhou.
-- =====================================================================
DO $teste$
DECLARE
  v_admin uuid := (SELECT uga.user_id FROM user_group_assignments uga JOIN user_groups ug ON ug.id = uga.group_id
                    WHERE ug.name = 'Administradores' LIMIT 1);
  v_comum uuid := (SELECT uga.user_id FROM user_group_assignments uga
                    WHERE NOT EXISTS (SELECT 1 FROM user_group_assignments x JOIN user_groups g ON g.id = x.group_id
                                       WHERE x.user_id = uga.user_id AND g.name = 'Administradores')
                    LIMIT 1);
  v_grupo_comum uuid;
  v_emp uuid := gen_random_uuid();
  v_outra uuid := gen_random_uuid();
  v_fiscal uuid; v_edocs uuid; v_banco_outra uuid; v_reajuste uuid;
  v_payload jsonb;
  v_retorno jsonb;
  v_n int;
  v_falhou boolean;
  v_fech record;
BEGIN
  -- Massa
  INSERT INTO empresas (id, nome_completo, nome_abreviado, vigencia_inicio) VALUES (v_emp, 'EMPRESA FECH F2', 'FF2', '2026-01-01');
  INSERT INTO empresas (id, nome_completo, nome_abreviado, vigencia_inicio) VALUES (v_outra, 'OUTRA FECH F2', 'OF2', '2026-01-01');
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem)
  VALUES (v_emp, 'Banco FISCAL', true, 1, 'horas', 6, '2026-07-01', 'OUTROS', 'manual') RETURNING id INTO v_fiscal;
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem, consome_outros_bancos)
  VALUES (v_emp, 'FISCAL – e-DOCS', false, 2, 'horas', 6, '2026-07-01', 'OUTROS', 'manual', true) RETURNING id INTO v_edocs;
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem)
  VALUES (v_outra, 'Banco Padrão', true, 1, 'horas', 3, '2026-01-01', 'OUTROS', 'manual') RETURNING id INTO v_banco_outra;
  INSERT INTO bancos_horas_reajustes (banco_id, mes, ano, tipo, minutos, justificativa)
  VALUES (v_edocs, 12, 2026, 'saida', 390, 'Teste') RETURNING id INTO v_reajuste;

  -- 1. Leitura: quem só vê a Geração de Books enxerga o cadastro dos bancos e os reajustes
  SELECT uga.group_id INTO v_grupo_comum FROM user_group_assignments uga WHERE uga.user_id = v_comum LIMIT 1;
  DELETE FROM screen_permissions WHERE group_id = v_grupo_comum
     AND screen_key IN ('bancos_horas_parametros', 'bancos_horas_controle', 'geracao_books');
  INSERT INTO screen_permissions (group_id, screen_key, permission_level) VALUES (v_grupo_comum, 'geracao_books', 'view');

  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_comum, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO v_n FROM bancos_horas WHERE empresa_id = v_emp;
  IF v_n <> 2 THEN RAISE EXCEPTION 'Quem vê a Geração de Books deveria ler os 2 bancos, leu %', v_n; END IF;
  SELECT count(*) INTO v_n FROM bancos_horas_reajustes WHERE banco_id = v_edocs;
  IF v_n <> 1 THEN RAISE EXCEPTION 'Quem vê a Geração de Books deveria ler o reajuste, leu %', v_n; END IF;

  -- 2. Gravar o fechamento exige Edição na Geração de Books
  v_payload := jsonb_build_object(
    'empresa_id', v_emp, 'ano', 2026, 'mes', 12, 'motivo', 'geracao_book',
    'bancos', jsonb_build_array(
      jsonb_build_object(
        'banco_id', v_fiscal, 'nome_banco', 'Banco FISCAL', 'fim_periodo', true, 'transicao_periodo', false,
        'percentual_repasse', 50, 'taxa_hora', 150, 'taxa_ticket', null,
        'valor_excedente_horas', 0, 'valor_excedente_tickets', 0, 'valor_a_faturar', 0, 'alertas', '[]'::jsonb,
        'parametros', jsonb_build_object('periodo_apuracao', 6),
        'horas', jsonb_build_object('baseline', 0, 'repasse_anterior', 0, 'saldo_a_utilizar', 0, 'consumo', 0,
          'requerimentos', 0, 'reajustes', 3135, 'consumo_total', -3135, 'saldo', 3135, 'consumido_outros', 0,
          'cedido_outros', 390, 'saldo_final', 2745, 'repasse', 0, 'excedente', 0),
        'tickets', null,
        'observacoes', jsonb_build_array(jsonb_build_object('origem', 'consumo_entre_bancos', 'texto', '06:30 horas cedidas ao banco FISCAL – e-DOCS')),
        'itens', jsonb_build_array(jsonb_build_object('tipo', 'apontamento', 'item_id', gen_random_uuid(), 'minutos', 30, 'tickets', 0))
      ),
      jsonb_build_object(
        'banco_id', v_edocs, 'nome_banco', 'FISCAL – e-DOCS', 'fim_periodo', true, 'transicao_periodo', false,
        'percentual_repasse', 50, 'taxa_hora', 150, 'taxa_ticket', null,
        'valor_excedente_horas', 0, 'valor_excedente_tickets', 0, 'valor_a_faturar', 0, 'alertas', '[]'::jsonb,
        'parametros', '{}'::jsonb,
        'horas', jsonb_build_object('baseline', 0, 'repasse_anterior', 0, 'saldo_a_utilizar', 0, 'consumo', 0,
          'requerimentos', 0, 'reajustes', -390, 'consumo_total', 390, 'saldo', -390, 'consumido_outros', 390,
          'cedido_outros', 0, 'saldo_final', 0, 'repasse', 0, 'excedente', 0),
        'tickets', null,
        'observacoes', jsonb_build_array(jsonb_build_object('origem', 'consumo_entre_bancos', 'texto', '06:30 horas consumidas do Banco FISCAL')),
        'itens', jsonb_build_array(jsonb_build_object('tipo', 'reajuste', 'item_id', v_reajuste, 'minutos', 390, 'tickets', 0))
      )
    ),
    'transferencias', jsonb_build_array(jsonb_build_object('cedente_id', v_fiscal, 'consumidor_id', v_edocs, 'unidade', 'horas', 'quantidade', 390))
  );

  v_falhou := false;
  BEGIN PERFORM bancos_horas_registrar_fechamento(v_payload);
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Quem só vê a Geração de Books conseguiu fechar o mês'; END IF;

  -- 3. Primeira geração do Book: grava tudo, versão 1
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  v_retorno := bancos_horas_registrar_fechamento(v_payload);
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  IF v_retorno ->> 'acao' <> 'criado' OR jsonb_array_length(v_retorno -> 'fechamentos') <> 2 THEN
    RAISE EXCEPTION 'Retorno inesperado da 1ª geração: %', v_retorno;
  END IF;
  SELECT * INTO v_fech FROM bancos_horas_fechamentos WHERE banco_id = v_fiscal AND ano = 2026 AND mes = 12 AND vigente;
  IF v_fech.versao <> 1 OR v_fech.motivo <> 'geracao_book' OR v_fech.saldo_minutos <> 3135 OR v_fech.saldo_final_minutos <> 2745
     OR v_fech.cedido_outros_minutos <> 390 OR v_fech.baseline_tickets IS NOT NULL OR v_fech.taxa_hora <> 150
     OR v_fech.fechado_por IS DISTINCT FROM v_admin OR v_fech.nome_banco <> 'Banco FISCAL' OR (v_fech.parametros ->> 'periodo_apuracao') <> '6' THEN
    RAISE EXCEPTION 'Fechamento do Banco FISCAL gravado errado: %', to_jsonb(v_fech);
  END IF;
  SELECT count(*) INTO v_n FROM bancos_horas_fechamento_itens i JOIN bancos_horas_fechamentos f ON f.id = i.fechamento_id
   WHERE f.banco_id IN (v_fiscal, v_edocs) AND f.vigente;
  IF v_n <> 2 THEN RAISE EXCEPTION 'Itens do fechamento: esperado 2, gravou %', v_n; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM bancos_horas_transferencias t
      JOIN bancos_horas_fechamentos c ON c.id = t.fechamento_cedente_id
      JOIN bancos_horas_fechamentos k ON k.id = t.fechamento_consumidor_id
     WHERE c.banco_id = v_fiscal AND k.banco_id = v_edocs AND t.quantidade = 390 AND t.unidade = 'horas'
  ) THEN
    RAISE EXCEPTION 'Transferência não gravada ou ligada aos fechamentos errados';
  END IF;
  SELECT count(*) INTO v_n FROM bancos_horas_observacoes o JOIN bancos_horas_fechamentos f ON f.id = o.fechamento_id
   WHERE o.origem = 'consumo_entre_bancos' AND o.banco_id = f.banco_id AND f.banco_id IN (v_fiscal, v_edocs) AND o.mes = 12 AND o.ano = 2026;
  IF v_n <> 2 THEN RAISE EXCEPTION 'Observações automáticas: esperado 2, gravou %', v_n; END IF;

  -- 4. Regerar o Book não reabre o mês (D-11)
  v_retorno := bancos_horas_registrar_fechamento(v_payload);
  IF v_retorno ->> 'acao' <> 'existente' THEN RAISE EXCEPTION 'Regerar o Book deveria devolver o fechamento existente: %', v_retorno; END IF;
  SELECT count(*) INTO v_n FROM bancos_horas_fechamentos WHERE banco_id IN (v_fiscal, v_edocs);
  IF v_n <> 2 THEN RAISE EXCEPTION 'Regerar o Book criou fechamentos: %', v_n; END IF;

  -- 5. Retificação: versão 2 vigente, versão 1 mantida (D-05)
  v_retorno := bancos_horas_registrar_fechamento(jsonb_set(v_payload, '{motivo}', '"retificacao"'));
  IF v_retorno ->> 'acao' <> 'criado' THEN RAISE EXCEPTION 'Retificação não criou versão: %', v_retorno; END IF;
  SELECT count(*) INTO v_n FROM bancos_horas_fechamentos WHERE banco_id = v_fiscal AND ano = 2026 AND mes = 12;
  IF v_n <> 2 THEN RAISE EXCEPTION 'Retificação deveria manter as 2 versões, há %', v_n; END IF;
  SELECT * INTO v_fech FROM bancos_horas_fechamentos WHERE banco_id = v_fiscal AND ano = 2026 AND mes = 12 AND vigente;
  IF v_fech.versao <> 2 OR v_fech.motivo <> 'retificacao' THEN RAISE EXCEPTION 'Versão vigente após retificar: %', v_fech.versao; END IF;
  IF (SELECT count(*) FROM bancos_horas_fechamento_itens WHERE fechamento_id = v_fech.id) <> 1 THEN
    RAISE EXCEPTION 'A versão retificada não tem os seus itens';
  END IF;

  -- 6. Recusas
  v_falhou := false;
  BEGIN PERFORM bancos_horas_registrar_fechamento(jsonb_set(jsonb_set(v_payload, '{motivo}', '"retificacao"'), '{mes}', '11'));
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Retificou um mês que não estava fechado'; END IF;

  v_falhou := false;
  BEGIN PERFORM bancos_horas_registrar_fechamento(jsonb_set(jsonb_set(v_payload, '{mes}', '10'), '{bancos,0,banco_id}', to_jsonb(v_banco_outra)));
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou banco de outra empresa no fechamento'; END IF;

  v_falhou := false;
  BEGIN PERFORM bancos_horas_registrar_fechamento(jsonb_set(jsonb_set(v_payload, '{mes}', '10'), '{motivo}', '"qualquer"'));
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou motivo inválido'; END IF;

  v_falhou := false;
  BEGIN PERFORM bancos_horas_registrar_fechamento(jsonb_set(jsonb_set(v_payload, '{mes}', '10'), '{bancos,0,observacoes,0,origem}', '"manual"'));
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou observação manual dentro do fechamento'; END IF;
  IF EXISTS (SELECT 1 FROM bancos_horas_fechamentos WHERE banco_id IN (v_fiscal, v_edocs) AND mes = 10) THEN
    RAISE EXCEPTION 'Fechamento recusado deixou linhas gravadas';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
