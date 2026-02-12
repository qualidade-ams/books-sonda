-- ============================================================================
-- Migration: Remover View Não Utilizada vw_requerimentos_completo
-- Data: 2026-02-10
-- Descrição: Remove a view vw_requerimentos_completo que não está sendo 
--            utilizada no código da aplicação
-- ============================================================================

-- Verificar se a view existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.views 
    WHERE table_schema = 'public' 
      AND table_name = 'vw_requerimentos_completo'
  ) THEN
    RAISE NOTICE '📋 View vw_requerimentos_completo encontrada. Removendo...';
  ELSE
    RAISE NOTICE '✅ View vw_requerimentos_completo não existe. Nada a fazer.';
  END IF;
END $$;

-- Remover a view (CASCADE para remover dependências)
DROP VIEW IF EXISTS public.vw_requerimentos_completo CASCADE;

-- Verificar se foi removida com sucesso
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.views 
    WHERE table_schema = 'public' 
      AND table_name = 'vw_requerimentos_completo'
  ) THEN
    RAISE EXCEPTION '❌ Erro: View vw_requerimentos_completo ainda existe após DROP';
  ELSE
    RAISE NOTICE '✅ View vw_requerimentos_completo removida com sucesso!';
  END IF;
END $$;

-- ============================================================================
-- JUSTIFICATIVA DA REMOÇÃO
-- ============================================================================

-- A view vw_requerimentos_completo foi criada em migrations antigas mas:
-- 
-- 1. NÃO está sendo utilizada no código TypeScript/React
-- 2. NÃO está sendo referenciada em nenhum serviço
-- 3. NÃO está sendo usada em nenhum hook
-- 4. NÃO está sendo usada em nenhum componente
-- 
-- A aplicação acessa diretamente a tabela 'requerimentos' através do 
-- Supabase client, sem necessidade desta view intermediária.
-- 
-- Benefícios da remoção:
-- - Reduz complexidade do banco de dados
-- - Remove objeto não utilizado
-- - Facilita manutenção futura
-- - Elimina possíveis alertas de segurança relacionados à view

-- ============================================================================
-- ROLLBACK (se necessário)
-- ============================================================================

-- Se precisar recriar a view no futuro, use:
-- 
-- CREATE OR REPLACE VIEW public.vw_requerimentos_completo
-- WITH (security_invoker = true)
-- AS
-- SELECT 
--   r.*,
--   ec.nome_completo as cliente_nome,
--   es.nome_completo as empresa_segmentacao_nome
-- FROM public.requerimentos r
-- LEFT JOIN public.empresas_clientes ec ON r.cliente_id = ec.id
-- LEFT JOIN public.empresas_clientes es ON r.empresa_segmentacao_id = es.id;

COMMENT ON SCHEMA public IS 'View vw_requerimentos_completo removida em 2026-02-10 por não estar em uso';
