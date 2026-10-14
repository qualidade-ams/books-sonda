-- Migration: Identify clients with zero consumption that need recalculation
-- Created: 2026-02-13
-- Purpose: Find banco_horas_calculos records with consumo_horas = '00:00' or '0:00'
--          that should have consumption data from apontamentos_aranda

-- ============================================================================
-- STEP 1: Query to identify clients with zero consumption
-- ============================================================================

-- This query identifies calculations with zero consumption that likely have
-- actual apontamentos data that wasn't counted due to the old filter bug
SELECT 
  bhc.id as calculo_id,
  bhc.empresa_id,
  ec.nome_abreviado as empresa_nome,
  bhc.mes,
  bhc.ano,
  bhc.consumo_horas,
  bhc.consumo_tickets,
  bhc.created_at,
  -- Check if there are apontamentos for this company/period
  (
    SELECT COUNT(*)
    FROM apontamentos_aranda aa
    WHERE aa.org_us_final ILIKE '%' || COALESCE(ec.nome_abreviado, ec.nome_completo) || '%'
      AND aa.ativi_interna = 'Não'
      AND aa.item_configuracao != '000000 - PROJETOS APL'
      AND aa.tipo_chamado IN ('IM', 'RF', 'PM')
      AND aa.data_atividade >= DATE_TRUNC('month', MAKE_DATE(bhc.ano, bhc.mes, 1))
      AND aa.data_atividade < DATE_TRUNC('month', MAKE_DATE(bhc.ano, bhc.mes, 1)) + INTERVAL '1 month'
    LIMIT 1
  ) as tem_apontamentos
FROM banco_horas_calculos bhc
JOIN empresas_clientes ec ON ec.id = bhc.empresa_id
WHERE (bhc.consumo_horas = '00:00' OR bhc.consumo_horas = '0:00' OR bhc.consumo_horas IS NULL)
  AND bhc.ano >= 2025 -- Only check recent calculations
ORDER BY bhc.ano DESC, bhc.mes DESC, ec.nome_abreviado;

-- ============================================================================
-- STEP 2: Comment explaining the solution
-- ============================================================================

-- SOLUTION:
-- The calculations with zero consumption need to be recalculated using the
-- corrected buscarConsumo() function that includes tipo_chamado IN ('IM', 'RF', 'PM').
--
-- To fix this:
-- 1. Delete the old calculation record from banco_horas_calculos
-- 2. The frontend will automatically call obterOuCalcular() which will:
--    - Not find the calculation (deleted)
--    - Call calcularMes() to create a new one
--    - Use the corrected buscarConsumo() with the fixed filter
--    - Save the new calculation with correct consumption values
--
-- MANUAL FIX (if needed):
-- DELETE FROM banco_horas_calculos 
-- WHERE id IN (
--   SELECT bhc.id
--   FROM banco_horas_calculos bhc
--   JOIN empresas_clientes ec ON ec.id = bhc.empresa_id
--   WHERE (bhc.consumo_horas = '00:00' OR bhc.consumo_horas = '0:00')
--     AND bhc.ano >= 2025
--     AND EXISTS (
--       SELECT 1
--       FROM apontamentos_aranda aa
--       WHERE aa.org_us_final ILIKE '%' || COALESCE(ec.nome_abreviado, ec.nome_completo) || '%'
--         AND aa.ativi_interna = 'Não'
--         AND aa.tipo_chamado IN ('IM', 'RF', 'PM')
--         AND aa.data_atividade >= DATE_TRUNC('month', MAKE_DATE(bhc.ano, bhc.mes, 1))
--         AND aa.data_atividade < DATE_TRUNC('month', MAKE_DATE(bhc.ano, bhc.mes, 1)) + INTERVAL '1 month'
--       LIMIT 1
--     )
-- );
--
-- After deletion, the frontend will automatically recalculate when the user
-- accesses the Banco de Horas page for that client/period.

-- ============================================================================
-- STEP 3: Create a function to force recalculation for a specific client/period
-- ============================================================================

CREATE OR REPLACE FUNCTION public.force_recalculate_banco_horas(
  p_empresa_id UUID,
  p_mes INTEGER,
  p_ano INTEGER
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Validate parameters
  IF p_empresa_id IS NULL THEN
    RAISE EXCEPTION 'empresa_id é obrigatório';
  END IF;
  
  IF p_mes < 1 OR p_mes > 12 THEN
    RAISE EXCEPTION 'mes deve estar entre 1 e 12';
  END IF;
  
  IF p_ano < 2020 THEN
    RAISE EXCEPTION 'ano deve ser maior ou igual a 2020';
  END IF;
  
  -- Delete existing calculation
  DELETE FROM banco_horas_calculos
  WHERE empresa_id = p_empresa_id
    AND mes = p_mes
    AND ano = p_ano;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Return success message
  RETURN FORMAT(
    'Cálculo deletado com sucesso. %s registro(s) removido(s). O sistema recalculará automaticamente quando acessado.',
    v_deleted_count
  );
END;
$$;

COMMENT ON FUNCTION public.force_recalculate_banco_horas IS 
'Força recálculo de banco de horas deletando o cálculo existente. O sistema recalculará automaticamente quando o usuário acessar a página.';

-- ============================================================================
-- STEP 4: Grant permissions
-- ============================================================================

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.force_recalculate_banco_horas TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Query 1: Count clients with zero consumption
SELECT 
  COUNT(*) as total_calculos_zero,
  COUNT(DISTINCT empresa_id) as total_empresas_afetadas
FROM banco_horas_calculos
WHERE (consumo_horas = '00:00' OR consumo_horas = '0:00' OR consumo_horas IS NULL)
  AND ano >= 2025;

-- Query 2: List clients with zero consumption and check if they have apontamentos
SELECT 
  ec.nome_abreviado,
  bhc.mes,
  bhc.ano,
  bhc.consumo_horas,
  CASE 
    WHEN EXISTS (
      SELECT 1
      FROM apontamentos_aranda aa
      WHERE aa.org_us_final ILIKE '%' || COALESCE(ec.nome_abreviado, ec.nome_completo) || '%'
        AND aa.ativi_interna = 'Não'
        AND aa.tipo_chamado IN ('IM', 'RF', 'PM')
        AND aa.data_atividade >= DATE_TRUNC('month', MAKE_DATE(bhc.ano, bhc.mes, 1))
        AND aa.data_atividade < DATE_TRUNC('month', MAKE_DATE(bhc.ano, bhc.mes, 1)) + INTERVAL '1 month'
      LIMIT 1
    ) THEN 'SIM - Precisa recalcular'
    ELSE 'NÃO - Zero correto'
  END as tem_apontamentos
FROM banco_horas_calculos bhc
JOIN empresas_clientes ec ON ec.id = bhc.empresa_id
WHERE (bhc.consumo_horas = '00:00' OR bhc.consumo_horas = '0:00')
  AND bhc.ano >= 2025
ORDER BY ec.nome_abreviado, bhc.ano DESC, bhc.mes DESC;
