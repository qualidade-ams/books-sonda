-- Migration: Corrigir políticas RLS da tabela banco_horas_versoes
-- Autor: Kiro Architect
-- Data: 2026-02-18
-- Descrição: Corrige políticas RLS para permitir inserção de versões por usuários autenticados
--            mantendo segurança através de verificação de permissões

-- =====================================================
-- PASSO 1: Verificar políticas duplicadas (CRÍTICO)
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
    RAISE NOTICE '⚠️ Políticas duplicadas detectadas! Removendo...';
  ELSE
    RAISE NOTICE '✅ Sem políticas duplicadas';
  END IF;
END $$;

-- =====================================================
-- PASSO 2: Remover TODAS as políticas antigas
-- =====================================================
DROP POLICY IF EXISTS "Users can view versoes" ON banco_horas_versoes;
DROP POLICY IF EXISTS "Users can insert versoes" ON banco_horas_versoes;
DROP POLICY IF EXISTS "Authenticated users can view versoes" ON banco_horas_versoes;
DROP POLICY IF EXISTS "Admins can insert versoes" ON banco_horas_versoes;
DROP POLICY IF EXISTS "authenticated_select_versoes" ON banco_horas_versoes;
DROP POLICY IF EXISTS "authenticated_insert_versoes" ON banco_horas_versoes;

-- =====================================================
-- PASSO 3: Garantir RLS habilitado
-- =====================================================
ALTER TABLE banco_horas_versoes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PASSO 4: Criar função de verificação de permissões
-- =====================================================
CREATE OR REPLACE FUNCTION public.user_can_manage_banco_horas()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifica se usuário tem permissão para gerenciar banco de horas
  -- Usa caminho correto: profiles → user_group_assignments → screen_permissions
  -- Aceita usuários com permissão 'edit' ou 'view' na tela 'controle_banco_horas'
  RETURN EXISTS (
    SELECT 1
    FROM profiles p
    JOIN user_group_assignments uga ON p.id = uga.user_id
    JOIN screen_permissions sp ON sp.group_id = uga.group_id
    WHERE p.id = (SELECT auth.uid())
      AND sp.screen_key = 'controle_banco_horas'
      AND sp.permission_level IN ('view', 'edit')
  );
END;
$$;

COMMENT ON FUNCTION public.user_can_manage_banco_horas() IS 
'Verifica se usuário autenticado tem permissão para gerenciar banco de horas. 
Usa caminho correto: profiles → user_group_assignments → screen_permissions.
Usa SECURITY DEFINER e search_path fixo para segurança.';

-- =====================================================
-- PASSO 5: Criar novas políticas RLS (OTIMIZADAS)
-- =====================================================

-- Policy SELECT: Usuários com permissão podem visualizar versões
CREATE POLICY "authenticated_select_versoes"
  ON banco_horas_versoes FOR SELECT
  TO authenticated
  USING (user_can_manage_banco_horas());

-- Policy INSERT: Usuários com permissão podem criar versões
CREATE POLICY "authenticated_insert_versoes"
  ON banco_horas_versoes FOR INSERT
  TO authenticated
  WITH CHECK (user_can_manage_banco_horas());

-- =====================================================
-- PASSO 6: Verificar se não há duplicatas
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
    RAISE EXCEPTION '❌ ERRO: Políticas duplicadas detectadas após criação!';
  END IF;
  
  RAISE NOTICE '✅ Políticas RLS criadas com sucesso (sem duplicatas)';
END $$;

-- =====================================================
-- PASSO 7: Validação de segurança
-- =====================================================
DO $$
BEGIN
  -- Verificar se RLS está habilitado
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename = 'banco_horas_versoes' 
      AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION '❌ ERRO: RLS não está habilitado!';
  END IF;
  
  -- Verificar se há políticas criadas
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'banco_horas_versoes'
  ) THEN
    RAISE EXCEPTION '❌ ERRO: Nenhuma política RLS encontrada!';
  END IF;
  
  RAISE NOTICE '✅ Validação de segurança concluída';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Resumo da Migration:';
  RAISE NOTICE '   ✅ Políticas antigas removidas';
  RAISE NOTICE '   ✅ Função de verificação criada (SECURITY DEFINER)';
  RAISE NOTICE '   ✅ Novas políticas RLS criadas (otimizadas)';
  RAISE NOTICE '   ✅ RLS habilitado e validado';
  RAISE NOTICE '   ✅ Sem políticas duplicadas';
  RAISE NOTICE '';
END $$;
