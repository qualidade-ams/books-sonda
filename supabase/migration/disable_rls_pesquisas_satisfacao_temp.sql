-- =====================================================
-- SOLUÇÃO TEMPORÁRIA: Desabilitar RLS
-- =====================================================
-- Use apenas para desenvolvimento/teste
-- Para produção, configure as políticas corretas
-- =====================================================

-- Desabilitar RLS na tabela pesquisas_satisfacao
ALTER TABLE pesquisas_satisfacao DISABLE ROW LEVEL SECURITY;

-- Verificar status
DO $$
DECLARE
  v_rls_enabled BOOLEAN;
BEGIN
  SELECT rowsecurity INTO v_rls_enabled
  FROM pg_tables 
  WHERE tablename = 'pesquisas_satisfacao';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STATUS RLS - pesquisas_satisfacao';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS Habilitado: %', CASE WHEN v_rls_enabled THEN 'SIM' ELSE 'NÃO' END;
  RAISE NOTICE '========================================';
  
  IF NOT v_rls_enabled THEN
    RAISE NOTICE '✓ RLS desabilitado com sucesso';
    RAISE NOTICE '✓ API pode inserir dados livremente';
    RAISE WARNING '⚠ ATENÇÃO: Esta é uma solução temporária';
    RAISE WARNING '⚠ Para produção, configure políticas RLS adequadas';
  END IF;
END $$;
