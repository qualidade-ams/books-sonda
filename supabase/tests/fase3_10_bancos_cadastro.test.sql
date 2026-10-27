-- =====================================================================
-- Teste da migration 20261023000001_fase3_bancos_cadastro
-- (docs/especificacoes/Modelagem_Fase3.md, seção 4).
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou
-- (inclusive as linhas criadas no legado). Qualquer outra mensagem de erro diz
-- qual verificação falhou.
-- =====================================================================
DO $teste$
DECLARE
  v_admin uuid := (SELECT uga.user_id FROM user_group_assignments uga JOIN user_groups ug ON ug.id = uga.group_id
                    WHERE ug.name = 'Administradores' LIMIT 1);
  v_sem_acesso uuid := gen_random_uuid();
  v_empresa uuid := gen_random_uuid();
  v_padrao uuid;
  v_banco uuid;
  v_novo uuid;
  v_produto uuid;
  v_r record;
  v_n int;
  v_falhou boolean;
  v_msg text;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Precondição: precisa de um usuário no grupo Administradores';
  END IF;

  -- -------------------------------------------------------------------
  -- 1. Segurança das funções
  -- -------------------------------------------------------------------
  SELECT count(*) INTO v_n FROM pg_proc
   WHERE proname IN ('bancos_horas_criar', 'bancos_horas_inativar', 'bancos_horas_nova_vigencia')
     AND pronamespace = 'public'::regnamespace
     AND prosecdef AND proconfig @> ARRAY['search_path=public'];
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'As funções do cadastro de bancos precisam de SECURITY DEFINER e search_path fixo';
  END IF;
  IF has_function_privilege('anon', 'public.bancos_horas_criar(jsonb, jsonb, jsonb, jsonb)', 'execute') THEN
    RAISE EXCEPTION 'bancos_horas_criar executável por anon';
  END IF;
  IF has_function_privilege('anon', 'public.bancos_horas_inativar(uuid, text)', 'execute')
     OR has_function_privilege('anon', 'public.bancos_horas_nova_vigencia(uuid, text, date, jsonb, text)', 'execute') THEN
    RAISE EXCEPTION 'Funções do cadastro de bancos executáveis por anon';
  END IF;

  -- -------------------------------------------------------------------
  -- Cenário: empresa com Banco padrão e um banco por filtro, desde 07/2026
  -- -------------------------------------------------------------------
  INSERT INTO empresas_clientes (id, nome_completo, nome_abreviado, status, tem_ams, tipo_book, email_gestor, vigencia_inicial, anexo)
  VALUES (v_empresa, 'EMPRESA TESTE CADASTRO LTDA', 'TESTE CADASTRO', 'ativo', true, 'qualidade', 'gestor@sonda.com', '2025-01-01', false);
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem)
  VALUES (v_empresa, 'TESTE PADRÃO', true, 1, 'horas', 3, '2026-07-01', 'OUTROS', 'manual')
  RETURNING id INTO v_padrao;
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem, filtro_ic_operador, filtro_ic_valor)
  VALUES (v_empresa, 'TESTE NÍQUEL', false, 2, 'horas', 3, '2026-07-01', 'OUTROS', 'manual', 'contem', 'NIQUEL')
  RETURNING id INTO v_banco;
  INSERT INTO bancos_horas_baseline (banco_id, baseline_minutos, data_inicio, motivo)
  VALUES (v_banco, 2400, '2026-07-01', 'Carga');
  INSERT INTO bancos_horas_repasse (banco_id, percentual_mensal, data_inicio, motivo)
  VALUES (v_banco, 50, '2026-07-01', 'Carga');

  -- -------------------------------------------------------------------
  -- 2. Nova vigência: fecha a aberta no mês anterior e abre a nova, com motivo
  -- -------------------------------------------------------------------
  PERFORM bancos_horas_nova_vigencia(v_banco, 'baseline', '2026-10-01',
                                     '{"baseline_minutos": 3000, "credito": "mensal"}', ' Renovação do contrato ');
  SELECT * INTO v_r FROM bancos_horas_baseline WHERE banco_id = v_banco AND data_inicio = '2026-07-01';
  IF v_r.data_fim IS DISTINCT FROM '2026-09-30'::date THEN
    RAISE EXCEPTION 'A vigência aberta deveria fechar em 30/09/2026, fechou em %', v_r.data_fim;
  END IF;
  SELECT * INTO v_r FROM bancos_horas_baseline WHERE banco_id = v_banco AND data_inicio = '2026-10-01';
  IF NOT FOUND OR v_r.data_fim IS NOT NULL OR v_r.baseline_minutos <> 3000 OR v_r.motivo <> 'Renovação do contrato' THEN
    RAISE EXCEPTION 'Vigência nova de baseline gravada errada';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auditoria_alteracoes
                  WHERE tabela = 'bancos_horas_baseline' AND banco_id = v_banco AND acao = 'insert'
                    AND motivo = 'Renovação do contrato') THEN
    RAISE EXCEPTION 'A auditoria da vigência nova ficou sem o motivo';
  END IF;

  PERFORM bancos_horas_nova_vigencia(v_banco, 'repasse', '2026-10-01',
                                     '{"percentual_mensal": 0}', 'Sem repasse a partir de outubro');
  IF (SELECT percentual_mensal FROM bancos_horas_repasse WHERE banco_id = v_banco AND data_fim IS NULL) <> 0 THEN
    RAISE EXCEPTION 'Vigência nova de repasse não respeitou 0%%';
  END IF;

  -- Validações
  v_falhou := false;
  BEGIN PERFORM bancos_horas_nova_vigencia(v_banco, 'baseline', '2026-10-01', '{"baseline_minutos": 1}', 'x');
  EXCEPTION WHEN OTHERS THEN v_falhou := true; v_msg := SQLERRM; END;
  IF NOT v_falhou OR v_msg NOT LIKE '%depois de 10/2026%' THEN
    RAISE EXCEPTION 'Aceitou vigência que não começa depois da aberta (%)', v_msg;
  END IF;
  v_falhou := false;
  BEGIN PERFORM bancos_horas_nova_vigencia(v_banco, 'baseline', '2026-12-15', '{"baseline_minutos": 1}', 'x');
  EXCEPTION WHEN OTHERS THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou vigência fora do dia 1'; END IF;
  v_falhou := false;
  BEGIN PERFORM bancos_horas_nova_vigencia(v_banco, 'baseline', '2026-12-01', '{"baseline_minutos": 1}', '  ');
  EXCEPTION WHEN OTHERS THEN v_falhou := true; v_msg := SQLERRM; END;
  IF NOT v_falhou OR v_msg NOT LIKE '%motivo%' THEN RAISE EXCEPTION 'Aceitou vigência sem motivo'; END IF;
  v_falhou := false;
  BEGIN PERFORM bancos_horas_nova_vigencia(v_banco, 'outro', '2026-12-01', '{}', 'x');
  EXCEPTION WHEN OTHERS THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou tipo de vigência desconhecido'; END IF;

  -- Baseline obrigatório pelo tipo do contrato (gatilho da Fase 1) continua valendo
  v_falhou := false;
  BEGIN PERFORM bancos_horas_nova_vigencia(v_banco, 'baseline', '2026-12-01', '{"baseline_tickets": 5}', 'x');
  EXCEPTION WHEN OTHERS THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou baseline sem horas num banco de horas'; END IF;
  IF (SELECT data_fim FROM bancos_horas_baseline WHERE banco_id = v_banco AND data_inicio = '2026-10-01') IS NOT NULL THEN
    RAISE EXCEPTION 'A falha deixou a vigência aberta fechada (não foi atômica)';
  END IF;

  -- Mês fechado não muda: a vigência nova tem de começar depois do último mês fechado
  INSERT INTO bancos_horas_fechamentos (banco_id, mes, ano, versao, motivo, nome_banco)
  VALUES (v_banco, 12, 2026, 1, 'geracao_book', 'TESTE NÍQUEL');
  v_falhou := false;
  BEGIN PERFORM bancos_horas_nova_vigencia(v_banco, 'baseline', '2026-12-01', '{"baseline_minutos": 1}', 'x');
  EXCEPTION WHEN OTHERS THEN v_falhou := true; v_msg := SQLERRM; END;
  IF NOT v_falhou OR v_msg NOT LIKE '%12/2026 está fechado%' THEN
    RAISE EXCEPTION 'Aceitou vigência nova num mês fechado (%)', v_msg;
  END IF;
  PERFORM bancos_horas_nova_vigencia(v_banco, 'baseline', '2027-01-01', '{"baseline_minutos": 1800}', 'Redução');

  -- -------------------------------------------------------------------
  -- 3. Criar banco: banco, escopo, baseline e repasse numa transação só
  -- -------------------------------------------------------------------
  v_produto := (SELECT id FROM produtos WHERE ativo AND NOT a_classificar ORDER BY codigo LIMIT 1);
  v_novo := bancos_horas_criar(
    jsonb_build_object('empresa_id', v_empresa, 'nome', 'TESTE NOVO', 'tipo_contrato', 'horas',
                       'periodo_apuracao', 3, 'inicio_vigencia', '2026-10-01', 'taxa_produto', 'OUTROS'),
    jsonb_build_array(jsonb_build_object('produto_id', v_produto, 'modulo_id', NULL)),
    '{"baseline_minutos": 1200}',
    '{"percentual_mensal": 100}'
  );
  SELECT * INTO v_r FROM bancos_horas WHERE id = v_novo;
  IF v_r.ordem <> 3 OR v_r.origem <> 'manual' OR NOT v_r.ativo OR v_r.padrao
     OR v_r.dia_inicio_apuracao <> 1 OR v_r.dia_fim_apuracao <> 0 OR v_r.repasse_especial <> 'nenhum' THEN
    RAISE EXCEPTION 'Banco novo gravado com ordem, origem ou valores padrão errados';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM bancos_horas_escopo WHERE banco_id = v_novo AND produto_id = v_produto AND modulo_id IS NULL)
     OR NOT EXISTS (SELECT 1 FROM bancos_horas_baseline WHERE banco_id = v_novo AND baseline_minutos = 1200
                       AND data_inicio = '2026-10-01' AND data_fim IS NULL)
     OR NOT EXISTS (SELECT 1 FROM bancos_horas_repasse WHERE banco_id = v_novo AND percentual_mensal = 100
                       AND data_inicio = '2026-10-01') THEN
    RAISE EXCEPTION 'Banco novo sem escopo, baseline ou repasse';
  END IF;

  -- Conflito de escopo (RN-05) desfaz tudo: o banco não fica pela metade
  v_falhou := false;
  BEGIN
    PERFORM bancos_horas_criar(
      jsonb_build_object('empresa_id', v_empresa, 'nome', 'TESTE CONFLITO', 'tipo_contrato', 'horas',
                         'periodo_apuracao', 3, 'inicio_vigencia', '2026-10-01', 'taxa_produto', 'OUTROS'),
      jsonb_build_array(jsonb_build_object('produto_id', v_produto, 'modulo_id', NULL)),
      '{"baseline_minutos": 60}', '{"percentual_mensal": 50}');
  EXCEPTION WHEN OTHERS THEN v_falhou := true; v_msg := SQLERRM; END;
  IF NOT v_falhou OR v_msg NOT LIKE '%Conflito de escopo%' THEN
    RAISE EXCEPTION 'Aceitou escopo em conflito (%)', v_msg;
  END IF;
  IF EXISTS (SELECT 1 FROM bancos_horas WHERE empresa_id = v_empresa AND nome = 'TESTE CONFLITO') THEN
    RAISE EXCEPTION 'O banco em conflito ficou gravado pela metade';
  END IF;

  -- -------------------------------------------------------------------
  -- 4. Inativar com motivo
  -- -------------------------------------------------------------------
  v_falhou := false;
  BEGIN PERFORM bancos_horas_inativar(v_banco, ' ');
  EXCEPTION WHEN OTHERS THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Inativou banco sem motivo'; END IF;

  -- O padrão não é inativado enquanto houver outro banco ativo (gatilho da Fase 1)
  v_falhou := false;
  BEGIN PERFORM bancos_horas_inativar(v_padrao, 'Teste');
  EXCEPTION WHEN OTHERS THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Inativou o padrão com outro banco ativo'; END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  PERFORM bancos_horas_inativar(v_banco, 'Fim do contrato NÍQUEL');
  PERFORM set_config('request.jwt.claims', '', true);
  SELECT * INTO v_r FROM bancos_horas WHERE id = v_banco;
  IF v_r.ativo OR v_r.inativado_em IS NULL OR v_r.inativado_por IS DISTINCT FROM v_admin THEN
    RAISE EXCEPTION 'Inativação sem data ou sem autor';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auditoria_alteracoes
                  WHERE tabela = 'bancos_horas' AND registro_id = v_banco::text AND acao = 'update'
                    AND motivo = 'Fim do contrato NÍQUEL') THEN
    RAISE EXCEPTION 'A auditoria da inativação ficou sem o motivo';
  END IF;

  -- -------------------------------------------------------------------
  -- 5. Permissão: Edição em Parâmetros dos bancos
  -- -------------------------------------------------------------------
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_sem_acesso, 'role', 'authenticated')::text, true);
  v_falhou := false;
  BEGIN PERFORM bancos_horas_inativar(v_padrao, 'Teste');
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Usuário sem permissão inativou banco'; END IF;
  v_falhou := false;
  BEGIN PERFORM bancos_horas_nova_vigencia(v_padrao, 'repasse', '2027-01-01', '{"percentual_mensal": 10}', 'x');
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Usuário sem permissão criou vigência'; END IF;
  v_falhou := false;
  BEGIN PERFORM bancos_horas_criar(jsonb_build_object('empresa_id', v_empresa, 'nome', 'X'), '[]', '{}', '{}');
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Usuário sem permissão criou banco'; END IF;
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
