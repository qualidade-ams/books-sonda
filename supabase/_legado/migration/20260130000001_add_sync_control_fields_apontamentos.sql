-- =====================================================
-- Migration: Adicionar campos de controle de sincronização incremental
-- Tabela: apontamentos_aranda
-- Data: 30/01/2026
-- Descrição: Adiciona campos para sincronização incremental idempotente
-- =====================================================

-- Adicionar campos de controle de sincronização
ALTER TABLE public.apontamentos_aranda
  ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_ult_modificacao_tarefa TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_ult_modificacao_geral TIMESTAMPTZ;

-- Criar índices para otimizar sincronização incremental
CREATE INDEX IF NOT EXISTS idx_apontamentos_aranda_source_updated_at 
  ON public.apontamentos_aranda(source_updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_apontamentos_aranda_synced_at 
  ON public.apontamentos_aranda(synced_at DESC);

CREATE INDEX IF NOT EXISTS idx_apontamentos_aranda_data_ult_modificacao_geral 
  ON public.apontamentos_aranda(data_ult_modificacao_geral DESC);

-- Comentários para documentação
COMMENT ON COLUMN public.apontamentos_aranda.source_updated_at IS 
  'Data de última modificação no sistema de origem (AMSapontamento.Data_Ult_Modificacao_Geral) - usado para sincronização incremental';

COMMENT ON COLUMN public.apontamentos_aranda.synced_at IS 
  'Timestamp da última sincronização bem-sucedida deste registro';

COMMENT ON COLUMN public.apontamentos_aranda.data_ult_modificacao_tarefa IS 
  'Data de última modificação da tarefa (AMSapontamento.Data_Ult_Modificacao_tarefa)';

COMMENT ON COLUMN public.apontamentos_aranda.data_ult_modificacao_geral IS 
  'Data de última modificação geral (AMSapontamento.Data_Ult_Modificacao_Geral) - cópia para consultas';

-- Atualizar registros existentes com valores de data_ult_modificacao
-- (se já houver dados sincronizados)
UPDATE public.apontamentos_aranda
SET 
  source_updated_at = COALESCE(data_ult_modificacao, data_abertura, created_at),
  synced_at = created_at,
  data_ult_modificacao_geral = data_ult_modificacao
WHERE source_updated_at IS NULL;

-- Verificação
DO $$
BEGIN
  RAISE NOTICE '✅ Campos de controle de sincronização adicionados à tabela apontamentos_aranda';
  RAISE NOTICE '   - source_updated_at: Data de última modificação no sistema de origem';
  RAISE NOTICE '   - synced_at: Timestamp da última sincronização';
  RAISE NOTICE '   - data_ult_modificacao_tarefa: Data de modificação da tarefa';
  RAISE NOTICE '   - data_ult_modificacao_geral: Data de modificação geral';
  RAISE NOTICE '   - Índices criados para otimizar consultas incrementais';
END $$;

