-- =====================================================
-- Migration: Criar tabela apontamentos_tickets_aranda
-- Descrição: Tabela para sincronizar tickets abertos do SQL Server (AMSticketsabertos)
-- Data: 2026-01-26
-- =====================================================

-- =====================================================
-- PARTE 1: Criar tabela apontamentos_tickets_aranda
-- =====================================================

CREATE TABLE IF NOT EXISTS apontamentos_tickets_aranda (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identificação do Ticket
  nro_solicitacao VARCHAR(50) NOT NULL,
  cod_tipo VARCHAR(50),
  ticket_externo VARCHAR(100),
  numero_pai VARCHAR(50),
  caso_pai VARCHAR(100),
  
  -- Organização e Cliente
  organizacao VARCHAR(100),
  empresa VARCHAR(100),
  cliente VARCHAR(100),
  usuario_final VARCHAR(100),
  
  -- Descrição
  resumo TEXT,
  descricao TEXT,
  
  -- Pessoas Envolvidas
  autor VARCHAR(100),
  solicitante VARCHAR(100),
  nome_grupo VARCHAR(100),
  nome_responsavel VARCHAR(100),
  
  -- Categorização
  categoria VARCHAR(100),
  item_configuracao VARCHAR(200),
  
  -- Datas Principais
  data_abertura TIMESTAMP WITH TIME ZONE,
  data_solucao TIMESTAMP WITH TIME ZONE,
  data_fechamento TIMESTAMP WITH TIME ZONE,
  data_ultima_modificacao TIMESTAMP WITH TIME ZONE,
  ultima_modificacao TEXT,
  
  -- Datas Adicionais
  data_prevista_entrega TIMESTAMP WITH TIME ZONE,
  data_aprovacao TIMESTAMP WITH TIME ZONE,
  data_real_entrega TIMESTAMP WITH TIME ZONE,
  data_ultima_nota TIMESTAMP WITH TIME ZONE,
  data_ultimo_comentario TIMESTAMP WITH TIME ZONE,
  
  -- Status e Prioridade
  status VARCHAR(50),
  prioridade VARCHAR(50),
  urgencia VARCHAR(50),
  impacto VARCHAR(50),
  chamado_reaberto VARCHAR(10),
  
  -- Informações Técnicas
  criado_via VARCHAR(50),
  relatado TEXT,
  solucao TEXT,
  causa_raiz TEXT,
  desc_ultima_nota TEXT,
  desc_ultimo_comentario TEXT,
  log TEXT,
  
  -- Tempo Gasto
  tempo_gasto_dias INTEGER,
  tempo_gasto_horas INTEGER,
  tempo_gasto_minutos INTEGER,
  
  -- Código de Resolução
  cod_resolucao VARCHAR(50),
  
  -- SLA
  violacao_sla VARCHAR(10),
  tda_cumprido VARCHAR(10),
  tds_cumprido VARCHAR(10),
  data_prevista_tda TIMESTAMP WITH TIME ZONE,
  data_prevista_tds TIMESTAMP WITH TIME ZONE,
  tempo_restante_tda VARCHAR(50),
  tempo_restante_tds VARCHAR(50),
  tempo_restante_tds_em_minutos INTEGER,
  tempo_real_tda VARCHAR(50),
  
  -- Orçamento
  total_orcamento DECIMAL(10,2),
  
  -- Metadados de Sincronização
  data_sincronizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint para evitar duplicatas
  CONSTRAINT unique_ticket_aranda UNIQUE(nro_solicitacao, data_abertura)
);

-- =====================================================
-- PARTE 2: Comentários para documentação
-- =====================================================

COMMENT ON TABLE apontamentos_tickets_aranda IS 'Tickets abertos sincronizados do SQL Server (AMSticketsabertos) - dados desde 01/01/2026';

-- Identificação
COMMENT ON COLUMN apontamentos_tickets_aranda.nro_solicitacao IS 'Número da solicitação/ticket';
COMMENT ON COLUMN apontamentos_tickets_aranda.cod_tipo IS 'Código do tipo de ticket';
COMMENT ON COLUMN apontamentos_tickets_aranda.ticket_externo IS 'Número do ticket externo';
COMMENT ON COLUMN apontamentos_tickets_aranda.numero_pai IS 'Número do ticket pai';
COMMENT ON COLUMN apontamentos_tickets_aranda.caso_pai IS 'Caso pai relacionado';

-- Organização
COMMENT ON COLUMN apontamentos_tickets_aranda.organizacao IS 'Organização responsável';
COMMENT ON COLUMN apontamentos_tickets_aranda.empresa IS 'Empresa cliente';
COMMENT ON COLUMN apontamentos_tickets_aranda.cliente IS 'Nome do cliente';
COMMENT ON COLUMN apontamentos_tickets_aranda.usuario_final IS 'Usuário final que reportou';

