-- =====================================================================
-- Teste da migration 20261015000001_fase1_infra_catalogos.
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou.
-- Qualquer outra mensagem de erro diz qual verificação falhou.
-- (O SQL Editor do Supabase confirma cada comando separadamente, então
-- BEGIN/ROLLBACK não protege; o bloco único protege em qualquer ferramenta.)
-- =====================================================================
DO $teste$
DECLARE
  v_admin uuid := (SELECT uga.user_id FROM user_group_assignments uga JOIN user_groups ug ON ug.id = uga.group_id
                    WHERE ug.name = 'Administradores' LIMIT 1);
  v_comum uuid := (SELECT uga.user_id FROM user_group_assignments uga
                    WHERE NOT EXISTS (SELECT 1 FROM user_group_assignments x JOIN user_groups g ON g.id = x.group_id
                                       WHERE x.user_id = uga.user_id AND g.name = 'Administradores')
                    LIMIT 1);
  v_tabela text;
  v_n int;
  v_comex uuid;
  v_fiscal uuid;
  v_modulo_fiscal uuid;
  v_id uuid;
  v_aud record;
  v_falhou boolean;
BEGIN
  -- 1. Tabelas existem, com RLS e sem política duplicada por comando
  FOREACH v_tabela IN ARRAY ARRAY['produtos','produto_modulos','grupos_aranda','ramos_atividade',
                                  'modulos_requerimento_produto','auditoria_alteracoes'] LOOP
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

  -- 2. Telas registradas, com Edição só para Administradores
  SELECT count(*) INTO v_n FROM screens
   WHERE key IN ('produtos_modulos','de_para_grupos','ramos_atividade','bancos_horas_auditoria');
  IF v_n <> 4 THEN RAISE EXCEPTION 'Esperava 4 telas registradas, achei %', v_n; END IF;
  SELECT count(*) INTO v_n FROM screen_permissions sp JOIN user_groups ug ON ug.id = sp.group_id
   WHERE sp.screen_key IN ('produtos_modulos','de_para_grupos','ramos_atividade','bancos_horas_auditoria')
     AND ug.name = 'Administradores' AND sp.permission_level = 'edit';
  IF v_n <> 4 THEN RAISE EXCEPTION 'Administradores sem Edição nas 4 telas (achei %)', v_n; END IF;
  SELECT count(*) INTO v_n FROM screen_permissions sp JOIN user_groups ug ON ug.id = sp.group_id
   WHERE sp.screen_key IN ('produtos_modulos','de_para_grupos','ramos_atividade','bancos_horas_auditoria')
     AND ug.name <> 'Administradores';
  IF v_n <> 0 THEN RAISE EXCEPTION 'Outros grupos receberam permissão nas telas novas (%)', v_n; END IF;

  -- 3. Funções internas sem EXECUTE para usuários
  IF has_function_privilege('authenticated', 'public.registrar_auditoria()', 'execute')
     OR has_function_privilege('authenticated', 'public.definir_autoria()', 'execute') THEN
    RAISE EXCEPTION 'Funções internas executáveis por authenticated';
  END IF;

  -- 4. Regras de dados
  INSERT INTO produtos (codigo, nome, ordem) VALUES ('TESTE_A', 'Produto A', 90) RETURNING id INTO v_comex;
  INSERT INTO produtos (codigo, nome, ordem) VALUES ('TESTE_B', 'Produto B', 91) RETURNING id INTO v_fiscal;
  INSERT INTO produto_modulos (produto_id, nome, ordem) VALUES (v_fiscal, 'Módulo B1', 1) RETURNING id INTO v_modulo_fiscal;

  v_falhou := false;
  BEGIN INSERT INTO produtos (codigo, nome, ordem) VALUES ('TESTE_A', 'Duplicado', 92);
  EXCEPTION WHEN unique_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou código de produto duplicado'; END IF;

  v_falhou := false;
  BEGIN INSERT INTO produto_modulos (produto_id, nome, ordem) VALUES (v_fiscal, 'MÓDULO B1', 2);
  EXCEPTION WHEN unique_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou módulo duplicado no produto'; END IF;

  v_falhou := false;
  BEGIN
    INSERT INTO grupos_aranda (grupo_aranda, grupo_book, produto_id, modulo_id, classificacao)
    VALUES ('TESTE - GRUPO 1', 'Teste', v_comex, v_modulo_fiscal, 'modulo');
  EXCEPTION WHEN foreign_key_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou módulo de outro produto no de-para'; END IF;

  v_falhou := false;
  BEGIN
    INSERT INTO grupos_aranda (grupo_aranda, grupo_book, produto_id, classificacao)
    VALUES ('TESTE - GRUPO 2', 'Teste', v_fiscal, 'modulo');
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou classificação "modulo" sem módulo'; END IF;

  v_falhou := false;
  BEGIN
    INSERT INTO grupos_aranda (grupo_aranda, grupo_book, produto_id, classificacao)
    VALUES ('TESTE - GRUPO 3', 'Teste', v_fiscal, 'nao_se_aplica');
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou "nao_se_aplica" com produto'; END IF;

  INSERT INTO grupos_aranda (grupo_aranda, grupo_book, produto_id, modulo_id, classificacao)
  VALUES ('TESTE - GRUPO 4', 'Teste B1', v_fiscal, v_modulo_fiscal, 'modulo');
  INSERT INTO grupos_aranda (grupo_aranda, grupo_book, produto_id, classificacao)
  VALUES ('TESTE - GRUPO 5', 'Teste B', v_fiscal, 'sem_modulo');
  INSERT INTO grupos_aranda (grupo_aranda, grupo_book, classificacao)
  VALUES ('TESTE - GRUPO 6', 'DEDICADOS', 'nao_se_aplica');

  v_falhou := false;
  BEGIN INSERT INTO grupos_aranda (grupo_aranda, grupo_book, classificacao) VALUES ('TESTE - GRUPO 6', 'X', 'nao_se_aplica');
  EXCEPTION WHEN unique_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou grupo Aranda duplicado'; END IF;

  v_falhou := false;
  BEGIN
    INSERT INTO modulos_requerimento_produto (modulo_requerimento, produto_id, modulo_id)
    VALUES ('Teste req', v_comex, v_modulo_fiscal);
  EXCEPTION WHEN foreign_key_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou módulo de requerimento de outro produto'; END IF;

  INSERT INTO ramos_atividade (nome, ordem) VALUES ('Varejo Teste', 1);
  v_falhou := false;
  BEGIN INSERT INTO ramos_atividade (nome, ordem) VALUES ('VAREJO TESTE', 2);
  EXCEPTION WHEN unique_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou ramo duplicado'; END IF;

  -- 5. Auditoria e autoria
  INSERT INTO produtos (codigo, nome, ordem) VALUES ('TESTE_AUD', 'Auditado', 95) RETURNING id INTO v_id;
  UPDATE produtos SET nome = 'Auditado 2' WHERE id = v_id;
  UPDATE produtos SET nome = 'Auditado 2' WHERE id = v_id; -- sem mudança real: não audita

  SELECT count(*) FILTER (WHERE acao = 'insert') ins, count(*) FILTER (WHERE acao = 'update') upd
    INTO v_aud FROM auditoria_alteracoes WHERE tabela = 'produtos' AND registro_id = v_id::text;
  IF v_aud.ins <> 1 OR v_aud.upd <> 1 THEN
    RAISE EXCEPTION 'Auditoria esperava 1 insert e 1 update, achou % e %', v_aud.ins, v_aud.upd;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auditoria_alteracoes
                  WHERE tabela = 'produtos' AND registro_id = v_id::text AND acao = 'update'
                    AND campos_alterados = ARRAY['nome'] AND dados_depois->>'nome' = 'Auditado 2'
                    AND dados_antes->>'nome' = 'Auditado') THEN
    RAISE EXCEPTION 'Auditoria do update sem campos_alterados/dados corretos';
  END IF;
  IF (SELECT updated_at FROM produtos WHERE id = v_id) IS NULL THEN
    RAISE EXCEPTION 'Autoria: updated_at não preenchido';
  END IF;

  -- 6. RLS: usuário comum lê catálogo mas não escreve; administrador escreve; ninguém apaga auditoria
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_comum, 'role', 'authenticated')::text, true);

  IF NOT EXISTS (SELECT 1 FROM produtos WHERE codigo = 'TESTE_A') THEN
    RAISE EXCEPTION 'Usuário comum não consegue ler o catálogo de produtos';
  END IF;
  v_falhou := false;
  BEGIN INSERT INTO produtos (codigo, nome, ordem) VALUES ('TESTE_RLS', 'X', 99);
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Usuário comum conseguiu inserir produto'; END IF;
  IF EXISTS (SELECT 1 FROM auditoria_alteracoes) THEN
    RAISE EXCEPTION 'Usuário comum consegue ler a auditoria';
  END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  INSERT INTO produtos (codigo, nome, ordem) VALUES ('TESTE_ADM', 'Admin', 98) RETURNING id INTO v_id;
  IF (SELECT created_by FROM produtos WHERE id = v_id) IS DISTINCT FROM v_admin THEN
    RAISE EXCEPTION 'Autoria: created_by não é o usuário logado';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auditoria_alteracoes WHERE registro_id = v_id::text AND usuario_id = v_admin AND origem = 'app') THEN
    RAISE EXCEPTION 'Auditoria não registrou o usuário logado';
  END IF;
  DELETE FROM auditoria_alteracoes;
  IF NOT EXISTS (SELECT 1 FROM auditoria_alteracoes WHERE registro_id = v_id::text) THEN
    RAISE EXCEPTION 'Administrador conseguiu apagar a auditoria';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
