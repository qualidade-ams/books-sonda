-- Migration: Adicionar coluna tipo_hora_extra à tabela requerimentos
-- Data: 2024-12-04
-- Descrição: Adiciona campo para armazenar o tipo de hora extra selecionado quando tipo_cobranca = 'Hora Extra'

-- Adicionar coluna tipo_hora_extra (opcional)
ALTER TABLE requerimentos
ADD COLUMN IF NOT EXISTS tipo_hora_extra TEXT CHECK (tipo_hora_extra IN ('17h30-19h30', 'apos_19h30', 'fim_semana'));

-- Adicionar comentário na coluna
COMMENT ON COLUMN requerimentos.tipo_hora_extra IS 'Tipo de hora extra: 17h30-19h30 (Seg-Sex 17h30-19h30), apos_19h30 (Seg-Sex Após 19h30), fim_semana (Sáb/Dom/Feriados). Usado apenas quando tipo_cobranca = Hora Extra';

-- Criar índice para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_requerimentos_tipo_hora_extra ON requerimentos(tipo_hora_extra) WHERE tipo_hora_extra IS NOT NULL;
