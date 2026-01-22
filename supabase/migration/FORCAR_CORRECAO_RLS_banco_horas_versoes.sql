-- Migration: FORÇAR Correção de políticas RLS da tabela banco_horas_versoes
-- Data: 2026-01-22
-- Descrição: Remove TODAS as políticas antigas e cria novas políticas corretas
--            Use este script se a correção normal não funcionou

-- =====================================================
-- PASSO 1: Remover TODAS as políticas existentes
-- =====================================================

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🗑️ Removendo todas as políticas antigas...';
  RAISE NOTICE '';
  
  FOR policy_record IN 
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'banco_horas_versoes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON banco_horas_versoes', policy_record.policyname);
    RAISE NOTICE '  ✅ Removida: %', policy_record.policyname;
  END LOOP;
  
  RAISE NOTICE '';
END $$;

-- =====================================================
-- PASSO 2: Criar novas políticas RLS otimizadas
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '📝 Criando novas políticas RLS...';
  RAISE NOTICE '';
END $$;

-- Leitura: Usuários autenticados podem visualizar todas as versões
CREATE POLICY "authenticated_select_versoes" ON banco_horas_versoes
  FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

-- Inserção: Usuários autenticados podem criar versões
CREATE POLICY "authenticated_insert_versoes" ON banco_horas_versoes
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- Atualização: Usuários autenticados podem atualizar versões
CREATE POLICY "authenticated_update_versoes" ON banco_horas_versoes
  FOR UPDATE
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- Exclusão: Apenas administradores podem excluir versões
CREATE POLICY "admin_delete_versoes" ON banco_horas_versoes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_group_assignments uga
      INNER JOIN user_groups ug ON uga.group_id = ug.id
      WHERE uga.user_id = (SELECT auth.uid())
        AND ug.name = 'Administradores'
    )
  );

-- =====================================================
-- PASSO 3: Garantir que RLS está habilitado
-- =====================================================

ALTER TABLE banco_horas_versoes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PASSO 4: Validação
-- =====================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ CORREÇÃO FORÇADA CONCLUÍDA!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Contar políticas criadas
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'banco_horas_versoes';
  
  RAISE NOTICE '📋 Total de políticas criadas: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '📋 Políticas:';
  RAISE NOTICE '  - authenticated_select_versoes (SELECT)';
  RAISE NOTICE '  - authenticated_insert_versoes (INSERT)';
  RAISE NOTICE '  - authenticated_update_versoes (UPDATE)';
  RAISE NOTICE '  - admin_delete_versoes (DELETE)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 RLS habilitado: banco_horas_versoes';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 PRÓXIMOS PASSOS:';
  RAISE NOTICE '  1. Recarregue a página no navegador (Ctrl+Shift+R)';
  RAISE NOTICE '  2. Abra o modal de histórico novamente';
  RAISE NOTICE '  3. Verifique o console do navegador para erros';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- PASSO 5: Testar acesso
-- =====================================================

-- Mostrar dados que devem ser acessíveis
SELECT 
  id,
  empresa_id,
  mes,
  ano,
  versao,
  tipo_alteracao,
  created_at
FROM banco_horas_versoes
WHERE empresa_id = 'bb8199f7-f447-4179-804f-0bab7525c6d2'
  AND mes = 12
  AND ano = 2025
ORDER BY created_at DESC;
