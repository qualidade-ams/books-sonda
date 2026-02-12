-- ============================================================================
-- SCRIPT DE LIMPEZA - Remover TODAS as versões de funções e objetos de Books
-- Execute este script ANTES da migration principal
-- ============================================================================

-- ============================================================================
-- 1. Remover TODAS as políticas RLS antigas
-- ============================================================================

-- Tabela books
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar books" ON public.books;
DROP POLICY IF EXISTS "Usuários autenticados podem criar books" ON public.books;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar books" ON public.books;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar books" ON public.books;
DROP POLICY IF EXISTS "authenticated_select_books" ON public.books;
DROP POLICY IF EXISTS "authenticated_insert_books" ON public.books;
DROP POLICY IF EXISTS "authenticated_update_books" ON public.books;
DROP POLICY IF EXISTS "authenticated_delete_books" ON public.books;

-- Tabela books_historico_geracao
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar histórico" ON public.books_historico_geracao;
DROP POLICY IF EXISTS "Usuários autenticados podem criar histórico" ON public.books_historico_geracao;
DROP POLICY IF EXISTS "authenticated_select_books_historico" ON public.books_historico_geracao;
DROP POLICY IF EXISTS "authenticated_insert_books_historico" ON public.books_historico_geracao;

-- ============================================================================
-- 2. Remover view
-- ============================================================================

DROP VIEW IF EXISTS public.books_com_empresa CASCADE;

-- ============================================================================
-- 3. Remover TODAS as versões da função user_has_books_permission
-- ============================================================================

-- Listar todas as versões existentes
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN 
    SELECT 
      p.oid,
      p.proname,
      pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'user_has_books_permission'
  LOOP
    RAISE NOTICE 'Removendo função: %(%) - OID: %', 
      func_record.proname, 
      func_record.args,
      func_record.oid;
    
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', 
      func_record.proname, 
      func_record.args);
  END LOOP;
END $$;

-- Remover explicitamente todas as variações conhecidas
DROP FUNCTION IF EXISTS public.user_has_books_permission() CASCADE;
DROP FUNCTION IF EXISTS public.user_has_books_permission(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_books_permission(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_books_permission(CHARACTER VARYING) CASCADE;

-- ============================================================================
-- 4. Remover função buscar_books_por_periodo
-- ============================================================================

-- Listar todas as versões existentes
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN 
    SELECT 
      p.oid,
      p.proname,
      pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'buscar_books_por_periodo'
  LOOP
    RAISE NOTICE 'Removendo função: %(%) - OID: %', 
      func_record.proname, 
      func_record.args,
      func_record.oid;
    
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', 
      func_record.proname, 
      func_record.args);
  END LOOP;
END $$;

-- Remover explicitamente
DROP FUNCTION IF EXISTS public.buscar_books_por_periodo(INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.buscar_books_por_periodo(INT, INT) CASCADE;

-- ============================================================================
-- 5. Verificar se ainda existem funções
-- ============================================================================

DO $$
DECLARE
  func_count INTEGER;
  func_record RECORD;
BEGIN
  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN ('user_has_books_permission', 'buscar_books_por_periodo');
  
  IF func_count > 0 THEN
    RAISE WARNING '⚠️ Ainda existem % funções relacionadas a books!', func_count;
    
    -- Listar funções restantes
    RAISE NOTICE 'Funções restantes:';
    FOR func_record IN 
      SELECT 
        p.proname,
        pg_get_function_identity_arguments(p.oid) as args
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname IN ('user_has_books_permission', 'buscar_books_por_periodo')
    LOOP
      RAISE NOTICE '  - %(%)' , func_record.proname, func_record.args;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ Todas as funções foram removidas com sucesso!';
  END IF;
  
  -- Resumo
  RAISE NOTICE '========================================';
  RAISE NOTICE 'LIMPEZA CONCLUÍDA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Agora você pode executar a migration principal:';
  RAISE NOTICE '  supabase/migrations/20260210_create_books_tables.sql';
  RAISE NOTICE '========================================';
END $$;
