-- ============================================================================
-- Script: Verificar e Corrigir Estado da Coluna de Segmentação
-- ============================================================================
-- Este script verifica o estado atual e aplica apenas as correções necessárias
-- ============================================================================

-- PASSO 1: Verificar estado atual
-- ============================================================================
DO $$
DECLARE
  coluna_id_existe BOOLEAN;
  coluna_nome_existe BOOLEAN;
  tipo_coluna_nome TEXT;
BEGIN
  -- Verificar se empresa_segmentacao_id existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'requerimentos'
      AND column_name = 'empresa_segmentacao_id'
  ) INTO coluna_id_existe;
  
  -- Verificar se empresa_segmentacao_nome existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'requerimentos'
      AND column_name = 'empresa_segmentacao_nome'
  ) INTO coluna_nome_existe;
  
  -- Se empresa_segmentacao_nome existe, verificar tipo
  IF coluna_nome_existe THEN
    SELECT data_type INTO tipo_coluna_nome
    FROM information_schema.columns
    WHERE table_name = 'requerimentos'
      AND column_name = 'empresa_segmentacao_nome';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== ESTADO ATUAL ===';
  RAISE NOTICE 'empresa_segmentacao_id existe: %', coluna_id_existe;
  RAISE NOTICE 'empresa_segmentacao_nome existe: %', coluna_nome_existe;
  IF coluna_nome_existe THEN
    RAISE NOTICE 'Tipo de empresa_segmentacao_nome: %', tipo_coluna_nome;
  END IF;
  RAISE NOTICE '';
  
  -- Determinar ação necessária
  IF coluna_id_existe AND coluna_nome_existe THEN
    RAISE NOTICE '⚠️ PROBLEMA: Ambas as colunas existem!';
    RAISE NOTICE '📋 Ação: Vamos remover empresa_segmentacao_id e manter empresa_segmentacao_nome';
  ELSIF coluna_id_existe AND NOT coluna_nome_existe THEN
    RAISE NOTICE '📋 Ação: Vamos renomear empresa_segmentacao_id para empresa_segmentacao_nome';
  ELSIF NOT coluna_id_existe AND coluna_nome_existe THEN
    IF tipo_coluna_nome = 'text' THEN
      RAISE NOTICE '✅ Coluna já está correta! Apenas vamos recriar view e triggers.';
    ELSE
      RAISE NOTICE '⚠️ Coluna existe mas tipo está errado: %', tipo_coluna_nome;
      RAISE NOTICE '📋 Ação: Vamos converter para TEXT';
    END IF;
  ELSE
    RAISE NOTICE '❌ ERRO: Nenhuma coluna de segmentação existe!';
    RAISE EXCEPTION 'Coluna de segmentação não encontrada';
  END IF;
  RAISE NOTICE '';
END $$;

-- PASSO 2: Dropar view (sempre necessário)
-- ============================================================================
DROP VIEW IF EXISTS vw_requerimentos_completo CASCADE;

-- PASSO 3: Remover constraints e índices antigos
-- ============================================================================
ALTER TABLE requerimentos
DROP CONSTRAINT IF EXISTS requerimentos_empresa_segmentacao_id_fkey;

DROP INDEX IF EXISTS idx_requerimentos_empresa_segmentacao;
DROP INDEX IF EXISTS idx_requerimentos_empresa_segmentacao_nome;

-- PASSO 4: Corrigir estrutura da coluna
-- ============================================================================
DO $$
DECLARE
  coluna_id_existe BOOLEAN;
  coluna_nome_existe BOOLEAN;
  tipo_coluna_nome TEXT;
