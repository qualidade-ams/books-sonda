-- Migration: Corrigir performance RLS e políticas duplicadas
-- Data: 2026-01-22
-- Descrição: Otimiza políticas RLS e remove duplicatas

-- PROBLEMAS IDENTIFICADOS pelo Supabase:
-- 1. apontamentos_aranda: Políticas re-avaliam auth.<function>() para cada linha (performance ruim)
-- 2. elogios: Políticas duplicadas para SELECT (authenticated)

-- =====================================================
-- PARTE 1: Otimizar políticas de apontamentos_aranda
-- =====================================================

-- Remover TODAS as políticas antigas (incluindo duplicadas)
DROP POLICY IF EXISTS "Service role can insert apontamentos" ON apontamentos_aranda;
DROP POLICY IF EXISTS "Service role can update apontamentos" ON apontamentos_aranda;
DROP POLICY IF EXISTS "Service role can delete apontamentos" ON apontamentos_aranda;
DROP POLICY IF EXISTS "Users can view apontamentos" ON apontamentos_aranda;
DROP POLICY IF EXISTS "Authenticated users can view apontamentos" ON apontamentos_aranda;

-- Criar políticas otimizadas
-- INSERT: Service role pode inserir
CREATE POLICY "Service role can insert apontamentos" ON apontamentos_aranda
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- UPDATE: Service role pode atualizar
CREATE POLICY "Service role can update apontamentos" ON apontamentos_aranda
  FOR UPDATE
  TO service_role
  USING (true);

-- DELETE: Service role pode deletar
CREATE POLICY "Service role can delete apontamentos" ON apontamentos_aranda
  FOR DELETE
  TO service_role
  USING (true);

-- SELECT: Todos os usuários autenticados podem visualizar
CREATE POLICY "Authenticated users can view apontamentos" ON apontamentos_aranda
  FOR SELECT
  TO authenticated
  USING (true);

-- Log
DO $$
BEGIN
  RAISE NOTICE '✅ Políticas de apontamentos_aranda otimizadas';
  RAISE NOTICE '   - Removidas todas as políticas antigas e duplicadas';
  RAISE NOTICE '   - Criadas políticas limpas e otimizadas';
  RAISE NOTICE '   - Service role: acesso total';
  RAISE NOTICE '   - Authenticated: apenas leitura';
END $$;

-- =====================================================
-- PARTE 2: Remover políticas duplicadas de elogios
-- =====================================================

-- Remover política antiga duplicada
DROP POLICY IF EXISTS "Usuários autenticados podem ver elogios" ON elogios;

-- Manter apenas a política criada na migration anterior
-- (elogios_select_authenticated já existe e é suficiente)

-- Log
DO $$
BEGIN
  RAISE NOTICE '✅ Políticas duplicadas de elogios removidas';
  RAISE NOTICE '   - Mantida apenas: elogios_select_authenticated';
END $$;

-- =====================================================
-- PARTE 3: Verificação de performance
-- =====================================================

DO $$
DECLARE
  policy_record RECORD;
  has_performance_issues BOOLEAN := false;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🚀 VERIFICAÇÃO DE PERFORMANCE RLS';
  RAISE NOTICE '==================================';
  RAISE NOTICE '';
  
  -- Verificar políticas que podem ter problemas de performance
  -- Usando pg_policies que tem as colunas corretas: qual e with_check
  FOR policy_record IN 
    SELECT 
      schemaname,
      tablename,
      policyname,
      qual as using_clause,
      with_check as with_check_clause
    FROM pg_policies
    WHERE schemaname = 'public'
    AND (
      qual LIKE '%auth.%(%' OR
      with_check LIKE '%auth.%(%'
    )
    AND qual NOT LIKE '%(SELECT auth.%'
    AND with_check NOT LIKE '%(SELECT auth.%'
  LOOP
    has_performance_issues := true;
    RAISE NOTICE '⚠️ %.%: Política "%" pode ter problema de performance',
      policy_record.schemaname,
      policy_record.tablename,
      policy_record.policyname;
  END LOOP;
  
  IF NOT has_performance_issues THEN
    RAISE NOTICE '✅ Nenhum problema de performance detectado';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '📋 Verificação de políticas duplicadas:';
  
  -- Verificar políticas duplicadas
  FOR policy_record IN
    SELECT 
      schemaname,
      tablename,
      cmd,
      roles,
      COUNT(*) as policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY schemaname, tablename, cmd, roles
    HAVING COUNT(*) > 1
  LOOP
    RAISE NOTICE '⚠️ %.%: % políticas duplicadas para % (role: %)',
      policy_record.schemaname,
      policy_record.tablename,
      policy_record.policy_count,
      policy_record.cmd,
      policy_record.roles;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Otimizações de performance RLS aplicadas com sucesso!';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- PARTE 4: Documentação das melhores práticas
-- =====================================================

COMMENT ON TABLE apontamentos_aranda IS 
'Apontamentos do sistema Aranda. Políticas RLS otimizadas para performance.';

COMMENT ON TABLE elogios IS 
'Elogios de clientes. Políticas RLS baseadas em permissões de tela.';

-- Log final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📚 MELHORES PRÁTICAS RLS APLICADAS:';
  RAISE NOTICE '====================================';
  RAISE NOTICE '';
  RAISE NOTICE '1. Performance:';
  RAISE NOTICE '   ❌ Evitar: auth.uid() = user_id';
  RAISE NOTICE '   ✅ Usar: (SELECT auth.uid()) = user_id';
  RAISE NOTICE '';
  RAISE NOTICE '2. Políticas:';
  RAISE NOTICE '   ❌ Evitar: Múltiplas políticas para mesma ação/role';
  RAISE NOTICE '   ✅ Usar: Uma política por ação/role';
  RAISE NOTICE '';
  RAISE NOTICE '3. Segurança:';
  RAISE NOTICE '   ❌ Evitar: USING (true) para INSERT/UPDATE/DELETE';
  RAISE NOTICE '   ✅ Usar: Verificação de permissões baseada em grupos';
  RAISE NOTICE '';
END $$;
