-- Migração para adicionar campos "Tem AMS" e "Tipo de Book" na tabela empresas_clientes
-- Data: 2025-09-18

-- Adicionar coluna "tem_ams" (boolean)
ALTER TABLE empresas_clientes 
ADD COLUMN tem_ams BOOLEAN DEFAULT FALSE;

-- Adicionar coluna "tipo_book" (enum)
CREATE TYPE tipo_book_enum AS ENUM ('nao_tem_book', 'qualidade', 'outros');

ALTER TABLE empresas_clientes 
ADD COLUMN tipo_book tipo_book_enum DEFAULT 'nao_tem_book';

-- Comentários para documentação
COMMENT ON COLUMN empresas_clientes.tem_ams IS 'Indica se a empresa possui AMS ativo. Quando true, aparece na tela Controle Disparos';
COMMENT ON COLUMN empresas_clientes.tipo_book IS 'Tipo de book da empresa: nao_tem_book, qualidade ou outros. Qualidade aparece na tela Controle Disparos';

-- Índices para otimização de consultas
CREATE INDEX idx_empresas_clientes_tem_ams ON empresas_clientes(tem_ams) WHERE tem_ams = true;
CREATE INDEX idx_empresas_clientes_tipo_book ON empresas_clientes(tipo_book) WHERE tipo_book = 'qualidade';

-- Atualizar RLS policies se necessário (manter as existentes)
-- As políticas RLS existentes continuarão funcionando normalmente