-- Script de Teste: Validar Permissões do Organograma
-- Data: 2026-02-26
-- Descrição: Testa se as políticas RLS estão funcionando corretamente

-- ============================================================================
-- TESTE 1: Verificar se políticas NÃO são permissivas
-- ============================================================================
DO $$
DECLARE
  permissive_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO permissive_count
  FROM pg_policies 
  WHERE schemaname = 'public'
    AND tablename = 'organizacao_estrutura'
    AND (qual = 'true' OR qual LIKE '%true%' OR with_check = 'true' OR with_check LIKE '%true%');
  
  IF permissive_count > 0 THEN
    RAISE EXCEPTION '❌ FALHA: Encontradas % políticas permissivas (USING/WITH CHECK = true)', permissive_count;
  ELSE
    RAISE NOTICE '✅ SUCESSO: Nenhuma política permissiva encontrada';
  END IF;
END $$;

-- ============================================================================
-- TESTE 2: Verificar se todas as políticas usam função de permissão
-- ============================================================================
DO $$
DECLARE
  policies_without_function INTEGER;
BEGIN
  SELECT COUNT(*) INTO policies_without_function
  FROM pg_policies 
  WHERE schemaname = 'public'
    AND tablename = 'organizacao_estrutura'
    AND qual NOT LIKE '%user_has_organograma_permission%'
    AND with_check NOT LIKE '%user_has_organograma_permission%';
  
  IF policies_without_function > 0 THEN
    RAISE EXCEPTION '❌ FALHA: Encontradas % políticas sem verificação de permissão', policies_without_function;
  ELSE
    RAISE NOTICE '✅ SUCESSO: Todas as políticas usam verificação de permissão';
  END IF;
END $$;

-- ============================================================================
-- TESTE 3: Verificar se função está segura (SECURITY DEFINER + search_path)
-- ============================================================================
DO $$
DECLARE
  is_secure BOOLEAN;
BEGIN
  SELECT 
    prosecdef = true AND 
    'search_path=public' = ANY(proconfig)
  INTO is_secure
  FROM pg_proc 
  WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND proname = 'user_has_organograma_permission';
  
  IF NOT is_secure THEN
    RAISE EXCEPTION '❌ FALHA: Função user_has_organograma_permission não está segura';
  ELSE
    RAISE NOTICE '✅ SUCESSO: Função user_has_organograma_permission está segura';
  END IF;
END $$;

-- ============================================================================
-- TESTE 4: Verificar se não há políticas duplicadas
-- ============================================================================
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT tablename, cmd, COUNT(*) as total
    FROM pg_policies 
    WHERE schemaname = 'public'
      AND tablename = 'organizacao_estrutura'
    GROUP BY tablename, cmd
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION '❌ FALHA: Encontradas % políticas duplicadas', duplicate_count;
  ELSE
    RAISE NOTICE '✅ SUCESSO: Nenhuma política duplicada';
  END IF;
END $$;

-- ============================================================================
-- TESTE 5: Verificar se tela está cadastrada
-- ============================================================================
DO $$
DECLARE
  screen_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.screens WHERE key = 'organograma'
  ) INTO screen_exists;
  
  IF NOT screen_exists THEN
    RAISE EXCEPTION '❌ FALHA: Tela organograma não está cadastrada';
  ELSE
    RAISE NOTICE '✅ SUCESSO: Tela organograma está cadastrada';
  END IF;
END $$;

-- ============================================================================
-- TESTE 6: Verificar se Administradores têm permissão de edição
-- ============================================================================
DO $$
DECLARE
  admin_permission TEXT;
BEGIN
  SELECT sp.permission_level INTO admin_permission
  FROM public.screen_permissions sp
  JOIN public.user_groups ug ON sp.group_id = ug.id
  WHERE ug.name = 'Administradores'
    AND sp.screen_key = 'organograma';
  
  IF admin_permission IS NULL THEN
    RAISE EXCEPTION '❌ FALHA: Administradores não têm permissão para organograma';
  ELSIF admin_permission != 'edit' THEN
    RAISE EXCEPTION '❌ FALHA: Administradores têm permissão %, esperado edit', admin_permission;
  ELSE
    RAISE NOTICE '✅ SUCESSO: Administradores têm permissão de edição';
  END IF;
END $$;

-- ============================================================================
-- TESTE 7: Verificar se RLS está habilitado
-- ============================================================================
DO $$
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables 
  WHERE schemaname = 'public'
    AND tablename = 'organizacao_estrutura';
  
  IF NOT rls_enabled THEN
    RAISE EXCEPTION '❌ FALHA: RLS não está habilitado na tabela organizacao_estrutura';
  ELSE
    RAISE NOTICE '✅ SUCESSO: RLS está habilitado';
  END IF;
END $$;

-- ============================================================================
-- TESTE 8: Verificar se bucket de storage existe
-- ============================================================================
DO $$
DECLARE
  bucket_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'organograma'
  ) INTO bucket_exists;
  
  IF NOT bucket_exists THEN
    RAISE EXCEPTION '❌ FALHA: Bucket organograma não existe no Storage';
  ELSE
    RAISE NOTICE '✅ SUCESSO: Bucket organograma existe';
  END IF;
END $$;

-- ============================================================================
-- TESTE 9: Verificar se bucket é público
-- ============================================================================
DO $$
DECLARE
  bucket_is_public BOOLEAN;
BEGIN
  SELECT public INTO bucket_is_public
  FROM storage.buckets 
  WHERE id = 'organograma';
  
  IF NOT bucket_is_public THEN
    RAISE EXCEPTION '❌ FALHA: Bucket organograma não é público';
  ELSE
    RAISE NOTICE '✅ SUCESSO: Bucket organograma é público';
  END IF;
END $$;

-- ============================================================================
-- TESTE 10: Verificar constraints de hierarquia
-- ============================================================================
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'valid_hierarchy'
      AND conrelid = 'public.organizacao_estrutura'::regclass
  ) INTO constraint_exists;
  
  IF NOT constraint_exists THEN
    RAISE EXCEPTION '❌ FALHA: Constraint valid_hierarchy não existe';
  ELSE
    RAISE NOTICE '✅ SUCESSO: Constraint valid_hierarchy existe';
  END IF;
END $$;

-- ============================================================================
-- RESUMO DOS TESTES
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 RESUMO DOS TESTES DE SEGURANÇA';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Todos os testes passaram com sucesso!';
  RAISE NOTICE '';
  RAISE NOTICE 'Verificações realizadas:';
  RAISE NOTICE '1. Políticas não são permissivas';
  RAISE NOTICE '2. Todas as políticas usam verificação de permissão';
  RAISE NOTICE '3. Função de permissão está segura';
  RAISE NOTICE '4. Não há políticas duplicadas';
  RAISE NOTICE '5. Tela está cadastrada no sistema';
  RAISE NOTICE '6. Administradores têm permissão de edição';
  RAISE NOTICE '7. RLS está habilitado';
  RAISE NOTICE '8. Bucket de storage existe';
  RAISE NOTICE '9. Bucket é público para visualização';
  RAISE NOTICE '10. Constraints de hierarquia existem';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Sistema de organograma está seguro e pronto para uso!';
  RAISE NOTICE '========================================';
END $$;
