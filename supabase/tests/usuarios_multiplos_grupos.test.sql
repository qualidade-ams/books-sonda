-- =====================================================================
-- Teste da migration 20261020000002_usuarios_multiplos_grupos.
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou.
-- Qualquer outra mensagem de erro diz qual verificação falhou.
-- =====================================================================
DO $teste$
DECLARE
  v_admin uuid := (SELECT uga.user_id FROM user_group_assignments uga JOIN user_groups ug ON ug.id = uga.group_id
                    WHERE ug.name = 'Administradores' LIMIT 1);
  v_comum uuid := (SELECT uga.user_id FROM user_group_assignments uga
                    WHERE NOT EXISTS (SELECT 1 FROM user_group_assignments x JOIN screen_permissions sp ON sp.group_id = x.group_id
                                       WHERE x.user_id = uga.user_id AND sp.screen_key = 'usuarios-grupos'
                                         AND sp.permission_level = 'edit')
                    LIMIT 1);
  v_sem_acesso uuid;
  v_com_edicao uuid;
  v_n int;
  v_linha record;
  v_falhou boolean;
BEGIN
  IF v_admin IS NULL OR v_comum IS NULL THEN
    RAISE EXCEPTION 'Precondição: precisa de um administrador e de um usuário sem edição em usuarios-grupos';
  END IF;

  -- 1. Estrutura: um usuário pode ter vários grupos, mas não o mesmo grupo duas vezes
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.user_group_assignments'::regclass
              AND pg_get_constraintdef(oid) = 'UNIQUE (user_id)') THEN
    RAISE EXCEPTION 'Ainda existe UNIQUE (user_id) em user_group_assignments';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.user_group_assignments'::regclass
                  AND pg_get_constraintdef(oid) = 'UNIQUE (user_id, group_id)') THEN
    RAISE EXCEPTION 'Falta UNIQUE (user_id, group_id) em user_group_assignments';
  END IF;

  -- 2. set_user_groups: SECURITY DEFINER, search_path fixo, sem EXECUTE para anon
  IF NOT (SELECT prosecdef FROM pg_proc WHERE oid = 'public.set_user_groups(uuid, uuid[])'::regprocedure) THEN
    RAISE EXCEPTION 'set_user_groups não é SECURITY DEFINER';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid = 'public.set_user_groups(uuid, uuid[])'::regprocedure
                  AND 'search_path=public' = ANY (proconfig)) THEN
    RAISE EXCEPTION 'set_user_groups sem search_path fixo';
  END IF;
  IF has_function_privilege('anon', 'public.set_user_groups(uuid, uuid[])', 'execute') THEN
    RAISE EXCEPTION 'set_user_groups executável por anon';
  END IF;

  -- Dois grupos de teste: um sem acesso a requerimentos, outro com edição
  INSERT INTO user_groups (name, description) VALUES ('TESTE sem acesso', 'teste') RETURNING id INTO v_sem_acesso;
  INSERT INTO user_groups (name, description) VALUES ('TESTE com edição', 'teste') RETURNING id INTO v_com_edicao;
  INSERT INTO screen_permissions (group_id, screen_key, permission_level) VALUES
    (v_sem_acesso, 'lancar_requerimentos', 'none'),
    (v_com_edicao, 'lancar_requerimentos', 'edit');

  PERFORM set_config('role', 'authenticated', true);

  -- 3. Quem não tem edição em usuarios-grupos não altera grupos
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_comum, 'role', 'authenticated')::text, true);
  v_falhou := false;
  BEGIN PERFORM set_user_groups(v_comum, ARRAY[v_com_edicao]);
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Usuário sem permissão conseguiu alterar grupos'; END IF;

  -- 4. Administrador atribui dois grupos (ids repetidos contam uma vez)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  PERFORM set_user_groups(v_comum, ARRAY[v_sem_acesso, v_com_edicao, v_com_edicao]);

  SELECT count(*) INTO v_n FROM user_group_assignments WHERE user_id = v_comum;
  IF v_n <> 2 THEN RAISE EXCEPTION 'Esperava 2 grupos atribuídos, achei %', v_n; END IF;
  IF EXISTS (SELECT 1 FROM user_group_assignments WHERE user_id = v_comum AND assigned_by IS DISTINCT FROM v_admin) THEN
    RAISE EXCEPTION 'assigned_by não é o usuário logado';
  END IF;

  -- 5. Lista de usuários: uma linha por usuário, com todos os grupos
  SELECT count(*) INTO v_n FROM list_all_users() WHERE user_id = v_comum;
  IF v_n <> 1 THEN RAISE EXCEPTION 'list_all_users devolveu % linhas para o usuário com 2 grupos', v_n; END IF;
  SELECT * INTO v_linha FROM list_all_users() WHERE user_id = v_comum;
  IF NOT (v_linha.group_ids @> ARRAY[v_sem_acesso, v_com_edicao] AND cardinality(v_linha.group_ids) = 2) THEN
    RAISE EXCEPTION 'list_all_users: group_ids incorreto (%)', v_linha.group_ids;
  END IF;
  IF NOT (v_linha.group_names @> ARRAY['TESTE sem acesso', 'TESTE com edição']) THEN
    RAISE EXCEPTION 'list_all_users: group_names incorreto (%)', v_linha.group_names;
  END IF;
  IF v_linha.group_name IS NULL THEN
    RAISE EXCEPTION 'list_all_users: group_name (compatibilidade) ficou vazio';
  END IF;

  -- 6. Permissão é a maior entre os grupos (none + edit = edit)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_comum, 'role', 'authenticated')::text, true);
  IF NOT user_has_requerimentos_permission('edit') THEN
    RAISE EXCEPTION 'user_has_requerimentos_permission não usou o maior nível entre os grupos';
  END IF;
  IF NOT has_screen_permission('lancar_requerimentos'::varchar, 'edit'::varchar) THEN
    RAISE EXCEPTION 'has_screen_permission não usou o maior nível entre os grupos';
  END IF;

  -- 7. Substituição: remove o que saiu da lista; lista vazia tira todos
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  PERFORM set_user_groups(v_comum, ARRAY[v_com_edicao]);
  IF (SELECT array_agg(group_id) FROM user_group_assignments WHERE user_id = v_comum) <> ARRAY[v_com_edicao] THEN
    RAISE EXCEPTION 'Substituição não deixou só o grupo informado';
  END IF;
  PERFORM set_user_groups(v_comum, ARRAY[]::uuid[]);
  IF EXISTS (SELECT 1 FROM user_group_assignments WHERE user_id = v_comum) THEN
    RAISE EXCEPTION 'Lista vazia não removeu os grupos';
  END IF;

  -- 8. Grupo inexistente é recusado
  v_falhou := false;
  BEGIN PERFORM set_user_groups(v_comum, ARRAY[gen_random_uuid()]);
  EXCEPTION WHEN no_data_found THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou grupo inexistente'; END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
