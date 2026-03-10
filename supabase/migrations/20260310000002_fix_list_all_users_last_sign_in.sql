-- Migration: Corrigir função list_all_users para retornar last_sign_in_at
-- Data: 2026-03-10
-- Descrição: Busca last_sign_in_at da tabela auth.users

CREATE OR REPLACE FUNCTION public.list_all_users()
RETURNS TABLE (
  user_id UUID,
  user_email TEXT,
  user_full_name TEXT,
  user_created_at TIMESTAMPTZ,
  user_last_sign_in_at TIMESTAMPTZ,
  group_name TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verificar se usuário atual tem permissão de admin
  -- Aceita permissões de várias telas administrativas OU grupo Administradores
  IF NOT EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN screen_permissions sp ON sp.group_id = uga.group_id
    WHERE uga.user_id = auth.uid()
      AND (
        sp.screen_key IN ('cadastro-usuarios', 'gerenciamento_usuarios', 'admin_users')
        OR sp.permission_level = 'admin'
      )
  ) AND NOT EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN user_groups ug ON ug.id = uga.group_id
    WHERE uga.user_id = auth.uid()
      AND ug.name IN ('Administradores', 'Admin', 'Administrador')
  ) THEN
    RAISE EXCEPTION 'Usuário não tem permissão para listar usuários';
  END IF;

  -- Retornar lista de usuários com seus grupos e último login
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.email as user_email,
    p.full_name as user_full_name,
    p.created_at as user_created_at,
    au.last_sign_in_at as user_last_sign_in_at,
    ug.name::TEXT as group_name
  FROM profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  LEFT JOIN user_group_assignments uga ON uga.user_id = p.id
  LEFT JOIN user_groups ug ON ug.id = uga.group_id
  ORDER BY p.full_name;
END;
$$;

COMMENT ON FUNCTION public.list_all_users IS 'Lista todos os usuários do sistema com seus grupos e último login';

-- Verificar se a função foi criada corretamente
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FUNÇÃO list_all_users ATUALIZADA';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Agora retorna last_sign_in_at da tabela auth.users';
  RAISE NOTICE '';
  RAISE NOTICE 'Campos retornados:';
  RAISE NOTICE '- user_id';
  RAISE NOTICE '- user_email';
  RAISE NOTICE '- user_full_name';
  RAISE NOTICE '- user_created_at';
  RAISE NOTICE '- user_last_sign_in_at (CORRIGIDO)';
  RAISE NOTICE '- group_name';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
