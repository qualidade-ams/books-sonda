-- ============================================
-- DESABILITAR RLS - PESQUISAS (TEMPORÁRIO)
-- ============================================
-- Use apenas em desenvolvimento/teste
-- Para produção, configure as políticas corretas

-- Desabilitar RLS na tabela pesquisas
ALTER TABLE pesquisas DISABLE ROW LEVEL SECURITY;

-- Verificar status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'pesquisas';

-- Mensagem
SELECT '✅ RLS desabilitado - Sistema pronto para sincronizar!' as status;
