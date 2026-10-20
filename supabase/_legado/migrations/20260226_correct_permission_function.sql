-- Migration: Função de permissão correta baseada na estrutura real
-- Data: 2026-02-26
-- Descrição: Cria função que busca grupo do usuário através de user_group_assignments

-- Primeiro, verificar se existe tabela de relacionamento usuário-grupo
DO $$
DECLARE
  has_user_group_assignments BOOLEAN;
  has_user_groups_users BOOLEAN;
BEGIN
  -- Verificar tabela user_group_assignments
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'user_group_assignments'
  ) INTO has_user_group_assignments;
  
  -- Verificar tabela user_groups_users
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'user_groups_users'
  ) INTO has_user_groups_users;
  
  RAISE NOTICE 'Tabelas de relacionamento encontradas:';
  RAISE NOTICE '- user_group_assignments: %', has_user_group_assignments;
  RAISE NOTICE '- user_groups_users: %', has_user_groups_users;
END $$;

-- Remover função antiga
DROP FUNCTION IF EXISTS public.user_has_organograma_permission(TEXT);

-- Criar função que busca grupo através de user_group_assignments
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
  
  -- Verificar permissão através de user_group_assignments
  SELECT EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN user_groups ug ON uga.group_id = ug.id
    JOIN screen_permissions sp ON sp.group_id = ug.id
    WHERE uga.user_id = user_id
      AND sp.screen_key = 'organograma'
      AND (
        (required_level = 'view' AND sp.permission_level IN ('view', 'edit')) OR
        (required_level = 'edit' AND sp.permission_level = 'edit')
      )
  ) INTO has_permission;
  
  RETURN COALESCE(has_permission, false);
END;
$$;

COMMENT ON FUNCTION public.user_has_organograma_permission IS 'Verifica permissão de organograma através de user_group_assignments';

-- Recriar políticas RLS com a função correta
DROP POLICY IF EXISTS "temp_authenticated_select_organizacao" ON public.organizacao_estrutura;
DROP POLICY IF EXISTS "temp_authenticated_insert_organizacao" ON public.organizacao_estrutura;
DROP POLICY IF EXISTS "temp_authenticated_update_organizacao" ON public.organizacao_estrutura;
DROP POLICY IF EXISTS "temp_authenticated_delete_organizacao" ON public.organizacao_estrutura;

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

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Função de permissão corrigida!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'A função agora usa:';
  RAISE NOTICE '- user_group_assignments para relacionar usuário-grupo';
  RAISE NOTICE '- screen_permissions para verificar permissões';
  RAISE NOTICE '';
  RAISE NOTICE 'Políticas RLS restauradas com segurança:';
  RAISE NOTICE '- SELECT: Requer permissão view ou edit';
  RAISE NOTICE '- INSERT: Requer permissão edit';
  RAISE NOTICE '- UPDATE: Requer permissão edit';
  RAISE NOTICE '- DELETE: Requer permissão edit';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Sistema de organograma está seguro!';
  RAISE NOTICE '========================================';
END $$;
