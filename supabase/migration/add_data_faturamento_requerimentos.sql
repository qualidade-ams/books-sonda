-- Migração para adicionar campo data_faturamento na tabela requerimentos
-- Data: 2024-11-06
-- Descrição: Adiciona campo para controlar quando requerimentos foram faturados

-- Adicionar campo data_faturamento
DO $$
BEGIN
    -- Verificar se a coluna já existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'requerimentos' 
        AND column_name = 'data_faturamento'
    ) THEN
        -- Adicionar a coluna
        ALTER TABLE requerimentos 
        ADD COLUMN data_faturamento TIMESTAMPTZ;
        
        RAISE NOTICE 'Campo data_faturamento adicionado com sucesso';
    ELSE
        RAISE NOTICE 'Campo data_faturamento já existe';
    END IF;
END $$;

-- Adicionar comentário explicativo
COMMENT ON COLUMN requerimentos.data_faturamento IS 'Data e hora em que o requerimento foi marcado como faturado';

-- Criar índice para melhor performance nas consultas
DO $$
BEGIN
    -- Verificar se o índice já existe
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'requerimentos' 
        AND indexname = 'idx_requerimentos_data_faturamento'
    ) THEN
        -- Criar índice
        CREATE INDEX idx_requerimentos_data_faturamento 
        ON requerimentos(data_faturamento) 
        WHERE data_faturamento IS NOT NULL;
        
        RAISE NOTICE 'Índice idx_requerimentos_data_faturamento criado com sucesso';
    ELSE
        RAISE NOTICE 'Índice idx_requerimentos_data_faturamento já existe';
    END IF;
END $$;

-- Log final da migração
DO $$
BEGIN
    RAISE NOTICE 'Migração add_data_faturamento_requerimentos concluída com sucesso';
    RAISE NOTICE 'Campo data_faturamento disponível para uso no sistema de faturamento';
END $$;