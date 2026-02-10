-- =====================================================
-- Migration: Adicionar Campos de SLA
-- Data: 2026-02-10
-- Descrição: Adiciona campos meta_sla_percentual e 
--            quantidade_minima_chamados_sla à tabela empresas_clientes
-- =====================================================

-- 1. Adicionar campo meta_sla_percentual
ALTER TABLE empresas_clientes
  ADD COLUMN IF NOT EXISTS meta_sla_percentual DECIMAL(5,2) 
  CHECK (meta_sla_percentual >= 0 AND meta_sla_percentual <= 100);

-- 2. Adicionar campo quantidade_minima_chamados_sla
ALTER TABLE empresas_clientes
  ADD COLUMN IF NOT EXISTS quantidade_minima_chamados_sla INTEGER
  CHECK (quantidade_minima_chamados_sla >= 0);

-- 3. Comentários explicativos
COMMENT ON COLUMN empresas_clientes.meta_sla_percentual IS 
'Porcentagem mínima de SLA a considerar para não contar como estouro do atendimento (0-100).
Exemplo: 95.00 significa que 95% dos chamados devem estar dentro do SLA.';

COMMENT ON COLUMN empresas_clientes.quantidade_minima_chamados_sla IS 
'Quantidade mínima de chamados abertos para considerar o estouro do SLA.
Exemplo: 10 significa que só considera estouro se houver pelo menos 10 chamados.';

-- 4. Criar índice para consultas de SLA
CREATE INDEX IF NOT EXISTS idx_empresas_clientes_sla 
ON empresas_clientes(meta_sla_percentual, quantidade_minima_chamados_sla)
WHERE meta_sla_percentual IS NOT NULL;

COMMENT ON INDEX idx_empresas_clientes_sla IS 
'Índice para otimizar consultas de empresas com metas de SLA configuradas.';

-- 5. Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Migration concluída com sucesso!';
  RAISE NOTICE '📊 Campos adicionados:';
  RAISE NOTICE '   - meta_sla_percentual (DECIMAL 0-100)';
  RAISE NOTICE '   - quantidade_minima_chamados_sla (INTEGER >= 0)';
  RAISE NOTICE '🔍 Índice criado: idx_empresas_clientes_sla';
END $$;
