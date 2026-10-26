-- =====================================================================
-- Teste da migration 20261026000001_fase3_envio_saldo_parcial_controle
-- (docs/especificacoes/Modelagem_Fase3.md, seções 7 e 11).
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou.
-- Qualquer outra mensagem de erro diz qual verificação falhou.
-- =====================================================================
DO $teste$
DECLARE
  v_editor uuid := gen_random_uuid();
  v_leitor uuid := gen_random_uuid();
  v_grupo_edit uuid;
  v_grupo_view uuid;
  v_empresa uuid := gen_random_uuid();
  v_legado uuid := gen_random_uuid();
  v_id uuid;
  v_e record;
  v_falhou boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'registrar_envio_saldo_parcial_controle'
                    AND pronamespace = 'public'::regnamespace
                    AND prosecdef AND proconfig @> ARRAY['search_path=public']) THEN
    RAISE EXCEPTION 'registrar_envio_saldo_parcial_controle ausente, sem SECURITY DEFINER ou sem search_path fixo';
  END IF;
  IF has_function_privilege('anon', 'public.registrar_envio_saldo_parcial_controle(uuid, boolean, integer, text)', 'execute') THEN
    RAISE EXCEPTION 'registrar_envio_saldo_parcial_controle executável por anon';
  END IF;

  -- Empresa liberada no modelo novo e empresa ainda no cálculo atual (modo sombra)
  INSERT INTO empresas_clientes (id, nome_completo, nome_abreviado, status, tem_ams, tipo_book, email_gestor, vigencia_inicial, anexo)
  VALUES (v_empresa, 'EMPRESA TESTE SALDO PARCIAL LTDA', 'TESTE SALDO', 'ativo', true, 'qualidade', 'gestor@sonda.com', '2025-01-01', false),
         (v_legado, 'EMPRESA TESTE LEGADO LTDA', 'TESTE LEGADO', 'ativo', true, 'qualidade', 'gestor@sonda.com', '2025-01-01', false);
  UPDATE empresas SET modelo_calculo = 'multiplo' WHERE id = v_empresa;

  -- Quem edita o Controle e quem só vê
  INSERT INTO auth.users (id, email) VALUES (v_editor, 'controle.editor.teste@sonda.com'),
                                            (v_leitor, 'controle.leitor.teste@sonda.com');
  INSERT INTO user_groups (name) VALUES ('TESTE EDITA CONTROLE') RETURNING id INTO v_grupo_edit;
  INSERT INTO user_groups (name) VALUES ('TESTE VÊ CONTROLE') RETURNING id INTO v_grupo_view;
  INSERT INTO user_group_assignments (user_id, group_id) VALUES (v_editor, v_grupo_edit), (v_leitor, v_grupo_view);
  INSERT INTO screen_permissions (group_id, screen_key, permission_level)
  VALUES (v_grupo_edit, 'bancos_horas_controle', 'edit'), (v_grupo_view, 'bancos_horas_controle', 'view');

  PERFORM set_config('role', 'authenticated', true);

  -- -------------------------------------------------------------------
  -- 1. Envio com sucesso: manual, sem agendamento, com quem enviou
  -- -------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_editor, 'role', 'authenticated')::text, true);
  v_id := registrar_envio_saldo_parcial_controle(v_empresa, true, 3, NULL);
  PERFORM set_config('role', 'postgres', true);
  SELECT * INTO v_e FROM banco_horas_envio_execucoes WHERE id = v_id;
  IF v_e.origem <> 'manual' OR v_e.agendamento_id IS NOT NULL OR v_e.disparado_por IS DISTINCT FROM v_editor
     OR v_e.status <> 'sucesso' OR v_e.qtd_destinatarios <> 3 OR v_e.qtd_emails <> 1 OR v_e.erro IS NOT NULL
     OR v_e.finalizado_em IS NULL OR v_e.executado_para IS NULL THEN
    RAISE EXCEPTION 'Envio com sucesso registrado errado: %', row_to_json(v_e);
  END IF;
  PERFORM set_config('role', 'authenticated', true);

  -- -------------------------------------------------------------------
  -- 2. Falha: fica no histórico com a mensagem (o sino avisa pelo gatilho que já existe)
  -- -------------------------------------------------------------------
  v_id := registrar_envio_saldo_parcial_controle(v_empresa, false, 3, 'Falha no servidor de e-mail');
  PERFORM set_config('role', 'postgres', true);
  SELECT * INTO v_e FROM banco_horas_envio_execucoes WHERE id = v_id;
  IF v_e.status <> 'erro' OR v_e.qtd_emails <> 0 OR v_e.erro <> 'Falha no servidor de e-mail' THEN
    RAISE EXCEPTION 'Falha registrada errada: %', row_to_json(v_e);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM notificacoes WHERE chave = 'saldo_parcial:' || v_empresa AND resolvida_em IS NULL) THEN
    RAISE EXCEPTION 'A falha do envio manual não abriu a notificação';
  END IF;
  PERFORM set_config('role', 'authenticated', true);

  -- -------------------------------------------------------------------
  -- 3. Empresa ainda no cálculo atual: o Controle não envia (modo sombra)
  -- -------------------------------------------------------------------
  v_falhou := false;
  BEGIN PERFORM registrar_envio_saldo_parcial_controle(v_legado, true, 1, NULL);
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Registrou envio de empresa no cálculo atual'; END IF;

  -- Sem destinatário não há envio
  v_falhou := false;
  BEGIN PERFORM registrar_envio_saldo_parcial_controle(v_empresa, true, 0, NULL);
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Registrou envio sem destinatário'; END IF;

  -- -------------------------------------------------------------------
  -- 4. Permissão: só quem edita o Controle; a tabela continua fechada para gravação direta
  -- -------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_leitor, 'role', 'authenticated')::text, true);
  v_falhou := false;
  BEGIN PERFORM registrar_envio_saldo_parcial_controle(v_empresa, true, 1, NULL);
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Quem só vê o Controle registrou um envio'; END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_editor, 'role', 'authenticated')::text, true);
  v_falhou := false;
  BEGIN
    INSERT INTO banco_horas_envio_execucoes (empresa_id, origem, executado_para, status)
    VALUES (v_empresa, 'manual', clock_timestamp(), 'sucesso');
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'A tabela aceitou gravação direta do app'; END IF;

  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
