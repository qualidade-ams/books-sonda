-- Usuário em mais de um grupo
--
-- A permissão efetiva é o maior nível entre os grupos (edit > view > none):
-- um grupo nunca tira acesso dado por outro. has_screen_permission, is_admin
-- e o sync-api já calculam assim; aqui só sai a trava de um grupo por usuário.
--
-- 1. UNIQUE (user_id) vira UNIQUE (user_id, group_id)
-- 2. set_user_groups: substitui os grupos de um usuário numa chamada só
--    (exige edição em usuarios-grupos, a mesma regra da RLS da tabela)
-- 3. list_all_users: uma linha por usuário, com group_ids/group_names;
--    group_name continua (nomes separados por vírgula) para o frontend antigo
-- 4. user_has_requerimentos_permission: LIMIT 1 sem ORDER BY pegava um grupo
--    qualquer; agora pega o maior nível
--
-- RLS de user_group_assignments não muda.

-- 1. Estrutura
ALTER TABLE public.user_group_assignments
  DROP CONSTRAINT IF EXISTS user_group_assignments_user_id_key;

ALTER TABLE public.user_group_assignments
  ADD CONSTRAINT user_group_assignments_user_id_group_id_key UNIQUE (user_id, group_id);

-- 2. Substituir os grupos de um usuário
CREATE OR REPLACE FUNCTION public.set_user_groups(p_user_id uuid, p_group_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_autor uuid := (SELECT auth.uid());
  v_ids uuid[] := COALESCE(
    (SELECT array_agg(DISTINCT g) FROM unnest(p_group_ids) g WHERE g IS NOT NULL),
    ARRAY[]::uuid[]
  );
BEGIN
  IF v_autor IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT has_screen_permission('usuarios-grupos'::varchar, 'edit'::varchar) THEN
    RAISE EXCEPTION 'Usuário não tem permissão para alterar grupos de usuários'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não informado';
  END IF;

  IF EXISTS (SELECT 1 FROM unnest(v_ids) g WHERE NOT EXISTS (SELECT 1 FROM user_groups ug WHERE ug.id = g)) THEN
    RAISE EXCEPTION 'Grupo não encontrado' USING ERRCODE = 'no_data_found';
  END IF;

  DELETE FROM user_group_assignments
   WHERE user_id = p_user_id
     AND (group_id IS NULL OR NOT (group_id = ANY (v_ids)));

  INSERT INTO user_group_assignments (user_id, group_id, assigned_by, updated_by, assigned_at)
  SELECT p_user_id, g, v_autor, v_autor, NOW()
    FROM unnest(v_ids) g
  ON CONFLICT (user_id, group_id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.set_user_groups(uuid, uuid[]) IS
  'Substitui os grupos do usuário pela lista informada (lista vazia remove todos). Exige edição em usuarios-grupos.';

REVOKE ALL ON FUNCTION public.set_user_groups(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_groups(uuid, uuid[]) TO authenticated, service_role;

-- 3. Lista de usuários com todos os grupos (mudou o retorno: precisa DROP)
DROP FUNCTION IF EXISTS public.list_all_users();

CREATE FUNCTION public.list_all_users()
RETURNS TABLE (
  user_id uuid,
  user_email text,
  user_full_name text,
  user_active boolean,
  user_created_at timestamptz,
  user_last_sign_in_at timestamptz,
  group_name text,
  group_ids uuid[],
  group_names text[]
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Verificar se usuário atual tem permissão de admin
  IF NOT EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN screen_permissions sp ON sp.group_id = uga.group_id
    WHERE uga.user_id = (SELECT auth.uid())
      AND (
        sp.screen_key IN ('cadastro-usuarios', 'gerenciamento_usuarios', 'admin_users')
        OR sp.permission_level = 'admin'
      )
  ) AND NOT EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN user_groups ug ON ug.id = uga.group_id
    WHERE uga.user_id = (SELECT auth.uid())
      AND ug.name IN ('Administradores', 'Admin', 'Administrador')
  ) THEN
    RAISE EXCEPTION 'Usuário não tem permissão para listar usuários';
  END IF;

  RETURN QUERY
  SELECT
    p.id                     AS user_id,
    p.email                  AS user_email,
    p.full_name              AS user_full_name,
    COALESCE(p.active, true) AS user_active,
    p.created_at             AS user_created_at,
    p.last_sign_in_at        AS user_last_sign_in_at,
    string_agg(ug.name::text, ', ' ORDER BY ug.name)::text AS group_name,
    COALESCE(array_agg(ug.id ORDER BY ug.name) FILTER (WHERE ug.id IS NOT NULL), ARRAY[]::uuid[]) AS group_ids,
    COALESCE(array_agg(ug.name::text ORDER BY ug.name) FILTER (WHERE ug.id IS NOT NULL), ARRAY[]::text[]) AS group_names
  FROM profiles p
  LEFT JOIN user_group_assignments uga ON uga.user_id = p.id
  LEFT JOIN user_groups ug ON ug.id = uga.group_id
  GROUP BY p.id
  ORDER BY p.full_name;
END;
$$;

COMMENT ON FUNCTION public.list_all_users() IS
  'Lista todos os usuários com status, grupos (group_ids/group_names) e último login. Requer permissão admin.';

REVOKE ALL ON FUNCTION public.list_all_users() FROM PUBLIC;
GRANT ALL ON FUNCTION public.list_all_users() TO authenticated;
GRANT ALL ON FUNCTION public.list_all_users() TO service_role;

-- 4. Requerimentos: maior nível entre os grupos
CREATE OR REPLACE FUNCTION public.user_has_requerimentos_permission(required_level text DEFAULT 'view'::text)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  user_permission text;
BEGIN
  SELECT sp.permission_level INTO user_permission
  FROM user_group_assignments uga
  JOIN user_groups ug ON uga.group_id = ug.id
  JOIN screen_permissions sp ON sp.group_id = ug.id
  WHERE uga.user_id = (SELECT auth.uid())
    AND sp.screen_key = 'lancar_requerimentos'
  ORDER BY
    CASE sp.permission_level
      WHEN 'admin' THEN 4
      WHEN 'edit' THEN 3
      WHEN 'view' THEN 2
      WHEN 'none' THEN 1
      ELSE 0
    END DESC
  LIMIT 1;

  IF user_permission IS NULL THEN
    RETURN false;
  END IF;

  CASE required_level
    WHEN 'view' THEN RETURN user_permission IN ('view', 'edit', 'admin');
    WHEN 'edit' THEN RETURN user_permission IN ('edit', 'admin');
    WHEN 'admin' THEN RETURN user_permission = 'admin';
    ELSE RETURN false;
  END CASE;
END;
$$;
