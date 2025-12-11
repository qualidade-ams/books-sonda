-- Adicionar campo comentario_cliente na tabela planos_acao
ALTER TABLE planos_acao ADD COLUMN IF NOT EXISTS comentario_cliente TEXT;

-- Verificar se a coluna foi criada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'planos_acao' 
AND column_name = 'comentario_cliente';