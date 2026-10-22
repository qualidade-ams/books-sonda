-- =====================================================================
-- Teste da migration 20261022000006_fase3_de_para
-- (docs/especificacoes/Modelagem_Fase3.md, seções 6 e 10).
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou
-- (inclusive as linhas criadas no legado, nos apontamentos e no sino). Qualquer
-- outra mensagem de erro diz qual verificação falhou.
-- =====================================================================
DO $teste$
DECLARE
  v_admin uuid := (SELECT uga.user_id FROM user_group_assignments uga JOIN user_groups ug ON ug.id = uga.group_id
                    WHERE ug.name = 'Administradores' LIMIT 1);
  v_sem_acesso uuid := gen_random_uuid();
  v_empresa uuid := gen_random_uuid();
  v_org text := 'EMPRESA TESTE DE-PARA LTDA';
  v_grupo uuid;
  v_duplicado uuid := gen_random_uuid();
  v_r record;
  v_n int;
  v_falhou boolean;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Precondição: precisa de um usuário no grupo Administradores';
  END IF;

  -- -------------------------------------------------------------------
  -- 1. Estrutura
  -- -------------------------------------------------------------------
  IF EXISTS (SELECT 1 FROM pg_proc
              WHERE pronamespace = 'public'::regnamespace
                AND proname IN ('grupos_aranda_nao_mapeados', 'notificar_grupos_nao_mapeados',
                                'sinc_de_para_categoria', 'validar_grupo_aranda', 'resolver_grupos_nao_mapeados')
                AND (NOT prosecdef OR NOT ('search_path=public' = ANY (coalesce(proconfig, '{}'))))) THEN
    RAISE EXCEPTION 'Função nova sem SECURITY DEFINER ou sem search_path fixo';
  END IF;
  IF (SELECT count(*) FROM pg_proc WHERE pronamespace = 'public'::regnamespace
        AND proname IN ('grupos_aranda_nao_mapeados', 'notificar_grupos_nao_mapeados',
                        'sinc_de_para_categoria', 'validar_grupo_aranda', 'resolver_grupos_nao_mapeados')) <> 5 THEN
    RAISE EXCEPTION 'Faltam funções da migration';
  END IF;
  IF has_function_privilege('anon', 'public.grupos_aranda_nao_mapeados(integer)', 'execute')
     OR has_function_privilege('authenticated', 'public.notificar_grupos_nao_mapeados()', 'execute') THEN
    RAISE EXCEPTION 'Função executável por quem não deveria';
  END IF;
  -- A rotina diária só é agendada na ativação das telas
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'de-para-nao-mapeados') THEN
    RAISE EXCEPTION 'Rotina diária agendada antes da ativação das telas';
  END IF;

  -- -------------------------------------------------------------------
  -- 2. O grupo do Aranda não muda depois de criado
  -- -------------------------------------------------------------------
  INSERT INTO grupos_aranda (grupo_aranda, grupo_book, classificacao)
  VALUES ('AMS APL - TESTE DE-PARA - N2', 'COMEX - Teste', 'nao_se_aplica')
  RETURNING id INTO v_grupo;

  v_falhou := false;
  BEGIN UPDATE grupos_aranda SET grupo_aranda = 'OUTRO NOME' WHERE id = v_grupo;
  EXCEPTION WHEN raise_exception THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou mudar o grupo do Aranda'; END IF;

  -- -------------------------------------------------------------------
  -- 3. Cópia para de_para_categoria (mesmo id; status acompanha o ativo)
  -- -------------------------------------------------------------------
  SELECT * INTO v_r FROM de_para_categoria WHERE id = v_grupo;
  IF NOT FOUND OR v_r.grupo <> 'AMS APL - TESTE DE-PARA - N2' OR v_r.grupo_book <> 'COMEX - Teste' OR v_r.status <> 'ativa' THEN
    RAISE EXCEPTION 'Grupo novo não foi copiado para de_para_categoria com o mesmo id';
  END IF;

  -- Linha repetida do mesmo grupo (como as que já existem na tabela atual) acompanha
  INSERT INTO de_para_categoria (id, grupo, grupo_book, status)
  VALUES (v_duplicado, ' ams apl - teste de-para - n2 ', 'COMEX - Teste', 'ativa');

  UPDATE grupos_aranda SET grupo_book = 'COMEX - Teste Novo' WHERE id = v_grupo;
  SELECT count(*) INTO v_n FROM de_para_categoria
   WHERE id IN (v_grupo, v_duplicado) AND grupo_book = 'COMEX - Teste Novo';
  IF v_n <> 2 THEN RAISE EXCEPTION 'Mudança do grupo do Book não chegou às % linhas do grupo', 2 - v_n; END IF;

  UPDATE grupos_aranda SET ativo = false WHERE id = v_grupo;
  IF EXISTS (SELECT 1 FROM de_para_categoria WHERE id IN (v_grupo, v_duplicado) AND status <> 'inativa') THEN
    RAISE EXCEPTION 'Inativar o grupo não inativou de_para_categoria';
  END IF;
  UPDATE grupos_aranda SET ativo = true WHERE id = v_grupo;
  IF EXISTS (SELECT 1 FROM de_para_categoria WHERE id IN (v_grupo, v_duplicado) AND status <> 'ativa') THEN
    RAISE EXCEPTION 'Reativar o grupo não reativou de_para_categoria';
  END IF;

  -- -------------------------------------------------------------------
  -- 4. Não mapeados: grupos que contam, sem linha ativa no de-para
  -- -------------------------------------------------------------------
  INSERT INTO empresas_clientes (id, nome_completo, nome_abreviado, status, tem_ams, tipo_book, email_gestor, vigencia_inicial, anexo)
  VALUES (v_empresa, v_org, 'TESTE DE-PARA', 'ativo', true, 'qualidade', 'gestor@sonda.com', '2025-01-01', false);
  INSERT INTO apontamentos_aranda (id_externo, org_us_final, data_atividade, tipo_chamado, ativi_interna, caso_grupo,
                                   tempo_gasto_minutos, item_configuracao, cod_resolucao) VALUES
    ('TESTE-NM-1', v_org, now() - interval '20 days', 'IM', 'Não', 'AMS APL - TESTE SEM MAPA - N3', 30, 'ITEM 1', 'X'),
    ('TESTE-NM-2', 'ORGANIZAÇÃO SEM EMPRESA', now() - interval '10 days', 'IM', 'Não', 'AMS APL - TESTE SEM MAPA - N3', 30, 'ITEM 1', 'X'),
    ('TESTE-NM-3', v_org, now() - interval '10 days', 'IM', 'Não', 'GRUPO QUE NÃO CONTA', 30, 'ITEM 1', 'X');
  INSERT INTO apontamentos_tickets_aranda (nro_solicitacao, organizacao, nome_grupo, item_configuracao, data_fechamento, status, cod_resolucao)
  VALUES ('TESTE-NM-T', v_org, 'AMS APL - TESTE SEM MAPA - N3', 'ITEM 1', now() - interval '5 days', 'Closed', 'X');

  SELECT * INTO v_r FROM grupos_aranda_nao_mapeados() WHERE grupo_aranda = 'AMS APL - TESTE SEM MAPA - N3';
  IF NOT FOUND OR v_r.apontamentos <> 2 OR v_r.tickets <> 1
     OR v_r.empresas IS DISTINCT FROM ARRAY['ORGANIZAÇÃO SEM EMPRESA', 'TESTE DE-PARA']
     OR v_r.primeira_ocorrencia <> ((now() - interval '20 days') AT TIME ZONE 'America/Sao_Paulo')::date THEN
    RAISE EXCEPTION 'Não mapeado com contagem, empresas ou primeira ocorrência erradas';
  END IF;
  IF EXISTS (SELECT 1 FROM grupos_aranda_nao_mapeados() WHERE grupo_aranda = 'GRUPO QUE NÃO CONTA') THEN
    RAISE EXCEPTION 'Listou grupo fora dos grupos que contam';
  END IF;

  -- Aviso no sino para quem edita o De-para
  PERFORM notificar_grupos_nao_mapeados();
  IF NOT EXISTS (SELECT 1 FROM notificacoes WHERE chave = 'de_para_nao_mapeados' AND resolvida_em IS NULL
                    AND tipo = 'grupo_aranda_nao_mapeado' AND screen_key = 'de_para_grupos') THEN
    RAISE EXCEPTION 'Aviso de grupo não mapeado não foi aberto no sino';
  END IF;

  -- Mapear (com linha ativa) tira da lista; com todos mapeados, o aviso se resolve sozinho
  -- (o que já tem linha inativa é reativado; o resto ganha linha nova)
  UPDATE grupos_aranda g SET ativo = true
   WHERE NOT g.ativo
     AND lower(trim(g.grupo_aranda)) IN (SELECT lower(trim(n.grupo_aranda)) FROM grupos_aranda_nao_mapeados() n);
  INSERT INTO grupos_aranda (grupo_aranda, grupo_book, classificacao)
  SELECT DISTINCT ON (lower(trim(n.grupo_aranda))) n.grupo_aranda, 'Teste', 'nao_se_aplica'
    FROM grupos_aranda_nao_mapeados() n
   WHERE NOT EXISTS (SELECT 1 FROM grupos_aranda g WHERE lower(trim(g.grupo_aranda)) = lower(trim(n.grupo_aranda)));
  IF EXISTS (SELECT 1 FROM grupos_aranda_nao_mapeados()) THEN
    RAISE EXCEPTION 'Grupo mapeado continuou na lista de não mapeados';
  END IF;
  IF EXISTS (SELECT 1 FROM notificacoes WHERE chave = 'de_para_nao_mapeados' AND resolvida_em IS NULL) THEN
    RAISE EXCEPTION 'Aviso do sino não se resolveu com todos os grupos mapeados';
  END IF;

  -- Inativar o mapeamento devolve o grupo à lista
  UPDATE grupos_aranda SET ativo = false WHERE grupo_aranda = 'AMS APL - TESTE SEM MAPA - N3';
  IF NOT EXISTS (SELECT 1 FROM grupos_aranda_nao_mapeados() WHERE grupo_aranda = 'AMS APL - TESTE SEM MAPA - N3') THEN
    RAISE EXCEPTION 'Grupo com mapeamento inativo não voltou para os não mapeados';
  END IF;

  -- -------------------------------------------------------------------
  -- 5. Permissão
  -- -------------------------------------------------------------------
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_sem_acesso, 'role', 'authenticated')::text, true);
  v_falhou := false;
  BEGIN PERFORM grupos_aranda_nao_mapeados();
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Usuário sem permissão listou os não mapeados'; END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  PERFORM grupos_aranda_nao_mapeados();
  PERFORM set_config('role', 'postgres', true);

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
