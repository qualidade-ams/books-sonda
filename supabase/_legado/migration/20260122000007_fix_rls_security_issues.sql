-- Migration: Corrigir problemas de segurança RLS
-- Data: 2026-01-22
-- Descrição: Habilita RLS e corrige políticas que permitem acesso irrestrito

-- PROBLEMAS IDENTIFICADOS pelo Supabase:
-- 1. banco_horas_calculos: RLS não habilitado (mas tem políticas)
-- 2. elogios: Políticas permitem acesso irrestrito para authenticated
-- 3. taxas_clientes: Políticas permitem acesso irrestrito para authenticated
-- 4. valores_taxas_funcoes: Políticas permitem acesso irrestrito para authenticated

-- =====================================================
-- PARTE 1: Habilitar RLS em banco_horas_calculos
-- =====================================================

-- Habilitar RLS
ALTER TABLE banco_horas_calculos ENABLE ROW LEVEL SECURITY;

-- Log
DO $$
BEGIN
  RAISE NOTICE '✅ RLS habilitado em banco_horas_calculos';
END $$;

-- =====================================================
-- PARTE 2: Corrigir políticas de elogios
-- =====================================================

-- Remover políticas antigas que permitem acesso irrestrito
DROP POLICY IF EXISTS "elogios_authenticated_delete" ON elogios;
DROP POLICY IF EXISTS "elogios_authenticated_insert" ON elogios;
DROP POLICY IF EXISTS "elogios_authenticated_update" ON elogios;
DROP POLICY IF EXISTS "elogios_authenticated_select" ON elogios;

-- Criar políticas corretas baseadas em permissões
-- SELECT: Todos os usuários autenticados podem visualizar
CREATE POLICY "elogios_select_authenticated" ON elogios
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Apenas usuários com permissão podem inserir
CREATE POLICY "elogios_insert_with_permission" ON elogios
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM screen_permissions sp
      JOIN user_groups ug ON sp.group_id = ug.id
      JOIN user_group_assignments uga ON ug.id = uga.group_id
      WHERE uga.user_id = (SELECT auth.uid())
      AND sp.screen_key = 'lancar_elogios'
      AND sp.permission_level IN ('edit', 'admin')
    )
  );

-- UPDATE: Apenas usuários com permissão podem atualizar
CREATE POLICY "elogios_update_with_permission" ON elogios
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM screen_permissions sp
      JOIN user_groups ug ON sp.group_id = ug.id
      JOIN user_group_assignments uga ON ug.id = uga.group_id
      WHERE uga.user_id = (SELECT auth.uid())
      AND sp.screen_key = 'lancar_elogios'
      AND sp.permission_level IN ('edit', 'admin')
    )
  );

-- DELETE: Apenas usuários com permissão podem deletar
CREATE POLICY "elogios_delete_with_permission" ON elogios
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM screen_permissions sp
      JOIN user_groups ug ON sp.group_id = ug.id
      JOIN user_group_assignments uga ON ug.id = uga.group_id
      WHERE uga.user_id = (SELECT auth.uid())
      AND sp.screen_key = 'lancar_elogios'
      AND sp.permission_level = 'admin'
    )
  );

-- Log
DO $$
BEGIN
  RAISE NOTICE '✅ Políticas de elogios corrigidas (baseadas em permissões)';
END $$;

-- =====================================================
-- PARTE 3: Corrigir políticas de taxas_clientes
-- =====================================================

-- Remover políticas antigas que permitem acesso irrestrito
DROP POLICY IF EXISTS "Authenticated users can delete taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Authenticated users can insert taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Authenticated users can update taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Authenticated users can view taxas" ON taxas_clientes;

-- Criar políticas corretas baseadas em permissões
-- SELECT: Todos os usuários autenticados podem visualizar
CREATE POLICY "taxas_clientes_select_authenticated" ON taxas_clientes
  FOR SELECT
  TO authenticated
  USING (true);

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
      AND sp.screen_key = 'cadastro_taxas'
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
      AND sp.screen_key = 'cadastro_taxas'
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
      AND sp.screen_key = 'cadastro_taxas'
      AND sp.permission_level = 'admin'
    )
  );

-- Log
DO $$
BEGIN
  RAISE NOTICE '✅ Políticas de taxas_clientes corrigidas (baseadas em permissões)';
END $$;

-- =====================================================
-- PARTE 4: Corrigir políticas de valores_taxas_funcoes
-- =====================================================

-- Remover políticas antigas que permitem acesso irrestrito
DROP POLICY IF EXISTS "Authenticated users can delete valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Authenticated users can insert valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Authenticated users can update valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Authenticated users can view valores" ON valores_taxas_funcoes;

-- Criar políticas corretas baseadas em permissões
-- SELECT: Todos os usuários autenticados podem visualizar
CREATE POLICY "valores_taxas_select_authenticated" ON valores_taxas_funcoes
  FOR SELECT
  TO authenticated
  USING (true);

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
      AND sp.screen_key = 'cadastro_taxas'
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
      AND sp.screen_key = 'cadastro_taxas'
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
      AND sp.screen_key = 'cadastro_taxas'
      AND sp.permission_level = 'admin'
    )
  );

-- Log
DO $$
BEGIN
  RAISE NOTICE '✅ Políticas de valores_taxas_funcoes corrigidas (baseadas em permissões)';
END $$;

-- =====================================================
-- PARTE 5: Verificação final
-- =====================================================

DO $$
DECLARE
  table_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔒 VERIFICAÇÃO DE SEGURANÇA RLS';
  RAISE NOTICE '================================';
  RAISE NOTICE '';
  
  -- Verificar RLS habilitado
  FOR table_record IN 
    SELECT 
      schemaname,
      tablename,
      rowsecurity
    FROM pg_tables 
    WHERE schemaname = 'public'
    AND tablename IN (
      'banco_horas_calculos',
      'elogios',
      'taxas_clientes',
      'valores_taxas_funcoes'
    )
  LOOP
    IF table_record.rowsecurity THEN
      RAISE NOTICE '✅ %: RLS habilitado', table_record.tablename;
    ELSE
      RAISE NOTICE '⚠️ %: RLS NÃO habilitado', table_record.tablename;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '📋 Políticas criadas:';
  RAISE NOTICE '  - elogios: 4 políticas (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '  - taxas_clientes: 4 políticas (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '  - valores_taxas_funcoes: 4 políticas (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Segurança:';
  RAISE NOTICE '  - SELECT: Todos os usuários autenticados';
  RAISE NOTICE '  - INSERT/UPDATE: Apenas usuários com permissão edit/admin';
  RAISE NOTICE '  - DELETE: Apenas usuários com permissão admin';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Correções de segurança RLS aplicadas com sucesso!';
  RAISE NOTICE '';
END $$;
