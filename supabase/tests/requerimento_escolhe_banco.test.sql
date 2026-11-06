-- =====================================================================
-- Teste da migration 20261104000001_requerimento_escolhe_banco
--
-- Empresa liberada: o requerimento de Banco de Horas escolhe o banco no
-- lançamento (Lançar Requerimentos), gravado em requerimentos_bancos.
-- Empresa no legado: nada muda, a lista de bancos vem vazia.
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou.
-- Qualquer outra mensagem de erro diz qual verificação falhou.
-- =====================================================================
DO $teste$
DECLARE
  -- Lança requerimentos (Edição) sem nenhum acesso ao Controle
  v_lancador uuid := (
    SELECT uga.user_id FROM user_group_assignments uga
     WHERE EXISTS (SELECT 1 FROM screen_permissions sp WHERE sp.group_id = uga.group_id
                      AND sp.screen_key = 'lancar_requerimentos' AND sp.permission_level = 'edit')
       AND NOT EXISTS (SELECT 1 FROM user_group_assignments u2 JOIN screen_permissions sp ON sp.group_id = u2.group_id
                        WHERE u2.user_id = uga.user_id AND sp.screen_key = 'bancos_horas_controle'
                          AND sp.permission_level IN ('view', 'edit'))
     ORDER BY uga.user_id LIMIT 1);
  -- Só consulta Lançar Requerimentos
  v_consulta uuid := (
    SELECT uga.user_id FROM user_group_assignments uga
     WHERE EXISTS (SELECT 1 FROM screen_permissions sp WHERE sp.group_id = uga.group_id
                      AND sp.screen_key = 'lancar_requerimentos' AND sp.permission_level = 'view')
       AND NOT EXISTS (SELECT 1 FROM user_group_assignments u2 JOIN screen_permissions sp ON sp.group_id = u2.group_id
                        WHERE u2.user_id = uga.user_id AND sp.screen_key = 'lancar_requerimentos'
                          AND sp.permission_level = 'edit')
     ORDER BY uga.user_id LIMIT 1);
  v_sem_acesso uuid := gen_random_uuid();
  v_liberada uuid := gen_random_uuid();
  v_legado uuid := gen_random_uuid();
  v_padrao uuid;
  v_fiscal uuid;
  v_encerrado uuid;
  v_inativo uuid;
  v_banco_legado uuid;
  v_req uuid;
  v_req_sem_mes uuid;
  v_req_faturado uuid;
  v_req_enviado uuid;
  v_req_legado uuid;
  v_ids uuid[];
  v_r record;
  v_falhou boolean;
  v_msg text;
