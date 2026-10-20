-- =====================================================
-- Migração: Criação da tabela de_para_categoria
-- Descrição: Tabela de DE-PARA para Categoria e Grupo
-- Data: 2024-12-08
-- =====================================================

-- Remover tabela se existir (cuidado em produção!)
DROP TABLE IF EXISTS de_para_categoria CASCADE;

-- Criar tabela de_para_categoria
CREATE TABLE de_para_categoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria TEXT NOT NULL,
  grupo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'inativa')),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  criado_por UUID REFERENCES auth.users(id),
  
  -- Índices para melhor performance
  CONSTRAINT unique_categoria_grupo UNIQUE (categoria, grupo)
);

-- Criar índices
CREATE INDEX idx_de_para_categoria_status ON de_para_categoria(status);
CREATE INDEX idx_de_para_categoria_categoria ON de_para_categoria(categoria);
CREATE INDEX idx_de_para_categoria_grupo ON de_para_categoria(grupo);

-- Comentários na tabela e colunas
COMMENT ON TABLE de_para_categoria IS 'Tabela DE-PARA para mapeamento de Categoria e Grupo das pesquisas de satisfação';
COMMENT ON COLUMN de_para_categoria.id IS 'Identificador único do registro';
COMMENT ON COLUMN de_para_categoria.categoria IS 'Nome da categoria (ex: CE+ RECOF MANUTENÇÃO)';
COMMENT ON COLUMN de_para_categoria.grupo IS 'Nome do grupo/módulo (ex: COMEX - RECOF)';
COMMENT ON COLUMN de_para_categoria.status IS 'Status do registro: ativa ou inativa';
COMMENT ON COLUMN de_para_categoria.criado_em IS 'Data/hora de criação do registro';
COMMENT ON COLUMN de_para_categoria.atualizado_em IS 'Data/hora da última atualização';
COMMENT ON COLUMN de_para_categoria.criado_por IS 'ID do usuário que criou o registro';

-- Habilitar RLS (Row Level Security)
ALTER TABLE de_para_categoria ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem ler registros ativos
CREATE POLICY "Permitir leitura de categorias ativas"
  ON de_para_categoria
  FOR SELECT
  USING (status = 'ativa');

-- Política: Apenas usuários autenticados podem inserir
CREATE POLICY "Permitir inserção para usuários autenticados"
  ON de_para_categoria
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: Apenas usuários autenticados podem atualizar
CREATE POLICY "Permitir atualização para usuários autenticados"
  ON de_para_categoria
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política: Apenas usuários autenticados podem deletar
CREATE POLICY "Permitir exclusão para usuários autenticados"
  ON de_para_categoria
  FOR DELETE
  TO authenticated
  USING (true);

-- Trigger para atualizar atualizado_em automaticamente
CREATE OR REPLACE FUNCTION update_de_para_categoria_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_de_para_categoria_updated_at
  BEFORE UPDATE ON de_para_categoria
  FOR EACH ROW
  EXECUTE FUNCTION update_de_para_categoria_updated_at();

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✓ Tabela de_para_categoria criada com sucesso!';
  RAISE NOTICE '✓ Índices criados';
  RAISE NOTICE '✓ Políticas RLS configuradas';
  RAISE NOTICE '✓ Trigger de atualização configurado';
  RAISE NOTICE '';
  RAISE NOTICE 'Próximo passo: Execute o script insert_de_para_categoria.sql';
END $$;
