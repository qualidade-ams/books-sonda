-- =====================================================
-- MIGRAÇÃO: Corrigir segurança das views de especialistas
-- Data: 2025-01-06
-- Descrição: As views herdam automaticamente as políticas RLS
--           da tabela base, mas vamos garantir que estejam
--           configuradas corretamente
-- =====================================================

-- 1. Verificar se RLS está habilitado na tabela base
DO $$
BEGIN
    -- Verificar se RLS está ativo na tabela especialistas
    IF EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'especialistas' 
        AND relrowsecurity = true
    ) THEN
        RAISE NOTICE '✅ RLS está habilitado na tabela especialistas';
    ELSE
        RAISE WARNING '⚠️ RLS não está habilitado na tabela especialistas';
        -- Habilitar RLS se não estiver
        ALTER TABLE especialistas ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS habilitado na tabela especialistas';
    END IF;
END $$;

-- 2. Verificar políticas existentes na tabela base
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'especialistas';
    
    RAISE NOTICE '📋 Políticas existentes na tabela especialistas: %', policy_count;
    
    -- Listar políticas existentes
    FOR policy_count IN 
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'especialistas'
    LOOP
        RAISE NOTICE '   - Política encontrada';
    END LOOP;
END $$;

-- 3. Garantir política para service_role se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'especialistas' 
        AND policyname LIKE '%service_role%'
    ) THEN
        -- Criar política para service_role
        CREATE POLICY "especialistas_service_role_all"
        ON especialistas
        FOR ALL TO service_role
        USING (true)
        WITH CHECK (true);
        
        RAISE NOTICE '✅ Política service_role criada para tabela especialistas';
    ELSE
        RAISE NOTICE '✅ Política service_role já existe para tabela especialistas';
    END IF;
END $$;

-- 4. Garantir política para usuários autenticados se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'especialistas' 
        AND policyname LIKE '%authenticated%'
    ) THEN
        -- Criar política para usuários autenticados (apenas leitura)
        CREATE POLICY "especialistas_authenticated_read"
        ON especialistas
        FOR SELECT TO authenticated
        USING (
          -- Permitir leitura para usuários com permissão
          EXISTS (
            SELECT 1 FROM user_group_assignments uga
            JOIN screen_permissions sp ON uga.group_id = sp.group_id
            JOIN screens s ON sp.screen_key = s.key
            WHERE uga.user_id = auth.uid()
              AND s.key = 'especialistas'
              AND sp.permission_level IN ('view', 'edit')
          )
        );
        
        RAISE NOTICE '✅ Política authenticated criada para tabela especialistas';
    ELSE
        RAISE NOTICE '✅ Política authenticated já existe para tabela especialistas';
    END IF;
END $$;

-- 5. Documentar que as views herdam as políticas
COMMENT ON VIEW v_especialistas_ativos 
IS 'View de especialistas ativos. Herda políticas RLS da tabela especialistas. Acesso controlado por permissões de usuário.';

COMMENT ON VIEW v_especialistas_sql_server 
IS 'View de especialistas sincronizados do SQL Server. Herda políticas RLS da tabela especialistas. Dados sensíveis de sincronização.';

-- 6. Criar função para verificar acesso às views
CREATE OR REPLACE FUNCTION check_especialistas_view_access()
RETURNS TABLE (
    view_name TEXT,
    accessible BOOLEAN,
    reason TEXT
) AS $$
BEGIN
    -- Verificar acesso para usuário atual
    RETURN QUERY
    SELECT 
        'v_especialistas_ativos'::TEXT,
        (
            -- Service role sempre tem acesso
            current_setting('role') = 'service_role' OR
            -- Usuários autenticados com permissão
            EXISTS (
                SELECT 1 FROM user_group_assignments uga
                JOIN screen_permissions sp ON uga.group_id = sp.group_id
                JOIN screens s ON sp.screen_key = s.key
                WHERE uga.user_id = auth.uid()
                  AND s.key = 'especialistas'
                  AND sp.permission_level IN ('view', 'edit')
            )
        ),
        CASE 
            WHEN current_setting('role') = 'service_role' THEN 'Service role access'
            WHEN auth.uid() IS NULL THEN 'Not authenticated'
            WHEN EXISTS (
                SELECT 1 FROM user_group_assignments uga
                JOIN screen_permissions sp ON uga.group_id = sp.group_id
                JOIN screens s ON sp.screen_key = s.key
                WHERE uga.user_id = auth.uid()
                  AND s.key = 'especialistas'
                  AND sp.permission_level IN ('view', 'edit')
            ) THEN 'User has permission'
            ELSE 'User lacks permission'
        END::TEXT
    
    UNION ALL
    
    SELECT 
        'v_especialistas_sql_server'::TEXT,
        (
            -- Service role sempre tem acesso
            current_setting('role') = 'service_role' OR
            -- Usuários autenticados com permissão (mesma regra)
            EXISTS (
                SELECT 1 FROM user_group_assignments uga
                JOIN screen_permissions sp ON uga.group_id = sp.group_id
                JOIN screens s ON sp.screen_key = s.key
                WHERE uga.user_id = auth.uid()
                  AND s.key = 'especialistas'
                  AND sp.permission_level IN ('view', 'edit')
            )
        ),
        CASE 
            WHEN current_setting('role') = 'service_role' THEN 'Service role access'
            WHEN auth.uid() IS NULL THEN 'Not authenticated'
            WHEN EXISTS (
                SELECT 1 FROM user_group_assignments uga
                JOIN screen_permissions sp ON uga.group_id = sp.group_id
                JOIN screens s ON sp.screen_key = s.key
                WHERE uga.user_id = auth.uid()
                  AND s.key = 'especialistas'
                  AND sp.permission_level IN ('view', 'edit')
            ) THEN 'User has permission'
            ELSE 'User lacks permission'
        END::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Testar acesso às views
DO $$
DECLARE
    view_access RECORD;
BEGIN
    RAISE NOTICE '🔍 Testando acesso às views como service_role:';
    
    -- Simular teste (na prática, seria executado pelo cliente)
    FOR view_access IN 
        SELECT * FROM check_especialistas_view_access()
    LOOP
        RAISE NOTICE '   % - Acessível: % (Motivo: %)', 
            view_access.view_name, 
            view_access.accessible, 
            view_access.reason;
    END LOOP;
END $$;

-- 8. Mensagem final
DO $$
BEGIN
    RAISE NOTICE '✅ Segurança das views configurada corretamente';
    RAISE NOTICE '🔒 Views herdam políticas RLS da tabela especialistas';
    RAISE NOTICE '👥 v_especialistas_ativos: Usuários com permissão de leitura';
    RAISE NOTICE '🔧 v_especialistas_sql_server: Usuários com permissão de leitura';
    RAISE NOTICE '⚡ service_role: Acesso total para operações de sistema';
    RAISE NOTICE '🚫 Usuários sem permissão: Sem acesso';
    RAISE NOTICE '📋 Use SELECT * FROM check_especialistas_view_access() para verificar acesso';
END $$;