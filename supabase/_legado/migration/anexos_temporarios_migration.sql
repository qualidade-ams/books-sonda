-- Migração para criar tabela anexos_temporarios
-- Sistema de Anexos para Disparos Personalizados

-- Criar tabela anexos_temporarios
CREATE TABLE IF NOT EXISTS anexos_temporarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas_clientes(id) ON DELETE CASCADE,
  nome_original VARCHAR(255) NOT NULL,
  nome_arquivo VARCHAR(255) NOT NULL,
  tipo_mime VARCHAR(100) NOT NULL,
  tamanho_bytes INTEGER NOT NULL,
  url_temporaria TEXT NOT NULL,
  url_permanente TEXT,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviando', 'processado', 'erro')),
  token_acesso VARCHAR(255) NOT NULL,
  data_upload TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_expiracao TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours',
  data_processamento TIMESTAMP WITH TIME ZONE,
  erro_detalhes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_anexos_temporarios_empresa_id ON anexos_temporarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_anexos_temporarios_status ON anexos_temporarios(status);
CREATE INDEX IF NOT EXISTS idx_anexos_temporarios_data_expiracao ON anexos_temporarios(data_expiracao);
CREATE INDEX IF NOT EXISTS idx_anexos_temporarios_data_upload ON anexos_temporarios(data_upload);
CREATE INDEX IF NOT EXISTS idx_anexos_temporarios_empresa_status ON anexos_temporarios(empresa_id, status);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_anexos_temporarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_anexos_temporarios_updated_at
  BEFORE UPDATE ON anexos_temporarios
  FOR EACH ROW
  EXECUTE FUNCTION update_anexos_temporarios_updated_at();

-- Função para limpeza automática de registros expirados
DROP FUNCTION IF EXISTS limpar_anexos_expirados();
CREATE OR REPLACE FUNCTION limpar_anexos_expirados()
RETURNS INTEGER AS $$
DECLARE
  registros_removidos INTEGER;
BEGIN
  -- Remove anexos expirados (mais de 24 horas)
  DELETE FROM anexos_temporarios 
  WHERE data_expiracao < NOW() 
    AND status IN ('pendente', 'erro');
  
  GET DIAGNOSTICS registros_removidos = ROW_COUNT;
  
  -- Log da operação de limpeza
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'logs_sistema') THEN
    INSERT INTO logs_sistema (
      operacao, 
      detalhes, 
      data_operacao
    ) VALUES (
      'CLEANUP_ANEXOS_TEMPORARIOS',
      jsonb_build_object(
        'registros_removidos', registros_removidos,
        'tipo_operacao', 'limpeza_automatica',
        'tabela', 'anexos_temporarios'
      ),
      NOW()
    );
  END IF;
  
  RETURN registros_removidos;
END;
$$ LANGUAGE plpgsql;

-- Função para validar limite de 25MB por empresa
DROP FUNCTION IF EXISTS validar_limite_anexos_empresa(UUID, INTEGER);
CREATE OR REPLACE FUNCTION validar_limite_anexos_empresa(p_empresa_id UUID, p_tamanho_novo INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  tamanho_atual BIGINT;
  limite_maximo CONSTANT INTEGER := 26214400; -- 25MB em bytes
BEGIN
  -- Calcula o tamanho total atual dos anexos pendentes da empresa
  SELECT COALESCE(SUM(tamanho_bytes), 0)
  INTO tamanho_atual
  FROM anexos_temporarios
  WHERE empresa_id = p_empresa_id
    AND status = 'pendente';
  
  -- Verifica se o novo arquivo excederia o limite
  RETURN (tamanho_atual + p_tamanho_novo) <= limite_maximo;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar limite antes de inserir
CREATE OR REPLACE FUNCTION trigger_validar_limite_anexos()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT validar_limite_anexos_empresa(NEW.empresa_id, NEW.tamanho_bytes) THEN
    RAISE EXCEPTION 'Limite de 25MB por empresa excedido. Tamanho atual + novo arquivo: % bytes', 
      (SELECT COALESCE(SUM(tamanho_bytes), 0) + NEW.tamanho_bytes 
       FROM anexos_temporarios 
       WHERE empresa_id = NEW.empresa_id AND status = 'pendente');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validar_limite_anexos_insert
  BEFORE INSERT ON anexos_temporarios
  FOR EACH ROW
  EXECUTE FUNCTION trigger_validar_limite_anexos();

-- Comentários na tabela e colunas
COMMENT ON TABLE anexos_temporarios IS 'Armazenamento temporário de anexos para disparos personalizados';
COMMENT ON COLUMN anexos_temporarios.empresa_id IS 'Referência para a empresa cliente';
COMMENT ON COLUMN anexos_temporarios.nome_original IS 'Nome original do arquivo enviado pelo usuário';
COMMENT ON COLUMN anexos_temporarios.nome_arquivo IS 'Nome do arquivo no storage (pode ser diferente do original)';
COMMENT ON COLUMN anexos_temporarios.tipo_mime IS 'Tipo MIME do arquivo (application/pdf, etc.)';
COMMENT ON COLUMN anexos_temporarios.tamanho_bytes IS 'Tamanho do arquivo em bytes';
COMMENT ON COLUMN anexos_temporarios.url_temporaria IS 'URL temporária para acesso ao arquivo';
COMMENT ON COLUMN anexos_temporarios.url_permanente IS 'URL permanente após processamento';
COMMENT ON COLUMN anexos_temporarios.status IS 'Status do anexo: pendente, enviando, processado, erro';
COMMENT ON COLUMN anexos_temporarios.token_acesso IS 'Token JWT para autenticação de download';
COMMENT ON COLUMN anexos_temporarios.data_expiracao IS 'Data de expiração do arquivo temporário (24h)';
COMMENT ON COLUMN anexos_temporarios.data_processamento IS 'Data em que o anexo foi processado pelo Power Automate';
COMMENT ON COLUMN anexos_temporarios.erro_detalhes IS 'Detalhes do erro caso o processamento falhe';