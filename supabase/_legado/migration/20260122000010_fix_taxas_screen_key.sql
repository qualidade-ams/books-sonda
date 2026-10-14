-- Migration: Corrigir screen_key das políticas RLS de taxas
-- Data: 2026-01-22
-- Descrição: Corrige inconsistência no screen_key usado nas políticas RLS
--            O screen_key correto é 'cadastro_taxas_clientes' (não 'cadastro_taxas')

-- =====================================================
-- PROBLEMA IDENTIFICADO:
-- =====================================================
-- A migration 20260122000007_fix_rls_security_issues.sql criou políticas
-- usando screen_key = 'cadastro_taxas', mas o screen_key correto registrado
-- na tabela screens é 'cadastro_taxas_clientes'.
--
-- Isso causa erro: "new row violates row-level security policy"
-- porque a verificação de permissão falha ao não encontrar a tela.

-- =====================================================
-- SOLUÇÃO: Recriar políticas com screen_key correto
-- =====================================================

-- =====================================================
-- PARTE 1: Corrigir políticas de taxas_clientes
-- =====================================================

-- Remover políticas com screen_key incorreto
DROP POLICY IF EXISTS "taxas_clientes_insert_with_permission" ON taxas_clientes;
DROP POLICY IF EXISTS "taxas_clientes_update_with_permission" ON taxas_clientes;
DROP POLICY IF EXISTS "taxas_clientes_delete_with_permission" ON taxas_clientes;

-- Criar políticas com screen_key correto: 'cadastro_taxas_clientes'

-- INSERT: Apenas usuários com permissão podem inserir
CREATE POLICY "taxas_clientes_insert_with_permission" ON taxas_clientes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM screen_permissions sp
      JOIN user_groups ug ON sp.group_id = ug.id
      JOIN user_group_assignments uga ON ug.id = uga.group_id
      WHERE uga.user_id = (SELECT auth.uid())
      AND sp.screen_key = 'cadastro_taxas_clientes'  -- ✅ CORRIGIDO
      AND sp.permission_level IN ('edit', 'admin')
    )
  );

-- UPDATE: Apenas usuários com permissão podem atualizar
CREATE POLICY "taxas_clientes_update_with_permission" ON taxas_clientes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM screen_permissions sp
      JOIN user_groups ug ON sp.group_id = ug.id
      JOIN user_group_assignments uga ON ug.id = uga.group_id
      WHERE uga.user_id = (SELECT auth.uid())
      AND sp.screen_key = 'cadastro_taxas_clientes'  -- ✅ CORRIGIDO
      AND sp.permission_level IN ('edit', 'admin')
    )
  );

-- DELETE: Apenas usuários com permissão podem deletar
CREATE POLICY "taxas_clientes_delete_with_permission" ON taxas_clientes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM screen_permissions sp
      JOIN user_groups ug ON sp.group_id = ug.id
      JOIN user_group_assignments uga ON ug.id = uga.group_id
      WHERE uga.user_id = (SELECT auth.uid())
      AND sp.screen_key = 'cadastro_taxas_clientes'  -- ✅ CORRIGIDO
      AND sp.permission_level = 'admin'
    )
  );

-- Log
DO $
BEGIN
  RAISE NOTICE '✅ Políticas de taxas_clientes corrigidas (screen_key: cadastro_taxas_clientes)';
END $;

-- =====================================================
-- PARTE 2: Corrigir políticas de valores_taxas_funcoes
-- =====================================================

-- Remover políticas com screen_key incorreto
DROP POLICY IF EXISTS "valores_taxas_insert_with_permission" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "valores_taxas_update_with_permission" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "valores_taxas_delete_with_permission" ON valores_taxas_funcoes;

-- Criar políticas com screen_key correto: 'cadastro_taxas_clientes'

-- INSERT: Apenas usuários com permissão podem inserir
CREATE POLICY "valores_taxas_insert_with_permission" ON valores_taxas_funcoes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM screen_permissions sp
      JOIN user_groups ug ON sp.group_id = ug.id
      JOIN user_group_assignments uga ON ug.id = uga.group_id
      WHERE uga.user_id = (SELECT auth.uid())
      AND sp.screen_key = 'cadastro_taxas_clientes'  -- ✅ CORRIGIDO
      AND sp.permission_level IN ('edit', 'admin')
    )
  );

-- UPDATE: Apenas usuários com permissão podem atualizar
CREATE POLICY "valores_taxas_update_with_permission" ON valores_taxas_funcoes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM screen_permissions sp
      JOIN user_groups ug ON sp.group_id = ug.id
      JOIN user_group_assignments uga ON ug.id = uga.group_id
      WHERE uga.user_id = (SELECT auth.uid())
      AND sp.screen_key = 'cadastro_taxas_clientes'  -- ✅ CORRIGIDO
      AND sp.permission_level IN ('edit', 'admin')
    )
  );

-- DELETE: Apenas usuários com permissão podem deletar
CREATE POLICY "valores_taxas_delete_with_permission" ON valores_taxas_funcoes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM screen_permissions sp
      JOIN user_groups ug ON sp.group_id = ug.id
      JOIN user_group_assignments uga ON ug.id = uga.group_id
      WHERE uga.user_id = (SELECT auth.uid())
      AND sp.screen_key = 'cadastro_taxas_clientes'  -- ✅ CORRIGIDO
      AND sp.permission_level = 'admin'
    )
  );

-- Log
DO $
BEGIN
  RAISE NOTICE '✅ Políticas de valores_taxas_funcoes corrigidas (screen_key: cadastro_taxas_clientes)';
END $;

-- =====================================================
-- PARTE 3: Verificação final
-- =====================================================

DO $
DECLARE
  screen_exists BOOLEAN;
  admin_permission_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 VERIFICAÇÃO DE CONFIGURAÇÃO';
  RAISE NOTICE '================================';
  RAISE NOTICE '';
  
  -- Verificar se a tela existe
  SELECT EXISTS (
    SELECT 1 FROM screens WHERE key = 'cadastro_taxas_clientes'
  ) INTO screen_exists;
  
  IF screen_exists THEN
    RAISE NOTICE '✅ Tela cadastro_taxas_clientes existe';
  ELSE
    RAISE NOTICE '⚠️ Tela cadastro_taxas_clientes NÃO existe';
  END IF;
  
  -- Verificar se há permissões para administradores
  SELECT EXISTS (
    SELECT 1 FROM screen_permissions sp
    JOIN user_groups ug ON sp.group_id = ug.id
    WHERE sp.screen_key = 'cadastro_taxas_clientes'
    AND ug.is_default_admin = true
    AND sp.permission_level IN ('edit', 'admin')
  ) INTO admin_permission_exists;
  
  IF admin_permission_exists THEN
    RAISE NOTICE '✅ Administradores têm permissão edit/admin';
  ELSE
    RAISE NOTICE '⚠️ Administradores NÃO têm permissão edit/admin';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '📋 Políticas atualizadas:';
  RAISE NOTICE '  - taxas_clientes: INSERT, UPDATE, DELETE';
  RAISE NOTICE '  - valores_taxas_funcoes: INSERT, UPDATE, DELETE';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Screen Key Correto: cadastro_taxas_clientes';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Correção de screen_key aplicada com sucesso!';
  RAISE NOTICE '';
END $;
