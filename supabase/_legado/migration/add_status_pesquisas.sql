-- Migração para adicionar campo status na tabela pesquisas_satisfacao
-- Permite controlar o fluxo de envio das pesquisas

-- Criar enum para status
DO $$ BEGIN
    CREATE TYPE status_pesquisa_enum AS ENUM ('pendente', 'enviado_plano_acao', 'enviado_elogios');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Adicionar coluna status (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pesquisas_satisfacao' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE pesquisas_satisfacao 
        ADD COLUMN status status_pesquisa_enum DEFAULT 'pendente' NOT NULL;
        
        -- Criar índice para melhor performance nas consultas
        CREATE INDEX idx_pesquisas_status ON pesquisas_satisfacao(status);
        
        RAISE NOTICE 'Coluna status adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna status já existe';
    END IF;
END $$;

-- Adicionar comentários
COMMENT ON COLUMN pesquisas_satisfacao.status IS 'Status da pesquisa: pendente, enviado_plano_acao, enviado_elogios';

-- Verificar estrutura criada
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Verificar se a coluna foi criada
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_name = 'pesquisas_satisfacao' AND column_name = 'status';
    
    IF v_count > 0 THEN
        RAISE NOTICE '✓ Coluna status criada com sucesso';
    ELSE
        RAISE WARNING '✗ Erro: Coluna status não foi criada';
    END IF;
    
    -- Verificar se o índice foi criado
    SELECT COUNT(*) INTO v_count
    FROM pg_indexes
    WHERE tablename = 'pesquisas_satisfacao' AND indexname = 'idx_pesquisas_status';
    
    IF v_count > 0 THEN
        RAISE NOTICE '✓ Índice idx_pesquisas_status criado com sucesso';
    ELSE
        RAISE WARNING '✗ Erro: Índice não foi criado';
    END IF;
END $$;
