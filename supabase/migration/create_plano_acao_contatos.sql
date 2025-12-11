-- =====================================================
-- MIGRAÇÃO: Criar tabela de contatos do plano de ação
-- =====================================================
-- Descrição: Cria tabela para armazenar múltiplos contatos
--            com o cliente para cada plano de ação
-- Data: 2025-12-10
-- =====================================================

-- Passo 1: Criar tabela plano_acao_contatos
CREATE TABLE IF NOT EXISTS plano_acao_contatos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plano_acao_id UUID NOT NULL REFERENCES planos_acao(id) ON DELETE CASCADE,
  data_contato DATE NOT NULL,
  meio_contato TEXT NOT NULL CHECK (meio_contato IN ('whatsapp', 'email', 'ligacao')),
  resumo_comunicacao TEXT NOT NULL,
  retorno_cliente TEXT CHECK (retorno_cliente IN ('aguardando', 'respondeu', 'solicitou_mais_informacoes')),
  observacoes TEXT,
  criado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Passo 2: Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_plano_acao_contatos_plano_id ON plano_acao_contatos(plano_acao_id);
CREATE INDEX IF NOT EXISTS idx_plano_acao_contatos_data ON plano_acao_contatos(data_contato DESC);

-- Passo 3: Habilitar RLS (Row Level Security)
ALTER TABLE plano_acao_contatos ENABLE ROW LEVEL SECURITY;

-- Passo 4: Criar políticas de segurança
CREATE POLICY "Usuários podem ver contatos dos planos" ON plano_acao_contatos
  FOR SELECT USING (true);

CREATE POLICY "Usuários podem inserir contatos" ON plano_acao_contatos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Usuários podem atualizar contatos" ON plano_acao_contatos
  FOR UPDATE USING (true);

CREATE POLICY "Usuários podem deletar contatos" ON plano_acao_contatos
  FOR DELETE USING (true);

-- Passo 5: Criar trigger para atualizar timestamp
CREATE OR REPLACE FUNCTION update_plano_acao_contatos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_plano_acao_contatos_updated_at
  BEFORE UPDATE ON plano_acao_contatos
  FOR EACH ROW
  EXECUTE FUNCTION update_plano_acao_contatos_updated_at();

-- Passo 6: Comentários explicativos
COMMENT ON TABLE plano_acao_contatos IS 'Histórico de contatos com cliente para cada plano de ação';
COMMENT ON COLUMN plano_acao_contatos.plano_acao_id IS 'ID do plano de ação relacionado';
COMMENT ON COLUMN plano_acao_contatos.data_contato IS 'Data do contato com o cliente';
COMMENT ON COLUMN plano_acao_contatos.meio_contato IS 'Meio utilizado para contato (whatsapp, email, ligacao)';
COMMENT ON COLUMN plano_acao_contatos.resumo_comunicacao IS 'Resumo do que foi comunicado';
COMMENT ON COLUMN plano_acao_contatos.retorno_cliente IS 'Status do retorno do cliente';
COMMENT ON COLUMN plano_acao_contatos.observacoes IS 'Observações adicionais sobre o contato';

-- Passo 7: Verificação final
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plano_acao_contatos') THEN
    RAISE NOTICE '✅ Tabela plano_acao_contatos criada com sucesso';
    RAISE NOTICE '   - Políticas RLS configuradas';
    RAISE NOTICE '   - Triggers de timestamp criados';
    RAISE NOTICE '   - Índices para performance criados';
  ELSE
    RAISE NOTICE '❌ Erro ao criar tabela plano_acao_contatos';
  END IF;
END $$;