-- Migration: Recalculate clients with zero consumption but have apontamentos
-- Created: 2026-02-13
-- Purpose: Force recalculation for specific clients identified with the issue

-- ============================================================================
-- STEP 1: Identify and delete calculations that need recalculation
-- ============================================================================

-- Based on the query results, these clients have apontamentos but show zero consumption:
-- - ANGLO: 02/2026
-- - APERAM: 09/2025
-- - BOEHRINGER: 11/2025, 10/2025, 09/2025

DO $$
DECLARE
  v_empresa_id UUID;
  v_deleted_count INTEGER := 0;
BEGIN
  -- ANGLO - 02/2026
  SELECT id INTO v_empresa_id FROM empresas_clientes WHERE nome_abreviado = 'ANGLO';
  IF v_empresa_id IS NOT NULL THEN
    DELETE FROM banco_horas_calculos 
    WHERE empresa_id = v_empresa_id AND mes = 2 AND ano = 2026;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RAISE NOTICE 'ANGLO 02/2026: % cálculo(s) deletado(s)', v_deleted_count;
  END IF;

  -- APERAM - 09/2025
  SELECT id INTO v_empresa_id FROM empresas_clientes WHERE nome_abreviado = 'APERAM';
  IF v_empresa_id IS NOT NULL THEN
    DELETE FROM banco_horas_calculos 
    WHERE empresa_id = v_empresa_id AND mes = 9 AND ano = 2025;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RAISE NOTICE 'APERAM 09/2025: % cálculo(s) deletado(s)', v_deleted_count;
  END IF;

  -- BOEHRINGER - 11/2025
  SELECT id INTO v_empresa_id FROM empresas_clientes WHERE nome_abreviado = 'BOEHRINGER';
  IF v_empresa_id IS NOT NULL THEN
    DELETE FROM banco_horas_calculos 
    WHERE empresa_id = v_empresa_id AND mes = 11 AND ano = 2025;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RAISE NOTICE 'BOEHRINGER 11/2025: % cálculo(s) deletado(s)', v_deleted_count;
  END IF;

  -- BOEHRINGER - 10/2025
  SELECT id INTO v_empresa_id FROM empresas_clientes WHERE nome_abreviado = 'BOEHRINGER';
  IF v_empresa_id IS NOT NULL THEN
    DELETE FROM banco_horas_calculos 
    WHERE empresa_id = v_empresa_id AND mes = 10 AND ano = 2025;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RAISE NOTICE 'BOEHRINGER 10/2025: % cálculo(s) deletado(s)', v_deleted_count;
  END IF;

  -- BOEHRINGER - 09/2025
  SELECT id INTO v_empresa_id FROM empresas_clientes WHERE nome_abreviado = 'BOEHRINGER';
  IF v_empresa_id IS NOT NULL THEN
    DELETE FROM banco_horas_calculos 
    WHERE empresa_id = v_empresa_id AND mes = 9 AND ano = 2025;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RAISE NOTICE 'BOEHRINGER 09/2025: % cálculo(s) deletado(s)', v_deleted_count;
  END IF;

  RAISE NOTICE '✅ Cálculos deletados com sucesso. O sistema recalculará automaticamente quando acessado.';
END $$;

-- ============================================================================
-- STEP 2: Verification query
-- ============================================================================

-- Verify that the calculations were deleted
SELECT 
  ec.nome_abreviado,
  bhc.mes,
  bhc.ano,
  bhc.consumo_horas,
  'Cálculo ainda existe - aguardando recálculo' as status
FROM banco_horas_calculos bhc
JOIN empresas_clientes ec ON ec.id = bhc.empresa_id
WHERE (
  (ec.nome_abreviado = 'ANGLO' AND bhc.mes = 2 AND bhc.ano = 2026) OR
  (ec.nome_abreviado = 'APERAM' AND bhc.mes = 9 AND bhc.ano = 2025) OR
  (ec.nome_abreviado = 'BOEHRINGER' AND bhc.mes IN (9, 10, 11) AND bhc.ano = 2025)
);

-- If the query above returns no rows, the deletion was successful

-- ============================================================================
-- STEP 3: Query to check apontamentos for these clients
-- ============================================================================

-- Verify that these clients actually have apontamentos
SELECT 
  'ANGLO' as cliente,
  '02/2026' as periodo,
  COUNT(*) as total_apontamentos,
  SUM(
    CASE 
      WHEN tempo_gasto_horas IS NOT NULL THEN 
        EXTRACT(HOUR FROM tempo_gasto_horas::interval) * 60 + 
        EXTRACT(MINUTE FROM tempo_gasto_horas::interval)
      ELSE tempo_gasto_minutos
    END
  ) as total_minutos
