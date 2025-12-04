-- =====================================================
-- MIGRATION: CRIAR TABELA DE TAXAS PADRÃO
-- =====================================================

-- Criar tabela de taxas padrão
CREATE TABLE IF NOT EXISTS taxas_padrao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_produto TEXT NOT NULL CHECK (tipo_produto IN ('GALLERY', 'OUTROS')),
  
  -- Valores Hora Remota
  valor_remota_funcional DECIMAL(10, 2) NOT NULL DEFAULT 0,
  valor_remota_tecnico DECIMAL(10, 2) NOT NULL DEFAULT 0,
  valor_remota_abap DECIMAL(10, 2) DEFAULT 0,
  valor_remota_dba DECIMAL(10, 2) NOT NULL DEFAULT 0,
  valor_remota_gestor DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Valores Hora Local
  valor_local_funcional DECIMAL(10, 2) NOT NULL DEFAULT 0,
  valor_local_tecnico DECIMAL(10, 2) NOT NULL DEFAULT 0,
  valor_local_abap DECIMAL(10, 2) DEFAULT 0,
  valor_local_dba DECIMAL(10, 2) NOT NULL DEFAULT 0,
  valor_local_gestor DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Auditoria
  criado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Garantir apenas uma taxa padrão por tipo de produto
  UNIQUE(tipo_produto)
);

-- Comentários
COMMENT ON TABLE taxas_padrao IS 'Taxas padrão aplicadas automaticamente para clientes sem AMS';
COMMENT ON COLUMN taxas_padrao.tipo_produto IS 'Tipo de produto: GALLERY ou OUTROS';
COMMENT ON COLUMN taxas_padrao.valor_remota_funcional IS 'Valor base hora remota para função Funcional';
COMMENT ON COLUMN taxas_padrao.valor_remota_tecnico IS 'Valor base hora remota para função Técnico';
COMMENT ON COLUMN taxas_padrao.valor_remota_abap IS 'Valor base hora remota para função ABAP';
COMMENT ON COLUMN taxas_padrao.valor_remota_dba IS 'Valor base hora remota para função DBA';
COMMENT ON COLUMN taxas_padrao.valor_remota_gestor IS 'Valor base hora remota para função Gestor';
COMMENT ON COLUMN taxas_padrao.valor_local_funcional IS 'Valor base hora local para função Funcional';
COMMENT ON COLUMN taxas_padrao.valor_local_tecnico IS 'Valor base hora local para função Técnico';
COMMENT ON COLUMN taxas_padrao.valor_local_abap IS 'Valor base hora local para função ABAP';
COMMENT ON COLUMN taxas_padrao.valor_local_dba IS 'Valor base hora local para função DBA';
COMMENT ON COLUMN taxas_padrao.valor_local_gestor IS 'Valor base hora local para função Gestor';

-- Índices
CREATE INDEX idx_taxas_padrao_tipo_produto ON taxas_padrao(tipo_produto);

-- Trigger para atualizar atualizado_em
CREATE OR REPLACE FUNCTION update_taxas_padrao_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_taxas_padrao_updated_at
  BEFORE UPDATE ON taxas_padrao
  FOR EACH ROW
  EXECUTE FUNCTION update_taxas_padrao_updated_at();

-- RLS (Row Level Security)
ALTER TABLE taxas_padrao ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
-- Permitir leitura para usuários autenticados
CREATE POLICY "Permitir leitura de taxas padrão para usuários autenticados"
  ON taxas_padrao
  FOR SELECT
  TO authenticated
  USING (true);

-- Permitir inserção para usuários autenticados
CREATE POLICY "Permitir inserção de taxas padrão para usuários autenticados"
  ON taxas_padrao
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Permitir atualização para usuários autenticados
CREATE POLICY "Permitir atualização de taxas padrão para usuários autenticados"
  ON taxas_padrao
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Permitir exclusão para usuários autenticados
CREATE POLICY "Permitir exclusão de taxas padrão para usuários autenticados"
  ON taxas_padrao
  FOR DELETE
  TO authenticated
  USING (true);
