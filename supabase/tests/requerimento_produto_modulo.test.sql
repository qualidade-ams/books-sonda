-- =====================================================================
-- Teste da migration 20261105000001_requerimento_produto_modulo
--
-- Empresa liberada: o requerimento de Banco de Horas escolhe o produto (e,
-- quando o banco do produto é por módulo, o módulo) entre os que os bancos do
-- cliente cobrem. O banco sai dessa escolha, nunca é o Banco padrão e fica
-- gravado em requerimentos_bancos com o produto e o módulo.
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou.
-- Qualquer outra mensagem de erro diz qual verificação falhou.
-- =====================================================================
DO $teste$
DECLARE
  -- Lança requerimentos (Edição) sem nenhum acesso ao Controle
  v_lancador uuid := (
    SELECT uga.user_id FROM user_group_assignments uga
     WHERE EXISTS (SELECT 1 FROM screen_permissions sp WHERE sp.group_id = uga.group_id
                      AND sp.screen_key = 'lancar_requerimentos' AND sp.permission_level = 'edit')
       AND NOT EXISTS (SELECT 1 FROM user_group_assignments u2 JOIN screen_permissions sp ON sp.group_id = u2.group_id
                        WHERE u2.user_id = uga.user_id AND sp.screen_key = 'bancos_horas_controle'
                          AND sp.permission_level IN ('view', 'edit'))
     ORDER BY uga.user_id LIMIT 1);
  -- Só consulta Lançar Requerimentos
  v_consulta uuid := (
    SELECT uga.user_id FROM user_group_assignments uga
     WHERE EXISTS (SELECT 1 FROM screen_permissions sp WHERE sp.group_id = uga.group_id
                      AND sp.screen_key = 'lancar_requerimentos' AND sp.permission_level = 'view')
       AND NOT EXISTS (SELECT 1 FROM user_group_assignments u2 JOIN screen_permissions sp ON sp.group_id = u2.group_id
                        WHERE u2.user_id = uga.user_id AND sp.screen_key = 'lancar_requerimentos'
                          AND sp.permission_level = 'edit')
     ORDER BY uga.user_id LIMIT 1);
  v_sem_acesso uuid := gen_random_uuid();
  v_liberada uuid := gen_random_uuid();
  v_legado uuid := gen_random_uuid();
  -- Catálogo
  v_solucao uuid;
  v_gallery uuid; v_ceplus uuid; v_comply uuid; v_tpone uuid; v_vendor uuid;
  v_cambio uuid; v_drawback uuid; v_export uuid; v_import uuid; v_obrig uuid; v_edocs uuid;
  -- Bancos da empresa liberada
  v_padrao uuid; v_b_gallery uuid; v_b_comex uuid; v_b_fiscal uuid; v_b_encerrado uuid;
  v_b_inativo uuid; v_b_comex_geral uuid; v_b_legado uuid;
  -- Requerimentos
  v_req uuid; v_req_sem_mes uuid; v_req_faturado uuid; v_req_enviado uuid; v_req_legado uuid;
  v_dest jsonb;
  v_opcoes jsonb;
  v_banco uuid;
  v_r record;
  v_falhou boolean;
  v_msg text;
