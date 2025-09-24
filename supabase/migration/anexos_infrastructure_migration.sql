-- Migration para Infraestrutura de Anexos - Sistema de Disparos Personalizados
-- Criação da tabela de anexos temporários e configuração de storage

-- Tabela de anexos temporários
CREATE TABLE IF NOT EXISTS anexos_temporarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas_clientes(id) ON DELETE CASCADE,
  nome_original VARCHAR(255) NOT NULL,
  nome_arquivo VARCHAR(255) NOT NULL,
  tipo_mime VARCHAR(100) NOT NULL,
  tamanho_bytes INTEGER NOT NULL,
  url_temporaria TEXT NOT NULL,
  url_permanente TEXT,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviando', 'processado', 'erro', 'expirado')),
  token_acesso VARCHAR(255) NOT NULL,
  data_upload TIMESTAMP DEFAULT NOW(),
  data_expiracao TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours',
  data_processamento TIMESTAMP,
  erro_detalhes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Extensão da tabela historico_disparos para suportar anexos
ALTER TABLE historico_disparos 
ADD COLUMN IF NOT EXISTS anexo_id UUID REFERENCES anexos_temporarios(id),
ADD COLUMN IF NOT EXISTS anexo_processado BOOLEAN DEFAULT FALSE;

-- Índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_anexos_temporarios_empresa ON anexos_temporarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_anexos_temporarios_status ON anexos_temporarios(status);
CREATE INDEX IF NOT EXISTS idx_anexos_temporarios_expiracao ON anexos_temporarios(data_expiracao);
CREATE INDEX IF NOT EXISTS idx_anexos_temporarios_token ON anexos_temporarios(token_acesso);
CREATE INDEX IF NOT EXISTS idx_historico_disparos_anexo ON historico_disparos(anexo_id);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_anexos_temporarios_updated_at 
  BEFORE UPDATE ON anexos_temporarios 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para limpeza automática de anexos expirados
CREATE OR REPLACE FUNCTION limpar_anexos_expirados()
RETURNS INTEGER AS $$
DECLARE
  anexos_removidos INTEGER;
BEGIN
  -- Atualizar status dos anexos expirados
  UPDATE anexos_temporarios 
  SET status = 'expirado', updated_at = NOW()
  WHERE data_expiracao < NOW() 
    AND status NOT IN ('processado', 'expirado');
  
  GET DIAGNOSTICS anexos_removidos = ROW_COUNT;
  
  -- Log da operação de limpeza
  INSERT INTO audit_logs (
    user_id, 
    action, 
    table_name, 
    details, 
    created_at
  ) VALUES (
    NULL, -- Sistema automático
    'CLEANUP_EXPIRED_ATTACHMENTS',
    'anexos_temporarios',
    jsonb_build_object('anexos_expirados', anexos_removidos),
    NOW()
  );
  
  RETURN anexos_removidos;
END;
$$ LANGUAGE plpgsql;

-- Função para validar limite de tamanho por empresa (25MB)
CREATE OR REPLACE FUNCTION validar_limite_anexos_empresa(
  p_empresa_id UUID,
  p_novo_tamanho INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  tamanho_atual INTEGER;
  limite_maximo INTEGER := 26214400; -- 25MB em bytes
BEGIN
  -- Calcular tamanho atual dos anexos pendentes da empresa
  SELECT COALESCE(SUM(tamanho_bytes), 0)
  INTO tamanho_atual
  FROM anexos_temporarios
  WHERE empresa_id = p_empresa_id
    AND status IN ('pendente', 'enviando')
    AND data_expiracao > NOW();
  
  -- Verificar se o novo arquivo excede o limite
  RETURN (tamanho_atual + p_novo_tamanho) <= limite_maximo;
END;
$$ LANGUAGE plpgsql;

-- Comentários nas tabelas para documentação
COMMENT ON TABLE anexos_temporarios IS 'Tabela de anexos temporários para disparos personalizados';
COMMENT ON COLUMN anexos_temporarios.empresa_id IS 'Referência para a empresa proprietária do anexo';
COMMENT ON COLUMN anexos_temporarios.nome_original IS 'Nome original do arquivo enviado pelo usuário';
COMMENT ON COLUMN anexos_temporarios.nome_arquivo IS 'Nome único do arquivo no storage';
COMMENT ON COLUMN anexos_temporarios.tipo_mime IS 'Tipo MIME do arquivo (application/pdf, etc.)';
COMMENT ON COLUMN anexos_temporarios.tamanho_bytes IS 'Tamanho do arquivo em bytes';
COMMENT ON COLUMN anexos_temporarios.url_temporaria IS 'URL temporária para acesso ao arquivo';
COMMENT ON COLUMN anexos_temporarios.url_permanente IS 'URL permanente após processamento';
COMMENT ON COLUMN anexos_temporarios.status IS 'Status do processamento do anexo';
COMMENT ON COLUMN anexos_temporarios.token_acesso IS 'Token JWT para autenticação de download';
COMMENT ON COLUMN anexos_temporarios.data_expiracao IS 'Data de expiração do anexo (24h após upload)';
COMMENT ON FUNCTION limpar_anexos_expirados() IS 'Função para limpeza automática de anexos expirados';
COMMENT ON FUNCTION validar_limite_anexos_empresa(UUID, INTEGER) IS 'Valida se empresa pode adicionar novo anexo respeitando limite de 25MB';