-- =====================================================================
-- Teste da migration 20261015000003_fase1_bancos_horas.
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
  v_emp1 uuid := gen_random_uuid();
  v_emp2 uuid := gen_random_uuid();
  v_p1 uuid; v_p2 uuid; v_m1 uuid; v_m2 uuid;
  v_padrao1 uuid; v_banco_a uuid; v_banco_b uuid; v_padrao2 uuid;
  v_tabela text;
  v_n int;
  v_falhou boolean;
BEGIN
  -- 1. Estrutura, RLS, tela e extensão
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'btree_gist') THEN
    RAISE EXCEPTION 'Extensão btree_gist não instalada';
  END IF;
  FOREACH v_tabela IN ARRAY ARRAY['bancos_horas','bancos_horas_escopo','bancos_horas_baseline','bancos_horas_repasse'] LOOP
    IF to_regclass('public.' || v_tabela) IS NULL THEN
      RAISE EXCEPTION 'Tabela % não existe', v_tabela;
    END IF;
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = ('public.' || v_tabela)::regclass) THEN
      RAISE EXCEPTION 'Tabela % sem RLS', v_tabela;
    END IF;
    SELECT count(*) INTO v_n FROM (
      SELECT cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = v_tabela GROUP BY cmd HAVING count(*) > 1
    ) d;
    IF v_n > 0 THEN RAISE EXCEPTION 'Política duplicada em %', v_tabela; END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND cmd = 'DELETE'
              AND tablename IN ('bancos_horas','bancos_horas_baseline','bancos_horas_repasse')) THEN
    RAISE EXCEPTION 'Política de DELETE em tabela que deveria ter só exclusão lógica';
  END IF;
  SELECT count(*) INTO v_n FROM screen_permissions sp JOIN user_groups ug ON ug.id = sp.group_id
   WHERE sp.screen_key = 'bancos_horas_parametros' AND ug.name = 'Administradores' AND sp.permission_level = 'edit';
  IF v_n <> 1 OR NOT EXISTS (SELECT 1 FROM screens WHERE key = 'bancos_horas_parametros') THEN
    RAISE EXCEPTION 'Tela bancos_horas_parametros sem registro ou sem Edição para Administradores';
  END IF;
  IF EXISTS (SELECT 1 FROM screen_permissions sp JOIN user_groups ug ON ug.id = sp.group_id
              WHERE sp.screen_key = 'bancos_horas_parametros' AND ug.name <> 'Administradores') THEN
    RAISE EXCEPTION 'Outros grupos receberam permissão em bancos_horas_parametros';
  END IF;

  -- Massa
  INSERT INTO empresas (id, nome_completo, nome_abreviado, vigencia_inicio) VALUES (v_emp1, 'EMPRESA BH 1', 'BH1', '2026-01-01');
  INSERT INTO empresas (id, nome_completo, nome_abreviado) VALUES (v_emp2, 'EMPRESA BH 2', 'BH2');
  INSERT INTO produtos (codigo, nome, ordem) VALUES ('TESTE_P1', 'P1', 90) RETURNING id INTO v_p1;
  INSERT INTO produtos (codigo, nome, ordem) VALUES ('TESTE_P2', 'P2', 91) RETURNING id INTO v_p2;
  INSERT INTO produto_modulos (produto_id, nome, ordem) VALUES (v_p1, 'M1', 1) RETURNING id INTO v_m1;
  INSERT INTO produto_modulos (produto_id, nome, ordem) VALUES (v_p1, 'M2', 2) RETURNING id INTO v_m2;
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem)
  VALUES (v_emp1, 'Banco Padrão', true, 9, 'horas', 3, '2026-01-01', 'OUTROS', 'manual') RETURNING id INTO v_padrao1;
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem)
  VALUES (v_emp1, 'Banco A', false, 1, 'horas', 3, '2026-01-01', 'OUTROS', 'manual') RETURNING id INTO v_banco_a;
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem)
  VALUES (v_emp1, 'Banco B', false, 2, 'tickets', 3, '2026-01-01', 'OUTROS', 'manual') RETURNING id INTO v_banco_b;
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem)
  VALUES (v_emp2, 'Banco Padrão', true, 1, 'horas', 1, '2026-01-01', 'GALLERY', 'manual') RETURNING id INTO v_padrao2;

  -- 2. Regras do banco
  v_falhou := false;
  BEGIN UPDATE bancos_horas SET inicio_vigencia = '2026-01-15' WHERE id = v_banco_a;
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou início de vigência fora do dia 1'; END IF;

  v_falhou := false;
  BEGIN UPDATE bancos_horas SET inicio_vigencia = '2025-12-01' WHERE id = v_banco_a;
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou banco começando antes da vigência do contrato (D-12)'; END IF;

  v_falhou := false;
  BEGIN
    INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem)
    VALUES (v_emp1, 'Outro padrão', true, 5, 'horas', 3, '2026-01-01', 'OUTROS', 'manual');
  EXCEPTION WHEN unique_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou dois bancos padrão ativos'; END IF;

  v_falhou := false;
  BEGIN
    INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem)
    VALUES (v_emp1, 'BANCO A', false, 6, 'horas', 3, '2026-01-01', 'OUTROS', 'manual');
  EXCEPTION WHEN unique_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou nome de banco repetido na empresa'; END IF;

  v_falhou := false;
  BEGIN UPDATE bancos_horas SET tipo_contrato = 'mensal' WHERE id = v_banco_a;
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou tipo de contrato inválido'; END IF;
  v_falhou := false;
  BEGIN UPDATE bancos_horas SET periodo_apuracao = 13 WHERE id = v_banco_a;
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou período de apuração 13'; END IF;
  v_falhou := false;
  BEGIN UPDATE bancos_horas SET repasse_especial = 'simples' WHERE id = v_banco_a;
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou repasse especial "simples" (descartado em D-03)'; END IF;
  v_falhou := false;
  BEGIN UPDATE bancos_horas SET repasse_especial = 'por_periodo' WHERE id = v_banco_a;
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou repasse por período sem duração'; END IF;

  v_falhou := false;
  BEGIN UPDATE bancos_horas SET filtro_ic_operador = 'contem' WHERE id = v_banco_a;
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou filtro sem valor'; END IF;
  v_falhou := false;
  BEGIN UPDATE bancos_horas SET filtro_ic_operador = 'contem', filtro_ic_valor = 'NIQUEL' WHERE id = v_padrao1;
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou filtro avançado no Banco padrão'; END IF;
  UPDATE bancos_horas SET filtro_ic_operador = 'contem', filtro_ic_valor = 'NIQUEL' WHERE id = v_banco_a;

  v_falhou := false;
  BEGIN UPDATE bancos_horas SET ativo = false, inativado_em = now() WHERE id = v_padrao1;
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Inativou o Banco padrão com outros bancos ativos (RN-14)'; END IF;

  INSERT INTO bancos_horas_repasse (banco_id, percentual_mensal, data_inicio) VALUES (v_banco_a, 50, '2026-01-01');
  v_falhou := false;
  BEGIN DELETE FROM bancos_horas WHERE id = v_banco_a;
  EXCEPTION WHEN foreign_key_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Apagou banco com histórico'; END IF;

  -- 3. Escopo (RN-03 a RN-05)
  v_falhou := false;
  BEGIN INSERT INTO bancos_horas_escopo (banco_id, produto_id) VALUES (v_padrao1, v_p2);
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou escopo no Banco padrão'; END IF;

  INSERT INTO bancos_horas_escopo (banco_id, produto_id, modulo_id) VALUES (v_banco_a, v_p1, v_m1);

  v_falhou := false;
  BEGIN INSERT INTO bancos_horas_escopo (banco_id, produto_id, modulo_id) VALUES (v_banco_b, v_p1, v_m1);
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou o mesmo módulo em dois bancos da empresa'; END IF;

  v_falhou := false;
  BEGIN INSERT INTO bancos_horas_escopo (banco_id, produto_id) VALUES (v_banco_b, v_p1);
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou produto inteiro com módulo dele em outro banco'; END IF;

  INSERT INTO bancos_horas_escopo (banco_id, produto_id, modulo_id) VALUES (v_banco_b, v_p1, v_m2);
  INSERT INTO bancos_horas_escopo (banco_id, produto_id) VALUES (v_banco_b, v_p2);

  v_falhou := false;
  BEGIN INSERT INTO bancos_horas_escopo (banco_id, produto_id) VALUES (v_banco_b, v_p2);
  EXCEPTION WHEN unique_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou escopo duplicado no mesmo banco'; END IF;

  -- outra empresa pode usar o mesmo módulo
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem)
  VALUES (v_emp2, 'Banco P1', false, 2, 'horas', 1, '2026-01-01', 'OUTROS', 'manual');
  INSERT INTO bancos_horas_escopo (banco_id, produto_id, modulo_id)
  SELECT id, v_p1, v_m1 FROM bancos_horas WHERE empresa_id = v_emp2 AND nome = 'Banco P1';

  -- banco com escopo não vira padrão
  v_falhou := false;
  BEGIN
    UPDATE bancos_horas SET padrao = false WHERE id = v_padrao1;
    UPDATE bancos_horas SET padrao = true, filtro_ic_operador = NULL, filtro_ic_valor = NULL WHERE id = v_banco_a;
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Banco com escopo virou padrão'; END IF;

  -- 4. Históricos de baseline e repasse
  v_falhou := false;
  BEGIN INSERT INTO bancos_horas_baseline (banco_id, baseline_tickets, data_inicio) VALUES (v_padrao1, 10, '2026-01-01');
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou baseline sem minutos em banco de horas'; END IF;
  v_falhou := false;
  BEGIN INSERT INTO bancos_horas_baseline (banco_id, baseline_minutos, data_inicio) VALUES (v_banco_b, 600, '2026-01-01');
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou baseline sem tickets em banco de tickets'; END IF;
  v_falhou := false;
  BEGIN INSERT INTO bancos_horas_baseline (banco_id, baseline_minutos, data_inicio) VALUES (v_padrao1, -1, '2026-01-01');
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou baseline negativo'; END IF;

  INSERT INTO bancos_horas_baseline (banco_id, baseline_minutos, data_inicio, data_fim) VALUES (v_padrao1, 600, '2026-01-01', '2026-03-31');
  INSERT INTO bancos_horas_baseline (banco_id, baseline_minutos, data_inicio) VALUES (v_padrao1, 900, '2026-04-01');
  v_falhou := false;
  BEGIN INSERT INTO bancos_horas_baseline (banco_id, baseline_minutos, data_inicio, data_fim) VALUES (v_padrao1, 700, '2026-03-01', '2026-03-31');
  EXCEPTION WHEN exclusion_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou vigências de baseline sobrepostas'; END IF;
  v_falhou := false;
  BEGIN INSERT INTO bancos_horas_baseline (banco_id, baseline_minutos, data_inicio, data_fim) VALUES (v_padrao1, 700, '2026-05-01', '2026-04-01');
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou vigência de baseline com fim antes do início'; END IF;

  v_falhou := false;
  BEGIN INSERT INTO bancos_horas_repasse (banco_id, data_inicio) VALUES (v_padrao1, '2026-01-01');
  EXCEPTION WHEN not_null_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou repasse sem percentual'; END IF;
  INSERT INTO bancos_horas_repasse (banco_id, percentual_mensal, data_inicio) VALUES (v_padrao1, 0, '2026-01-01');
  v_falhou := false;
  BEGIN INSERT INTO bancos_horas_repasse (banco_id, percentual_mensal, data_inicio) VALUES (v_padrao1, 50, '2026-06-01');
  EXCEPTION WHEN exclusion_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou vigências de repasse sobrepostas'; END IF;

  UPDATE bancos_horas SET repasse_especial = 'por_periodo', duracao_periodo_meses = 3, periodos_ate_zerar = 2 WHERE id = v_padrao2;
  v_falhou := false;
  BEGIN INSERT INTO bancos_horas_repasse (banco_id, percentual_mensal, data_inicio) VALUES (v_padrao2, 100, '2026-01-01');
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou repasse sem percentuais por período em banco por período'; END IF;
  INSERT INTO bancos_horas_repasse (banco_id, percentual_mensal, percentual_dentro_periodo, percentual_entre_periodos, data_inicio)
  VALUES (v_padrao2, 100, 0, 70, '2026-01-01');

  IF NOT EXISTS (SELECT 1 FROM auditoria_alteracoes WHERE tabela = 'bancos_horas' AND registro_id = v_banco_a::text
                  AND empresa_id = v_emp1 AND banco_id = v_banco_a) THEN
    RAISE EXCEPTION 'Auditoria de bancos_horas sem empresa/banco';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auditoria_alteracoes WHERE tabela = 'bancos_horas_escopo'
                  AND banco_id = v_banco_a AND empresa_id = v_emp1) THEN
    RAISE EXCEPTION 'Auditoria do escopo sem a empresa do banco';
  END IF;

  -- 5. RLS
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_comum, 'role', 'authenticated')::text, true);

  IF EXISTS (SELECT 1 FROM bancos_horas WHERE id = v_banco_a) THEN
    RAISE EXCEPTION 'Usuário sem permissão consegue ler bancos_horas';
  END IF;
  v_falhou := false;
  BEGIN INSERT INTO bancos_horas_repasse (banco_id, percentual_mensal, data_inicio) VALUES (v_banco_b, 10, '2026-01-01');
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Usuário sem permissão gravou repasse'; END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  INSERT INTO bancos_horas_repasse (banco_id, percentual_mensal, data_inicio) VALUES (v_banco_b, 10, '2026-01-01');
  DELETE FROM bancos_horas_repasse WHERE banco_id = v_banco_b;
  IF NOT EXISTS (SELECT 1 FROM bancos_horas_repasse WHERE banco_id = v_banco_b) THEN
    RAISE EXCEPTION 'Administrador apagou histórico de repasse (deveria ser só encerramento de vigência)';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
