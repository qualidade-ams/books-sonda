-- Migração para estender tabela historico_disparos com suporte a anexos
-- Sistema de Anexos para Disparos Personalizados

-- Adicionar colunas para suporte a anexos na tabela historico_disparos
ALTER TABLE historico_disparos 
ADD COLUMN IF NOT EXISTS anexo_id UUID REFERENCES anexos_temporarios(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS anexo_processado BOOLEAN DEFAULT FALSE;

-- Criar índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_historico_disparos_anexo_id ON historico_disparos(anexo_id);
CREATE INDEX IF NOT EXISTS idx_historico_disparos_anexo_processado ON historico_disparos(anexo_processado);
CREATE INDEX IF NOT EXISTS idx_historico_disparos_empresa_anexo ON historico_disparos(empresa_id, anexo_processado) WHERE anexo_id IS NOT NULL;

-- Função para atualizar status do anexo quando histórico é atualizado
DROP FUNCTION IF EXISTS sync_anexo_status_historico();
CREATE OR REPLACE FUNCTION sync_anexo_status_historico()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o histórico foi marcado como sucesso e tem anexo
  IF NEW.status = 'sucesso' AND NEW.anexo_id IS NOT NULL AND OLD.anexo_processado = FALSE THEN
    -- Atualizar status do anexo para processado
    UPDATE anexos_temporarios 
    SET 
      status = 'processado',
      data_processamento = NOW(),
      updated_at = NOW()
    WHERE id = NEW.anexo_id;
    
    -- Marcar como processado no histórico
    NEW.anexo_processado = TRUE;
  END IF;
  
  -- Se o histórico foi marcado como erro e tem anexo
  IF NEW.status = 'erro' AND NEW.anexo_id IS NOT NULL THEN
    -- Atualizar status do anexo para erro
    UPDATE anexos_temporarios 
    SET 
      status = 'erro',
      erro_detalhes = COALESCE(NEW.detalhes_erro, 'Erro no processamento do disparo'),
      updated_at = NOW()
    WHERE id = NEW.anexo_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para sincronizar status entre histórico e anexos
CREATE TRIGGER trigger_sync_anexo_status_historico
  BEFORE UPDATE ON historico_disparos
  FOR EACH ROW
  WHEN (OLD.anexo_id IS DISTINCT FROM NEW.anexo_id OR OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION sync_anexo_status_historico();

-- Função para buscar histórico com informações de anexos
DROP FUNCTION IF EXISTS buscar_historico_com_anexos(UUID, DATE, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION buscar_historico_com_anexos(
  p_empresa_id UUID DEFAULT NULL,
  p_mes_referencia DATE DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  empresa_id UUID,
  empresa_nome TEXT,
  mes_referencia DATE,
  data_disparo TIMESTAMP WITH TIME ZONE,
  status TEXT,
  detalhes_erro TEXT,
  anexo_id UUID,
  anexo_processado BOOLEAN,
  anexo_nome_original TEXT,
  anexo_tamanho_bytes INTEGER,
  anexo_status TEXT,
  total_clientes INTEGER,
  clientes_processados INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.empresa_id,
    ec.nome as empresa_nome,
    h.mes_referencia,
    h.data_disparo,
    h.status,
    h.detalhes_erro,
    h.anexo_id,
    h.anexo_processado,
    at.nome_original as anexo_nome_original,
    at.tamanho_bytes as anexo_tamanho_bytes,
    at.status as anexo_status,
    h.total_clientes,
    h.clientes_processados
  FROM historico_disparos h
  LEFT JOIN empresas_clientes ec ON h.empresa_id = ec.id
  LEFT JOIN anexos_temporarios at ON h.anexo_id = at.id
  WHERE 
    (p_empresa_id IS NULL OR h.empresa_id = p_empresa_id)
    AND (p_mes_referencia IS NULL OR h.mes_referencia = p_mes_referencia)
  ORDER BY h.data_disparo DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Função para estatísticas de anexos por período
DROP FUNCTION IF EXISTS estatisticas_anexos_periodo(DATE, DATE);
CREATE OR REPLACE FUNCTION estatisticas_anexos_periodo(
  p_data_inicio DATE,
  p_data_fim DATE
)
RETURNS TABLE (
  total_anexos INTEGER,
  anexos_processados INTEGER,
  anexos_com_erro INTEGER,
  anexos_pendentes INTEGER,
  tamanho_total_mb NUMERIC,
  empresas_com_anexos INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_anexos,
    COUNT(*) FILTER (WHERE at.status = 'processado')::INTEGER as anexos_processados,
    COUNT(*) FILTER (WHERE at.status = 'erro')::INTEGER as anexos_com_erro,
    COUNT(*) FILTER (WHERE at.status = 'pendente')::INTEGER as anexos_pendentes,
    ROUND((SUM(at.tamanho_bytes) / 1048576.0)::NUMERIC, 2) as tamanho_total_mb,
    COUNT(DISTINCT at.empresa_id)::INTEGER as empresas_com_anexos
  FROM anexos_temporarios at
  WHERE at.data_upload::DATE BETWEEN p_data_inicio AND p_data_fim;
END;
$$ LANGUAGE plpgsql;

-- Log da migração para sistema de anexos
-- Registra a extensão da tabela historico_disparos com suporte a anexos
DO $$
BEGIN
  -- Log da migração apenas se a tabela logs_sistema existir
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'logs_sistema') THEN
    INSERT INTO logs_sistema (
      operacao, 
      detalhes, 
      data_operacao
    ) VALUES (
      'MIGRATION_HISTORICO_DISPAROS_ANEXOS',
      jsonb_build_object(
        'tipo_operacao', 'adicao_suporte_anexos',
        'colunas_adicionadas', ARRAY['anexo_id', 'anexo_processado'],
        'tabela', 'historico_disparos',
        'migration_status', 'completed',
        'description', 'Extensão da tabela historico_disparos para suporte ao sistema de anexos em disparos personalizados'
      ),
      NOW()
    );
  END IF;
END $$;

-- Comentários nas novas colunas
COMMENT ON COLUMN historico_disparos.anexo_id IS 'Referência para o anexo associado ao disparo (opcional)';
COMMENT ON COLUMN historico_disparos.anexo_processado IS 'Indica se o anexo foi processado com sucesso pelo Power Automate';