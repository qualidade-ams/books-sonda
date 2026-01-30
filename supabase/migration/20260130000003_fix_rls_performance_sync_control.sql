-- =====================================================
-- Migration: Fix RLS Performance - sync_control_pesquisas
-- Data: 2026-01-30
-- Descrição: Otimiza políticas RLS substituindo auth.role()
--            por (SELECT auth.role()) para melhor performance
-- =====================================================

-- PROBLEMA: auth.role() é reavaliado para cada linha
-- SOLUÇÃO: (SELECT auth.role()) é avaliado uma vez por query

-- 1. REMOVER POLÍTICAS ANTIGAS
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view sync control" ON public.sync_control_pesquisas;
DROP POLICY IF EXISTS "Service role can insert sync control" ON public.sync_control_pesquisas;
DROP POLICY IF EXISTS "Service role can update sync control" ON public.sync_control_pesquisas;
DROP POLICY IF EXISTS "Service role can delete sync control" ON public.sync_control_pesquisas;

-- 2. CRIAR POLÍTICAS OTIMIZADAS
-- =====================================================

-- Política SELECT: Apenas usuários autenticados (OTIMIZADA)
CREATE POLICY "Authenticated users can view sync control" 
  ON public.sync_control_pesquisas
  FOR SELECT 
  USING ((SELECT auth.role()) = 'authenticated');

-- Política INSERT: Apenas service_role (OTIMIZADA)
CREATE POLICY "Service role can insert sync control" 
  ON public.sync_control_pesquisas
  FOR INSERT 
  WITH CHECK ((SELECT auth.role()) = 'service_role');

-- Política UPDATE: Apenas service_role (OTIMIZADA)
CREATE POLICY "Service role can update sync control" 
  ON public.sync_control_pesquisas
  FOR UPDATE 
  USING ((SELECT auth.role()) = 'service_role');

-- Política DELETE: Apenas service_role (OTIMIZADA)
CREATE POLICY "Service role can delete sync control" 
  ON public.sync_control_pesquisas
  FOR DELETE 
  USING ((SELECT auth.role()) = 'service_role');

-- 3. VALIDAÇÃO
-- =====================================================
DO $$
DECLARE
  v_policy_count integer;
  v_policy record;
BEGIN
  -- Contar políticas
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'sync_control_pesquisas';
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ POLÍTICAS RLS OTIMIZADAS';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE 'Total de políticas criadas: %', v_policy_count;
  RAISE NOTICE '';
  
  -- Listar políticas
  FOR v_policy IN
    SELECT 
      policyname,
      cmd,
      qual
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sync_control_pesquisas'
    ORDER BY cmd
  LOOP
    RAISE NOTICE '✅ % (%) - Otimizada', v_policy.policyname, v_policy.cmd;
  END LOOP;
  
  RAISE NOTICE '';
  
  IF v_policy_count = 4 THEN
    RAISE NOTICE '🎉 Todas as 4 políticas foram criadas com sucesso!';
  ELSE
    RAISE NOTICE '⚠️ Esperado 4 políticas, encontrado %', v_policy_count;
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- 4. COMENTÁRIOS EXPLICATIVOS
-- =====================================================
COMMENT ON POLICY "Authenticated users can view sync control" ON public.sync_control_pesquisas IS 
'Permite visualização para usuários autenticados. Usa (SELECT auth.role()) para performance otimizada.';

COMMENT ON POLICY "Service role can insert sync control" ON public.sync_control_pesquisas IS 
'Permite inserção apenas para service_role. Usa (SELECT auth.role()) para performance otimizada.';

COMMENT ON POLICY "Service role can update sync control" ON public.sync_control_pesquisas IS 
'Permite atualização apenas para service_role. Usa (SELECT auth.role()) para performance otimizada.';

COMMENT ON POLICY "Service role can delete sync control" ON public.sync_control_pesquisas IS 
'Permite deleção apenas para service_role. Usa (SELECT auth.role()) para performance otimizada.';

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
