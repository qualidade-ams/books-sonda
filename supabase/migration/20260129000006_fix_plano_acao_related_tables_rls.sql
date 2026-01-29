-- =====================================================
-- Migration: Correção de Permissões RLS - Tabelas Relacionadas ao Plano de Ação
-- Data: 2026-01-29
-- Descrição: Corrige políticas RLS de plano_acao_historico e plano_acao_contatos
-- =====================================================

-- =====================================================
-- PROBLEMA IDENTIFICADO
-- =====================================================
-- 1. plano_acao_historico: Política SELECT muito restritiva
-- 2. plano_acao_contatos: Políticas verificando permissão 'create' inexistente

-- =====================================================
-- PARTE 1: Corrigir plano_acao_historico
-- =====================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Usuários autenticados podem ler histórico" ON plano_acao_historico;
DROP POLICY IF EXISTS "Usuários autenticados podem criar histórico" ON plano_acao_historico;
DROP POLICY IF EXISTS "Sistema pode inserir histórico de planos" ON plano_acao_historico;

-- Criar políticas corretas
CREATE POLICY "Usuários podem ver histórico com permissão" ON plano_acao_historico
  AS PERMISSIVE
  FOR SELECT 
  USING (
    has_screen_permission('plano_acao', 'view') OR
    has_screen_permission('plano_acao', 'edit') OR
    has_screen_permission('plano_acao', 'delete')
  );

CREATE POLICY "Sistema pode inserir histórico" ON plano_acao_historico
  AS PERMISSIVE
  FOR INSERT 
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

COMMENT ON POLICY "Usuários podem ver histórico com permissão" ON plano_acao_historico IS 
'Política flexível: usuários com permissão view, edit ou delete podem visualizar histórico';

COMMENT ON POLICY "Sistema pode inserir histórico" ON plano_acao_historico IS 
'Política automática: triggers do sistema podem inserir histórico para usuários autenticados';

-- =====================================================
-- PARTE 2: Corrigir plano_acao_contatos
-- =====================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Usuários podem ver contatos dos planos" ON plano_acao_contatos;
DROP POLICY IF EXISTS "Usuários podem inserir contatos" ON plano_acao_contatos;
DROP POLICY IF EXISTS "Usuários podem atualizar contatos" ON plano_acao_contatos;
DROP POLICY IF EXISTS "Usuários podem deletar contatos" ON plano_acao_contatos;
DROP POLICY IF EXISTS "Usuários podem ver contatos de plano com permissão" ON plano_acao_contatos;
DROP POLICY IF EXISTS "Usuários podem inserir contatos de plano com permissão" ON plano_acao_contatos;
DROP POLICY IF EXISTS "Usuários podem atualizar contatos de plano com permissão" ON plano_acao_contatos;
DROP POLICY IF EXISTS "Usuários podem excluir contatos de plano com permissão" ON plano_acao_contatos;

-- Criar políticas corretas
CREATE POLICY "Usuários podem ver contatos com permissão" ON plano_acao_contatos
  AS PERMISSIVE
  FOR SELECT 
  USING (
    has_screen_permission('plano_acao', 'view') OR
    has_screen_permission('plano_acao', 'edit') OR
    has_screen_permission('plano_acao', 'delete')
  );

CREATE POLICY "Usuários podem inserir contatos com permissão" ON plano_acao_contatos
  AS PERMISSIVE
  FOR INSERT 
  WITH CHECK (
    has_screen_permission('plano_acao', 'edit')
  );

CREATE POLICY "Usuários podem atualizar contatos com permissão" ON plano_acao_contatos
  AS PERMISSIVE
  FOR UPDATE 
  USING (
    has_screen_permission('plano_acao', 'edit')
  )
  WITH CHECK (
    has_screen_permission('plano_acao', 'edit')
  );

CREATE POLICY "Usuários podem excluir contatos com permissão" ON plano_acao_contatos
  AS PERMISSIVE
  FOR DELETE 
  USING (
    has_screen_permission('plano_acao', 'delete')
  );

-- Adicionar comentários
COMMENT ON POLICY "Usuários podem ver contatos com permissão" ON plano_acao_contatos IS 
'Política flexível: usuários com permissão view, edit ou delete podem visualizar contatos';

