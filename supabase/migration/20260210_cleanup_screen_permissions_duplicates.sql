-- =====================================================
-- Script: Limpeza Forçada de Políticas Duplicadas
-- Tabela: screen_permissions
-- Data: 2026-02-10
-- =====================================================

-- ⚠️ EXECUTAR ESTE SCRIPT PRIMEIRO para limpar duplicatas

-- 1. Diagnóstico: Listar TODAS as políticas existentes
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE '📋 Listando TODAS as políticas de screen_permissions:';
  RAISE NOTICE '================================================';
  
  FOR policy_record IN 
    SELECT policyname, cmd 
    FROM pg_policies 
    WHERE tablename = 'screen_permissions'
    ORDER BY cmd, policyname
  LOOP
    RAISE NOTICE '  - % (Ação: %)', policy_record.policyname, policy_record.cmd;
  END LOOP;
  
  RAISE NOTICE '================================================';
END $$;

-- 2. Verificar duplicatas
DO $$
DECLARE
  duplicate_record RECORD;
  has_duplicates BOOLEAN := false;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Verificando duplicatas:';
  RAISE NOTICE '================================================';
  
  FOR duplicate_record IN 
    SELECT 
      tablename,
      cmd as acao,
      array_agg(policyname) as politicas,
      COUNT(*) as total
    FROM pg_policies 
    WHERE tablename = 'screen_permissions'
    GROUP BY tablename, cmd
    HAVING COUNT(*) > 1
  LOOP
    has_duplicates := true;
    RAISE NOTICE '⚠️  Ação % tem % políticas: %', 
      duplicate_record.acao, 
      duplicate_record.total, 
      duplicate_record.politicas;
  END LOOP;
  
  IF NOT has_duplicates THEN
    RAISE NOTICE '✅ Nenhuma duplicata encontrada';
  END IF;
  
  RAISE NOTICE '================================================';
END $$;

-- 3. REMOVER TODAS AS POLÍTICAS (limpeza forçada)
DO $$
DECLARE
  policy_record RECORD;
  drop_count INTEGER := 0;
  sql_command TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🗑️  Removendo TODAS as políticas:';
  RAISE NOTICE '================================================';
  
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'screen_permissions'
    ORDER BY policyname
  LOOP
    -- Usar identificador entre aspas para lidar com nomes especiais
    sql_command := format('DROP POLICY IF EXISTS %I ON screen_permissions', policy_record.policyname);
    
    BEGIN
      EXECUTE sql_command;
      drop_count := drop_count + 1;
      RAISE NOTICE '  ✓ Removida: %', policy_record.policyname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '  ⚠️  Erro ao remover %: %', policy_record.policyname, SQLERRM;
    END;
  END LOOP;
  
  -- Tentar remover políticas conhecidas que podem não aparecer na lista
  DECLARE
    known_policies TEXT[] := ARRAY[
      'Usuários autenticados podem ver permissões',
      'Usuários autenticados podem gerenciar permissões',
      'Usuários autenticados podem deletar screen_permissions',
      'Usuários autenticados podem inserir screen_permissions',
      'Usuários autenticados podem atualizar screen_permissions',
      'Service role full access screen_permissions',
      'Users can read relevant permissions',
      'authenticated_select_screen_permissions',
      'authenticated_insert_screen_permissions',
      'authenticated_update_screen_permissions',
      'authenticated_delete_screen_permissions',
      'screen_permissions_select',
      'screen_permissions_insert',
      'screen_permissions_update',
      'screen_permissions_delete'
    ];
    policy_name TEXT;
  BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Tentando remover políticas conhecidas adicionais:';
    FOREACH policy_name IN ARRAY known_policies
    LOOP
      BEGIN
        EXECUTE format('DROP POLICY IF EXISTS %I ON screen_permissions', policy_name);
        RAISE NOTICE '  ✓ Tentativa: %', policy_name;
      EXCEPTION WHEN OTHERS THEN
        -- Ignorar erros silenciosamente
      END;
    END LOOP;
  END;
  
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ Total de políticas removidas: %', drop_count;
END $$;

-- 4. Verificar se todas foram removidas
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM pg_policies 
  WHERE tablename = 'screen_permissions';
  
  IF remaining_count > 0 THEN
    RAISE EXCEPTION '❌ ERRO: Ainda existem % políticas após remoção!', remaining_count;
  ELSE
    RAISE NOTICE '✅ Todas as políticas foram removidas com sucesso';
  END IF;
END $$;

-- 5. Garantir que RLS está habilitado
ALTER TABLE screen_permissions ENABLE ROW LEVEL SECURITY;

RAISE NOTICE '';
RAISE NOTICE '✅ Limpeza concluída!';
RAISE NOTICE '📝 Próximo passo: Execute o script 20260210_fix_screen_permissions_rls.sql';
