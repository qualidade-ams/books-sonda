-- =====================================================
-- MIGRAÇÃO: Criar tabela de elogios
-- =====================================================
-- Descrição: Cria tabela separada para gerenciar elogios
--            Similar à estrutura de planos_acao
-- Data: 2025-11-27
-- =====================================================

-- Passo 1: Criar tabela elogios
CREATE TABLE IF NOT EXISTS elogios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamento com pesquisa
  pesquisa_id UUID NOT NULL REFERENCES pesquisas_satisfacao(id) ON DELETE CASCADE,
  
  -- Informações básicas
  chamado TEXT,
  empresa_id UUID REFERENCES empresas_clientes(id),
  data_resposta DATE, -- Copiada da pesquisa para facilitar filtros
  
  -- Detalhes do elogio
  observacao TEXT,
  acao_tomada TEXT, -- Ação tomada em resposta ao elogio
  compartilhado_com TEXT, -- Com quem o elogio foi compartilhado
  
  -- Status
  status TEXT DEFAULT 'registrado' CHECK (status IN ('registrado', 'compartilhado', 'arquivado')),
  
  -- Auditoria
  criado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: Um elogio por pesquisa
  CONSTRAINT unique_elogio_por_pesquisa UNIQUE (pesquisa_id)
);

-- Passo 2: Comentários explicativos
COMMENT ON TABLE elogios IS 'Tabela para gerenciar elogios de clientes';
COMMENT ON COLUMN elogios.pesquisa_id IS 'Referência à pesquisa de satisfação';
COMMENT ON COLUMN elogios.chamado IS 'Número do chamado relacionado';
COMMENT ON COLUMN elogios.empresa_id IS 'Empresa cliente relacionada';
COMMENT ON COLUMN elogios.data_resposta IS 'Data de resposta da pesquisa (copiada para facilitar filtros)';
COMMENT ON COLUMN elogios.observacao IS 'Observações sobre o elogio';
COMMENT ON COLUMN elogios.acao_tomada IS 'Ação tomada em resposta ao elogio';
COMMENT ON COLUMN elogios.compartilhado_com IS 'Com quem o elogio foi compartilhado';
COMMENT ON COLUMN elogios.status IS 'Status do elogio: registrado, compartilhado, arquivado';

-- Passo 3: Criar índices
CREATE INDEX IF NOT EXISTS idx_elogios_pesquisa_id ON elogios(pesquisa_id);
CREATE INDEX IF NOT EXISTS idx_elogios_empresa_id ON elogios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_elogios_data_resposta ON elogios(data_resposta);
CREATE INDEX IF NOT EXISTS idx_elogios_status ON elogios(status);
CREATE INDEX IF NOT EXISTS idx_elogios_criado_em ON elogios(criado_em DESC);

-- Índice composto para filtros por data e status
CREATE INDEX IF NOT EXISTS idx_elogios_data_status ON elogios(data_resposta, status);

-- Passo 4: Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION atualizar_elogios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_atualizar_elogios_updated_at ON elogios;

CREATE TRIGGER trigger_atualizar_elogios_updated_at
  BEFORE UPDATE ON elogios
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_elogios_updated_at();

-- Passo 5: Criar função para preencher data_resposta automaticamente
CREATE OR REPLACE FUNCTION atualizar_data_resposta_elogio()
RETURNS TRIGGER AS $$
BEGIN
  -- Buscar data_resposta da pesquisa relacionada
  SELECT data_resposta INTO NEW.data_resposta
  FROM pesquisas_satisfacao
  WHERE id = NEW.pesquisa_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_atualizar_data_resposta_elogio ON elogios;

CREATE TRIGGER trigger_atualizar_data_resposta_elogio
  BEFORE INSERT OR UPDATE OF pesquisa_id ON elogios
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_data_resposta_elogio();

-- Passo 6: Criar tabela de histórico de elogios
CREATE TABLE IF NOT EXISTS elogios_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elogio_id UUID NOT NULL REFERENCES elogios(id) ON DELETE CASCADE,
  data_atualizacao TIMESTAMPTZ DEFAULT NOW(),
  usuario_id UUID REFERENCES auth.users(id),
  usuario_nome TEXT,
  descricao_atualizacao TEXT NOT NULL,
  tipo_atualizacao TEXT CHECK (tipo_atualizacao IN ('criacao', 'atualizacao', 'compartilhamento', 'arquivamento')),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Comentários para histórico
COMMENT ON TABLE elogios_historico IS 'Histórico de alterações nos elogios';
COMMENT ON COLUMN elogios_historico.elogio_id IS 'Referência ao elogio';
COMMENT ON COLUMN elogios_historico.tipo_atualizacao IS 'Tipo de atualização: criacao, atualizacao, compartilhamento, arquivamento';

-- Índices para histórico
CREATE INDEX IF NOT EXISTS idx_elogios_historico_elogio_id ON elogios_historico(elogio_id);
CREATE INDEX IF NOT EXISTS idx_elogios_historico_data ON elogios_historico(data_atualizacao DESC);

-- Passo 7: Migrar dados existentes de pesquisas com status 'enviado_elogios'
INSERT INTO elogios (pesquisa_id, data_resposta, criado_em, atualizado_em)
SELECT 
  id as pesquisa_id,
  data_resposta,
  created_at as criado_em,
  updated_at as atualizado_em
FROM pesquisas_satisfacao
WHERE status = 'enviado_elogios'
ON CONFLICT (pesquisa_id) DO NOTHING;

-- Passo 8: Habilitar RLS (Row Level Security)
ALTER TABLE elogios ENABLE ROW LEVEL SECURITY;
ALTER TABLE elogios_historico ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas (ajustar conforme necessário)
-- Remover políticas existentes antes de recriar
DROP POLICY IF EXISTS "Permitir leitura de elogios para usuários autenticados" ON elogios;
DROP POLICY IF EXISTS "Permitir inserção de elogios para usuários autenticados" ON elogios;
DROP POLICY IF EXISTS "Permitir atualização de elogios para usuários autenticados" ON elogios;
DROP POLICY IF EXISTS "Permitir exclusão de elogios para usuários autenticados" ON elogios;
DROP POLICY IF EXISTS "Permitir leitura de histórico para usuários autenticados" ON elogios_historico;
DROP POLICY IF EXISTS "Permitir inserção de histórico para usuários autenticados" ON elogios_historico;

CREATE POLICY "Permitir leitura de elogios para usuários autenticados"
  ON elogios FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Permitir inserção de elogios para usuários autenticados"
  ON elogios FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir atualização de elogios para usuários autenticados"
  ON elogios FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Permitir exclusão de elogios para usuários autenticados"
  ON elogios FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para histórico
CREATE POLICY "Permitir leitura de histórico para usuários autenticados"
  ON elogios_historico FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Permitir inserção de histórico para usuários autenticados"
  ON elogios_historico FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Passo 9: Verificação final
DO $$
DECLARE
  total_elogios INTEGER;
  total_historico INTEGER;
BEGIN
  -- Contar totais
  SELECT COUNT(*) INTO total_elogios FROM elogios;
  SELECT COUNT(*) INTO total_historico FROM elogios_historico;
  
  -- Exibir resultados
  RAISE NOTICE '✅ Migração de elogios concluída com sucesso!';
  RAISE NOTICE '📊 Total de elogios criados: %', total_elogios;
  RAISE NOTICE '📋 Total de registros no histórico: %', total_historico;
  RAISE NOTICE '💡 Dados migrados de pesquisas_satisfacao com status = enviado_elogios';
END $$;