-- Descrição
COMMENT ON COLUMN apontamentos_tickets_aranda.resumo IS 'Resumo do ticket';
COMMENT ON COLUMN apontamentos_tickets_aranda.descricao IS 'Descrição detalhada do ticket';

-- Pessoas
COMMENT ON COLUMN apontamentos_tickets_aranda.autor IS 'Autor do ticket';
COMMENT ON COLUMN apontamentos_tickets_aranda.solicitante IS 'Solicitante do ticket';
COMMENT ON COLUMN apontamentos_tickets_aranda.nome_grupo IS 'Grupo responsável';
COMMENT ON COLUMN apontamentos_tickets_aranda.nome_responsavel IS 'Responsável pelo atendimento';

-- Categorização
COMMENT ON COLUMN apontamentos_tickets_aranda.categoria IS 'Categoria do ticket';
COMMENT ON COLUMN apontamentos_tickets_aranda.item_configuracao IS 'Item de configuração relacionado';

-- Datas
COMMENT ON COLUMN apontamentos_tickets_aranda.data_abertura IS 'Data de abertura do ticket';
COMMENT ON COLUMN apontamentos_tickets_aranda.data_solucao IS 'Data de solução do ticket';
COMMENT ON COLUMN apontamentos_tickets_aranda.data_fechamento IS 'Data de fechamento do ticket';
COMMENT ON COLUMN apontamentos_tickets_aranda.data_ultima_modificacao IS 'Data da última modificação';
COMMENT ON COLUMN apontamentos_tickets_aranda.data_prevista_entrega IS 'Data prevista para entrega';
COMMENT ON COLUMN apontamentos_tickets_aranda.data_aprovacao IS 'Data de aprovação (somente se aprovado)';
COMMENT ON COLUMN apontamentos_tickets_aranda.data_real_entrega IS 'Data real da entrega';
COMMENT ON COLUMN apontamentos_tickets_aranda.data_ultima_nota IS 'Data da última nota adicionada';
COMMENT ON COLUMN apontamentos_tickets_aranda.data_ultimo_comentario IS 'Data do último comentário';

-- Status
COMMENT ON COLUMN apontamentos_tickets_aranda.status IS 'Status atual do ticket';
COMMENT ON COLUMN apontamentos_tickets_aranda.prioridade IS 'Prioridade do ticket';
COMMENT ON COLUMN apontamentos_tickets_aranda.urgencia IS 'Urgência do ticket';
COMMENT ON COLUMN apontamentos_tickets_aranda.impacto IS 'Impacto do ticket';
COMMENT ON COLUMN apontamentos_tickets_aranda.chamado_reaberto IS 'Indica se o chamado foi reaberto';

-- Informações Técnicas
COMMENT ON COLUMN apontamentos_tickets_aranda.criado_via IS 'Canal de criação do ticket';
COMMENT ON COLUMN apontamentos_tickets_aranda.relatado IS 'Problema relatado';
COMMENT ON COLUMN apontamentos_tickets_aranda.solucao IS 'Solução aplicada';
COMMENT ON COLUMN apontamentos_tickets_aranda.causa_raiz IS 'Causa raiz identificada';
COMMENT ON COLUMN apontamentos_tickets_aranda.desc_ultima_nota IS 'Descrição da última nota';
COMMENT ON COLUMN apontamentos_tickets_aranda.desc_ultimo_comentario IS 'Descrição do último comentário';
COMMENT ON COLUMN apontamentos_tickets_aranda.log IS 'Log de atividades do ticket';

-- Tempo
COMMENT ON COLUMN apontamentos_tickets_aranda.tempo_gasto_dias IS 'Tempo gasto em dias';
COMMENT ON COLUMN apontamentos_tickets_aranda.tempo_gasto_horas IS 'Tempo gasto em horas';
COMMENT ON COLUMN apontamentos_tickets_aranda.tempo_gasto_minutos IS 'Tempo gasto em minutos';

-- Resolução
COMMENT ON COLUMN apontamentos_tickets_aranda.cod_resolucao IS 'Código de resolução do ticket';

