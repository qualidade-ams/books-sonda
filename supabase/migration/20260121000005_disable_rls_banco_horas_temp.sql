-- =====================================================
-- Migration: Desabilitar RLS Temporariamente - Banco de Horas
-- Data: 2026-01-21
-- Descrição: Desabilita RLS temporariamente para resolver erro 406
-- ATENÇÃO: Esta é uma solução temporária para desenvolvimento
-- =====================================================

-- =====================================================
-- PARTE 1: Remover TODAS as políticas existentes
-- =====================================================

-- banco_horas_calculos
DROP POLICY IF EXISTS "allow_authenticated_select_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "allow_authenticated_insert_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "allow_authenticated_update_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "allow_authenticated_delete_calculos" ON banco_horas_calculos;

-- =====================================================
-- PARTE 2: Desabilitar RLS temporariamente
-- =====================================================

ALTER TABLE banco_horas_calculos DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- PARTE 3: Verificação
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ RLS DESABILITADO TEMPORARIAMENTE para banco_horas_calculos';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Status:';
  RAISE NOTICE '   ❌ RLS: DESABILITADO';
  RAISE NOTICE '   ✅ Acesso: IRRESTRITO (apenas para desenvolvimento)';
  RAISE NOTICE '';
  RAISE NOTICE '🔴 ATENÇÃO:';
  RAISE NOTICE '   Esta é uma solução TEMPORÁRIA para resolver o erro 406';
  RAISE NOTICE '   RLS deve ser reabilitado em produção com políticas corretas';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Próximos passos:';
  RAISE NOTICE '   1. Testar se erro 406 foi resolvido';
  RAISE NOTICE '   2. Identificar causa raiz do problema de RLS';
  RAISE NOTICE '   3. Criar políticas RLS corretas';
  RAISE NOTICE '   4. Reabilitar RLS com políticas funcionais';
  RAISE NOTICE '';
END $$;
