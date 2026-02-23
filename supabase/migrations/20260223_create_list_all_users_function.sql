-- Migration: Criar função RPC para listar usuários com verificação de permissões
-- Data: 2026-02-23
-- Descrição: Substitui o uso direto de supabaseAdmin no frontend por função RPC segura

-- Remover função antiga se existir
DROP FUNCTION IF EXISTS list_all_users();

-- Criar função para listar todos os usuários
CREATE OR REPLACE FUNCTION list_all_users()
RETURNS TABLE (
  user_id UUID,
  user_email TEXT,
  user_full_name TEXT,
  user_created_at TIMESTAMPTZ,
  user_last_sign_in_at TIMESTAMPTZ,
  group_name VARCHAR(100)  -- IMPORTANTE: Tipo deve corresponder exatamente à coluna user_groups.name
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  has_permission BOOLEAN;
BEGIN
  -- Obter ID do usuário atual
  current_user_id := (SELECT auth.uid());
  
  -- Verificar autenticação
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Verificar se o usuário tem permissão para gerenciar usuários
  SELECT EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN screen_permissions sp ON sp.group_id = uga.group_id
    WHERE uga.user_id = current_user_id
      AND sp.screen_key = 'cadastro-usuarios'
      AND sp.permission_level IN ('admin', 'edit', 'view')
  ) INTO has_permission;
  
  IF NOT has_permission THEN
    RAISE EXCEPTION 'Usuário não tem permissões para gerenciar usuários';
  END IF;
  
  -- Retornar lista de usuários com seus grupos
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.email as user_email,
    p.full_name as user_full_name,
    p.created_at as user_created_at,
    NULL::TIMESTAMPTZ as user_last_sign_in_at, -- Não temos acesso ao auth.users aqui
    ug.name as group_name
  FROM profiles p
  LEFT JOIN user_group_assignments uga ON uga.user_id = p.id
  LEFT JOIN user_groups ug ON ug.id = uga.group_id
  ORDER BY COALESCE(p.full_name, p.email);
END;
$$;

-- Adicionar comentário explicativo
COMMENT ON FUNCTION list_all_users() IS 
'Lista todos os usuários do sistema com verificação de permissões. 
Requer que o usuário autenticado tenha permissão para a tela cadastro-usuarios.
Retorna: user_id, user_email, user_full_name, user_created_at, user_last_sign_in_at, group_name';

-- Verificar se a função foi criada corretamente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_proc 
    WHERE proname = 'list_all_users'
  ) THEN
    RAISE EXCEPTION 'Função list_all_users não foi criada corretamente';
  END IF;
  
  RAISE NOTICE '✅ Função list_all_users criada com sucesso';
END $$;
