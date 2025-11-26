-- ============================================
-- CORREÇÃO DE RLS - PESQUISAS
-- ============================================
-- Erro 42501: new row violates row-level security policy
-- 
-- Este script desabilita RLS temporariamente para desenvolvimento
-- ou cria políticas para service_role

-- OPÇÃO 1: Desabilitar RLS (DESENVOLVIMENTO)
-- Descomente a linha abaixo para desabilitar RLS
ALTER TABLE pesquisas DISABLE ROW LEVEL SECURITY;

-- OPÇÃO 2: Criar políticas para service_role (PRODUÇÃO)
-- Descomente as linhas abaixo para usar políticas RLS

-- -- Remover políticas antigas se existirem
-- DROP POLICY IF EXISTS "service_role_all_pesquisas" ON pesquisas;
-- DROP POLICY IF EXISTS "service_role_insert_pesquisas" ON pesquisas;
-- DROP POLICY IF EXISTS "service_role_update_pesquisas" ON pesquisas;
-- DROP POLICY IF EXISTS "service_role_select_pesquisas" ON pesquisas;
-- DROP POLICY IF EXISTS "service_role_delete_pesquisas" ON pesquisas;

-- -- Criar política única para todas as operações
-- CREATE POLICY "service_role_all_pesquisas" ON pesquisas
-- FOR ALL
-- TO service_role
-- USING (true)
-- WITH CHECK (true);

-- Verificar status do RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'pesquisas';

-- Verificar políticas existentes
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'pesquisas';

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE 'Configuração de RLS atualizada!';
  RAISE NOTICE 'RLS foi DESABILITADO para desenvolvimento';
  RAISE NOTICE 'Para produção, habilite RLS e use as políticas comentadas';
END $$;
