-- Script para corrigir o enum status_pesquisa_enum
-- Adiciona os valores necessários se não existirem

-- Verificar valores atuais do enum
DO $$
DECLARE
    enum_values TEXT[];
BEGIN
    -- Buscar valores atuais do enum
    SELECT array_agg(enumlabel::TEXT) INTO enum_values
    FROM pg_enum
    WHERE enumtypid = 'status_pesquisa_enum'::regtype;
    
    RAISE NOTICE 'Valores atuais do enum: %', enum_values;
END $$;

-- Adicionar valores faltantes ao enum (se não existirem)
DO $$
BEGIN
    -- Adicionar 'pendente' se não existir
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'status_pesquisa_enum'::regtype 
        AND enumlabel = 'pendente'
    ) THEN
        ALTER TYPE status_pesquisa_enum ADD VALUE 'pendente';
        RAISE NOTICE '✓ Valor "pendente" adicionado ao enum';
    ELSE
        RAISE NOTICE '- Valor "pendente" já existe';
    END IF;

    -- Adicionar 'enviado_plano_acao' se não existir
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'status_pesquisa_enum'::regtype 
        AND enumlabel = 'enviado_plano_acao'
    ) THEN
        ALTER TYPE status_pesquisa_enum ADD VALUE 'enviado_plano_acao';
        RAISE NOTICE '✓ Valor "enviado_plano_acao" adicionado ao enum';
    ELSE
        RAISE NOTICE '- Valor "enviado_plano_acao" já existe';
    END IF;

    -- Adicionar 'enviado_elogios' se não existir
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'status_pesquisa_enum'::regtype 
        AND enumlabel = 'enviado_elogios'
    ) THEN
        ALTER TYPE status_pesquisa_enum ADD VALUE 'enviado_elogios';
        RAISE NOTICE '✓ Valor "enviado_elogios" adicionado ao enum';
    ELSE
        RAISE NOTICE '- Valor "enviado_elogios" já existe';
    END IF;
END $$;

-- Verificar valores finais do enum
DO $$
DECLARE
    enum_values TEXT[];
BEGIN
    SELECT array_agg(enumlabel::TEXT ORDER BY enumsortorder) INTO enum_values
    FROM pg_enum
    WHERE enumtypid = 'status_pesquisa_enum'::regtype;
    
    RAISE NOTICE '✓ Valores finais do enum: %', enum_values;
END $$;

-- Verificar se a coluna status existe e tem o tipo correto
DO $$
DECLARE
    v_column_exists BOOLEAN;
    v_column_type TEXT;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pesquisas_satisfacao' 
        AND column_name = 'status'
    ) INTO v_column_exists;
    
    IF v_column_exists THEN
        SELECT data_type INTO v_column_type
        FROM information_schema.columns
        WHERE table_name = 'pesquisas_satisfacao' 
        AND column_name = 'status';
        
        RAISE NOTICE '✓ Coluna status existe com tipo: %', v_column_type;
    ELSE
        RAISE WARNING '✗ Coluna status não existe na tabela pesquisas_satisfacao';
    END IF;
END $$;
