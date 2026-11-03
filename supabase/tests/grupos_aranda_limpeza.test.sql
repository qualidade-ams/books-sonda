-- =====================================================================
-- Teste da migration 20261030000003_grupos_aranda_limpeza
-- (sem as colunas de destino em grupos_aranda; os lugares só nos vínculos).
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou.
-- Qualquer outra mensagem de erro diz qual verificação falhou.
-- =====================================================================
DO $teste$
DECLARE
  v_admin uuid := (SELECT uga.user_id FROM user_group_assignments uga JOIN user_groups ug ON ug.id = uga.group_id
                    WHERE ug.name = 'Administradores' LIMIT 1);
  v_produto uuid := (SELECT id FROM produtos WHERE NOT a_classificar ORDER BY ordem LIMIT 1);
  v_g uuid;
  v_funcoes text;
BEGIN
  IF v_admin IS NULL OR v_produto IS NULL THEN
    RAISE EXCEPTION 'Preparação: falta administrador ou produto';
  END IF;

  -- 1. As colunas de destino saíram de grupos_aranda
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'grupos_aranda'
                AND column_name IN ('solucao_id', 'produto_id', 'modulo_id', 'classificacao')) THEN
    RAISE EXCEPTION '1. grupos_aranda ainda tem coluna de destino';
  END IF;

  -- 2. O espelho e a ponte saíram
  IF EXISTS (SELECT 1 FROM pg_trigger
              WHERE tgname IN ('trg_grupos_aranda_vinculos_espelho', 'trg_grupos_aranda_vinculos_tela_anterior'))
     OR EXISTS (SELECT 1 FROM pg_proc
                 WHERE proname IN ('espelhar_grupo_aranda_vinculos', 'vinculos_da_tela_anterior')) THEN
    RAISE EXCEPTION '2. O gatilho ou a função de compatibilidade ainda existe';
  END IF;

  -- 3. Nenhuma função do banco cita grupos_aranda junto com a coluna que saiu
  SELECT string_agg(proname, ', ') INTO v_funcoes
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.prosrc ILIKE '%grupos_aranda%'
     AND p.prosrc ~* '\mclassificacao\M';
  IF v_funcoes IS NOT NULL THEN
    RAISE EXCEPTION '3. Funções ainda citam grupos_aranda e classificacao: %', v_funcoes;
  END IF;

  -- 4. O De-para cria o grupo só com o grupo e o Grupo do Book; o lugar vem pela função
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  INSERT INTO grupos_aranda (grupo_aranda, grupo_book) VALUES ('TESTE LIMPEZA GRUPO', 'TESTE') RETURNING id INTO v_g;
  PERFORM grupos_aranda_vincular(ARRAY[v_g], NULL, v_produto, NULL);
  IF (SELECT count(*) FROM grupos_aranda_vinculos WHERE grupo_id = v_g AND produto_id = v_produto) <> 1 THEN
    RAISE EXCEPTION '4. Vincular sem as colunas antigas deveria criar o vínculo';
  END IF;
  PERFORM grupos_aranda_desvincular(ARRAY[v_g], NULL, v_produto, NULL);
  IF EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = v_g) THEN
    RAISE EXCEPTION '4. Desvincular sem as colunas antigas deveria tirar o vínculo';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
