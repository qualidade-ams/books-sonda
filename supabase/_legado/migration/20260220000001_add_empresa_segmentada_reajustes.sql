-- Migration: Adicionar campo empresa_segmentada na tabela banco_horas_reajustes
-- Autor: Sistema
-- Data: 2026-02-20
-- Descrição: Permite associar reajustes a empresas segmentadas específicas quando baseline_segmentado está ativo

-- Adicionar campo empresa_segmentada na tabela banco_horas_reajustes
ALTER TABLE banco_horas_reajustes 
ADD COLUMN IF NOT EXISTS empresa_segmentada TEXT DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN banco_horas_reajustes.empresa_segmentada IS 
'Nome da empresa de segmentação (baseline) para clientes com múltiplas empresas. 
Exemplo: Cliente ANGLO pode ter "NIQUEL" ou "IOB". 
Obrigatório apenas se o cliente tiver baseline_segmentado = true.
Valores possíveis são extraídos do campo segmentacao_config do cliente.';

-- Criar índice para performance em queries filtradas por empresa_segmentada
CREATE INDEX IF NOT EXISTS idx_reajustes_empresa_segmentada 
ON banco_horas_reajustes(empresa_segmentada) 
WHERE empresa_segmentada IS NOT NULL;

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Migration aplicada com sucesso!';
  RAISE NOTICE '📋 Campo adicionado: empresa_segmentada';
  RAISE NOTICE '🔍 Índice criado: idx_reajustes_empresa_segmentada';
END $$;
