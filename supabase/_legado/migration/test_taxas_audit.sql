-- =====================================================
-- TESTE: VERIFICAR E CRIAR TRIGGERS DE AUDITORIA
-- =====================================================

-- 1. Verificar se as tabelas existem
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'taxas_clientes') THEN
    RAISE EXCEPTION 'Tabela taxas_clientes não existe!';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'taxas_padrao') THEN
    RAISE EXCEPTION 'Tabela taxas_padrao não existe!';
  END IF;
  
  RAISE NOTICE '✓ Tabelas taxas_clientes e taxas_padrao existem';
END $$;

-- 2. Verificar se a função de auditoria existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'audit_trigger_function') THEN
    RAISE EXCEPTION 'Função audit_trigger_function não existe!';
  END IF;
  
  RAISE NOTICE '✓ Função audit_trigger_function existe';
END $$;

-- 3. Remover triggers existentes
DROP TRIGGER IF EXISTS audit_taxas_clientes_trigger ON taxas_clientes;
DROP TRIGGER IF EXISTS audit_taxas_padrao_trigger ON taxas_padrao;

-- 4. Criar triggers
CREATE TRIGGER audit_taxas_clientes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON taxas_clientes
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_taxas_padrao_trigger
    AFTER INSERT OR UPDATE OR DELETE ON taxas_padrao
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- 5. Verificar se os triggers foram criados
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname IN ('audit_taxas_clientes_trigger', 'audit_taxas_padrao_trigger')
    AND tgrelid IN ('taxas_clientes'::regclass, 'taxas_padrao'::regclass);
  
  IF trigger_count = 2 THEN
    RAISE NOTICE '✓ Ambos os triggers foram criados com sucesso!';
  ELSE
    RAISE WARNING '⚠ Apenas % de 2 triggers foram criados', trigger_count;
  END IF;
END $$;

-- 6. Listar todos os triggers criados
SELECT 
  tgname as "Nome do Trigger",
  tgrelid::regclass as "Tabela",
  CASE tgenabled
    WHEN 'O' THEN 'Ativo'
    WHEN 'D' THEN 'Desabilitado'
    ELSE 'Outro'
  END as "Status"
FROM pg_trigger
WHERE tgname IN ('audit_taxas_clientes_trigger', 'audit_taxas_padrao_trigger')
ORDER BY tgname;
