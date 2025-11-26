-- =====================================================
-- MIGRAÇÃO: Políticas RLS do Sistema de Pesquisas
-- Descrição: Controle de acesso baseado em permissões de grupo
-- Data: 2025-11-25
-- =====================================================

-- Passo 1: Habilitar RLS na tabela pesquisas
ALTER TABLE pesquisas ENABLE ROW LEVEL SECURITY;

-- Passo 2: Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Usuários podem visualizar pesquisas com permissão" ON pesquisas;
DROP POLICY IF EXISTS "Usuários podem inserir pesquisas com permissão" ON pesquisas;
DROP POLICY IF EXISTS "Usuários podem atualizar pesquisas com permissão" ON pesquisas;
DROP POLICY IF EXISTS "Usuários podem deletar pesquisas com permissão" ON pesquisas;

-- Passo 3: Criar política de SELECT (visualização)
CREATE POLICY "Usuários podem visualizar pesquisas com permissão"
ON pesquisas
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM user_group_assignments uga
        JOIN screen_permissions sp ON uga.group_id = sp.group_id
        WHERE uga.user_id = auth.uid()
        AND sp.screen_key IN ('lancar_pesquisas', 'enviar_pesquisas')
        AND sp.permission_level IN ('view', 'edit')
    )
);

-- Passo 4: Criar política de INSERT (criação)
CREATE POLICY "Usuários podem inserir pesquisas com permissão"
ON pesquisas
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM user_group_assignments uga
        JOIN screen_permissions sp ON uga.group_id = sp.group_id
        WHERE uga.user_id = auth.uid()
        AND sp.screen_key = 'lancar_pesquisas'
        AND sp.permission_level = 'edit'
    )
);

-- Passo 5: Criar política de UPDATE (edição)
CREATE POLICY "Usuários podem atualizar pesquisas com permissão"
ON pesquisas
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM user_group_assignments uga
        JOIN screen_permissions sp ON uga.group_id = sp.group_id
        WHERE uga.user_id = auth.uid()
        AND sp.screen_key IN ('lancar_pesquisas', 'enviar_pesquisas')
        AND sp.permission_level = 'edit'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM user_group_assignments uga
        JOIN screen_permissions sp ON uga.group_id = sp.group_id
        WHERE uga.user_id = auth.uid()
        AND sp.screen_key IN ('lancar_pesquisas', 'enviar_pesquisas')
        AND sp.permission_level = 'edit'
    )
);

-- Passo 6: Criar política de DELETE (exclusão)
CREATE POLICY "Usuários podem deletar pesquisas com permissão"
ON pesquisas
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM user_group_assignments uga
        JOIN screen_permissions sp ON uga.group_id = sp.group_id
        WHERE uga.user_id = auth.uid()
        AND sp.screen_key = 'lancar_pesquisas'
        AND sp.permission_level = 'edit'
    )
);

-- Passo 7: Verificar políticas criadas
DO $$
DECLARE
    v_policy_count INTEGER;
    rec RECORD;
BEGIN
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE tablename = 'pesquisas';
    
    IF v_policy_count >= 4 THEN
        RAISE NOTICE '✓ % políticas RLS criadas com sucesso para tabela pesquisas', v_policy_count;
    ELSE
        RAISE WARNING '⚠ Apenas % políticas encontradas. Esperado: 4', v_policy_count;
    END IF;
    
    -- Listar políticas
    RAISE NOTICE '--- Políticas RLS Configuradas ---';
    FOR rec IN (
        SELECT policyname, cmd
        FROM pg_policies
        WHERE tablename = 'pesquisas'
        ORDER BY cmd
    ) LOOP
        RAISE NOTICE '  • % (%)', rec.policyname, rec.cmd;
    END LOOP;
END $$;

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================
