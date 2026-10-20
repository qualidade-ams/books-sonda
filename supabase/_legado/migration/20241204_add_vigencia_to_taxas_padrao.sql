-- =====================================================
-- MIGRATION: ADICIONAR VIGÊNCIAS À TABELA TAXAS PADRÃO
-- =====================================================

-- Remover constraint UNIQUE de tipo_produto (permitir múltiplas vigências)
ALTER TABLE taxas_padrao DROP CONSTRAINT IF EXISTS taxas_padrao_tipo_produto_key;

-- Adicionar colunas de vigência
ALTER TABLE taxas_padrao 
ADD COLUMN IF NOT EXISTS vigencia_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS vigencia_fim DATE;

-- Adicionar coluna tipo_calculo_adicional
ALTER TABLE taxas_padrao 
ADD COLUMN IF NOT EXISTS tipo_calculo_adicional TEXT NOT NULL DEFAULT 'media' 
CHECK (tipo_calculo_adicional IN ('normal', 'media'));

-- Comentários
COMMENT ON COLUMN taxas_padrao.vigencia_inicio IS 'Data de início da vigência da taxa padrão';
COMMENT ON COLUMN taxas_padrao.vigencia_fim IS 'Data de fim da vigência da taxa padrão (NULL = vigência indefinida)';
COMMENT ON COLUMN taxas_padrao.tipo_calculo_adicional IS 'Tipo de cálculo para Hora Adicional: normal (valor base + 15%) ou media (média das três primeiras funções)';

-- Criar constraint para garantir que não haja sobreposição de vigências para o mesmo tipo de produto
-- Nota: Esta constraint será verificada na aplicação, pois PostgreSQL não suporta constraints complexas de sobreposição de datas

-- Índices para melhorar performance de consultas por vigência
CREATE INDEX IF NOT EXISTS idx_taxas_padrao_vigencia ON taxas_padrao(tipo_produto, vigencia_inicio, vigencia_fim);
CREATE INDEX IF NOT EXISTS idx_taxas_padrao_vigencia_inicio ON taxas_padrao(vigencia_inicio);
CREATE INDEX IF NOT EXISTS idx_taxas_padrao_vigencia_fim ON taxas_padrao(vigencia_fim);

