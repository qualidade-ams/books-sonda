-- =====================================================
-- Migration: Remoção DEFINITIVA de Políticas Duplicadas - Planos de Ação
-- Data: 2026-01-29
-- Descrição: Remove TODAS as políticas antigas e cria apenas as corretas
-- =====================================================

-- =====================================================
-- PROBLEMA IDENTIFICADO
-- =====================================================
-- Múltiplas políticas SELECT duplicadas:
-- 1. "Usuários autenticados podem ver planos_acao" (antiga, permissiva demais)
-- 2. "Usuários podem ver planos com permissão" (nova, correta)
-- Resultado: Conflito entre políticas causa bloqueio de visualização

-- =====================================================
-- PARTE 1: REMOVER TODAS AS POLÍTICAS ANTIGAS
-- =====================================================

-- Remover políticas antigas da migration plano_acao_migration.sql
DROP POLICY IF EXISTS "Usuários autenticados podem ler planos" ON planos_acao;
DROP POLICY IF EXISTS "Usuários autenticados podem criar planos" ON planos_acao;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar planos" ON planos_acao;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar planos" ON planos_acao;

-- Remover variações de nomes
DROP POLICY IF EXISTS "Usuários autenticados podem ver planos_acao" ON planos_acao;
DROP POLICY IF EXISTS "Usuários autenticados podem ler planos_acao" ON planos_acao;

-- Remover políticas atuais para recriar
DROP POLICY IF EXISTS "Usuários podem ver planos com permissão" ON planos_acao;
DROP POLICY IF EXISTS "Usuários podem inserir planos com permissão" ON planos_acao;
DROP POLICY IF EXISTS "Usuários podem atualizar planos com permissão" ON planos_acao;
DROP POLICY IF EXISTS "Usuários podem excluir planos com permissão" ON planos_acao;

-- =====================================================
-- PARTE 2: CRIAR POLÍTICAS CORRETAS E ÚNICAS
-- =====================================================

-- SELECT: Usuários com permissão view, edit ou delete podem visualizar
CREATE POLICY "Usuários podem ver planos com permissão" ON planos_acao
  AS PERMISSIVE
  FOR SELECT 
  USING (
    has_screen_permission('plano_acao', 'view') OR
    has_screen_permission('plano_acao', 'edit') OR
    has_screen_permission('plano_acao', 'delete')
  );

-- INSERT: Usuários com permissão edit podem criar
CREATE POLICY "Usuários podem inserir planos com permissão" ON planos_acao
  AS PERMISSIVE
  FOR INSERT 
  WITH CHECK (
    has_screen_permission('plano_acao', 'edit')
  );

-- UPDATE: Usuários com permissão edit podem atualizar
CREATE POLICY "Usuários podem atualizar planos com permissão" ON planos_acao
  AS PERMISSIVE
  FOR UPDATE 
  USING (
    has_screen_permission('plano_acao', 'edit')
  )
  WITH CHECK (
    has_screen_permission('plano_acao', 'edit')
  );

-- DELETE: Usuários com permissão delete podem excluir
CREATE POLICY "Usuários podem excluir planos com permissão" ON planos_acao
  AS PERMISSIVE
  FOR DELETE 
  USING (
    has_screen_permission('plano_acao', 'delete')
  );

-- =====================================================
-- PARTE 3: ADICIONAR COMENTÁRIOS
-- =====================================================

COMMENT ON POLICY "Usuários podem ver planos com permissão" ON planos_acao IS 
'Política flexível: usuários com permissão view, edit ou delete podem visualizar planos de ação';

COMMENT ON POLICY "Usuários podem inserir planos com permissão" ON planos_acao IS 
'Política corrigida: usuários com permissão edit podem criar planos de ação';

COMMENT ON POLICY "Usuários podem atualizar planos com permissão" ON planos_acao IS 
'Política corrigida: usuários com permissão edit podem atualizar planos de ação';

COMMENT ON POLICY "Usuários podem excluir planos com permissão" ON planos_acao IS 
'Política restritiva: apenas usuários com permissão delete podem excluir planos de ação';

-- =====================================================
-- PARTE 4: VERIFICAÇÃO RIGOROSA
-- =====================================================

