-- Migration: Ajustar estrutura da tabela banco_horas_versoes
-- Data: 2026-01-22
-- Descrição: Adiciona colunas necessárias para o serviço de reajustes funcionar

-- PROBLEMA IDENTIFICADO:
-- O serviço bancoHorasReajustesService.ts está tentando usar colunas que não existem:
-- - empresa_id, mes, ano, versao, reajuste_id, snapshot_calculo, observacao, tipo_alteracao
-- Mas a tabela atual tem: calculo_id, versao_anterior, versao_nova, dados_anteriores, dados_novos, motivo, tipo_mudanca

-- SOLUÇÃO: Adicionar as colunas necessárias mantendo compatibilidade

-- =====================================================
-- PASSO 1: Adicionar colunas necessárias
-- =====================================================

-- Adicionar empresa_id (para facilitar queries)
ALTER TABLE banco_horas_versoes
ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas_clientes(id) ON DELETE CASCADE;

-- Adicionar mes e ano (para facilitar queries por período)
ALTER TABLE banco_horas_versoes
ADD COLUMN IF NOT EXISTS mes INTEGER CHECK (mes BETWEEN 1 AND 12);

ALTER TABLE banco_horas_versoes
ADD COLUMN IF NOT EXISTS ano INTEGER CHECK (ano >= 2020);

-- Adicionar versao (número sequencial por empresa/mes/ano)
ALTER TABLE banco_horas_versoes
ADD COLUMN IF NOT EXISTS versao INTEGER DEFAULT 1;

-- Adicionar reajuste_id (referência ao reajuste que gerou esta versão)
ALTER TABLE banco_horas_versoes
ADD COLUMN IF NOT EXISTS reajuste_id UUID REFERENCES banco_horas_reajustes(id) ON DELETE SET NULL;

-- Adicionar snapshot_calculo (snapshot do cálculo anterior em JSONB)
ALTER TABLE banco_horas_versoes
ADD COLUMN IF NOT EXISTS snapshot_calculo JSONB;

-- Adicionar observacao (observação da mudança)
ALTER TABLE banco_horas_versoes
ADD COLUMN IF NOT EXISTS observacao TEXT;

-- Adicionar tipo_alteracao (tipo de alteração: reajuste, recalculo, etc)
ALTER TABLE banco_horas_versoes
ADD COLUMN IF NOT EXISTS tipo_alteracao VARCHAR(50) CHECK (tipo_alteracao IN ('reajuste', 'recalculo', 'correcao', 'inicial'));

-- =====================================================
-- PASSO 2: Tornar calculo_id opcional (pode não existir ainda)
-- =====================================================
ALTER TABLE banco_horas_versoes
ALTER COLUMN calculo_id DROP NOT NULL;

-- =====================================================
-- PASSO 3: Tornar campos antigos opcionais (para compatibilidade)
-- =====================================================
ALTER TABLE banco_horas_versoes
ALTER COLUMN versao_anterior DROP NOT NULL;

ALTER TABLE banco_horas_versoes
ALTER COLUMN versao_nova DROP NOT NULL;

ALTER TABLE banco_horas_versoes
ALTER COLUMN dados_anteriores DROP NOT NULL;

ALTER TABLE banco_horas_versoes
ALTER COLUMN dados_novos DROP NOT NULL;

ALTER TABLE banco_horas_versoes
ALTER COLUMN motivo DROP NOT NULL;

ALTER TABLE banco_horas_versoes
ALTER COLUMN tipo_mudanca DROP NOT NULL;

ALTER TABLE banco_horas_versoes
ALTER COLUMN created_by DROP NOT NULL;

-- =====================================================
-- PASSO 4: Criar índices para as novas colunas
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_versoes_empresa_periodo 
ON banco_horas_versoes(empresa_id, ano, mes, versao DESC);

CREATE INDEX IF NOT EXISTS idx_versoes_reajuste 
ON banco_horas_versoes(reajuste_id);

CREATE INDEX IF NOT EXISTS idx_versoes_tipo_alteracao 
ON banco_horas_versoes(tipo_alteracao);

-- =====================================================
-- PASSO 5: Atualizar comentários
-- =====================================================
COMMENT ON TABLE banco_horas_versoes IS 
'Histórico de versões do banco de horas com snapshots para auditoria. Suporta versionamento por empresa/período e por cálculo.';

COMMENT ON COLUMN banco_horas_versoes.empresa_id IS 
'ID da empresa (facilita queries por empresa)';

COMMENT ON COLUMN banco_horas_versoes.mes IS 
'Mês do período (1-12)';

COMMENT ON COLUMN banco_horas_versoes.ano IS 
'Ano do período';

COMMENT ON COLUMN banco_horas_versoes.versao IS 
'Número sequencial da versão para esta empresa/período';

COMMENT ON COLUMN banco_horas_versoes.reajuste_id IS 
'ID do reajuste que gerou esta versão (se aplicável)';

COMMENT ON COLUMN banco_horas_versoes.snapshot_calculo IS 
'Snapshot completo do cálculo anterior em formato JSON';

COMMENT ON COLUMN banco_horas_versoes.observacao IS 
'Observação sobre a mudança realizada';

COMMENT ON COLUMN banco_horas_versoes.tipo_alteracao IS 
'Tipo de alteração: reajuste, recalculo, correcao ou inicial';

-- =====================================================
-- PASSO 6: Log de sucesso
-- =====================================================
DO $
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Tabela banco_horas_versoes ajustada com sucesso!';
  RAISE NOTICE '📝 Mudanças aplicadas:';
  RAISE NOTICE '  - Adicionadas colunas: empresa_id, mes, ano, versao';
  RAISE NOTICE '  - Adicionadas colunas: reajuste_id, snapshot_calculo, observacao, tipo_alteracao';
  RAISE NOTICE '  - Campos antigos tornados opcionais para compatibilidade';
  RAISE NOTICE '  - Criados índices para performance';
  RAISE NOTICE '  - Tabela agora suporta dois modelos de versionamento';
  RAISE NOTICE '';
END $;
