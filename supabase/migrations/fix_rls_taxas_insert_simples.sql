-- =====================================================
-- MIGRATION SIMPLIFICADA: Corrigir Política RLS de INSERT
-- =====================================================
-- Descrição: Corrige a política de INSERT que estava sem condição
-- Data: 2026-03-02
-- =====================================================

-- PASSO 1: Remover política antiga
DROP POLICY IF EXISTS "taxas_insert_with_permission" ON taxas_clientes;

-- PASSO 2: Criar nova política com condição correta
CREATE POLICY "taxas_insert_with_permission"
ON taxas_clientes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN user_groups ug ON uga.group_id = ug.id
    JOIN screen_permissions sp ON sp.group_id = ug.id
    WHERE uga.user_id = auth.uid()
      AND sp.screen_key = 'cadastro_taxas_clientes'
      AND sp.permission_level IN ('edit', 'admin')
  )
);

-- PASSO 3: Verificar se foi criada
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'taxas_clientes' 
    AND policyname = 'taxas_insert_with_permission'
  ) THEN
    RAISE NOTICE '✅ Política de INSERT criada com sucesso';
  ELSE
    RAISE EXCEPTION '❌ Erro ao criar política';
  END IF;
END $$;

-- PASSO 4: Exibir status das políticas
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual IS NULL THEN '⚠️ SEM CONDIÇÃO'
    ELSE '✅ COM CONDIÇÃO'
  END as status
FROM pg_policies
WHERE tablename = 'taxas_clientes'
ORDER BY cmd, policyname;

