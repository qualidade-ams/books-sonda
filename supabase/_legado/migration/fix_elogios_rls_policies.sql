-- ============================================================================
-- CORREÇÃO DAS POLÍTICAS RLS DA TABELA ELOGIOS
-- ============================================================================
-- Data: 2026-01-19
-- Descrição: Corrige políticas RLS da tabela elogios para permitir operações
--            de usuários autenticados com as permissões corretas
-- ============================================================================

-- 1. REMOVER POLÍTICAS ANTIGAS
-- ============================================================================
DROP POLICY IF EXISTS "Permitir leitura de elogios para usuários autenticados" ON elogios;
DROP POLICY IF EXISTS "Permitir inserção de elogios para usuários autenticados" ON elogios;
DROP POLICY IF EXISTS "Permitir atualização de elogios para usuários autenticados" ON elogios;
DROP POLICY IF EXISTS "Permitir exclusão de elogios para usuários autenticados" ON elogios;
DROP POLICY IF EXISTS "Usuários podem ver elogios com permissão" ON elogios;
DROP POLICY IF EXISTS "Usuários podem inserir elogios com permissão" ON elogios;
DROP POLICY IF EXISTS "Usuários podem atualizar elogios com permissão" ON elogios;
DROP POLICY IF EXISTS "Usuários podem excluir elogios com permissão" ON elogios;

-- 2. GARANTIR QUE RLS ESTÁ HABILITADO
-- ============================================================================
ALTER TABLE elogios ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR NOVAS POLÍTICAS RLS OTIMIZADAS
-- ============================================================================

-- 3.1. Política de SELECT (Leitura)
-- Permite que usuários autenticados vejam elogios se tiverem permissão na tela
CREATE POLICY "elogios_select_policy" ON elogios
    FOR SELECT
    TO authenticated
    USING (
        -- Verificar se o usuário tem permissão de visualização
        EXISTS (
            SELECT 1
            FROM screen_permissions sp
            INNER JOIN user_group_members ugm ON ugm.group_id = sp.group_id
            INNER JOIN screens s ON s.key = sp.screen_key
            WHERE ugm.user_id = (SELECT auth.uid())
              AND s.key = 'elogios'
              AND sp.permission_level IN ('view', 'edit', 'delete')
        )
    );

-- 3.2. Política de INSERT (Criação)
-- Permite que usuários autenticados criem elogios se tiverem permissão
CREATE POLICY "elogios_insert_policy" ON elogios
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Verificar se o usuário tem permissão de criação/edição
        EXISTS (
            SELECT 1
            FROM screen_permissions sp
            INNER JOIN user_group_members ugm ON ugm.group_id = sp.group_id
            INNER JOIN screens s ON s.key = sp.screen_key
            WHERE ugm.user_id = (SELECT auth.uid())
              AND s.key = 'elogios'
              AND sp.permission_level IN ('edit', 'delete')
        )
    );

-- 3.3. Política de UPDATE (Atualização)
-- Permite que usuários autenticados atualizem elogios se tiverem permissão
CREATE POLICY "elogios_update_policy" ON elogios
    FOR UPDATE
    TO authenticated
    USING (
        -- Verificar se o usuário tem permissão de edição
        EXISTS (
            SELECT 1
            FROM screen_permissions sp
            INNER JOIN user_group_members ugm ON ugm.group_id = sp.group_id
            INNER JOIN screens s ON s.key = sp.screen_key
            WHERE ugm.user_id = (SELECT auth.uid())
              AND s.key = 'elogios'
              AND sp.permission_level IN ('edit', 'delete')
        )
    )
    WITH CHECK (
        -- Mesma verificação para o novo estado
        EXISTS (
            SELECT 1
            FROM screen_permissions sp
            INNER JOIN user_group_members ugm ON ugm.group_id = sp.group_id
            INNER JOIN screens s ON s.key = sp.screen_key
            WHERE ugm.user_id = (SELECT auth.uid())
              AND s.key = 'elogios'
              AND sp.permission_level IN ('edit', 'delete')
        )
    );

