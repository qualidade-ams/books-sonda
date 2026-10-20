-- =====================================================
-- Migration: Correção de Performance RLS e Políticas Duplicadas
-- Data: 2026-01-29
-- Descrição: 
--   1. Otimiza políticas RLS do historico_inconsistencias_chamados
--   2. Remove políticas duplicadas do banco_horas_versoes
-- =====================================================

-- =====================================================
-- PARTE 1: Correção de Performance - historico_inconsistencias_chamados
-- =====================================================

-- Problema: Políticas re-avaliam auth.jwt() para cada linha
-- Solução: Usar (SELECT auth.jwt()) para avaliar uma vez por query

-- Remover políticas antigas com performance ruim
DROP POLICY IF EXISTS "Service role can update historico" ON public.historico_inconsistencias_chamados;
DROP POLICY IF EXISTS "Service role can delete historico" ON public.historico_inconsistencias_chamados;

-- Recriar políticas OTIMIZADAS
CREATE POLICY "Service role can update historico" ON public.historico_inconsistencias_chamados
  FOR UPDATE USING (
    ((SELECT auth.jwt())->>'role') = 'service_role'
  );

CREATE POLICY "Service role can delete historico" ON public.historico_inconsistencias_chamados
  FOR DELETE USING (
    ((SELECT auth.jwt())->>'role') = 'service_role'
  );

COMMENT ON POLICY "Service role can update historico" ON public.historico_inconsistencias_chamados IS 
'Política otimizada: usa (SELECT auth.jwt()) para melhor performance';

COMMENT ON POLICY "Service role can delete historico" ON public.historico_inconsistencias_chamados IS 
'Política otimizada: usa (SELECT auth.jwt()) para melhor performance';

-- =====================================================
-- PARTE 2: Remoção de Políticas Duplicadas - banco_horas_versoes
-- =====================================================

-- Problema: Múltiplas políticas permissivas para mesma ação
-- Solução: Manter apenas as políticas otimizadas mais recentes

-- Remover políticas antigas/duplicadas
DROP POLICY IF EXISTS "Users can view versoes" ON banco_horas_versoes;
DROP POLICY IF EXISTS "Users can insert versoes" ON banco_horas_versoes;
DROP POLICY IF EXISTS "Authenticated users can view versoes" ON banco_horas_versoes;
DROP POLICY IF EXISTS "Admins can insert versoes" ON banco_horas_versoes;

-- Garantir que as políticas corretas existem (recriar se necessário)
-- Estas já devem existir da migration 20260122000009, mas garantimos aqui

-- Remover e recriar para garantir que não há duplicatas
DROP POLICY IF EXISTS "authenticated_select_versoes" ON banco_horas_versoes;
DROP POLICY IF EXISTS "authenticated_insert_versoes" ON banco_horas_versoes;
DROP POLICY IF EXISTS "authenticated_update_versoes" ON banco_horas_versoes;
DROP POLICY IF EXISTS "admin_delete_versoes" ON banco_horas_versoes;

-- Leitura: Usuários autenticados podem visualizar todas as versões
CREATE POLICY "authenticated_select_versoes" ON banco_horas_versoes
  AS PERMISSIVE
  FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

-- Inserção: Usuários autenticados podem criar versões
CREATE POLICY "authenticated_insert_versoes" ON banco_horas_versoes
  AS PERMISSIVE
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- Atualização: Usuários autenticados podem atualizar versões
CREATE POLICY "authenticated_update_versoes" ON banco_horas_versoes
  AS PERMISSIVE
  FOR UPDATE
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- Exclusão: Apenas administradores podem deletar versões
CREATE POLICY "admin_delete_versoes" ON banco_horas_versoes
  AS PERMISSIVE
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 
      FROM user_group_assignments uga
      JOIN user_groups ug ON uga.group_id = ug.id
      WHERE uga.user_id = (SELECT auth.uid())
      AND ug.name = 'Administradores'
    )
  );

