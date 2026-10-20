-- Migração para corrigir o tamanho do campo token_acesso
-- O campo estava limitado a VARCHAR(255) mas tokens JWT podem ser maiores

-- Aumentar o tamanho do campo token_acesso para TEXT
ALTER TABLE anexos_temporarios 
ALTER COLUMN token_acesso TYPE TEXT;

-- Comentário atualizado
COMMENT ON COLUMN anexos_temporarios.token_acesso IS 'Token JWT para autenticação de download (sem limite de tamanho)';

-- Log da migração
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'logs_sistema') THEN
    INSERT INTO logs_sistema (
      operacao, 
      detalhes, 
      data_operacao
    ) VALUES (
      'ALTER_TOKEN_ACESSO_SIZE',
      jsonb_build_object(
        'tabela', 'anexos_temporarios',
        'campo', 'token_acesso',
        'tipo_anterior', 'VARCHAR(255)',
        'tipo_novo', 'TEXT',
        'motivo', 'Tokens JWT podem exceder 255 caracteres'
      ),
      NOW()
    );
  END IF;
END $$;