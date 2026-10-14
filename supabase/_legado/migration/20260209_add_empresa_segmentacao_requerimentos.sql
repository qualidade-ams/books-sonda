-- ============================================================================
-- Migration: Adicionar Segmentação de Empresas em Requerimentos
-- ============================================================================
-- Adiciona suporte para clientes com múltiplas empresas (baseline)
-- permitindo especificar a qual empresa cada requerimento pertence
-- ============================================================================

-- PASSO 1: Adicionar coluna empresa_segmentacao_id
-- ============================================================================
ALTER TABLE requerimentos
ADD COLUMN IF NOT EXISTS empresa_segmentacao_id uuid REFERENCES empresas_clientes(id);

-- Adicionar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_requerimentos_empresa_segmentacao 
ON requerimentos(empresa_segmentacao_id);

-- Adicionar comentário explicativo
COMMENT ON COLUMN requerimentos.empresa_segmentacao_id IS 
'ID da empresa de segmentação (baseline) para clientes com múltiplas empresas. 
Exemplo: Cliente Anglo pode ter IOB ou NÍQUEL. 
Obrigatório apenas se o cliente tiver segmentacao_baseline = true.';

-- PASSO 2: Criar função para validar segmentação (SIMPLIFICADA)
-- ============================================================================
-- Por enquanto, apenas valida se a empresa existe e está ativa
-- A validação de segmentação será feita no frontend
CREATE OR REPLACE FUNCTION validate_empresa_segmentacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  empresa_existe BOOLEAN;
BEGIN
  -- Se empresa_segmentacao_id foi informado, validar se existe e está ativa
  IF NEW.empresa_segmentacao_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM empresas_clientes
      WHERE id = NEW.empresa_segmentacao_id
        AND ativo = true
    ) INTO empresa_existe;
    
    IF NOT empresa_existe THEN
      RAISE EXCEPTION 'Empresa de segmentação não existe ou está inativa';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validate_empresa_segmentacao() IS 
'Valida se a empresa de segmentação existe e está ativa.
Usa SECURITY DEFINER e search_path fixo para segurança.';

-- PASSO 3: Criar trigger para validação
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_validate_empresa_segmentacao ON requerimentos;

CREATE TRIGGER trigger_validate_empresa_segmentacao
  BEFORE INSERT OR UPDATE ON requerimentos
  FOR EACH ROW
  EXECUTE FUNCTION validate_empresa_segmentacao();

-- PASSO 4: Atualizar view de requerimentos (SIMPLIFICADA)
-- ============================================================================
-- Recriar view para incluir informações da empresa de segmentação
DROP VIEW IF EXISTS vw_requerimentos_completo CASCADE;

CREATE OR REPLACE VIEW vw_requerimentos_completo AS
SELECT 
  r.*,
  ec.nome_abreviado as cliente_nome,
  es.nome_abreviado as empresa_segmentacao_nome
FROM requerimentos r
LEFT JOIN empresas_clientes ec ON r.cliente_id = ec.id
LEFT JOIN empresas_clientes es ON r.empresa_segmentacao_id = es.id;

COMMENT ON VIEW vw_requerimentos_completo IS 
'View completa de requerimentos incluindo informações do cliente e empresa de segmentação';

-- PASSO 5: Verificação final
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== MIGRATION CONCLUÍDA ===';
  RAISE NOTICE '✅ Coluna empresa_segmentacao_id adicionada';
  RAISE NOTICE '✅ Índice criado para performance';
  RAISE NOTICE '✅ Função de validação criada';
  RAISE NOTICE '✅ Trigger de validação ativado';
  RAISE NOTICE '✅ View atualizada';
  RAISE NOTICE '';
  RAISE NOTICE '📋 PRÓXIMOS PASSOS:';
  RAISE NOTICE '1. Atualizar tipos TypeScript';
  RAISE NOTICE '2. Atualizar formulários de requerimentos';
  RAISE NOTICE '3. Atualizar visão segmentada';
  RAISE NOTICE '';
END $$;

-- PASSO 6: Dados de exemplo (opcional - comentado)
-- ============================================================================
-- Descomentar para testar com dados de exemplo
/*
-- Exemplo: Atualizar requerimentos existentes da Anglo para IOB
UPDATE requerimentos
SET empresa_segmentacao_id = (
  SELECT id FROM empresas_clientes 
  WHERE nome_abreviado = 'IOB' 
  LIMIT 1
)
WHERE cliente_id = (
  SELECT id FROM empresas_clientes 
  WHERE nome_abreviado = 'ANGLO' 
  LIMIT 1
)
AND empresa_segmentacao_id IS NULL;
*/
