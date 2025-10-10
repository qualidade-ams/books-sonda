-- =====================================================
-- Corrigir Constraint de Tickets para Lógica Automática
-- =====================================================
-- Remove a constraint antiga que dependia do campo tem_ticket
-- e cria uma nova constraint simplificada para quantidade_tickets
-- =====================================================

-- Remover a constraint antiga que dependia do campo tem_ticket
DO $
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'requerimentos' 
    AND constraint_name = 'check_ticket_consistency'
  ) THEN
    ALTER TABLE requerimentos DROP CONSTRAINT check_ticket_consistency;
    RAISE NOTICE 'Constraint antiga check_ticket_consistency removida';
  ELSE
    RAISE NOTICE 'Constraint check_ticket_consistency não existe - nada a remover';
  END IF;
END $;

-- Remover o campo tem_ticket que não é mais usado
DO $
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'requerimentos' 
    AND column_name = 'tem_ticket'
  ) THEN
    ALTER TABLE requerimentos DROP COLUMN tem_ticket;
    RAISE NOTICE 'Campo tem_ticket removido da tabela requerimentos';
  ELSE
    RAISE NOTICE 'Campo tem_ticket não existe - nada a remover';
  END IF;
END $;

-- Remover o índice do campo tem_ticket
DO $
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'requerimentos' 
    AND indexname = 'idx_requerimentos_tem_ticket'
  ) THEN
    DROP INDEX idx_requerimentos_tem_ticket;
    RAISE NOTICE 'Índice idx_requerimentos_tem_ticket removido';
  ELSE
    RAISE NOTICE 'Índice idx_requerimentos_tem_ticket não existe - nada a remover';
  END IF;
END $;

-- Criar nova constraint simplificada para quantidade_tickets
-- Agora a lógica é: se quantidade_tickets existe, deve ser > 0
ALTER TABLE requerimentos 
ADD CONSTRAINT check_quantidade_tickets_valid 
CHECK (quantidade_tickets IS NULL OR quantidade_tickets > 0);

-- Atualizar comentário do campo quantidade_tickets
COMMENT ON COLUMN requerimentos.quantidade_tickets IS 'Quantidade de tickets (automático para empresas tipo "ticket" quando tipo_cobranca="Banco de Horas")';

-- Criar índice otimizado para quantidade_tickets
CREATE INDEX IF NOT EXISTS idx_requerimentos_quantidade_tickets 
ON requerimentos(quantidade_tickets) 
WHERE quantidade_tickets IS NOT NULL;

-- Log da migração
DO $
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
        'migration', 'fix_ticket_constraint_automatic_logic',
        'constraint_removida', 'check_ticket_consistency',
        'campo_removido', 'tem_ticket',
        'indice_removido', 'idx_requerimentos_tem_ticket',
        'constraint_adicionada', 'check_quantidade_tickets_valid',
        'indice_adicionado', 'idx_requerimentos_quantidade_tickets',
        'logica', 'automatica_baseada_empresa',
        'status', 'SUCCESS'
      ),
      NULL, -- Sistema
      '127.0.0.1'::inet,
      'Database Migration Script - Automatic Ticket Logic'
    );
    RAISE NOTICE 'Log de migração inserido com sucesso';
  ELSE
    RAISE NOTICE 'Tabela permission_audit_logs não existe - log ignorado';
  END IF;
END $;

-- Verificação da migração
DO $
BEGIN
  -- Verificar se o campo tem_ticket foi removido
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'requerimentos' 
    AND column_name = 'tem_ticket'
  ) THEN
    RAISE NOTICE '✅ Campo tem_ticket removido com sucesso';
  ELSE
    RAISE EXCEPTION '❌ Erro: Campo tem_ticket ainda existe';
  END IF;
  
  -- Verificar se a constraint antiga foi removida
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'requerimentos' 
    AND constraint_name = 'check_ticket_consistency'
  ) THEN
    RAISE NOTICE '✅ Constraint antiga check_ticket_consistency removida com sucesso';
  ELSE
    RAISE EXCEPTION '❌ Erro: Constraint antiga ainda existe';
  END IF;
  
  -- Verificar se a nova constraint foi criada
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'requerimentos' 
    AND constraint_name = 'check_quantidade_tickets_valid'
  ) THEN
    RAISE NOTICE '✅ Nova constraint check_quantidade_tickets_valid criada com sucesso';
  ELSE
    RAISE EXCEPTION '❌ Erro: Nova constraint não foi criada';
  END IF;
  
  -- Verificar se o campo quantidade_tickets ainda existe
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'requerimentos' 
    AND column_name = 'quantidade_tickets'
  ) THEN
    RAISE NOTICE '✅ Campo quantidade_tickets mantido com sucesso';
  ELSE
    RAISE EXCEPTION '❌ Erro: Campo quantidade_tickets foi removido incorretamente';
  END IF;
  
  RAISE NOTICE '🎉 Migração de lógica automática de tickets concluída com sucesso!';
  RAISE NOTICE '📋 Agora a lógica de tickets é 100% automática baseada no tipo da empresa';
END $;