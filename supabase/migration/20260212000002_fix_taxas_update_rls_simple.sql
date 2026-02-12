-- =====================================================
-- MIGRAÇÃO: Corrigir Política RLS de UPDATE em Taxas (Versão Simplificada)
-- Data: 2026-02-12
-- Descrição: Corrigir problema onde UPDATE não retorna dados
-- =====================================================

-- Remover TODAS as políticas antigas
DROP POLICY IF EXISTS "Authenticated users can view taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Authenticated users can insert taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Authenticated users can update taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Authenticated users can delete taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Usuários podem visualizar taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Usuários podem criar taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Usuários podem atualizar taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Usuários podem deletar taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Usuários podem ver taxas com permissão" ON taxas_clientes;
DROP POLICY IF EXISTS "Usuários podem inserir taxas com permissão" ON taxas_clientes;
DROP POLICY IF EXISTS "Usuários podem atualizar taxas com permissão" ON taxas_clientes;
DROP POLICY IF EXISTS "Usuários podem excluir taxas com permissão" ON taxas_clientes;
DROP POLICY IF EXISTS "taxas_clientes_select_authenticated" ON taxas_clientes;
DROP POLICY IF EXISTS "taxas_clientes_insert_with_permission" ON taxas_clientes;
DROP POLICY IF EXISTS "taxas_clientes_update_with_permission" ON taxas_clientes;
DROP POLICY IF EXISTS "taxas_clientes_delete_with_permission" ON taxas_clientes;
DROP POLICY IF EXISTS "Service role pode visualizar taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Service role pode inserir taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Service role pode atualizar taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Service role pode deletar taxas" ON taxas_clientes;

-- Garantir RLS habilitado
ALTER TABLE taxas_clientes ENABLE ROW LEVEL SECURITY;

-- SELECT: Todos os usuários autenticados podem visualizar
CREATE POLICY "taxas_select_authenticated"
  ON taxas_clientes FOR SELECT TO authenticated
  USING (true);

-- INSERT: Apenas usuários com permissão 'edit' ou 'admin'
CREATE POLICY "taxas_insert_with_permission"
  ON taxas_clientes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_groups ug ON p.group_id = ug.id
      JOIN screen_permissions sp ON sp.group_id = ug.id
      WHERE p.id = (SELECT auth.uid())
        AND sp.screen_key = 'cadastro_taxas_clientes'
        AND sp.permission_level IN ('edit', 'admin')
    )
  );

-- UPDATE: USING e WITH CHECK IDÊNTICOS (crítico para retornar dados)
CREATE POLICY "taxas_update_with_permission"
  ON taxas_clientes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_groups ug ON p.group_id = ug.id
      JOIN screen_permissions sp ON sp.group_id = ug.id
      WHERE p.id = (SELECT auth.uid())
        AND sp.screen_key = 'cadastro_taxas_clientes'
        AND sp.permission_level IN ('edit', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_groups ug ON p.group_id = ug.id
      JOIN screen_permissions sp ON sp.group_id = ug.id
      WHERE p.id = (SELECT auth.uid())
        AND sp.screen_key = 'cadastro_taxas_clientes'
        AND sp.permission_level IN ('edit', 'admin')
    )
  );

-- DELETE: Apenas usuários com permissão 'edit' ou 'admin'
CREATE POLICY "taxas_delete_with_permission"
  ON taxas_clientes FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_groups ug ON p.group_id = ug.id
      JOIN screen_permissions sp ON sp.group_id = ug.id
      WHERE p.id = (SELECT auth.uid())
        AND sp.screen_key = 'cadastro_taxas_clientes'
        AND sp.permission_level IN ('edit', 'admin')
    )
  );

-- Service Role: Acesso total
CREATE POLICY "taxas_service_role_all"
  ON taxas_clientes FOR ALL TO service_role
  USING (true) WITH CHECK (true);
