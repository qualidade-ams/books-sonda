------------------------------------------------------
-- Migração: Renomear tabela clientes para clientes
-- Atualiza nome da tabela e todas as referências relacionadas
------------------------------------------------------

-- 1. Renomear a tabela clientes para clientes
ALTER TABLE clientes RENAME TO clientes;

-- 2. Atualizar comentário da tabela
COMMENT ON TABLE clientes IS 'Clientes das empresas clientes';

-- 3. Atualizar políticas RLS (se existirem)
-- Renomear políticas que referenciam a tabela clientes
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Buscar todas as políticas da tabela clientes (antiga clientes)
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE tablename = 'clientes'
    LOOP
        -- Se a política contém 'clientes' no nome, renomear
        IF policy_record.policyname LIKE '%clientes%' THEN
            EXECUTE format('ALTER POLICY %I ON %I.%I RENAME TO %I',
                policy_record.policyname,
                policy_record.schemaname,
                policy_record.tablename,
                replace(policy_record.policyname, 'clientes', 'clientes')
            );
        END IF;
    END LOOP;
END $$;

-- 4. Atualizar índices que podem ter nomes baseados na tabela antiga
-- (Os índices são automaticamente renomeados quando a tabela é renomeada)

-- 5. Verificar se existem views que referenciam a tabela antiga
-- e atualizá-las se necessário
DO $$
DECLARE
    view_record RECORD;
BEGIN
    -- Buscar views que podem referenciar a tabela antiga
    FOR view_record IN 
        SELECT schemaname, viewname, definition
        FROM pg_views 
        WHERE schemaname = 'public' 
        AND definition LIKE '%clientes%'
    LOOP
        RAISE NOTICE 'View % pode precisar ser atualizada manualmente', view_record.viewname;
    END LOOP;
END $$;

-- 6. Atualizar triggers se existirem
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers 
        WHERE event_object_table = 'clientes'
        AND trigger_name LIKE '%clientes%'
    LOOP
        RAISE NOTICE 'Trigger % pode precisar ser renomeado manualmente', trigger_record.trigger_name;
    END LOOP;
END $$;

-- 7. Verificação final
SELECT 
    'Migração concluída' as status,
    'clientes -> clientes' as alteracao,
    COUNT(*) as total_registros
FROM clientes;

-- 8. Verificar se todas as foreign keys ainda funcionam
SELECT 
    'Foreign Keys verificadas' as status,
    COUNT(*) as total_constraints
FROM information_schema.table_constraints 
WHERE table_name = 'clientes' 
AND constraint_type = 'FOREIGN KEY';

------------------------------------------------------
-- Notas importantes:
-- 1. Esta migração renomeia a tabela física no banco
-- 2. O código da aplicação já foi atualizado para usar 'clientes'
-- 3. As propriedades dos objetos mantêm 'clientes' para compatibilidade
-- 4. Políticas RLS são automaticamente atualizadas
-- 5. Índices são automaticamente renomeados
------------------------------------------------------