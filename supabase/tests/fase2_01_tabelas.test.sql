-- =====================================================================
-- Teste da migration 20261015000007_fase2_tabelas.
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
  v_emp1 uuid := gen_random_uuid();
  v_emp2 uuid := gen_random_uuid();
  v_banco1 uuid; v_banco2 uuid; v_banco_outra uuid;
  v_reajuste uuid; v_obs_comum uuid; v_obs_admin uuid;
  v_fech1 uuid; v_fech2 uuid;
  v_tabela text;
  v_n int;
  v_texto text;
  v_falhou boolean;
BEGIN
  -- 1. Estrutura, RLS e políticas
  FOREACH v_tabela IN ARRAY ARRAY['codigos_resolucao_banco','bancos_horas_reajustes','bancos_horas_observacoes',
                                  'requerimentos_bancos','bancos_horas_fechamentos','bancos_horas_fechamento_itens',
                                  'bancos_horas_transferencias'] LOOP
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
              AND tablename IN ('codigos_resolucao_banco','bancos_horas_reajustes','bancos_horas_observacoes',
                                'bancos_horas_fechamentos','bancos_horas_fechamento_itens','bancos_horas_transferencias')) THEN
    RAISE EXCEPTION 'Política de DELETE em tabela que deveria ter só exclusão lógica';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND cmd IN ('INSERT','UPDATE','ALL')
              AND tablename IN ('codigos_resolucao_banco','bancos_horas_fechamentos','bancos_horas_fechamento_itens',
                                'bancos_horas_transferencias')) THEN
    RAISE EXCEPTION 'Códigos e fechamentos só podem ser gravados por migration ou pela função de fechamento';
  END IF;
  IF (SELECT confdeltype FROM pg_constraint WHERE conname = 'requerimentos_bancos_requerimento_id_fkey') <> 'c' THEN
    RAISE EXCEPTION 'requerimentos_bancos deve sumir junto com o requerimento (não pode bloquear o legado)';
  END IF;

  -- 2. Tela do Controle
  SELECT count(*) INTO v_n FROM screen_permissions sp JOIN user_groups ug ON ug.id = sp.group_id
   WHERE sp.screen_key = 'bancos_horas_controle' AND ug.name = 'Administradores' AND sp.permission_level = 'edit';
  IF v_n <> 1 OR NOT EXISTS (SELECT 1 FROM screens WHERE key = 'bancos_horas_controle') THEN
    RAISE EXCEPTION 'Tela bancos_horas_controle sem registro ou sem Edição para Administradores';
  END IF;
  IF EXISTS (SELECT 1 FROM screen_permissions sp JOIN user_groups ug ON ug.id = sp.group_id
              WHERE sp.screen_key = 'bancos_horas_controle' AND ug.name <> 'Administradores') THEN
    RAISE EXCEPTION 'Outros grupos receberam permissão em bancos_horas_controle';
  END IF;

  -- 3. Códigos de resolução (RC-65)
  IF (SELECT count(*) FROM codigos_resolucao_banco) <> 48
     OR (SELECT count(*) FROM codigos_resolucao_banco WHERE conta_horas) <> 48
     OR (SELECT count(*) FROM codigos_resolucao_banco WHERE conta_tickets) <> 47 THEN
    RAISE EXCEPTION 'Códigos de resolução: esperado 48 (48 horas, 47 tickets)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM codigos_resolucao_banco
                  WHERE codigo = 'Nota Publicada (Banco=S| SLA=N)' AND conta_horas AND NOT conta_tickets)
     OR NOT EXISTS (SELECT 1 FROM codigos_resolucao_banco WHERE codigo = 'Alocação (Banco=S |SLA=N)')
     OR NOT EXISTS (SELECT 1 FROM codigos_resolucao_banco WHERE codigo = 'Alocação (Banco=S| SLA=N)') THEN
    RAISE EXCEPTION 'Códigos de resolução: variações de espaço não preservadas';
  END IF;

  -- Massa
  INSERT INTO empresas (id, nome_completo, nome_abreviado, vigencia_inicio) VALUES (v_emp1, 'EMPRESA F2 1', 'F21', '2026-01-01');
  INSERT INTO empresas (id, nome_completo, nome_abreviado, vigencia_inicio) VALUES (v_emp2, 'EMPRESA F2 2', 'F22', '2026-01-01');
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem)
  VALUES (v_emp1, 'Banco Padrão', true, 9, 'horas', 3, '2026-01-01', 'OUTROS', 'manual') RETURNING id INTO v_banco1;
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem)
  VALUES (v_emp1, 'Banco COMEX', false, 1, 'horas', 3, '2026-01-01', 'OUTROS', 'manual') RETURNING id INTO v_banco2;
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem)
  VALUES (v_emp2, 'Banco Padrão', true, 1, 'horas', 3, '2026-01-01', 'OUTROS', 'manual') RETURNING id INTO v_banco_outra;

  -- 4. Repasse por período: período de apuração = duração × períodos (Q3)
  v_falhou := false;
  BEGIN
    UPDATE bancos_horas SET repasse_especial = 'por_periodo', duracao_periodo_meses = 2, periodos_ate_zerar = 2 WHERE id = v_banco2;
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou repasse por período com período de apuração ≠ duração × períodos'; END IF;
  UPDATE bancos_horas SET repasse_especial = 'por_periodo', duracao_periodo_meses = 3, periodos_ate_zerar = 1 WHERE id = v_banco2;
  UPDATE bancos_horas SET repasse_especial = 'nenhum', duracao_periodo_meses = NULL, periodos_ate_zerar = NULL WHERE id = v_banco2;

  -- 5. Reajustes
  v_falhou := false;
  BEGIN INSERT INTO bancos_horas_reajustes (banco_id, mes, ano, tipo, minutos, justificativa) VALUES (v_banco1, 1, 2026, 'positivo', 60, 'x');
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou tipo de reajuste legado'; END IF;

  v_falhou := false;
  BEGIN INSERT INTO bancos_horas_reajustes (banco_id, mes, ano, tipo, minutos, tickets, justificativa) VALUES (v_banco1, 1, 2026, 'entrada', 0, 0, 'x');
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou reajuste zerado'; END IF;

  v_falhou := false;
  BEGIN INSERT INTO bancos_horas_reajustes (banco_id, mes, ano, tipo, minutos, justificativa) VALUES (v_banco1, 13, 2026, 'entrada', 60, 'x');
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou mês 13'; END IF;

  v_falhou := false;
  BEGIN INSERT INTO bancos_horas_reajustes (banco_id, mes, ano, tipo, minutos, justificativa) VALUES (v_banco1, 1, 2026, 'entrada', 60, '  ');
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou reajuste sem justificativa'; END IF;

  INSERT INTO bancos_horas_reajustes (banco_id, mes, ano, tipo, minutos, justificativa)
  VALUES (v_banco1, 1, 2026, 'saida', 90, 'Correção') RETURNING id INTO v_reajuste;
  IF NOT EXISTS (SELECT 1 FROM auditoria_alteracoes WHERE tabela = 'bancos_horas_reajustes' AND registro_id = v_reajuste::text
                  AND empresa_id = v_emp1 AND banco_id = v_banco1 AND acao = 'insert') THEN
    RAISE EXCEPTION 'Reajuste sem auditoria com empresa e banco';
  END IF;

  -- 6. Observações: automática não é gravada pelo usuário; manual só pelo autor ou administrador (D-06)
  SELECT uga.group_id INTO v_grupo_comum FROM user_group_assignments uga WHERE uga.user_id = v_comum LIMIT 1;
  INSERT INTO screen_permissions (group_id, screen_key, permission_level) VALUES (v_grupo_comum, 'bancos_horas_controle', 'edit');

  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_comum, 'role', 'authenticated')::text, true);

  INSERT INTO bancos_horas_observacoes (banco_id, mes, ano, texto, origem)
  VALUES (v_banco1, 1, 2026, 'do usuário comum', 'manual') RETURNING id INTO v_obs_comum;

  v_falhou := false;
  BEGIN INSERT INTO bancos_horas_fechamentos (banco_id, mes, ano, versao, vigente, motivo, nome_banco)
        VALUES (v_banco1, 1, 2026, 1, true, 'geracao_book', 'x');
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Usuário gravou fechamento direto na tabela'; END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  INSERT INTO bancos_horas_observacoes (banco_id, mes, ano, texto, origem)
  VALUES (v_banco1, 1, 2026, 'do administrador', 'manual') RETURNING id INTO v_obs_admin;
  UPDATE bancos_horas_observacoes SET texto = 'editado pelo administrador' WHERE id = v_obs_comum;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_comum, 'role', 'authenticated')::text, true);
  UPDATE bancos_horas_observacoes SET texto = 'editado pelo comum' WHERE id = v_obs_admin;
  PERFORM set_config('role', 'postgres', true);

  SELECT texto INTO v_texto FROM bancos_horas_observacoes WHERE id = v_obs_admin;
  IF v_texto <> 'do administrador' THEN RAISE EXCEPTION 'Usuário editou observação de outro autor (D-06)'; END IF;
  SELECT texto INTO v_texto FROM bancos_horas_observacoes WHERE id = v_obs_comum;
  IF v_texto <> 'editado pelo administrador' THEN RAISE EXCEPTION 'Administrador não conseguiu editar observação (D-06)'; END IF;

  -- 7. Ajuste do banco do requerimento: o banco tem de ser da empresa do requerimento
  IF EXISTS (SELECT 1 FROM requerimentos) THEN
    v_falhou := false;
    BEGIN
      INSERT INTO requerimentos_bancos (requerimento_id, banco_id, motivo)
      SELECT r.id, v_banco_outra, 'teste' FROM requerimentos r WHERE r.cliente_id <> v_emp2 LIMIT 1;
    EXCEPTION WHEN check_violation THEN v_falhou := true; END;
    IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou banco de outra empresa no requerimento'; END IF;
  END IF;

  -- 8. Fechamentos: uma versão vigente por banco e mês; itens e transferências
  INSERT INTO bancos_horas_fechamentos (banco_id, mes, ano, versao, vigente, motivo, nome_banco)
  VALUES (v_banco1, 1, 2026, 1, true, 'geracao_book', 'Banco Padrão') RETURNING id INTO v_fech1;
  v_falhou := false;
  BEGIN INSERT INTO bancos_horas_fechamentos (banco_id, mes, ano, versao, vigente, motivo, nome_banco)
        VALUES (v_banco1, 1, 2026, 2, true, 'retificacao', 'Banco Padrão');
  EXCEPTION WHEN unique_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou duas versões vigentes do mesmo mês'; END IF;

  v_falhou := false;
  BEGIN INSERT INTO bancos_horas_fechamentos (banco_id, mes, ano, versao, vigente, motivo, nome_banco)
        VALUES (v_banco1, 1, 2026, 1, false, 'retificacao', 'Banco Padrão');
  EXCEPTION WHEN unique_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou número de versão repetido'; END IF;

  INSERT INTO bancos_horas_fechamentos (banco_id, mes, ano, versao, vigente, motivo, nome_banco)
  VALUES (v_banco2, 1, 2026, 1, true, 'geracao_book', 'Banco COMEX') RETURNING id INTO v_fech2;

  INSERT INTO bancos_horas_fechamento_itens (fechamento_id, tipo, item_id, minutos, tickets)
  VALUES (v_fech1, 'apontamento', gen_random_uuid(), 30, 0), (v_fech1, 'reajuste', v_reajuste, 90, 0);

  v_falhou := false;
  BEGIN INSERT INTO bancos_horas_transferencias (fechamento_consumidor_id, fechamento_cedente_id, unidade, quantidade)
        VALUES (v_fech1, v_fech2, 'horas', 0);
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou transferência zerada'; END IF;

  v_falhou := false;
  BEGIN INSERT INTO bancos_horas_transferencias (fechamento_consumidor_id, fechamento_cedente_id, unidade, quantidade)
        VALUES (v_fech1, v_fech1, 'horas', 10);
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou transferência do banco para ele mesmo'; END IF;

  INSERT INTO bancos_horas_transferencias (fechamento_consumidor_id, fechamento_cedente_id, unidade, quantidade)
  VALUES (v_fech1, v_fech2, 'horas', 390);

  -- Observação automática: só a função de fechamento grava (RN-24)
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  v_falhou := false;
  BEGIN INSERT INTO bancos_horas_observacoes (banco_id, mes, ano, texto, origem, fechamento_id)
        VALUES (v_banco1, 1, 2026, '06:30 horas consumidas do Banco COMEX', 'consumo_entre_bancos', v_fech1);
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Usuário gravou observação automática'; END IF;

  v_falhou := false;
  BEGIN INSERT INTO bancos_horas_observacoes (banco_id, mes, ano, texto, origem, created_by)
        VALUES (v_banco1, 1, 2026, 'em nome de outro', 'manual', v_comum);
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Usuário gravou observação em nome de outro autor'; END IF;
  PERFORM set_config('role', 'postgres', true);

  -- 9. Exclusão física bloqueada nos fechamentos (histórico)
  v_falhou := false;
  BEGIN DELETE FROM bancos_horas WHERE id = v_banco1;
  EXCEPTION WHEN foreign_key_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Banco com fechamento foi apagado'; END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
