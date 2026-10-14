-- =====================================================
-- MIGRAÇÃO: Corrigir Política RLS de UPDATE em Taxas
-- Data: 2026-02-12
-- Descrição: Corrigir problema onde UPDATE não retorna dados
--            devido a políticas RLS duplicadas ou incorretas
-- =====================================================

-- =====================================================
-- PROBLEMA IDENTIFICADO
-- =====================================================
-- Erro: "Taxa existe mas update não retornou dados (problema de permissão RLS?)"
-- 
-- Causa: Políticas RLS duplicadas ou com USING/WITH CHECK incorretos
-- que bloqueiam o retorno de dados após UPDATE
--
-- Solução: Remover TODAS as políticas antigas e criar novas políticas
-- otimizadas com USING e WITH CHECK corretos

-- =====================================================
-- PARTE 1: Verificar Políticas Duplicadas
-- =====================================================

DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 VERIFICANDO POLÍTICAS DUPLICADAS EM taxas_clientes:';
  RAISE NOTICE '';
  
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT tablename, cmd, COUNT(*) as total
    FROM pg_policies 
    WHERE tablename = 'taxas_clientes'
    GROUP BY tablename, cmd
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE NOTICE '⚠️ ENCONTRADAS % POLÍTICAS DUPLICADAS!', duplicate_count;
    
    -- Listar políticas duplicadas
    FOR rec IN (
      SELECT cmd, array_agg(policyname) as politicas, COUNT(*) as total
      FROM pg_policies 
      WHERE tablename = 'taxas_clientes'
      GROUP BY cmd
      HAVING COUNT(*) > 1
    ) LOOP
      RAISE NOTICE '   Comando: % - % políticas: %', rec.cmd, rec.total, rec.politicas;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ Nenhuma política duplicada encontrada';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- =====================================================
-- PARTE 2: Remover TODAS as Políticas Antigas
-- =====================================================

-- Listar todas as políticas existentes antes de remover
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🗑️ REMOVENDO POLÍTICAS ANTIGAS DE taxas_clientes:';
  RAISE NOTICE '';
  
  FOR policy_record IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'taxas_clientes'
    ORDER BY policyname
  ) LOOP
    RAISE NOTICE '   Removendo: %', policy_record.policyname;
  END LOOP;
  
  RAISE NOTICE '';
END $$;

-- Remover TODAS as políticas antigas (lista completa de todas as variações encontradas)
DROP POLICY IF EXISTS "Authenticated users can view taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Authenticated users can insert taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Authenticated users can update taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Authenticated users can delete taxas" ON taxas_clientes;

DROP POLICY IF EXISTS "Usuários podem visualizar taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Usuários podem criar taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Usuários podem atualizar taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Usuários podem deletar taxas" ON taxas_clientes;

DROP POLICY IF EXISTS "Usuários podem ver taxas com permissão" ON taxas_clientes;
DROP POLICY IF EXISTS "Usuários podem inserir taxas com permissão" ON taxas_clientes;
DROP POLICY IF EXISTS "Usuários podem atualizar taxas com permissão" ON taxas_clientes;
DROP POLICY IF EXISTS "Usuários podem excluir taxas com permissão" ON taxas_clientes;

DROP POLICY IF EXISTS "taxas_clientes_select_authenticated" ON taxas_clientes;
DROP POLICY IF EXISTS "taxas_clientes_insert_with_permission" ON taxas_clientes;
DROP POLICY IF EXISTS "taxas_clientes_update_with_permission" ON taxas_clientes;
DROP POLICY IF EXISTS "taxas_clientes_delete_with_permission" ON taxas_clientes;

DROP POLICY IF EXISTS "Service role pode visualizar taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Service role pode inserir taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Service role pode atualizar taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Service role pode deletar taxas" ON taxas_clientes;

-- =====================================================
-- PARTE 3: Garantir RLS Habilitado
-- =====================================================

ALTER TABLE taxas_clientes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PARTE 4: Criar Políticas Otimizadas e Corretas
-- =====================================================

-- SELECT: Todos os usuários autenticados podem visualizar
CREATE POLICY "taxas_select_authenticated"
  ON taxas_clientes
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON POLICY "taxas_select_authenticated" ON taxas_clientes IS 
  'Permite que todos os usuários autenticados visualizem taxas';

-- INSERT: Apenas usuários com permissão 'edit' ou 'admin' podem inserir
CREATE POLICY "taxas_insert_with_permission"
  ON taxas_clientes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_groups ug ON p.group_id = ug.id
      JOIN screen_permissions sp ON sp.group_id = ug.id
      WHERE p.id = (SELECT auth.uid())
        AND sp.screen_key = 'cadastro_taxas_clientes'
        AND sp.permission_level IN ('edit', 'admin')
    )
  );

COMMENT ON POLICY "taxas_insert_with_permission" ON taxas_clientes IS 
  'Permite que usuários com permissão edit ou admin possam inserir taxas';

