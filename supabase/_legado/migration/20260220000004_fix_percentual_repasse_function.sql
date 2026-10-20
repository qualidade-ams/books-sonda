-- Migration: Corrigir função de verificação de permissão
-- Data: 2026-02-20
-- Descrição: Corrige a função user_can_access_percentual_repasse_historico para usar user_group_assignments

-- =====================================================
-- PASSO 1: REMOVER POLÍTICAS RLS (que dependem da função)
-- =====================================================

-- Remover políticas antigas ANTES de dropar a função
DROP POLICY IF EXISTS "authenticated_select_percentual_repasse_historico" ON percentual_repasse_historico;
DROP POLICY IF EXISTS "authenticated_insert_percentual_repasse_historico" ON percentual_repasse_historico;
DROP POLICY IF EXISTS "authenticated_update_percentual_repasse_historico" ON percentual_repasse_historico;
DROP POLICY IF EXISTS "authenticated_delete_percentual_repasse_historico" ON percentual_repasse_historico;

-- =====================================================
-- PASSO 2: DROPAR E RECRIAR FUNÇÃO CORRIGIDA
-- =====================================================

DROP FUNCTION IF EXISTS user_can_access_percentual_repasse_historico();

CREATE OR REPLACE FUNCTION user_can_access_percentual_repasse_historico()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles p
    JOIN user_group_assignments uga ON p.id = uga.user_id
    JOIN user_groups ug ON uga.group_id = ug.id
    JOIN screen_permissions sp ON sp.group_id = ug.id
    WHERE p.id = (SELECT auth.uid())
      AND sp.screen_key IN ('cadastro_empresas', 'controle_banco_horas', 'admin')
      AND sp.permission_level IN ('view', 'edit')
  );
END;
$$;

COMMENT ON FUNCTION user_can_access_percentual_repasse_historico IS 
'Verifica se usuário tem permissão para acessar histórico de percentual de repasse. 
Usa caminho correto: profiles → user_group_assignments → user_groups → screen_permissions';

-- =====================================================
-- PASSO 3: VERIFICAR SE A CORREÇÃO FUNCIONOU
-- =====================================================

DO $$
BEGIN
  -- Testar a função
  IF user_can_access_percentual_repasse_historico() THEN
    RAISE NOTICE '✅ Função corrigida com sucesso! Você tem permissão de acesso.';
  ELSE
    RAISE WARNING '⚠️ Função corrigida, mas você não tem permissão. Verifique se seu grupo tem acesso às telas: cadastro_empresas, controle_banco_horas ou admin';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ Erro ao testar função: %', SQLERRM;
END $$;

-- =====================================================
-- PASSO 4: RECRIAR POLÍTICAS RLS
-- =====================================================

-- Política SELECT: Usuários autenticados com permissão podem visualizar
CREATE POLICY "authenticated_select_percentual_repasse_historico"
  ON percentual_repasse_historico FOR SELECT
  TO authenticated
  USING (user_can_access_percentual_repasse_historico());

-- Política INSERT: Usuários autenticados com permissão podem inserir
CREATE POLICY "authenticated_insert_percentual_repasse_historico"
  ON percentual_repasse_historico FOR INSERT
  TO authenticated
  WITH CHECK (user_can_access_percentual_repasse_historico());

-- Política UPDATE: Usuários autenticados com permissão podem atualizar
CREATE POLICY "authenticated_update_percentual_repasse_historico"
  ON percentual_repasse_historico FOR UPDATE
  TO authenticated
  USING (user_can_access_percentual_repasse_historico());

-- Política DELETE: Usuários autenticados com permissão podem deletar
CREATE POLICY "authenticated_delete_percentual_repasse_historico"
  ON percentual_repasse_historico FOR DELETE
  TO authenticated
  USING (user_can_access_percentual_repasse_historico());

-- =====================================================
-- PASSO 5: VERIFICAÇÃO FINAL
-- =====================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'percentual_repasse_historico';
  
  IF policy_count = 4 THEN
    RAISE NOTICE '✅ Políticas RLS recriadas com sucesso! Total: % políticas', policy_count;
  ELSE
    RAISE WARNING '⚠️ Esperado 4 políticas, encontrado: %', policy_count;
  END IF;
END $$;

-- =====================================================
-- LOG DE CONCLUSÃO
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Correção concluída com sucesso!';
  RAISE NOTICE '📝 Função user_can_access_percentual_repasse_historico() corrigida';
  RAISE NOTICE '🔒 Políticas RLS recriadas (4 políticas)';
  RAISE NOTICE '🧪 Teste a funcionalidade abrindo a aba "Parâmetros Book" no formulário de empresas';
END $$;
