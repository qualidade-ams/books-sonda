-- =====================================================================
-- Teste da migration 20261030000002_catalogo_excluir
-- (excluir solução, produto ou módulo que nunca foi usado).
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
  v_s uuid; v_p uuid; v_m uuid; v_vazio uuid; v_classificar uuid; v_g uuid;
  v_falhou boolean;
  v_msg text;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Preparação: nenhum usuário no grupo Administradores';
  END IF;

  -- 1. Nenhuma chave para o catálogo apaga em cascata ou zera a coluna: um item em uso
  --    sempre barra a exclusão
  IF EXISTS (SELECT 1 FROM pg_constraint
              WHERE contype = 'f'
                AND confrelid IN ('solucoes'::regclass, 'produtos'::regclass, 'produto_modulos'::regclass)
                AND confdeltype NOT IN ('r', 'a')) THEN
    RAISE EXCEPTION '1. Há chave para solucoes, produtos ou produto_modulos que não é RESTRICT/NO ACTION';
  END IF;

  -- Catálogo do teste: S › P (M) · S › P vazio · S › "A classificar"
  INSERT INTO solucoes (codigo, nome, ordem) VALUES ('TESTE_EXCLUIR_S', 'Teste excluir S', 903) RETURNING id INTO v_s;
  INSERT INTO produtos (codigo, nome, ordem, solucao_id) VALUES ('TESTE_EXCLUIR_P', 'Teste excluir P', 903, v_s) RETURNING id INTO v_p;
  INSERT INTO produtos (codigo, nome, ordem, solucao_id) VALUES ('TESTE_EXCLUIR_VAZIO', 'Teste excluir vazio', 904, v_s) RETURNING id INTO v_vazio;
  -- "A classificar" só nasce na carga (gatilho validar_produto)
  PERFORM set_config('app.origem', 'carga', true);
  INSERT INTO produtos (codigo, nome, ordem, solucao_id, a_classificar)
  VALUES ('TESTE_EXCLUIR_CLASSIFICAR', 'Teste excluir a classificar', 905, v_s, true) RETURNING id INTO v_classificar;
  PERFORM set_config('app.origem', '', true);
  INSERT INTO produto_modulos (produto_id, nome, ordem) VALUES (v_p, 'Teste excluir M', 1) RETURNING id INTO v_m;

  -- 2. Sem Edição em Produtos e Módulos, não exclui
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_sem_acesso, 'role', 'authenticated')::text, true);
  v_falhou := false;
  BEGIN
    PERFORM catalogo_excluir('modulo', v_m);
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION '2. Quem não tem Edição em Produtos e Módulos não pode excluir';
  END IF;

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  -- 3. Módulo com grupo vinculado: em uso, não exclui
  INSERT INTO grupos_aranda (grupo_aranda, grupo_book, classificacao) VALUES ('TESTE EXCLUIR GRUPO', 'TESTE', 'nao_se_aplica')
  RETURNING id INTO v_g;
  INSERT INTO grupos_aranda_vinculos (grupo_id, solucao_id, produto_id, modulo_id) VALUES (v_g, v_s, v_p, v_m);
  v_falhou := false;
  BEGIN
    PERFORM catalogo_excluir('modulo', v_m);
  EXCEPTION WHEN check_violation THEN v_falhou := true; v_msg := SQLERRM;
  END;
  IF NOT v_falhou OR v_msg NOT LIKE '%inative%' THEN
    RAISE EXCEPTION '3. Módulo com grupo vinculado não pode ser excluído (mensagem: %)', v_msg;
  END IF;
  DELETE FROM grupos_aranda_vinculos WHERE grupo_id = v_g;

  -- 4. Produto com módulo (mesmo inativo) não exclui; a solução com produtos também não
  UPDATE produto_modulos SET ativo = false WHERE id = v_m;
  v_falhou := false;
  BEGIN
    PERFORM catalogo_excluir('produto', v_p);
  EXCEPTION WHEN check_violation THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION '4. Produto com módulo não pode ser excluído';
  END IF;
  v_falhou := false;
  BEGIN
    PERFORM catalogo_excluir('solucao', v_s);
  EXCEPTION WHEN check_violation THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION '4. Solução com produtos não pode ser excluída';
  END IF;

  -- 5. O produto "A classificar" nunca é excluído
  v_falhou := false;
  BEGIN
    PERFORM catalogo_excluir('produto', v_classificar);
  EXCEPTION WHEN check_violation THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION '5. O produto "A classificar" não pode ser excluído';
  END IF;

  -- 6. Sem uso: módulo, produto e, por fim, a solução saem; a auditoria guarda a cópia
  PERFORM catalogo_excluir('modulo', v_m);
  PERFORM catalogo_excluir('produto', v_p);
  PERFORM catalogo_excluir('produto', v_vazio);
  IF EXISTS (SELECT 1 FROM produto_modulos WHERE id = v_m) OR EXISTS (SELECT 1 FROM produtos WHERE id IN (v_p, v_vazio)) THEN
    RAISE EXCEPTION '6. Módulo e produtos sem uso deveriam ter sido excluídos';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auditoria_alteracoes
                  WHERE tabela = 'produtos' AND registro_id = v_p::text AND acao = 'delete' AND usuario_id = v_admin) THEN
    RAISE EXCEPTION '6. A exclusão do produto deveria ficar na auditoria';
  END IF;
  -- O "A classificar" é da solução: a exclusão dela recusa enquanto ele existir
  DELETE FROM produtos WHERE id = v_classificar;
  PERFORM catalogo_excluir('solucao', v_s);
  IF EXISTS (SELECT 1 FROM solucoes WHERE id = v_s) THEN
    RAISE EXCEPTION '6. Solução sem uso deveria ter sido excluída';
  END IF;

  -- 7. Tipo inválido e item que não existe
  v_falhou := false;
  BEGIN
    PERFORM catalogo_excluir('banco', v_s);
  EXCEPTION WHEN check_violation THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION '7. Tipo inválido deveria falhar';
  END IF;
  v_falhou := false;
  BEGIN
    PERFORM catalogo_excluir('modulo', gen_random_uuid());
  EXCEPTION WHEN check_violation THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION '7. Item que não existe deveria falhar';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
