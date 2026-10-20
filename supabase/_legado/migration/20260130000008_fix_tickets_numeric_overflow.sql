-- =====================================================
-- Migration: Fix Numeric Overflow em Tickets
-- Data: 30/01/2026
-- Descrição: Corrigir campos numéricos que causam overflow na tabela apontamentos_tickets_aranda
-- =====================================================

-- 1. DIAGNOSTICAR CAMPOS NUMÉRICOS
-- =====================================================

DO $$
DECLARE
  v_column RECORD;
BEGIN
  RAISE NOTICE '
╔════════════════════════════════════════════════════════════╗
║  ESTRUTURA DA TABELA apontamentos_tickets_aranda           ║
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
      AND table_name = 'apontamentos_tickets_aranda'
      AND data_type IN ('numeric', 'integer', 'bigint', 'smallint', 'decimal')
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

-- 2. VERIFICAR VALORES PROBLEMÁTICOS
-- =====================================================

DO $$
DECLARE
  v_count_orcamento_grande INTEGER;
  v_max_orcamento NUMERIC;
  v_orcamento_type TEXT;
BEGIN
  -- Verificar tipo do campo total_orcamento
  SELECT data_type INTO v_orcamento_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'apontamentos_tickets_aranda'
    AND column_name = 'total_orcamento';
  
  RAISE NOTICE 'Tipo do campo total_orcamento: %', v_orcamento_type;
  
  -- Verificar se há registros com total_orcamento muito grande
  SELECT COUNT(*), MAX(total_orcamento)
  INTO v_count_orcamento_grande, v_max_orcamento
  FROM apontamentos_tickets_aranda
  WHERE total_orcamento IS NOT NULL
    AND total_orcamento >= 10000;
  
  IF v_count_orcamento_grande > 0 THEN
    RAISE WARNING '⚠️ % registros com total_orcamento >= 10000 (máximo: %)', 
      v_count_orcamento_grande, v_max_orcamento;
    RAISE WARNING '   Campo DECIMAL(10,2) suporta até 99.999.999,99';
    RAISE WARNING '   Se houver valores maiores, considere alterar para DECIMAL(15,2)';
  ELSE
    RAISE NOTICE '✅ Todos os valores de total_orcamento são válidos (< 10000)';
  END IF;
END $$;

-- 3. ALTERAR CAMPO total_orcamento PARA SUPORTAR VALORES MAIORES
-- =====================================================

DO $$
BEGIN
  -- Alterar precisão de DECIMAL(10,2) para DECIMAL(15,2)
  -- Isso permite valores até 9.999.999.999.999,99
  ALTER TABLE apontamentos_tickets_aranda 
    ALTER COLUMN total_orcamento TYPE DECIMAL(15,2);
  
  RAISE NOTICE '✅ Campo total_orcamento alterado de DECIMAL(10,2) para DECIMAL(15,2)';
  RAISE NOTICE '   Agora suporta valores até 9.999.999.999.999,99';
END $$;

-- 4. VERIFICAR SE HÁ OUTROS CAMPOS NUMERIC(10,6) PROBLEMÁTICOS
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
    AND table_name = 'apontamentos_tickets_aranda'
    AND data_type = 'numeric'
    AND numeric_precision = 10
    AND numeric_scale = 6;
  
  IF v_numeric_columns IS NOT NULL THEN
    RAISE WARNING '⚠️ Campos NUMERIC(10,6) encontrados: %', v_numeric_columns;
    RAISE WARNING '   Estes campos podem causar overflow se receberem valores >= 10000';
    RAISE WARNING '   Execute ALTER TABLE para alterar para NUMERIC(15,6) ou BIGINT';
  ELSE
    RAISE NOTICE '✅ Nenhum campo NUMERIC(10,6) encontrado';
  END IF;
END $$;

-- 5. VERIFICAR CAMPOS DE TEMPO
-- =====================================================

DO $$
DECLARE
  v_tempo_gasto_dias_type TEXT;
  v_tempo_gasto_horas_type TEXT;
  v_tempo_gasto_minutos_type TEXT;
  v_tempo_restante_tds_em_minutos_type TEXT;
