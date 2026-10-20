-- =====================================================
-- Migration: Fix Numeric Field Overflow
-- Data: 30/01/2026
-- Descrição: Investigar e corrigir campos numéricos que causam overflow
-- =====================================================

-- 1. VERIFICAR ESTRUTURA DA TABELA
-- =====================================================

DO $$
DECLARE
  v_column RECORD;
BEGIN
  RAISE NOTICE '
╔════════════════════════════════════════════════════════════╗
║  ESTRUTURA DA TABELA pesquisas_satisfacao                  ║
╚════════════════════════════════════════════════════════════╝
  ';
  
  FOR v_column IN 
    SELECT 
      column_name,
      data_type,
      numeric_precision,
      numeric_scale,
      character_maximum_length,
      is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pesquisas_satisfacao'
      AND data_type IN ('numeric', 'integer', 'bigint', 'smallint')
    ORDER BY ordinal_position
  LOOP
    RAISE NOTICE 'Campo: % | Tipo: % | Precisão: % | Escala: % | Nullable: %',
      v_column.column_name,
      v_column.data_type,
      v_column.numeric_precision,
      v_column.numeric_scale,
      v_column.is_nullable;
  END LOOP;
END $$;

-- 2. VERIFICAR SE HÁ CAMPOS NUMERIC(10,6) PROBLEMÁTICOS
-- =====================================================

DO $$
DECLARE
  v_numeric_columns TEXT[];
BEGIN
  -- Buscar colunas NUMERIC(10,6)
  SELECT array_agg(column_name)
  INTO v_numeric_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'pesquisas_satisfacao'
    AND data_type = 'numeric'
    AND numeric_precision = 10
    AND numeric_scale = 6;
  
  IF v_numeric_columns IS NOT NULL THEN
    RAISE NOTICE '⚠️ Campos NUMERIC(10,6) encontrados: %', v_numeric_columns;
    RAISE NOTICE '   Estes campos podem causar overflow se receberem valores >= 10000';
    RAISE NOTICE '   Considere alterar para NUMERIC(15,6) ou BIGINT';
  ELSE
    RAISE NOTICE '✅ Nenhum campo NUMERIC(10,6) encontrado';
  END IF;
END $$;

-- 3. VERIFICAR CAMPOS ano_abertura E mes_abertura
-- =====================================================

DO $$
DECLARE
  v_ano_type TEXT;
  v_mes_type TEXT;
BEGIN
  -- Verificar tipo de ano_abertura
  SELECT data_type INTO v_ano_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'pesquisas_satisfacao'
    AND column_name = 'ano_abertura';
  
  -- Verificar tipo de mes_abertura
  SELECT data_type INTO v_mes_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'pesquisas_satisfacao'
    AND column_name = 'mes_abertura';
  
  RAISE NOTICE '
╔════════════════════════════════════════════════════════════╗
║  CAMPOS DE DATA                                            ║
╠════════════════════════════════════════════════════════════╣
║  ano_abertura: %                                           ║
║  mes_abertura: %                                           ║
╚════════════════════════════════════════════════════════════╝
  ', v_ano_type, v_mes_type;
  
  IF v_ano_type = 'integer' AND v_mes_type = 'integer' THEN
    RAISE NOTICE '✅ Campos ano_abertura e mes_abertura são INTEGER (correto)';
  ELSE
    RAISE WARNING '⚠️ Tipos inesperados para campos de data';
  END IF;
END $$;

-- 4. BUSCAR REGISTROS COM VALORES PROBLEMÁTICOS
-- =====================================================

DO $$
DECLARE
  v_count_ano_invalido INTEGER;
  v_count_mes_invalido INTEGER;
BEGIN
  -- Contar registros com ano inválido
  SELECT COUNT(*) INTO v_count_ano_invalido
  FROM pesquisas_satisfacao
  WHERE ano_abertura IS NOT NULL
    AND (ano_abertura < 2000 OR ano_abertura > 2100);
  
  -- Contar registros com mês inválido
  SELECT COUNT(*) INTO v_count_mes_invalido
  FROM pesquisas_satisfacao
  WHERE mes_abertura IS NOT NULL
    AND (mes_abertura < 1 OR mes_abertura > 12);
  
  IF v_count_ano_invalido > 0 THEN
    RAISE WARNING '⚠️ % registros com ano_abertura inválido (< 2000 ou > 2100)', v_count_ano_invalido;
  ELSE
    RAISE NOTICE '✅ Todos os valores de ano_abertura são válidos';
  END IF;
  
  IF v_count_mes_invalido > 0 THEN
    RAISE WARNING '⚠️ % registros com mes_abertura inválido (< 1 ou > 12)', v_count_mes_invalido;
  ELSE
    RAISE NOTICE '✅ Todos os valores de mes_abertura são válidos';
  END IF;
END $$;

-- 5. RELATÓRIO FINAL
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '
╔════════════════════════════════════════════════════════════╗
║  DIAGNÓSTICO CONCLUÍDO                                     ║
╠════════════════════════════════════════════════════════════╣
║  Verifique os logs acima para identificar o problema       ║
║  Se houver campos NUMERIC(10,6), considere alterá-los      ║
║  Se houver valores inválidos, corrija-os antes de sync     ║
╚════════════════════════════════════════════════════════════╝
  ';
END $$;
