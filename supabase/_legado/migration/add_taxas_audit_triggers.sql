-- =====================================================
-- MIGRAÇÃO: ADICIONAR TRIGGERS DE AUDITORIA PARA TAXAS
-- =====================================================
-- Descrição: Adiciona triggers de auditoria para as tabelas
--            taxas_clientes e taxas_padrao
-- Data: 2025-01-05
-- =====================================================

-- Verificar se a função de auditoria existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'audit_trigger_function'
  ) THEN
    RAISE EXCEPTION 'Função audit_trigger_function não encontrada. Execute primeiro a migração grups_and_profile_migration.sql';
  END IF;
END $$;

-- =====================================================
-- TRIGGERS PARA TAXAS_CLIENTES
-- =====================================================

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS audit_taxas_clientes_trigger ON taxas_clientes;

-- Criar trigger de auditoria para taxas_clientes
CREATE TRIGGER audit_taxas_clientes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON taxas_clientes
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =====================================================
-- TRIGGERS PARA TAXAS_PADRAO
-- =====================================================

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS audit_taxas_padrao_trigger ON taxas_padrao;

-- Criar trigger de auditoria para taxas_padrao
CREATE TRIGGER audit_taxas_padrao_trigger
    AFTER INSERT OR UPDATE OR DELETE ON taxas_padrao
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =====================================================
-- VERIFICAÇÃO E LOG DA MIGRAÇÃO
-- =====================================================

DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  -- Verificar se os triggers foram criados
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname IN ('audit_taxas_clientes_trigger', 'audit_taxas_padrao_trigger');
  
  IF trigger_count = 2 THEN
    RAISE NOTICE '✓ Todos os triggers de auditoria foram criados com sucesso!';
  ELSE
    RAISE WARNING '⚠ Apenas % de 2 triggers foram criados', trigger_count;
  END IF;

  -- Inserir log da migração na tabela de auditoria
  INSERT INTO permission_audit_logs (
    table_name,
    record_id,
    action,
    new_values,
    changed_by
  ) VALUES (
    'system_migrations',
    gen_random_uuid(),
    'INSERT',
    jsonb_build_object(
      'migration_name', 'add_taxas_audit_triggers',
      'description', 'Adicionados triggers de auditoria para taxas_clientes e taxas_padrao',
      'tables_affected', ARRAY['taxas_clientes', 'taxas_padrao'],
      'executed_at', NOW()
    ),
    (SELECT id FROM auth.users LIMIT 1) -- Usar primeiro usuário como executor
  );

  RAISE NOTICE '=== MIGRAÇÃO CONCLUÍDA COM SUCESSO ===';
  RAISE NOTICE 'Os logs de auditoria agora serão registrados automaticamente para:';
  RAISE NOTICE '  - taxas_clientes (criação, edição, exclusão)';
  RAISE NOTICE '  - taxas_padrao (criação, edição, exclusão)';
END $$;
