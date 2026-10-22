-- =====================================================================
-- Teste da migration 20261022000003_fase3_empresas
-- (docs/especificacoes/Modelagem_Fase3.md, seções 3.1, 3.3 e 3.5).
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
  -- Usuário sem nenhum grupo: has_screen_permission devolve falso para qualquer tela
  v_sem_acesso uuid := gen_random_uuid();
  v_pessoa uuid := gen_random_uuid();
  v_empresa uuid := gen_random_uuid();
  v_ramo uuid;
  v_ramo2 uuid;
  v_n int;
  v_linha record;
  v_falhou boolean;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Precondição: precisa de um usuário no grupo Administradores';
  END IF;

  -- -------------------------------------------------------------------
  -- 1. Estrutura
  -- -------------------------------------------------------------------
  SELECT count(*) INTO v_n FROM information_schema.columns
   WHERE (table_name, column_name) IN (
     ('empresas', 'grupo_empresarial'), ('empresas', 'id_aranda'),
     ('empresas_informacoes_contrato', 'ramo_secundario_id'),
     ('empresas_informacoes_contrato', 'descricao_atividade'),
     ('empresas_informacoes_contrato', 'fiscal_dba_minutos_atendimento'),
     ('empresas_informacoes_contrato', 'fiscal_dba_minutos_monitoramento'));
  IF v_n <> 6 THEN
    RAISE EXCEPTION 'Esperava as 6 colunas novas, achei %', v_n;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_proc
                  WHERE proname = 'perfis_resumo' AND pronamespace = 'public'::regnamespace
                    AND prosecdef AND 'search_path=public' = ANY (coalesce(proconfig, '{}'))) THEN
    RAISE EXCEPTION 'perfis_resumo ausente, sem SECURITY DEFINER ou sem search_path fixo';
  END IF;
  IF has_function_privilege('anon', 'public.perfis_resumo(uuid[], text[])', 'execute') THEN
    RAISE EXCEPTION 'perfis_resumo executável por anon';
  END IF;

  -- -------------------------------------------------------------------
  -- 2. Carga do contrato FISCAL: empresa com FISCAIS sem campo FISCAL vazio
  -- -------------------------------------------------------------------
  SELECT count(*) INTO v_n
    FROM empresas_informacoes_contrato c
   WHERE EXISTS (SELECT 1 FROM empresas_solucoes es JOIN solucoes s ON s.id = es.solucao_id
                  WHERE es.empresa_id = c.empresa_id AND s.codigo = 'FISCAIS')
     AND (c.fiscal_modalidade IS NULL OR c.fiscal_edocs_24x7 IS NULL OR c.fiscal_atualizacao_contratada IS NULL
          OR c.fiscal_banco_dados IS NULL OR c.fiscal_dba IS NULL);
  IF v_n > 0 THEN
    RAISE EXCEPTION '% empresa(s) com FISCAIS ainda com campo do contrato FISCAL vazio', v_n;
  END IF;

  -- -------------------------------------------------------------------
  -- 3. Regras das colunas novas
  -- -------------------------------------------------------------------
  INSERT INTO empresas_clientes (id, nome_completo, nome_abreviado, status, tem_ams, tipo_book, email_gestor, vigencia_inicial, anexo)
  VALUES (v_empresa, 'EMPRESA TESTE FASE 3 LTDA', 'TESTE F3', 'ativo', true, 'qualidade', 'gestor@sonda.com', '2025-01-01', false);
  IF NOT EXISTS (SELECT 1 FROM empresas_informacoes_contrato WHERE empresa_id = v_empresa) THEN
    RAISE EXCEPTION 'Precondição: a sincronização não criou as informações do contrato';
  END IF;

  -- Grupo empresarial em maiúsculas
  v_falhou := false;
  BEGIN UPDATE empresas SET grupo_empresarial = 'Grupo Teste' WHERE id = v_empresa;
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou grupo empresarial com minúsculas'; END IF;
  UPDATE empresas SET grupo_empresarial = 'GRUPO TESTE', id_aranda = '12345' WHERE id = v_empresa;

  -- Campos exclusivos da tabela nova: a sincronização não apaga
  UPDATE empresas_clientes SET observacao = 'teste' WHERE id = v_empresa;
  SELECT grupo_empresarial, id_aranda INTO v_linha FROM empresas WHERE id = v_empresa;
  IF v_linha.grupo_empresarial IS DISTINCT FROM 'GRUPO TESTE' OR v_linha.id_aranda IS DISTINCT FROM '12345' THEN
    RAISE EXCEPTION 'A sincronização com a tela atual apagou o grupo empresarial ou o ID do Aranda';
  END IF;

  -- Ramo secundário não repete o principal
  INSERT INTO ramos_atividade (nome, ordem) VALUES ('TESTE RAMO 1', 99) RETURNING id INTO v_ramo;
  INSERT INTO ramos_atividade (nome, ordem) VALUES ('TESTE RAMO 2', 98) RETURNING id INTO v_ramo2;
  UPDATE empresas_informacoes_contrato SET ramo_atividade_id = v_ramo, ramo_secundario_id = v_ramo2
   WHERE empresa_id = v_empresa;
  v_falhou := false;
  BEGIN UPDATE empresas_informacoes_contrato SET ramo_secundario_id = v_ramo WHERE empresa_id = v_empresa;
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou ramo secundário igual ao principal'; END IF;

  -- Ramo em uso como secundário não é apagado
  v_falhou := false;
  BEGIN DELETE FROM ramos_atividade WHERE id = v_ramo2;
  EXCEPTION WHEN foreign_key_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Apagou ramo em uso como secundário'; END IF;

  -- Descrição até 500 caracteres
  UPDATE empresas_informacoes_contrato SET descricao_atividade = repeat('x', 500) WHERE empresa_id = v_empresa;
  v_falhou := false;
  BEGIN UPDATE empresas_informacoes_contrato SET descricao_atividade = repeat('x', 501) WHERE empresa_id = v_empresa;
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou descrição da atividade com mais de 500 caracteres'; END IF;

  -- Horas de DBA por mês, em minutos, sem negativo; a que não se aplica fica guardada (RN-33)
  UPDATE empresas_informacoes_contrato
     SET fiscal_dba = 'atendimento', fiscal_dba_minutos_atendimento = 600, fiscal_dba_minutos_monitoramento = 120
   WHERE empresa_id = v_empresa;
  v_falhou := false;
  BEGIN UPDATE empresas_informacoes_contrato SET fiscal_dba_minutos_atendimento = -1 WHERE empresa_id = v_empresa;
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou minutos de DBA negativos'; END IF;
  v_falhou := false;
  BEGIN UPDATE empresas_informacoes_contrato SET fiscal_dba_minutos_monitoramento = -1 WHERE empresa_id = v_empresa;
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou minutos de monitoramento negativos'; END IF;

  IF NOT EXISTS (SELECT 1 FROM auditoria_alteracoes
                  WHERE tabela = 'empresas_informacoes_contrato' AND registro_id = v_empresa::text
                    AND 'descricao_atividade' = ANY (campos_alterados)) THEN
    RAISE EXCEPTION 'Alteração das colunas novas não foi auditada';
  END IF;

  -- -------------------------------------------------------------------
  -- 4. perfis_resumo: só id, e-mail e nome, para quem vê Empresas ou a Auditoria
  -- -------------------------------------------------------------------
  INSERT INTO auth.users (id, email) VALUES (v_pessoa, 'pessoa.teste@sonda.com');
  INSERT INTO profiles (id, email, full_name) VALUES (v_pessoa, 'pessoa.teste@sonda.com', 'Pessoa Teste')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;

  PERFORM set_config('role', 'authenticated', true);

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_sem_acesso, 'role', 'authenticated')::text, true);
  v_falhou := false;
  BEGIN PERFORM perfis_resumo(ARRAY[v_pessoa], NULL);
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Usuário sem permissão leu perfis_resumo'; END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO v_n FROM perfis_resumo(ARRAY[v_pessoa], NULL);
  IF v_n <> 1 THEN RAISE EXCEPTION 'perfis_resumo pelo id devolveu % linha(s)', v_n; END IF;
  -- Pelo e-mail, sem diferença de maiúsculas
  SELECT * INTO v_linha FROM perfis_resumo(NULL, ARRAY['Pessoa.Teste@SONDA.com']);
  IF v_linha.id IS DISTINCT FROM v_pessoa OR v_linha.full_name IS DISTINCT FROM 'Pessoa Teste' THEN
    RAISE EXCEPTION 'perfis_resumo pelo e-mail não achou a pessoa';
  END IF;
  -- Sem filtro não devolve ninguém (não serve para listar todos os usuários)
  SELECT count(*) INTO v_n FROM perfis_resumo(NULL, NULL);
  IF v_n <> 0 THEN RAISE EXCEPTION 'perfis_resumo sem filtro devolveu % linha(s)', v_n; END IF;

  PERFORM set_config('role', 'postgres', true);

  IF (SELECT count(*) FROM information_schema.routines r
        JOIN information_schema.parameters p ON p.specific_name = r.specific_name
       WHERE r.routine_name = 'perfis_resumo' AND p.parameter_mode = 'OUT') <> 3 THEN
    RAISE EXCEPTION 'perfis_resumo deveria devolver só três colunas (id, e-mail e nome)';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
