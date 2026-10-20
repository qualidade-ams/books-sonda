-- Migration: Remover TODAS as 7 tabelas com políticas RLS duplicadas
-- Data: 2026-03-03
-- Problema: Múltiplas políticas permissivas causando erro 406
-- Solução: Remover políticas antigas e manter apenas as otimizadas

-- ============================================================================
-- TABELA 1: apontamentos_tickets_aranda
-- Problema: 2 políticas ALL
-- ============================================================================

DROP POLICY IF EXISTS "Service role tem acesso total" ON public.apontamentos_tickets_aranda;

-- ============================================================================
-- TABELA 2: books
-- Problema: 2 políticas SELECT
-- ============================================================================

DROP POLICY IF EXISTS "Users can view books" ON public.books;

-- ============================================================================
-- TABELA 3: clientes (4 operações duplicadas)
-- Problema: Políticas antigas em português
-- ============================================================================

DROP POLICY IF EXISTS "Service role pode deletar clientes" ON public.clientes;
DROP POLICY IF EXISTS "Service role pode inserir clientes" ON public.clientes;
DROP POLICY IF EXISTS "Service role pode visualizar clientes" ON public.clientes;
DROP POLICY IF EXISTS "Service role pode atualizar clientes" ON public.clientes;

-- ============================================================================
-- TABELA 4: profiles
-- Problema: 2 políticas INSERT
-- ============================================================================

DROP POLICY IF EXISTS "Service role pode inserir perfis" ON public.profiles;

-- ============================================================================
-- TABELA 5: sync_control
-- Problema: 2 políticas SELECT
-- ============================================================================

DROP POLICY IF EXISTS "anon_select_sync_control" ON public.sync_control;

-- ============================================================================
-- TABELA 6: empresa_produtos
-- Problema: 2 políticas SELECT
-- ============================================================================

DROP POLICY IF EXISTS "Users can view empresa_produtos" ON public.empresa_produtos;

-- ============================================================================
-- TABELA 7: empresas_clientes
-- Problema: 2 políticas SELECT
-- ============================================================================

DROP POLICY IF EXISTS "Users can view empresas_clientes" ON public.empresas_clientes;

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

DO $$
DECLARE
  duplicate_record RECORD;
  total_duplicates INTEGER := 0;
BEGIN
  RAISE NOTICE '🔍 Verificando políticas duplicadas...';
  
  FOR duplicate_record IN 
    SELECT 
      tablename,
      cmd as operation,
      array_agg(policyname) as duplicate_policies,
      COUNT(*) as total
    FROM pg_policies 
    WHERE schemaname = 'public'
    GROUP BY tablename, cmd
    HAVING COUNT(*) > 1
    ORDER BY tablename, cmd
  LOOP
    total_duplicates := total_duplicates + 1;
    RAISE WARNING '⚠️ Duplicata: % - % - %', 
      duplicate_record.tablename, 
      duplicate_record.operation, 
      duplicate_record.duplicate_policies;
  END LOOP;
  
  IF total_duplicates = 0 THEN
    RAISE NOTICE '✅ SUCESSO: Nenhuma política duplicada encontrada!';
  ELSE
    RAISE NOTICE '⚠️ Ainda existem % tabelas com duplicatas', total_duplicates;
  END IF;
END $$;

-- ============================================================================
-- LOGS FINAIS
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public'
    AND tablename IN ('apontamentos_tickets_aranda', 'books', 'clientes', 'profiles', 'sync_control', 'empresa_produtos', 'empresas_clientes');
  
  RAISE NOTICE '📊 Total de políticas nas tabelas corrigidas: %', policy_count;
END $$;
