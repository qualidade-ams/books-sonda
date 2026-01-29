-- =====================================================
-- Migration: Correção de Segurança - Função update_apontamentos_tickets_aranda_updated_at
-- Data: 2026-01-29
-- Descrição: Corrige vulnerabilidade de search_path na função de trigger
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
'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades de injeção.';

-- Recriar trigger
CREATE TRIGGER trigger_update_apontamentos_tickets_aranda_updated_at
BEFORE UPDATE ON apontamentos_tickets_aranda
FOR EACH ROW
EXECUTE FUNCTION update_apontamentos_tickets_aranda_updated_at();

-- =====================================================
-- Verificação de Segurança
-- =====================================================

-- Verificar se a função está segura
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  proconfig as config_settings,
  CASE 
    WHEN proconfig IS NULL OR NOT ('search_path=public' = ANY(proconfig)) 
    THEN '⚠️ VULNERABILIDADE: search_path não definido'
    ELSE '✅ Seguro'
  END as security_status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname = 'update_apontamentos_tickets_aranda_updated_at'
  AND prokind = 'f';
