-- =====================================================
-- Migration: Fix RLS - Service Role Access
-- Data: 30/01/2026
-- Descrição: Garantir que service_role tenha acesso total às tabelas de sincronização
-- =====================================================

-- 1. PESQUISAS_SATISFACAO
-- =====================================================

-- Remover todas as políticas existentes para service_role
DROP POLICY IF EXISTS "service_role_all_pesquisas" ON pesquisas_satisfacao;
DROP POLICY IF EXISTS "service_role_all_access" ON pesquisas_satisfacao;
DROP POLICY IF EXISTS "bypass_rls_for_service_role" ON pesquisas_satisfacao;
DROP POLICY IF EXISTS "service_role_full_access_pesquisas" ON pesquisas_satisfacao;

-- Criar política permissiva para service_role (acesso total)
CREATE POLICY "service_role_full_access_pesquisas"
ON pesquisas_satisfacao
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON POLICY "service_role_full_access_pesquisas" ON pesquisas_satisfacao IS
'Service role tem acesso total para sincronização - sem restrições';

-- 2. APONTAMENTOS_TICKETS_ARANDA
-- =====================================================

-- Remover todas as políticas existentes para service_role
DROP POLICY IF EXISTS "service_role_all_tickets" ON apontamentos_tickets_aranda;
DROP POLICY IF EXISTS "service_role_all_access" ON apontamentos_tickets_aranda;
DROP POLICY IF EXISTS "bypass_rls_for_service_role" ON apontamentos_tickets_aranda;
DROP POLICY IF EXISTS "service_role_full_access_tickets" ON apontamentos_tickets_aranda;

-- Criar política permissiva para service_role (acesso total)
CREATE POLICY "service_role_full_access_tickets"
ON apontamentos_tickets_aranda
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON POLICY "service_role_full_access_tickets" ON apontamentos_tickets_aranda IS
'Service role tem acesso total para sincronização - sem restrições';

-- 3. APONTAMENTOS_ARANDA
-- =====================================================

-- Remover todas as políticas existentes para service_role
DROP POLICY IF EXISTS "service_role_all_apontamentos" ON apontamentos_aranda;
DROP POLICY IF EXISTS "service_role_all_access" ON apontamentos_aranda;
DROP POLICY IF EXISTS "bypass_rls_for_service_role" ON apontamentos_aranda;
DROP POLICY IF EXISTS "service_role_full_access_apontamentos" ON apontamentos_aranda;

-- Criar política permissiva para service_role (acesso total)
CREATE POLICY "service_role_full_access_apontamentos"
ON apontamentos_aranda
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON POLICY "service_role_full_access_apontamentos" ON apontamentos_aranda IS
'Service role tem acesso total para sincronização - sem restrições';

-- 4. VALIDAÇÃO
-- =====================================================

DO $$
DECLARE
  v_pesquisas_policy_count INTEGER;
  v_tickets_policy_count INTEGER;
  v_apontamentos_policy_count INTEGER;
BEGIN
  -- Contar políticas para service_role em cada tabela
  SELECT COUNT(*) INTO v_pesquisas_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'pesquisas_satisfacao'
    AND policyname = 'service_role_full_access_pesquisas';
  
  SELECT COUNT(*) INTO v_tickets_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'apontamentos_tickets_aranda'
    AND policyname = 'service_role_full_access_tickets';
  
  SELECT COUNT(*) INTO v_apontamentos_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'apontamentos_aranda'
    AND policyname = 'service_role_full_access_apontamentos';
  
  -- Validar
  IF v_pesquisas_policy_count = 1 AND v_tickets_policy_count = 1 AND v_apontamentos_policy_count = 1 THEN
    RAISE NOTICE '✅ Políticas service_role criadas com sucesso em todas as tabelas';
  ELSE
    RAISE WARNING '⚠️ Problema ao criar políticas:';
    RAISE WARNING '   - pesquisas_satisfacao: % política(s)', v_pesquisas_policy_count;
    RAISE WARNING '   - apontamentos_tickets_aranda: % política(s)', v_tickets_policy_count;
    RAISE WARNING '   - apontamentos_aranda: % política(s)', v_apontamentos_policy_count;
  END IF;
END $$;

-- 5. VERIFICAR RLS HABILITADO
-- =====================================================

DO $$
DECLARE
  v_table RECORD;
BEGIN
  FOR v_table IN 
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('pesquisas_satisfacao', 'apontamentos_tickets_aranda', 'apontamentos_aranda')
  LOOP
    IF v_table.rowsecurity THEN
      RAISE NOTICE '✅ RLS habilitado em: %', v_table.tablename;
    ELSE
      RAISE WARNING '⚠️ RLS DESABILITADO em: %', v_table.tablename;
    END IF;
  END LOOP;
END $$;

-- 6. RELATÓRIO FINAL
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '
╔════════════════════════════════════════════════════════════╗
║  CORREÇÃO RLS - Service Role Access                        ║
╠════════════════════════════════════════════════════════════╣
║  ✅ Política criada: pesquisas_satisfacao                  ║
║  ✅ Política criada: apontamentos_tickets_aranda           ║
║  ✅ Política criada: apontamentos_aranda                   ║
║  ✅ Service role tem acesso total (USING true)             ║
║  ✅ Sincronização deve funcionar sem erros RLS             ║
╚════════════════════════════════════════════════════════════╝
  ';
END $$;
