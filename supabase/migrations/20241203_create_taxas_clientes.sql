-- =====================================================
-- MIGRATION: TAXAS DE CLIENTES
-- =====================================================
-- Criação das tabelas para gerenciamento de taxas de clientes
-- com valores por função e tipo de hora (remota/local)

-- Tabela principal de taxas
CREATE TABLE IF NOT EXISTS taxas_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES empresas_clientes(id) ON DELETE CASCADE,
  vigencia_inicio DATE NOT NULL,
  vigencia_fim DATE,
  tipo_produto TEXT NOT NULL CHECK (tipo_produto IN ('GALLERY', 'OUTROS')),
  criado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de valores por função
CREATE TABLE IF NOT EXISTS valores_taxas_funcoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taxa_id UUID NOT NULL REFERENCES taxas_clientes(id) ON DELETE CASCADE,
  funcao TEXT NOT NULL CHECK (funcao IN (
    'Funcional',
    'Técnico / ABAP',
    'DBA / Basis',
    'Gestor',
    'Técnico (Instalação / Atualização)',
    'ABAP - PL/SQL',
    'DBA'
  )),
  tipo_hora TEXT NOT NULL CHECK (tipo_hora IN ('remota', 'local')),
  valor_base DECIMAL(10, 2) NOT NULL DEFAULT 0,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(taxa_id, funcao, tipo_hora)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_taxas_clientes_cliente_id ON taxas_clientes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_taxas_clientes_vigencia ON taxas_clientes(vigencia_inicio, vigencia_fim);
CREATE INDEX IF NOT EXISTS idx_valores_taxas_taxa_id ON valores_taxas_funcoes(taxa_id);

-- Trigger para atualizar atualizado_em automaticamente
CREATE OR REPLACE FUNCTION update_taxas_clientes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_taxas_clientes_updated_at
  BEFORE UPDATE ON taxas_clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_taxas_clientes_updated_at();

CREATE TRIGGER trigger_update_valores_taxas_updated_at
  BEFORE UPDATE ON valores_taxas_funcoes
  FOR EACH ROW
  EXECUTE FUNCTION update_taxas_clientes_updated_at();

-- Comentários nas tabelas
COMMENT ON TABLE taxas_clientes IS 'Tabela de taxas de clientes com vigência';
COMMENT ON TABLE valores_taxas_funcoes IS 'Valores base por função e tipo de hora (remota/local)';

-- Comentários nas colunas
COMMENT ON COLUMN taxas_clientes.tipo_produto IS 'Tipo de produto: GALLERY ou OUTROS (define quais funções serão usadas)';
COMMENT ON COLUMN taxas_clientes.vigencia_inicio IS 'Data de início da vigência da taxa';
COMMENT ON COLUMN taxas_clientes.vigencia_fim IS 'Data de fim da vigência (NULL = vigência indefinida)';
COMMENT ON COLUMN valores_taxas_funcoes.funcao IS 'Função do profissional (varia conforme tipo_produto)';
COMMENT ON COLUMN valores_taxas_funcoes.tipo_hora IS 'Tipo de hora: remota ou local';
COMMENT ON COLUMN valores_taxas_funcoes.valor_base IS 'Valor base da hora (Seg-Sex 08h30-17h30) - demais valores são calculados';

-- RLS (Row Level Security)
ALTER TABLE taxas_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE valores_taxas_funcoes ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
-- Permitir leitura para usuários autenticados
CREATE POLICY "Permitir leitura de taxas para usuários autenticados"
  ON taxas_clientes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Permitir leitura de valores para usuários autenticados"
  ON valores_taxas_funcoes FOR SELECT
  TO authenticated
  USING (true);

-- Permitir inserção para usuários autenticados
CREATE POLICY "Permitir inserção de taxas para usuários autenticados"
  ON taxas_clientes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir inserção de valores para usuários autenticados"
  ON valores_taxas_funcoes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Permitir atualização para usuários autenticados
CREATE POLICY "Permitir atualização de taxas para usuários autenticados"
  ON taxas_clientes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir atualização de valores para usuários autenticados"
  ON valores_taxas_funcoes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Permitir exclusão para usuários autenticados
CREATE POLICY "Permitir exclusão de taxas para usuários autenticados"
  ON taxas_clientes FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Permitir exclusão de valores para usuários autenticados"
  ON valores_taxas_funcoes FOR DELETE
  TO authenticated
  USING (true);
