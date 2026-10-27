-- =====================================================================
-- Teste da migration 20261022000002_fase3_catalogo
-- (docs/especificacoes/Modelagem_Fase3.md, seções 2, 3.2 e 10).
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou
-- (inclusive as linhas criadas no legado). Qualquer outra mensagem de erro diz
-- qual verificação falhou.
-- Roda depois da migration aplicada: confere a estrutura, o resultado da
-- reorganização nos dados reais, as regras novas e a sincronização.
-- =====================================================================
DO $teste$
DECLARE
  v_admin uuid := (SELECT uga.user_id FROM user_group_assignments uga JOIN user_groups ug ON ug.id = uga.group_id
                    WHERE ug.name = 'Administradores' LIMIT 1);
  -- Usuário sem nenhum grupo: has_screen_permission devolve falso para qualquer tela
  v_sem_acesso uuid := gen_random_uuid();
  v_empresa uuid := gen_random_uuid();
  v_comex uuid;
  v_fiscais uuid;
  v_financeiras uuid;
  v_comply uuid;
  v_ce_plus uuid;
  v_fiscais_classificar uuid;
  v_comex_classificar uuid;
  v_modulo uuid;
  v_grupo uuid;
  v_n int;
  v_texto text;
  v_falhou boolean;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Precondição: precisa de um usuário no grupo Administradores';
  END IF;

  -- -------------------------------------------------------------------
  -- 1. Estrutura
  -- -------------------------------------------------------------------
  IF to_regclass('public.solucoes') IS NULL THEN RAISE EXCEPTION 'Tabela solucoes não existe'; END IF;
  IF to_regclass('public.empresas_solucoes') IS NULL THEN RAISE EXCEPTION 'Tabela empresas_solucoes não existe'; END IF;
  IF to_regclass('public.empresas_produtos') IS NOT NULL THEN
    RAISE EXCEPTION 'empresas_produtos deveria ter sido convertida e apagada';
  END IF;

  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.solucoes'::regclass)
     OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.empresas_solucoes'::regclass) THEN
    RAISE EXCEPTION 'RLS desligada em solucoes ou empresas_solucoes';
  END IF;
  -- Catálogo: leitura, inclusão e alteração (exclusão é lógica)
  IF (SELECT array_agg(cmd::text ORDER BY cmd) FROM pg_policies WHERE tablename = 'solucoes')
     IS DISTINCT FROM ARRAY['INSERT', 'SELECT', 'UPDATE'] THEN
    RAISE EXCEPTION 'solucoes deveria ter uma política de SELECT, INSERT e UPDATE, nada mais';
  END IF;
  -- Ligação: as quatro operações, uma vez cada
  IF (SELECT array_agg(cmd::text ORDER BY cmd) FROM pg_policies WHERE tablename = 'empresas_solucoes')
     IS DISTINCT FROM ARRAY['DELETE', 'INSERT', 'SELECT', 'UPDATE'] THEN
    RAISE EXCEPTION 'empresas_solucoes deveria ter uma política por operação';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename IN ('solucoes', 'empresas_solucoes')
              AND (coalesce(qual, '') || coalesce(with_check, '')) ~ 'auth\.uid\(\)' AND
                  (coalesce(qual, '') || coalesce(with_check, '')) !~ 'SELECT auth\.uid\(\)') THEN
    RAISE EXCEPTION 'Política com auth.uid() direto, sem (SELECT auth.uid())';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name = 'produtos' AND column_name = 'solucao_id' AND is_nullable = 'YES') THEN
    RAISE EXCEPTION 'produtos.solucao_id deveria ser NOT NULL';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produtos' AND column_name = 'a_classificar')
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grupos_aranda' AND column_name = 'solucao_id') THEN
    RAISE EXCEPTION 'Faltam produtos.a_classificar ou grupos_aranda.solucao_id';
  END IF;

  -- As FKs compostas para produto_modulos acompanham a mudança de produto do módulo
  SELECT count(*) INTO v_n FROM pg_constraint
   WHERE contype = 'f' AND confrelid = 'public.produto_modulos'::regclass AND confupdtype <> 'c';
  IF v_n > 0 THEN
    RAISE EXCEPTION '% FK(s) para produto_modulos sem ON UPDATE CASCADE', v_n;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc
              WHERE pronamespace = 'public'::regnamespace
                AND proname IN ('validar_produto', 'validar_produto_modulo', 'validar_codigo_solucao',
                                'validar_escopo_a_classificar', 'sinc_empresa_produtos', 'sinc_solucoes_da_empresa')
                AND (NOT prosecdef OR NOT ('search_path=public' = ANY (coalesce(proconfig, '{}'))))) THEN
    RAISE EXCEPTION 'Função nova sem SECURITY DEFINER ou sem search_path fixo';
  END IF;

  -- -------------------------------------------------------------------
  -- 2. Reorganização nos dados
  -- -------------------------------------------------------------------
  SELECT id INTO v_comex FROM solucoes WHERE codigo = 'COMEX';
  SELECT id INTO v_fiscais FROM solucoes WHERE codigo = 'FISCAIS';
  SELECT id INTO v_financeiras FROM solucoes WHERE codigo = 'FINANCEIRAS';
  IF v_comex IS NULL OR v_fiscais IS NULL OR v_financeiras IS NULL OR (SELECT count(*) FROM solucoes) <> 3 THEN
    RAISE EXCEPTION 'Esperava as soluções COMEX, FISCAIS e FINANCEIRAS';
  END IF;

  IF EXISTS (SELECT 1 FROM produtos WHERE codigo IN ('COMEX', 'FISCAL')) THEN
    RAISE EXCEPTION 'Os produtos antigos COMEX e FISCAL deveriam ter sido apagados';
  END IF;

  SELECT string_agg(s.codigo || ':' || p.nome, ', ' ORDER BY s.ordem, p.ordem) INTO v_texto
    FROM produtos p JOIN solucoes s ON s.id = p.solucao_id;
  IF v_texto IS DISTINCT FROM
     'COMEX:CE PLUS, COMEX:CE PLUS RECOF, COMEX:CATÁLOGO DE PRODUTOS, COMEX:FCI, COMEX:A classificar, '
     'FISCAIS:COMPLY, FISCAIS:COMPLY e-DOCS, FISCAIS:GALLERY, FISCAIS:SATI, FISCAIS:A classificar, '
     'FINANCEIRAS:FC, FINANCEIRAS:SAPC, FINANCEIRAS:VENDOR' THEN
    RAISE EXCEPTION 'Produtos por solução diferentes do esperado: %', v_texto;
  END IF;
  IF (SELECT array_agg(codigo ORDER BY codigo) FROM produtos WHERE a_classificar)
     IS DISTINCT FROM ARRAY['COMEX_A_CLASSIFICAR', 'FISCAIS_A_CLASSIFICAR'] THEN
    RAISE EXCEPTION 'Só os dois produtos "A classificar" deveriam ter a_classificar';
  END IF;

  SELECT id INTO v_ce_plus FROM produtos WHERE codigo = 'CE_PLUS';
  SELECT id INTO v_comply FROM produtos WHERE codigo = 'COMPLY';
  SELECT id INTO v_comex_classificar FROM produtos WHERE codigo = 'COMEX_A_CLASSIFICAR';
  SELECT id INTO v_fiscais_classificar FROM produtos WHERE codigo = 'FISCAIS_A_CLASSIFICAR';

  SELECT string_agg(nome, ', ' ORDER BY lower(nome) COLLATE "C") INTO v_texto FROM produto_modulos WHERE produto_id = v_ce_plus;
  IF v_texto IS DISTINCT FROM 'Câmbio, Drawback, Exportação, Importação' THEN
    RAISE EXCEPTION 'Módulos do CE PLUS: %', v_texto;
  END IF;
  SELECT string_agg(nome, ', ' ORDER BY lower(nome) COLLATE "C") INTO v_texto FROM produto_modulos WHERE produto_id = v_comex_classificar;
  IF v_texto IS DISTINCT FROM 'ABAP, LEGEM, TP One' THEN
    RAISE EXCEPTION 'Módulos de COMEX "A classificar": %', v_texto;
  END IF;
  SELECT string_agg(nome, ', ' ORDER BY lower(nome) COLLATE "C") INTO v_texto FROM produto_modulos WHERE produto_id = v_comply;
  IF v_texto IS DISTINCT FROM
     'Cadastros Básicos, Conciliação, Contabilização, ECD/ECF, EFD Contribuições, EFD ICMS, Indiretos, '
     'Infraestrutura, Integração Indiretos, Obrigações Estaduais, REINF, Retidos' THEN
    RAISE EXCEPTION 'Módulos do COMPLY: %', v_texto;
  END IF;
  SELECT string_agg(nome, ', ' ORDER BY lower(nome) COLLATE "C") INTO v_texto FROM produto_modulos WHERE produto_id = v_fiscais_classificar;
  IF v_texto IS DISTINCT FROM 'Ciclo de Vida, COMPLY Analytics, Controle de Terceiros, ETL, Framework, SVA' THEN
    RAISE EXCEPTION 'Módulos de FISCAIS "A classificar": %', v_texto;
  END IF;
  -- Os que viraram produto ou grupo de serviço não são mais módulos
  IF EXISTS (SELECT 1 FROM produto_modulos
              WHERE lower(nome) IN ('recof', 'catálogo de produtos', 'fci', 'fluxo de caixa', 'sapc', 'vendor',
                                    'comply e-docs', 'dba', 'técnico', 'atualização ambientes', 'saas',
                                    'orçamentos', 'ics inativos')) THEN
    RAISE EXCEPTION 'Sobrou módulo que deveria ter virado produto ou grupo de serviço';
  END IF;
  IF EXISTS (SELECT 1 FROM produto_modulos m JOIN produtos p ON p.id = m.produto_id
              WHERE p.codigo IN ('CE_PLUS_RECOF', 'CATALOGO_PRODUTOS', 'FCI', 'COMPLY_EDOCS', 'SATI', 'FC', 'SAPC', 'VENDOR')) THEN
    RAISE EXCEPTION 'Produto que nasceu sem módulos recebeu módulo';
  END IF;

  -- De-para: nenhum grupo perdido, nenhum "sem_modulo", solução coerente
  SELECT count(DISTINCT grupo) INTO v_n FROM de_para_categoria;
  IF (SELECT count(*) FROM grupos_aranda) < v_n THEN
    RAISE EXCEPTION 'grupos_aranda perdeu grupos na reorganização';
  END IF;
  IF EXISTS (SELECT 1 FROM grupos_aranda WHERE classificacao NOT IN ('modulo', 'produto', 'solucao', 'nao_se_aplica')) THEN
    RAISE EXCEPTION 'Classificação fora dos quatro valores';
  END IF;
  IF EXISTS (SELECT 1 FROM grupos_aranda g JOIN produtos p ON p.id = g.produto_id WHERE g.solucao_id <> p.solucao_id) THEN
    RAISE EXCEPTION 'Grupo com solução diferente da do produto';
  END IF;
  IF EXISTS (SELECT 1 FROM grupos_aranda WHERE grupo_book IN ('FISCAL - DBA', 'FISCAL - Técnico', 'COMEX - Orçamentos')
                                          AND classificacao <> 'solucao') THEN
    RAISE EXCEPTION 'Grupo de serviço (DBA, Técnico, Orçamentos) não ficou ligado só à solução';
  END IF;
  IF EXISTS (SELECT 1 FROM grupos_aranda g
              WHERE g.grupo_book = 'COMEX - RECOF'
                AND (g.classificacao <> 'produto' OR g.produto_id IS DISTINCT FROM (SELECT id FROM produtos WHERE codigo = 'CE_PLUS_RECOF'))) THEN
    RAISE EXCEPTION 'Grupo do RECOF deveria apontar para o produto CE PLUS RECOF';
  END IF;

  -- Módulos do requerimento (2.5)
  SELECT string_agg(r.modulo_requerimento || '>' || p.codigo || COALESCE('/' || m.nome, ''), ', ' ORDER BY r.modulo_requerimento COLLATE "C")
    INTO v_texto
    FROM modulos_requerimento_produto r JOIN produtos p ON p.id = r.produto_id
    LEFT JOIN produto_modulos m ON m.id = r.modulo_id;
  IF v_texto IS DISTINCT FROM
     'Comex>CE_PLUS, Comply>COMPLY, Comply e-DOCS>COMPLY_EDOCS, Gallery>GALLERY, pw.SATI>SATI, pw.SATI/pw.SPED>SATI, pw.SPED>COMPLY' THEN
    RAISE EXCEPTION 'Módulos do requerimento: %', v_texto;
  END IF;

  -- Soluções contratadas = produtos da tela atual convertidos (FISCAL e GALLERY → FISCAIS)
  SELECT count(DISTINCT (empresa_id, CASE WHEN upper(produto) = 'COMEX' THEN 'COMEX' ELSE 'FISCAIS' END)) INTO v_n
    FROM empresa_produtos lp WHERE EXISTS (SELECT 1 FROM empresas e WHERE e.id = lp.empresa_id);
  IF (SELECT count(*) FROM empresas_solucoes) <> v_n THEN
    RAISE EXCEPTION 'empresas_solucoes % (esperado %)', (SELECT count(*) FROM empresas_solucoes), v_n;
  END IF;
  IF EXISTS (SELECT 1 FROM empresas_solucoes es JOIN empresas e ON e.id = es.empresa_id WHERE es.tem_ams <> e.tem_ams) THEN
    RAISE EXCEPTION 'Na carga, a solução deveria herdar o tem_ams da empresa';
  END IF;

  -- -------------------------------------------------------------------
  -- 3. Regras do catálogo
  -- -------------------------------------------------------------------
  -- Código não muda
  v_falhou := false;
  BEGIN UPDATE produtos SET codigo = 'OUTRO' WHERE id = v_comply;
  EXCEPTION WHEN raise_exception THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou trocar o código do produto'; END IF;
  v_falhou := false;
  BEGIN UPDATE solucoes SET codigo = 'OUTRA' WHERE id = v_fiscais;
  EXCEPTION WHEN raise_exception THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou trocar o código da solução'; END IF;

  -- O nome da solução muda
  UPDATE solucoes SET nome = 'FISCAIS TESTE' WHERE id = v_fiscais;

  -- "A classificar" não nasce pela tela nem é desmarcado
  v_falhou := false;
  BEGIN INSERT INTO produtos (codigo, nome, ordem, solucao_id, a_classificar) VALUES ('TESTE_PROV', 'TESTE', 99, v_comex, true);
  EXCEPTION WHEN raise_exception THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou criar produto "A classificar" fora da carga'; END IF;
  v_falhou := false;
  BEGIN UPDATE produtos SET a_classificar = false WHERE id = v_comex_classificar;
  EXCEPTION WHEN raise_exception THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou mudar a_classificar de um produto'; END IF;

  -- Módulo de produto normal não troca de produto
  SELECT id INTO v_modulo FROM produto_modulos WHERE produto_id = v_ce_plus LIMIT 1;
  v_falhou := false;
  BEGIN UPDATE produto_modulos SET produto_id = v_comex_classificar WHERE id = v_modulo;
  EXCEPTION WHEN raise_exception THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou trocar o produto de um módulo fora de "A classificar"'; END IF;

  -- Módulo "A classificar" vai para um produto da mesma solução, uma vez, e o grupo acompanha
  INSERT INTO produto_modulos (produto_id, nome, ordem) VALUES (v_fiscais_classificar, 'TESTE MÓDULO', 99)
  RETURNING id INTO v_modulo;
  INSERT INTO grupos_aranda (grupo_aranda, grupo_book, solucao_id, produto_id, modulo_id, classificacao)
  VALUES ('TESTE GRUPO ARANDA', 'FISCAL - TESTE', v_fiscais, v_fiscais_classificar, v_modulo, 'modulo')
  RETURNING id INTO v_grupo;

  v_falhou := false;
  BEGIN UPDATE produto_modulos SET produto_id = v_ce_plus WHERE id = v_modulo;
  EXCEPTION WHEN raise_exception THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou mover módulo "A classificar" para outra solução'; END IF;

  UPDATE produto_modulos SET produto_id = v_comply WHERE id = v_modulo;
  IF (SELECT produto_id FROM grupos_aranda WHERE id = v_grupo) IS DISTINCT FROM v_comply THEN
    RAISE EXCEPTION 'O grupo do Aranda não acompanhou o módulo movido';
  END IF;

  v_falhou := false;
  BEGIN UPDATE produto_modulos SET produto_id = v_fiscais_classificar WHERE id = v_modulo;
  EXCEPTION WHEN raise_exception THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou mover o módulo uma segunda vez'; END IF;

  -- Coerência da classificação
  v_falhou := false;
  BEGIN INSERT INTO grupos_aranda (grupo_aranda, grupo_book, solucao_id, produto_id, classificacao)
        VALUES ('TESTE SERVIÇO', 'X', v_fiscais, v_comply, 'solucao');
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou grupo de serviço com produto'; END IF;
  v_falhou := false;
  BEGIN INSERT INTO grupos_aranda (grupo_aranda, grupo_book, produto_id, classificacao)
        VALUES ('TESTE PRODUTO', 'X', v_comply, 'produto');
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou grupo de produto sem solução'; END IF;
  v_falhou := false;
  BEGIN INSERT INTO grupos_aranda (grupo_aranda, grupo_book, solucao_id, produto_id, classificacao)
        VALUES ('TESTE CRUZADO', 'X', v_comex, v_comply, 'produto');
  EXCEPTION WHEN foreign_key_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou produto de outra solução no grupo'; END IF;
  v_falhou := false;
  BEGIN INSERT INTO grupos_aranda (grupo_aranda, grupo_book, classificacao) VALUES ('TESTE ANTIGO', 'X', 'sem_modulo');
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Ainda aceita a classificação sem_modulo'; END IF;

  -- -------------------------------------------------------------------
  -- 4. Sincronização com a tela atual (seção 10)
  -- -------------------------------------------------------------------
  INSERT INTO empresas_clientes (id, nome_completo, nome_abreviado, status, tem_ams, tipo_book, email_gestor, vigencia_inicial, anexo)
  VALUES (v_empresa, 'EMPRESA TESTE FASE 3 LTDA', 'TESTE F3', 'ativo', true, 'qualidade', 'gestor@sonda.com', '2025-01-01', false);
  INSERT INTO empresa_produtos (empresa_id, produto) VALUES (v_empresa, 'COMEX');
  INSERT INTO empresa_produtos (empresa_id, produto) VALUES (v_empresa, 'FISCAL');
  INSERT INTO empresa_produtos (empresa_id, produto) VALUES (v_empresa, 'GALLERY');

  SELECT string_agg(s.codigo || ':' || es.tem_ams, ', ' ORDER BY s.codigo COLLATE "C") INTO v_texto
    FROM empresas_solucoes es JOIN solucoes s ON s.id = es.solucao_id WHERE es.empresa_id = v_empresa;
  IF v_texto IS DISTINCT FROM 'COMEX:true, FISCAIS:true' THEN
    RAISE EXCEPTION 'Produtos da tela atual viraram soluções erradas: %', v_texto;
  END IF;

  -- Apagar GALLERY com FISCAL ainda contratado mantém FISCAIS; apagar os dois tira
  DELETE FROM empresa_produtos WHERE empresa_id = v_empresa AND produto = 'GALLERY';
  IF NOT EXISTS (SELECT 1 FROM empresas_solucoes WHERE empresa_id = v_empresa AND solucao_id = v_fiscais) THEN
    RAISE EXCEPTION 'Apagar GALLERY tirou FISCAIS, com FISCAL ainda contratado';
  END IF;
  DELETE FROM empresa_produtos WHERE empresa_id = v_empresa AND produto = 'FISCAL';
  IF EXISTS (SELECT 1 FROM empresas_solucoes WHERE empresa_id = v_empresa AND solucao_id = v_fiscais) THEN
    RAISE EXCEPTION 'FISCAIS ficou sem nenhum produto da tela atual que leve a ela';
  END IF;

  -- Ajuste por solução na tela nova não é desfeito por outra alteração na tela atual
  INSERT INTO empresa_produtos (empresa_id, produto) VALUES (v_empresa, 'FISCAL');
  UPDATE empresas_solucoes SET tem_ams = false WHERE empresa_id = v_empresa AND solucao_id = v_fiscais;
  UPDATE empresas_clientes SET observacao = 'teste' WHERE id = v_empresa;
  IF (SELECT tem_ams FROM empresas_solucoes WHERE empresa_id = v_empresa AND solucao_id = v_fiscais) THEN
    RAISE EXCEPTION 'Alteração sem relação com AMS sobrescreveu o AMS por solução';
  END IF;

  -- Tem AMS na tela atual: Não tira de todas; Sim põe em todas
  UPDATE empresas_clientes SET tem_ams = false WHERE id = v_empresa;
  IF EXISTS (SELECT 1 FROM empresas_solucoes WHERE empresa_id = v_empresa AND tem_ams) THEN
    RAISE EXCEPTION 'Tem AMS = Não não tirou o AMS das soluções';
  END IF;
  UPDATE empresas_clientes SET tem_ams = true WHERE id = v_empresa;
  IF EXISTS (SELECT 1 FROM empresas_solucoes WHERE empresa_id = v_empresa AND NOT tem_ams) THEN
    RAISE EXCEPTION 'Tem AMS = Sim não pôs o AMS em todas as soluções';
  END IF;

  -- Em projeto exige justificativa de até 200 caracteres
  v_falhou := false;
  BEGIN UPDATE empresas_solucoes SET em_projeto = true WHERE empresa_id = v_empresa AND solucao_id = v_comex;
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou solução em projeto sem justificativa'; END IF;
  v_falhou := false;
  BEGIN UPDATE empresas_solucoes SET em_projeto = true, justificativa_projeto = repeat('x', 201)
         WHERE empresa_id = v_empresa AND solucao_id = v_comex;
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou justificativa com mais de 200 caracteres'; END IF;

  -- Em projeto na tela atual: Sim não mexe nas soluções; Não tira todas e limpa a justificativa
  UPDATE empresas_solucoes SET em_projeto = true, justificativa_projeto = 'Implantação do módulo novo'
   WHERE empresa_id = v_empresa AND solucao_id = v_comex;
  UPDATE empresas_clientes SET em_projeto = true WHERE id = v_empresa;
  IF (SELECT count(*) FROM empresas_solucoes WHERE empresa_id = v_empresa AND em_projeto) <> 1 THEN
    RAISE EXCEPTION 'Em projeto = Sim mexeu nas soluções';
  END IF;
  UPDATE empresas_clientes SET em_projeto = false WHERE id = v_empresa;
  IF EXISTS (SELECT 1 FROM empresas_solucoes WHERE empresa_id = v_empresa
              AND (em_projeto OR justificativa_projeto IS NOT NULL)) THEN
    RAISE EXCEPTION 'Em projeto = Não não tirou as soluções do projeto';
  END IF;

  IF EXISTS (SELECT 1 FROM sincronizacao_legado_falhas WHERE registro_id = v_empresa::text) THEN
    RAISE EXCEPTION 'A sincronização registrou falha: %',
      (SELECT erro FROM sincronizacao_legado_falhas WHERE registro_id = v_empresa::text LIMIT 1);
  END IF;

  -- -------------------------------------------------------------------
  -- 5. RLS
  -- -------------------------------------------------------------------
  PERFORM set_config('role', 'authenticated', true);

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_sem_acesso, 'role', 'authenticated')::text, true);
  v_falhou := false;
  BEGIN INSERT INTO solucoes (codigo, nome, ordem) VALUES ('TESTE', 'TESTE', 9);
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Usuário sem permissão criou solução'; END IF;
  IF EXISTS (SELECT 1 FROM empresas_solucoes) THEN
    RAISE EXCEPTION 'Usuário sem permissão em Empresas leu empresas_solucoes';
  END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  UPDATE solucoes SET nome = 'FISCAIS ADMIN' WHERE id = v_fiscais;
  IF (SELECT nome FROM solucoes WHERE id = v_fiscais) <> 'FISCAIS ADMIN' THEN
    RAISE EXCEPTION 'Administrador não conseguiu renomear a solução';
  END IF;
  UPDATE empresas_solucoes SET tem_ams = false WHERE empresa_id = v_empresa AND solucao_id = v_comex;
  IF (SELECT tem_ams FROM empresas_solucoes WHERE empresa_id = v_empresa AND solucao_id = v_comex) THEN
    RAISE EXCEPTION 'Administrador não conseguiu ajustar o AMS da solução';
  END IF;

  PERFORM set_config('role', 'postgres', true);

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
