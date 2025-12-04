-- =====================================================
-- MIGRATION: ADICIONAR TIPO DE CÁLCULO ADICIONAL
-- =====================================================

-- Adicionar coluna tipo_calculo_adicional na tabela taxas_clientes
ALTER TABLE taxas_clientes 
ADD COLUMN IF NOT EXISTS tipo_calculo_adicional TEXT NOT NULL DEFAULT 'media' 
CHECK (tipo_calculo_adicional IN ('normal', 'media'));

-- Comentário
COMMENT ON COLUMN taxas_clientes.tipo_calculo_adicional IS 'Tipo de cálculo para Hora Adicional: normal (valor base + 15%) ou media (média das três primeiras funções)';

-- Adicionar coluna tipo_calculo_adicional na tabela taxas_padrao
ALTER TABLE taxas_padrao 
ADD COLUMN IF NOT EXISTS tipo_calculo_adicional TEXT NOT NULL DEFAULT 'media' 
CHECK (tipo_calculo_adicional IN ('normal', 'media'));

-- Comentário
COMMENT ON COLUMN taxas_padrao.tipo_calculo_adicional IS 'Tipo de cálculo para Hora Adicional: normal (valor base + 15%) ou media (média das três primeiras funções)';
