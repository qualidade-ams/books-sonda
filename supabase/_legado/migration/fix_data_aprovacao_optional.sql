-- =====================================================
-- Corrigir campo data_aprovacao para ser opcional
-- =====================================================
-- Remove a constraint NOT NULL do campo data_aprovacao
-- para permitir que seja opcional conforme especificação
-- =====================================================

-- Alterar coluna data_aprovacao para permitir NULL
ALTER TABLE requerimentos 
ALTER COLUMN data_aprovacao DROP NOT NULL;

-- Comentário atualizado
COMMENT ON COLUMN requerimentos.data_aprovacao IS 'Data de aprovação do orçamento (opcional)';

-- Log da migração
DO $$
BEGIN
  -- Tentar inserir log na tabela permission_audit_logs se existir
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permission_audit_logs') THEN
    INSERT INTO permission_audit_logs (
      table_name,
      record_id,
      action,
      new_values,
      changed_by,
      ip_address,
      user_agent
    ) VALUES (
      'requerimentos',
      gen_random_uuid(),
      'UPDATE',
      jsonb_build_object(
        'migration', 'fix_data_aprovacao_optional',
        'campo_alterado', 'data_aprovacao',
        'alteracao', 'Removida constraint NOT NULL - campo agora é opcional',
        'motivo', 'Data de aprovação deve ser opcional conforme especificação do sistema',
        'status', 'SUCCESS'
      ),
      NULL, -- Sistema
      '127.0.0.1'::inet,
      'Database Migration Script'
    );
    RAISE NOTICE 'Log de migração inserido com sucesso';
  ELSE
    RAISE NOTICE 'Tabela permission_audit_logs não existe - log ignorado';
  END IF;
END $$;

-- Verificação da migração
DO $$
BEGIN
  -- Verificar se a coluna permite NULL agora
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'requerimentos' 
    AND column_name = 'data_aprovacao'
    AND is_nullable = 'YES'
  ) THEN
    RAISE NOTICE 'Campo data_aprovacao agora permite NULL (opcional)';
  ELSE
    RAISE EXCEPTION 'Erro: Campo data_aprovacao ainda está como NOT NULL';
  END IF;
  
  RAISE NOTICE 'Migração para tornar data_aprovacao opcional concluída com sucesso!';
END $$;