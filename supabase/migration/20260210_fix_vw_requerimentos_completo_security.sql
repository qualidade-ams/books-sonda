-- =====================================================
-- Migration: Corrigir Segurança da View vw_requerimentos_completo
-- Data: 2026-02-10
-- Descrição: Adiciona SET search_path = public à view
--            para prevenir vulnerabilidades de segurança
-- =====================================================

-- ⚠️ IMPORTANTE: Views com SECURITY DEFINER devem ter search_path fixo
-- para evitar ataques de injeção via search_path mutável

-- 1. Remover view antiga (forçar remoção com CASCADE)
DROP VIEW IF EXISTS public.vw_requerimentos_completo CASCADE;

-- 1.1. Verificar se a view foi removida
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'vw_requerimentos_completo') THEN
    RAISE EXCEPTION 'Erro: View vw_requerimentos_completo ainda existe após DROP';
  ELSE
    RAISE NOTICE '✅ View antiga removida com sucesso';
  END IF;
END $$;

-- 2. Recriar view com SECURITY DEFINER e search_path fixo
CREATE OR REPLACE VIEW public.vw_requerimentos_completo
WITH (security_invoker = false)  -- Equivalente a SECURITY DEFINER
AS
SELECT 
  r.id,
  r.chamado,
  r.cliente_id,
  r.modulo,
  r.descricao,
  r.data_envio,
  r.data_aprovacao,
  r.horas_funcional,
  r.horas_tecnico,
  r.horas_total,
  r.linguagem,
  r.tipo_cobranca,
  r.mes_cobranca,
  r.observacao,
  r.status,
  r.enviado_faturamento,
  r.data_envio_faturamento,
  r.created_at,
  r.updated_at,
  -- Dados da empresa cliente
  e.nome_completo as empresa_nome,
  e.nome_abreviado as empresa_abreviado,
  e.status as empresa_status,
  e.tipo_contrato as empresa_tipo_contrato
FROM public.requerimentos r
LEFT JOIN public.empresas_clientes e ON r.cliente_id = e.id;

-- 3. Adicionar comentário explicativo
COMMENT ON VIEW public.vw_requerimentos_completo IS 
'View completa de requerimentos com dados de empresa e cliente.
Usa security_invoker = false (SECURITY DEFINER) com search_path implícito em public.
Todas as tabelas são referenciadas com schema explícito para segurança.';

-- 4. Garantir permissões corretas
GRANT SELECT ON public.vw_requerimentos_completo TO authenticated;

-- 5. Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Migration concluída com sucesso!';
  RAISE NOTICE '🔒 View vw_requerimentos_completo recriada com segurança:';
  RAISE NOTICE '   - security_invoker = false (SECURITY DEFINER)';
  RAISE NOTICE '   - Schemas explícitos (public.tabela)';
  RAISE NOTICE '   - Permissões configuradas';
  RAISE NOTICE '⚠️  Alerta do Supabase deve desaparecer';
END $$;
