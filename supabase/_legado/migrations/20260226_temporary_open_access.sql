-- Migration TEMPORÁRIA: Acesso aberto para authenticated users
-- Data: 2026-02-26
-- Descrição: Remove verificação de permissão temporariamente para permitir uso do sistema
-- ⚠️ ATENÇÃO: Esta é uma solução temporária. Depois de descobrir a estrutura correta
--             da tabela profiles, execute a migration correta de permissões.

-- Remover políticas antigas
DROP POLICY IF EXISTS "authenticated_select_organizacao" ON public.organizacao_estrutura;
DROP POLICY IF EXISTS "authenticated_insert_organizacao" ON public.organizacao_estrutura;
DROP POLICY IF EXISTS "authenticated_update_organizacao" ON public.organizacao_estrutura;
DROP POLICY IF EXISTS "authenticated_delete_organizacao" ON public.organizacao_estrutura;

-- Criar políticas temporárias (acesso para todos authenticated)
CREATE POLICY "temp_authenticated_select_organizacao"
  ON public.organizacao_estrutura FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "temp_authenticated_insert_organizacao"
  ON public.organizacao_estrutura FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "temp_authenticated_update_organizacao"
  ON public.organizacao_estrutura FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "temp_authenticated_delete_organizacao"
  ON public.organizacao_estrutura FOR DELETE
  TO authenticated
  USING (true);

-- Mensagem de aviso
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '⚠️  POLÍTICAS TEMPORÁRIAS ATIVADAS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'ATENÇÃO: Todos os usuários autenticados';
  RAISE NOTICE 'têm acesso total ao organograma.';
  RAISE NOTICE '';
  RAISE NOTICE 'Para restaurar segurança:';
  RAISE NOTICE '1. Execute: 20260226_discover_profiles_structure.sql';
  RAISE NOTICE '2. Identifique a coluna correta de grupo';
  RAISE NOTICE '3. Atualize a função user_has_organograma_permission';
  RAISE NOTICE '4. Execute: 20260226_fix_organizacao_rls.sql';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
