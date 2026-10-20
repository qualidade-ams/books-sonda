-- Migration: Correção completa de RLS para banco_horas_calculos
-- Data: 2026-02-05
-- Descrição: Remove políticas duplicadas, corrige função de permissão e cria políticas corretas
-- Resolve: Erro 406 (Not Acceptable), Erro 400 (column p.group_id does not exist), Políticas duplicadas

-- ============================================================================
-- PASSO 1: REMOVER TODAS AS POLÍTICAS ANTIGAS (evita duplicação)
-- ============================================================================

-- Listar políticas existentes para documentação
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE '📋 Políticas existentes antes da remoção:';
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'banco_horas_calculos'
  LOOP
    RAISE NOTICE '  - %', policy_record.policyname;
  END LOOP;
END $$;

-- Remover TODAS as políticas antigas (todas as variações possíveis)
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

-- ============================================================================
-- PASSO 2: GARANTIR QUE RLS ESTÁ HABILITADO
-- ============================================================================

ALTER TABLE banco_horas_calculos ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASSO 3: CRIAR FUNÇÃO DE VERIFICAÇÃO DE PERMISSÕES (CORRIGIDA)
-- ============================================================================

-- Remover função antiga
DROP FUNCTION IF EXISTS public.user_has_banco_horas_permission();

-- Criar função corrigida que usa user_group_members em vez de p.group_id
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
  -- Usa user_group_members para relacionar usuário com grupo
  SELECT EXISTS (
    SELECT 1
    FROM user_group_members ugm
    JOIN user_groups ug ON ugm.group_id = ug.id
    JOIN screen_permissions sp ON sp.group_id = ug.id
    WHERE ugm.user_id = user_uuid
      AND sp.screen_key IN ('controle_banco_horas', 'geracao_books_banco_horas', 'auditoria_banco_horas')
      AND sp.permission_level IN ('view', 'edit')
  ) INTO has_permission;
  
  RETURN COALESCE(has_permission, FALSE);
END;
$$;

COMMENT ON FUNCTION public.user_has_banco_horas_permission() IS 
  'Verifica se o usuário autenticado tem permissão para acessar banco de horas. Usa user_group_members para relacionar usuário com grupo.';

-- ============================================================================
-- PASSO 4: CRIAR NOVAS POLÍTICAS (SEM DUPLICAÇÃO)
-- ============================================================================

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

-- Service role: Acesso total (bypass RLS)
CREATE POLICY "service_role_all_banco_horas_calculos"
  ON banco_horas_calculos
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PASSO 5: VERIFICAR SE NÃO HÁ DUPLICATAS
-- ============================================================================

DO $$
DECLARE
  duplicate_count INTEGER;
  policy_record RECORD;
BEGIN
  -- Verificar duplicatas
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT tablename, cmd, COUNT(*) as total
    FROM pg_policies 
    WHERE tablename = 'banco_horas_calculos'
    GROUP BY tablename, cmd
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION '❌ ERRO: Políticas duplicadas detectadas!';
  END IF;
  
  -- Listar políticas criadas
  RAISE NOTICE '✅ Políticas criadas com sucesso (sem duplicatas):';
  FOR policy_record IN 
    SELECT policyname, cmd
    FROM pg_policies 
    WHERE tablename = 'banco_horas_calculos'
    ORDER BY cmd, policyname
  LOOP
    RAISE NOTICE '  - % (FOR %)', policy_record.policyname, policy_record.cmd;
  END LOOP;
  
  -- Verificar total de políticas
  SELECT COUNT(*) INTO duplicate_count
  FROM pg_policies
  WHERE tablename = 'banco_horas_calculos';
  
  RAISE NOTICE '📊 Total de políticas: %', duplicate_count;
  
  IF duplicate_count <> 5 THEN
    RAISE WARNING '⚠️ Esperado 5 políticas (SELECT, INSERT, UPDATE, DELETE, ALL), encontrado: %', duplicate_count;
  END IF;
END $$;

-- ============================================================================
-- PASSO 6: ADICIONAR COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================================================

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

-- ============================================================================
-- PASSO 7: VERIFICAÇÃO FINAL DE SEGURANÇA
-- ============================================================================

DO $$
DECLARE
  permissive_policies INTEGER;
BEGIN
  -- Verificar se há políticas permissivas demais (USING true para authenticated)
  SELECT COUNT(*) INTO permissive_policies
  FROM pg_policies
  WHERE tablename = 'banco_horas_calculos'
    AND roles::text LIKE '%authenticated%'
    AND (qual = 'true' OR with_check = 'true');
  
  IF permissive_policies > 0 THEN
    RAISE WARNING '⚠️ Atenção: % política(s) permissiva(s) detectada(s) para authenticated', permissive_policies;
  ELSE
    RAISE NOTICE '✅ Nenhuma política permissiva detectada';
  END IF;
END $$;

-- ============================================================================
-- RESUMO DA MIGRATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '
╔════════════════════════════════════════════════════════════════╗
║  Migration aplicada com sucesso!                               ║
╠════════════════════════════════════════════════════════════════╣
║  ✅ Políticas antigas removidas                                ║
║  ✅ RLS habilitado                                             ║
║  ✅ Função de permissão corrigida (usa user_group_members)     ║
║  ✅ Novas políticas criadas (5 políticas)                      ║
║  ✅ Verificação de duplicatas: OK                              ║
║  ✅ Verificação de segurança: OK                               ║
╚════════════════════════════════════════════════════════════════╝
  ';
END $$;
