-- =====================================================
-- FIX: TRIGGERS DE AUDITORIA PARA TAXAS
-- =====================================================
-- Cria triggers de auditoria funcionais para taxas
-- =====================================================

-- Remover triggers antigos
DROP TRIGGER IF EXISTS audit_taxas_clientes_trigger ON taxas_clientes;
DROP TRIGGER IF EXISTS audit_taxas_padrao_trigger ON taxas_padrao;

-- Criar função específica para auditoria de taxas (se a genérica não funcionar)
CREATE OR REPLACE FUNCTION audit_taxas_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Obter ID do usuário atual
  current_user_id := auth.uid();
  
  -- Se não houver usuário autenticado, usar NULL
  IF current_user_id IS NULL THEN
    current_user_id := NULL;
  END IF;
  
  -- Registrar a operação
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO permission_audit_logs (
      table_name,
      record_id,
      action,
      old_values,
      changed_by
    ) VALUES (
      TG_TABLE_NAME,
      OLD.id,
      'DELETE',
      to_jsonb(OLD),
      current_user_id
    );
    RETURN OLD;
    
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO permission_audit_logs (
      table_name,
      record_id,
      action,
      old_values,
      new_values,
      changed_by
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'UPDATE',
      to_jsonb(OLD),
      to_jsonb(NEW),
      current_user_id
    );
    RETURN NEW;
    
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO permission_audit_logs (
      table_name,
      record_id,
      action,
      new_values,
      changed_by
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'INSERT',
      to_jsonb(NEW),
      current_user_id
    );
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar triggers usando a função específica
CREATE TRIGGER audit_taxas_clientes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON taxas_clientes
  FOR EACH ROW EXECUTE FUNCTION audit_taxas_trigger_function();

CREATE TRIGGER audit_taxas_padrao_trigger
  AFTER INSERT OR UPDATE OR DELETE ON taxas_padrao
  FOR EACH ROW EXECUTE FUNCTION audit_taxas_trigger_function();

-- Verificação
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname IN ('audit_taxas_clientes_trigger', 'audit_taxas_padrao_trigger');
  
  RAISE NOTICE '=== TRIGGERS CRIADOS: % ===', trigger_count;
  
  IF trigger_count = 2 THEN
    RAISE NOTICE '✓ Triggers de auditoria criados com sucesso!';
    RAISE NOTICE 'Agora crie/edite uma taxa para testar';
  ELSE
    RAISE WARNING '⚠ Problema ao criar triggers';
  END IF;
END $$;