BEGIN
  IF v_lancador IS NULL THEN
    RAISE EXCEPTION 'Precondição: precisa de um usuário com Edição em Lançar Requerimentos e sem acesso ao Controle';
  END IF;
  IF v_consulta IS NULL THEN
    RAISE EXCEPTION 'Precondição: precisa de um usuário com só Visualização em Lançar Requerimentos';
  END IF;

  -- -------------------------------------------------------------------
  -- 1. Estrutura e segurança das funções
  -- -------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'requerimento_bancos_disponiveis'
                    AND pronamespace = 'public'::regnamespace
                    AND prosecdef AND proconfig @> ARRAY['search_path=public']) THEN
    RAISE EXCEPTION 'requerimento_bancos_disponiveis ausente, sem SECURITY DEFINER ou sem search_path fixo';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'requerimento_definir_banco'
                    AND pronamespace = 'public'::regnamespace
                    AND prosecdef AND proconfig @> ARRAY['search_path=public']) THEN
    RAISE EXCEPTION 'requerimento_definir_banco ausente, sem SECURITY DEFINER ou sem search_path fixo';
  END IF;
  IF has_function_privilege('anon', 'public.requerimento_bancos_disponiveis(uuid, uuid)', 'execute')
     OR has_function_privilege('anon', 'public.requerimento_definir_banco(uuid, uuid)', 'execute') THEN
    RAISE EXCEPTION 'Funções do banco do requerimento executáveis por anon';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.requerimento_bancos_disponiveis(uuid, uuid)', 'execute')
     OR NOT has_function_privilege('authenticated', 'public.requerimento_definir_banco(uuid, uuid)', 'execute') THEN
    RAISE EXCEPTION 'Funções do banco do requerimento não executáveis por authenticated';
  END IF;

  -- -------------------------------------------------------------------
  -- Cenário: uma empresa liberada e uma no legado
  -- -------------------------------------------------------------------
  INSERT INTO empresas_clientes (id, nome_completo, nome_abreviado, status, tem_ams, tipo_book, email_gestor, vigencia_inicial, anexo)
  VALUES (v_liberada, 'EMPRESA TESTE LIBERADA LTDA', 'TESTE LIBERADA', 'ativo', true, 'qualidade', 'gestor@sonda.com', '2025-01-01', false),
         (v_legado, 'EMPRESA TESTE LEGADO LTDA', 'TESTE LEGADO', 'ativo', true, 'qualidade', 'gestor@sonda.com', '2025-01-01', false);

  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem)
  VALUES (v_liberada, 'TESTE PADRÃO', true, 1, 'horas', 3, '2026-07-01', 'OUTROS', 'manual')
  RETURNING id INTO v_padrao;
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem)
  VALUES (v_liberada, 'TESTE FISCAL', false, 2, 'horas', 3, '2026-07-01', 'OUTROS', 'manual')
  RETURNING id INTO v_fiscal;
  -- Vigente só até Set/2026
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, fim_vigencia, taxa_produto, origem)
  VALUES (v_liberada, 'TESTE ENCERRADO', false, 3, 'horas', 3, '2026-07-01', '2026-09-01', 'OUTROS', 'manual')
  RETURNING id INTO v_encerrado;
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem, ativo)
  VALUES (v_liberada, 'TESTE INATIVO', false, 4, 'horas', 3, '2026-07-01', 'OUTROS', 'manual', false)
  RETURNING id INTO v_inativo;
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem)
  VALUES (v_legado, 'TESTE LEGADO', true, 1, 'horas', 3, '2026-07-01', 'OUTROS', 'manual')
  RETURNING id INTO v_banco_legado;

  UPDATE empresas SET modelo_calculo = 'multiplo' WHERE id = v_liberada;

  INSERT INTO requerimentos (chamado, cliente_id, modulo, descricao, data_envio, horas_funcional, horas_tecnico,
                             tipo_cobranca, status, enviado_faturamento, mes_cobranca)
  VALUES ('RF-TESTE-BANCO-1', v_liberada, 'Comex', 'Lançado em Out/2026', '2026-10-01', 2, 0,
          'Banco de Horas', 'lancado', false, '10/2026')
  RETURNING id INTO v_req;
  INSERT INTO requerimentos (chamado, cliente_id, modulo, descricao, data_envio, horas_funcional, horas_tecnico,
                             tipo_cobranca, status, enviado_faturamento, mes_cobranca)
  VALUES ('RF-TESTE-BANCO-2', v_liberada, 'Comex', 'Sem mês de cobrança', '2026-10-01', 2, 0,
          'Banco de Horas', 'lancado', false, NULL)
  RETURNING id INTO v_req_sem_mes;
  INSERT INTO requerimentos (chamado, cliente_id, modulo, descricao, data_envio, horas_funcional, horas_tecnico,
                             tipo_cobranca, status, enviado_faturamento, mes_cobranca)
  VALUES ('RF-TESTE-BANCO-3', v_liberada, 'Comex', 'Faturado à parte', '2026-10-01', 2, 0,
          'Faturado', 'lancado', false, '10/2026')
  RETURNING id INTO v_req_faturado;
  INSERT INTO requerimentos (chamado, cliente_id, modulo, descricao, data_envio, horas_funcional, horas_tecnico,
                             tipo_cobranca, status, enviado_faturamento, mes_cobranca)
  VALUES ('RF-TESTE-BANCO-4', v_liberada, 'Comex', 'Já enviado', '2026-10-01', 2, 0,
          'Banco de Horas', 'enviado_faturamento', true, '10/2026')
  RETURNING id INTO v_req_enviado;
  INSERT INTO requerimentos (chamado, cliente_id, modulo, descricao, data_envio, horas_funcional, horas_tecnico,
                             tipo_cobranca, status, enviado_faturamento, mes_cobranca)
  VALUES ('RF-TESTE-BANCO-5', v_legado, 'Comex', 'Empresa no legado', '2026-10-01', 2, 0,
          'Banco de Horas', 'lancado', false, '10/2026')
  RETURNING id INTO v_req_legado;

  -- A partir daqui, como quem lança requerimentos (sem acesso ao Controle)
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_lancador, 'role', 'authenticated')::text, true);

  -- -------------------------------------------------------------------
  -- 2. Bancos disponíveis: só os ativos da empresa liberada, na ordem
  -- -------------------------------------------------------------------
  SELECT array_agg(banco_id ORDER BY ordem) INTO v_ids FROM requerimento_bancos_disponiveis(v_liberada, NULL);
  IF v_ids IS DISTINCT FROM ARRAY[v_padrao, v_fiscal, v_encerrado] THEN
    RAISE EXCEPTION 'Esperava os 3 bancos ativos da empresa liberada, na ordem; veio %', v_ids;
  END IF;
  SELECT * INTO v_r FROM requerimento_bancos_disponiveis(v_liberada, NULL) WHERE banco_id = v_encerrado;
  IF v_r.nome <> 'TESTE ENCERRADO' OR v_r.padrao OR v_r.inicio_vigencia <> '2026-07-01'
     OR v_r.fim_vigencia <> '2026-09-01' OR v_r.escolhido THEN
    RAISE EXCEPTION 'Banco disponível veio com nome, padrão, vigência ou escolha errados';
  END IF;
  IF NOT (SELECT padrao FROM requerimento_bancos_disponiveis(v_liberada, NULL) WHERE banco_id = v_padrao) THEN
    RAISE EXCEPTION 'O Banco padrão veio sem a marca de padrão';
  END IF;

  -- Empresa no legado: lista vazia (o formulário fica como hoje)
  IF EXISTS (SELECT 1 FROM requerimento_bancos_disponiveis(v_legado, NULL)) THEN
    RAISE EXCEPTION 'Empresa no legado não pode oferecer bancos no lançamento';
  END IF;

  -- -------------------------------------------------------------------
  -- 3. Definir o banco do requerimento
  -- -------------------------------------------------------------------
  PERFORM requerimento_definir_banco(v_req, v_fiscal);
  IF (SELECT banco_id FROM requerimento_bancos_disponiveis(v_liberada, v_req) WHERE escolhido) IS DISTINCT FROM v_fiscal THEN
    RAISE EXCEPTION 'O banco escolhido não veio marcado na lista do requerimento';
  END IF;
  IF (SELECT count(*) FROM requerimento_bancos_disponiveis(v_liberada, v_req) WHERE escolhido) <> 1 THEN
    RAISE EXCEPTION 'Mais de um banco marcado como escolhido';
  END IF;

  -- Trocar de banco na edição
  PERFORM requerimento_definir_banco(v_req, v_padrao);

  -- Sem mês de cobrança: não há vigência a conferir
  PERFORM requerimento_definir_banco(v_req_sem_mes, v_encerrado);

  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  SELECT * INTO v_r FROM requerimentos_bancos WHERE requerimento_id = v_req;
  IF v_r.banco_id IS DISTINCT FROM v_padrao OR v_r.motivo <> 'Escolhido no lançamento do requerimento' THEN
    RAISE EXCEPTION 'A troca de banco não foi gravada com o motivo do lançamento';
  END IF;
  IF v_r.updated_by IS DISTINCT FROM v_lancador THEN
    RAISE EXCEPTION 'A autoria da escolha não ficou com quem lançou';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auditoria_alteracoes WHERE tabela = 'requerimentos_bancos'
                    AND registro_id = v_req::text AND usuario_id = v_lancador) THEN
    RAISE EXCEPTION 'A escolha do banco não foi auditada';
  END IF;

  -- Ajuste feito no Controle: reescolher o mesmo banco mantém o motivo do Controle
  UPDATE requerimentos_bancos SET motivo = 'Ajuste do Controle' WHERE requerimento_id = v_req;

  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_lancador, 'role', 'authenticated')::text, true);
  PERFORM requerimento_definir_banco(v_req, v_padrao);
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);
  IF (SELECT motivo FROM requerimentos_bancos WHERE requerimento_id = v_req) <> 'Ajuste do Controle' THEN
    RAISE EXCEPTION 'Reescolher o mesmo banco apagou o motivo do ajuste do Controle';
  END IF;

  -- -------------------------------------------------------------------
  -- 4. Recusas (mensagem e código de erro)
  -- -------------------------------------------------------------------
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_lancador, 'role', 'authenticated')::text, true);

  -- Banco fora da vigência no mês de cobrança
  v_falhou := false;
  BEGIN PERFORM requerimento_definir_banco(v_req, v_encerrado);
  EXCEPTION WHEN check_violation THEN v_falhou := true; v_msg := SQLERRM; END;
  IF NOT v_falhou OR v_msg NOT ILIKE '%vigente%' THEN RAISE EXCEPTION 'Aceitou banco fora da vigência do mês de cobrança'; END IF;

  -- Banco inativo
  v_falhou := false;
  BEGIN PERFORM requerimento_definir_banco(v_req, v_inativo);
  EXCEPTION WHEN check_violation THEN v_falhou := true; v_msg := SQLERRM; END;
  IF NOT v_falhou OR v_msg NOT ILIKE '%inativo%' THEN RAISE EXCEPTION 'Aceitou banco inativo'; END IF;

  -- Banco de outra empresa
  v_falhou := false;
  BEGIN PERFORM requerimento_definir_banco(v_req, v_banco_legado);
  EXCEPTION WHEN check_violation THEN v_falhou := true; v_msg := SQLERRM; END;
  IF NOT v_falhou OR v_msg NOT ILIKE '%empresa do requerimento%' THEN RAISE EXCEPTION 'Aceitou banco de outra empresa'; END IF;

  -- Requerimento que não é de Banco de Horas
  v_falhou := false;
  BEGIN PERFORM requerimento_definir_banco(v_req_faturado, v_padrao);
  EXCEPTION WHEN check_violation THEN v_falhou := true; v_msg := SQLERRM; END;
  IF NOT v_falhou OR v_msg NOT ILIKE '%Banco de Horas%' THEN RAISE EXCEPTION 'Aceitou banco em requerimento Faturado'; END IF;

  -- Já enviado para faturamento: o ajuste é no Controle
  v_falhou := false;
  BEGIN PERFORM requerimento_definir_banco(v_req_enviado, v_padrao);
  EXCEPTION WHEN check_violation THEN v_falhou := true; v_msg := SQLERRM; END;
  IF NOT v_falhou OR v_msg NOT ILIKE '%Controle%' THEN RAISE EXCEPTION 'Aceitou banco em requerimento já enviado para faturamento'; END IF;

  -- Empresa no legado
  v_falhou := false;
  BEGIN PERFORM requerimento_definir_banco(v_req_legado, v_banco_legado);
  EXCEPTION WHEN check_violation THEN v_falhou := true; v_msg := SQLERRM; END;
  IF NOT v_falhou OR v_msg NOT ILIKE '%legado%' THEN RAISE EXCEPTION 'Aceitou banco em empresa no legado'; END IF;

  -- Requerimento inexistente
  v_falhou := false;
  BEGIN PERFORM requerimento_definir_banco(gen_random_uuid(), v_padrao);
  EXCEPTION WHEN no_data_found THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou requerimento inexistente'; END IF;

  -- -------------------------------------------------------------------
  -- 5. Permissão: listar com Visualização, gravar só com Edição
  -- -------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_consulta, 'role', 'authenticated')::text, true);
  IF (SELECT count(*) FROM requerimento_bancos_disponiveis(v_liberada, NULL)) <> 3 THEN
    RAISE EXCEPTION 'Quem só consulta Lançar Requerimentos não viu os bancos';
  END IF;
  v_falhou := false;
  BEGIN PERFORM requerimento_definir_banco(v_req, v_fiscal);
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Quem só consulta Lançar Requerimentos gravou o banco'; END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_sem_acesso, 'role', 'authenticated')::text, true);
  v_falhou := false;
  BEGIN PERFORM requerimento_bancos_disponiveis(v_liberada, NULL);
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Usuário sem permissão listou os bancos'; END IF;
  v_falhou := false;
  BEGIN PERFORM requerimento_definir_banco(v_req, v_fiscal);
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Usuário sem permissão gravou o banco'; END IF;

  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
