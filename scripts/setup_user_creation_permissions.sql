-- =====================================================
-- Script: Configuração de Permissões para Criação de Usuários
-- Descrição: Configura as permissões necessárias para o sistema de criação de usuários
-- Data: 2026-03-04
-- =====================================================

-- 1. Verificar se a tela de cadastro de usuários existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM screens WHERE key = 'cadastro-usuarios') THEN
    INSERT INTO screens (key, name, description, category, route)
    VALUES (
      'cadastro-usuarios',
      'Cadastro de Usuários',
      'Gerenciamento completo de usuários do sistema',
      'Administração',
      '/admin/user-management'
    );
    RAISE NOTICE '✅ Tela "Cadastro de Usuários" criada com sucesso';
  ELSE
    RAISE NOTICE '⚠️ Tela "Cadastro de Usuários" já existe';
  END IF;
END $$;

-- 2. Conceder permissões de edição para Administradores
DO $$
DECLARE
  v_admin_group_id UUID;
BEGIN
  -- Buscar ID do grupo Administradores
  SELECT id INTO v_admin_group_id
  FROM user_groups
  WHERE name = 'Administradores'
  LIMIT 1;

  IF v_admin_group_id IS NULL THEN
    RAISE EXCEPTION '❌ Grupo "Administradores" não encontrado. Crie o grupo primeiro.';
  END IF;

  -- Inserir ou atualizar permissão
  INSERT INTO screen_permissions (group_id, screen_key, permission_level)
  VALUES (v_admin_group_id, 'cadastro-usuarios', 'edit')
  ON CONFLICT (group_id, screen_key) 
  DO UPDATE SET permission_level = 'edit';

  RAISE NOTICE '✅ Permissões concedidas para grupo Administradores';
END $$;

-- 3. Verificar estrutura da tabela profiles
DO $$
BEGIN
  -- Verificar se coluna active existe
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'active'
  ) THEN
    ALTER TABLE profiles ADD COLUMN active BOOLEAN DEFAULT true;
    RAISE NOTICE '✅ Coluna "active" adicionada à tabela profiles';
  ELSE
    RAISE NOTICE '⚠️ Coluna "active" já existe na tabela profiles';
  END IF;

  -- Verificar se coluna full_name existe (já deve existir pela migration)
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'full_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN full_name TEXT;
    RAISE NOTICE '✅ Coluna "full_name" adicionada à tabela profiles';
  ELSE
    RAISE NOTICE '⚠️ Coluna "full_name" já existe na tabela profiles';
  END IF;
END $$;

-- 4. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(active);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 5. Verificar RLS na tabela profiles
DO $$
BEGIN
  -- Habilitar RLS se não estiver habilitado
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE tablename = 'profiles' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ RLS habilitado na tabela profiles';
  ELSE
    RAISE NOTICE '⚠️ RLS já está habilitado na tabela profiles';
  END IF;
END $$;

-- 6. Criar função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN user_groups ug ON uga.group_id = ug.id
    WHERE uga.user_id = (SELECT auth.uid())
      AND ug.name = 'Administradores'
  );
END;
$$;

COMMENT ON FUNCTION public.is_admin() IS 'Verifica se o usuário atual é administrador';

-- 7. Criar política RLS para leitura de profiles (apenas admins)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_admin());

-- 8. Criar política RLS para inserção de profiles (apenas admins via Edge Function)
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 9. Criar política RLS para atualização de profiles (apenas admins)
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;

CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 10. Verificar se função list_all_users existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_proc 
    WHERE proname = 'list_all_users'
  ) THEN
    RAISE NOTICE '⚠️ Função "list_all_users" não encontrada. Criando...';
    
    -- Criar função list_all_users
    CREATE OR REPLACE FUNCTION public.list_all_users()
    RETURNS TABLE (
      user_id UUID,
      user_email TEXT,
      user_full_name TEXT,
      user_created_at TIMESTAMPTZ,
      user_last_sign_in_at TIMESTAMPTZ,
      group_name TEXT
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    BEGIN
      -- Verificar se usuário é admin
      IF NOT is_admin() THEN
        RAISE EXCEPTION 'Você não tem permissões para listar usuários';
      END IF;

      RETURN QUERY
      SELECT 
        p.id as user_id,
        au.email as user_email,
        p.full_name as user_full_name,
        au.created_at as user_created_at,
        au.last_sign_in_at as user_last_sign_in_at,
        ug.name as group_name
      FROM profiles p
      JOIN auth.users au ON p.id = au.id
      LEFT JOIN user_group_assignments uga ON p.id = uga.user_id
      LEFT JOIN user_groups ug ON uga.group_id = ug.id
      ORDER BY au.created_at DESC;
    END;
    $func$;

    RAISE NOTICE '✅ Função "list_all_users" criada com sucesso';
  ELSE
    RAISE NOTICE '⚠️ Função "list_all_users" já existe';
  END IF;
END $$;

-- 11. Verificar se função admin_update_user existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_proc 
    WHERE proname = 'admin_update_user'
  ) THEN
    RAISE NOTICE '⚠️ Função "admin_update_user" não encontrada. Criando...';
    
    -- Criar função admin_update_user
    CREATE OR REPLACE FUNCTION public.admin_update_user(
      p_user_id UUID,
      p_email TEXT DEFAULT NULL,
      p_full_name TEXT DEFAULT NULL,
      p_group_id UUID DEFAULT NULL
    )
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    BEGIN
      -- Verificar se usuário é admin
      IF NOT is_admin() THEN
        RAISE EXCEPTION 'Você não tem permissões para atualizar usuários';
      END IF;

      -- Atualizar perfil
      UPDATE profiles
      SET 
        full_name = COALESCE(p_full_name, full_name),
        updated_at = NOW()
      WHERE id = p_user_id;

      -- Atualizar grupo se fornecido
      IF p_group_id IS NOT NULL THEN
        -- Deletar atribuição antiga
        DELETE FROM user_group_assignments WHERE user_id = p_user_id;
        
        -- Inserir nova atribuição
        INSERT INTO user_group_assignments (user_id, group_id, assigned_by)
        VALUES (p_user_id, p_group_id, (SELECT auth.uid()));
      END IF;

      RETURN true;
    END;
    $func$;

    RAISE NOTICE '✅ Função "admin_update_user" criada com sucesso';
  ELSE
    RAISE NOTICE '⚠️ Função "admin_update_user" já existe';
  END IF;
END $$;

-- 12. Relatório final
DO $$
DECLARE
  v_screen_exists BOOLEAN;
  v_permission_exists BOOLEAN;
  v_admin_group_exists BOOLEAN;
BEGIN
  -- Verificar tela
  SELECT EXISTS (SELECT 1 FROM screens WHERE key = 'cadastro-usuarios') INTO v_screen_exists;
  
  -- Verificar permissão
  SELECT EXISTS (
    SELECT 1 
    FROM screen_permissions sp
    JOIN user_groups ug ON sp.group_id = ug.id
    WHERE sp.screen_key = 'cadastro-usuarios'
    AND ug.name = 'Administradores'
  ) INTO v_permission_exists;
  
  -- Verificar grupo admin
  SELECT EXISTS (SELECT 1 FROM user_groups WHERE name = 'Administradores') INTO v_admin_group_exists;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RELATÓRIO DE CONFIGURAÇÃO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tela cadastrada: %', CASE WHEN v_screen_exists THEN '✅ SIM' ELSE '❌ NÃO' END;
  RAISE NOTICE 'Permissão configurada: %', CASE WHEN v_permission_exists THEN '✅ SIM' ELSE '❌ NÃO' END;
  RAISE NOTICE 'Grupo Administradores: %', CASE WHEN v_admin_group_exists THEN '✅ SIM' ELSE '❌ NÃO' END;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  IF v_screen_exists AND v_permission_exists AND v_admin_group_exists THEN
    RAISE NOTICE '✅ Configuração concluída com sucesso!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 PRÓXIMOS PASSOS:';
    RAISE NOTICE '1. Deploy da Edge Function "create-user"';
    RAISE NOTICE '   Comando: supabase functions deploy create-user';
    RAISE NOTICE '';
    RAISE NOTICE '2. Testar criação de usuário via interface';
    RAISE NOTICE '   Acesse: /admin/user-management';
  ELSE
    RAISE NOTICE '⚠️ Configuração incompleta. Verifique os erros acima.';
  END IF;
END $$;
