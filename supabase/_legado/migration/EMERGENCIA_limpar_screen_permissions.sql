-- =====================================================
-- SCRIPT DE EMERGÊNCIA: Limpeza Total screen_permissions
-- =====================================================
-- ⚠️ EXECUTAR ESTE SCRIPT SE OS OUTROS FALHAREM
-- Remove TODAS as políticas de screen_permissions de forma agressiva

-- 1. Listar políticas atuais
SELECT 
  '🔍 POLÍTICA ENCONTRADA: ' || policyname || ' (Ação: ' || cmd || ')' as info
FROM pg_policies 
WHERE tablename = 'screen_permissions'
ORDER BY cmd, policyname;

-- 2. Remover políticas conhecidas (lista completa)
DROP POLICY IF EXISTS "Usuários autenticados podem ver permissões" ON screen_permissions CASCADE;
DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar permissões" ON screen_permissions CASCADE;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar screen_permissions" ON screen_permissions CASCADE;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir screen_permissions" ON screen_permissions CASCADE;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar screen_permissions" ON screen_permissions CASCADE;
DROP POLICY IF EXISTS "Service role full access screen_permissions" ON screen_permissions CASCADE;
DROP POLICY IF EXISTS "Users can read relevant permissions" ON screen_permissions CASCADE;
DROP POLICY IF EXISTS "authenticated_select_screen_permissions" ON screen_permissions CASCADE;
DROP POLICY IF EXISTS "authenticated_insert_screen_permissions" ON screen_permissions CASCADE;
DROP POLICY IF EXISTS "authenticated_update_screen_permissions" ON screen_permissions CASCADE;
DROP POLICY IF EXISTS "authenticated_delete_screen_permissions" ON screen_permissions CASCADE;
DROP POLICY IF EXISTS "screen_permissions_select" ON screen_permissions CASCADE;
DROP POLICY IF EXISTS "screen_permissions_insert" ON screen_permissions CASCADE;
DROP POLICY IF EXISTS "screen_permissions_update" ON screen_permissions CASCADE;
DROP POLICY IF EXISTS "screen_permissions_delete" ON screen_permissions CASCADE;

-- 3. Remover TODAS as políticas dinamicamente (força bruta)
DO $$
DECLARE
  policy_record RECORD;
  sql_command TEXT;
  total_removed INTEGER := 0;
BEGIN
  RAISE NOTICE '🗑️  LIMPEZA FORÇADA - Removendo TODAS as políticas...';
  
  -- Loop até não haver mais políticas
  LOOP
    -- Buscar primeira política encontrada
    SELECT policyname INTO policy_record
    FROM pg_policies 
    WHERE tablename = 'screen_permissions'
    LIMIT 1;
    
    -- Se não encontrou nenhuma, sair do loop
    EXIT WHEN NOT FOUND;
    
    -- Tentar remover com CASCADE
    BEGIN
      sql_command := format('DROP POLICY %I ON screen_permissions CASCADE', policy_record.policyname);
      EXECUTE sql_command;
      total_removed := total_removed + 1;
      RAISE NOTICE '  ✓ Removida: %', policy_record.policyname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '  ⚠️  Erro ao remover %: %', policy_record.policyname, SQLERRM;
      -- Tentar sem CASCADE
      BEGIN
        sql_command := format('DROP POLICY %I ON screen_permissions', policy_record.policyname);
        EXECUTE sql_command;
        total_removed := total_removed + 1;
        RAISE NOTICE '  ✓ Removida (sem CASCADE): %', policy_record.policyname;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '  ❌ FALHA TOTAL ao remover: %', policy_record.policyname;
        -- Forçar saída para evitar loop infinito
        EXIT;
      END;
    END;
  END LOOP;
  
  RAISE NOTICE '✅ Total de políticas removidas: %', total_removed;
END $$;

-- 4. Verificar se restou alguma política
DO $$
DECLARE
  remaining_count INTEGER;
  policy_record RECORD;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM pg_policies 
  WHERE tablename = 'screen_permissions';
  
  IF remaining_count > 0 THEN
    RAISE NOTICE '⚠️  ATENÇÃO: Ainda existem % políticas:', remaining_count;
    FOR policy_record IN 
      SELECT policyname, cmd 
      FROM pg_policies 
      WHERE tablename = 'screen_permissions'
    LOOP
      RAISE NOTICE '  - % (Ação: %)', policy_record.policyname, policy_record.cmd;
    END LOOP;
    RAISE NOTICE '';
    RAISE NOTICE '📝 Copie os nomes acima e execute manualmente:';
    RAISE NOTICE '   DROP POLICY "nome_da_politica" ON screen_permissions CASCADE;';
  ELSE
    RAISE NOTICE '✅ SUCESSO! Todas as políticas foram removidas!';
    RAISE NOTICE '📝 Próximo passo: Execute 20260210_fix_screen_permissions_rls.sql';
  END IF;
END $$;

-- 5. Garantir RLS habilitado
ALTER TABLE screen_permissions ENABLE ROW LEVEL SECURITY;

SELECT '✅ Script de emergência concluído!' as status;
