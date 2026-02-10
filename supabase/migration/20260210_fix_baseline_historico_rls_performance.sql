-- =====================================================
-- Migration: Otimizar Performance RLS - baseline_historico
-- Data: 2026-02-10
-- Descrição: Corrige políticas RLS para melhor performance
--            substituindo auth.uid() por (SELECT auth.uid())
-- =====================================================

-- ⚠️ IMPORTANTE: Sempre remover políticas antigas ANTES de criar novas
-- para evitar duplicação

-- 1. REMOVER todas as políticas antigas
DROP POLICY IF EXISTS "authenticated_select_baseline_historico" ON baseline_historico;
DROP POLICY IF EXISTS "authenticated_insert_baseline_historico" ON baseline_historico;
DROP POLICY IF EXISTS "authenticated_update_baseline_historico" ON baseline_historico;
DROP POLICY IF EXISTS "authenticated_delete_baseline_historico" ON baseline_historico;

-- 2. Garantir que RLS está habilitado
ALTER TABLE baseline_historico ENABLE ROW LEVEL SECURITY;

-- 3. Criar função de verificação de permissões (se não existir)
CREATE OR REPLACE FUNCTION public.user_has_baseline_permission()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se usuário tem permissão para gerenciar baseline
  -- (usuários autenticados com permissão na tela de empresas)
  RETURN EXISTS (
    SELECT 1
    FROM profiles p
    JOIN user_group_assignments uga ON p.id = uga.user_id
    JOIN user_groups ug ON uga.group_id = ug.id
    JOIN screen_permissions sp ON sp.group_id = ug.id
    WHERE p.id = (SELECT auth.uid())
      AND sp.screen_key IN ('empresas_clientes', 'EMPRESAS_CLIENTES')
      AND sp.permission_level IN ('view', 'edit')
  );
END;
$$;

COMMENT ON FUNCTION public.user_has_baseline_permission() IS 
'Verifica se o usuário autenticado tem permissão para gerenciar baseline de empresas.
Usa (SELECT auth.uid()) para melhor performance.';

-- 4. Criar políticas RLS OTIMIZADAS com (SELECT auth.uid())

-- Política SELECT - Usuários autenticados com permissão podem visualizar
CREATE POLICY "authenticated_select_baseline_historico"
  ON baseline_historico
  FOR SELECT
  TO authenticated
  USING (user_has_baseline_permission());

COMMENT ON POLICY "authenticated_select_baseline_historico" ON baseline_historico IS
'Permite visualização de histórico de baseline para usuários com permissão.
Otimizado com função que usa (SELECT auth.uid()).';

-- Política INSERT - Usuários autenticados com permissão podem inserir
CREATE POLICY "authenticated_insert_baseline_historico"
  ON baseline_historico
  FOR INSERT
  TO authenticated
  WITH CHECK (user_has_baseline_permission());

COMMENT ON POLICY "authenticated_insert_baseline_historico" ON baseline_historico IS
'Permite inserção de histórico de baseline para usuários com permissão.
Otimizado com função que usa (SELECT auth.uid()).';

-- Política UPDATE - Usuários autenticados com permissão podem atualizar
CREATE POLICY "authenticated_update_baseline_historico"
  ON baseline_historico
  FOR UPDATE
  TO authenticated
  USING (user_has_baseline_permission())
  WITH CHECK (user_has_baseline_permission());

COMMENT ON POLICY "authenticated_update_baseline_historico" ON baseline_historico IS
'Permite atualização de histórico de baseline para usuários com permissão.
Otimizado com função que usa (SELECT auth.uid()).';

-- Política DELETE - Usuários autenticados com permissão podem deletar
CREATE POLICY "authenticated_delete_baseline_historico"
  ON baseline_historico
  FOR DELETE
  TO authenticated
  USING (user_has_baseline_permission());

COMMENT ON POLICY "authenticated_delete_baseline_historico" ON baseline_historico IS
'Permite exclusão de histórico de baseline para usuários com permissão.
Otimizado com função que usa (SELECT auth.uid()).';

-- 5. Verificar se não há políticas duplicadas
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT tablename, cmd, COUNT(*) as total
    FROM pg_policies 
    WHERE tablename = 'baseline_historico'
    GROUP BY tablename, cmd
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION '❌ ERRO: Políticas duplicadas detectadas!';
  END IF;
  
  RAISE NOTICE '✅ Sem duplicatas - Políticas RLS otimizadas';
END $$;

-- 6. Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Migration concluída com sucesso!';
  RAISE NOTICE '🚀 Políticas RLS otimizadas para baseline_historico:';
  RAISE NOTICE '   - authenticated_select_baseline_historico';
  RAISE NOTICE '   - authenticated_insert_baseline_historico';
  RAISE NOTICE '   - authenticated_update_baseline_historico';
  RAISE NOTICE '   - authenticated_delete_baseline_historico';
  RAISE NOTICE '⚡ Performance melhorada com (SELECT auth.uid())';
END $$;
