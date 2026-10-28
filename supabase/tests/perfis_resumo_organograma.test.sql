-- =====================================================================
-- Teste da migration 20261028000004_perfis_resumo_organograma
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz o que o teste gravou.
-- Qualquer outra mensagem de erro diz qual verificação falhou.
-- =====================================================================
DO $teste$
DECLARE
  v_admin uuid := (SELECT uga.user_id FROM user_group_assignments uga JOIN user_groups ug ON ug.id = uga.group_id
                    WHERE ug.name = 'Administradores' LIMIT 1);
  v_email_admin text;
  v_sem_acesso uuid := gen_random_uuid();
  v_r record;
  v_n int;
  v_falhou boolean;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Precondição: precisa de um usuário no grupo Administradores';
  END IF;
  SELECT email INTO v_email_admin FROM profiles WHERE id = v_admin;

  -- Continua segura e com todas as telas (inclusive a Comparação, migration 26)
  IF NOT EXISTS (SELECT 1 FROM pg_proc
                  WHERE proname = 'perfis_resumo' AND pronamespace = 'public'::regnamespace
                    AND prosecdef AND proconfig @> ARRAY['search_path=public']
                    AND prosrc LIKE '%''bancos_horas_comparacao''%'
                    AND prosrc LIKE '%''organizar_menu''%'
                    AND prosrc LIKE '%''empresas''%') THEN
    RAISE EXCEPTION 'perfis_resumo sem alguma das telas ou sem SECURITY DEFINER';
  END IF;
  IF has_function_privilege('anon', 'public.perfis_resumo(uuid[], text[])', 'execute') THEN
    RAISE EXCEPTION 'perfis_resumo executável por anon';
  END IF;

  -- Pessoa só no organograma (o Comercial não é usuário do sistema)
  INSERT INTO organizacao_estrutura (nome, cargo, departamento, email)
  VALUES ('Comercial Teste', 'Comercial', 'Comercial', 'comercial.teste@exemplo.invalid');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  SELECT * INTO v_r FROM perfis_resumo(NULL, ARRAY['COMERCIAL.TESTE@exemplo.invalid']);
  IF NOT FOUND OR v_r.full_name <> 'Comercial Teste' THEN
    PERFORM set_config('request.jwt.claims', '', true);
    RAISE EXCEPTION 'O nome do organograma não veio pelo e-mail: %', to_jsonb(v_r);
  END IF;

  -- Quem é usuário do sistema continua vindo do cadastro de usuários, uma vez só
  IF v_email_admin IS NOT NULL THEN
    INSERT INTO organizacao_estrutura (nome, cargo, departamento, email)
    VALUES ('Outro Nome', 'Comercial', 'Comercial', v_email_admin);
    SELECT count(*) INTO v_n FROM perfis_resumo(NULL, ARRAY[v_email_admin]);
    SELECT * INTO v_r FROM perfis_resumo(NULL, ARRAY[v_email_admin]);
    IF v_n <> 1 OR v_r.id <> v_admin THEN
      PERFORM set_config('request.jwt.claims', '', true);
      RAISE EXCEPTION 'Usuário do sistema veio duplicado ou pelo organograma';
    END IF;
  END IF;

  -- Busca só por id não traz ninguém do organograma
  SELECT count(*) INTO v_n FROM perfis_resumo(ARRAY[v_admin], NULL);
  PERFORM set_config('request.jwt.claims', '', true);
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Busca por id trouxe % linhas', v_n;
  END IF;

  -- Quem não vê nenhuma das telas continua sem acesso
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_sem_acesso, 'role', 'authenticated')::text, true);
  v_falhou := false;
  BEGIN PERFORM perfis_resumo(NULL, ARRAY['comercial.teste@exemplo.invalid']);
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  PERFORM set_config('request.jwt.claims', '', true);
  IF NOT v_falhou THEN
    RAISE EXCEPTION 'Usuário sem acesso leu nomes por perfis_resumo';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
