-- ============================================================================
-- Migration: Corrigir Segmentação de Empresas - Usar TEXT em vez de UUID
-- ============================================================================
-- As empresas de segmentação (NIQUEL, IOB) são subdivisões lógicas do cliente,
-- não empresas cadastradas separadamente. Por isso, vamos salvar o NOME
-- em vez de um ID (FK).
-- ============================================================================

-- PASSO 1: Remover constraint e índice antigos
-- ============================================================================
ALTER TABLE requerimentos
DROP CONSTRAINT IF EXISTS requerimentos_empresa_segmentacao_id_fkey;

DROP INDEX IF EXISTS idx_requerimentos_empresa_segmentacao;

-- PASSO 2: Alterar tipo da coluna para TEXT
-- ============================================================================
ALTER TABLE requerimentos
ALTER COLUMN empresa_segmentacao_id TYPE text USING empresa_segmentacao_id::text;

-- Renomear coluna para refletir que agora é um nome, não um ID
ALTER TABLE requerimentos
RENAME COLUMN empresa_segmentacao_id TO empresa_segmentacao_nome;

-- PASSO 3: Adicionar índice para melhor performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_requerimentos_empresa_segmentacao_nome 
ON requerimentos(empresa_segmentacao_nome);

-- PASSO 4: Atualizar comentário
-- ============================================================================
COMMENT ON COLUMN requerimentos.empresa_segmentacao_nome IS 
'Nome da empresa de segmentação (baseline) para clientes com múltiplas empresas. 
Exemplo: Cliente ANGLO pode ter "NIQUEL" ou "IOB". 
Obrigatório apenas se o cliente tiver baseline_segmentado = true.
Valores possíveis são extraídos do campo segmentacao_config do cliente.';

-- PASSO 5: Remover trigger antigo e criar novo simplificado
-- ============================================================================
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

-- PASSO 6: Atualizar view vw_requerimentos_completo
-- ============================================================================
DROP VIEW IF EXISTS vw_requerimentos_completo;

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
