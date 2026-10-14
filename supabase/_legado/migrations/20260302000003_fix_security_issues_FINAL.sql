-- ============================================================================
-- Migration: Fix Security Issues - FINAL
-- Data: 2026-03-02
-- Descrição: Corrige todos os problemas de segurança identificados:
--   1. Função update_de_para_categoria_updated_at sem SECURITY DEFINER
--   2. Políticas RLS permissivas na tabela banco_horas_calculos
-- ============================================================================

-- ============================================================================
-- PROBLEMA 1: Função sem SECURITY DEFINER e SET search_path
-- ============================================================================

-- Remover função antiga
DROP FUNCTION IF EXISTS public.update_de_para_categoria_updated_at() CASCADE;

-- Recriar função com segurança adequada
CREATE OR REPLACE FUNCTION public.update_de_para_categoria_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;

-- Recriar trigger
DROP TRIGGER IF EXISTS trigger_update_de_para_categoria_updated_at ON de_para_categoria;

CREATE TRIGGER trigger_update_de_para_categoria_updated_at
  BEFORE UPDATE ON de_para_categoria
  FOR EACH ROW
  EXECUTE FUNCTION update_de_para_categoria_updated_at();

COMMENT ON FUNCTION public.update_de_para_categoria_updated_at() IS 
  'Atualiza automaticamente o campo atualizado_em. Usa SECURITY DEFINER e search_path fixo para segurança.';

-- ============================================================================
-- PROBLEMA 2: Políticas RLS permissivas em banco_horas_calculos
-- ============================================================================

-- PASSO 1: Listar e remover TODAS as políticas antigas
DROP POLICY IF EXISTS "authenticated_select_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "authenticated_insert_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "authenticated_update_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "authenticated_delete_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "allow_authenticated_select_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "allow_authenticated_insert_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "allow_authenticated_update_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "allow_authenticated_delete_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can view calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can insert calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can update calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can delete calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Authenticated users can view banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Authenticated users can insert banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Authenticated users can update banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Authenticated users can delete banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "service_role_all_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Service role can manage banco_horas_calculos" ON banco_horas_calculos;

-- PASSO 2: Garantir que RLS está habilitado
ALTER TABLE banco_horas_calculos ENABLE ROW LEVEL SECURITY;

-- PASSO 3: Criar função de verificação de permissões
CREATE OR REPLACE FUNCTION public.user_has_banco_horas_permission()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifica se o usuário tem permissão em qualquer tela de banco de horas
  RETURN EXISTS (
    SELECT 1
    FROM profiles p
    JOIN user_groups ug ON p.group_id = ug.id
    JOIN screen_permissions sp ON sp.group_id = ug.id
    WHERE p.id = (SELECT auth.uid())
      AND sp.screen_key IN (
        'controle_banco_horas',
        'banco_horas_alocacoes',
        'banco_horas_visao_consolidada',
        'banco_horas_visao_segmentada'
      )
      AND sp.permission_level IN ('view', 'edit')
  );
END;
$$;

COMMENT ON FUNCTION public.user_has_banco_horas_permission() IS 
  'Verifica se usuário tem permissão para acessar funcionalidades de banco de horas. Usa SECURITY DEFINER e search_path fixo.';

-- PASSO 4: Criar novas políticas RLS com verificação de permissões

-- SELECT: Usuários com permissão podem visualizar
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

-- PASSO 5: Adicionar comentários nas políticas
COMMENT ON POLICY "authenticated_select_banco_horas_calculos" ON banco_horas_calculos IS 
  'Permite SELECT apenas para usuários com permissão nas telas de banco de horas';

COMMENT ON POLICY "authenticated_insert_banco_horas_calculos" ON banco_horas_calculos IS 
  'Permite INSERT apenas para usuários com permissão nas telas de banco de horas';

COMMENT ON POLICY "authenticated_update_banco_horas_calculos" ON banco_horas_calculos IS 
  'Permite UPDATE apenas para usuários com permissão nas telas de banco de horas';

COMMENT ON POLICY "authenticated_delete_banco_horas_calculos" ON banco_horas_calculos IS 
  'Permite DELETE apenas para usuários com permissão nas telas de banco de horas';

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

-- Verificar se não há políticas duplicadas
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT tablename, cmd, COUNT(*) as total
    FROM pg_policies 
    WHERE tablename = 'banco_horas_calculos'
    GROUP BY tablename, cmd
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION '❌ ERRO: Políticas duplicadas detectadas em banco_horas_calculos!';
  END IF;
  
  RAISE NOTICE '✅ Sem duplicatas em banco_horas_calculos';
END $$;

-- Verificar se todas as funções têm SECURITY DEFINER
DO $$
DECLARE
  insecure_functions TEXT;
BEGIN
  SELECT string_agg(proname, ', ') INTO insecure_functions
  FROM pg_proc 
  WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND prokind = 'f'
    AND prosecdef = false
    AND proname IN ('update_de_para_categoria_updated_at', 'user_has_banco_horas_permission');
  
  IF insecure_functions IS NOT NULL THEN
    RAISE EXCEPTION '❌ ERRO: Funções sem SECURITY DEFINER: %', insecure_functions;
  END IF;
  
  RAISE NOTICE '✅ Todas as funções críticas têm SECURITY DEFINER';
END $$;

-- Verificar se políticas não são permissivas
DO $$
DECLARE
  permissive_policies TEXT;
BEGIN
  SELECT string_agg(policyname, ', ') INTO permissive_policies
  FROM pg_policies
  WHERE tablename = 'banco_horas_calculos'
    AND schemaname = 'public'
    AND (
      qual = 'true'::text OR 
      with_check = 'true'::text
    );
  
  IF permissive_policies IS NOT NULL THEN
    RAISE EXCEPTION '❌ ERRO: Políticas permissivas detectadas: %', permissive_policies;
  END IF;
  
  RAISE NOTICE '✅ Nenhuma política permissiva detectada';
END $$;

-- ============================================================================
-- COMENTÁRIO FINAL
-- ============================================================================

COMMENT ON TABLE banco_horas_calculos IS 
  'Tabela de cálculos de banco de horas - Segurança corrigida em 2026-03-02. Políticas RLS com verificação de permissões.';

-- ============================================================================
-- RESUMO DAS CORREÇÕES
-- ============================================================================
-- 
-- ✅ Função update_de_para_categoria_updated_at() agora tem:
--    - SECURITY DEFINER
--    - SET search_path = public
--
-- ✅ Tabela banco_horas_calculos agora tem:
--    - RLS habilitado
--    - 4 políticas (SELECT, INSERT, UPDATE, DELETE)
--    - Todas as políticas verificam permissões via user_has_banco_horas_permission()
--    - Nenhuma política permissiva (USING/WITH CHECK não são 'true')
--
-- ✅ Função user_has_banco_horas_permission() criada com:
--    - SECURITY DEFINER
--    - SET search_path = public
--    - Verificação de permissões nas telas de banco de horas
--
-- ============================================================================
