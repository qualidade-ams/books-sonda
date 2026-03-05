-- =====================================================
-- Script: Verificação da Estrutura do Banco de Dados
-- Descrição: Verifica se todas as tabelas e colunas necessárias existem
-- Data: 2026-03-04
-- =====================================================

DO $$
DECLARE
  v_result TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICAÇÃO DA ESTRUTURA DO BANCO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- 1. Verificar tabela profiles
  RAISE NOTICE '1. Tabela PROFILES:';
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    RAISE NOTICE '   ✅ Tabela profiles existe';
    
    -- Verificar colunas
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) INTO v_result
    FROM information_schema.columns
    WHERE table_name = 'profiles';
    
    RAISE NOTICE '   Colunas: %', v_result;
    
    -- Verificar coluna active
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'active') THEN
      RAISE NOTICE '   ✅ Coluna "active" existe';
    ELSE
      RAISE NOTICE '   ❌ Coluna "active" NÃO existe';
    END IF;
    
    -- Verificar coluna full_name
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
      RAISE NOTICE '   ✅ Coluna "full_name" existe';
    ELSE
      RAISE NOTICE '   ❌ Coluna "full_name" NÃO existe';
    END IF;
  ELSE
    RAISE NOTICE '   ❌ Tabela profiles NÃO existe';
  END IF;
  
  RAISE NOTICE '';

  -- 2. Verificar tabela user_groups
  RAISE NOTICE '2. Tabela USER_GROUPS:';
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_groups') THEN
    RAISE NOTICE '   ✅ Tabela user_groups existe';
    
    -- Contar grupos
    SELECT COUNT(*)::TEXT INTO v_result FROM user_groups;
    RAISE NOTICE '   Total de grupos: %', v_result;
    
    -- Verificar grupo Administradores
    IF EXISTS (SELECT 1 FROM user_groups WHERE name = 'Administradores') THEN
      RAISE NOTICE '   ✅ Grupo "Administradores" existe';
    ELSE
      RAISE NOTICE '   ❌ Grupo "Administradores" NÃO existe';
    END IF;
  ELSE
    RAISE NOTICE '   ❌ Tabela user_groups NÃO existe';
  END IF;
  
  RAISE NOTICE '';

  -- 3. Verificar tabela user_group_assignments
  RAISE NOTICE '3. Tabela USER_GROUP_ASSIGNMENTS:';
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_group_assignments') THEN
    RAISE NOTICE '   ✅ Tabela user_group_assignments existe';
    
    -- Contar atribuições
    SELECT COUNT(*)::TEXT INTO v_result FROM user_group_assignments;
    RAISE NOTICE '   Total de atribuições: %', v_result;
  ELSE
    RAISE NOTICE '   ❌ Tabela user_group_assignments NÃO existe';
  END IF;
  
  RAISE NOTICE '';

  -- 4. Verificar tabela screens
  RAISE NOTICE '4. Tabela SCREENS:';
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screens') THEN
    RAISE NOTICE '   ✅ Tabela screens existe';
    
    -- Contar telas
    SELECT COUNT(*)::TEXT INTO v_result FROM screens;
    RAISE NOTICE '   Total de telas: %', v_result;
    
    -- Verificar tela cadastro-usuarios
    IF EXISTS (SELECT 1 FROM screens WHERE key = 'cadastro-usuarios') THEN
      RAISE NOTICE '   ✅ Tela "cadastro-usuarios" existe';
    ELSE
      RAISE NOTICE '   ❌ Tela "cadastro-usuarios" NÃO existe';
    END IF;
  ELSE
    RAISE NOTICE '   ❌ Tabela screens NÃO existe';
  END IF;
  
  RAISE NOTICE '';

  -- 5. Verificar tabela screen_permissions
  RAISE NOTICE '5. Tabela SCREEN_PERMISSIONS:';
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screen_permissions') THEN
    RAISE NOTICE '   ✅ Tabela screen_permissions existe';
    
    -- Contar permissões
    SELECT COUNT(*)::TEXT INTO v_result FROM screen_permissions;
    RAISE NOTICE '   Total de permissões: %', v_result;
  ELSE
    RAISE NOTICE '   ❌ Tabela screen_permissions NÃO existe';
  END IF;
  
  RAISE NOTICE '';

  -- 6. Verificar funções
  RAISE NOTICE '6. FUNÇÕES:';
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
    RAISE NOTICE '   ✅ Função "is_admin" existe';
  ELSE
    RAISE NOTICE '   ❌ Função "is_admin" NÃO existe';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'list_all_users') THEN
    RAISE NOTICE '   ✅ Função "list_all_users" existe';
  ELSE
    RAISE NOTICE '   ❌ Função "list_all_users" NÃO existe';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'admin_update_user') THEN
    RAISE NOTICE '   ✅ Função "admin_update_user" existe';
  ELSE
    RAISE NOTICE '   ❌ Função "admin_update_user" NÃO existe';
  END IF;
  
  RAISE NOTICE '';

  -- 7. Verificar RLS
  RAISE NOTICE '7. ROW LEVEL SECURITY (RLS):';
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'profiles' AND rowsecurity = true) THEN
    RAISE NOTICE '   ✅ RLS habilitado em profiles';
  ELSE
    RAISE NOTICE '   ❌ RLS NÃO habilitado em profiles';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_groups' AND rowsecurity = true) THEN
    RAISE NOTICE '   ✅ RLS habilitado em user_groups';
  ELSE
    RAISE NOTICE '   ❌ RLS NÃO habilitado em user_groups';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_group_assignments' AND rowsecurity = true) THEN
    RAISE NOTICE '   ✅ RLS habilitado em user_group_assignments';
  ELSE
    RAISE NOTICE '   ❌ RLS NÃO habilitado em user_group_assignments';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FIM DA VERIFICAÇÃO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;
