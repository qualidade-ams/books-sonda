-- =====================================================
-- Sistema de Requerimentos - Migração Principal
-- =====================================================
-- Criação da tabela requerimentos com todos os campos,
-- constraints, índices e triggers necessários
-- =====================================================

-- Criar tabela requerimentos
CREATE TABLE IF NOT EXISTS requerimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado VARCHAR(50) NOT NULL,
  cliente_id UUID NOT NULL REFERENCES empresas_clientes(id),
  modulo VARCHAR(50) NOT NULL,
  descricao TEXT NOT NULL CHECK (length(descricao) <= 500),
  data_envio DATE NOT NULL,
  data_aprovacao DATE NOT NULL,
  horas_funcional DECIMAL(10,2) NOT NULL DEFAULT 0,
  horas_tecnico DECIMAL(10,2) NOT NULL DEFAULT 0,
  horas_total DECIMAL(10,2) GENERATED ALWAYS AS (horas_funcional + horas_tecnico) STORED,
  linguagem VARCHAR(50) NOT NULL,
  tipo_cobranca VARCHAR(50) NOT NULL,
  mes_cobranca INTEGER NOT NULL CHECK (mes_cobranca >= 1 AND mes_cobranca <= 12),
  observacao TEXT CHECK (length(observacao) <= 1000),
  status VARCHAR(20) NOT NULL DEFAULT 'lancado',
  enviado_faturamento BOOLEAN NOT NULL DEFAULT FALSE,
  data_envio_faturamento TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints de validação
  CONSTRAINT valid_chamado CHECK (chamado ~ '^[A-Za-z0-9\-]+$'),
  CONSTRAINT valid_modulo CHECK (modulo IN ('Comply', 'Comply e-DOCS', 'pw.SATI', 'pw.SPED', 'pw.SATI/pw.SPED')),
  CONSTRAINT valid_linguagem CHECK (linguagem IN ('ABAP', 'DBA', 'Funcional', 'PL/SQL', 'Técnico')),
  CONSTRAINT valid_cobranca CHECK (tipo_cobranca IN ('Banco de Horas', 'Cobro Interno', 'Contrato', 'Faturado', 'Hora Extra', 'Sobreaviso', 'Reprovado', 'Bolsão Enel')),
  CONSTRAINT valid_status CHECK (status IN ('lancado', 'enviado_faturamento', 'faturado')),
  CONSTRAINT valid_horas CHECK (horas_funcional >= 0 AND horas_tecnico >= 0),
  CONSTRAINT valid_datas CHECK (data_aprovacao >= data_envio)
);

-- Comentários na tabela e colunas
COMMENT ON TABLE requerimentos IS 'Tabela para armazenar requerimentos de especificações funcionais';
COMMENT ON COLUMN requerimentos.chamado IS 'Número do chamado (formato: RF-6017993)';
COMMENT ON COLUMN requerimentos.cliente_id IS 'Referência para empresa cliente';
COMMENT ON COLUMN requerimentos.modulo IS 'Módulo do sistema (Comply, pw.SATI, etc.)';
COMMENT ON COLUMN requerimentos.descricao IS 'Descrição do requerimento (máx. 500 caracteres)';
COMMENT ON COLUMN requerimentos.horas_funcional IS 'Horas funcionais do requerimento';
COMMENT ON COLUMN requerimentos.horas_tecnico IS 'Horas técnicas do requerimento';
COMMENT ON COLUMN requerimentos.horas_total IS 'Total de horas (calculado automaticamente)';
COMMENT ON COLUMN requerimentos.linguagem IS 'Linguagem/tipo técnico (ABAP, DBA, etc.)';
COMMENT ON COLUMN requerimentos.tipo_cobranca IS 'Tipo de cobrança do requerimento';
COMMENT ON COLUMN requerimentos.mes_cobranca IS 'Mês de cobrança (1-12)';
COMMENT ON COLUMN requerimentos.observacao IS 'Observações adicionais (máx. 1000 caracteres)';
COMMENT ON COLUMN requerimentos.status IS 'Status do requerimento';
COMMENT ON COLUMN requerimentos.enviado_faturamento IS 'Indica se foi enviado para faturamento';
COMMENT ON COLUMN requerimentos.data_envio_faturamento IS 'Data/hora do envio para faturamento';

-- Índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_requerimentos_cliente_id ON requerimentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_requerimentos_status ON requerimentos(status);
CREATE INDEX IF NOT EXISTS idx_requerimentos_mes_cobranca ON requerimentos(mes_cobranca);
CREATE INDEX IF NOT EXISTS idx_requerimentos_tipo_cobranca ON requerimentos(tipo_cobranca);
CREATE INDEX IF NOT EXISTS idx_requerimentos_created_at ON requerimentos(created_at);
CREATE INDEX IF NOT EXISTS idx_requerimentos_enviado_faturamento ON requerimentos(enviado_faturamento);
CREATE INDEX IF NOT EXISTS idx_requerimentos_data_envio_faturamento ON requerimentos(data_envio_faturamento);

-- Índice composto para consultas de faturamento
CREATE INDEX IF NOT EXISTS idx_requerimentos_faturamento_mes ON requerimentos(enviado_faturamento, mes_cobranca, tipo_cobranca);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_requerimentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger existente se houver e criar novo
DROP TRIGGER IF EXISTS trigger_update_requerimentos_updated_at ON requerimentos;
CREATE TRIGGER trigger_update_requerimentos_updated_at
  BEFORE UPDATE ON requerimentos
  FOR EACH ROW
  EXECUTE FUNCTION update_requerimentos_updated_at();

-- Verificação da estrutura criada
DO $$
BEGIN
  -- Verificar se a tabela foi criada
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'requerimentos') THEN
    RAISE NOTICE 'Tabela requerimentos criada com sucesso';
  ELSE
    RAISE EXCEPTION 'Erro: Tabela requerimentos não foi criada';
  END IF;
  
  -- Verificar se os índices foram criados
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'requerimentos' AND indexname = 'idx_requerimentos_cliente_id') THEN
    RAISE NOTICE 'Índices criados com sucesso';
  ELSE
    RAISE EXCEPTION 'Erro: Índices não foram criados corretamente';
  END IF;
  
  -- Verificar se o trigger foi criado
  IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_update_requerimentos_updated_at') THEN
    RAISE NOTICE 'Trigger de updated_at criado com sucesso';
  ELSE
    RAISE EXCEPTION 'Erro: Trigger não foi criado';
  END IF;
  
  RAISE NOTICE 'Migração do sistema de requerimentos concluída com sucesso!';
END $$;