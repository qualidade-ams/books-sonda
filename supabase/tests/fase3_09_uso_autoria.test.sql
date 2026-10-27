-- =====================================================================
-- Teste da migration 20261022000010_fase3_uso_autoria
-- (docs/especificacoes/Modelagem_Fase3.md, seções 3.5 e 6).
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou
-- (inclusive as linhas criadas no legado). Qualquer outra mensagem de erro diz
-- qual verificação falhou.
-- =====================================================================
DO $teste$
DECLARE
  -- Usuário sem nenhum grupo: has_screen_permission devolve falso para qualquer tela
  v_sem_acesso uuid := gen_random_uuid();
  v_catalogo uuid := gen_random_uuid();
  v_pessoa uuid := gen_random_uuid();
  v_grupo_usuarios uuid;
  v_empresa_a uuid := gen_random_uuid();
  v_empresa_b uuid := gen_random_uuid();
  v_org_a text := 'EMPRESA TESTE USO A LTDA';
  v_org_b text := 'EMPRESA TESTE USO B LTDA';
  v_grupo uuid;
  v_inativo uuid;
  v_r record;
  v_n int;
  v_falhou boolean;
BEGIN
  -- -------------------------------------------------------------------
  -- 1. Segurança das funções
  -- -------------------------------------------------------------------
  SELECT count(*) INTO v_n FROM pg_proc
   WHERE proname IN ('grupos_aranda_uso', 'perfis_resumo') AND pronamespace = 'public'::regnamespace
     AND prosecdef AND proconfig @> ARRAY['search_path=public'];
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'grupos_aranda_uso e perfis_resumo precisam de SECURITY DEFINER e search_path fixo';
  END IF;
  IF has_function_privilege('anon', 'public.grupos_aranda_uso(integer)', 'execute') THEN
    RAISE EXCEPTION 'grupos_aranda_uso executável por anon';
  END IF;

  -- -------------------------------------------------------------------
  -- 2. Uso dos grupos: consumo no período e empresas com bancos múltiplos
  -- -------------------------------------------------------------------
  -- Empresa A com dois bancos ativos; empresa B com um só
  INSERT INTO empresas_clientes (id, nome_completo, nome_abreviado, status, tem_ams, tipo_book, email_gestor, vigencia_inicial, anexo)
  VALUES (v_empresa_a, v_org_a, 'TESTE USO A', 'ativo', true, 'qualidade', 'gestor@sonda.com', '2025-01-01', false),
         (v_empresa_b, v_org_b, 'TESTE USO B', 'ativo', true, 'qualidade', 'gestor@sonda.com', '2025-01-01', false);
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem, filtro_ic_operador, filtro_ic_valor)
  VALUES (v_empresa_a, 'TESTE PADRÃO', true, 1, 'horas', 3, '2026-07-01', 'OUTROS', 'manual', NULL, NULL),
         (v_empresa_a, 'TESTE NÍQUEL', false, 2, 'horas', 3, '2026-07-01', 'OUTROS', 'manual', 'contem', 'NIQUEL'),
         (v_empresa_b, 'TESTE PADRÃO', true, 1, 'horas', 3, '2026-07-01', 'OUTROS', 'manual', NULL, NULL);

  INSERT INTO grupos_aranda (grupo_aranda, grupo_book, classificacao)
  VALUES ('AMS APL - TESTE USO - N2', 'COMEX - Teste', 'nao_se_aplica') RETURNING id INTO v_grupo;
  INSERT INTO grupos_aranda (grupo_aranda, grupo_book, classificacao, ativo)
  VALUES ('AMS APL - TESTE USO INATIVO - N2', 'COMEX - Teste', 'nao_se_aplica', false) RETURNING id INTO v_inativo;

  INSERT INTO apontamentos_aranda (id_externo, org_us_final, data_atividade, tipo_chamado, ativi_interna, caso_grupo,
                                   tempo_gasto_minutos, item_configuracao, cod_resolucao) VALUES
    -- Grupo comparado sem diferença de maiúsculas e espaços
    ('TESTE-USO-1', v_org_a, now() - interval '20 days', 'IM', 'Não', ' ams apl - teste uso - n2 ', 30, 'ITEM 1', 'X'),
    ('TESTE-USO-2', v_org_b, now() - interval '40 days', 'IM', 'Não', 'AMS APL - TESTE USO - N2', 30, 'ITEM 1', 'X'),
    -- Fora dos 6 meses
    ('TESTE-USO-3', v_org_a, now() - interval '8 months', 'IM', 'Não', 'AMS APL - TESTE USO - N2', 30, 'ITEM 1', 'X'),
    ('TESTE-USO-4', v_org_a, now() - interval '10 days', 'IM', 'Não', 'AMS APL - TESTE USO INATIVO - N2', 30, 'ITEM 1', 'X');
  INSERT INTO apontamentos_tickets_aranda (nro_solicitacao, organizacao, nome_grupo, item_configuracao, data_fechamento, status, cod_resolucao)
  VALUES ('TESTE-USO-T', v_org_a, 'AMS APL - TESTE USO - N2', 'ITEM 1', now() - interval '5 days', 'Closed', 'X');

  SELECT * INTO v_r FROM grupos_aranda_uso() WHERE grupo_aranda_id = v_grupo;
  IF NOT FOUND OR v_r.apontamentos <> 2 OR v_r.tickets <> 1 THEN
    RAISE EXCEPTION 'Uso em 6 meses: esperado 2 apontamentos e 1 ticket, veio % e %', v_r.apontamentos, v_r.tickets;
  END IF;
  IF v_r.empresas_multiplos IS DISTINCT FROM ARRAY['TESTE USO A'] THEN
    RAISE EXCEPTION 'Empresas com bancos múltiplos erradas: %', v_r.empresas_multiplos;
  END IF;

  SELECT * INTO v_r FROM grupos_aranda_uso(12) WHERE grupo_aranda_id = v_grupo;
  IF v_r.apontamentos <> 3 THEN
    RAISE EXCEPTION 'Uso em 12 meses: esperado 3 apontamentos, veio %', v_r.apontamentos;
  END IF;

  IF EXISTS (SELECT 1 FROM grupos_aranda_uso() WHERE grupo_aranda_id = v_inativo) THEN
    RAISE EXCEPTION 'Listou o uso de grupo inativo';
  END IF;

  -- Empresa B sem banco múltiplo: lista vazia, não nula
  UPDATE bancos_horas SET ativo = false WHERE empresa_id = v_empresa_a AND NOT padrao;
  SELECT * INTO v_r FROM grupos_aranda_uso() WHERE grupo_aranda_id = v_grupo;
  IF v_r.empresas_multiplos IS DISTINCT FROM '{}'::text[] THEN
    RAISE EXCEPTION 'Banco inativo contou como banco múltiplo: %', v_r.empresas_multiplos;
  END IF;

  -- -------------------------------------------------------------------
  -- 3. Permissões: uso para quem vê o De-para; nomes para as telas da Fase 3
  -- -------------------------------------------------------------------
  INSERT INTO auth.users (id, email) VALUES (v_catalogo, 'catalogo.teste@sonda.com'), (v_pessoa, 'pessoa.uso@sonda.com');
  INSERT INTO profiles (id, email, full_name) VALUES (v_pessoa, 'pessoa.uso@sonda.com', 'Pessoa Uso')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;
  INSERT INTO user_groups (name) VALUES ('TESTE SÓ PRODUTOS') RETURNING id INTO v_grupo_usuarios;
  INSERT INTO user_group_assignments (user_id, group_id) VALUES (v_catalogo, v_grupo_usuarios);
  INSERT INTO screen_permissions (group_id, screen_key, permission_level) VALUES (v_grupo_usuarios, 'produtos_modulos', 'view');

  PERFORM set_config('role', 'authenticated', true);

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_sem_acesso, 'role', 'authenticated')::text, true);
  v_falhou := false;
  BEGIN PERFORM grupos_aranda_uso();
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Usuário sem permissão leu o uso dos grupos'; END IF;
  v_falhou := false;
  BEGIN PERFORM perfis_resumo(ARRAY[v_pessoa], NULL);
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Usuário sem permissão leu perfis_resumo'; END IF;

  -- Quem só vê Produtos e Módulos lê o nome de quem alterou, mas não o uso do De-para
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_catalogo, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO v_n FROM perfis_resumo(ARRAY[v_pessoa], NULL);
  IF v_n <> 1 THEN RAISE EXCEPTION 'Quem vê Produtos e Módulos não leu o nome (% linhas)', v_n; END IF;
  SELECT count(*) INTO v_n FROM perfis_resumo(NULL, NULL);
  IF v_n <> 0 THEN RAISE EXCEPTION 'perfis_resumo sem filtro devolveu % linha(s)', v_n; END IF;
  v_falhou := false;
  BEGIN PERFORM grupos_aranda_uso();
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Quem só vê Produtos e Módulos leu o uso do De-para'; END IF;

  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