DO $$
DECLARE
  v_select_count INTEGER;
  v_insert_count INTEGER;
  v_update_count INTEGER;
  v_delete_count INTEGER;
  v_total_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICAÇÃO RIGOROSA: Políticas RLS de planos_acao ===';
  
  -- Contar políticas por ação
  SELECT COUNT(*) INTO v_select_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'planos_acao'
  AND cmd = 'SELECT';
  
  SELECT COUNT(*) INTO v_insert_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'planos_acao'
  AND cmd = 'INSERT';
  
  SELECT COUNT(*) INTO v_update_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'planos_acao'
  AND cmd = 'UPDATE';
  
  SELECT COUNT(*) INTO v_delete_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'planos_acao'
  AND cmd = 'DELETE';
  
  SELECT COUNT(*) INTO v_total_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'planos_acao';
  
  RAISE NOTICE 'Total de políticas: %', v_total_count;
  RAISE NOTICE 'Políticas SELECT: % (esperado: 1)', v_select_count;
  RAISE NOTICE 'Políticas INSERT: % (esperado: 1)', v_insert_count;
  RAISE NOTICE 'Políticas UPDATE: % (esperado: 1)', v_update_count;
  RAISE NOTICE 'Políticas DELETE: % (esperado: 1)', v_delete_count;
  
  -- Alertas se houver duplicatas
  IF v_select_count > 1 THEN
    RAISE WARNING '⚠️ DUPLICATA: % políticas SELECT detectadas!', v_select_count;
  ELSIF v_select_count = 0 THEN
    RAISE WARNING '⚠️ FALTANDO: Nenhuma política SELECT!';
  ELSE
    RAISE NOTICE '✅ SELECT: OK';
  END IF;
  
  IF v_insert_count > 1 THEN
    RAISE WARNING '⚠️ DUPLICATA: % políticas INSERT detectadas!', v_insert_count;
  ELSIF v_insert_count = 0 THEN
    RAISE WARNING '⚠️ FALTANDO: Nenhuma política INSERT!';
  ELSE
    RAISE NOTICE '✅ INSERT: OK';
  END IF;
  
  IF v_update_count > 1 THEN
    RAISE WARNING '⚠️ DUPLICATA: % políticas UPDATE detectadas!', v_update_count;
  ELSIF v_update_count = 0 THEN
    RAISE WARNING '⚠️ FALTANDO: Nenhuma política UPDATE!';
  ELSE
    RAISE NOTICE '✅ UPDATE: OK';
  END IF;
  
  IF v_delete_count > 1 THEN
    RAISE WARNING '⚠️ DUPLICATA: % políticas DELETE detectadas!', v_delete_count;
  ELSIF v_delete_count = 0 THEN
    RAISE WARNING '⚠️ FALTANDO: Nenhuma política DELETE!';
  ELSE
    RAISE NOTICE '✅ DELETE: OK';
  END IF;
  
  -- Sucesso se tudo estiver correto
  IF v_total_count = 4 AND v_select_count = 1 AND v_insert_count = 1 AND v_update_count = 1 AND v_delete_count = 1 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SUCESSO: Exatamente 4 políticas (1 por ação)';
  ELSE
    RAISE WARNING '⚠️ ATENÇÃO: Total de políticas = % (esperado: 4)', v_total_count;
  END IF;
END $$;

-- =====================================================
-- PARTE 5: LISTAR TODAS AS POLÍTICAS
-- =====================================================

-- Listar políticas detalhadamente
SELECT 
  policyname as "Nome da Política",
  cmd as "Ação",
  roles as "Roles",
  CASE 
    WHEN cmd = 'SELECT' AND policyname = 'Usuários podem ver planos com permissão' THEN '✅ Correta'
    WHEN cmd = 'INSERT' AND policyname = 'Usuários podem inserir planos com permissão' THEN '✅ Correta'
    WHEN cmd = 'UPDATE' AND policyname = 'Usuários podem atualizar planos com permissão' THEN '✅ Correta'
    WHEN cmd = 'DELETE' AND policyname = 'Usuários podem excluir planos com permissão' THEN '✅ Correta'
    ELSE '⚠️ Inesperada'
  END as "Status"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'planos_acao'
ORDER BY cmd, policyname;

-- =====================================================
-- PARTE 6: VERIFICAR PERMISSÕES DOS GRUPOS
-- =====================================================

SELECT 
  ug.name as "Grupo",
  sp.permission_level as "Permissão",
  CASE 
    WHEN sp.permission_level IN ('view', 'edit', 'delete') THEN '✅ Pode visualizar'
    ELSE '❌ Não pode visualizar'
  END as "Status Visualização",
  CASE 
    WHEN sp.permission_level IN ('edit') THEN '✅ Pode criar/editar'
    ELSE '❌ Não pode criar/editar'
  END as "Status Edição"
FROM screen_permissions sp
JOIN user_groups ug ON sp.group_id = ug.id
WHERE sp.screen_key = 'plano_acao'
ORDER BY ug.name;

-- =====================================================
-- PARTE 7: CONTAR PLANOS EXISTENTES
-- =====================================================

DO $$
DECLARE
  v_total_planos INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== PLANOS DE AÇÃO NO BANCO ===';
  
  SELECT COUNT(*) INTO v_total_planos FROM planos_acao;
  RAISE NOTICE 'Total de planos: %', v_total_planos;
  
  IF v_total_planos > 0 THEN
    RAISE NOTICE '✅ Existem planos no banco - devem aparecer na tela após esta correção';
  ELSE
    RAISE NOTICE '⚠️ Nenhum plano no banco - crie um para testar';
  END IF;
END $$;

-- =====================================================
-- LOG FINAL
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Remoção de Duplicatas Concluída';
  RAISE NOTICE '📋 Todas as políticas antigas removidas';
  RAISE NOTICE '🆕 4 políticas corretas criadas';
  RAISE NOTICE '🔧 Sistema pronto para exibir planos';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TESTE AGORA:';
  RAISE NOTICE '1. Faça login como administrador';
  RAISE NOTICE '2. Acesse /admin/plano-acao';
  RAISE NOTICE '3. Os planos DEVEM aparecer!';
  RAISE NOTICE '========================================';
END $$;
