-- =====================================================================
-- Teste da migration 20261022000005_fase3_regras_contagem
-- (docs/especificacoes/Modelagem_Fase3.md, seção 5).
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou
-- (inclusive as linhas criadas no legado e nos apontamentos). Qualquer outra
-- mensagem de erro diz qual verificação falhou.
-- Grava apontamentos e tickets de exemplo, um para cada filtro, e confere o que
-- conta antes e depois de mudar as regras pela função de salvar.
-- =====================================================================
DO $teste$
DECLARE
  v_admin uuid := (SELECT uga.user_id FROM user_group_assignments uga JOIN user_groups ug ON ug.id = uga.group_id
                    WHERE ug.name = 'Administradores' LIMIT 1);
  v_sem_acesso uuid := gen_random_uuid();
  v_empresa uuid := gen_random_uuid();
  v_org text := 'EMPRESA TESTE REGRAS LTDA';
  v_r record;
  v_itens text;
  v_codigos jsonb;
  v_falhou boolean;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Precondição: precisa de um usuário no grupo Administradores';
  END IF;

  -- -------------------------------------------------------------------
  -- 1. Estrutura e carga
  -- -------------------------------------------------------------------
  IF to_regclass('public.regras_contagem') IS NULL THEN RAISE EXCEPTION 'Tabela regras_contagem não existe'; END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.regras_contagem'::regclass) THEN
    RAISE EXCEPTION 'RLS desligada em regras_contagem';
  END IF;
  -- Uma linha só: leitura e alteração; sem inclusão nem exclusão pela API
  IF (SELECT array_agg(cmd::text ORDER BY cmd) FROM pg_policies WHERE tablename = 'regras_contagem')
     IS DISTINCT FROM ARRAY['SELECT', 'UPDATE'] THEN
    RAISE EXCEPTION 'regras_contagem deveria ter só as políticas de SELECT e UPDATE';
  END IF;
  -- Códigos: as quatro operações e nenhuma política aberta (USING true)
  IF (SELECT array_agg(cmd::text ORDER BY cmd) FROM pg_policies WHERE tablename = 'codigos_resolucao_banco')
     IS DISTINCT FROM ARRAY['DELETE', 'INSERT', 'SELECT', 'UPDATE'] THEN
    RAISE EXCEPTION 'codigos_resolucao_banco deveria ter uma política por operação';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename IN ('codigos_resolucao_banco', 'regras_contagem')
              AND (qual = 'true' OR with_check = 'true')) THEN
    RAISE EXCEPTION 'Política aberta (USING true) em codigos_resolucao_banco ou regras_contagem';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'auditoria_alteracoes' AND column_name = 'motivo') THEN
    RAISE EXCEPTION 'auditoria_alteracoes.motivo não existe';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc
              WHERE pronamespace = 'public'::regnamespace
                AND proname IN ('salvar_regras_contagem', 'codigos_resolucao_uso', 'registrar_auditoria', 'bancos_horas_consumo_itens')
                AND (NOT prosecdef OR NOT ('search_path=public' = ANY (coalesce(proconfig, '{}'))))) THEN
    RAISE EXCEPTION 'Função sem SECURITY DEFINER ou sem search_path fixo';
  END IF;
  IF has_function_privilege('anon', 'public.salvar_regras_contagem(text, jsonb, jsonb)', 'execute')
     OR has_function_privilege('anon', 'public.codigos_resolucao_uso(integer)', 'execute') THEN
    RAISE EXCEPTION 'Função nova executável por anon';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM screens WHERE key = 'regras_contagem') THEN
    RAISE EXCEPTION 'Tela regras_contagem não registrada';
  END IF;

  SELECT * INTO v_r FROM regras_contagem;
  IF (SELECT count(*) FROM regras_contagem) <> 1
     OR v_r.grupos_que_contam IS DISTINCT FROM ARRAY['AMS APL', 'AMS - APL', 'AMS - ATENDIMENTO', 'AMS T&M']
     OR v_r.tipos_chamado IS DISTINCT FROM ARRAY['IM', 'RF', 'PM']
     OR NOT v_r.ignorar_atividade_interna
     OR v_r.itens_excluidos IS DISTINCT FROM ARRAY['000000 - PROJETOS APL']
     OR NOT v_r.so_tickets_fechados THEN
    RAISE EXCEPTION 'Carga das regras diferente dos filtros fixos da Fase 2';
  END IF;

  v_falhou := false;
  BEGIN INSERT INTO regras_contagem (id, grupos_que_contam, tipos_chamado, ignorar_atividade_interna, itens_excluidos, so_tickets_fechados)
        VALUES (2, ARRAY['X'], ARRAY['IM'], true, '{}', true);
  EXCEPTION WHEN check_violation OR unique_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou uma segunda linha de regras'; END IF;

  -- -------------------------------------------------------------------
  -- 2. Consumo com as regras carregadas: só conta o que passa em todos os filtros
  -- -------------------------------------------------------------------
  INSERT INTO empresas_clientes (id, nome_completo, nome_abreviado, status, tem_ams, tipo_book, email_gestor, vigencia_inicial, anexo)
  VALUES (v_empresa, v_org, 'TESTE REGRAS', 'ativo', true, 'qualidade', 'gestor@sonda.com', '2025-01-01', false);
  INSERT INTO codigos_resolucao_banco (codigo, conta_horas, conta_tickets) VALUES ('TESTE CONTA', true, true);

  INSERT INTO apontamentos_aranda (id_externo, org_us_final, data_atividade, tipo_chamado, ativi_interna, caso_grupo,
                                   tempo_gasto_minutos, item_configuracao, cod_resolucao) VALUES
    ('TESTE-A', v_org, '2026-08-10 12:00-03', 'IM', 'Não', 'AMS APL - TESTE - N2', 60, 'ITEM 1', 'TESTE CONTA'),
    ('TESTE-INTERNA', v_org, '2026-08-10 12:00-03', 'IM', 'Sim', 'AMS APL - TESTE - N2', 60, 'ITEM 1', 'TESTE CONTA'),
    ('TESTE-ITEM', v_org, '2026-08-10 12:00-03', 'IM', 'Não', 'AMS APL - TESTE - N2', 60, '000000 - PROJETOS APL', 'TESTE CONTA'),
    ('TESTE-TIPO', v_org, '2026-08-10 12:00-03', 'XX', 'Não', 'AMS APL - TESTE - N2', 60, 'ITEM 1', 'TESTE CONTA'),
    ('TESTE-GRUPO', v_org, '2026-08-10 12:00-03', 'IM', 'Não', 'OUTRO GRUPO', 60, 'ITEM 1', 'TESTE CONTA'),
    ('TESTE-CODIGO', v_org, '2026-08-10 12:00-03', 'IM', 'Não', 'AMS APL - TESTE - N2', 60, 'ITEM 1', 'TESTE SEM REGRA');
  INSERT INTO apontamentos_tickets_aranda (nro_solicitacao, organizacao, nome_grupo, item_configuracao, data_fechamento, status, cod_resolucao) VALUES
    ('TESTE-T1', v_org, 'AMS - ATENDIMENTO', 'ITEM 1', '2026-08-11 12:00-03', 'Closed', 'TESTE CONTA'),
    ('TESTE-T2', v_org, 'AMS - ATENDIMENTO', 'ITEM 1', '2026-08-11 12:00-03', 'Resolved', 'TESTE CONTA');

  SELECT string_agg(coalesce(a.id_externo, t.nro_solicitacao), ',' ORDER BY coalesce(a.id_externo, t.nro_solicitacao) COLLATE "C")
    INTO v_itens
    FROM bancos_horas_consumo_itens(v_empresa, 2026, 8) i
    LEFT JOIN apontamentos_aranda a ON a.id = i.item_id AND i.fonte = 'apontamento'
    LEFT JOIN apontamentos_tickets_aranda t ON t.id = i.item_id AND i.fonte = 'ticket';
  IF v_itens IS DISTINCT FROM 'TESTE-A,TESTE-T1' THEN
    RAISE EXCEPTION 'Com as regras carregadas contou %, esperado TESTE-A,TESTE-T1', v_itens;
  END IF;

  -- Uso dos códigos: o que não tem regra aparece, com contagem e primeira ocorrência
  SELECT * INTO v_r FROM codigos_resolucao_uso(1200) WHERE codigo = 'TESTE SEM REGRA';
  IF NOT FOUND OR v_r.tem_regra OR v_r.apontamentos <> 1 OR v_r.tickets <> 0 OR v_r.primeira_ocorrencia <> '2026-08-10' THEN
    RAISE EXCEPTION 'codigos_resolucao_uso não trouxe o código sem regra como esperado';
  END IF;
  SELECT * INTO v_r FROM codigos_resolucao_uso(1200) WHERE codigo = 'TESTE CONTA';
  IF NOT FOUND OR NOT v_r.tem_regra OR v_r.apontamentos <> 1 OR v_r.tickets <> 1 THEN
    RAISE EXCEPTION 'codigos_resolucao_uso contou errado um código com regra (conta só o que passa nos filtros)';
  END IF;

  -- -------------------------------------------------------------------
  -- 3. Salvar: exige permissão e motivo; o motivo vai para a auditoria
  -- -------------------------------------------------------------------
  PERFORM set_config('role', 'authenticated', true);

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_sem_acesso, 'role', 'authenticated')::text, true);
  v_falhou := false;
  BEGIN PERFORM salvar_regras_contagem('Teste', jsonb_build_object('ignorar_atividade_interna', false), NULL);
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Usuário sem permissão salvou as regras'; END IF;
  v_falhou := false;
  BEGIN UPDATE regras_contagem SET ignorar_atividade_interna = false;
        IF FOUND THEN RAISE EXCEPTION 'alterou'; END IF;
        v_falhou := true;
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Usuário sem permissão alterou regras_contagem direto'; END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  v_falhou := false;
  BEGIN PERFORM salvar_regras_contagem('   ', jsonb_build_object('ignorar_atividade_interna', false), NULL);
  EXCEPTION WHEN raise_exception OR check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Salvou as regras sem motivo'; END IF;

  -- Atividade interna passa a contar, o tipo XX entra e o código sem regra ganha regra
  SELECT jsonb_agg(jsonb_build_object('codigo', codigo, 'conta_horas', conta_horas, 'conta_tickets', conta_tickets))
         || jsonb_build_array(jsonb_build_object('codigo', 'TESTE SEM REGRA', 'conta_horas', true, 'conta_tickets', false))
    INTO v_codigos
    FROM codigos_resolucao_banco;
  PERFORM salvar_regras_contagem(
    'Teste: ampliar a contagem',
    jsonb_build_object('ignorar_atividade_interna', false, 'tipos_chamado', jsonb_build_array('IM', 'RF', 'PM', 'XX')),
    v_codigos);

  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  SELECT string_agg(coalesce(a.id_externo, t.nro_solicitacao), ',' ORDER BY coalesce(a.id_externo, t.nro_solicitacao) COLLATE "C")
    INTO v_itens
    FROM bancos_horas_consumo_itens(v_empresa, 2026, 8) i
    LEFT JOIN apontamentos_aranda a ON a.id = i.item_id AND i.fonte = 'apontamento'
    LEFT JOIN apontamentos_tickets_aranda t ON t.id = i.item_id AND i.fonte = 'ticket';
  IF v_itens IS DISTINCT FROM 'TESTE-A,TESTE-CODIGO,TESTE-INTERNA,TESTE-T1,TESTE-TIPO' THEN
    RAISE EXCEPTION 'Depois de salvar contou %, esperado TESTE-A,TESTE-CODIGO,TESTE-INTERNA,TESTE-T1,TESTE-TIPO', v_itens;
  END IF;

  -- Os outros campos não mudaram
  SELECT * INTO v_r FROM regras_contagem;
  IF v_r.grupos_que_contam IS DISTINCT FROM ARRAY['AMS APL', 'AMS - APL', 'AMS - ATENDIMENTO', 'AMS T&M']
     OR NOT v_r.so_tickets_fechados THEN
    RAISE EXCEPTION 'Salvar mudou campos que não foram enviados';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auditoria_alteracoes
                  WHERE tabela = 'regras_contagem' AND acao = 'update' AND motivo = 'Teste: ampliar a contagem'
                    AND usuario_id = v_admin) THEN
    RAISE EXCEPTION 'Alteração das regras sem o motivo e o autor na auditoria';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auditoria_alteracoes
                  WHERE tabela = 'codigos_resolucao_banco' AND registro_id = 'TESTE SEM REGRA' AND acao = 'insert'
                    AND motivo = 'Teste: ampliar a contagem') THEN
    RAISE EXCEPTION 'Código incluído sem o motivo na auditoria';
  END IF;

  -- Lista de códigos enviada sem um deles: ele sai; tickets em aberto passam a contar
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  SELECT jsonb_agg(jsonb_build_object('codigo', codigo, 'conta_horas', conta_horas, 'conta_tickets', conta_tickets))
    INTO v_codigos
    FROM codigos_resolucao_banco WHERE codigo <> 'TESTE SEM REGRA';
  PERFORM salvar_regras_contagem('Teste: voltar', jsonb_build_object('so_tickets_fechados', false), v_codigos);
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  IF EXISTS (SELECT 1 FROM codigos_resolucao_banco WHERE codigo = 'TESTE SEM REGRA') THEN
    RAISE EXCEPTION 'Código fora da lista enviada não saiu';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM bancos_horas_consumo_itens(v_empresa, 2026, 8) i
                   JOIN apontamentos_tickets_aranda t ON t.id = i.item_id
                  WHERE i.fonte = 'ticket' AND t.nro_solicitacao = 'TESTE-T2') THEN
    RAISE EXCEPTION 'Com "só tickets fechados" desligado, o ticket Resolved não contou';
  END IF;

  -- O motivo não fica pendurado na sessão depois de salvar
  IF coalesce(current_setting('app.motivo', true), '') <> '' THEN
    RAISE EXCEPTION 'app.motivo ficou na sessão depois de salvar';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
