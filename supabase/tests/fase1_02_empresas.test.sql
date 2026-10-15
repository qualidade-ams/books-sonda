-- =====================================================================
-- Teste da migration 20261015000002_fase1_empresas.
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
  v_a uuid := gen_random_uuid();
  v_b uuid := gen_random_uuid();
  v_adm_emp uuid := gen_random_uuid();
  v_tabela text;
  v_n int;
  v_produto uuid;
  v_falhou boolean;
BEGIN
  -- 1. Estrutura, RLS e tela
  FOREACH v_tabela IN ARRAY ARRAY['empresas','empresas_produtos','empresas_organizacoes_aranda','empresas_informacoes_contrato'] LOOP
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
              AND tablename IN ('empresas','empresas_organizacoes_aranda','empresas_informacoes_contrato')) THEN
    RAISE EXCEPTION 'Política de DELETE em tabela que deveria ter só exclusão lógica';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM screens WHERE key = 'empresas') THEN
    RAISE EXCEPTION 'Tela empresas não registrada';
  END IF;
  SELECT count(*) INTO v_n FROM screen_permissions sp JOIN user_groups ug ON ug.id = sp.group_id
   WHERE sp.screen_key = 'empresas' AND ug.name = 'Administradores' AND sp.permission_level = 'edit';
  IF v_n <> 1 THEN RAISE EXCEPTION 'Administradores sem Edição na tela empresas'; END IF;
  SELECT count(*) INTO v_n FROM screen_permissions sp JOIN user_groups ug ON ug.id = sp.group_id
   WHERE sp.screen_key = 'empresas' AND ug.name <> 'Administradores';
  IF v_n <> 0 THEN RAISE EXCEPTION 'Outros grupos receberam permissão na tela empresas'; END IF;
  IF (SELECT column_default FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'empresas' AND column_name = 'id') IS NOT NULL THEN
    RAISE EXCEPTION 'empresas.id não pode ter default';
  END IF;

  -- 2. Regras de dados
  INSERT INTO empresas (id, nome_completo, nome_abreviado, status, tipo_book)
  VALUES (v_a, 'EMPRESA TESTE A LTDA', 'TESTE A', 'ativo', 'qualidade');
  INSERT INTO empresas (id, nome_completo, nome_abreviado, status, tipo_book)
  VALUES (v_b, 'EMPRESA TESTE B LTDA', 'TESTE B', 'ativo', 'nao_tem_book');

  IF (SELECT modelo_calculo FROM empresas WHERE id = v_a) <> 'legado' THEN
    RAISE EXCEPTION 'modelo_calculo deveria nascer "legado"';
  END IF;

  v_falhou := false;
  BEGIN UPDATE empresas SET status = 'suspenso' WHERE id = v_a;
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou status suspenso'; END IF;

  v_falhou := false;
  BEGIN UPDATE empresas SET vigencia_inicio = '2026-06-01', vigencia_fim = '2026-01-01' WHERE id = v_a;
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou vigência com fim antes do início'; END IF;

  v_falhou := false;
  BEGIN UPDATE empresas SET empresa_consolidadora_id = v_a WHERE id = v_a;
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou empresa consolidadora dela mesma'; END IF;
  v_falhou := false;
  BEGIN UPDATE empresas SET empresa_consolidadora_id = gen_random_uuid() WHERE id = v_a;
  EXCEPTION WHEN foreign_key_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou empresa consolidadora inexistente'; END IF;
  UPDATE empresas SET empresa_consolidadora_id = v_b WHERE id = v_a;

  v_falhou := false;
  BEGIN UPDATE empresas SET observacao = repeat('x', 501) WHERE id = v_a;
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou observação com mais de 500 caracteres'; END IF;
  v_falhou := false;
  BEGIN UPDATE empresas SET meta_sla_percentual = 101 WHERE id = v_a;
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou meta de SLA acima de 100'; END IF;

  INSERT INTO produtos (codigo, nome, ordem) VALUES ('TESTE_EMP', 'Produto teste', 90) RETURNING id INTO v_produto;
  INSERT INTO empresas_produtos (empresa_id, produto_id) VALUES (v_a, v_produto);
  v_falhou := false;
  BEGIN INSERT INTO empresas_produtos (empresa_id, produto_id) VALUES (v_a, v_produto);
  EXCEPTION WHEN unique_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou produto duplicado na empresa'; END IF;

  v_falhou := false;
  BEGIN DELETE FROM empresas WHERE id = v_b;
  EXCEPTION WHEN foreign_key_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Apagou empresa referenciada como consolidadora'; END IF;
  v_falhou := false;
  BEGIN DELETE FROM empresas WHERE id = v_a;
  EXCEPTION WHEN foreign_key_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Apagou empresa com produtos'; END IF;

  INSERT INTO empresas_organizacoes_aranda (empresa_id, nome_organizacao) VALUES (v_a, 'EMPRESA TESTE A LTDA');
  v_falhou := false;
  BEGIN INSERT INTO empresas_organizacoes_aranda (empresa_id, nome_organizacao) VALUES (v_b, ' empresa teste a ltda ');
  EXCEPTION WHEN unique_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou a mesma organização em duas empresas'; END IF;
  UPDATE empresas_organizacoes_aranda SET ativo = false, inativado_em = now() WHERE empresa_id = v_a;
  INSERT INTO empresas_organizacoes_aranda (empresa_id, nome_organizacao) VALUES (v_b, 'EMPRESA TESTE A LTDA');

  INSERT INTO empresas_informacoes_contrato (empresa_id) VALUES (v_a);
  v_falhou := false;
  BEGIN UPDATE empresas_informacoes_contrato SET fiscal_modalidade = 'cloud' WHERE empresa_id = v_a;
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou modalidade inválida'; END IF;
  v_falhou := false;
  BEGIN UPDATE empresas_informacoes_contrato SET fiscal_atualizacoes_por_ano = 0 WHERE empresa_id = v_a;
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou zero atualizações por ano'; END IF;
  v_falhou := false;
  BEGIN UPDATE empresas_informacoes_contrato SET fiscal_dba = 'parcial' WHERE empresa_id = v_a;
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou DBA inválido'; END IF;
  -- RN-33: atualização "Não" com a quantidade antiga guardada é aceito
  UPDATE empresas_informacoes_contrato
     SET fiscal_modalidade = 'saas', fiscal_atualizacao_contratada = false, fiscal_atualizacoes_por_ano = 2,
         fiscal_dba = 'nao_contratado', fiscal_banco_dados = 'oracle'
   WHERE empresa_id = v_a;

  IF NOT EXISTS (SELECT 1 FROM auditoria_alteracoes WHERE tabela = 'empresas' AND registro_id = v_a::text
                  AND empresa_id = v_a AND acao = 'insert') THEN
    RAISE EXCEPTION 'Auditoria de empresas não registrou o insert';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auditoria_alteracoes WHERE tabela = 'empresas_informacoes_contrato'
                  AND registro_id = v_a::text AND acao = 'update') THEN
    RAISE EXCEPTION 'Auditoria das informações do contrato sem registro_id = empresa_id';
  END IF;

  -- 3. RLS
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_comum, 'role', 'authenticated')::text, true);

  IF EXISTS (SELECT 1 FROM empresas WHERE id = v_a) THEN
    RAISE EXCEPTION 'Usuário sem permissão consegue ler empresas';
  END IF;
  v_falhou := false;
  BEGIN
    INSERT INTO empresas (id, nome_completo, nome_abreviado, status, tipo_book)
    VALUES (gen_random_uuid(), 'X', 'X', 'ativo', 'qualidade');
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Usuário sem permissão conseguiu inserir empresa'; END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  INSERT INTO empresas (id, nome_completo, nome_abreviado, status, tipo_book)
  VALUES (v_adm_emp, 'EMPRESA ADMIN LTDA', 'ADMIN', 'ativo', 'qualidade');
  INSERT INTO empresas_informacoes_contrato (empresa_id) VALUES (v_adm_emp);
  IF (SELECT created_by FROM empresas WHERE id = v_adm_emp) IS DISTINCT FROM v_admin THEN
    RAISE EXCEPTION 'Autoria: created_by da empresa não é o usuário logado';
  END IF;
  DELETE FROM empresas_informacoes_contrato WHERE empresa_id = v_adm_emp;
  DELETE FROM empresas WHERE id = v_adm_emp;
  IF NOT EXISTS (SELECT 1 FROM empresas WHERE id = v_adm_emp) THEN
    RAISE EXCEPTION 'Administrador conseguiu apagar empresa (deveria ser só inativação)';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
