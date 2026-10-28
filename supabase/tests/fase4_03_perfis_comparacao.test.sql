-- =====================================================================
-- Teste da migration 20261028000003_fase4_perfis_comparacao
-- (docs/especificacoes/Modelagem_Fase4.md, seção 9).
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido". Qualquer outra mensagem de erro diz
-- qual verificação falhou.
-- =====================================================================
DO $teste$
DECLARE
  v_admin uuid := (SELECT uga.user_id FROM user_group_assignments uga JOIN user_groups ug ON ug.id = uga.group_id
                    WHERE ug.name = 'Administradores' LIMIT 1);
  v_sem_acesso uuid := gen_random_uuid();
  v_n int;
  v_falhou boolean;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Precondição: precisa de um usuário no grupo Administradores';
  END IF;

  -- A tela da Comparação está na lista, e a função continua segura
  IF NOT EXISTS (SELECT 1 FROM pg_proc
                  WHERE proname = 'perfis_resumo' AND pronamespace = 'public'::regnamespace
                    AND prosecdef AND proconfig @> ARRAY['search_path=public']
                    AND prosrc LIKE '%''bancos_horas_comparacao''%'
                    AND prosrc LIKE '%''organizar_menu''%') THEN
    RAISE EXCEPTION 'perfis_resumo sem a tela bancos_horas_comparacao, sem as telas da Fase 3 ou sem SECURITY DEFINER';
  END IF;
  IF has_function_privilege('anon', 'public.perfis_resumo(uuid[], text[])', 'execute') THEN
    RAISE EXCEPTION 'perfis_resumo executável por anon';
  END IF;

  -- Quem vê a Comparação lê o nome de quem validou
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO v_n FROM perfis_resumo(ARRAY[v_admin], NULL);
  PERFORM set_config('request.jwt.claims', '', true);
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Administrador não leu o próprio nome por perfis_resumo';
  END IF;

  -- Quem não vê nenhuma das telas continua sem acesso
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_sem_acesso, 'role', 'authenticated')::text, true);
  v_falhou := false;
  BEGIN PERFORM perfis_resumo(ARRAY[v_admin], NULL);
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  PERFORM set_config('request.jwt.claims', '', true);
  IF NOT v_falhou THEN
    RAISE EXCEPTION 'Usuário sem acesso leu nomes por perfis_resumo';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