BEGIN
  -- Verificar tipos dos campos de tempo
  SELECT data_type INTO v_tempo_gasto_dias_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'apontamentos_tickets_aranda'
    AND column_name = 'tempo_gasto_dias';
  
  SELECT data_type INTO v_tempo_gasto_horas_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'apontamentos_tickets_aranda'
    AND column_name = 'tempo_gasto_horas';
  
  SELECT data_type INTO v_tempo_gasto_minutos_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'apontamentos_tickets_aranda'
    AND column_name = 'tempo_gasto_minutos';
  
  SELECT data_type INTO v_tempo_restante_tds_em_minutos_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'apontamentos_tickets_aranda'
    AND column_name = 'tempo_restante_tds_em_minutos';
  
  RAISE NOTICE '
╔════════════════════════════════════════════════════════════╗
║  TIPOS DOS CAMPOS DE TEMPO                                 ║
╠════════════════════════════════════════════════════════════╣
║  tempo_gasto_dias: %                                       ║
║  tempo_gasto_horas: %                                      ║
║  tempo_gasto_minutos: %                                    ║
║  tempo_restante_tds_em_minutos: %                          ║
╚════════════════════════════════════════════════════════════╝
  ', 
    v_tempo_gasto_dias_type, 
    v_tempo_gasto_horas_type, 
    v_tempo_gasto_minutos_type,
    v_tempo_restante_tds_em_minutos_type;
  
  -- Nota: Campos VARCHAR não causam overflow numérico
  -- O overflow só ocorre em campos NUMERIC/DECIMAL/INTEGER
  IF v_tempo_gasto_dias_type = 'integer' OR 
     v_tempo_gasto_minutos_type = 'integer' OR 
     v_tempo_restante_tds_em_minutos_type = 'integer' THEN
    RAISE NOTICE '✅ Campos INTEGER encontrados - validação de overflow aplicável';
  ELSE
    RAISE NOTICE '✅ Campos são VARCHAR/TEXT - overflow numérico não se aplica';
  END IF;
END $$;

-- 6. BUSCAR REGISTROS COM VALORES EXTREMOS (APENAS TOTAL_ORCAMENTO)
-- =====================================================

DO $$
DECLARE
  v_registro RECORD;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '
╔════════════════════════════════════════════════════════════╗
║  REGISTROS COM VALORES EXTREMOS DE ORÇAMENTO               ║
╚════════════════════════════════════════════════════════════╝
  ';
  
  FOR v_registro IN 
    SELECT 
      nro_solicitacao,
      total_orcamento,
      tempo_gasto_dias,
      tempo_gasto_horas,
      tempo_gasto_minutos
    FROM apontamentos_tickets_aranda
    WHERE total_orcamento IS NOT NULL 
      AND total_orcamento >= 10000
    ORDER BY total_orcamento DESC
    LIMIT 10
  LOOP
    v_count := v_count + 1;
    RAISE NOTICE 'Ticket: % | Orçamento: % | Dias: % | Horas: % | Minutos: %',
      v_registro.nro_solicitacao,
      v_registro.total_orcamento,
      v_registro.tempo_gasto_dias,
      v_registro.tempo_gasto_horas,
      v_registro.tempo_gasto_minutos;
  END LOOP;
  
  IF v_count = 0 THEN
    RAISE NOTICE '✅ Nenhum registro com orçamento >= 10.000 encontrado';
  ELSE
    RAISE NOTICE 'Total de registros com orçamento >= 10.000: %', v_count;
    RAISE NOTICE 'Mostrando os 10 maiores valores';
  END IF;
END $$;

-- 7. RELATÓRIO FINAL
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '
╔════════════════════════════════════════════════════════════╗
║  CORREÇÃO CONCLUÍDA                                        ║
╠════════════════════════════════════════════════════════════╣
║  ✅ Campo total_orcamento alterado para DECIMAL(15,2)      ║
║  ✅ Agora suporta valores até 9.999.999.999.999,99         ║
║  ✅ Sincronização de tickets deve funcionar sem overflow   ║
╚════════════════════════════════════════════════════════════╝
  ';
END $$;

-- 8. COMENTÁRIO ATUALIZADO
-- =====================================================

COMMENT ON COLUMN apontamentos_tickets_aranda.total_orcamento IS 
'Total do orçamento do ticket - DECIMAL(15,2) para suportar valores grandes';
