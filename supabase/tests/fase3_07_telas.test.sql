-- =====================================================================
-- Teste da migration 20261022000008_fase3_telas
-- (docs/especificacoes/Modelagem_Fase3.md, seções 6, 7, 11 e 12).
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou.
-- Qualquer outra mensagem de erro diz qual verificação falhou.
-- =====================================================================
DO $teste$
DECLARE
  v_admin uuid := (SELECT uga.user_id FROM user_group_assignments uga JOIN user_groups ug ON ug.id = uga.group_id
                    WHERE ug.name = 'Administradores' LIMIT 1);
  v_controle uuid := gen_random_uuid();
  v_grupo uuid;
  v_empresa uuid := gen_random_uuid();
  v_banco uuid;
  v_ramo uuid;
  v_reajuste uuid;
  v_n int;
  v_falhou boolean;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Precondição: precisa de um usuário no grupo Administradores';
  END IF;

  -- -------------------------------------------------------------------
  -- 1. Anotações internas do reajuste (seção 7): opcional, até 700
  -- -------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'bancos_horas_reajustes' AND column_name = 'anotacao_interna' AND is_nullable = 'YES') THEN
    RAISE EXCEPTION 'bancos_horas_reajustes.anotacao_interna (opcional) não existe';
  END IF;

  INSERT INTO empresas_clientes (id, nome_completo, nome_abreviado, status, tem_ams, tipo_book, email_gestor, vigencia_inicial, anexo)
  VALUES (v_empresa, 'EMPRESA TESTE TELAS LTDA', 'TESTE TELAS', 'ativo', true, 'qualidade', 'gestor@sonda.com', '2025-01-01', false);
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem)
  VALUES (v_empresa, 'TESTE BANCO', true, 1, 'horas', 3, '2026-07-01', 'OUTROS', 'manual')
  RETURNING id INTO v_banco;

  INSERT INTO bancos_horas_reajustes (banco_id, mes, ano, tipo, minutos, justificativa, anotacao_interna)
  VALUES (v_banco, 8, 2026, 'entrada', 60, 'Atendimento presencial não apontado', repeat('x', 700))
  RETURNING id INTO v_reajuste;
  v_falhou := false;
  BEGIN UPDATE bancos_horas_reajustes SET anotacao_interna = repeat('x', 701) WHERE id = v_reajuste;
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou anotação interna com mais de 700 caracteres'; END IF;

  -- -------------------------------------------------------------------
  -- 2. Auditoria: quem vê o Controle lê as linhas dos bancos (aba Histórico)
  -- -------------------------------------------------------------------
  IF (SELECT count(*) FROM pg_policies WHERE tablename = 'auditoria_alteracoes') <> 1 THEN
    RAISE EXCEPTION 'auditoria_alteracoes deveria ter uma política só (SELECT)';
  END IF;

  INSERT INTO auth.users (id, email) VALUES (v_controle, 'controle.teste@sonda.com');
  INSERT INTO user_groups (name) VALUES ('TESTE SÓ CONTROLE') RETURNING id INTO v_grupo;
  INSERT INTO user_group_assignments (user_id, group_id) VALUES (v_controle, v_grupo);
  INSERT INTO screen_permissions (group_id, screen_key, permission_level) VALUES (v_grupo, 'bancos_horas_controle', 'view');

  INSERT INTO auditoria_alteracoes (tabela, registro_id, banco_id, acao, origem)
  VALUES ('teste_com_banco', 'TESTE-1', v_banco, 'insert', 'sistema'),
         ('teste_sem_banco', 'TESTE-2', NULL, 'insert', 'sistema');

  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_controle, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO v_n FROM auditoria_alteracoes WHERE registro_id IN ('TESTE-1', 'TESTE-2');
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Quem só vê o Controle leu % linha(s) da auditoria; esperado só a do banco', v_n;
  END IF;

  -- -------------------------------------------------------------------
  -- 3. Ramos: exclusão com Edição; ramo em uso continua protegido pela FK
  -- -------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ramos_atividade' AND cmd = 'DELETE') THEN
    RAISE EXCEPTION 'ramos_atividade sem política de DELETE';
  END IF;
  INSERT INTO ramos_atividade (nome, ordem) VALUES ('TESTE RAMO SEM USO', 99) RETURNING id INTO v_ramo;

  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_controle, 'role', 'authenticated')::text, true);
  DELETE FROM ramos_atividade WHERE id = v_ramo;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  IF NOT EXISTS (SELECT 1 FROM ramos_atividade WHERE id = v_ramo) THEN
    RAISE EXCEPTION 'Usuário sem Edição em Ramos apagou um ramo';
  END IF;
  DELETE FROM ramos_atividade WHERE id = v_ramo;
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);
  IF EXISTS (SELECT 1 FROM ramos_atividade WHERE id = v_ramo) THEN
    RAISE EXCEPTION 'Administrador não conseguiu apagar ramo sem uso';
  END IF;

  -- -------------------------------------------------------------------
  -- 4. Telas e Saldo Parcial
  -- -------------------------------------------------------------------
  IF (SELECT category FROM screens WHERE key = 'produtos_modulos') IS DISTINCT FROM 'Cliente' THEN
    RAISE EXCEPTION 'Produtos e Módulos deveria estar na categoria Cliente';
  END IF;

  -- "Executar agora" registra quem já recebeu no dia como pulado
  INSERT INTO banco_horas_envio_execucoes (empresa_id, origem, executado_para, status)
  VALUES (v_empresa, 'manual', now(), 'pulado');

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