BEGIN
  IF v_lancador IS NULL THEN
    RAISE EXCEPTION 'Precondição: precisa de um usuário com Edição em Lançar Requerimentos e sem acesso ao Controle';
  END IF;
  IF v_consulta IS NULL THEN
    RAISE EXCEPTION 'Precondição: precisa de um usuário com só Visualização em Lançar Requerimentos';
  END IF;

  -- -------------------------------------------------------------------
  -- 1. Estrutura e segurança
  -- -------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
                    AND table_name = 'requerimentos_bancos' AND column_name = 'produto_id')
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
                    AND table_name = 'requerimentos_bancos' AND column_name = 'modulo_id') THEN
    RAISE EXCEPTION 'requerimentos_bancos sem as colunas produto_id e modulo_id';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'requerimento_destinos'
                    AND pronamespace = 'public'::regnamespace
                    AND prosecdef AND proconfig @> ARRAY['search_path=public']) THEN
    RAISE EXCEPTION 'requerimento_destinos ausente, sem SECURITY DEFINER ou sem search_path fixo';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'requerimento_definir_destino'
                    AND pronamespace = 'public'::regnamespace
                    AND prosecdef AND proconfig @> ARRAY['search_path=public']) THEN
    RAISE EXCEPTION 'requerimento_definir_destino ausente, sem SECURITY DEFINER ou sem search_path fixo';
  END IF;
  IF has_function_privilege('anon', 'public.requerimento_destinos(uuid, uuid)', 'execute')
     OR has_function_privilege('anon', 'public.requerimento_definir_destino(uuid, uuid, uuid)', 'execute') THEN
    RAISE EXCEPTION 'Funções do destino do requerimento executáveis por anon';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.requerimento_destinos(uuid, uuid)', 'execute')
     OR NOT has_function_privilege('authenticated', 'public.requerimento_definir_destino(uuid, uuid, uuid)', 'execute') THEN
    RAISE EXCEPTION 'Funções do destino do requerimento não executáveis por authenticated';
  END IF;
  IF has_function_privilege('authenticated', 'public.requerimento_banco_do_destino(uuid, uuid, uuid, date)', 'execute') THEN
    RAISE EXCEPTION 'A função interna requerimento_banco_do_destino não pode ser chamada direto';
  END IF;

  -- -------------------------------------------------------------------
  -- Cenário: catálogo, uma empresa liberada e uma no legado
  -- -------------------------------------------------------------------
  INSERT INTO solucoes (codigo, nome, ordem) VALUES ('T-SOLUCAO-REQ', 'TESTE SOLUÇÃO REQUERIMENTO', 99)
  RETURNING id INTO v_solucao;
  INSERT INTO produtos (codigo, nome, ordem, solucao_id) VALUES ('T-GALLERY', 'TESTE GALLERY', 1, v_solucao) RETURNING id INTO v_gallery;
  INSERT INTO produtos (codigo, nome, ordem, solucao_id) VALUES ('T-CEPLUS', 'TESTE CE PLUS', 2, v_solucao) RETURNING id INTO v_ceplus;
  INSERT INTO produtos (codigo, nome, ordem, solucao_id) VALUES ('T-COMPLY', 'TESTE COMPLY', 3, v_solucao) RETURNING id INTO v_comply;
  INSERT INTO produtos (codigo, nome, ordem, solucao_id) VALUES ('T-TPONE', 'TESTE TP ONE', 4, v_solucao) RETURNING id INTO v_tpone;
  INSERT INTO produtos (codigo, nome, ordem, solucao_id) VALUES ('T-VENDOR', 'TESTE VENDOR', 5, v_solucao) RETURNING id INTO v_vendor;
  INSERT INTO produto_modulos (produto_id, nome, ordem) VALUES (v_ceplus, 'Câmbio', 1) RETURNING id INTO v_cambio;
  INSERT INTO produto_modulos (produto_id, nome, ordem) VALUES (v_ceplus, 'Drawback', 2) RETURNING id INTO v_drawback;
  INSERT INTO produto_modulos (produto_id, nome, ordem) VALUES (v_ceplus, 'Exportação', 3) RETURNING id INTO v_export;
  INSERT INTO produto_modulos (produto_id, nome, ordem) VALUES (v_ceplus, 'Importação', 4) RETURNING id INTO v_import;
  INSERT INTO produto_modulos (produto_id, nome, ordem) VALUES (v_comply, 'Obrigações', 1) RETURNING id INTO v_obrig;
  INSERT INTO produto_modulos (produto_id, nome, ordem) VALUES (v_comply, 'e-DOCS', 2) RETURNING id INTO v_edocs;
  -- Módulo inativo não conta
  INSERT INTO produto_modulos (produto_id, nome, ordem, ativo) VALUES (v_comply, 'Antigo', 3, false);

  INSERT INTO empresas_clientes (id, nome_completo, nome_abreviado, status, tem_ams, tipo_book, email_gestor, vigencia_inicial, anexo)
  VALUES (v_liberada, 'EMPRESA TESTE LIBERADA LTDA', 'TESTE LIBERADA', 'ativo', true, 'qualidade', 'gestor@sonda.com', '2025-01-01', false),
         (v_legado, 'EMPRESA TESTE LEGADO LTDA', 'TESTE LEGADO', 'ativo', true, 'qualidade', 'gestor@sonda.com', '2025-01-01', false);

  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem)
  VALUES (v_liberada, 'TESTE PADRÃO', true, 1, 'horas', 3, '2026-07-01', 'OUTROS', 'manual') RETURNING id INTO v_padrao;
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem)
  VALUES (v_liberada, 'TESTE B GALLERY', false, 2, 'horas', 6, '2026-07-01', 'OUTROS', 'manual') RETURNING id INTO v_b_gallery;
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem)
  VALUES (v_liberada, 'TESTE B COMEX', false, 3, 'horas', 3, '2026-07-01', 'OUTROS', 'manual') RETURNING id INTO v_b_comex;
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem)
  VALUES (v_liberada, 'TESTE B FISCAL', false, 4, 'horas', 3, '2026-07-01', 'OUTROS', 'manual') RETURNING id INTO v_b_fiscal;
  -- Vigente só até Set/2026
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, fim_vigencia, taxa_produto, origem)
  VALUES (v_liberada, 'TESTE B ENCERRADO', false, 5, 'horas', 3, '2026-07-01', '2026-09-01', 'OUTROS', 'manual') RETURNING id INTO v_b_encerrado;
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem, ativo)
  VALUES (v_liberada, 'TESTE B INATIVO', false, 6, 'horas', 3, '2026-07-01', 'OUTROS', 'manual', false) RETURNING id INTO v_b_inativo;
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem)
  VALUES (v_legado, 'TESTE LEGADO', true, 1, 'horas', 3, '2026-07-01', 'OUTROS', 'manual') RETURNING id INTO v_b_legado;

  -- Escopo como o da tela: GALLERY inteiro; CE PLUS só Exportação e Importação;
  -- COMPLY inteiro; TP ONE no banco encerrado; VENDOR no inativo. O padrão
  -- cobre o resto pela regra do motor, mas nunca aparece para o requerimento.
  INSERT INTO bancos_horas_escopo (banco_id, produto_id, modulo_id) VALUES
    (v_b_gallery, v_gallery, NULL),
    (v_b_comex, v_ceplus, v_export),
    (v_b_comex, v_ceplus, v_import),
    (v_b_fiscal, v_comply, NULL),
    (v_b_encerrado, v_tpone, NULL),
    (v_b_inativo, v_vendor, NULL);

  UPDATE empresas SET modelo_calculo = 'multiplo' WHERE id = v_liberada;

  INSERT INTO requerimentos (chamado, cliente_id, modulo, descricao, data_envio, horas_funcional, horas_tecnico,
                             tipo_cobranca, status, enviado_faturamento, mes_cobranca)
  VALUES ('RF-TESTE-PROD-1', v_liberada, 'Comex', 'Lançado em Out/2026', '2026-10-01', 2, 0,
          'Banco de Horas', 'lancado', false, '10/2026') RETURNING id INTO v_req;
  INSERT INTO requerimentos (chamado, cliente_id, modulo, descricao, data_envio, horas_funcional, horas_tecnico,
                             tipo_cobranca, status, enviado_faturamento, mes_cobranca)
  VALUES ('RF-TESTE-PROD-2', v_liberada, 'Comex', 'Sem mês de cobrança', '2026-10-01', 2, 0,
          'Banco de Horas', 'lancado', false, NULL) RETURNING id INTO v_req_sem_mes;
  INSERT INTO requerimentos (chamado, cliente_id, modulo, descricao, data_envio, horas_funcional, horas_tecnico,
                             tipo_cobranca, status, enviado_faturamento, mes_cobranca)
  VALUES ('RF-TESTE-PROD-3', v_liberada, 'Comex', 'Faturado à parte', '2026-10-01', 2, 0,
          'Faturado', 'lancado', false, '10/2026') RETURNING id INTO v_req_faturado;
  INSERT INTO requerimentos (chamado, cliente_id, modulo, descricao, data_envio, horas_funcional, horas_tecnico,
                             tipo_cobranca, status, enviado_faturamento, mes_cobranca)
  VALUES ('RF-TESTE-PROD-4', v_liberada, 'Comex', 'Já enviado', '2026-10-01', 2, 0,
          'Banco de Horas', 'enviado_faturamento', true, '10/2026') RETURNING id INTO v_req_enviado;
  INSERT INTO requerimentos (chamado, cliente_id, modulo, descricao, data_envio, horas_funcional, horas_tecnico,
                             tipo_cobranca, status, enviado_faturamento, mes_cobranca)
  VALUES ('RF-TESTE-PROD-5', v_legado, 'Comex', 'Empresa no legado', '2026-10-01', 2, 0,
          'Banco de Horas', 'lancado', false, '10/2026') RETURNING id INTO v_req_legado;

  -- A partir daqui, como quem lança requerimentos (sem acesso ao Controle)
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_lancador, 'role', 'authenticated')::text, true);

  -- -------------------------------------------------------------------
  -- 2. Destinos: produto/módulo/banco dos bancos ativos e não padrão
  -- -------------------------------------------------------------------
  v_dest := requerimento_destinos(v_liberada, NULL);
  IF NOT (v_dest->>'liberada')::boolean THEN
    RAISE EXCEPTION 'Empresa liberada veio como legado';
  END IF;
  IF v_dest->'escolhido' <> 'null'::jsonb THEN
    RAISE EXCEPTION 'Sem requerimento, não há destino escolhido; veio %', v_dest->'escolhido';
  END IF;
  v_opcoes := v_dest->'opcoes';
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_opcoes) o
              WHERE (o->>'bancoId')::uuid IN (v_padrao, v_b_inativo)) THEN
    RAISE EXCEPTION 'O Banco padrão ou o banco inativo apareceram nos destinos';
  END IF;
  -- GALLERY sem módulos: uma linha, módulo nulo
  SELECT o INTO v_r FROM jsonb_array_elements(v_opcoes) o WHERE (o->>'produtoId')::uuid = v_gallery;
  IF (SELECT count(*) FROM jsonb_array_elements(v_opcoes) o WHERE (o->>'produtoId')::uuid = v_gallery) <> 1
     OR (v_r.o->>'moduloId') IS NOT NULL OR (v_r.o->>'bancoId')::uuid <> v_b_gallery
     OR v_r.o->>'produtoNome' <> 'TESTE GALLERY' OR v_r.o->>'bancoNome' <> 'TESTE B GALLERY'
     OR (v_r.o->>'totalModulos')::int <> 0 THEN
    RAISE EXCEPTION 'GALLERY veio errado: %', v_r.o;
  END IF;
  -- CE PLUS: só os dois módulos marcados, no banco COMEX, de 4 módulos
  IF (SELECT count(*) FROM jsonb_array_elements(v_opcoes) o WHERE (o->>'produtoId')::uuid = v_ceplus) <> 2
     OR NOT (SELECT array_agg(o->>'moduloNome') FROM jsonb_array_elements(v_opcoes) o
              WHERE (o->>'produtoId')::uuid = v_ceplus) @> ARRAY['Exportação', 'Importação'] THEN
    RAISE EXCEPTION 'CE PLUS deveria trazer só Exportação e Importação';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_opcoes) o WHERE (o->>'produtoId')::uuid = v_ceplus
              AND ((o->>'bancoId')::uuid <> v_b_comex OR (o->>'totalModulos')::int <> 4)) THEN
    RAISE EXCEPTION 'CE PLUS deveria ir para o banco COMEX, com 4 módulos no total';
  END IF;
  -- COMPLY inteiro: um destino por módulo ativo (o inativo fica de fora)
  IF (SELECT count(*) FROM jsonb_array_elements(v_opcoes) o WHERE (o->>'produtoId')::uuid = v_comply) <> 2
     OR NOT (SELECT array_agg(o->>'moduloNome') FROM jsonb_array_elements(v_opcoes) o
              WHERE (o->>'produtoId')::uuid = v_comply) @> ARRAY['e-DOCS', 'Obrigações']
     OR EXISTS (SELECT 1 FROM jsonb_array_elements(v_opcoes) o WHERE (o->>'produtoId')::uuid = v_comply
                 AND ((o->>'bancoId')::uuid <> v_b_fiscal OR (o->>'totalModulos')::int <> 2)) THEN
    RAISE EXCEPTION 'COMPLY inteiro deveria trazer os 2 módulos ativos no banco FISCAL';
  END IF;
  -- TP ONE vem com a vigência do banco, para a tela filtrar pelo mês
  SELECT o INTO v_r FROM jsonb_array_elements(v_opcoes) o WHERE (o->>'produtoId')::uuid = v_tpone;
  IF v_r.o->>'fimVigencia' <> '2026-09-01' OR v_r.o->>'inicioVigencia' <> '2026-07-01'
     OR (v_r.o->>'bancoOrdem')::int <> 5 THEN
    RAISE EXCEPTION 'TP ONE sem a vigência ou a ordem do banco: %', v_r.o;
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_opcoes) o WHERE (o->>'produtoId')::uuid = v_vendor) THEN
    RAISE EXCEPTION 'VENDOR só está no banco inativo e não podia aparecer';
  END IF;

  -- Legado: nenhuma opção
  v_dest := requerimento_destinos(v_legado, NULL);
  IF (v_dest->>'liberada')::boolean OR jsonb_array_length(v_dest->'opcoes') <> 0 THEN
    RAISE EXCEPTION 'Empresa no legado deveria vir sem destinos; veio %', v_dest;
  END IF;

  -- -------------------------------------------------------------------
  -- 3. Definir o destino: o banco sai do produto/módulo
  -- -------------------------------------------------------------------
  v_banco := requerimento_definir_destino(v_req, v_ceplus, v_export);
  IF v_banco <> v_b_comex THEN
    RAISE EXCEPTION 'CE PLUS / Exportação deveria ir para o banco COMEX';
  END IF;
  -- Leitura de volta como dono da tabela (quem lança não lê requerimentos_bancos)
  PERFORM set_config('role', 'postgres', true);
  SELECT * INTO v_r FROM requerimentos_bancos WHERE requerimento_id = v_req;
  IF v_r.banco_id <> v_b_comex OR v_r.produto_id <> v_ceplus OR v_r.modulo_id <> v_export THEN
    RAISE EXCEPTION 'requerimentos_bancos sem o banco, o produto ou o módulo escolhidos';
  END IF;
  PERFORM set_config('role', 'authenticated', true);

  -- Na edição, o escolhido volta
  v_dest := requerimento_destinos(v_liberada, v_req);
  IF (v_dest->'escolhido'->>'produtoId')::uuid <> v_ceplus OR (v_dest->'escolhido'->>'moduloId')::uuid <> v_export
     OR (v_dest->'escolhido'->>'bancoId')::uuid <> v_b_comex THEN
    RAISE EXCEPTION 'A edição não trouxe o destino escolhido: %', v_dest->'escolhido';
  END IF;

  -- Produto por módulo sem módulo: recusa
  v_falhou := false;
  BEGIN
    PERFORM requerimento_definir_destino(v_req, v_ceplus, NULL);
  EXCEPTION WHEN check_violation THEN v_falhou := true; v_msg := SQLERRM;
  END;
  IF NOT v_falhou OR v_msg NOT ILIKE '%módulo%' THEN
    RAISE EXCEPTION 'CE PLUS sem módulo deveria pedir o módulo (veio: %)', v_msg;
  END IF;

  -- Módulo fora do escopo: recusa (nunca cai no Banco padrão)
  v_falhou := false;
  BEGIN
    PERFORM requerimento_definir_destino(v_req, v_ceplus, v_cambio);
  EXCEPTION WHEN check_violation THEN v_falhou := true; v_msg := SQLERRM;
  END;
  IF NOT v_falhou OR v_msg NOT ILIKE '%nenhum banco%' THEN
    RAISE EXCEPTION 'Câmbio não está em nenhum banco e deveria ser recusado (veio: %)', v_msg;
  END IF;

  -- Módulo de outro produto: recusa
  v_falhou := false;
  BEGIN
    PERFORM requerimento_definir_destino(v_req, v_comply, v_export);
  EXCEPTION WHEN check_violation THEN v_falhou := true; v_msg := SQLERRM;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION 'Módulo de outro produto deveria ser recusado';
  END IF;

  -- Produto inteiro sem módulos
  IF requerimento_definir_destino(v_req, v_gallery, NULL) <> v_b_gallery THEN
    RAISE EXCEPTION 'GALLERY deveria ir para o banco GALLERY';
  END IF;
  -- Produto com todos os módulos no mesmo banco: não precisa de módulo
  IF requerimento_definir_destino(v_req, v_comply, NULL) <> v_b_fiscal THEN
    RAISE EXCEPTION 'COMPLY inteiro deveria ir para o banco FISCAL';
  END IF;
  -- ... mas aceita o módulo
  IF requerimento_definir_destino(v_req, v_comply, v_obrig) <> v_b_fiscal THEN
    RAISE EXCEPTION 'COMPLY / Obrigações deveria ir para o banco FISCAL';
  END IF;

  -- Banco fora da vigência no mês de cobrança (Out/2026): recusa
  v_falhou := false;
  BEGIN
    PERFORM requerimento_definir_destino(v_req, v_tpone, NULL);
  EXCEPTION WHEN check_violation THEN v_falhou := true; v_msg := SQLERRM;
  END;
  IF NOT v_falhou OR v_msg NOT ILIKE '%nenhum banco%' THEN
    RAISE EXCEPTION 'TP ONE (banco encerrado em Set/2026) deveria ser recusado em Out/2026 (veio: %)', v_msg;
  END IF;

  -- Sem mês de cobrança: vale o mês atual (GALLERY vigente desde Jul/2026)
  IF requerimento_definir_destino(v_req_sem_mes, v_gallery, NULL) <> v_b_gallery THEN
    RAISE EXCEPTION 'Sem mês de cobrança, deveria valer o mês atual';
  END IF;

  -- -------------------------------------------------------------------
  -- 4. Ajuste do Controle continua valendo se o destino não muda
  -- -------------------------------------------------------------------
  PERFORM set_config('role', 'postgres', true);
  UPDATE requerimentos_bancos SET banco_id = v_padrao, motivo = 'Ajuste no Controle' WHERE requerimento_id = v_req;
  PERFORM set_config('role', 'authenticated', true);
  PERFORM requerimento_definir_destino(v_req, v_comply, v_obrig);
  PERFORM set_config('role', 'postgres', true);
  IF (SELECT banco_id FROM requerimentos_bancos WHERE requerimento_id = v_req) <> v_padrao THEN
    RAISE EXCEPTION 'Reescolher o mesmo produto/módulo desfez o ajuste do Controle';
  END IF;
  PERFORM set_config('role', 'authenticated', true);
  PERFORM requerimento_definir_destino(v_req, v_ceplus, v_import);
  PERFORM set_config('role', 'postgres', true);
  SELECT * INTO v_r FROM requerimentos_bancos WHERE requerimento_id = v_req;
  IF v_r.banco_id <> v_b_comex OR v_r.modulo_id <> v_import THEN
    RAISE EXCEPTION 'Trocar o produto/módulo deveria trocar o banco';
  END IF;

  -- -------------------------------------------------------------------
  -- 5. Produto dividido entre bancos (módulos diferentes, como a RN-05
  --    permite): cada módulo vai para o seu banco
  -- -------------------------------------------------------------------
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem)
  VALUES (v_liberada, 'TESTE B CAMBIO', false, 7, 'horas', 3, '2026-07-01', 'OUTROS', 'manual') RETURNING id INTO v_b_comex_geral;
  INSERT INTO bancos_horas_escopo (banco_id, produto_id, modulo_id) VALUES (v_b_comex_geral, v_ceplus, v_cambio);
  PERFORM set_config('role', 'authenticated', true);
  IF requerimento_definir_destino(v_req, v_ceplus, v_cambio) <> v_b_comex_geral THEN
    RAISE EXCEPTION 'Câmbio deveria ir para o banco CAMBIO';
  END IF;
  IF requerimento_definir_destino(v_req, v_ceplus, v_export) <> v_b_comex THEN
    RAISE EXCEPTION 'Exportação deveria continuar no banco COMEX';
  END IF;
  v_falhou := false;
  BEGIN
    PERFORM requerimento_definir_destino(v_req, v_ceplus, NULL);
  EXCEPTION WHEN check_violation THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION 'CE PLUS dividido entre bancos deveria exigir o módulo';
  END IF;

  -- -------------------------------------------------------------------
  -- 6. Recusas de requerimento e de permissão
  -- -------------------------------------------------------------------
  FOREACH v_banco IN ARRAY ARRAY[v_req_faturado, v_req_enviado, v_req_legado] LOOP
    v_falhou := false;
    BEGIN
      PERFORM requerimento_definir_destino(v_banco, v_gallery, NULL);
    EXCEPTION WHEN check_violation THEN v_falhou := true;
    END;
    IF NOT v_falhou THEN
      RAISE EXCEPTION 'Requerimento % (faturado à parte, enviado ou do legado) deveria ser recusado', v_banco;
    END IF;
  END LOOP;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_consulta, 'role', 'authenticated')::text, true);
  IF jsonb_array_length(requerimento_destinos(v_liberada, NULL)->'opcoes') = 0 THEN
    RAISE EXCEPTION 'Quem consulta Lançar Requerimentos deveria ver os destinos';
  END IF;
  v_falhou := false;
  BEGIN
    PERFORM requerimento_definir_destino(v_req, v_gallery, NULL);
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION 'Quem só consulta não pode definir o destino';
  END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_sem_acesso, 'role', 'authenticated')::text, true);
  v_falhou := false;
  BEGIN
    PERFORM requerimento_destinos(v_liberada, NULL);
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION 'Sem acesso a Lançar Requerimentos, não pode ver os destinos';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
