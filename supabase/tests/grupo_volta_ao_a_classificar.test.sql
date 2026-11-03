-- =====================================================================
-- Teste da migration 20261103000002_grupo_volta_ao_a_classificar
-- (tirar o último lugar do grupo numa solução devolve o grupo ao
-- "A classificar" dela).
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou.
-- Qualquer outra mensagem de erro diz qual verificação falhou.
-- =====================================================================
DO $teste$
DECLARE
  v_admin uuid := (SELECT uga.user_id FROM user_group_assignments uga JOIN user_groups ug ON ug.id = uga.group_id
                    WHERE ug.name = 'Administradores' LIMIT 1);
  v_s1 uuid; v_s2 uuid; v_s3 uuid;
  v_ac1 uuid; v_ac2 uuid;   -- "A classificar" de S1 e de S2 (S3 não tem)
  v_p1 uuid; v_p2 uuid; v_p3 uuid; v_p4 uuid;
  v_m1 uuid;                -- módulo de P1
  v_g uuid;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Preparação: nenhum usuário no grupo Administradores';
  END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  -- Catálogo do teste: S1 › A classificar, P1 (M1), P2; S2 › A classificar, P3; S3 › P4
  INSERT INTO solucoes (codigo, nome, ordem) VALUES ('TESTE_VAC_S1', 'Teste volta S1', 921) RETURNING id INTO v_s1;
  INSERT INTO solucoes (codigo, nome, ordem) VALUES ('TESTE_VAC_S2', 'Teste volta S2', 922) RETURNING id INTO v_s2;
  INSERT INTO solucoes (codigo, nome, ordem) VALUES ('TESTE_VAC_S3', 'Teste volta S3', 923) RETURNING id INTO v_s3;
  PERFORM set_config('app.origem', 'carga', true);
  INSERT INTO produtos (codigo, nome, ordem, solucao_id, a_classificar)
  VALUES ('TESTE_VAC_AC1', 'A classificar', 999, v_s1, true) RETURNING id INTO v_ac1;
  INSERT INTO produtos (codigo, nome, ordem, solucao_id, a_classificar)
  VALUES ('TESTE_VAC_AC2', 'A classificar', 999, v_s2, true) RETURNING id INTO v_ac2;
  PERFORM set_config('app.origem', '', true);
  INSERT INTO produtos (codigo, nome, ordem, solucao_id) VALUES ('TESTE_VAC_P1', 'Teste P1', 921, v_s1) RETURNING id INTO v_p1;
  INSERT INTO produtos (codigo, nome, ordem, solucao_id) VALUES ('TESTE_VAC_P2', 'Teste P2', 922, v_s1) RETURNING id INTO v_p2;
  INSERT INTO produtos (codigo, nome, ordem, solucao_id) VALUES ('TESTE_VAC_P3', 'Teste P3', 923, v_s2) RETURNING id INTO v_p3;
  INSERT INTO produtos (codigo, nome, ordem, solucao_id) VALUES ('TESTE_VAC_P4', 'Teste P4', 924, v_s3) RETURNING id INTO v_p4;
  INSERT INTO produto_modulos (produto_id, nome, ordem) VALUES (v_p1, 'Teste M1', 1) RETURNING id INTO v_m1;
  INSERT INTO grupos_aranda (grupo_aranda, grupo_book) VALUES ('TESTE VOLTA A CLASSIFICAR GRUPO', 'TESTE') RETURNING id INTO v_g;

  -- 1. Desvinculado do único produto da solução, o grupo volta ao "A classificar" dela
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p1, NULL);
  PERFORM grupos_aranda_desvincular(ARRAY[v_g], NULL, v_p1, NULL);
  IF (SELECT count(*) FROM grupos_aranda_vinculos
       WHERE grupo_id = v_g AND produto_id = v_ac1 AND modulo_id IS NULL AND solucao_id = v_s1) <> 1
     OR (SELECT count(*) FROM grupos_aranda_vinculos WHERE grupo_id = v_g) <> 1 THEN
    RAISE EXCEPTION '1. Sem lugar em S1, o grupo deveria voltar só ao "A classificar" de S1';
  END IF;

  -- 2. Desvinculado do serviço da solução, também volta
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, NULL, NULL, true);
  PERFORM grupos_aranda_vincular(ARRAY[v_g], v_s1, NULL, NULL);
  PERFORM grupos_aranda_desvincular(ARRAY[v_g], v_s1, NULL, NULL);
  IF NOT EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND produto_id = v_ac1) THEN
    RAISE EXCEPTION '2. Sem o serviço de S1, o grupo deveria voltar ao "A classificar" de S1';
  END IF;

  -- 3. Com outro lugar na mesma solução, não volta
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, NULL, NULL, true);
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p1, NULL);
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p2, NULL);
  PERFORM grupos_aranda_desvincular(ARRAY[v_g], NULL, v_p1, NULL);
  IF EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND produto_id = v_ac1)
     OR NOT EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND produto_id = v_p2) THEN
    RAISE EXCEPTION '3. Ainda em P2, o grupo não deveria voltar ao "A classificar"';
  END IF;

  -- 4. Desvinculado do módulo, fica no produto (como antes) e não volta
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, NULL, NULL, true);
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p1, v_m1);
  PERFORM grupos_aranda_desvincular(ARRAY[v_g], NULL, v_p1, v_m1);
  IF NOT EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND produto_id = v_p1 AND modulo_id IS NULL)
     OR EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND produto_id = v_ac1) THEN
    RAISE EXCEPTION '4. Sem o módulo, o grupo deveria ficar só no produto P1';
  END IF;

  -- 5. A volta é por solução: o lugar em S2 não impede a volta ao "A classificar" de S1
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, NULL, NULL, true);
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p1, NULL);
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p3, NULL);
  PERFORM grupos_aranda_desvincular(ARRAY[v_g], NULL, v_p1, NULL);
  IF NOT EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND produto_id = v_ac1)
     OR NOT EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND produto_id = v_p3)
     OR EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND produto_id = v_ac2) THEN
    RAISE EXCEPTION '5. Deveria ficar em P3 e no "A classificar" de S1, sem o de S2';
  END IF;

  -- 6. Desvinculado do próprio "A classificar", o grupo sai de vez (não se aplica)
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, NULL, NULL, true);
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_ac1, NULL);
  PERFORM grupos_aranda_desvincular(ARRAY[v_g], NULL, v_ac1, NULL);
  IF EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g) THEN
    RAISE EXCEPTION '6. Tirado do "A classificar", o grupo deveria ficar sem vínculo';
  END IF;

  -- 7. Solução sem "A classificar": o grupo fica sem vínculo, como antes
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p4, NULL);
  PERFORM grupos_aranda_desvincular(ARRAY[v_g], NULL, v_p4, NULL);
  IF EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g) THEN
    RAISE EXCEPTION '7. Em S3, sem "A classificar", o grupo deveria ficar sem vínculo';
  END IF;

  -- 8. Vale para vários grupos de uma vez
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p1, NULL);
  INSERT INTO grupos_aranda (grupo_aranda, grupo_book) VALUES ('TESTE VOLTA A CLASSIFICAR GRUPO 2', 'TESTE');
  PERFORM grupos_aranda_vincular(
    ARRAY[(SELECT id FROM grupos_aranda WHERE grupo_aranda = 'TESTE VOLTA A CLASSIFICAR GRUPO 2')], NULL, v_p1, NULL);
  PERFORM grupos_aranda_desvincular(
    ARRAY[v_g, (SELECT id FROM grupos_aranda WHERE grupo_aranda = 'TESTE VOLTA A CLASSIFICAR GRUPO 2')], NULL, v_p1, NULL);
  IF (SELECT count(*) FROM grupos_aranda_vinculos WHERE produto_id = v_ac1) <> 2 THEN
    RAISE EXCEPTION '8. Os dois grupos deveriam voltar ao "A classificar" de S1';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
