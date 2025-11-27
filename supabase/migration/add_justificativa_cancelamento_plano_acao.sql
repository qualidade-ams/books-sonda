-- =====================================================
-- MIGRAÇÃO: Adicionar campo justificativa_cancelamento
-- =====================================================
-- Descrição: Adiciona campo para justificar cancelamento de planos de ação
-- Data: 2025-11-27

-- Adicionar coluna justificativa_cancelamento
ALTER TABLE planos_acao 
ADD COLUMN IF NOT EXISTS justificativa_cancelamento TEXT;

-- Comentário
COMMENT ON COLUMN planos_acao.justificativa_cancelamento IS 'Justificativa obrigatória quando o plano é cancelado';

-- Verificar estrutura
DO $$
BEGIN
  RAISE NOTICE '✅ Campo justificativa_cancelamento adicionado com sucesso';
END $$;