-- UPDATE: Apenas usuários com permissão 'edit' ou 'admin' podem atualizar
-- ✅ CRÍTICO: USING e WITH CHECK devem ser IDÊNTICOS para retornar dados após UPDATE
CREATE POLICY "taxas_update_with_permission"
  ON taxas_clientes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_groups ug ON p.group_id = ug.id
      JOIN screen_permissions sp ON sp.group_id = ug.id
      WHERE p.id = (SELECT auth.uid())
        AND sp.screen_key = 'cadastro_taxas_clientes'
        AND sp.permission_level IN ('edit', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_groups ug ON p.group_id = ug.id
      JOIN screen_permissions sp ON sp.group_id = ug.id
      WHERE p.id = (SELECT auth.uid())
        AND sp.screen_key = 'cadastro_taxas_clientes'
        AND sp.permission_level IN ('edit', 'admin')
    )
  );

COMMENT ON POLICY "taxas_update_with_permission" ON taxas_clientes IS 
  'Permite que usuários com permissão edit ou admin possam atualizar taxas. USING e WITH CHECK idênticos garantem retorno de dados.';

-- DELETE: Apenas usuários com permissão 'edit' ou 'admin' podem deletar
CREATE POLICY "taxas_delete_with_permission"
  ON taxas_clientes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_groups ug ON p.group_id = ug.id
      JOIN screen_permissions sp ON sp.group_id = ug.id
      WHERE p.id = (SELECT auth.uid())
        AND sp.screen_key = 'cadastro_taxas_clientes'
        AND sp.permission_level IN ('edit', 'admin')
    )
  );

COMMENT ON POLICY "taxas_delete_with_permission" ON taxas_clientes IS 
  'Permite que usuários com permissão edit ou admin possam deletar taxas';

-- =====================================================
-- PARTE 5: Políticas para Service Role (Acesso Total)
-- =====================================================

CREATE POLICY "taxas_service_role_all"
  ON taxas_clientes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "taxas_service_role_all" ON taxas_clientes IS 
  'Service role tem acesso total sem restrições';

-- =====================================================
-- PARTE 6: Verificação Final
-- =====================================================

DO $$
DECLARE
  policy_count INTEGER;
  duplicate_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ VERIFICAÇÃO FINAL DE POLÍTICAS:';
  RAISE NOTICE '';
  
  -- Contar políticas criadas
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'taxas_clientes';
  
  RAISE NOTICE '📊 Total de políticas criadas: %', policy_count;
  RAISE NOTICE '';
  
  -- Listar políticas por comando
  FOR rec IN (
    SELECT cmd, array_agg(policyname) as politicas, COUNT(*) as total
    FROM pg_policies 
    WHERE tablename = 'taxas_clientes'
    GROUP BY cmd
    ORDER BY cmd
  ) LOOP
    RAISE NOTICE '   %: % política(s) - %', rec.cmd, rec.total, rec.politicas;
  END LOOP;
  
  RAISE NOTICE '';
  
  -- Verificar duplicatas
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT tablename, cmd, COUNT(*) as total
    FROM pg_policies 
    WHERE tablename = 'taxas_clientes'
    GROUP BY tablename, cmd
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION '❌ ERRO: Ainda existem % políticas duplicadas!', duplicate_count;
  ELSE
    RAISE NOTICE '✅ Nenhuma política duplicada encontrada';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- =====================================================
-- PARTE 7: Mensagem Final
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 CORREÇÃO DE POLÍTICAS RLS DE UPDATE CONCLUÍDA!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ ALTERAÇÕES APLICADAS:';
  RAISE NOTICE '';
  RAISE NOTICE '   1. Removidas TODAS as políticas antigas (duplicadas)';
  RAISE NOTICE '   2. Criadas 5 novas políticas otimizadas:';
  RAISE NOTICE '      - taxas_select_authenticated (SELECT)';
  RAISE NOTICE '      - taxas_insert_with_permission (INSERT)';
  RAISE NOTICE '      - taxas_update_with_permission (UPDATE) ✅ CORRIGIDO';
  RAISE NOTICE '      - taxas_delete_with_permission (DELETE)';
  RAISE NOTICE '      - taxas_service_role_all (ALL para service_role)';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 CORREÇÃO CRÍTICA NO UPDATE:';
  RAISE NOTICE '';
  RAISE NOTICE '   ✅ USING e WITH CHECK agora são IDÊNTICOS';
  RAISE NOTICE '   ✅ Garante que dados sejam retornados após UPDATE';
  RAISE NOTICE '   ✅ Resolve erro: "Taxa existe mas update não retornou dados"';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 COMO TESTAR:';
  RAISE NOTICE '';
  RAISE NOTICE '   1. Acesse a tela de Cadastro de Taxas';
  RAISE NOTICE '   2. Edite uma taxa existente';
  RAISE NOTICE '   3. Salve as alterações';
  RAISE NOTICE '   4. ✅ Taxa deve ser atualizada SEM ERROS';
  RAISE NOTICE '   5. ✅ Dados atualizados devem ser retornados';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
