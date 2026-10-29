-- =====================================================================
-- Teste da migration 20261029000002_fase5_books_consumo_bancos
-- (docs/especificacoes/Modelagem_Fase5.md, seção 6.1; D-15).
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
  v_book uuid;
  v_empresa uuid;
  v_banco uuid;
  v_de_fora uuid;
  v_consolidado uuid;
  v_n int;
  v_falhou boolean;
  v_linha jsonb;
  -- Uma linha do snapshot
  v_um jsonb;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Precondição: precisa de um usuário no grupo Administradores';
  END IF;

  -- Um Book de empresa com banco; um banco de outra empresa, que não é consolidada dela
  SELECT b.id, b.empresa_id INTO v_book, v_empresa FROM books b
   WHERE EXISTS (SELECT 1 FROM bancos_horas h WHERE h.empresa_id = b.empresa_id)
   ORDER BY b.ano DESC, b.mes DESC LIMIT 1;
  IF v_book IS NULL THEN
    RAISE EXCEPTION 'Precondição: precisa de um Book de empresa com banco de horas';
  END IF;
  SELECT id INTO v_banco FROM bancos_horas WHERE empresa_id = v_empresa ORDER BY id LIMIT 1;
  SELECT h.id INTO v_de_fora FROM bancos_horas h JOIN empresas e ON e.id = h.empresa_id
   WHERE h.empresa_id <> v_empresa AND e.empresa_consolidadora_id IS DISTINCT FROM v_empresa LIMIT 1;
  SELECT h.id INTO v_consolidado FROM bancos_horas h JOIN empresas e ON e.id = h.empresa_id
   WHERE e.empresa_consolidadora_id = v_empresa LIMIT 1;

  v_um := jsonb_build_object('banco_id', v_banco, 'ordem', 1, 'nome_banco', 'Primeira',
                             'nome_empresa', 'EMPRESA', 'dados', '{"v": 1}'::jsonb);

  -- -------------------------------------------------------------------
  -- 1. Estrutura e segurança
  -- -------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'books_consumo_bancos' AND rowsecurity) THEN
    RAISE EXCEPTION 'books_consumo_bancos precisa existir com RLS habilitado';
  END IF;
  -- Leitura direta só por política de SELECT; gravação só pela função
  SELECT count(*) INTO v_n FROM pg_policies WHERE tablename = 'books_consumo_bancos';
  IF v_n <> 1 OR EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'books_consumo_bancos'
                                  AND (cmd <> 'SELECT' OR qual = 'true' OR 'anon' = ANY (roles))) THEN
    RAISE EXCEPTION 'books_consumo_bancos: uma política só, de SELECT, sem USING (true) e sem anon';
  END IF;

  SELECT count(*) INTO v_n FROM pg_proc
   WHERE proname IN ('gravar_consumo_bancos_do_book', 'consumo_bancos_do_book')
     AND pronamespace = 'public'::regnamespace AND prosecdef AND proconfig @> ARRAY['search_path=public'];
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'As funções do snapshot precisam de SECURITY DEFINER e search_path fixo';
  END IF;
  IF has_function_privilege('anon', 'public.gravar_consumo_bancos_do_book(uuid, jsonb)', 'execute')
     OR NOT has_function_privilege('authenticated', 'public.gravar_consumo_bancos_do_book(uuid, jsonb)', 'execute') THEN
    RAISE EXCEPTION 'Gravar o snapshot: authenticated sim (geração no navegador), anon não';
  END IF;
  -- A rota de impressão do PDF (Puppeteer, sem login) lê pelo id do Book
  IF NOT has_function_privilege('anon', 'public.consumo_bancos_do_book(uuid)', 'execute') THEN
    RAISE EXCEPTION 'Ler o snapshot pelo id do Book: liberado para a rota de impressão (anon)';
  END IF;

  -- -------------------------------------------------------------------
  -- 2. Gravação
  -- -------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_sem_acesso, 'role', 'authenticated')::text, true);
  v_falhou := false;
  BEGIN
    PERFORM gravar_consumo_bancos_do_book(v_book, jsonb_build_array(v_um));
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION 'Sem Edição na Geração de Books não grava o snapshot';
  END IF;

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  IF gravar_consumo_bancos_do_book(v_book, jsonb_build_array(v_um)) <> 1 THEN
    RAISE EXCEPTION 'Gravar devolve quantos bancos gravou';
  END IF;

  -- Gerar de novo troca as linhas do Book, sem duplicar
  PERFORM gravar_consumo_bancos_do_book(v_book, jsonb_build_array(v_um || '{"nome_banco": "Segunda"}'::jsonb));
  SELECT count(*) INTO v_n FROM books_consumo_bancos WHERE book_id = v_book;
  IF v_n <> 1 OR (SELECT nome_banco FROM books_consumo_bancos WHERE book_id = v_book) <> 'Segunda' THEN
    RAISE EXCEPTION 'Gerar o Book de novo troca as linhas do snapshot (há %)', v_n;
  END IF;

  -- O mesmo banco duas vezes no Book
  v_falhou := false;
  BEGIN
    PERFORM gravar_consumo_bancos_do_book(v_book, jsonb_build_array(v_um, v_um));
  EXCEPTION WHEN unique_violation OR check_violation THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION 'O mesmo banco duas vezes no Book precisa ser recusado';
  END IF;

  -- Banco de outra empresa, que não é consolidada da empresa do Book
  IF v_de_fora IS NOT NULL THEN
    v_falhou := false;
    BEGIN
      PERFORM gravar_consumo_bancos_do_book(v_book, jsonb_build_array(
        v_um || jsonb_build_object('banco_id', v_de_fora)));
    EXCEPTION WHEN check_violation THEN v_falhou := true;
    END;
    IF NOT v_falhou THEN
      RAISE EXCEPTION 'Banco de outra empresa (não consolidada) não entra no Book';
    END IF;
  END IF;

  -- Banco de consolidada entra, com a empresa dona dele (D-15)
  IF v_consolidado IS NOT NULL THEN
    PERFORM gravar_consumo_bancos_do_book(v_book, jsonb_build_array(
      v_um, v_um || jsonb_build_object('banco_id', v_consolidado, 'ordem', 2, 'nome_empresa', 'CONSOLIDADA')));
    IF (SELECT empresa_id FROM books_consumo_bancos WHERE book_id = v_book AND banco_id = v_consolidado)
       IS DISTINCT FROM (SELECT empresa_id FROM bancos_horas WHERE id = v_consolidado) THEN
      RAISE EXCEPTION 'O banco da consolidada fica com a empresa dona dele';
    END IF;
  END IF;

  -- -------------------------------------------------------------------
  -- 3. Leitura pela rota de impressão (anon)
  -- -------------------------------------------------------------------
  EXECUTE 'SET LOCAL ROLE anon';
  BEGIN
    SELECT count(*) INTO v_n FROM books_consumo_bancos;
  EXCEPTION WHEN insufficient_privilege THEN v_n := 0;
  END;
  SELECT to_jsonb(c) INTO v_linha FROM consumo_bancos_do_book(v_book) c ORDER BY c.ordem LIMIT 1;
  EXECUTE 'RESET ROLE';
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'O anônimo não lista a tabela do snapshot';
  END IF;
  IF v_linha ->> 'banco_id' IS DISTINCT FROM v_banco::text OR v_linha -> 'dados' IS NULL THEN
    RAISE EXCEPTION 'A rota de impressão lê o snapshot pelo id do Book (achei %)', v_linha;
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
