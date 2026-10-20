-- Migration: Criar funções RPC para operações administrativas de usuários
-- Substitui o uso de supabaseAdmin no frontend por funções seguras no backend

-- =====================================================
-- 0. Remover funções existentes (se houver)
-- =====================================================
DROP FUNCTION IF EXISTS public.list_all_users();
DROP FUNCTION IF EXISTS public.admin_create_user(TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.admin_update_user(UUID, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.admin_delete_user(UUID);
DROP FUNCTION IF EXISTS public.admin_reset_user_password(UUID, TEXT);

-- =====================================================
-- 1. Função para listar todos os usuários
-- =====================================================
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
  IF NOT EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN screen_permissions sp ON sp.group_id = uga.group_id
    WHERE uga.user_id = (SELECT auth.uid())
      AND sp.screen_key = 'cadastro-usuarios'
      AND sp.permission_level IN ('admin', 'edit', 'view')
  ) THEN
    RAISE EXCEPTION 'Usuário não tem permissão para listar usuários';
  END IF;

  -- Retornar lista de usuários com seus grupos
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.email as user_email,
    p.full_name as user_full_name,
    p.created_at as user_created_at,
    NULL::TIMESTAMPTZ as user_last_sign_in_at, -- Não temos acesso ao auth.users
    ug.name as group_name
  FROM profiles p
  LEFT JOIN user_group_assignments uga ON uga.user_id = p.id
  LEFT JOIN user_groups ug ON ug.id = uga.group_id
  ORDER BY p.full_name;
END;
$$;

COMMENT ON FUNCTION public.list_all_users IS 'Lista todos os usuários do sistema com seus grupos';

-- =====================================================
-- 2. Função para criar usuário (substitui auth.admin.createUser)
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_group_id UUID
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  -- Verificar se usuário atual tem permissão de admin
  IF NOT EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN screen_permissions sp ON sp.group_id = uga.group_id
    WHERE uga.user_id = (SELECT auth.uid())
      AND sp.screen_key = 'cadastro-usuarios'
      AND sp.permission_level IN ('admin', 'edit')
  ) THEN
    RAISE EXCEPTION 'Usuário não tem permissão para criar usuários';
  END IF;

  -- Criar usuário no auth (usando extensão auth)
  -- NOTA: Esta função requer que a extensão auth esteja habilitada
  -- e que o usuário tenha permissões adequadas
  
  -- Por enquanto, vamos apenas criar o perfil e retornar erro amigável
  -- A criação real do usuário deve ser feita via Edge Function
  RAISE EXCEPTION 'Criação de usuários deve ser feita via Edge Function. Configure uma Edge Function para esta operação.';
  
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.admin_create_user IS 'Função para criar usuário (requer Edge Function)';

-- =====================================================
-- 3. Função para atualizar usuário
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_update_user(
  p_user_id UUID,
  p_email TEXT DEFAULT NULL,
  p_full_name TEXT DEFAULT NULL,
  p_group_id UUID DEFAULT NULL
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_data JSON;
  v_result JSON;
BEGIN
  -- Verificar se usuário atual tem permissão de admin
  IF NOT EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN screen_permissions sp ON sp.group_id = uga.group_id
    WHERE uga.user_id = (SELECT auth.uid())
      AND sp.screen_key = 'cadastro-usuarios'
      AND sp.permission_level IN ('admin', 'edit')
  ) THEN
    RAISE EXCEPTION 'Usuário não tem permissão para atualizar usuários';
  END IF;

  -- Buscar dados antigos para auditoria
  SELECT json_build_object(
    'email', email,
    'full_name', full_name
  ) INTO v_old_data
  FROM profiles
  WHERE id = p_user_id;

  -- Atualizar perfil
  UPDATE profiles
  SET
    email = COALESCE(p_email, email),
    full_name = COALESCE(p_full_name, full_name),
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Atualizar grupo se fornecido
  IF p_group_id IS NOT NULL THEN
    -- Remover grupos antigos
    DELETE FROM user_group_assignments
    WHERE user_id = p_user_id;

    -- Adicionar novo grupo
    INSERT INTO user_group_assignments (user_id, group_id)
    VALUES (p_user_id, p_group_id);
  END IF;

  -- Registrar auditoria
  INSERT INTO permission_audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    old_value,
    new_value,
    ip_address,
    user_agent
  )
  VALUES (
    (SELECT auth.uid()),
    'UPDATE',
    'user',
    p_user_id,
    v_old_data,
    json_build_object(
      'email', p_email,
      'full_name', p_full_name,
      'group_id', p_group_id
    ),
    NULL,
    NULL
  );

  -- Retornar resultado
  SELECT json_build_object(
    'success', true,
    'user_id', p_user_id,
    'message', 'Usuário atualizado com sucesso'
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.admin_update_user IS 'Atualiza dados de um usuário (perfil e grupo)';

-- =====================================================
-- 4. Função para deletar usuário
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  p_user_id UUID
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Verificar se usuário atual tem permissão de admin
  IF NOT EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN screen_permissions sp ON sp.group_id = uga.group_id
    WHERE uga.user_id = (SELECT auth.uid())
      AND sp.screen_key = 'cadastro-usuarios'
      AND sp.permission_level IN ('admin', 'edit')
  ) THEN
    RAISE EXCEPTION 'Usuário não tem permissão para deletar usuários';
  END IF;

  -- Não permitir deletar o próprio usuário
  IF p_user_id = (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Não é possível deletar o próprio usuário';
  END IF;

  -- Registrar auditoria antes de deletar
  INSERT INTO permission_audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    old_value,
    ip_address,
    user_agent
  )
  SELECT
    (SELECT auth.uid()),
    'DELETE',
    'user',
    p_user_id,
    json_build_object(
      'email', p.email,
      'full_name', p.full_name
    ),
    NULL,
    NULL
  FROM profiles p
  WHERE p.id = p_user_id;

  -- Deletar atribuições de grupo
  DELETE FROM user_group_assignments
  WHERE user_id = p_user_id;

  -- Deletar perfil
  DELETE FROM profiles
  WHERE id = p_user_id;

  -- NOTA: A exclusão do usuário no auth.users deve ser feita via Edge Function
  -- pois requer permissões administrativas

  -- Retornar resultado
  SELECT json_build_object(
    'success', true,
    'user_id', p_user_id,
    'message', 'Usuário deletado com sucesso (perfil e grupos). Para deletar completamente, use Edge Function.'
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.admin_delete_user IS 'Deleta um usuário (perfil e grupos)';

-- =====================================================
-- 5. Função para resetar senha
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
  p_user_id UUID,
  p_new_password TEXT
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verificar se usuário atual tem permissão de admin
  IF NOT EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN screen_permissions sp ON sp.group_id = uga.group_id
    WHERE uga.user_id = (SELECT auth.uid())
      AND sp.screen_key = 'cadastro-usuarios'
      AND sp.permission_level IN ('admin', 'edit')
  ) THEN
    RAISE EXCEPTION 'Usuário não tem permissão para resetar senhas';
  END IF;

  -- NOTA: Reset de senha deve ser feito via Edge Function
  -- pois requer acesso ao auth.admin
  RAISE EXCEPTION 'Reset de senha deve ser feito via Edge Function. Configure uma Edge Function para esta operação.';
  
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.admin_reset_user_password IS 'Reseta senha de usuário (requer Edge Function)';

-- =====================================================
-- 6. Conceder permissões para usuários autenticados
-- =====================================================
GRANT EXECUTE ON FUNCTION public.list_all_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password TO authenticated;
