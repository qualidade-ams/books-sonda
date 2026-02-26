-- Migration: Corrigir ambiguidade de user_id na função
-- Data: 2026-02-26
-- Descrição: Renomeia variável para evitar conflito com coluna da tabela

-- Remover políticas que dependem da função
DROP POLICY IF EXISTS "authenticated_select_organizacao" ON public.organizacao_estrutura;
DROP POLICY IF EXISTS "authenticated_insert_organizacao" ON public.organizacao_estrutura;
DROP POLICY IF EXISTS "authenticated_update_organizacao" ON public.organizacao_estrutura;
DROP POLICY IF EXISTS "authenticated_delete_organizacao" ON public.organizacao_estrutura;

-- Remover função antiga
DROP FUNCTION IF EXISTS public.user_has_organograma_permission(TEXT);

-- Criar função com nome de variável diferente
CREATE OR REPLACE FUNCTION public.user_has_organograma_permission(required_level TEXT DEFAULT 'view')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  has_permission BOOLEAN;
BEGIN
  -- Obter ID do usuário autenticado
  current_user_id := (SELECT auth.uid());
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verificar permissão através de user_group_assignments
  SELECT EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN user_groups ug ON uga.group_id = ug.id
    JOIN screen_permissions sp ON sp.group_id = ug.id
    WHERE uga.user_id = current_user_id
      AND sp.screen_key = 'organograma'
      AND (
        (required_level = 'view' AND sp.permission_level IN ('view', 'edit')) OR
        (required_level = 'edit' AND sp.permission_level = 'edit')
      )
  ) INTO has_permission;
  
  RETURN COALESCE(has_permission, false);
END;
$$;

COMMENT ON FUNCTION public.user_has_organograma_permission IS 'Verifica permissão de organograma. Usa current_user_id para evitar ambiguidade.';

-- Recriar políticas RLS
CREATE POLICY "authenticated_select_organizacao"
  ON public.organizacao_estrutura FOR SELECT
  TO authenticated
  USING (user_has_organograma_permission('view'));

CREATE POLICY "authenticated_insert_organizacao"
  ON public.organizacao_estrutura FOR INSERT
  TO authenticated
  WITH CHECK (user_has_organograma_permission('edit'));

CREATE POLICY "authenticated_update_organizacao"
  ON public.organizacao_estrutura FOR UPDATE
  TO authenticated
  USING (user_has_organograma_permission('edit'));

CREATE POLICY "authenticated_delete_organizacao"
  ON public.organizacao_estrutura FOR DELETE
  TO authenticated
  USING (user_has_organograma_permission('edit'));

-- Conceder permissão ao grupo Administradores
INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, 'organograma', 'edit'
FROM user_groups ug 
WHERE ug.name = 'Administradores'
ON CONFLICT (group_id, screen_key) 
DO UPDATE SET permission_level = 'edit';

-- Conceder permissão ao primeiro grupo do usuário atual (se existir)
DO $$
DECLARE
  user_group_id UUID;
  current_user_id UUID;
BEGIN
  current_user_id := (SELECT auth.uid());
  
  IF current_user_id IS NOT NULL THEN
    -- Buscar primeiro grupo do usuário
    SELECT uga.group_id INTO user_group_id
    FROM user_group_assignments uga
    WHERE uga.user_id = current_user_id
    LIMIT 1;
    
    IF user_group_id IS NOT NULL THEN
      -- Conceder permissão de edição
      INSERT INTO screen_permissions (group_id, screen_key, permission_level)
      VALUES (user_group_id, 'organograma', 'edit')
      ON CONFLICT (group_id, screen_key) 
      DO UPDATE SET permission_level = 'edit';
      
      RAISE NOTICE '✅ Permissão de edição concedida ao seu grupo!';
    ELSE
      RAISE NOTICE '⚠️ Usuário não está em nenhum grupo.';
    END IF;
  END IF;
END $$;

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Função corrigida e permissões concedidas!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Correções aplicadas:';
  RAISE NOTICE '- Variável renomeada para current_user_id';
  RAISE NOTICE '- Políticas RLS recriadas';
  RAISE NOTICE '- Permissão concedida ao grupo Administradores';
  RAISE NOTICE '- Permissão concedida ao seu grupo (se existir)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Sistema pronto para uso!';
  RAISE NOTICE '========================================';
END $$;
