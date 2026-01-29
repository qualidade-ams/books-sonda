-- =====================================================
-- MIGRATION: Adicionar campos de controle de sincronização
-- =====================================================
-- Objetivo: Implementar sincronização incremental e segura
-- Data: 2026-01-29
-- =====================================================

-- Passo 1: Adicionar campos de controle de sincronização
ALTER TABLE pesquisas_satisfacao
ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS hash_origem TEXT,
ADD COLUMN IF NOT EXISTS chave_unica TEXT;

-- Passo 2: Criar índices para otimizar consultas de sincronização
CREATE INDEX IF NOT EXISTS idx_pesquisas_source_updated_at 
ON pesquisas_satisfacao(source_updated_at) 
WHERE origem = 'sql_server';

CREATE INDEX IF NOT EXISTS idx_pesquisas_chave_unica 
ON pesquisas_satisfacao(chave_unica) 
WHERE origem = 'sql_server';

CREATE INDEX IF NOT EXISTS idx_pesquisas_status_origem 
ON pesquisas_satisfacao(status, origem);

CREATE INDEX IF NOT EXISTS idx_pesquisas_hash_origem 
ON pesquisas_satisfacao(hash_origem) 
WHERE origem = 'sql_server';

-- Passo 3: Remover duplicatas antes de criar índice único
-- Manter apenas o registro mais recente de cada chave_unica
DO $$
DECLARE
  v_duplicatas_removidas INTEGER := 0;
BEGIN
  -- Identificar e remover duplicatas, mantendo apenas o mais recente
  WITH duplicatas AS (
    SELECT 
      id,
      chave_unica,
      ROW_NUMBER() OVER (
        PARTITION BY chave_unica 
        ORDER BY updated_at DESC, created_at DESC
      ) as rn
    FROM pesquisas_satisfacao
    WHERE origem = 'sql_server' 
      AND chave_unica IS NOT NULL
  )
  DELETE FROM pesquisas_satisfacao
  WHERE id IN (
    SELECT id FROM duplicatas WHERE rn > 1
  );
  
  GET DIAGNOSTICS v_duplicatas_removidas = ROW_COUNT;
  
  RAISE NOTICE '🧹 Duplicatas removidas: %', v_duplicatas_removidas;
END $$;

-- Passo 4: Adicionar constraint de unicidade para chave_unica
-- Apenas para registros do SQL Server
CREATE UNIQUE INDEX IF NOT EXISTS idx_pesquisas_chave_unica_unique 
ON pesquisas_satisfacao(chave_unica) 
WHERE origem = 'sql_server' AND chave_unica IS NOT NULL;

-- Passo 5: Comentários explicativos
COMMENT ON COLUMN pesquisas_satisfacao.source_updated_at IS 
'Data/hora da última atualização no sistema de origem (SQL Server). Corresponde ao campo Data_Resposta com precisão de segundos.';

COMMENT ON COLUMN pesquisas_satisfacao.synced_at IS 
'Data/hora da última sincronização bem-sucedida deste registro.';

COMMENT ON COLUMN pesquisas_satisfacao.hash_origem IS 
'Hash MD5 dos campos principais para detectar mudanças no registro de origem.';

COMMENT ON COLUMN pesquisas_satisfacao.chave_unica IS 
'Chave única composta para identificação do registro no sistema de origem. Formato: empresa|cliente|nro_caso|data_resposta';

