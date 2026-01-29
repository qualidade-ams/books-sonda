-- =====================================================
-- Migration: Remoção FINAL de TODAS as Políticas Duplicadas
-- Data: 2026-01-29
-- Descrição: Remove todas as políticas duplicadas de plano_acao_historico
-- =====================================================

-- =====================================================
-- PROBLEMA IDENTIFICADO
-- =====================================================
-- Múltiplas políticas duplicadas em plano_acao_historico:
-- - "Sistema pode inserir histórico" + "plano_acao_historico_insert_policy"
-- - "Usuários podem ver histórico com permissão" + "plano_acao_historico_select_policy"

-- =====================================================
-- PARTE 1: REMOVER TODAS AS POLÍTICAS DE plano_acao_historico
-- =====================================================

-- Remover políticas com nomes descritivos
DROP POLICY IF EXISTS "Usuários autenticados podem ler histórico" ON plano_acao_historico;
DROP POLICY IF EXISTS "Usuários autenticados podem criar histórico" ON plano_acao_historico;
DROP POLICY IF EXISTS "Sistema pode inserir histórico de planos" ON plano_acao_historico;
DROP POLICY IF EXISTS "Sistema pode inserir histórico" ON plano_acao_historico;
DROP POLICY IF EXISTS "Usuários podem ver histórico com permissão" ON plano_acao_historico;

-- Remover políticas com sufixo _policy (geradas automaticamente)
DROP POLICY IF EXISTS "plano_acao_historico_select_policy" ON plano_acao_historico;
DROP POLICY IF EXISTS "plano_acao_historico_insert_policy" ON plano_acao_historico;
DROP POLICY IF EXISTS "plano_acao_historico_update_policy" ON plano_acao_historico;
DROP POLICY IF EXISTS "plano_acao_historico_delete_policy" ON plano_acao_historico;

-- =====================================================
-- PARTE 2: CRIAR POLÍTICAS ÚNICAS E CORRETAS
-- =====================================================

-- SELECT: Usuários com permissão podem visualizar histórico
CREATE POLICY "historico_select" ON plano_acao_historico
  AS PERMISSIVE
  FOR SELECT 
  USING (
    has_screen_permission('plano_acao', 'view') OR
    has_screen_permission('plano_acao', 'edit') OR
    has_screen_permission('plano_acao', 'delete')
  );

-- INSERT: Sistema pode inserir histórico automaticamente via triggers
CREATE POLICY "historico_insert" ON plano_acao_historico
  AS PERMISSIVE
  FOR INSERT 
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

COMMENT ON POLICY "historico_select" ON plano_acao_historico IS 
'Usuários com permissão view, edit ou delete podem visualizar histórico';

COMMENT ON POLICY "historico_insert" ON plano_acao_historico IS 
'Triggers do sistema podem inserir histórico para usuários autenticados';

-- =====================================================
-- PARTE 3: VERIFICAÇÃO RIGOROSA
-- =====================================================

DO $$
DECLARE
  v_select_count INTEGER;
  v_insert_count INTEGER;
  v_total_count INTEGER;
  v_policy_name TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICAÇÃO RIGOROSA: plano_acao_historico ===';
  
  -- Contar políticas
  SELECT COUNT(*) INTO v_select_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'plano_acao_historico'
  AND cmd = 'SELECT';
  
  SELECT COUNT(*) INTO v_insert_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'plano_acao_historico'
  AND cmd = 'INSERT';
  
  SELECT COUNT(*) INTO v_total_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'plano_acao_historico';
  
  RAISE NOTICE 'Total de políticas: %', v_total_count;
  RAISE NOTICE 'Políticas SELECT: % (esperado: 1)', v_select_count;
  RAISE NOTICE 'Políticas INSERT: % (esperado: 1)', v_insert_count;
  
  -- Listar todas as políticas
  RAISE NOTICE '';
  RAISE NOTICE 'Políticas encontradas:';
  FOR v_policy_name IN 
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'plano_acao_historico'
    ORDER BY cmd, policyname
  LOOP
    RAISE NOTICE '  - %', v_policy_name;
  END LOOP;
  
  -- Alertas
  IF v_select_count > 1 THEN
    RAISE WARNING '⚠️ DUPLICATA: % políticas SELECT!', v_select_count;
  ELSIF v_select_count = 0 THEN
    RAISE WARNING '⚠️ FALTANDO: Nenhuma política SELECT!';
  ELSE
    RAISE NOTICE '✅ SELECT: OK';
  END IF;
  
  IF v_insert_count > 1 THEN
    RAISE WARNING '⚠️ DUPLICATA: % políticas INSERT!', v_insert_count;
  ELSIF v_insert_count = 0 THEN
    RAISE WARNING '⚠️ FALTANDO: Nenhuma política INSERT!';
  ELSE
    RAISE NOTICE '✅ INSERT: OK';
  END IF;
  
  -- Sucesso
  IF v_total_count = 2 AND v_select_count = 1 AND v_insert_count = 1 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SUCESSO: Exatamente 2 políticas (1 SELECT + 1 INSERT)';
  ELSE
    RAISE WARNING '⚠️ ATENÇÃO: Total = % (esperado: 2)', v_total_count;
  END IF;
END $$;

-- =====================================================
-- PARTE 4: VERIFICAR TODAS AS TABELAS DO PLANO DE AÇÃO
-- =====================================================

DO $$
DECLARE
  v_table_name TEXT;
  v_policy_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== RESUMO: Todas as Tabelas de Plano de Ação ===';
  
  FOR v_table_name IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename LIKE '%plano%acao%'
    ORDER BY tablename
  LOOP
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = v_table_name;
    
    RAISE NOTICE '📋 %: % políticas', v_table_name, v_policy_count;
  END LOOP;
END $$;

-- =====================================================
-- LOG FINAL
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Remoção FINAL de Duplicatas Concluída';
  RAISE NOTICE '📋 plano_acao_historico: 2 políticas únicas';
  RAISE NOTICE '🔧 Nomes simplificados (historico_select, historico_insert)';
  RAISE NOTICE '========================================';
END $$;
