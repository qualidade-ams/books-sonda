-- =====================================================
-- Migration: Correção de Segurança - search_path da função update_apontamentos_tickets_aranda_updated_at
-- Data: 2026-02-05
-- Descrição: Corrige vulnerabilidade de search_path mutável na função de trigger
-- =====================================================

-- Recriar função com configurações de segurança adequadas
DROP FUNCTION IF EXISTS public.update_apontamentos_tickets_aranda_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.update_apontamentos_tickets_aranda_updated_at()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_apontamentos_tickets_aranda_updated_at() IS 
'Função de trigger para atualizar updated_at. Usa search_path fixo para evitar vulnerabilidades de segurança.';

-- Recriar trigger
DROP TRIGGER IF EXISTS trigger_update_apontamentos_tickets_aranda_updated_at ON apontamentos_tickets_aranda;
CREATE TRIGGER trigger_update_apontamentos_tickets_aranda_updated_at
    BEFORE UPDATE ON apontamentos_tickets_aranda
    FOR EACH ROW
    EXECUTE FUNCTION update_apontamentos_tickets_aranda_updated_at();

-- =====================================================
-- VERIFICAÇÃO DE SEGURANÇA
-- =====================================================

-- Verificar se a função foi corrigida corretamente
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  proconfig as config_settings,
  CASE 
    WHEN proconfig IS NOT NULL AND 'search_path=public' = ANY(proconfig) 
    THEN '✅ SEGURO: search_path fixo definido'
    ELSE '⚠️ VULNERABILIDADE: search_path não definido ou mutável'
  END as security_status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname = 'update_apontamentos_tickets_aranda_updated_at'
  AND prokind = 'f';

-- =====================================================
-- LOG DE CORREÇÃO
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CORREÇÃO DE SEGURANÇA APLICADA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Função: update_apontamentos_tickets_aranda_updated_at';
  RAISE NOTICE 'Status: SECURITY DEFINER com search_path fixo';
  RAISE NOTICE 'Vulnerabilidade: CORRIGIDA';
  RAISE NOTICE '========================================';
END $$;