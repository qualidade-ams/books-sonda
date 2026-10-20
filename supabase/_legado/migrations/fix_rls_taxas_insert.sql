-- =====================================================
-- MIGRATION: Corrigir Política RLS de INSERT para taxas_clientes
-- =====================================================
-- Descrição: A política de INSERT está sem condição (qual: null)
--            Isso pode estar bloqueando a inserção de dados
-- Data: 2026-03-02
-- =====================================================

-- PASSO 1: Remover política de INSERT antiga (sem condição)
DROP POLICY IF EXISTS "taxas_insert_with_permission" ON taxas_clientes;

-- PASSO 2: Criar nova política de INSERT com condição correta
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
    WHERE uga.user_id = (SELECT auth.uid())
      AND sp.screen_key = 'cadastro_taxas_clientes'
      AND sp.permission_level IN ('edit', 'admin')
  )
);

-- PASSO 3: Verificar se a política foi criada corretamente
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'taxas_clientes'
    AND policyname = 'taxas_insert_with_permission'
    AND cmd = 'INSERT';
  
  IF policy_count > 0 THEN
    RAISE NOTICE '✅ Política de INSERT criada com sucesso';
  ELSE
    RAISE EXCEPTION '❌ Erro: Política de INSERT não foi criada';
  END IF;
END $$;

-- PASSO 4: Testar inserção com a nova política
DO $$
DECLARE
  test_cliente_id UUID;
  test_user_id UUID;
  has_permission BOOLEAN;
BEGIN
  -- Buscar um cliente existente
  SELECT id INTO test_cliente_id
  FROM empresas_clientes
  LIMIT 1;
  
  -- Buscar usuário atual
  SELECT auth.uid() INTO test_user_id;
  
  IF test_cliente_id IS NOT NULL AND test_user_id IS NOT NULL THEN
    -- Verificar se usuário tem permissão
    SELECT EXISTS (
      SELECT 1
      FROM user_group_assignments uga
      JOIN user_groups ug ON uga.group_id = ug.id
      JOIN screen_permissions sp ON sp.group_id = ug.id
      WHERE uga.user_id = test_user_id
        AND sp.screen_key = 'cadastro_taxas_clientes'
        AND sp.permission_level IN ('edit', 'admin')
    ) INTO has_permission;
    
    IF has_permission THEN
      RAISE NOTICE '✅ Usuário tem permissão para inserir taxas';
      
      -- Tentar inserir taxa de teste
      INSERT INTO taxas_clientes (
        cliente_id,
        vigencia_inicio,
        tipo_produto,
        tipo_calculo_adicional,
        prazo_pagamento
      ) VALUES (
        test_cliente_id,
        CURRENT_DATE,
        'GALLERY',
        'media',
        60  -- Teste com 60 dias
      );
      
      RAISE NOTICE '✅ Inserção de teste bem-sucedida com prazo_pagamento = 60';
      
      -- Remover taxa de teste
      DELETE FROM taxas_clientes
      WHERE cliente_id = test_cliente_id
        AND vigencia_inicio = CURRENT_DATE
        AND prazo_pagamento = 60;
      
      RAISE NOTICE '✅ Taxa de teste removida';
    ELSE
      RAISE NOTICE '⚠️ Usuário não tem permissão para inserir taxas';
      RAISE NOTICE '   Execute como service_role ou conceda permissões ao usuário';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ Não foi possível executar teste (cliente ou usuário não encontrado)';
  END IF;
END $$;

-- PASSO 5: Exibir políticas atualizadas
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

