-- Migration: Corrigir erro 406 nas políticas RLS de banco_horas_versoes
-- Data: 2026-02-06
-- Descrição: Remove TODAS as políticas duplicadas e recria políticas corretas
--            com verificação de permissões baseada em screen_permissions
--
-- ⚠️ IMPORTANTE: Esta migration cria políticas RLS SEGURAS que verificam
--    se o usuário tem permissão nas telas 'controle_banco_horas' ou 'geracao_books'
--    antes de permitir acesso aos dados.
--
-- 🔒 Segurança: Usa função SECURITY DEFINER com search_path fixo para evitar
--    vulnerabilidades de injeção via search_path mutável.

-- =====================================================
-- PASSO 1: Remover TODAS as políticas antigas
-- =====================================================

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE '🗑️ Removendo todas as políticas antigas de banco_horas_versoes...';
  
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'banco_horas_versoes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON banco_horas_versoes', policy_record.policyname);
    RAISE NOTICE '  ✅ Removida: %', policy_record.policyname;
  END LOOP;
  
  RAISE NOTICE '✅ Todas as políticas antigas foram removidas!';
END $$;

-- =====================================================
-- PASSO 2: Garantir que RLS está habilitado
-- =====================================================

ALTER TABLE banco_horas_versoes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PASSO 3: Criar função auxiliar para verificar permissões
-- =====================================================

-- Função para verificar se usuário tem permissão de banco de horas
CREATE OR REPLACE FUNCTION public.user_has_banco_horas_permission()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se usuário tem permissão para tela de banco de horas
  RETURN EXISTS (
    SELECT 1
    FROM profiles p
    JOIN user_group_assignments uga ON p.id = uga.user_id
    JOIN screen_permissions sp ON sp.group_id = uga.group_id
    WHERE p.id = (SELECT auth.uid())
      AND sp.screen_key IN ('controle_banco_horas', 'geracao_books')
      AND sp.permission_level IN ('view', 'edit')
  );
END;
$$;

-- =====================================================
-- PASSO 4: Criar políticas RLS seguras baseadas em permissões
-- =====================================================

-- SELECT: Usuários com permissão podem visualizar versões
CREATE POLICY "authenticated_select_banco_horas_versoes"
  ON banco_horas_versoes
  FOR SELECT
  TO authenticated
  USING (user_has_banco_horas_permission());

-- INSERT: Usuários com permissão podem criar versões
CREATE POLICY "authenticated_insert_banco_horas_versoes"
  ON banco_horas_versoes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_has_banco_horas_permission());

-- UPDATE: Usuários com permissão podem atualizar versões
CREATE POLICY "authenticated_update_banco_horas_versoes"
  ON banco_horas_versoes
  FOR UPDATE
  TO authenticated
  USING (user_has_banco_horas_permission())
  WITH CHECK (user_has_banco_horas_permission());

-- DELETE: Usuários com permissão de edição podem excluir versões
CREATE POLICY "authenticated_delete_banco_horas_versoes"
  ON banco_horas_versoes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_group_assignments uga ON p.id = uga.user_id
      JOIN screen_permissions sp ON sp.group_id = uga.group_id
      WHERE p.id = (SELECT auth.uid())
        AND sp.screen_key IN ('controle_banco_horas', 'geracao_books')
        AND sp.permission_level = 'edit'
    )
  );

-- =====================================================
-- PASSO 5: Verificar se não há duplicatas
-- =====================================================

DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT tablename, cmd, COUNT(*) as total
    FROM pg_policies 
    WHERE tablename = 'banco_horas_versoes'
    GROUP BY tablename, cmd
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION '❌ ERRO: Políticas duplicadas encontradas!';
  END IF;
  
  RAISE NOTICE '✅ Sem duplicatas - políticas RLS corretas!';
END $$;

-- =====================================================
-- PASSO 6: Validação final
-- =====================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'banco_horas_versoes';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Políticas RLS de banco_horas_versoes corrigidas!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Total de políticas criadas: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔒 RLS habilitado: banco_horas_versoes';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Erro 406 deve estar resolvido!';
  RAISE NOTICE '';
END $$;