-- Passo 6: Criar função para gerar hash de registro
CREATE OR REPLACE FUNCTION gerar_hash_pesquisa(
  p_empresa TEXT,
  p_cliente TEXT,
  p_nro_caso TEXT,
  p_data_resposta TIMESTAMP,
  p_resposta TEXT,
  p_comentario TEXT
) RETURNS TEXT AS $$
BEGIN
  RETURN MD5(
    COALESCE(p_empresa, '') || '|' ||
    COALESCE(p_cliente, '') || '|' ||
    COALESCE(p_nro_caso, '') || '|' ||
    COALESCE(p_data_resposta::TEXT, '') || '|' ||
    COALESCE(p_resposta, '') || '|' ||
    COALESCE(p_comentario, '')
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Passo 7: Criar função para gerar chave única
CREATE OR REPLACE FUNCTION gerar_chave_unica_pesquisa(
  p_empresa TEXT,
  p_cliente TEXT,
  p_nro_caso TEXT,
  p_data_resposta TIMESTAMP
) RETURNS TEXT AS $$
BEGIN
  RETURN 
    COALESCE(p_empresa, '') || '|' ||
    COALESCE(p_cliente, '') || '|' ||
    COALESCE(p_nro_caso, '') || '|' ||
    COALESCE(TO_CHAR(p_data_resposta, 'YYYY-MM-DD HH24:MI:SS'), '');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Passo 8: Atualizar registros existentes com chave_unica e hash
UPDATE pesquisas_satisfacao
SET 
  chave_unica = gerar_chave_unica_pesquisa(empresa, cliente, nro_caso, data_resposta::TIMESTAMP),
  hash_origem = gerar_hash_pesquisa(empresa, cliente, nro_caso, data_resposta::TIMESTAMP, resposta, comentario_pesquisa),
  source_updated_at = COALESCE(data_resposta::TIMESTAMP, updated_at)
WHERE origem = 'sql_server' 
  AND chave_unica IS NULL;

-- Passo 9: Criar trigger para atualizar hash automaticamente
CREATE OR REPLACE FUNCTION atualizar_hash_pesquisa()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar chave única
  NEW.chave_unica := gerar_chave_unica_pesquisa(
    NEW.empresa,
    NEW.cliente,
    NEW.nro_caso,
    NEW.data_resposta::TIMESTAMP
  );
  
  -- Atualizar hash
  NEW.hash_origem := gerar_hash_pesquisa(
    NEW.empresa,
    NEW.cliente,
    NEW.nro_caso,
    NEW.data_resposta::TIMESTAMP,
    NEW.resposta,
    NEW.comentario_pesquisa
  );
  
  -- Atualizar source_updated_at se data_resposta mudou
  IF TG_OP = 'UPDATE' AND (
    OLD.data_resposta IS DISTINCT FROM NEW.data_resposta OR
    OLD.resposta IS DISTINCT FROM NEW.resposta OR
    OLD.comentario_pesquisa IS DISTINCT FROM NEW.comentario_pesquisa
  ) THEN
    NEW.source_updated_at := COALESCE(NEW.data_resposta::TIMESTAMP, NOW());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_atualizar_hash_pesquisa ON pesquisas_satisfacao;

CREATE TRIGGER trigger_atualizar_hash_pesquisa
BEFORE INSERT OR UPDATE ON pesquisas_satisfacao
FOR EACH ROW
WHEN (NEW.origem = 'sql_server')
EXECUTE FUNCTION atualizar_hash_pesquisa();

-- Passo 10: Criar tabela de controle de sincronização
CREATE TABLE IF NOT EXISTS sync_control_pesquisas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  last_sync_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  total_processados INTEGER DEFAULT 0,
  novos INTEGER DEFAULT 0,
  atualizados INTEGER DEFAULT 0,
  erros INTEGER DEFAULT 0,
  status TEXT DEFAULT 'success',
  mensagem TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para buscar última sincronização rapidamente
CREATE INDEX IF NOT EXISTS idx_sync_control_last_sync 
ON sync_control_pesquisas(last_sync_at DESC);

COMMENT ON TABLE sync_control_pesquisas IS 
'Tabela de controle para rastrear sincronizações de pesquisas do SQL Server';

-- Passo 11: Criar função para registrar sincronização
CREATE OR REPLACE FUNCTION registrar_sincronizacao_pesquisas(
  p_total_processados INTEGER,
  p_novos INTEGER,
  p_atualizados INTEGER,
  p_erros INTEGER,
  p_status TEXT DEFAULT 'success',
  p_mensagem TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_sync_id UUID;
BEGIN
  INSERT INTO sync_control_pesquisas (
    last_sync_at,
    total_processados,
    novos,
    atualizados,
    erros,
    status,
    mensagem
  ) VALUES (
    NOW(),
    p_total_processados,
    p_novos,
    p_atualizados,
    p_erros,
    p_status,
    p_mensagem
  ) RETURNING id INTO v_sync_id;
  
  RETURN v_sync_id;
END;
$$ LANGUAGE plpgsql;

-- Passo 12: Criar função para obter última sincronização
CREATE OR REPLACE FUNCTION obter_ultima_sincronizacao_pesquisas()
RETURNS TABLE (
  last_sync_at TIMESTAMP WITH TIME ZONE,
  total_processados INTEGER,
  novos INTEGER,
  atualizados INTEGER,
  erros INTEGER,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.last_sync_at,
    s.total_processados,
    s.novos,
    s.atualizados,
    s.erros,
    s.status
  FROM sync_control_pesquisas s
  ORDER BY s.last_sync_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Passo 13: Verificação final
DO $$
DECLARE
  v_campos_adicionados INTEGER;
  v_indices_criados INTEGER;
  v_registros_atualizados INTEGER;
BEGIN
  -- Contar campos adicionados
  SELECT COUNT(*) INTO v_campos_adicionados
  FROM information_schema.columns
  WHERE table_name = 'pesquisas_satisfacao'
    AND column_name IN ('source_updated_at', 'synced_at', 'hash_origem', 'chave_unica');
  
  -- Contar índices criados
  SELECT COUNT(*) INTO v_indices_criados
  FROM pg_indexes
  WHERE tablename = 'pesquisas_satisfacao'
    AND indexname LIKE 'idx_pesquisas_%';
  
  -- Contar registros com chave_unica
  SELECT COUNT(*) INTO v_registros_atualizados
  FROM pesquisas_satisfacao
  WHERE origem = 'sql_server' AND chave_unica IS NOT NULL;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRATION CONCLUÍDA COM SUCESSO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 Campos de controle adicionados: %', v_campos_adicionados;
  RAISE NOTICE '📊 Índices criados: %', v_indices_criados;
  RAISE NOTICE '📊 Registros atualizados com chave_unica: %', v_registros_atualizados;
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔧 Funções criadas:';
  RAISE NOTICE '   - gerar_hash_pesquisa()';
  RAISE NOTICE '   - gerar_chave_unica_pesquisa()';
  RAISE NOTICE '   - atualizar_hash_pesquisa() (trigger)';
  RAISE NOTICE '   - registrar_sincronizacao_pesquisas()';
  RAISE NOTICE '   - obter_ultima_sincronizacao_pesquisas()';
  RAISE NOTICE '========================================';
END $$;
