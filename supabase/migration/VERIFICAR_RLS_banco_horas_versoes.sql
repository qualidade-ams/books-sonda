-- Script de Verificação: Políticas RLS de banco_horas_versoes
-- Data: 2026-01-22
-- Descrição: Verifica se as políticas RLS estão corretas e funcionando

-- =====================================================
-- PARTE 1: Listar políticas atuais
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔒 VERIFICAÇÃO DE POLÍTICAS RLS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- Verificar se RLS está habilitado
DO $$
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'banco_horas_versoes';
  
  IF rls_enabled THEN
    RAISE NOTICE '✅ RLS está HABILITADO';
  ELSE
    RAISE NOTICE '❌ RLS está DESABILITADO';
  END IF;
  RAISE NOTICE '';
END $$;

-- Listar todas as políticas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies 
WHERE tablename = 'banco_horas_versoes'
ORDER BY policyname;

-- =====================================================
-- PARTE 2: Testar acesso como usuário autenticado
-- =====================================================

DO $$
DECLARE
  test_empresa_id UUID := 'bb8199f7-f447-4179-804f-0bab7525c6d2';
  test_mes INTEGER := 12;
  test_ano INTEGER := 2025;
  resultado_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 TESTE DE ACESSO:';
  RAISE NOTICE '-------------------';
  RAISE NOTICE '  Buscando versões para:';
  RAISE NOTICE '    empresa_id: %', test_empresa_id;
  RAISE NOTICE '    mes: %', test_mes;
  RAISE NOTICE '    ano: %', test_ano;
  RAISE NOTICE '';
  
  -- Testar query SEM RLS (como admin)
  SET LOCAL ROLE postgres;
  
  SELECT COUNT(*) INTO resultado_count
  FROM banco_horas_versoes
  WHERE empresa_id = test_empresa_id
    AND mes = test_mes
    AND ano = test_ano;
  
  RAISE NOTICE '  ✅ Resultado SEM RLS (admin): % registro(s)', resultado_count;
  
  RESET ROLE;
  
  RAISE NOTICE '';
  RAISE NOTICE '  ⚠️ Para testar COM RLS, você precisa estar autenticado como usuário';
  RAISE NOTICE '     Use o frontend para fazer a requisição';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- PARTE 3: Verificar se políticas antigas existem
-- =====================================================

DO $$
DECLARE
  tem_politica_antiga BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 VERIFICANDO POLÍTICAS ANTIGAS:';
  RAISE NOTICE '-------------------';
  
  -- Verificar se existe política antiga
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'banco_horas_versoes'
    AND policyname = 'Authenticated users can view versoes'
  ) INTO tem_politica_antiga;
  
  IF tem_politica_antiga THEN
    RAISE NOTICE '  ❌ PROBLEMA: Política antiga ainda existe!';
    RAISE NOTICE '     Execute a migration de correção RLS';
  ELSE
    RAISE NOTICE '  ✅ Políticas antigas foram removidas';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- =====================================================
-- PARTE 4: Verificar se políticas novas existem
-- =====================================================

DO $$
DECLARE
  tem_select BOOLEAN;
  tem_insert BOOLEAN;
  tem_update BOOLEAN;
  tem_delete BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 VERIFICANDO POLÍTICAS NOVAS:';
  RAISE NOTICE '-------------------';
  
  -- Verificar cada política
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'banco_horas_versoes'
    AND policyname = 'authenticated_select_versoes'
  ) INTO tem_select;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'banco_horas_versoes'
    AND policyname = 'authenticated_insert_versoes'
  ) INTO tem_insert;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'banco_horas_versoes'
    AND policyname = 'authenticated_update_versoes'
  ) INTO tem_update;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'banco_horas_versoes'
    AND policyname = 'admin_delete_versoes'
  ) INTO tem_delete;
  
  -- Mostrar resultados
  IF tem_select THEN
    RAISE NOTICE '  ✅ authenticated_select_versoes (SELECT)';
  ELSE
    RAISE NOTICE '  ❌ authenticated_select_versoes (SELECT) - FALTANDO!';
  END IF;
  
  IF tem_insert THEN
    RAISE NOTICE '  ✅ authenticated_insert_versoes (INSERT)';
  ELSE
    RAISE NOTICE '  ❌ authenticated_insert_versoes (INSERT) - FALTANDO!';
  END IF;
  
  IF tem_update THEN
    RAISE NOTICE '  ✅ authenticated_update_versoes (UPDATE)';
  ELSE
    RAISE NOTICE '  ❌ authenticated_update_versoes (UPDATE) - FALTANDO!';
  END IF;
  
  IF tem_delete THEN
    RAISE NOTICE '  ✅ admin_delete_versoes (DELETE)';
  ELSE
    RAISE NOTICE '  ❌ admin_delete_versoes (DELETE) - FALTANDO!';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- =====================================================
-- PARTE 5: Resumo e Ação Necessária
-- =====================================================

DO $$
DECLARE
  tem_politica_antiga BOOLEAN;
  tem_select BOOLEAN;
  precisa_correcao BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📝 RESUMO E AÇÃO NECESSÁRIA';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Verificar políticas
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'banco_horas_versoes'
    AND policyname = 'Authenticated users can view versoes'
  ) INTO tem_politica_antiga;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'banco_horas_versoes'
    AND policyname = 'authenticated_select_versoes'
  ) INTO tem_select;
  
  -- Determinar ação necessária
  IF tem_politica_antiga THEN
    RAISE NOTICE '❌ AÇÃO NECESSÁRIA:';
    RAISE NOTICE '   Execute a migration de correção RLS:';
    RAISE NOTICE '   supabase/migration/20260122000009_fix_banco_horas_versoes_rls.sql';
    RAISE NOTICE '';
    precisa_correcao := TRUE;
  ELSIF NOT tem_select THEN
    RAISE NOTICE '❌ AÇÃO NECESSÁRIA:';
    RAISE NOTICE '   Políticas RLS não estão configuradas!';
    RAISE NOTICE '   Execute a migration de correção RLS:';
    RAISE NOTICE '   supabase/migration/20260122000009_fix_banco_horas_versoes_rls.sql';
    RAISE NOTICE '';
    precisa_correcao := TRUE;
  ELSE
    RAISE NOTICE '✅ POLÍTICAS RLS ESTÃO CORRETAS!';
    RAISE NOTICE '';
    RAISE NOTICE '   Se o frontend ainda não mostra as versões:';
    RAISE NOTICE '   1. Limpe o cache do navegador (Ctrl+Shift+R)';
    RAISE NOTICE '   2. Verifique o console do navegador para erros';
    RAISE NOTICE '   3. Verifique se o usuário está autenticado';
    RAISE NOTICE '';
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;
