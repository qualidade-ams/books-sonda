-- Script para verificar se os novos campos existem na tabela empresas_clientes
-- Execute este script no Supabase SQL Editor ou em seu cliente PostgreSQL

-- 1. Verificar se as colunas existem
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'empresas_clientes' 
AND column_name IN ('book_personalizado', 'anexo', 'vigencia_inicial', 'vigencia_final')
ORDER BY column_name;

-- 2. Se as colunas não existirem, execute a migração:
-- (Descomente as linhas abaixo se necessário)

/*
-- Adicionar novos campos na tabela empresas_clientes
ALTER TABLE empresas_clientes 
ADD COLUMN IF NOT EXISTS book_personalizado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS anexo BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS vigencia_inicial DATE,
ADD COLUMN IF NOT EXISTS vigencia_final DATE;

-- Adicionar comentários para documentação dos novos campos
COMMENT ON COLUMN empresas_clientes.book_personalizado IS 'Indica se a empresa usa book personalizado. Quando TRUE, não aparece no Controle de Disparos padrão, mas sim na tela Disparos Personalizados';
COMMENT ON COLUMN empresas_clientes.anexo IS 'Indica se a empresa permite anexos nos disparos personalizados. Quando TRUE, na tela Disparos Personalizados haverá opção para anexar arquivos';
COMMENT ON COLUMN empresas_clientes.vigencia_inicial IS 'Data de início da vigência do contrato da empresa';
COMMENT ON COLUMN empresas_clientes.vigencia_final IS 'Data de fim da vigência do contrato da empresa. Quando atingida, o status será automaticamente alterado para inativo';
*/

-- 3. Testar inserção de dados (após aplicar a migração)
-- SELECT id, nome_completo, book_personalizado, anexo, vigencia_inicial, vigencia_final 
-- FROM empresas_clientes 
-- LIMIT 5;