-- Adicionar comentários para documentação
COMMENT ON POLICY "authenticated_select_versoes" ON banco_horas_versoes IS 
'Política otimizada: usuários autenticados podem visualizar versões';

COMMENT ON POLICY "authenticated_insert_versoes" ON banco_horas_versoes IS 
'Política otimizada: usuários autenticados podem criar versões';

COMMENT ON POLICY "authenticated_update_versoes" ON banco_horas_versoes IS 
'Política otimizada: usuários autenticados podem atualizar versões';

COMMENT ON POLICY "admin_delete_versoes" ON banco_horas_versoes IS 
'Política restritiva: apenas administradores podem deletar versões';

-- =====================================================
-- PARTE 3: Verificação de Segurança e Performance
-- =====================================================

-- Verificar políticas do historico_inconsistencias_chamados
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICAÇÃO: historico_inconsistencias_chamados ===';
  
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'historico_inconsistencias_chamados';
  
  RAISE NOTICE 'Total de políticas: %', policy_count;
  
  -- Listar políticas
  FOR policy_count IN 
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'historico_inconsistencias_chamados'
  LOOP
    RAISE NOTICE '  ✅ Política encontrada';
  END LOOP;
END $$;

-- Verificar políticas do banco_horas_versoes
DO $$
DECLARE
  select_count INTEGER;
  insert_count INTEGER;
  update_count INTEGER;
  delete_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICAÇÃO: banco_horas_versoes ===';
  
  -- Contar políticas por ação
  SELECT COUNT(*) INTO select_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'banco_horas_versoes'
  AND cmd = 'SELECT';
  
  SELECT COUNT(*) INTO insert_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'banco_horas_versoes'
  AND cmd = 'INSERT';
  
  SELECT COUNT(*) INTO update_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'banco_horas_versoes'
  AND cmd = 'UPDATE';
  
  SELECT COUNT(*) INTO delete_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'banco_horas_versoes'
  AND cmd = 'DELETE';
  
  RAISE NOTICE 'Políticas SELECT: % (esperado: 1)', select_count;
  RAISE NOTICE 'Políticas INSERT: % (esperado: 1)', insert_count;
  RAISE NOTICE 'Políticas UPDATE: % (esperado: 1)', update_count;
  RAISE NOTICE 'Políticas DELETE: % (esperado: 1)', delete_count;
  
  -- Alertas se houver duplicatas
  IF select_count > 1 THEN
    RAISE WARNING '⚠️ DUPLICATA: Múltiplas políticas SELECT detectadas!';
  END IF;
  
  IF insert_count > 1 THEN
    RAISE WARNING '⚠️ DUPLICATA: Múltiplas políticas INSERT detectadas!';
  END IF;
  
  IF update_count > 1 THEN
    RAISE WARNING '⚠️ DUPLICATA: Múltiplas políticas UPDATE detectadas!';
  END IF;
  
  IF delete_count > 1 THEN
    RAISE WARNING '⚠️ DUPLICATA: Múltiplas políticas DELETE detectadas!';
  END IF;
  
  -- Sucesso se tudo estiver correto
  IF select_count = 1 AND insert_count = 1 AND update_count = 1 AND delete_count = 1 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SUCESSO: Todas as políticas estão corretas (1 por ação)';
  END IF;
END $$;

-- =====================================================
-- PARTE 4: Verificação de Performance
-- =====================================================

-- Query para verificar otimização de performance
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual LIKE '%SELECT auth.%' OR qual LIKE '%SELECT current_setting%' 
    THEN '✅ Otimizado'
    WHEN qual LIKE '%auth.%' OR qual LIKE '%current_setting%'
    THEN '⚠️ Não otimizado (re-avalia por linha)'
    ELSE '✅ OK'
  END as performance_status,
  qual as policy_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('historico_inconsistencias_chamados', 'banco_horas_versoes')
ORDER BY tablename, cmd;
