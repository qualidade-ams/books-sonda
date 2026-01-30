-- =====================================================
-- Migration: Adicionar campos de controle de sincronização incremental
-- Tabela: apontamentos_tickets_aranda
-- Data: 30/01/2026
-- Descrição: Adiciona campos para sincronização incremental idempotente
-- =====================================================

-- Adicionar campos de controle de sincronização
ALTER TABLE public.apontamentos_tickets_aranda
  ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

-- Criar índices para otimizar sincronização incremental
CREATE INDEX IF NOT EXISTS idx_tickets_aranda_source_updated_at 
  ON public.apontamentos_tickets_aranda(source_updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_tickets_aranda_synced_at 
  ON public.apontamentos_tickets_aranda(synced_at DESC);

-- Comentários para documentação
COMMENT ON COLUMN public.apontamentos_tickets_aranda.source_updated_at IS 
  'Data de última modificação no sistema de origem (AMSticketsabertos.Data_Ultima_Modificacao) - usado para sincronização incremental';

COMMENT ON COLUMN public.apontamentos_tickets_aranda.synced_at IS 
  'Timestamp da última sincronização bem-sucedida deste registro';

-- Atualizar registros existentes com valores de data_ultima_modificacao
-- (se já houver dados sincronizados)
UPDATE public.apontamentos_tickets_aranda
SET 
  source_updated_at = COALESCE(data_ultima_modificacao, data_abertura, created_at),
  synced_at = created_at
WHERE source_updated_at IS NULL;

-- Verificação
DO $$
BEGIN
  RAISE NOTICE '✅ Campos de controle de sincronização adicionados à tabela apontamentos_tickets_aranda';
  RAISE NOTICE '   - source_updated_at: Data de última modificação no sistema de origem';
  RAISE NOTICE '   - synced_at: Timestamp da última sincronização';
  RAISE NOTICE '   - Índices criados para otimizar consultas incrementais';
END $$;

