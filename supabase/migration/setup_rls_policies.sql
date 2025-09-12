-- Script para configurar políticas RLS para o sistema de gerenciamento de usuários
-- Execute este script no SQL Editor do Supabase

-- 1. Habilitar RLS na tabela profiles (se ainda não estiver habilitado)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Política para permitir que service_role insira perfis
CREATE POLICY "Service role can insert profiles" ON profiles
FOR INSERT TO service_role
WITH CHECK (true);

-- 3. Política para permitir que service_role atualize perfis
CREATE POLICY "Service role can update profiles" ON profiles
FOR UPDATE TO service_role
USING (true)
WITH CHECK (true);

-- 4. Política para permitir que service_role leia perfis
CREATE POLICY "Service role can read profiles" ON profiles
FOR SELECT TO service_role
USING (true);

-- 5. Política para permitir que usuários leiam seus próprios perfis
CREATE POLICY "Users can read own profile" ON profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

-- 6. Política para permitir que usuários atualizem seus próprios perfis
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE TO authenticated
USING ((SELECT auth.uid() AS uid) = id)
WITH CHECK ((SELECT auth.uid() AS uid) = id);

-- 7. Verificar se existe trigger para criar perfil automaticamente
-- Se não existir, criar um trigger que cria o perfil quando um usuário é criado

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 8. Políticas para tabelas de grupos e permissões (se necessário)

-- Habilitar RLS nas tabelas relacionadas
ALTER TABLE user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_group_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE screen_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas para service_role acessar todas as tabelas
CREATE POLICY "Service role full access user_groups" ON user_groups
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access user_group_assignments" ON user_group_assignments
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access screen_permissions" ON screen_permissions
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Políticas para usuários autenticados lerem suas próprias informações
CREATE POLICY "Users can read own group assignments" ON user_group_assignments
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can read group info" ON user_groups
FOR SELECT TO authenticated
USING (
  id IN (
    SELECT group_id FROM user_group_assignments 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can read relevant permissions" ON screen_permissions
FOR SELECT TO authenticated
USING (
  group_id IN (
    SELECT group_id FROM user_group_assignments 
    WHERE user_id = auth.uid()
  )
);

-- 9. Verificar se as políticas foram criadas corretamente
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('profiles', 'user_groups', 'user_group_assignments', 'screen_permissions')
ORDER BY tablename, policyname;