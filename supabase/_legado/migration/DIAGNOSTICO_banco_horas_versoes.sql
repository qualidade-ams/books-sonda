-- Script de Diagnóstico: banco_horas_versoes
-- Data: 2026-01-22
-- Descrição: Verifica estrutura, dados e políticas RLS da tabela banco_horas_versoes

-- =====================================================
-- PARTE 1: Verificar estrutura da tabela
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 DIAGNÓSTICO: banco_horas_versoes';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- Verificar se a tabela existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'banco_horas_versoes'
  ) THEN
    RAISE NOTICE '✅ Tabela banco_horas_versoes existe';
  ELSE
    RAISE NOTICE '❌ Tabela banco_horas_versoes NÃO existe';
  END IF;
END $$;

-- Listar colunas da tabela
DO $$
DECLARE
  col_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 Colunas da tabela:';
  RAISE NOTICE '-------------------';
  
  FOR col_record IN 
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'banco_horas_versoes'
    ORDER BY ordinal_position
  LOOP
    RAISE NOTICE '  - % (%) %', 
      col_record.column_name, 
      col_record.data_type,
      CASE WHEN col_record.is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END;
  END LOOP;
END $$;

-- =====================================================
-- PARTE 2: Verificar dados na tabela
-- =====================================================

DO $$
DECLARE
  total_registros INTEGER;
  registros_com_empresa INTEGER;
  registros_com_mes_ano INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📊 Dados na tabela:';
  RAISE NOTICE '-------------------';
  
  -- Total de registros
  SELECT COUNT(*) INTO total_registros FROM banco_horas_versoes;
  RAISE NOTICE '  Total de registros: %', total_registros;
  
  -- Registros com empresa_id
  SELECT COUNT(*) INTO registros_com_empresa 
  FROM banco_horas_versoes 
  WHERE empresa_id IS NOT NULL;
  RAISE NOTICE '  Registros com empresa_id: %', registros_com_empresa;
  
  -- Registros com mes e ano
  SELECT COUNT(*) INTO registros_com_mes_ano 
  FROM banco_horas_versoes 
  WHERE mes IS NOT NULL AND ano IS NOT NULL;
  RAISE NOTICE '  Registros com mes/ano: %', registros_com_mes_ano;
  
  -- Se houver registros, mostrar alguns exemplos
  IF total_registros > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '  Exemplos de registros:';
    RAISE NOTICE '  ---------------------';
  END IF;
END $$;

-- Mostrar primeiros 5 registros
SELECT 
  id,
  empresa_id,
  mes,
  ano,
  versao,
  tipo_alteracao,
  created_at
FROM banco_horas_versoes
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================
-- PARTE 3: Verificar políticas RLS
-- =====================================================

DO $$
DECLARE
  rls_enabled BOOLEAN;
  policy_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Políticas RLS:';
  RAISE NOTICE '-------------------';
  
  -- Verificar se RLS está habilitado
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'banco_horas_versoes';
  
  IF rls_enabled THEN
    RAISE NOTICE '  ✅ RLS está HABILITADO';
  ELSE
    RAISE NOTICE '  ❌ RLS está DESABILITADO';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '  Políticas configuradas:';
  RAISE NOTICE '  ----------------------';
  
  FOR policy_record IN 
    SELECT 
      policyname,
      cmd,
      permissive,
      roles
    FROM pg_policies
    WHERE tablename = 'banco_horas_versoes'
    ORDER BY policyname
  LOOP
    RAISE NOTICE '  - % (%) - Roles: %', 
      policy_record.policyname,
      policy_record.cmd,
      policy_record.roles;
  END LOOP;
END $$;

-- =====================================================
-- PARTE 4: Testar query de busca
-- =====================================================

DO $$
DECLARE
  test_empresa_id UUID := 'bb8199f7-f447-4179-804f-0bab7525c6d2';
  test_mes INTEGER := 12;
  test_ano INTEGER := 2025;
  resultado_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Teste de Query:';
  RAISE NOTICE '-------------------';
  RAISE NOTICE '  Buscando versões para:';
  RAISE NOTICE '    empresa_id: %', test_empresa_id;
  RAISE NOTICE '    mes: %', test_mes;
  RAISE NOTICE '    ano: %', test_ano;
  RAISE NOTICE '';
  
  -- Testar query
  SELECT COUNT(*) INTO resultado_count
  FROM banco_horas_versoes
  WHERE empresa_id = test_empresa_id
    AND mes = test_mes
    AND ano = test_ano;
  
  RAISE NOTICE '  Resultado: % registro(s) encontrado(s)', resultado_count;
  
  -- Se não encontrou, tentar buscar por calculo_id (estrutura antiga)
  IF resultado_count = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '  ⚠️ Nenhum registro encontrado na nova estrutura';
    RAISE NOTICE '  Tentando buscar pela estrutura antiga (via calculo_id)...';
    
    SELECT COUNT(*) INTO resultado_count
    FROM banco_horas_versoes v
    INNER JOIN banco_horas_calculos c ON v.calculo_id = c.id
    WHERE c.empresa_id = test_empresa_id
      AND c.mes = test_mes
      AND c.ano = test_ano;
    
    RAISE NOTICE '  Resultado (estrutura antiga): % registro(s)', resultado_count;
  END IF;
END $$;

-- =====================================================
-- PARTE 5: Verificar índices
-- =====================================================

DO $$
DECLARE
  index_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📑 Índices da tabela:';
  RAISE NOTICE '-------------------';
  
  FOR index_record IN 
    SELECT 
      indexname,
      indexdef
    FROM pg_indexes
    WHERE tablename = 'banco_horas_versoes'
    ORDER BY indexname
  LOOP
    RAISE NOTICE '  - %', index_record.indexname;
  END LOOP;
END $$;

-- =====================================================
-- PARTE 6: Resumo e Recomendações
-- =====================================================

DO $$
DECLARE
  total_registros INTEGER;
  rls_enabled BOOLEAN;
  tem_empresa_id BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📝 RESUMO E RECOMENDAÇÕES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Verificar total de registros
  SELECT COUNT(*) INTO total_registros FROM banco_horas_versoes;
  
  -- Verificar RLS
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'banco_horas_versoes';
  
  -- Verificar se coluna empresa_id existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'banco_horas_versoes'
    AND column_name = 'empresa_id'
  ) INTO tem_empresa_id;
  
  -- Recomendações
  IF total_registros = 0 THEN
    RAISE NOTICE '⚠️ ATENÇÃO: Tabela está vazia!';
    RAISE NOTICE '   Nenhuma versão foi criada ainda.';
    RAISE NOTICE '   Isso é normal se você ainda não fez reajustes.';
  ELSE
    RAISE NOTICE '✅ Tabela contém % registro(s)', total_registros;
  END IF;
  
  RAISE NOTICE '';
  
  IF NOT rls_enabled THEN
    RAISE NOTICE '❌ PROBLEMA: RLS não está habilitado!';
    RAISE NOTICE '   Execute: ALTER TABLE banco_horas_versoes ENABLE ROW LEVEL SECURITY;';
  ELSE
    RAISE NOTICE '✅ RLS está habilitado corretamente';
  END IF;
  
  RAISE NOTICE '';
  
  IF NOT tem_empresa_id THEN
    RAISE NOTICE '❌ PROBLEMA: Coluna empresa_id não existe!';
    RAISE NOTICE '   Execute a migration: 20260122000006_fix_banco_horas_versoes_structure.sql';
  ELSE
    RAISE NOTICE '✅ Estrutura da tabela está atualizada';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;
