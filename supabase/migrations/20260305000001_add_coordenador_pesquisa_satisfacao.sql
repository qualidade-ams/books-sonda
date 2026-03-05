-- =====================================================
-- MIGRATION: Adicionar campo coordenador_id em pesquisas_satisfacao
-- =====================================================

-- Adicionar coluna coordenador_id na tabela pesquisas_satisfacao
ALTER TABLE pesquisas_satisfacao
ADD COLUMN IF NOT EXISTS coordenador_id UUID REFERENCES organizacao_estrutura(id);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_pesquisas_satisfacao_coordenador_id 
ON pesquisas_satisfacao(coordenador_id);

-- Adicionar comentário
COMMENT ON COLUMN pesquisas_satisfacao.coordenador_id IS 'ID do coordenador responsável (referência para organizacao_estrutura)';
