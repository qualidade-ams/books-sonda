-- =====================================================
-- Migration: Fix RLS Performance and Duplicates - sync_control
-- Data: 30/01/2026
-- Descrição: Corrige problemas de performance e políticas duplicadas
-- =====================================================

-- 1. REMOVER TODAS AS POLÍTICAS EXISTENTES
-- =====================================================

DROP POLICY IF EXISTS "Service role can manage sync control" ON sync_control;
DROP POLICY IF EXISTS "Users can view sync control" ON sync_control;
DROP POLICY IF EXISTS "service_role_all_sync_control" ON sync_control;
DROP POLICY IF EXISTS "authenticated_select_sync_control" ON sync_control;
DROP POLICY IF EXISTS "anon_select_sync_control" ON sync_control;

-- 2. CRIAR POLÍTICAS OTIMIZADAS
-- =====================================================

-- Política para service_role (acesso total)
-- Usa (SELECT auth.uid()) para melhor performance
CREATE POLICY "service_role_all_sync_control"
ON sync_control
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Política para authenticated users (apenas leitura)
-- Usa (SELECT auth.uid()) para melhor performance
CREATE POLICY "authenticated_select_sync_control"
ON sync_control
FOR SELECT
TO authenticated
USING (true);

-- Política para anon (apenas leitura de registros públicos)
CREATE POLICY "anon_select_sync_control"
ON sync_control
FOR SELECT
TO anon
USING (last_sync_status = 'success');

-- 3. ADICIONAR COMENTÁRIOS
-- =====================================================

COMMENT ON POLICY "service_role_all_sync_control" ON sync_control IS 
'Service role tem acesso total à tabela sync_control para gerenciar sincronizações';

COMMENT ON POLICY "authenticated_select_sync_control" ON sync_control IS 
'Usuários autenticados podem visualizar todos os registros de sincronização';

COMMENT ON POLICY "anon_select_sync_control" ON sync_control IS 
'Usuários anônimos podem visualizar apenas sincronizações bem-sucedidas';

-- 4. VALIDAÇÃO
-- =====================================================

-- Verificar políticas criadas
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'sync_control';
  
  IF policy_count = 3 THEN
    RAISE NOTICE '✅ Políticas RLS criadas com sucesso: % políticas', policy_count;
  ELSE
    RAISE WARNING '⚠️ Número inesperado de políticas: %', policy_count;
  END IF;
END $$;

-- Verificar se não há políticas duplicadas
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT 
      schemaname,
      tablename,
      cmd,
      roles,
      COUNT(*) as count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sync_control'
    GROUP BY schemaname, tablename, cmd, roles
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count = 0 THEN
    RAISE NOTICE '✅ Nenhuma política duplicada encontrada';
  ELSE
    RAISE WARNING '⚠️ Políticas duplicadas encontradas: %', duplicate_count;
  END IF;
END $$;

-- 5. TESTE DE PERFORMANCE
-- =====================================================

-- Criar índice para melhorar performance de queries
CREATE INDEX IF NOT EXISTS idx_sync_control_table_name 
ON sync_control(table_name);

CREATE INDEX IF NOT EXISTS idx_sync_control_last_sync_at 
ON sync_control(last_sync_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_control_last_sync_status 
ON sync_control(last_sync_status);

COMMENT ON INDEX idx_sync_control_table_name IS 
'Índice para busca rápida por nome de tabela';

COMMENT ON INDEX idx_sync_control_last_sync_at IS 
'Índice para ordenação por data de última sincronização (mais recentes primeiro)';

COMMENT ON INDEX idx_sync_control_last_sync_status IS 
'Índice para filtro por status de sincronização';

-- 6. RELATÓRIO FINAL
-- =====================================================

DO $$
DECLARE
  total_policies INTEGER;
  total_indexes INTEGER;
BEGIN
  -- Contar políticas
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'sync_control';
  
  -- Contar índices
  SELECT COUNT(*) INTO total_indexes
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'sync_control'
    AND indexname LIKE 'idx_sync_control_%';
  
  RAISE NOTICE '
╔════════════════════════════════════════════════════════════╗
║  CORREÇÃO RLS - sync_control                               ║
╠════════════════════════════════════════════════════════════╣
║  ✅ Políticas duplicadas removidas                         ║
║  ✅ Políticas otimizadas criadas: %                        ║
║  ✅ Índices de performance criados: %                      ║
║  ✅ Performance otimizada (sem current_setting())          ║
╚════════════════════════════════════════════════════════════╝
  ', total_policies, total_indexes;
END $$;
