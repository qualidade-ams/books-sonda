-- =====================================================================
-- Teste da migration 20261022000007_fase3_retroativos
-- (docs/especificacoes/Modelagem_Fase3.md, seção 8).
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou
-- (inclusive as linhas criadas no legado, os fechamentos e o sino). Qualquer
-- outra mensagem de erro diz qual verificação falhou.
-- Simula o job de detecção (sem usuário na sessão, como a service role), as
-- decisões na tela e a retificação do mês.
-- =====================================================================
DO $teste$
DECLARE
  v_admin uuid := (SELECT uga.user_id FROM user_group_assignments uga JOIN user_groups ug ON ug.id = uga.group_id
                    WHERE ug.name = 'Administradores' LIMIT 1);
  v_sem_acesso uuid := gen_random_uuid();
  v_empresa uuid := gen_random_uuid();
  v_banco uuid;
  v_fech jsonb;
  v_fechamento uuid;
  v_retificacao uuid;
  v_ret uuid;
  v_ret2 uuid;
  v_item1 uuid := gen_random_uuid();
  v_item2 uuid := gen_random_uuid();
  v_r record;
  v_antes timestamptz;
  v_falhou boolean;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Precondição: precisa de um usuário no grupo Administradores';
  END IF;

  -- -------------------------------------------------------------------
  -- 1. Estrutura
  -- -------------------------------------------------------------------
  IF to_regclass('public.bancos_horas_retroativos') IS NULL OR to_regclass('public.bancos_horas_retroativos_itens') IS NULL THEN
    RAISE EXCEPTION 'Tabelas dos retroativos não existem';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.bancos_horas_retroativos'::regclass)
     OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.bancos_horas_retroativos_itens'::regclass) THEN
    RAISE EXCEPTION 'RLS desligada nos retroativos';
  END IF;
  -- Só leitura direta; gravação pelas funções (job, decisão e aviso)
  IF (SELECT array_agg(DISTINCT cmd::text) FROM pg_policies
       WHERE tablename IN ('bancos_horas_retroativos', 'bancos_horas_retroativos_itens')) IS DISTINCT FROM ARRAY['SELECT'] THEN
    RAISE EXCEPTION 'Os retroativos deveriam ter só políticas de SELECT';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc
              WHERE pronamespace = 'public'::regnamespace
                AND proname IN ('bancos_horas_registrar_retroativo', 'decidir_retroativo', 'registrar_aviso_retroativo',
                                'notificar_retroativo', 'bancos_horas_registrar_fechamento')
                AND (NOT prosecdef OR NOT ('search_path=public' = ANY (coalesce(proconfig, '{}'))))) THEN
    RAISE EXCEPTION 'Função sem SECURITY DEFINER ou sem search_path fixo';
  END IF;
  IF has_function_privilege('authenticated', 'public.bancos_horas_registrar_retroativo(jsonb)', 'execute')
     OR has_function_privilege('anon', 'public.decidir_retroativo(uuid, text, text)', 'execute') THEN
    RAISE EXCEPTION 'Função executável por quem não deveria';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM screens WHERE key = 'bancos_horas_retroativos') THEN
    RAISE EXCEPTION 'Tela bancos_horas_retroativos não registrada';
  END IF;

  -- -------------------------------------------------------------------
  -- 2. Banco com o mês fechado
  -- -------------------------------------------------------------------
  INSERT INTO empresas_clientes (id, nome_completo, nome_abreviado, status, tem_ams, tipo_book, email_gestor, vigencia_inicial, anexo)
  VALUES (v_empresa, 'EMPRESA TESTE RETROATIVOS LTDA', 'TESTE RETRO', 'ativo', true, 'qualidade', 'gestor@sonda.com', '2025-01-01', false);
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem)
  VALUES (v_empresa, 'TESTE BANCO', true, 1, 'horas', 3, '2026-07-01', 'OUTROS', 'manual')
  RETURNING id INTO v_banco;

  v_fech := jsonb_build_object('empresa_id', v_empresa, 'ano', 2026, 'mes', 8, 'motivo', 'geracao_book',
    'bancos', jsonb_build_array(jsonb_build_object('banco_id', v_banco, 'nome_banco', 'TESTE BANCO',
      'horas', jsonb_build_object('consumo', 600),
      'itens', jsonb_build_array(jsonb_build_object('tipo', 'apontamento', 'item_id', v_item1, 'minutos', 600)))));
  SELECT (bancos_horas_registrar_fechamento(v_fech) -> 'fechamentos' -> 0 ->> 'fechamento_id')::uuid INTO v_fechamento;

  -- -------------------------------------------------------------------
  -- 3. Detecção (job): cria o pendente; a segunda detecção atualiza o mesmo
  -- -------------------------------------------------------------------
  v_ret := bancos_horas_registrar_retroativo(jsonb_build_object(
    'banco_id', v_banco, 'ano', 2026, 'mes', 8, 'fechamento_id', v_fechamento,
    'consumo_antes_minutos', 600, 'consumo_depois_minutos', 660, 'consumo_antes_tickets', 0, 'consumo_depois_tickets', 0,
    'itens', jsonb_build_array(jsonb_build_object('tipo', 'apontamento', 'item_id', v_item2, 'minutos', 60, 'tickets', 0))));
  SELECT * INTO v_r FROM bancos_horas_retroativos WHERE id = v_ret;
  IF NOT FOUND OR v_r.situacao <> 'pendente' OR v_r.consumo_depois_minutos <> 660 THEN
    RAISE EXCEPTION 'A detecção não criou o retroativo pendente';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM notificacoes WHERE screen_key = 'bancos_horas_retroativos' AND resolvida_em IS NULL
                    AND chave = 'retroativo:' || v_banco || ':2026-8') THEN
    RAISE EXCEPTION 'Retroativo pendente não abriu aviso no sino';
  END IF;

  v_antes := v_r.atualizado_em;
  PERFORM pg_sleep(0.01);
  -- Item alterado no Aranda depois do fechamento: valor negativo é aceito
  v_ret2 := bancos_horas_registrar_retroativo(jsonb_build_object(
    'banco_id', v_banco, 'ano', 2026, 'mes', 8, 'fechamento_id', v_fechamento,
    'consumo_antes_minutos', 600, 'consumo_depois_minutos', 630, 'consumo_antes_tickets', 0, 'consumo_depois_tickets', 0,
    'itens', jsonb_build_array(
      jsonb_build_object('tipo', 'apontamento', 'item_id', v_item2, 'minutos', 60, 'tickets', 0),
      jsonb_build_object('tipo', 'apontamento', 'item_id', v_item1, 'minutos', -30, 'tickets', 0))));
  IF v_ret2 IS DISTINCT FROM v_ret OR (SELECT count(*) FROM bancos_horas_retroativos WHERE banco_id = v_banco) <> 1 THEN
    RAISE EXCEPTION 'A segunda detecção criou outro registro em vez de atualizar o aberto';
  END IF;
  SELECT * INTO v_r FROM bancos_horas_retroativos WHERE id = v_ret;
  IF v_r.consumo_depois_minutos <> 630 OR v_r.atualizado_em <= v_antes
     OR (SELECT count(*) FROM bancos_horas_retroativos_itens WHERE retroativo_id = v_ret) <> 2 THEN
    RAISE EXCEPTION 'A segunda detecção não atualizou a diferença e os itens';
  END IF;

  -- Um aberto por banco e mês, mesmo gravando direto
  v_falhou := false;
  BEGIN INSERT INTO bancos_horas_retroativos (banco_id, fechamento_id, mes, ano, consumo_antes_minutos, consumo_depois_minutos,
                                              consumo_antes_tickets, consumo_depois_tickets, situacao)
        VALUES (v_banco, v_fechamento, 8, 2026, 0, 0, 0, 0, 'pendente');
  EXCEPTION WHEN unique_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou dois retroativos abertos no mesmo banco e mês'; END IF;

  -- -------------------------------------------------------------------
  -- 4. Decisão na tela
  -- -------------------------------------------------------------------
  PERFORM set_config('role', 'authenticated', true);

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_sem_acesso, 'role', 'authenticated')::text, true);
  v_falhou := false;
  BEGIN PERFORM decidir_retroativo(v_ret, 'aprovar', 'Teste');
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Usuário sem permissão decidiu o retroativo'; END IF;
  IF EXISTS (SELECT 1 FROM bancos_horas_retroativos) THEN
    RAISE EXCEPTION 'Usuário sem permissão leu os retroativos';
  END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  v_falhou := false;
  BEGIN PERFORM decidir_retroativo(v_ret, 'aprovar', '  ');
  EXCEPTION WHEN raise_exception OR check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aprovou sem justificativa'; END IF;

  -- Gravar direto não muda a situação (sem política de UPDATE)
  UPDATE bancos_horas_retroativos SET situacao = 'descartado' WHERE id = v_ret;
  IF (SELECT situacao FROM bancos_horas_retroativos WHERE id = v_ret) <> 'pendente' THEN
    RAISE EXCEPTION 'Usuário mudou a situação direto na tabela';
  END IF;

  PERFORM decidir_retroativo(v_ret, 'aprovar', 'Apontamentos conferidos com o consultor');

  -- Aviso aos consultores: marca os itens
  PERFORM registrar_aviso_retroativo(v_ret, ARRAY[v_item2]);

  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  SELECT * INTO v_r FROM bancos_horas_retroativos WHERE id = v_ret;
  IF v_r.situacao <> 'aprovado' OR v_r.decidido_por IS DISTINCT FROM v_admin OR v_r.decidido_em IS NULL
     OR v_r.justificativa <> 'Apontamentos conferidos com o consultor' THEN
    RAISE EXCEPTION 'Aprovação gravada errada';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auditoria_alteracoes WHERE tabela = 'bancos_horas_retroativos' AND registro_id = v_ret::text
                    AND motivo = 'Apontamentos conferidos com o consultor' AND usuario_id = v_admin) THEN
    RAISE EXCEPTION 'Decisão sem o motivo e o autor na auditoria';
  END IF;
  IF EXISTS (SELECT 1 FROM notificacoes WHERE chave = 'retroativo:' || v_banco || ':2026-8' AND resolvida_em IS NULL) THEN
    RAISE EXCEPTION 'Aviso do sino não se resolveu com a decisão';
  END IF;
  IF (SELECT aviso_enviado_por FROM bancos_horas_retroativos_itens WHERE retroativo_id = v_ret AND item_id = v_item2) IS DISTINCT FROM v_admin
     OR (SELECT aviso_enviado_em FROM bancos_horas_retroativos_itens WHERE retroativo_id = v_ret AND item_id = v_item1) IS NOT NULL THEN
    RAISE EXCEPTION 'Aviso aos consultores marcado nos itens errados';
  END IF;

  -- -------------------------------------------------------------------
  -- 5. Nova diferença sobre o aprovado volta para pendente
  -- -------------------------------------------------------------------
  PERFORM bancos_horas_registrar_retroativo(jsonb_build_object(
    'banco_id', v_banco, 'ano', 2026, 'mes', 8, 'fechamento_id', v_fechamento,
    'consumo_antes_minutos', 600, 'consumo_depois_minutos', 700, 'consumo_antes_tickets', 0, 'consumo_depois_tickets', 0,
    'itens', jsonb_build_array(jsonb_build_object('tipo', 'apontamento', 'item_id', v_item2, 'minutos', 100, 'tickets', 0))));
  SELECT * INTO v_r FROM bancos_horas_retroativos WHERE id = v_ret;
  IF v_r.situacao <> 'pendente' OR v_r.decidido_por IS NOT NULL OR v_r.justificativa IS NOT NULL THEN
    RAISE EXCEPTION 'Diferença nova sobre o aprovado não voltou a pendente';
  END IF;

  -- -------------------------------------------------------------------
  -- 6. Retificação aplica o aprovado
  -- -------------------------------------------------------------------
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  PERFORM decidir_retroativo(v_ret, 'aprovar', 'Diferença nova conferida');
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  v_fech := jsonb_set(v_fech, '{motivo}', '"retificacao"');
  SELECT (bancos_horas_registrar_fechamento(v_fech) -> 'fechamentos' -> 0 ->> 'fechamento_id')::uuid INTO v_retificacao;
  SELECT * INTO v_r FROM bancos_horas_retroativos WHERE id = v_ret;
  IF v_r.situacao <> 'aplicado' OR v_r.fechamento_aplicado_id IS DISTINCT FROM v_retificacao THEN
    RAISE EXCEPTION 'A retificação não marcou o aprovado como aplicado';
  END IF;

  -- -------------------------------------------------------------------
  -- 7. Diferença que some sozinha descarta o aberto; aplicado não reabre
  -- -------------------------------------------------------------------
  v_ret2 := bancos_horas_registrar_retroativo(jsonb_build_object(
    'banco_id', v_banco, 'ano', 2026, 'mes', 8, 'fechamento_id', v_retificacao,
    'consumo_antes_minutos', 700, 'consumo_depois_minutos', 720, 'consumo_antes_tickets', 0, 'consumo_depois_tickets', 0,
    'itens', jsonb_build_array(jsonb_build_object('tipo', 'apontamento', 'item_id', v_item1, 'minutos', 20, 'tickets', 0))));
  IF v_ret2 = v_ret OR (SELECT situacao FROM bancos_horas_retroativos WHERE id = v_ret) <> 'aplicado' THEN
    RAISE EXCEPTION 'Diferença depois da retificação deveria abrir outro registro';
  END IF;
  PERFORM bancos_horas_registrar_retroativo(jsonb_build_object(
    'banco_id', v_banco, 'ano', 2026, 'mes', 8, 'fechamento_id', v_retificacao,
    'consumo_antes_minutos', 700, 'consumo_depois_minutos', 700, 'consumo_antes_tickets', 0, 'consumo_depois_tickets', 0,
    'itens', '[]'::jsonb));
  SELECT * INTO v_r FROM bancos_horas_retroativos WHERE id = v_ret2;
  IF v_r.situacao <> 'descartado' OR v_r.justificativa IS NULL OR v_r.decidido_por IS NOT NULL THEN
    RAISE EXCEPTION 'Diferença que sumiu não descartou o aberto automaticamente';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
