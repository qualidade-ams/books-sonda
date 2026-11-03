-- =====================================================================
-- Teste da migration 20261103000001_grupo_varios_modulos
-- (o mesmo grupo em vários módulos do mesmo produto; decisão de 03/11/2026).
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou.
-- Qualquer outra mensagem de erro diz qual verificação falhou.
-- =====================================================================
DO $teste$
DECLARE
  v_admin uuid := (SELECT uga.user_id FROM user_group_assignments uga JOIN user_groups ug ON ug.id = uga.group_id
                    WHERE ug.name = 'Administradores' LIMIT 1);
  v_s uuid; v_p uuid; v_m1 uuid; v_m2 uuid; v_g uuid;
  v_falhou boolean;
  v_lugares text;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Preparação: nenhum usuário no grupo Administradores';
  END IF;

  -- 1. A trava "um lugar por produto" saiu; cada lugar exato é único
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'grupos_aranda_vinculos_produto_uq') THEN
    RAISE EXCEPTION '1. O índice "um lugar por produto" ainda existe';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'grupos_aranda_vinculos_modulo_uq')
     OR NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'grupos_aranda_vinculos_produto_inteiro_uq')
     OR NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'grupos_aranda_vinculos_servico_uq') THEN
    RAISE EXCEPTION '1. Falta índice de lugar único (módulo, produto inteiro ou serviço)';
  END IF;

  -- Catálogo do teste: S › P (M1, M2)
  INSERT INTO solucoes (codigo, nome, ordem) VALUES ('TESTE_MODULOS_S', 'Teste módulos S', 907) RETURNING id INTO v_s;
  INSERT INTO produtos (codigo, nome, ordem, solucao_id) VALUES ('TESTE_MODULOS_P', 'Teste módulos P', 907, v_s) RETURNING id INTO v_p;
  INSERT INTO produto_modulos (produto_id, nome, ordem) VALUES (v_p, 'Teste M1', 1) RETURNING id INTO v_m1;
  INSERT INTO produto_modulos (produto_id, nome, ordem) VALUES (v_p, 'Teste M2', 2) RETURNING id INTO v_m2;
  INSERT INTO grupos_aranda (grupo_aranda, grupo_book) VALUES ('TESTE MODULOS GRUPO', 'TESTE') RETURNING id INTO v_g;

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  -- 2. Dois módulos do mesmo produto e o produto inteiro: três lugares; repetir não duplica
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p, v_m1);
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p, v_m2);
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p, NULL);
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p, v_m1);
  IF (SELECT count(*) FROM grupos_aranda_vinculos WHERE grupo_id = v_g) <> 3 THEN
    RAISE EXCEPTION '2. Esperados 3 lugares (M1, M2 e o produto inteiro), sem duplicar';
  END IF;

  -- 3. O banco barra o mesmo lugar duas vezes
  v_falhou := false;
  BEGIN
    INSERT INTO grupos_aranda_vinculos (grupo_id, solucao_id, produto_id, modulo_id) VALUES (v_g, v_s, v_p, v_m2);
  EXCEPTION WHEN unique_violation THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION '3. O mesmo módulo duas vezes deveria ser barrado';
  END IF;

  -- 4. Desvincular de um módulo, com outros lugares no produto: só aquele sai
  PERFORM grupos_aranda_desvincular(ARRAY[v_g], NULL, v_p, v_m1);
  SELECT string_agg(COALESCE(modulo_id::text, 'inteiro'), ',' ORDER BY modulo_id NULLS FIRST) INTO v_lugares
    FROM grupos_aranda_vinculos WHERE grupo_id = v_g;
  IF v_lugares IS DISTINCT FROM 'inteiro,' || v_m2::text THEN
    RAISE EXCEPTION '4. Depois de tirar M1, deveriam ficar o produto inteiro e M2 (ficou: %)', v_lugares;
  END IF;

  -- 5. Desvincular do produto inteiro tira só ele
  PERFORM grupos_aranda_desvincular(ARRAY[v_g], NULL, v_p, NULL);
  IF (SELECT count(*) FROM grupos_aranda_vinculos WHERE grupo_id = v_g) <> 1
     OR NOT EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND modulo_id = v_m2) THEN
    RAISE EXCEPTION '5. Depois de tirar o produto inteiro, deveria sobrar só M2';
  END IF;

  -- 6. Desvincular do último módulo do produto: o grupo fica no produto inteiro, como antes
  PERFORM grupos_aranda_desvincular(ARRAY[v_g], NULL, v_p, v_m2);
  IF (SELECT count(*) FROM grupos_aranda_vinculos WHERE grupo_id = v_g) <> 1
     OR NOT EXISTS (SELECT 1 FROM grupos_aranda_vinculos
                     WHERE grupo_id = v_g AND produto_id = v_p AND modulo_id IS NULL AND solucao_id = v_s) THEN
    RAISE EXCEPTION '6. Sem outro lugar no produto, o grupo deveria ficar no produto inteiro';
  END IF;

  -- 7. Substituir (De-para) continua trocando todos
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p, v_m1);
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p, v_m2, true);
  IF (SELECT count(*) FROM grupos_aranda_vinculos WHERE grupo_id = v_g) <> 1
     OR NOT EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND modulo_id = v_m2) THEN
    RAISE EXCEPTION '7. Substituir deveria deixar só M2';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
