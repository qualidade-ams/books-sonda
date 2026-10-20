-- =====================================================
-- Correção: Políticas RLS para permitir Admin criar usuários
-- =====================================================
-- Problema identificado: As políticas RLS estão bloqueando
-- a criação de perfis via Admin API porque verificam auth.uid()
-- 
-- Solução: Adicionar política que permite administradores
-- criarem perfis de outros usuários
-- =====================================================

-- 1. Criar política para permitir administradores inserirem perfis
CREATE POLICY "Admins can insert any profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (
    -- Verificar se o usuário atual é administrador
    EXISTS (
        SELECT 1 
        FROM user_group_assignments uga
        JOIN user_groups ug ON uga.group_id = ug.id
        WHERE uga.user_id = auth.uid()
        AND ug.name = 'Administrador'
    )
);

-- 2. Criar política para permitir administradores atualizarem qualquer perfil
CREATE POLICY "Admins can update any profile"
ON profiles
FOR UPDATE
TO authenticated
USING (
    -- Verificar se o usuário atual é administrador
    EXISTS (
        SELECT 1 
        FROM user_group_assignments uga
        JOIN user_groups ug ON uga.group_id = ug.id
        WHERE uga.user_id = auth.uid()
        AND ug.name = 'Administrador'
    )
)
WITH CHECK (
    -- Verificar se o usuário atual é administrador
    EXISTS (
        SELECT 1 
        FROM user_group_assignments uga
        JOIN user_groups ug ON uga.group_id = ug.id
        WHERE uga.user_id = auth.uid()
        AND ug.name = 'Administrador'
    )
);

-- 3. Verificar políticas criadas
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ POLÍTICAS RLS CRIADAS COM SUCESSO!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Novas políticas adicionadas:';
    RAISE NOTICE '- Admins can insert any profile';
    RAISE NOTICE '- Admins can update any profile';
    RAISE NOTICE '';
    RAISE NOTICE 'Agora administradores podem:';
    RAISE NOTICE '✅ Criar perfis de outros usuários';
    RAISE NOTICE '✅ Editar perfis de outros usuários';
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANTE: Reabilite os triggers agora!';
    RAISE NOTICE 'Execute: ALTER TABLE profiles ENABLE TRIGGER audit_profiles_trigger;';
    RAISE NOTICE 'Execute: ALTER TABLE profiles ENABLE TRIGGER set_profiles_audit_fields;';
    RAISE NOTICE '';
END $$;

-- 4. Listar todas as políticas da tabela profiles
SELECT 
    policyname AS policy_name,
    cmd AS command,
    roles
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