-- SLA
COMMENT ON COLUMN apontamentos_tickets_aranda.violacao_sla IS 'Indica se houve violação de SLA';
COMMENT ON COLUMN apontamentos_tickets_aranda.tda_cumprido IS 'Indica se TDA foi cumprido';
COMMENT ON COLUMN apontamentos_tickets_aranda.tds_cumprido IS 'Indica se TDS foi cumprido';
COMMENT ON COLUMN apontamentos_tickets_aranda.data_prevista_tda IS 'Data prevista para TDA';
COMMENT ON COLUMN apontamentos_tickets_aranda.data_prevista_tds IS 'Data prevista para TDS';
COMMENT ON COLUMN apontamentos_tickets_aranda.tempo_restante_tda IS 'Tempo restante para TDA';
COMMENT ON COLUMN apontamentos_tickets_aranda.tempo_restante_tds IS 'Tempo restante para TDS';
COMMENT ON COLUMN apontamentos_tickets_aranda.tempo_restante_tds_em_minutos IS 'Tempo restante TDS em minutos (soma)';
COMMENT ON COLUMN apontamentos_tickets_aranda.tempo_real_tda IS 'Tempo real de TDA';

-- Orçamento
COMMENT ON COLUMN apontamentos_tickets_aranda.total_orcamento IS 'Total do orçamento em decimais';

-- Metadados
COMMENT ON COLUMN apontamentos_tickets_aranda.data_sincronizacao IS 'Data da última sincronização com SQL Server';

-- =====================================================
-- PARTE 3: Índices para performance
-- =====================================================

-- Índice para busca por número de solicitação
CREATE INDEX IF NOT EXISTS idx_tickets_aranda_nro_solicitacao 
ON apontamentos_tickets_aranda(nro_solicitacao);

-- Índice para busca por empresa
CREATE INDEX IF NOT EXISTS idx_tickets_aranda_empresa 
ON apontamentos_tickets_aranda(empresa);

-- Índice para busca por data de abertura
CREATE INDEX IF NOT EXISTS idx_tickets_aranda_data_abertura 
ON apontamentos_tickets_aranda(data_abertura DESC);

-- Índice para busca por status
CREATE INDEX IF NOT EXISTS idx_tickets_aranda_status 
ON apontamentos_tickets_aranda(status);

-- Índice para busca por grupo responsável
CREATE INDEX IF NOT EXISTS idx_tickets_aranda_grupo 
ON apontamentos_tickets_aranda(nome_grupo);

-- Índice para busca por responsável
CREATE INDEX IF NOT EXISTS idx_tickets_aranda_responsavel 
ON apontamentos_tickets_aranda(nome_responsavel);

-- Índice para busca por data de sincronização
CREATE INDEX IF NOT EXISTS idx_tickets_aranda_data_sincronizacao 
ON apontamentos_tickets_aranda(data_sincronizacao DESC);

-- Índice composto para busca por empresa e período
CREATE INDEX IF NOT EXISTS idx_tickets_aranda_empresa_periodo 
ON apontamentos_tickets_aranda(empresa, data_abertura DESC);

-- Índice para busca por código de resolução
CREATE INDEX IF NOT EXISTS idx_tickets_aranda_cod_resolucao 
ON apontamentos_tickets_aranda(cod_resolucao);

-- =====================================================
-- PARTE 4: Políticas RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS
ALTER TABLE apontamentos_tickets_aranda ENABLE ROW LEVEL SECURITY;

-- Política para leitura (SELECT) - usuários autenticados
CREATE POLICY "Usuários autenticados podem visualizar tickets"
ON apontamentos_tickets_aranda
FOR SELECT
TO authenticated
USING (true);

-- Política para service_role (acesso total para sincronização)
CREATE POLICY "Service role tem acesso total"
ON apontamentos_tickets_aranda
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- PARTE 5: Trigger para atualizar updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_apontamentos_tickets_aranda_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_apontamentos_tickets_aranda_updated_at
BEFORE UPDATE ON apontamentos_tickets_aranda
FOR EACH ROW
EXECUTE FUNCTION update_apontamentos_tickets_aranda_updated_at();

-- =====================================================
-- PARTE 6: Verificação
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'apontamentos_tickets_aranda'
  ) THEN
    RAISE NOTICE '✅ Tabela apontamentos_tickets_aranda criada com sucesso!';
    RAISE NOTICE '   - Sincroniza dados da tabela AMSticketsabertos do SQL Server';
    RAISE NOTICE '   - Dados desde 01/01/2026';
    RAISE NOTICE '   - % índices criados para performance', (
      SELECT COUNT(*) FROM pg_indexes 
      WHERE tablename = 'apontamentos_tickets_aranda'
    );
    RAISE NOTICE '   - RLS habilitado com políticas de segurança';
    RAISE NOTICE '   - Trigger de updated_at configurado';
  ELSE
    RAISE WARNING '⚠️ Erro ao criar tabela apontamentos_tickets_aranda';
  END IF;
END $$;
