-- =====================================================================
-- Teste da migration 20261103000001_grupo_sai_de_a_classificar
-- (vincular o grupo a um lugar de verdade tira o grupo do "A classificar"
-- da mesma solução).
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou.
-- Qualquer outra mensagem de erro diz qual verificação falhou.
-- =====================================================================
DO $teste$
DECLARE
  v_admin uuid := (SELECT uga.user_id FROM user_group_assignments uga JOIN user_groups ug ON ug.id = uga.group_id
                    WHERE ug.name = 'Administradores' LIMIT 1);
  v_s1 uuid; v_s2 uuid;
  v_ac1 uuid; v_ac2 uuid;   -- "A classificar" de S1 e de S2
  v_p1 uuid; v_p2 uuid; v_p3 uuid;
  v_mac uuid;               -- módulo dentro do "A classificar" de S1
  v_m1 uuid;                -- módulo de P1
  v_g uuid;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Preparação: nenhum usuário no grupo Administradores';
  END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  -- Catálogo do teste: S1 › A classificar (Mac), P1 (M1), P2; S2 › A classificar, P3
  INSERT INTO solucoes (codigo, nome, ordem) VALUES ('TESTE_AC_S1', 'Teste A classificar S1', 911) RETURNING id INTO v_s1;
  INSERT INTO solucoes (codigo, nome, ordem) VALUES ('TESTE_AC_S2', 'Teste A classificar S2', 912) RETURNING id INTO v_s2;
  PERFORM set_config('app.origem', 'carga', true);
  INSERT INTO produtos (codigo, nome, ordem, solucao_id, a_classificar)
  VALUES ('TESTE_AC_AC1', 'A classificar', 999, v_s1, true) RETURNING id INTO v_ac1;
  INSERT INTO produtos (codigo, nome, ordem, solucao_id, a_classificar)
  VALUES ('TESTE_AC_AC2', 'A classificar', 999, v_s2, true) RETURNING id INTO v_ac2;
  PERFORM set_config('app.origem', '', true);
  INSERT INTO produtos (codigo, nome, ordem, solucao_id) VALUES ('TESTE_AC_P1', 'Teste P1', 911, v_s1) RETURNING id INTO v_p1;
  INSERT INTO produtos (codigo, nome, ordem, solucao_id) VALUES ('TESTE_AC_P2', 'Teste P2', 912, v_s1) RETURNING id INTO v_p2;
  INSERT INTO produtos (codigo, nome, ordem, solucao_id) VALUES ('TESTE_AC_P3', 'Teste P3', 913, v_s2) RETURNING id INTO v_p3;
  INSERT INTO produto_modulos (produto_id, nome, ordem) VALUES (v_ac1, 'Teste Mac', 1) RETURNING id INTO v_mac;
  INSERT INTO produto_modulos (produto_id, nome, ordem) VALUES (v_p1, 'Teste M1', 1) RETURNING id INTO v_m1;
  INSERT INTO grupos_aranda (grupo_aranda, grupo_book) VALUES ('TESTE A CLASSIFICAR GRUPO', 'TESTE') RETURNING id INTO v_g;

  -- 1. No "A classificar" (produto inteiro), vincular ao produto P1 tira de lá
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_ac1, NULL);
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p1, NULL);
  IF EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND produto_id = v_ac1) THEN
    RAISE EXCEPTION '1. Vinculado a P1, o grupo deveria sair do "A classificar" da solução';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND produto_id = v_p1 AND modulo_id IS NULL) THEN
    RAISE EXCEPTION '1. O vínculo com P1 deveria existir';
  END IF;

  -- 2. Num módulo do "A classificar", vincular a um módulo de P1 tira de lá
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, NULL, NULL, true);
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_ac1, v_mac);
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p1, v_m1);
  IF EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND produto_id = v_ac1) THEN
    RAISE EXCEPTION '2. Vinculado ao módulo M1, o grupo deveria sair do módulo do "A classificar"';
  END IF;

  -- 3. Vincular ao serviço da solução também tira do "A classificar" dela
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, NULL, NULL, true);
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_ac1, NULL);
  PERFORM grupos_aranda_vincular(ARRAY[v_g], v_s1, NULL, NULL);
  IF EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND produto_id = v_ac1) THEN
    RAISE EXCEPTION '3. Vinculado ao serviço de S1, o grupo deveria sair do "A classificar" de S1';
  END IF;

  -- 4. Um produto de outra solução não mexe no "A classificar" de S1
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, NULL, NULL, true);
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_ac1, NULL);
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p3, NULL);
  IF NOT EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND produto_id = v_ac1) THEN
    RAISE EXCEPTION '4. Um produto de S2 não deveria tirar o grupo do "A classificar" de S1';
  END IF;

  -- 5. Vincular ao "A classificar" não tira o grupo dos lugares de verdade
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, NULL, NULL, true);
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p1, NULL);
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_ac1, NULL);
  IF NOT EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND produto_id = v_p1)
     OR NOT EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND produto_id = v_ac1) THEN
    RAISE EXCEPTION '5. Vincular ao "A classificar" deveria só acrescentar';
  END IF;

  -- 6. Entre produtos de verdade, vincular continua acrescentando
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, NULL, NULL, true);
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p1, NULL);
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p2, NULL);
  IF (SELECT count(*) FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND produto_id IN (v_p1, v_p2)) <> 2 THEN
    RAISE EXCEPTION '6. O grupo deveria ficar em P1 e em P2';
  END IF;

  -- 7. Nenhum grupo fica no "A classificar" e num lugar de verdade da mesma solução
  IF EXISTS (SELECT 1
               FROM grupos_aranda_vinculos v
               JOIN produtos p ON p.id = v.produto_id AND p.a_classificar
               JOIN grupos_aranda_vinculos o ON o.grupo_id = v.grupo_id AND o.solucao_id = v.solucao_id AND o.id <> v.id
              WHERE o.produto_id IS NULL
                 OR NOT EXISTS (SELECT 1 FROM produtos q WHERE q.id = o.produto_id AND q.a_classificar)) THEN
    RAISE EXCEPTION '7. Há grupo no "A classificar" e num lugar de verdade da mesma solução';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
