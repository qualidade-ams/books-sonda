-- Migration: Verificar e corrigir tabela percentual_repasse_historico
-- Data: 2026-02-20
-- Descrição: Diagnóstico e correção de problemas com a tabela

-- =====================================================
-- 1. VERIFICAR SE A TABELA EXISTE
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'percentual_repasse_historico'
  ) THEN
    RAISE NOTICE '✅ Tabela percentual_repasse_historico existe';
  ELSE
    RAISE WARNING '❌ Tabela percentual_repasse_historico NÃO existe!';
  END IF;
END $$;

-- =====================================================
-- 2. VERIFICAR COLUNAS DA TABELA
-- =====================================================

DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = 'percentual_repasse_historico';
  
  IF col_count > 0 THEN
    RAISE NOTICE '✅ Tabela tem % colunas', col_count;
  ELSE
    RAISE WARNING '❌ Tabela não tem colunas ou não existe';
  END IF;
END $$;

-- =====================================================
-- 3. VERIFICAR POLÍTICAS RLS
-- =====================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'percentual_repasse_historico';
  
  IF policy_count > 0 THEN
    RAISE NOTICE '✅ Tabela tem % políticas RLS', policy_count;
  ELSE
    RAISE WARNING '⚠️ Tabela não tem políticas RLS';
  END IF;
END $$;

-- =====================================================
-- 4. LISTAR POLÍTICAS EXISTENTES
-- =====================================================

SELECT 
  policyname as "Nome da Política",
  cmd as "Comando",
  CASE 
    WHEN qual IS NOT NULL THEN 'Tem condição USING'
    ELSE 'Sem condição'
  END as "Status"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'percentual_repasse_historico';

-- =====================================================
-- 5. VERIFICAR SE RLS ESTÁ HABILITADO
-- =====================================================

SELECT 
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS Habilitado'
    ELSE '❌ RLS Desabilitado'
  END as "Status RLS"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'percentual_repasse_historico';

-- =====================================================
-- 6. VERIFICAR REGISTROS NA TABELA
-- =====================================================

DO $$
DECLARE
  record_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO record_count
  FROM percentual_repasse_historico;
  
  RAISE NOTICE '📊 Tabela tem % registros', record_count;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ Erro ao contar registros: %', SQLERRM;
END $$;

-- =====================================================
-- 7. VERIFICAR FUNÇÕES RELACIONADAS
-- =====================================================

SELECT 
  proname as "Nome da Função",
  CASE 
    WHEN prosecdef THEN '✅ SECURITY DEFINER'
    ELSE '❌ Sem SECURITY DEFINER'
  END as "Security",
  CASE 
    WHEN 'search_path=public' = ANY(proconfig) THEN '✅ search_path definido'
    ELSE '⚠️ search_path não definido'
  END as "Search Path"
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname LIKE '%percentual_repasse%';

-- =====================================================
-- FIM DO DIAGNÓSTICO
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Diagnóstico concluído!';
END $$;
