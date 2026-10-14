-- Migração para adicionar a opção "outros" ao enum tipo_cobranca_enum
-- Data: 2024-11-06
-- Descrição: Adiciona a nova opção "outros" ao tipo de cobrança das empresas clientes

-- Verificar se o enum existe e adicionar o novo valor
DO $$
BEGIN
    -- Verificar se o valor 'outros' já existe no enum
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'outros' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'tipo_cobranca_enum')
    ) THEN
        -- Adicionar o novo valor ao enum existente
        ALTER TYPE tipo_cobranca_enum ADD VALUE 'outros';
        RAISE NOTICE 'Valor "outros" adicionado ao enum tipo_cobranca_enum com sucesso';
    ELSE
        RAISE NOTICE 'Valor "outros" já existe no enum tipo_cobranca_enum';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao adicionar valor ao enum: %', SQLERRM;
END $$;

-- Verificar o estado final do enum
DO $$
DECLARE
    enum_values text;
BEGIN
    SELECT string_agg(enumlabel, ', ' ORDER BY enumsortorder) INTO enum_values
    FROM pg_enum 
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'tipo_cobranca_enum');
    
    RAISE NOTICE 'Valores atuais do enum tipo_cobranca_enum: %', enum_values;
END $$;

-- Comentário explicativo
COMMENT ON TYPE tipo_cobranca_enum IS 'Tipos de cobrança disponíveis para empresas clientes: banco_horas, ticket, outros';

-- Log da migração e finalização
DO $$
BEGIN
    -- Log da migração
    INSERT INTO permission_audit_logs (
        table_name,
        operation,
        old_data,
        new_data,
        user_id,
        timestamp
    ) VALUES (
        'tipo_cobranca_enum',
        'ALTER',
        '{"valores": ["banco_horas", "ticket"]}',
        '{"valores": ["banco_horas", "ticket", "outros"]}',
        '00000000-0000-0000-0000-000000000000',
        NOW()
    ) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Migração add_outros_tipo_cobranca concluída com sucesso';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro no log da migração: %', SQLERRM;
END $$;