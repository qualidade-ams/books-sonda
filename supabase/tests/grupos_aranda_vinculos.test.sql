-- =====================================================================
-- Teste da migration 20261030000001_grupos_aranda_vinculos
-- (grupo do Aranda em vários lugares do catálogo).
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou.
-- Qualquer outra mensagem de erro diz qual verificação falhou.
-- =====================================================================
DO $teste$
DECLARE
  v_admin uuid := (SELECT uga.user_id FROM user_group_assignments uga JOIN user_groups ug ON ug.id = uga.group_id
                    WHERE ug.name = 'Administradores' LIMIT 1);
  v_sem_acesso uuid := gen_random_uuid();
  v_s1 uuid; v_s2 uuid; v_p1 uuid; v_p2 uuid; v_m1 uuid; v_m2 uuid; v_g uuid;
  v_quantos int;
  v_falhou boolean;
  v_linha record;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Preparação: nenhum usuário no grupo Administradores';
  END IF;

  -- 1. Carga: cada grupo com destino tem exatamente um vínculo, igual às colunas
  SELECT count(*) INTO v_quantos
    FROM grupos_aranda g
   WHERE g.solucao_id IS NOT NULL
     AND (SELECT count(*) FROM grupos_aranda_vinculos v
           WHERE v.grupo_id = g.id AND v.solucao_id = g.solucao_id
             AND v.produto_id IS NOT DISTINCT FROM g.produto_id
             AND v.modulo_id IS NOT DISTINCT FROM g.modulo_id) <> 1;
  IF v_quantos > 0 THEN
    RAISE EXCEPTION '1. Carga: % grupos sem o vínculo igual às colunas atuais', v_quantos;
  END IF;
  IF EXISTS (SELECT 1 FROM grupos_aranda_vinculos v JOIN grupos_aranda g ON g.id = v.grupo_id
              WHERE g.solucao_id IS NULL) THEN
    RAISE EXCEPTION '1. Carga: grupo sem destino (não se aplica) ganhou vínculo';
  END IF;

  -- Catálogo do teste: S1 › P1 (M1, M2) e P2; S2 só com serviço
  INSERT INTO solucoes (codigo, nome, ordem) VALUES ('TESTE_VINC_S1', 'Teste vínculos S1', 901) RETURNING id INTO v_s1;
  INSERT INTO solucoes (codigo, nome, ordem) VALUES ('TESTE_VINC_S2', 'Teste vínculos S2', 902) RETURNING id INTO v_s2;
  INSERT INTO produtos (codigo, nome, ordem, solucao_id) VALUES ('TESTE_VINC_P1', 'Teste vínculos P1', 901, v_s1) RETURNING id INTO v_p1;
  INSERT INTO produtos (codigo, nome, ordem, solucao_id) VALUES ('TESTE_VINC_P2', 'Teste vínculos P2', 902, v_s1) RETURNING id INTO v_p2;
  INSERT INTO produto_modulos (produto_id, nome, ordem) VALUES (v_p1, 'Teste M1', 1) RETURNING id INTO v_m1;
  INSERT INTO produto_modulos (produto_id, nome, ordem) VALUES (v_p1, 'Teste M2', 2) RETURNING id INTO v_m2;

  -- 2. A tela anterior (colunas de grupos_aranda) cria o vínculo
  INSERT INTO grupos_aranda (grupo_aranda, grupo_book, solucao_id, produto_id, modulo_id, classificacao)
  VALUES ('TESTE VINCULOS GRUPO', 'TESTE', v_s1, v_p1, v_m1, 'modulo') RETURNING id INTO v_g;
  IF (SELECT count(*) FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND modulo_id = v_m1) <> 1 THEN
    RAISE EXCEPTION '2. Grupo criado pela tela anterior sem o vínculo do módulo';
  END IF;

  -- 3. Sem Edição no De-para, não vincula
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_sem_acesso, 'role', 'authenticated')::text, true);
  v_falhou := false;
  BEGIN
    PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p2, NULL);
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION '3. Quem não tem Edição no De-para não pode vincular';
  END IF;
  v_falhou := false;
  BEGIN
    PERFORM grupos_aranda_desvincular(ARRAY[v_g], NULL, v_p1, NULL);
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION '3. Quem não tem Edição no De-para não pode desvincular';
  END IF;

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  -- 4. Vincular a outro produto acrescenta; a solução vem do produto; o espelho fica no primeiro
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p2, NULL);
  IF (SELECT count(*) FROM grupos_aranda_vinculos WHERE grupo_id = v_g) <> 2 THEN
    RAISE EXCEPTION '4. Vincular a outro produto deveria acrescentar (2 vínculos)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND produto_id = v_p2
                    AND solucao_id = v_s1 AND modulo_id IS NULL) THEN
    RAISE EXCEPTION '4. Vínculo do produto inteiro P2 com a solução S1 não encontrado';
  END IF;
  SELECT * INTO v_linha FROM grupos_aranda WHERE id = v_g;
  IF v_linha.modulo_id IS DISTINCT FROM v_m1 OR v_linha.classificacao <> 'modulo' THEN
    RAISE EXCEPTION '4. As colunas antigas deveriam continuar no primeiro vínculo (M1)';
  END IF;

  -- 5. Outro módulo do mesmo produto move o grupo (um lugar por produto)
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p1, v_m2);
  IF (SELECT count(*) FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND produto_id = v_p1) <> 1
     OR NOT EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND modulo_id = v_m2) THEN
    RAISE EXCEPTION '5. Outro módulo do mesmo produto deveria mover o grupo para M2';
  END IF;

  -- 6. Serviço da solução também se repete, uma vez por solução
  PERFORM grupos_aranda_vincular(ARRAY[v_g], v_s2, NULL, NULL);
  PERFORM grupos_aranda_vincular(ARRAY[v_g], v_s2, NULL, NULL);
  IF (SELECT count(*) FROM grupos_aranda_vinculos WHERE grupo_id = v_g) <> 3
     OR (SELECT count(*) FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND solucao_id = v_s2 AND produto_id IS NULL) <> 1 THEN
    RAISE EXCEPTION '6. Serviço da solução: um vínculo por solução, ao lado dos produtos';
  END IF;

  -- 7. O banco também barra o segundo lugar no mesmo produto
  v_falhou := false;
  BEGIN
    INSERT INTO grupos_aranda_vinculos (grupo_id, solucao_id, produto_id) VALUES (v_g, v_s1, v_p1);
  EXCEPTION WHEN unique_violation THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION '7. Dois lugares no mesmo produto deveriam ser barrados';
  END IF;

  -- 8. Desvincular do módulo deixa o grupo no produto; do produto e do serviço, tira
  PERFORM grupos_aranda_desvincular(ARRAY[v_g], NULL, v_p1, v_m2);
  IF NOT EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND produto_id = v_p1 AND modulo_id IS NULL) THEN
    RAISE EXCEPTION '8. Desvincular do módulo deveria deixar o grupo no produto P1';
  END IF;
  PERFORM grupos_aranda_desvincular(ARRAY[v_g], NULL, v_p2, NULL);
  PERFORM grupos_aranda_desvincular(ARRAY[v_g], v_s2, NULL, NULL);
  IF (SELECT count(*) FROM grupos_aranda_vinculos WHERE grupo_id = v_g) <> 1 THEN
    RAISE EXCEPTION '8. Depois de desvincular P2 e o serviço, deveria sobrar só P1';
  END IF;

  -- 9. Substituir troca todos; sem destino, o grupo não se aplica
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p2, NULL);
  PERFORM grupos_aranda_vincular(ARRAY[v_g], v_s2, NULL, NULL, true);
  IF (SELECT count(*) FROM grupos_aranda_vinculos WHERE grupo_id = v_g) <> 1
     OR NOT EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND solucao_id = v_s2) THEN
    RAISE EXCEPTION '9. Substituir deveria deixar só o serviço de S2';
  END IF;
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, NULL, NULL, true);
  SELECT * INTO v_linha FROM grupos_aranda WHERE id = v_g;
  IF EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g)
     OR v_linha.classificacao <> 'nao_se_aplica' OR v_linha.solucao_id IS NOT NULL THEN
    RAISE EXCEPTION '9. Substituir por nada: sem vínculo e as colunas antigas em não se aplica';
  END IF;

  -- 10. Vincular sem dizer onde é erro
  v_falhou := false;
  BEGIN
    PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, NULL, NULL);
  EXCEPTION WHEN check_violation THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION '10. Vincular sem destino (sem substituir) deveria falhar';
  END IF;

  -- 11. A tela anterior troca o destino: vira o único vínculo
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_p2, NULL);
  PERFORM grupos_aranda_vincular(ARRAY[v_g], v_s2, NULL, NULL);
  UPDATE grupos_aranda SET solucao_id = v_s1, produto_id = v_p1, modulo_id = v_m1, classificacao = 'modulo'
   WHERE id = v_g;
  IF (SELECT count(*) FROM grupos_aranda_vinculos WHERE grupo_id = v_g) <> 1
     OR NOT EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND modulo_id = v_m1) THEN
    RAISE EXCEPTION '11. Edição pela tela anterior deveria virar o único vínculo (M1)';
  END IF;

  -- 12. Auditoria dos vínculos
  IF NOT EXISTS (SELECT 1 FROM auditoria_alteracoes WHERE tabela = 'grupos_aranda_vinculos' AND acao = 'insert' AND usuario_id = v_admin)
     OR NOT EXISTS (SELECT 1 FROM auditoria_alteracoes WHERE tabela = 'grupos_aranda_vinculos' AND acao = 'delete') THEN
    RAISE EXCEPTION '12. Inclusão e exclusão de vínculo deveriam ficar na auditoria';
  END IF;

  -- 13. RLS habilitada e as quatro políticas
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'grupos_aranda_vinculos') THEN
    RAISE EXCEPTION '13. RLS desabilitada em grupos_aranda_vinculos';
  END IF;
  IF (SELECT count(*) FROM pg_policies WHERE tablename = 'grupos_aranda_vinculos') <> 4 THEN
    RAISE EXCEPTION '13. grupos_aranda_vinculos deveria ter 4 políticas (SELECT, INSERT, UPDATE, DELETE)';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
