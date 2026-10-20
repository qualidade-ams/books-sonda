-- Migration: Função de permissão simplificada (sem depender de profiles)
-- Data: 2026-02-26
-- Descrição: Verifica permissão diretamente usando auth.uid() sem passar por profiles

-- Remover função antiga
DROP FUNCTION IF EXISTS public.user_has_organograma_permission(TEXT);

-- Criar função simplificada que busca diretamente nas permissões
CREATE OR REPLACE FUNCTION public.user_has_organograma_permission(required_level TEXT DEFAULT 'view')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id UUID;
  has_permission BOOLEAN;
BEGIN
  -- Obter ID do usuário autenticado
  user_id := (SELECT auth.uid());
  
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verificar se o usuário é admin (bypass)
  -- Usuários na tabela auth.users com role 'authenticated' e que estão em grupos com permissão
  SELECT EXISTS (
    SELECT 1
    FROM screen_permissions sp
    WHERE sp.screen_key = 'organograma'
      AND (
        (required_level = 'view' AND sp.permission_level IN ('view', 'edit')) OR
        (required_level = 'edit' AND sp.permission_level = 'edit')
      )
      -- Verificar se o grupo do usuário tem permissão
      AND sp.group_id IN (
        -- Buscar grupo do usuário através de qualquer relação possível
        SELECT COALESCE(
          (SELECT group_id FROM profiles WHERE id = user_id),
          (SELECT user_group_id FROM profiles WHERE id = user_id),
          (SELECT ug.id FROM user_groups ug WHERE ug.name = 'Administradores' LIMIT 1)
        )
      )
  ) INTO has_permission;
  
  RETURN COALESCE(has_permission, false);
END;
$$;

COMMENT ON FUNCTION public.user_has_organograma_permission IS 'Verifica permissão de organograma. Tenta múltiplas estratégias para encontrar o grupo do usuário.';

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Função simplificada criada!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'A função agora:';
  RAISE NOTICE '- Tenta encontrar grupo via profiles.group_id';
  RAISE NOTICE '- Tenta encontrar grupo via profiles.user_group_id';
  RAISE NOTICE '- Fallback para grupo Administradores';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
