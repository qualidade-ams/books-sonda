-- =====================================================
-- MIGRAÇÃO COMPLETA: SISTEMA DE CONTATOS MÚLTIPLOS PARA PLANOS DE AÇÃO
-- =====================================================
-- Descrição: Executa todas as migrações necessárias para implementar
--            o sistema de histórico de contatos múltiplos
-- Data: 2025-12-10
-- =====================================================

-- PASSO 1: Adicionar campos faltantes na tabela planos_acao
DO $passo1$
BEGIN
  RAISE NOTICE '🔧 PASSO 1: Adicionando campos faltantes na tabela planos_acao...';
END $passo1$;

-- Adicionar campo chamado (se não existir)
ALTER TABLE planos_acao ADD COLUMN IF NOT EXISTS chamado TEXT;

-- Adicionar campo comentario_cliente (se não existir)
ALTER TABLE planos_acao ADD COLUMN IF NOT EXISTS comentario_cliente TEXT;

-- Adicionar campo empresa_id (se não existir)
ALTER TABLE planos_acao ADD COLUMN IF NOT EXISTS empresa_id UUID;

-- Verificar campos adicionados
DO $verificar1$
DECLARE
  campos_adicionados INTEGER;
BEGIN
  SELECT COUNT(*) INTO campos_adicionados 
  FROM information_schema.columns 
  WHERE table_name = 'planos_acao' 
  AND column_name IN ('chamado', 'comentario_cliente', 'empresa_id');
  
  RAISE NOTICE '✅ Campos verificados/adicionados: %', campos_adicionados;
END $verificar1$;

-- PASSO 2: Criar tabela plano_acao_contatos
DO $passo2$
BEGIN
  RAISE NOTICE '🔧 PASSO 2: Criando tabela plano_acao_contatos...';
END $passo2$;

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

-- PASSO 3: Criar índices para performance
DO $passo3$
BEGIN
  RAISE NOTICE '🔧 PASSO 3: Criando índices...';
END $passo3$;

CREATE INDEX IF NOT EXISTS idx_plano_acao_contatos_plano_id ON plano_acao_contatos(plano_acao_id);
CREATE INDEX IF NOT EXISTS idx_plano_acao_contatos_data ON plano_acao_contatos(data_contato DESC);

-- PASSO 4: Habilitar RLS (Row Level Security)
DO $passo4$
BEGIN
  RAISE NOTICE '🔧 PASSO 4: Configurando segurança (RLS)...';
END $passo4$;

ALTER TABLE plano_acao_contatos ENABLE ROW LEVEL SECURITY;

-- Criar políticas de segurança
CREATE POLICY "Usuários podem ver contatos dos planos" ON plano_acao_contatos
  FOR SELECT USING (true);

CREATE POLICY "Usuários podem inserir contatos" ON plano_acao_contatos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Usuários podem atualizar contatos" ON plano_acao_contatos
  FOR UPDATE USING (true);

CREATE POLICY "Usuários podem deletar contatos" ON plano_acao_contatos
  FOR DELETE USING (true);

-- PASSO 5: Criar trigger para atualizar timestamp
DO $passo5$
BEGIN
  RAISE NOTICE '🔧 PASSO 5: Criando triggers...';
END $passo5$;

CREATE OR REPLACE FUNCTION update_plano_acao_contatos_updated_at()
RETURNS TRIGGER AS $trigger_func$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$trigger_func$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_plano_acao_contatos_updated_at
  BEFORE UPDATE ON plano_acao_contatos
  FOR EACH ROW
  EXECUTE FUNCTION update_plano_acao_contatos_updated_at();

-- PASSO 6: Adicionar comentários explicativos
DO $passo6$
BEGIN
  RAISE NOTICE '🔧 PASSO 6: Adicionando documentação...';
END $passo6$;

COMMENT ON TABLE plano_acao_contatos IS 'Histórico de contatos com cliente para cada plano de ação';
COMMENT ON COLUMN plano_acao_contatos.plano_acao_id IS 'ID do plano de ação relacionado';
COMMENT ON COLUMN plano_acao_contatos.data_contato IS 'Data do contato com o cliente';
COMMENT ON COLUMN plano_acao_contatos.meio_contato IS 'Meio utilizado para contato (whatsapp, email, ligacao)';
COMMENT ON COLUMN plano_acao_contatos.resumo_comunicacao IS 'Resumo do que foi comunicado';
COMMENT ON COLUMN plano_acao_contatos.retorno_cliente IS 'Status do retorno do cliente';
COMMENT ON COLUMN plano_acao_contatos.observacoes IS 'Observações adicionais sobre o contato';

-- Comentários para campos adicionados em planos_acao
COMMENT ON COLUMN planos_acao.chamado IS 'Número do chamado relacionado ao plano de ação';
COMMENT ON COLUMN planos_acao.comentario_cliente IS 'Comentário ou feedback do cliente sobre o problema';
COMMENT ON COLUMN planos_acao.empresa_id IS 'ID da empresa relacionada ao plano de ação';

-- PASSO 7: Verificação final
DO $passo7$
DECLARE
  tabela_contatos_existe BOOLEAN;
  campos_planos_acao INTEGER;
BEGIN
  RAISE NOTICE '🔧 PASSO 7: Verificação final...';
  
  -- Verificar se tabela plano_acao_contatos existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'plano_acao_contatos'
  ) INTO tabela_contatos_existe;
  
  -- Contar campos adicionados em planos_acao
  SELECT COUNT(*) INTO campos_planos_acao
  FROM information_schema.columns 
  WHERE table_name = 'planos_acao' 
  AND column_name IN ('chamado', 'comentario_cliente', 'empresa_id');
  
  IF tabela_contatos_existe AND campos_planos_acao = 3 THEN
    RAISE NOTICE '✅ MIGRAÇÃO COMPLETA EXECUTADA COM SUCESSO!';
    RAISE NOTICE '   - Tabela plano_acao_contatos criada';
    RAISE NOTICE '   - Campos adicionados em planos_acao: %', campos_planos_acao;
    RAISE NOTICE '   - Políticas RLS configuradas';
    RAISE NOTICE '   - Triggers de timestamp criados';
    RAISE NOTICE '   - Índices para performance criados';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Sistema de contatos múltiplos pronto para uso!';
  ELSE
    RAISE NOTICE '❌ ERRO NA MIGRAÇÃO:';
    RAISE NOTICE '   - Tabela plano_acao_contatos existe: %', tabela_contatos_existe;
    RAISE NOTICE '   - Campos em planos_acao: %', campos_planos_acao;
  END IF;
END $passo7$;