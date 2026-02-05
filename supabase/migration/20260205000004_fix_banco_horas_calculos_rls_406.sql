-- Migration: Corrigir erro 406 na tabela banco_horas_calculos
-- Data: 2026-02-05
-- Descrição: Remove políticas RLS problemáticas e cria políticas baseadas em permissões

-- 1. Remover todas as políticas existentes que podem estar causando conflito
DROP POLICY IF EXISTS "Users can view own banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can insert own banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can update own banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can delete own banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Authenticated users can view banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Authenticated users can insert banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Authenticated users can update banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Authenticated users can delete banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Service role can manage banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "authenticated_select_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "authenticated_insert_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "authenticated_update_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "authenticated_delete_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "service_role_all_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can view calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can insert calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can update calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can delete calculos" ON banco_horas_calculos;

-- 2. Garantir que RLS está habilitado
ALTER TABLE banco_horas_calculos ENABLE ROW LEVEL SECURITY;

-- 3. Criar função auxiliar para verificar permissões de banco de horas
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
  -- Verifica se o usuário pertence a um grupo com permissão 'view' ou 'edit'
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    JOIN user_groups ug ON p.group_id = ug.id
    JOIN screen_permissions sp ON sp.group_id = ug.id
    WHERE p.id = user_uuid
      AND sp.screen_key IN ('controle_banco_horas', 'geracao_books_banco_horas', 'auditoria_banco_horas')
      AND sp.permission_level IN ('view', 'edit')
  ) INTO has_permission;
  
  RETURN COALESCE(has_permission, FALSE);
END;
$$;

COMMENT ON FUNCTION public.user_has_banco_horas_permission() IS 
  'Verifica se o usuário autenticado tem permissão para acessar banco de horas através das telas: controle_banco_horas, geracao_books_banco_horas ou auditoria_banco_horas';

-- 4. Criar políticas baseadas em permissões
-- SELECT: Usuários com permissão 'view' ou 'edit' podem visualizar
CREATE POLICY "authenticated_select_banco_horas_calculos"
  ON banco_horas_calculos
  FOR SELECT
  TO authenticated
  USING (user_has_banco_horas_permission());

-- INSERT: Usuários com permissão podem inserir
CREATE POLICY "authenticated_insert_banco_horas_calculos"
  ON banco_horas_calculos
  FOR INSERT
  TO authenticated
  WITH CHECK (user_has_banco_horas_permission());

-- UPDATE: Usuários com permissão podem atualizar
CREATE POLICY "authenticated_update_banco_horas_calculos"
  ON banco_horas_calculos
  FOR UPDATE
  TO authenticated
  USING (user_has_banco_horas_permission())
  WITH CHECK (user_has_banco_horas_permission());

-- DELETE: Usuários com permissão podem deletar
CREATE POLICY "authenticated_delete_banco_horas_calculos"
  ON banco_horas_calculos
  FOR DELETE
  TO authenticated
  USING (user_has_banco_horas_permission());

-- 5. Adicionar política para service_role (bypass RLS)
CREATE POLICY "service_role_all_banco_horas_calculos"
  ON banco_horas_calculos
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. Verificar se as políticas foram criadas corretamente
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'banco_horas_calculos';
  
  IF policy_count < 5 THEN
    RAISE EXCEPTION 'Erro: Políticas RLS não foram criadas corretamente. Total: %', policy_count;
  END IF;
  
  RAISE NOTICE '✅ Políticas RLS criadas com sucesso. Total: %', policy_count;
END $$;

-- 7. Comentários para documentação
COMMENT ON POLICY "authenticated_select_banco_horas_calculos" ON banco_horas_calculos IS 
  'Permite que usuários com permissão nas telas de banco de horas visualizem os cálculos';

COMMENT ON POLICY "authenticated_insert_banco_horas_calculos" ON banco_horas_calculos IS 
  'Permite que usuários com permissão nas telas de banco de horas insiram novos cálculos';

COMMENT ON POLICY "authenticated_update_banco_horas_calculos" ON banco_horas_calculos IS 
  'Permite que usuários com permissão nas telas de banco de horas atualizem cálculos';

COMMENT ON POLICY "authenticated_delete_banco_horas_calculos" ON banco_horas_calculos IS 
  'Permite que usuários com permissão nas telas de banco de horas deletem cálculos';

COMMENT ON POLICY "service_role_all_banco_horas_calculos" ON banco_horas_calculos IS 
  'Permite que service_role tenha acesso total (bypass RLS)';
