-- Migration: Corrigir função de verificação de permissão do organograma
-- Data: 2026-02-26
-- Descrição: Ajusta a função para usar a estrutura correta da tabela profiles

-- Recriar função com query dinâmica
CREATE OR REPLACE FUNCTION public.user_has_organograma_permission(required_level TEXT DEFAULT 'view')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id UUID;
  has_permission BOOLEAN;
  group_column_name TEXT;
BEGIN
  -- Obter ID do usuário autenticado
  user_id := (SELECT auth.uid());
  
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Detectar qual coluna usar (user_group_id ou group_id)
  SELECT column_name INTO group_column_name
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name IN ('user_group_id', 'group_id')
  LIMIT 1;
  
  IF group_column_name IS NULL THEN
    RAISE EXCEPTION 'Tabela profiles não tem coluna group_id nem user_group_id';
  END IF;
  
  -- Verificar permissão usando a coluna correta
  IF group_column_name = 'user_group_id' THEN
    SELECT EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_groups ug ON p.user_group_id = ug.id
      JOIN screen_permissions sp ON sp.group_id = ug.id
      WHERE p.id = user_id
        AND sp.screen_key = 'organograma'
        AND (
          (required_level = 'view' AND sp.permission_level IN ('view', 'edit')) OR
          (required_level = 'edit' AND sp.permission_level = 'edit')
        )
    ) INTO has_permission;
  ELSE
    SELECT EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_groups ug ON p.group_id = ug.id
      JOIN screen_permissions sp ON sp.group_id = ug.id
      WHERE p.id = user_id
        AND sp.screen_key = 'organograma'
        AND (
          (required_level = 'view' AND sp.permission_level IN ('view', 'edit')) OR
          (required_level = 'edit' AND sp.permission_level = 'edit')
        )
    ) INTO has_permission;
  END IF;
  
  RETURN has_permission;
END;
$$;

COMMENT ON FUNCTION public.user_has_organograma_permission IS 'Verifica se usuário tem permissão para acessar organograma. Detecta automaticamente se usa group_id ou user_group_id.';

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Função de permissão corrigida!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'A função agora detecta automaticamente:';
  RAISE NOTICE '- profiles.group_id';
  RAISE NOTICE '- profiles.user_group_id';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
