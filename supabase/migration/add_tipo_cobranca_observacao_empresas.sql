-- Migração para adicionar campos tipo_cobranca e observacao na tabela empresas_clientes
-- Data: 2024-12-20
-- Descrição: Adiciona campo tipo_cobranca (banco_horas ou ticket) e observacao (500 caracteres)

-- Verificar se a tabela existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'empresas_clientes') THEN
        RAISE EXCEPTION 'Tabela empresas_clientes não encontrada';
    END IF;
END $$;

-- Criar enum para tipo de cobrança se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_cobranca_enum') THEN
        CREATE TYPE tipo_cobranca_enum AS ENUM ('banco_horas', 'ticket');
        RAISE NOTICE 'Enum tipo_cobranca_enum criado com sucesso';
    ELSE
        RAISE NOTICE 'Enum tipo_cobranca_enum já existe';
    END IF;
END $$;

-- Adicionar campo tipo_cobranca se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'empresas_clientes' 
        AND column_name = 'tipo_cobranca'
    ) THEN
        ALTER TABLE empresas_clientes 
        ADD COLUMN tipo_cobranca tipo_cobranca_enum DEFAULT 'banco_horas';
        
        RAISE NOTICE 'Campo tipo_cobranca adicionado com sucesso';
    ELSE
        RAISE NOTICE 'Campo tipo_cobranca já existe';
    END IF;
END $$;

-- Adicionar campo observacao se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'empresas_clientes' 
        AND column_name = 'observacao'
    ) THEN
        ALTER TABLE empresas_clientes 
        ADD COLUMN observacao TEXT;
        
        -- Adicionar constraint de tamanho máximo
        ALTER TABLE empresas_clientes 
        ADD CONSTRAINT check_observacao_length 
        CHECK (LENGTH(observacao) <= 500);
        
        RAISE NOTICE 'Campo observacao adicionado com sucesso';
    ELSE
        RAISE NOTICE 'Campo observacao já existe';
    END IF;
END $$;

-- Adicionar comentários nos campos
COMMENT ON COLUMN empresas_clientes.tipo_cobranca IS 'Tipo de cobrança da empresa: banco_horas ou ticket';
COMMENT ON COLUMN empresas_clientes.observacao IS 'Observações gerais sobre a empresa (máximo 500 caracteres)';

-- Criar índice para tipo_cobranca para melhor performance em consultas
CREATE INDEX IF NOT EXISTS idx_empresas_clientes_tipo_cobranca 
ON empresas_clientes(tipo_cobranca);

-- Verificar se os campos foram criados corretamente
DO $$
DECLARE
    tipo_cobranca_exists BOOLEAN;
    observacao_exists BOOLEAN;
BEGIN
    -- Verificar tipo_cobranca
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'empresas_clientes' 
        AND column_name = 'tipo_cobranca'
    ) INTO tipo_cobranca_exists;
    
    -- Verificar observacao
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'empresas_clientes' 
        AND column_name = 'observacao'
    ) INTO observacao_exists;
    
    -- Relatório final
    RAISE NOTICE '=== RELATÓRIO DA MIGRAÇÃO ===';
    RAISE NOTICE 'Campo tipo_cobranca: %', CASE WHEN tipo_cobranca_exists THEN 'OK' ELSE 'ERRO' END;
    RAISE NOTICE 'Campo observacao: %', CASE WHEN observacao_exists THEN 'OK' ELSE 'ERRO' END;
    
    IF tipo_cobranca_exists AND observacao_exists THEN
        RAISE NOTICE 'Migração concluída com sucesso!';
    ELSE
        RAISE EXCEPTION 'Erro na migração - alguns campos não foram criados';
    END IF;
END $$;