-- =====================================================
-- ADICIONAR TRIGGERS DE AUDITORIA PARA VALORES DE TAXAS
-- =====================================================
-- Adiciona triggers para registrar alterações nos valores
-- das taxas (tabela valores_taxas_funcoes)
-- =====================================================

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS audit_valores_taxas_funcoes_trigger ON valores_taxas_funcoes;

-- Criar trigger de auditoria para valores_taxas_funcoes
CREATE TRIGGER audit_valores_taxas_funcoes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON valores_taxas_funcoes
  FOR EACH ROW EXECUTE FUNCTION audit_taxas_trigger_function();

-- Verificação
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'audit_valores_taxas_funcoes_trigger'
  ) THEN
    RAISE NOTICE '✓ Trigger de auditoria criado para valores_taxas_funcoes';
  ELSE
    RAISE WARNING '⚠ Falha ao criar trigger';
  END IF;
END $$;
