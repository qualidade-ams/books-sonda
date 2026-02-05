-- Migration: Corrigir função user_has_banco_horas_permission
-- Data: 2026-02-05
-- Descrição: Corrige erro "column p.group_id does not exist"

-- Remover função antiga
DROP FUNCTION IF EXISTS public.user_has_banco_horas_permission();

-- Criar função corrigida
-- A tabela profiles pode não ter group_id, então vamos buscar diretamente pelas permissões do usuário
CREATE OR REPLACE FUNCTION public.user_has_banco_horas_permission()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_uuid UUID;
  has_permission BOOLEAN;
BEGIN
  -- Obter UUID do usuário autenticado
  user_uuid := (SELECT auth.uid());
  
  -- Se não há usuário autenticado, negar acesso
  IF user_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar se o usuário tem permissão para qualquer tela de banco de horas
  -- Busca diretamente nas permissões sem depender de group_id em profiles
  SELECT EXISTS (
    SELECT 1
    FROM screen_permissions sp
    JOIN user_groups ug ON sp.group_id = ug.id
    JOIN profiles p ON p.id = user_uuid
    WHERE sp.screen_key IN ('controle_banco_horas', 'geracao_books_banco_horas', 'auditoria_banco_horas')
      AND sp.permission_level IN ('view', 'edit')
      AND (
        -- Verificar se o usuário pertence ao grupo
        EXISTS (
          SELECT 1 FROM user_group_members ugm
          WHERE ugm.user_id = user_uuid
            AND ugm.group_id = ug.id
        )
        -- OU se o perfil tem group_id (caso a coluna exista)
        OR (
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'profiles' 
                AND column_name = 'group_id'
            ) THEN p.id IN (
              SELECT id FROM profiles WHERE group_id = ug.id
            )
            ELSE FALSE
          END
        )
      )
  ) INTO has_permission;
  
  RETURN COALESCE(has_permission, FALSE);
END;
$$;

COMMENT ON FUNCTION public.user_has_banco_horas_permission() IS 
  'Verifica se o usuário autenticado tem permissão para acessar banco de horas. Compatível com diferentes estruturas de profiles.';