-- 3.4. Política de DELETE (Exclusão)
-- Permite que usuários autenticados excluam elogios se tiverem permissão
CREATE POLICY "elogios_delete_policy" ON elogios
    FOR DELETE
    TO authenticated
    USING (
        -- Verificar se o usuário tem permissão de exclusão
        EXISTS (
            SELECT 1
            FROM screen_permissions sp
            INNER JOIN user_group_members ugm ON ugm.group_id = sp.group_id
            INNER JOIN screens s ON s.key = sp.screen_key
            WHERE ugm.user_id = (SELECT auth.uid())
              AND s.key = 'elogios'
              AND sp.permission_level = 'delete'
        )
    );

-- 4. POLÍTICA ALTERNATIVA SIMPLIFICADA (CASO A TELA NÃO EXISTA)
-- ============================================================================
-- Se a tela 'elogios' não estiver cadastrada no sistema de permissões,
-- use estas políticas mais permissivas temporariamente:

-- DESCOMENTE ESTAS LINHAS SE NECESSÁRIO:
/*
DROP POLICY IF EXISTS "elogios_select_policy" ON elogios;
DROP POLICY IF EXISTS "elogios_insert_policy" ON elogios;
DROP POLICY IF EXISTS "elogios_update_policy" ON elogios;
DROP POLICY IF EXISTS "elogios_delete_policy" ON elogios;

CREATE POLICY "elogios_authenticated_select" ON elogios
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "elogios_authenticated_insert" ON elogios
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "elogios_authenticated_update" ON elogios
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "elogios_authenticated_delete" ON elogios
    FOR DELETE TO authenticated USING (true);
*/

-- 5. VERIFICAR SE A TELA 'ELOGIOS' EXISTE NO SISTEMA
-- ============================================================================
-- Se não existir, criar a tela e conceder permissões aos administradores

DO $$
BEGIN
    -- Verificar se a tela existe
    IF NOT EXISTS (SELECT 1 FROM screens WHERE key = 'elogios') THEN
        -- Criar a tela
        INSERT INTO screens (key, name, description, category, route)
        VALUES (
            'elogios',
            'Elogios',
            'Gerenciamento de elogios recebidos de clientes',
            'Qualidade',
            '/admin/elogios'
        );
        
        RAISE NOTICE 'Tela "elogios" criada com sucesso';
    END IF;
    
    -- Conceder permissão de edição para o grupo Administradores
    IF EXISTS (SELECT 1 FROM user_groups WHERE name = 'Administradores') THEN
        INSERT INTO screen_permissions (group_id, screen_key, permission_level)
        SELECT ug.id, 'elogios', 'edit'
        FROM user_groups ug
        WHERE ug.name = 'Administradores'
        ON CONFLICT (group_id, screen_key) 
        DO UPDATE SET permission_level = EXCLUDED.permission_level;
        
        RAISE NOTICE 'Permissões concedidas ao grupo Administradores';
    END IF;
END $$;

-- 6. VALIDAR POLÍTICAS CRIADAS
-- ============================================================================
-- Execute esta query para verificar se as políticas foram criadas corretamente:
/*
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'elogios'
ORDER BY policyname;
*/

-- 7. TESTAR PERMISSÕES
-- ============================================================================
-- Execute estas queries como usuário autenticado para testar:
/*
-- Teste de SELECT
SELECT COUNT(*) FROM elogios;

-- Teste de INSERT
INSERT INTO elogios (pesquisa_id, status, data_resposta)
VALUES ('00000000-0000-0000-0000-000000000000', 'registrado', CURRENT_DATE);

-- Teste de UPDATE
UPDATE elogios SET status = 'compartilhado' WHERE id = 'seu-id-aqui';

-- Teste de DELETE
DELETE FROM elogios WHERE id = 'seu-id-aqui';
*/

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================

COMMENT ON TABLE elogios IS 'Tabela de elogios com políticas RLS corrigidas em 2026-01-19';