FROM apontamentos_aranda
WHERE org_us_final ILIKE '%ANGLO%'
  AND ativi_interna = 'Não'
  AND item_configuracao != '000000 - PROJETOS APL'
  AND tipo_chamado IN ('IM', 'RF', 'PM')
  AND data_atividade >= '2026-02-01'
  AND data_atividade < '2026-03-01'

UNION ALL

SELECT 
  'APERAM' as cliente,
  '09/2025' as periodo,
  COUNT(*) as total_apontamentos,
  SUM(
    CASE 
      WHEN tempo_gasto_horas IS NOT NULL THEN 
        EXTRACT(HOUR FROM tempo_gasto_horas::interval) * 60 + 
        EXTRACT(MINUTE FROM tempo_gasto_horas::interval)
      ELSE tempo_gasto_minutos
    END
  ) as total_minutos
FROM apontamentos_aranda
WHERE org_us_final ILIKE '%APERAM%'
  AND ativi_interna = 'Não'
  AND item_configuracao != '000000 - PROJETOS APL'
  AND tipo_chamado IN ('IM', 'RF', 'PM')
  AND data_atividade >= '2025-09-01'
  AND data_atividade < '2025-10-01'

UNION ALL

SELECT 
  'BOEHRINGER' as cliente,
  '11/2025' as periodo,
  COUNT(*) as total_apontamentos,
  SUM(
    CASE 
      WHEN tempo_gasto_horas IS NOT NULL THEN 
        EXTRACT(HOUR FROM tempo_gasto_horas::interval) * 60 + 
        EXTRACT(MINUTE FROM tempo_gasto_horas::interval)
      ELSE tempo_gasto_minutos
    END
  ) as total_minutos
FROM apontamentos_aranda
WHERE org_us_final ILIKE '%BOEHRINGER%'
  AND ativi_interna = 'Não'
  AND item_configuracao != '000000 - PROJETOS APL'
  AND tipo_chamado IN ('IM', 'RF', 'PM')
  AND data_atividade >= '2025-11-01'
  AND data_atividade < '2025-12-01'

UNION ALL

SELECT 
  'BOEHRINGER' as cliente,
  '10/2025' as periodo,
  COUNT(*) as total_apontamentos,
  SUM(
    CASE 
      WHEN tempo_gasto_horas IS NOT NULL THEN 
        EXTRACT(HOUR FROM tempo_gasto_horas::interval) * 60 + 
        EXTRACT(MINUTE FROM tempo_gasto_horas::interval)
      ELSE tempo_gasto_minutos
    END
  ) as total_minutos
FROM apontamentos_aranda
WHERE org_us_final ILIKE '%BOEHRINGER%'
  AND ativi_interna = 'Não'
  AND item_configuracao != '000000 - PROJETOS APL'
  AND tipo_chamado IN ('IM', 'RF', 'PM')
  AND data_atividade >= '2025-10-01'
  AND data_atividade < '2025-11-01'

UNION ALL

SELECT 
  'BOEHRINGER' as cliente,
  '09/2025' as periodo,
  COUNT(*) as total_apontamentos,
  SUM(
    CASE 
      WHEN tempo_gasto_horas IS NOT NULL THEN 
        EXTRACT(HOUR FROM tempo_gasto_horas::interval) * 60 + 
        EXTRACT(MINUTE FROM tempo_gasto_horas::interval)
      ELSE tempo_gasto_minutos
    END
  ) as total_minutos
FROM apontamentos_aranda
WHERE org_us_final ILIKE '%BOEHRINGER%'
  AND ativi_interna = 'Não'
  AND item_configuracao != '000000 - PROJETOS APL'
  AND tipo_chamado IN ('IM', 'RF', 'PM')
  AND data_atividade >= '2025-09-01'
  AND data_atividade < '2025-10-01';

-- ============================================================================
-- NOTES
-- ============================================================================

-- After running this migration:
-- 1. The old calculations with zero consumption will be deleted
-- 2. When users access the Banco de Horas page for these clients/periods,
--    the system will automatically recalculate with the correct filter
-- 3. The new calculations will show the correct consumption values
--
-- No manual intervention is needed after running this migration.
-- The frontend will handle the recalculation automatically.
