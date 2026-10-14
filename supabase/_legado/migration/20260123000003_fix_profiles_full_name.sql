-- Migration: Garantir que todos os usuários tenham full_name preenchido
-- Data: 2026-01-23
-- Descrição: Atualiza profiles para garantir que full_name esteja preenchido
--            para exibição correta de nomes de usuários no histórico de reajustes

------------------------------------------------------
-- 1. Garantir que todos os usuários do auth.users estejam no profiles
------------------------------------------------------
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
)
ON CONFLICT (id) DO NOTHING;

------------------------------------------------------
-- 2. Atualizar profiles existentes que não têm full_name
------------------------------------------------------
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
DO $$
DECLARE
  total_profiles INTEGER;
  com_nome INTEGER;
  sem_nome INTEGER;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(CASE WHEN full_name IS NOT NULL AND full_name != '' THEN 1 END),
    COUNT(CASE WHEN full_name IS NULL OR full_name = '' THEN 1 END)
  INTO total_profiles, com_nome, sem_nome
  FROM profiles;
  
  RAISE NOTICE '✅ Profiles atualizados:';
  RAISE NOTICE '   Total: %', total_profiles;
  RAISE NOTICE '   Com nome: %', com_nome;
  RAISE NOTICE '   Sem nome: %', sem_nome;
END $$;

COMMENT ON TABLE profiles IS 'Perfis de usuários com full_name sempre preenchido (fallback para email)';
