-- Migration: Correção TEMPORÁRIA - Permite acesso a todos autenticados
-- Data: 2026-02-05
-- Descrição: Solução temporária enquanto descobrimos a estrutura de grupos
-- ⚠️ ATENÇÃO: Esta migration permite acesso a TODOS os usuários autenticados
-- ⚠️ Substitua por uma migration com verificação de permissões assim que possível

-- ============================================================================
-- PASSO 1: REMOVER TODAS AS POLÍTICAS ANTIGAS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can insert own banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can update own banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can delete own banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Authenticated users can view banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Authenticated users can insert banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Authenticated users can update banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Authenticated users can delete banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Service role can manage banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "authenticated_select_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "authenticated_insert_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "authenticated_update_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "authenticated_delete_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "service_role_all_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can view calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can insert calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can update calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "Users can delete calculos" ON banco_horas_calculos;

-- ============================================================================
-- PASSO 2: GARANTIR QUE RLS ESTÁ HABILITADO
-- ============================================================================

ALTER TABLE banco_horas_calculos ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASSO 3: REMOVER FUNÇÃO ANTIGA (se existir)
-- ============================================================================

DROP FUNCTION IF EXISTS public.user_has_banco_horas_permission();

-- ============================================================================
-- PASSO 4: CRIAR POLÍTICAS TEMPORÁRIAS (acesso total para authenticated)
-- ============================================================================

-- ⚠️ TEMPORÁRIO: Permite SELECT para todos os usuários autenticados
CREATE POLICY "temp_authenticated_select_banco_horas_calculos"
  ON banco_horas_calculos
  FOR SELECT
  TO authenticated
  USING (true);

-- ⚠️ TEMPORÁRIO: Permite INSERT para todos os usuários autenticados
CREATE POLICY "temp_authenticated_insert_banco_horas_calculos"
  ON banco_horas_calculos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ⚠️ TEMPORÁRIO: Permite UPDATE para todos os usuários autenticados
CREATE POLICY "temp_authenticated_update_banco_horas_calculos"
  ON banco_horas_calculos
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ⚠️ TEMPORÁRIO: Permite DELETE para todos os usuários autenticados
CREATE POLICY "temp_authenticated_delete_banco_horas_calculos"
  ON banco_horas_calculos
  FOR DELETE
  TO authenticated
  USING (true);

-- Service role: Acesso total (bypass RLS)
CREATE POLICY "service_role_all_banco_horas_calculos"
  ON banco_horas_calculos
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PASSO 5: VERIFICAR DUPLICATAS
-- ============================================================================

DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT tablename, cmd, COUNT(*) as total
    FROM pg_policies 
    WHERE tablename = 'banco_horas_calculos'
    GROUP BY tablename, cmd
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION '❌ ERRO: Políticas duplicadas!';
  END IF;
  
  RAISE NOTICE '✅ Políticas temporárias criadas (5 políticas)';
END $$;

-- ============================================================================
-- RESUMO E AVISOS
-- ============================================================================

DO $$
BEGIN
  RAISE WARNING '
╔════════════════════════════════════════════════════════════════╗
║  ⚠️  MIGRATION TEMPORÁRIA APLICADA                             ║
╠════════════════════════════════════════════════════════════════╣
║  ✅ Políticas antigas removidas                                ║
║  ✅ RLS habilitado                                             ║
║  ⚠️  TODOS os usuários autenticados têm acesso total           ║
║  ⚠️  Substitua por políticas com verificação de permissões     ║
║                                                                 ║
║  PRÓXIMOS PASSOS:                                              ║
║  1. Execute DIAGNOSTICO_relacionamento_usuario_grupo.sql       ║
║  2. Descubra como usuários se relacionam com grupos            ║
║  3. Crie migration definitiva com verificação de permissões    ║
╚════════════════════════════════════════════════════════════════╝
  ';
END $$;

-- ============================================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON POLICY "temp_authenticated_select_banco_horas_calculos" ON banco_horas_calculos IS 
  '⚠️ TEMPORÁRIO: Permite SELECT para todos autenticados. Substituir por política com verificação de permissões.';

COMMENT ON POLICY "temp_authenticated_insert_banco_horas_calculos" ON banco_horas_calculos IS 
  '⚠️ TEMPORÁRIO: Permite INSERT para todos autenticados. Substituir por política com verificação de permissões.';

COMMENT ON POLICY "temp_authenticated_update_banco_horas_calculos" ON banco_horas_calculos IS 
  '⚠️ TEMPORÁRIO: Permite UPDATE para todos autenticados. Substituir por política com verificação de permissões.';

COMMENT ON POLICY "temp_authenticated_delete_banco_horas_calculos" ON banco_horas_calculos IS 
  '⚠️ TEMPORÁRIO: Permite DELETE para todos autenticados. Substituir por política com verificação de permissões.';

COMMENT ON POLICY "service_role_all_banco_horas_calculos" ON banco_horas_calculos IS 
  'Permite que service_role tenha acesso total (bypass RLS)';
