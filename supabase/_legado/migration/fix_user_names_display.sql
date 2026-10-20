-- Migration para corrigir exibição de nomes de usuários
-- Cria função RPC para buscar usuários do auth.users

------------------------------------------------------
-- 1. Criar função para buscar usuários por IDs
------------------------------------------------------
CREATE OR REPLACE FUNCTION get_users_by_ids(user_ids UUID[])
RETURNS TABLE (
  id UUID,
  email TEXT,
  raw_user_meta_data JSONB
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.raw_user_meta_data
  FROM auth.users u
  WHERE u.id = ANY(user_ids);
END;
$$;

-- Conceder permissão para usuários autenticados
GRANT EXECUTE ON FUNCTION get_users_by_ids(UUID[]) TO authenticated;

COMMENT ON FUNCTION get_users_by_ids(UUID[]) IS 'Busca informações de usuários por IDs - usado para exibir nomes de autores de requerimentos';

------------------------------------------------------
-- 2. Atualizar profiles com dados do auth.users
------------------------------------------------------
-- Garantir que todos os usuários do auth.users estejam no profiles
INSERT INTO profiles (id, email, full_name)
SELECT 
  u.id,
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    u.email
  ) as full_name
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = u.id
);

-- Atualizar profiles existentes que não têm full_name
UPDATE profiles p
SET full_name = COALESCE(
  u.raw_user_meta_data->>'full_name',
  u.raw_user_meta_data->>'name',
  u.email
)
FROM auth.users u
WHERE p.id = u.id
  AND (p.full_name IS NULL OR p.full_name = '');

------------------------------------------------------
-- 3. Verificação
------------------------------------------------------
SELECT 
  'Profiles atualizados' as status,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN full_name IS NOT NULL AND full_name != '' THEN 1 END) as com_nome,
  COUNT(CASE WHEN full_name IS NULL OR full_name = '' THEN 1 END) as sem_nome
FROM profiles;
