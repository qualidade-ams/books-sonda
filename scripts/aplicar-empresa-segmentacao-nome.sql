-- ============================================================================
-- Script: Aplicar Migration de Empresa Segmentação (TEXT)
-- ============================================================================
-- Este script converte empresa_segmentacao_id (UUID) para 
-- empresa_segmentacao_nome (TEXT) porque NIQUEL e IOB são nomes lógicos,
-- não empresas cadastradas.
-- ============================================================================

-- PASSO 1: DROPAR VIEW PRIMEIRO (ela depende da coluna)
-- ============================================================================
DROP VIEW IF EXISTS vw_requerimentos_completo CASCADE;

-- PASSO 2: Remover constraint e índice antigos
-- ============================================================================
ALTER TABLE requerimentos
DROP CONSTRAINT IF EXISTS requerimentos_empresa_segmentacao_id_fkey;

DROP INDEX IF EXISTS idx_requerimentos_empresa_segmentacao;

-- PASSO 3: Alterar tipo da coluna para TEXT
-- ============================================================================
ALTER TABLE requerimentos
ALTER COLUMN empresa_segmentacao_id TYPE text USING empresa_segmentacao_id::text;

-- Renomear coluna para refletir que agora é um nome, não um ID
ALTER TABLE requerimentos
RENAME COLUMN empresa_segmentacao_id TO empresa_segmentacao_nome;

-- PASSO 4: Adicionar índice para melhor performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_requerimentos_empresa_segmentacao_nome 
ON requerimentos(empresa_segmentacao_nome);

-- PASSO 5: Atualizar comentário
-- ============================================================================
COMMENT ON COLUMN requerimentos.empresa_segmentacao_nome IS 
'Nome da empresa de segmentação (baseline) para clientes com múltiplas empresas. 
Exemplo: Cliente ANGLO pode ter "NIQUEL" ou "IOB". 
Obrigatório apenas se o cliente tiver baseline_segmentado = true.
Valores possíveis são extraídos do campo segmentacao_config do cliente.';

-- PASSO 6: Remover trigger antigo e criar novo simplificado
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_validate_empresa_segmentacao ON requerimentos;
DROP TRIGGER IF EXISTS validate_empresa_segmentacao_trigger ON requerimentos;
DROP FUNCTION IF EXISTS validate_empresa_segmentacao();

-- Função simplificada: apenas valida que o nome não está vazio se informado
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

-- Criar trigger
CREATE TRIGGER validate_empresa_segmentacao_nome_trigger
  BEFORE INSERT OR UPDATE ON requerimentos
  FOR EACH ROW
  EXECUTE FUNCTION validate_empresa_segmentacao_nome();

-- PASSO 7: Recriar view vw_requerimentos_completo
-- ============================================================================
CREATE OR REPLACE VIEW vw_requerimentos_completo AS
SELECT 
  r.*,
  ec.nome_abreviado as cliente_nome,
  r.empresa_segmentacao_nome -- Agora é o nome direto, não precisa de JOIN
FROM requerimentos r
LEFT JOIN empresas_clientes ec ON r.cliente_id = ec.id;

COMMENT ON VIEW vw_requerimentos_completo IS 
'View completa de requerimentos com nome do cliente e empresa de segmentação.
Empresa de segmentação é o nome da subdivisão (ex: NIQUEL, IOB) extraído do JSON.';

-- PASSO 8: Verificação final
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== MIGRATION CONCLUÍDA ===';
  RAISE NOTICE '✅ Coluna renomeada: empresa_segmentacao_id → empresa_segmentacao_nome';
  RAISE NOTICE '✅ Tipo alterado: UUID → TEXT';
  RAISE NOTICE '✅ Constraint FK removida (não é empresa cadastrada)';
  RAISE NOTICE '✅ Índice recriado';
  RAISE NOTICE '✅ Trigger atualizado';
  RAISE NOTICE '✅ View atualizada';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Agora você pode salvar nomes como "NIQUEL" ou "IOB"';
  RAISE NOTICE '';
END $$;

-- PASSO 9: Verificar estrutura final
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'requerimentos'
  AND column_name = 'empresa_segmentacao_nome';
