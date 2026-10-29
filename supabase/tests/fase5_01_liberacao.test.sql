-- =====================================================================
-- Teste da migration 20261029000001_fase5_liberacao
-- (docs/especificacoes/Modelagem_Fase5.md, seções 3 e 4; decisões P1, P4 e P6).
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou.
-- Qualquer outra mensagem de erro diz qual verificação falhou.
-- =====================================================================
DO $teste$
DECLARE
  v_admin uuid := (SELECT uga.user_id FROM user_group_assignments uga JOIN user_groups ug ON ug.id = uga.group_id
                    WHERE ug.name = 'Administradores' LIMIT 1);
  v_sem_acesso uuid := gen_random_uuid();
  v_empresa uuid;
  v_banco uuid;
  v_nome_banco text;
  v_ano int;
  v_mes int;
  v_prox_ano int;
  v_prox_mes int;
  v_fechamento jsonb;
  v_resultado jsonb;
  v_r record;
  v_n int;
  v_falhou boolean;
  v_reajuste uuid;
  v_legado uuid;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Precondição: precisa de um usuário no grupo Administradores';
  END IF;

  -- Empresa em Legado com banco ativo que o cliente vê e mês fechado no legado
  SELECT e.id INTO v_empresa
    FROM empresas e
   WHERE e.modelo_calculo = 'legado'
     AND EXISTS (SELECT 1 FROM bancos_horas b WHERE b.empresa_id = e.id AND b.ativo AND b.visivel_cliente)
     AND EXISTS (SELECT 1 FROM banco_horas_fechamentos f WHERE f.empresa_id = e.id)
   ORDER BY e.nome_abreviado LIMIT 1;
  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'Precondição: precisa de uma empresa em Legado com banco ativo e mês fechado no legado';
  END IF;
  SELECT b.id, b.nome INTO v_banco, v_nome_banco FROM bancos_horas b
   WHERE b.empresa_id = v_empresa AND b.ativo AND b.visivel_cliente ORDER BY b.id LIMIT 1;
  SELECT f.ano, f.mes INTO v_ano, v_mes FROM banco_horas_fechamentos f
   WHERE f.empresa_id = v_empresa ORDER BY f.ano DESC, f.mes DESC LIMIT 1;
  v_prox_ano := CASE WHEN v_mes = 12 THEN v_ano + 1 ELSE v_ano END;
  v_prox_mes := CASE WHEN v_mes = 12 THEN 1 ELSE v_mes + 1 END;

  -- Fechamento de transição: o repasse do último Book do legado (P1)
  v_fechamento := jsonb_build_object(
    'empresa_id', v_empresa, 'ano', v_ano, 'mes', v_mes, 'motivo', 'transicao',
    'bancos', jsonb_build_array(jsonb_build_object(
      'banco_id', v_banco, 'nome_banco', v_nome_banco,
      'horas', jsonb_build_object('saldo', 240, 'repasse', 120, 'consumo', 600),
      'itens', '[]'::jsonb)));

  -- -------------------------------------------------------------------
  -- 1. Estrutura e segurança
  -- -------------------------------------------------------------------
  SELECT count(*) INTO v_n FROM pg_proc
   WHERE proname IN ('liberar_empresa', 'voltar_para_legado', 'lancamentos_para_legado', 'bancos_horas_registrar_fechamento')
     AND pronamespace = 'public'::regnamespace
     AND prosecdef AND proconfig @> ARRAY['search_path=public'];
  IF v_n <> 4 THEN
    RAISE EXCEPTION 'As funções da liberação precisam existir com SECURITY DEFINER e search_path fixo (achei %)', v_n;
  END IF;
  IF has_function_privilege('anon', 'public.liberar_empresa(uuid, jsonb)', 'execute')
     OR has_function_privilege('anon', 'public.voltar_para_legado(uuid, text)', 'execute')
     OR has_function_privilege('anon', 'public.lancamentos_para_legado(uuid)', 'execute')
     OR NOT has_function_privilege('authenticated', 'public.liberar_empresa(uuid, jsonb)', 'execute')
     OR NOT has_function_privilege('authenticated', 'public.voltar_para_legado(uuid, text)', 'execute')
     OR NOT has_function_privilege('authenticated', 'public.lancamentos_para_legado(uuid)', 'execute') THEN
    RAISE EXCEPTION 'Liberar e voltar: executáveis por authenticated e não por anon';
  END IF;

  -- -------------------------------------------------------------------
  -- 2. Pré-condições da liberação
  -- -------------------------------------------------------------------
  INSERT INTO bancos_horas_comparacao (empresa_id, situacao) VALUES (v_empresa, 'identico')
  ON CONFLICT (empresa_id) DO UPDATE
     SET situacao = 'identico', validada_por = NULL, validada_em = NULL, validacao_situacao = NULL;

  -- Sem Edição na Comparação (P6)
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_sem_acesso, 'role', 'authenticated')::text, true);
  v_falhou := false;
  BEGIN
    PERFORM liberar_empresa(v_empresa, v_fechamento);
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION 'Quem não tem Edição na Comparação não pode liberar';
  END IF;

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  -- Não validada
  v_falhou := false;
  BEGIN
    PERFORM liberar_empresa(v_empresa, v_fechamento);
  EXCEPTION WHEN check_violation THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION 'Empresa não validada não pode ser liberada';
  END IF;

  -- Validada, mas a rodada seguinte achou divergência
  UPDATE bancos_horas_comparacao
     SET validada_por = v_admin, validada_em = NOW(), validacao_situacao = 'identico', situacao = 'divergente'
   WHERE empresa_id = v_empresa;
  v_falhou := false;
  BEGIN
    PERFORM liberar_empresa(v_empresa, v_fechamento);
  EXCEPTION WHEN check_violation THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION 'Empresa com situação Divergente não pode ser liberada';
  END IF;
  UPDATE bancos_horas_comparacao SET situacao = 'identico' WHERE empresa_id = v_empresa;

  -- Transição em mês que não é o último fechado no legado
  v_falhou := false;
  BEGIN
    PERFORM liberar_empresa(v_empresa, v_fechamento || jsonb_build_object('ano', v_prox_ano, 'mes', v_prox_mes));
  EXCEPTION WHEN check_violation THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION 'A transição tem de ser no último mês que o legado fechou';
  END IF;

  -- "transicao" só pela liberação
  v_falhou := false;
  BEGIN
    PERFORM bancos_horas_registrar_fechamento(v_fechamento);
  EXCEPTION WHEN check_violation OR insufficient_privilege THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION 'O fechamento de transição só pode ser gravado pela liberação';
  END IF;

  -- -------------------------------------------------------------------
  -- 3. Liberar: modelo, fechamento de transição, espelho e auditoria
  -- -------------------------------------------------------------------
  -- O modo sombra já tinha fechado o mês no modelo novo
  DELETE FROM bancos_horas_fechamento_itens WHERE fechamento_id IN (
    SELECT id FROM bancos_horas_fechamentos WHERE banco_id = v_banco AND ano = v_ano AND mes = v_mes);
  UPDATE bancos_horas_fechamentos SET vigente = false WHERE banco_id = v_banco AND ano = v_ano AND mes = v_mes;
  INSERT INTO bancos_horas_fechamentos (banco_id, mes, ano, versao, vigente, motivo, nome_banco, repasse_minutos)
  VALUES (v_banco, v_mes, v_ano,
          COALESCE((SELECT max(versao) FROM bancos_horas_fechamentos WHERE banco_id = v_banco AND ano = v_ano AND mes = v_mes), 0) + 1,
          true, 'geracao_book', v_nome_banco, 999);

  v_resultado := liberar_empresa(v_empresa, v_fechamento);

  SELECT * INTO v_r FROM empresas WHERE id = v_empresa;
  IF v_r.modelo_calculo <> 'multiplo' OR v_r.modelo_alterado_por IS DISTINCT FROM v_admin OR v_r.modelo_alterado_em IS NULL THEN
    RAISE EXCEPTION 'Liberar grava modelo multiplo, quem e quando';
  END IF;

  SELECT count(*) INTO v_n FROM bancos_horas_fechamentos
   WHERE banco_id = v_banco AND ano = v_ano AND mes = v_mes AND vigente;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Um fechamento vigente por banco e mês depois da transição (há %)', v_n;
  END IF;
  SELECT * INTO v_r FROM bancos_horas_fechamentos
   WHERE banco_id = v_banco AND ano = v_ano AND mes = v_mes AND vigente;
  IF v_r.motivo <> 'transicao' OR v_r.repasse_minutos <> 120 OR v_r.saldo_minutos <> 240 THEN
    RAISE EXCEPTION 'O fechamento vigente do mês é o de transição, com o repasse do legado (achei %, repasse %)',
      v_r.motivo, v_r.repasse_minutos;
  END IF;

  IF EXISTS (SELECT 1 FROM bancos_horas WHERE empresa_id = v_empresa AND espelha_legado) THEN
    RAISE EXCEPTION 'Liberar desliga o espelho dos parâmetros do legado';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auditoria_alteracoes
                  WHERE tabela = 'empresas' AND registro_id = v_empresa::text
                    AND 'modelo_calculo' = ANY (campos_alterados) AND motivo = 'Liberação para o modelo novo') THEN
    RAISE EXCEPTION 'A liberação fica na auditoria da empresa, com o motivo';
  END IF;

  v_falhou := false;
  BEGIN
    PERFORM liberar_empresa(v_empresa, v_fechamento);
  EXCEPTION WHEN check_violation THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION 'Empresa já liberada não é liberada de novo';
  END IF;

  -- -------------------------------------------------------------------
  -- 4. Lançamentos no Controle novo durante a liberação (P4)
  -- -------------------------------------------------------------------
  INSERT INTO bancos_horas_reajustes (banco_id, mes, ano, tipo, minutos, tickets, justificativa, origem)
  VALUES (v_banco, v_prox_mes, v_prox_ano, 'entrada', 90, 0, 'Crédito de teste da liberação', 'manual')
  RETURNING id INTO v_reajuste;
  INSERT INTO bancos_horas_reajustes (banco_id, mes, ano, tipo, minutos, tickets, justificativa, origem, ativo)
  VALUES (v_banco, v_prox_mes, v_prox_ano, 'saida', 30, 0, 'Inativo: não vai para o legado', 'manual', false);
  INSERT INTO bancos_horas_observacoes (banco_id, mes, ano, texto, origem)
  VALUES (v_banco, v_prox_mes, v_prox_ano, 'Observação de teste da liberação', 'manual');

  v_resultado := lancamentos_para_legado(v_empresa);
  IF (v_resultado ->> 'reajustes')::int <> 1 OR (v_resultado ->> 'observacoes')::int <> 1 THEN
    RAISE EXCEPTION 'Lançamentos para o legado: 1 reajuste e 1 observação (achei %)', v_resultado;
  END IF;

  -- -------------------------------------------------------------------
  -- 5. Voltar para legado
  -- -------------------------------------------------------------------
  v_falhou := false;
  BEGIN
    PERFORM voltar_para_legado(v_empresa, '  ');
  EXCEPTION WHEN check_violation THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION 'Voltar para legado exige motivo';
  END IF;

  v_resultado := voltar_para_legado(v_empresa, 'Teste: o Book saiu com o banco errado');
  IF (v_resultado ->> 'reajustes')::int <> 1 OR (v_resultado ->> 'observacoes')::int <> 1 THEN
    RAISE EXCEPTION 'Voltar devolve o que copiou: 1 reajuste e 1 observação (achei %)', v_resultado;
  END IF;

  IF (SELECT modelo_calculo FROM empresas WHERE id = v_empresa) <> 'legado' THEN
    RAISE EXCEPTION 'Voltar grava o modelo legado';
  END IF;

  SELECT reajuste_legado_id INTO v_legado FROM bancos_horas_reajustes WHERE id = v_reajuste;
  SELECT * INTO v_r FROM banco_horas_reajustes WHERE id = v_legado;
  IF NOT FOUND OR v_r.empresa_id <> v_empresa OR v_r.mes <> v_prox_mes OR v_r.ano <> v_prox_ano
     OR v_r.tipo_reajuste <> 'entrada' OR v_r.valor_reajuste_horas <> '01:30'
     OR v_r.observacao NOT LIKE 'Crédito de teste da liberação%' THEN
    RAISE EXCEPTION 'O reajuste do Controle novo vai para o legado, ligado pelo reajuste_legado_id';
  END IF;

  SELECT count(*) INTO v_n FROM bancos_horas_reajustes WHERE reajuste_legado_id = v_legado;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'A cópia não pode voltar duplicada pelo espelho (há % linhas ligadas)', v_n;
  END IF;

  -- Daqui em diante, o legado manda: a edição lá espelha na mesma linha
  UPDATE banco_horas_reajustes SET valor_reajuste_horas = '02:00' WHERE id = v_legado;
  IF (SELECT minutos FROM bancos_horas_reajustes WHERE id = v_reajuste) <> 120 THEN
    RAISE EXCEPTION 'Depois de voltar, a edição no legado espelha na linha copiada';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM banco_horas_observacoes
                  WHERE empresa_id = v_empresa AND mes = v_prox_mes AND ano = v_prox_ano
                    AND observacao LIKE 'Observação de teste da liberação%' AND tipo = 'manual') THEN
    RAISE EXCEPTION 'A observação do Controle novo vai para o legado';
  END IF;

  IF EXISTS (SELECT 1 FROM banco_horas_reajustes
              WHERE empresa_id = v_empresa AND observacao LIKE 'Inativo: não vai para o legado%') THEN
    RAISE EXCEPTION 'Reajuste inativo não vai para o legado';
  END IF;

  IF (SELECT validada_em FROM bancos_horas_comparacao WHERE empresa_id = v_empresa) IS NOT NULL THEN
    RAISE EXCEPTION 'Voltar desfaz a validação: a empresa volta para a comparação';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auditoria_alteracoes
                  WHERE tabela = 'empresas' AND registro_id = v_empresa::text
                    AND motivo = 'Teste: o Book saiu com o banco errado') THEN
    RAISE EXCEPTION 'A volta fica na auditoria da empresa, com o motivo';
  END IF;

  v_falhou := false;
  BEGIN
    PERFORM voltar_para_legado(v_empresa, 'De novo');
  EXCEPTION WHEN check_violation THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION 'Empresa em Legado não volta de novo';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