BEGIN
  -- Verificar estado
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'requerimentos' AND column_name = 'empresa_segmentacao_id'
  ) INTO coluna_id_existe;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'requerimentos' AND column_name = 'empresa_segmentacao_nome'
  ) INTO coluna_nome_existe;
  
  IF coluna_nome_existe THEN
    SELECT data_type INTO tipo_coluna_nome
    FROM information_schema.columns
    WHERE table_name = 'requerimentos' AND column_name = 'empresa_segmentacao_nome';
  END IF;
  
  -- CENÁRIO 1: Ambas existem (problema!)
  IF coluna_id_existe AND coluna_nome_existe THEN
    RAISE NOTICE '🔧 Removendo coluna duplicada empresa_segmentacao_id...';
    EXECUTE 'ALTER TABLE requerimentos DROP COLUMN IF EXISTS empresa_segmentacao_id CASCADE';
    RAISE NOTICE '✅ Coluna empresa_segmentacao_id removida';
    
    -- Garantir que empresa_segmentacao_nome é TEXT
    IF tipo_coluna_nome != 'text' THEN
      RAISE NOTICE '🔧 Convertendo empresa_segmentacao_nome para TEXT...';
      EXECUTE 'ALTER TABLE requerimentos ALTER COLUMN empresa_segmentacao_nome TYPE text USING empresa_segmentacao_nome::text';
      RAISE NOTICE '✅ Coluna convertida para TEXT';
    END IF;
  
  -- CENÁRIO 2: Só empresa_segmentacao_id existe
  ELSIF coluna_id_existe AND NOT coluna_nome_existe THEN
    RAISE NOTICE '🔧 Convertendo empresa_segmentacao_id para TEXT...';
    EXECUTE 'ALTER TABLE requerimentos ALTER COLUMN empresa_segmentacao_id TYPE text USING empresa_segmentacao_id::text';
    
    RAISE NOTICE '🔧 Renomeando para empresa_segmentacao_nome...';
    EXECUTE 'ALTER TABLE requerimentos RENAME COLUMN empresa_segmentacao_id TO empresa_segmentacao_nome';
    RAISE NOTICE '✅ Coluna renomeada';
  
  -- CENÁRIO 3: Só empresa_segmentacao_nome existe
  ELSIF NOT coluna_id_existe AND coluna_nome_existe THEN
    IF tipo_coluna_nome != 'text' THEN
      RAISE NOTICE '🔧 Convertendo empresa_segmentacao_nome para TEXT...';
      EXECUTE 'ALTER TABLE requerimentos ALTER COLUMN empresa_segmentacao_nome TYPE text USING empresa_segmentacao_nome::text';
      RAISE NOTICE '✅ Coluna convertida para TEXT';
    ELSE
      RAISE NOTICE '✅ Coluna já está correta (TEXT)';
    END IF;
  
  -- CENÁRIO 4: Nenhuma existe (erro!)
  ELSE
    RAISE EXCEPTION 'Nenhuma coluna de segmentação encontrada!';
  END IF;
END $$;

-- PASSO 5: Criar índice
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_requerimentos_empresa_segmentacao_nome 
ON requerimentos(empresa_segmentacao_nome);

-- PASSO 6: Atualizar comentário
-- ============================================================================
COMMENT ON COLUMN requerimentos.empresa_segmentacao_nome IS 
'Nome da empresa de segmentação (baseline) para clientes com múltiplas empresas. 
Exemplo: Cliente ANGLO pode ter "NIQUEL" ou "IOB". 
Obrigatório apenas se o cliente tiver baseline_segmentado = true.
Valores possíveis são extraídos do campo segmentacao_config do cliente.';

-- PASSO 7: Remover triggers antigos
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_validate_empresa_segmentacao ON requerimentos;
DROP TRIGGER IF EXISTS validate_empresa_segmentacao_trigger ON requerimentos;
DROP TRIGGER IF EXISTS validate_empresa_segmentacao_nome_trigger ON requerimentos;
DROP FUNCTION IF EXISTS validate_empresa_segmentacao();
DROP FUNCTION IF EXISTS validate_empresa_segmentacao_nome();

-- PASSO 8: Criar novo trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_empresa_segmentacao_nome()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se empresa_segmentacao_nome foi informado, validar que não está vazio
  IF NEW.empresa_segmentacao_nome IS NOT NULL AND trim(NEW.empresa_segmentacao_nome) = '' THEN
    RAISE EXCEPTION 'Nome da empresa de segmentação não pode ser vazio';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_empresa_segmentacao_nome_trigger
  BEFORE INSERT OR UPDATE ON requerimentos
  FOR EACH ROW
  EXECUTE FUNCTION validate_empresa_segmentacao_nome();

-- PASSO 9: Recriar view
-- ============================================================================
CREATE OR REPLACE VIEW vw_requerimentos_completo AS
SELECT 
  r.*,
  ec.nome_abreviado as cliente_nome
FROM requerimentos r
LEFT JOIN empresas_clientes ec ON r.cliente_id = ec.id;

COMMENT ON VIEW vw_requerimentos_completo IS 
'View completa de requerimentos com nome do cliente e empresa de segmentação.
Empresa de segmentação é o nome da subdivisão (ex: NIQUEL, IOB) extraído do JSON.';

-- PASSO 10: Verificação final
-- ============================================================================
DO $$
DECLARE
  coluna_info RECORD;
BEGIN
  SELECT 
    column_name,
    data_type,
    is_nullable
  INTO coluna_info
  FROM information_schema.columns
  WHERE table_name = 'requerimentos'
    AND column_name = 'empresa_segmentacao_nome';
  
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICAÇÃO FINAL ===';
  RAISE NOTICE '✅ Coluna: %', coluna_info.column_name;
  RAISE NOTICE '✅ Tipo: %', coluna_info.data_type;
  RAISE NOTICE '✅ Nullable: %', coluna_info.is_nullable;
  RAISE NOTICE '';
  RAISE NOTICE '=== MIGRATION CONCLUÍDA COM SUCESSO ===';
  RAISE NOTICE '📋 Agora você pode salvar nomes como "NIQUEL" ou "IOB"';
  RAISE NOTICE '';
END $$;

-- PASSO 11: Mostrar estrutura final
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'requerimentos'
  AND column_name LIKE '%segmentacao%'
ORDER BY column_name;
