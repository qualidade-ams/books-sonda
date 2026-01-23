-- =====================================================
-- MIGRAÇÃO: Corrigir Permissão de DELETE em Taxas
-- Data: 2026-01-23
-- Descrição: Permitir que usuários com permissão 'edit' possam deletar taxas
--            (atualmente só 'admin' pode deletar)
-- =====================================================

-- =====================================================
-- PROBLEMA IDENTIFICADO
-- =====================================================
-- A política RLS de DELETE em taxas_clientes exige permission_level = 'admin'
-- mas usuários com 'edit' também devem poder deletar taxas.
--
-- Erro atual:
-- "❌ [DELETAR TAXA] Nenhuma taxa foi deletada - possível problema de permissão RLS"

-- =====================================================
-- PARTE 1: Corrigir Política de DELETE em taxas_clientes
-- =====================================================

-- Remover política antiga
DROP POLICY IF EXISTS "taxas_clientes_delete_with_permission" ON taxas_clientes;

-- Criar política corrigida: permitir 'edit' e 'admin'
CREATE POLICY "taxas_clientes_delete_with_permission" ON taxas_clientes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM screen_permissions sp
      JOIN user_groups ug ON sp.group_id = ug.id
      JOIN user_group_assignments uga ON ug.id = uga.group_id
      WHERE uga.user_id = (SELECT auth.uid())
      AND sp.screen_key = 'cadastro_taxas_clientes'
      AND sp.permission_level IN ('edit', 'admin')  -- ✅ CORRIGIDO: aceitar 'edit' também
    )
  );

COMMENT ON POLICY "taxas_clientes_delete_with_permission" ON taxas_clientes IS 
  'Permite que usuários com permissão edit ou admin possam deletar taxas';

-- =====================================================
-- PARTE 2: Corrigir Política de DELETE em valores_taxas_funcoes
-- =====================================================

-- Remover política antiga
DROP POLICY IF EXISTS "valores_taxas_delete_with_permission" ON valores_taxas_funcoes;

-- Criar política corrigida: permitir 'edit' e 'admin'
CREATE POLICY "valores_taxas_delete_with_permission" ON valores_taxas_funcoes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM screen_permissions sp
      JOIN user_groups ug ON sp.group_id = ug.id
      JOIN user_group_assignments uga ON ug.id = uga.group_id
      WHERE uga.user_id = (SELECT auth.uid())
      AND sp.screen_key = 'cadastro_taxas_clientes'
      AND sp.permission_level IN ('edit', 'admin')  -- ✅ CORRIGIDO: aceitar 'edit' também
    )
  );

COMMENT ON POLICY "valores_taxas_delete_with_permission" ON valores_taxas_funcoes IS 
  'Permite que usuários com permissão edit ou admin possam deletar valores de taxas';

-- =====================================================
-- PARTE 3: Verificação de Segurança
-- =====================================================

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔒 VERIFICAÇÃO DE POLÍTICAS RLS DE DELETE:';
  RAISE NOTICE '';
  
  -- Verificar política de taxas_clientes
  SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
  INTO policy_record
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'taxas_clientes'
    AND cmd = 'DELETE'
    AND policyname = 'taxas_clientes_delete_with_permission';
  
  IF FOUND THEN
    RAISE NOTICE '✅ Política DELETE de taxas_clientes encontrada';
    RAISE NOTICE '   Nome: %', policy_record.policyname;
    RAISE NOTICE '   Comando: %', policy_record.cmd;
  ELSE
    RAISE NOTICE '❌ Política DELETE de taxas_clientes NÃO encontrada';
  END IF;
  
  -- Verificar política de valores_taxas_funcoes
  SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
  INTO policy_record
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'valores_taxas_funcoes'
    AND cmd = 'DELETE'
    AND policyname = 'valores_taxas_delete_with_permission';
  
  IF FOUND THEN
    RAISE NOTICE '✅ Política DELETE de valores_taxas_funcoes encontrada';
    RAISE NOTICE '   Nome: %', policy_record.policyname;
    RAISE NOTICE '   Comando: %', policy_record.cmd;
  ELSE
    RAISE NOTICE '❌ Política DELETE de valores_taxas_funcoes NÃO encontrada';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- =====================================================
-- PARTE 4: Verificar Permissões dos Usuários
-- =====================================================

DO $$
DECLARE
  admin_count INTEGER;
  edit_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '👥 VERIFICAÇÃO DE PERMISSÕES DOS USUÁRIOS:';
  RAISE NOTICE '';
  
  -- Contar usuários com permissão 'admin'
  SELECT COUNT(DISTINCT uga.user_id)
  INTO admin_count
  FROM screen_permissions sp
  JOIN user_groups ug ON sp.group_id = ug.id
  JOIN user_group_assignments uga ON ug.id = uga.group_id
  WHERE sp.screen_key = 'cadastro_taxas_clientes'
    AND sp.permission_level = 'admin';
  
  -- Contar usuários com permissão 'edit'
  SELECT COUNT(DISTINCT uga.user_id)
  INTO edit_count
  FROM screen_permissions sp
  JOIN user_groups ug ON sp.group_id = ug.id
  JOIN user_group_assignments uga ON ug.id = uga.group_id
  WHERE sp.screen_key = 'cadastro_taxas_clientes'
    AND sp.permission_level = 'edit';
  
  RAISE NOTICE '📊 Usuários com permissão ADMIN: %', admin_count;
  RAISE NOTICE '📊 Usuários com permissão EDIT: %', edit_count;
  RAISE NOTICE '📊 Total de usuários que podem deletar: %', (admin_count + edit_count);
  RAISE NOTICE '';
END $$;

-- =====================================================
-- PARTE 5: Mensagem Final
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 CORREÇÃO DE PERMISSÃO DE DELETE CONCLUÍDA!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ ALTERAÇÕES APLICADAS:';
  RAISE NOTICE '';
  RAISE NOTICE '   1. Política DELETE de taxas_clientes atualizada';
  RAISE NOTICE '      - Antes: Apenas permission_level = ''admin''';
  RAISE NOTICE '      - Depois: permission_level IN (''edit'', ''admin'')';
  RAISE NOTICE '';
  RAISE NOTICE '   2. Política DELETE de valores_taxas_funcoes atualizada';
  RAISE NOTICE '      - Antes: Apenas permission_level = ''admin''';
  RAISE NOTICE '      - Depois: permission_level IN (''edit'', ''admin'')';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 SEGURANÇA:';
  RAISE NOTICE '';
  RAISE NOTICE '   ✅ Usuários com permissão ''edit'' podem deletar taxas';
  RAISE NOTICE '   ✅ Usuários com permissão ''admin'' podem deletar taxas';
  RAISE NOTICE '   ✅ Usuários sem permissão NÃO podem deletar taxas';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 COMO TESTAR:';
  RAISE NOTICE '';
  RAISE NOTICE '   1. Acesse a tela de Cadastro de Taxas';
  RAISE NOTICE '   2. Clique no botão "Deletar" de uma taxa';
  RAISE NOTICE '   3. Confirme a deleção';
  RAISE NOTICE '   4. ✅ Taxa deve ser deletada com sucesso';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
