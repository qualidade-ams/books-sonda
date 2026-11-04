-- =====================================================================
-- Teste da migration 20261103000005_fim_grupos_servico
-- (o grupo de serviço da solução deixa de existir; decisão de 03/11/2026).
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou.
-- Qualquer outra mensagem de erro diz qual verificação falhou.
-- =====================================================================
DO $teste$
DECLARE
  v_admin uuid := (SELECT uga.user_id FROM user_group_assignments uga JOIN user_groups ug ON ug.id = uga.group_id
                    WHERE ug.name = 'Administradores' LIMIT 1);
  v_s uuid; v_p uuid; v_p2 uuid; v_acl uuid; v_m1 uuid; v_m2 uuid; v_g uuid;
  v_falhou boolean;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Preparação: nenhum usuário no grupo Administradores';
  END IF;

  -- 1. Nenhum vínculo de serviço sobrou e o banco não aceita mais vínculo sem produto
  IF EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE produto_id IS NULL) THEN
    RAISE EXCEPTION '1. Ainda há vínculo de serviço da solução (sem produto)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'grupos_aranda_vinculos_servico_uq') THEN
    RAISE EXCEPTION '1. O índice de serviço da solução ainda existe';
  END IF;

  -- Catálogo do teste: S › P (M1, M2), P2 e o "A classificar"
  INSERT INTO solucoes (codigo, nome, ordem) VALUES ('TESTE_SERVICO_S', 'Teste serviço S', 908) RETURNING id INTO v_s;
  INSERT INTO produtos (codigo, nome, ordem, solucao_id) VALUES ('TESTE_SERVICO_P', 'Teste serviço P', 908, v_s) RETURNING id INTO v_p;
  INSERT INTO produtos (codigo, nome, ordem, solucao_id) VALUES ('TESTE_SERVICO_P2', 'Teste serviço P2', 909, v_s) RETURNING id INTO v_p2;
  -- O "A classificar" só pode ser criado como carga (gatilho validar_produto)
  PERFORM set_config('app.origem', 'carga', true);
  INSERT INTO produtos (codigo, nome, ordem, solucao_id, a_classificar)
  VALUES ('TESTE_SERVICO_ACL', 'Teste serviço A classificar', 910, v_s, true) RETURNING id INTO v_acl;
  PERFORM set_config('app.origem', '', true);
  INSERT INTO produto_modulos (produto_id, nome, ordem) VALUES (v_p, 'Teste M1', 1) RETURNING id INTO v_m1;
  INSERT INTO produto_modulos (produto_id, nome, ordem) VALUES (v_p, 'Teste M2', 2) RETURNING id INTO v_m2;
  INSERT INTO grupos_aranda (grupo_aranda, grupo_book) VALUES ('TESTE SERVICO GRUPO', 'TESTE') RETURNING id INTO v_g;

  v_falhou := false;
  BEGIN
    INSERT INTO grupos_aranda_vinculos (grupo_id, solucao_id) VALUES (v_g, v_s);
  EXCEPTION WHEN not_null_violation THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION '1. Vínculo sem produto deveria ser barrado';
  END IF;

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  -- 2. Vincular só à solução é recusado
  v_falhou := false;
  BEGIN
    PERFORM grupos_aranda_vincular(ARRAY[v_g], v_s, NULL, NULL);
  EXCEPTION WHEN check_violation THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION '2. Vincular só à solução (sem produto) deveria ser recusado';
  END IF;

  -- 3. Vários módulos do mesmo produto e o produto inteiro: acrescenta, sem mover nem duplicar
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_acl, NULL);
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p, v_m1);
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p, v_m2);
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p, NULL);
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p, v_m1);
  IF (SELECT count(*) FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND produto_id = v_p) <> 3 THEN
    RAISE EXCEPTION '3. Esperados 3 lugares em P (M1, M2 e o produto inteiro), sem mover nem duplicar';
  END IF;

  -- 4. Um lugar de verdade tira o grupo do "A classificar" da solução
  IF EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND produto_id = v_acl) THEN
    RAISE EXCEPTION '4. O grupo deveria ter saído do "A classificar"';
  END IF;

  -- 5. Desvincular só da solução é recusado
  v_falhou := false;
  BEGIN
    PERFORM grupos_aranda_desvincular(ARRAY[v_g], v_s, NULL, NULL);
  EXCEPTION WHEN check_violation THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION '5. Desvincular só da solução (sem produto) deveria ser recusado';
  END IF;

  -- 6. Tirar o último lugar na solução devolve o grupo ao "A classificar"
  PERFORM grupos_aranda_desvincular(ARRAY[v_g], NULL, v_p, v_m1);
  PERFORM grupos_aranda_desvincular(ARRAY[v_g], NULL, v_p, v_m2);
  PERFORM grupos_aranda_desvincular(ARRAY[v_g], NULL, v_p, NULL);
  IF (SELECT count(*) FROM grupos_aranda_vinculos WHERE grupo_id = v_g) <> 1
     OR NOT EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND produto_id = v_acl) THEN
    RAISE EXCEPTION '6. Sem lugar na solução, o grupo deveria voltar ao "A classificar"';
  END IF;

  -- 7. Substituir troca todos; substituir por nada deixa o grupo sem lugar (não se aplica)
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p2, NULL, true);
  IF (SELECT count(*) FROM grupos_aranda_vinculos WHERE grupo_id = v_g) <> 1
     OR NOT EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND produto_id = v_p2) THEN
    RAISE EXCEPTION '7. Substituir deveria deixar só P2';
  END IF;
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, NULL, NULL, true);
  IF EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g) THEN
    RAISE EXCEPTION '7. Substituir por nada deveria deixar o grupo sem lugar';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