COMMENT ON POLICY "Usuários podem inserir contatos com permissão" ON plano_acao_contatos IS 
'Política corrigida: usuários com permissão edit podem criar contatos';

COMMENT ON POLICY "Usuários podem atualizar contatos com permissão" ON plano_acao_contatos IS 
'Política corrigida: usuários com permissão edit podem atualizar contatos';

COMMENT ON POLICY "Usuários podem excluir contatos com permissão" ON plano_acao_contatos IS 
'Política restritiva: apenas usuários com permissão delete podem excluir contatos';

-- =====================================================
-- PARTE 3: VERIFICAÇÃO
-- =====================================================

DO $$
DECLARE
  v_historico_select INTEGER;
  v_historico_insert INTEGER;
  v_contatos_select INTEGER;
  v_contatos_insert INTEGER;
  v_contatos_update INTEGER;
  v_contatos_delete INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICAÇÃO: Políticas RLS ===';
  
  -- Verificar plano_acao_historico
  SELECT COUNT(*) INTO v_historico_select
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'plano_acao_historico'
  AND cmd = 'SELECT';
  
  SELECT COUNT(*) INTO v_historico_insert
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'plano_acao_historico'
  AND cmd = 'INSERT';
  
  RAISE NOTICE '';
  RAISE NOTICE '📋 plano_acao_historico:';
  RAISE NOTICE '  SELECT: % (esperado: 1)', v_historico_select;
  RAISE NOTICE '  INSERT: % (esperado: 1)', v_historico_insert;
  
  IF v_historico_select = 1 AND v_historico_insert = 1 THEN
    RAISE NOTICE '  ✅ OK';
  ELSE
    RAISE WARNING '  ⚠️ Políticas incorretas!';
  END IF;
  
  -- Verificar plano_acao_contatos
  SELECT COUNT(*) INTO v_contatos_select
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'plano_acao_contatos'
  AND cmd = 'SELECT';
  
  SELECT COUNT(*) INTO v_contatos_insert
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'plano_acao_contatos'
  AND cmd = 'INSERT';
  
  SELECT COUNT(*) INTO v_contatos_update
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'plano_acao_contatos'
  AND cmd = 'UPDATE';
  
  SELECT COUNT(*) INTO v_contatos_delete
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'plano_acao_contatos'
  AND cmd = 'DELETE';
  
  RAISE NOTICE '';
  RAISE NOTICE '📋 plano_acao_contatos:';
  RAISE NOTICE '  SELECT: % (esperado: 1)', v_contatos_select;
  RAISE NOTICE '  INSERT: % (esperado: 1)', v_contatos_insert;
  RAISE NOTICE '  UPDATE: % (esperado: 1)', v_contatos_update;
  RAISE NOTICE '  DELETE: % (esperado: 1)', v_contatos_delete;
  
  IF v_contatos_select = 1 AND v_contatos_insert = 1 AND v_contatos_update = 1 AND v_contatos_delete = 1 THEN
    RAISE NOTICE '  ✅ OK';
  ELSE
    RAISE WARNING '  ⚠️ Políticas incorretas!';
  END IF;
END $$;

-- =====================================================
-- PARTE 4: LISTAR POLÍTICAS
-- =====================================================

-- Listar políticas de plano_acao_historico
SELECT 
  'plano_acao_historico' as tabela,
  policyname as "Nome da Política",
  cmd as "Ação"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'plano_acao_historico'
ORDER BY cmd;

-- Listar políticas de plano_acao_contatos
SELECT 
  'plano_acao_contatos' as tabela,
  policyname as "Nome da Política",
  cmd as "Ação"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'plano_acao_contatos'
ORDER BY cmd;

-- =====================================================
-- LOG FINAL
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Correção de Tabelas Relacionadas Concluída';
  RAISE NOTICE '📋 plano_acao_historico: 2 políticas';
  RAISE NOTICE '📋 plano_acao_contatos: 4 políticas';
  RAISE NOTICE '🔧 Sistema pronto para usar';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TESTE:';
  RAISE NOTICE '1. Visualize detalhes de um plano';
  RAISE NOTICE '2. Adicione um contato';
  RAISE NOTICE '3. Verifique o histórico';
  RAISE NOTICE '========================================';
END $$;
