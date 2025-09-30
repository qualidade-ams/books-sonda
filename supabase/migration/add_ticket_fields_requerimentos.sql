-- =====================================================
-- Adicionar campos de Ticket para Banco de Horas
-- =====================================================
-- Adiciona campos tem_ticket e quantidade_tickets
-- para o tipo de cobrança "Banco de Horas"
-- =====================================================

-- Adicionar campo tem_ticket (flag booleano)
ALTER TABLE requerimentos 
ADD COLUMN IF NOT EXISTS tem_ticket BOOLEAN DEFAULT FALSE;

-- Adicionar campo quantidade_tickets (número inteiro)
ALTER TABLE requerimentos 
ADD COLUMN IF NOT EXISTS quantidade_tickets INTEGER DEFAULT NULL;

-- Comentários nos novos campos
COMMENT ON COLUMN requerimentos.tem_ticket IS 'Indica se o requerimento de Banco de Horas possui tickets';
COMMENT ON COLUMN requerimentos.quantidade_tickets IS 'Quantidade de tickets (apenas para Banco de Horas com tem_ticket=true)';

-- Constraint para garantir que quantidade_tickets só seja preenchida quando tem_ticket=true
ALTER TABLE requerimentos 
ADD CONSTRAINT check_ticket_consistency 
CHECK (
  (tem_ticket = FALSE AND quantidade_tickets IS NULL) OR
  (tem_ticket = TRUE AND quantidade_tickets IS NOT NULL AND quantidade_tickets > 0)
);

-- Índice para consultas por tickets
CREATE INDEX IF NOT EXISTS idx_requerimentos_tem_ticket ON requerimentos(tem_ticket);

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
        'migration', 'add_ticket_fields_requerimentos',
        'campos_adicionados', ARRAY['tem_ticket', 'quantidade_tickets'],
        'constraint_adicionada', 'check_ticket_consistency',
        'indice_criado', 'idx_requerimentos_tem_ticket',
        'tipo_cobranca_afetado', 'Banco de Horas',
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
  -- Verificar se os campos foram adicionados
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'requerimentos' 
    AND column_name IN ('tem_ticket', 'quantidade_tickets')
  ) THEN
    RAISE NOTICE 'Campos de ticket adicionados com sucesso na tabela requerimentos';
  ELSE
    RAISE EXCEPTION 'Erro: Campos de ticket não foram adicionados corretamente';
  END IF;
  
  -- Verificar se a constraint foi criada
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'requerimentos' 
    AND constraint_name = 'check_ticket_consistency'
  ) THEN
    RAISE NOTICE 'Constraint de consistência de tickets criada com sucesso';
  ELSE
    RAISE EXCEPTION 'Erro: Constraint de tickets não foi criada';
  END IF;
  
  RAISE NOTICE 'Migração de campos de ticket concluída com sucesso!';
END $$;