-- Migration para corrigir políticas RLS da tabela profiles
-- Remove políticas conflitantes e cria política única que permite ver todos os perfis

------------------------------------------------------
-- 1. Remover políticas antigas conflitantes
------------------------------------------------------
DROP POLICY IF EXISTS "Usuários podem ver todos os perfis" ON profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can update profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can read profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

------------------------------------------------------
-- 2. Criar políticas corretas e não conflitantes
------------------------------------------------------

-- Política para leitura: usuários autenticados podem ver TODOS os perfis
-- Isso é necessário para exibir nomes de autores de requerimentos
CREATE POLICY "authenticated_users_can_read_all_profiles" ON profiles
FOR SELECT 
TO authenticated
USING (true);

-- Política para atualização: usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "users_can_update_own_profile" ON profiles
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Política para inserção: apenas service_role pode inserir (via trigger)
CREATE POLICY "service_role_can_insert_profiles" ON profiles
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Política para service_role ter acesso total (backup/admin)
CREATE POLICY "service_role_full_access" ON profiles
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

------------------------------------------------------
-- 3. Garantir que RLS está habilitado
------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

------------------------------------------------------
-- 4. Verificação
------------------------------------------------------
SELECT 
  'Políticas RLS da tabela profiles' as status,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Testar se consegue ler todos os perfis
SELECT 
  'Teste de leitura de profiles' as status,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN full_name IS NOT NULL AND full_name != '' THEN 1 END) as com_nome
FROM profiles;
