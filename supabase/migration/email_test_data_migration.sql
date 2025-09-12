-- Migration para criar tabela de dados de teste de templates de e-mail
-- Arquivo: email_test_data_migration.sql
-- Data: 2025-09-12

-- Criar tabela para armazenar conjuntos de dados de teste
CREATE TABLE IF NOT EXISTS email_test_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    dados JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Índices para melhor performance
    CONSTRAINT email_test_data_nome_check CHECK (LENGTH(nome) > 0)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_email_test_data_created_at ON email_test_data(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_test_data_created_by ON email_test_data(created_by);
CREATE INDEX IF NOT EXISTS idx_email_test_data_nome ON email_test_data(nome);

-- Habilitar RLS (Row Level Security)
ALTER TABLE email_test_data ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam todos os dados de teste
-- (dados de teste são compartilhados entre todos os usuários)
CREATE POLICY "Usuários podem visualizar dados de teste" ON email_test_data
    FOR SELECT USING (true);

-- Política para permitir que usuários autenticados criem dados de teste
CREATE POLICY "Usuários autenticados podem criar dados de teste" ON email_test_data
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Política para permitir que usuários atualizem dados de teste
CREATE POLICY "Usuários podem atualizar dados de teste" ON email_test_data
    FOR UPDATE USING (true);

-- Política para permitir que usuários deletem dados de teste
CREATE POLICY "Usuários podem deletar dados de teste" ON email_test_data
    FOR DELETE USING (true);

-- Função para atualizar automaticamente o campo updated_at
CREATE OR REPLACE FUNCTION update_email_test_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar automaticamente o updated_at
CREATE TRIGGER email_test_data_updated_at_trigger
    BEFORE UPDATE ON email_test_data
    FOR EACH ROW
    EXECUTE FUNCTION update_email_test_data_updated_at();

-- Inserir alguns dados de exemplo
INSERT INTO email_test_data (nome, dados) VALUES 
(
    'Dados Padrão - Empresa Teste',
    '{
        "razaoSocial": "Empresa Teste Ltda",
        "cnpj": "12.345.678/0001-90",
        "responsavel": "João Silva",
        "email": "joao.silva@empresateste.com.br",
        "localizacao": "São Paulo/SP"
    }'::jsonb
),
(
    'Dados Exemplo - Sonda',
    '{
        "razaoSocial": "Sonda Tecnologia da Informação Ltda",
        "cnpj": "71.153.799/0001-02",
        "responsavel": "Maria Santos",
        "email": "maria.santos@sonda.com",
        "localizacao": "Rio de Janeiro/RJ"
    }'::jsonb
),
(
    'Dados Vazios - Para Teste',
    '{
        "razaoSocial": "",
        "cnpj": "",
        "responsavel": "",
        "email": "",
        "localizacao": "São Paulo/SP"
    }'::jsonb
);

-- Comentários na tabela e colunas
COMMENT ON TABLE email_test_data IS 'Tabela para armazenar conjuntos de dados de teste para templates de e-mail';
COMMENT ON COLUMN email_test_data.id IS 'Identificador único do conjunto de dados';
COMMENT ON COLUMN email_test_data.nome IS 'Nome descritivo do conjunto de dados';
COMMENT ON COLUMN email_test_data.dados IS 'Dados do formulário em formato JSON';
COMMENT ON COLUMN email_test_data.created_at IS 'Data e hora de criação';
COMMENT ON COLUMN email_test_data.updated_at IS 'Data e hora da última atualização';
COMMENT ON COLUMN email_test_data.created_by IS 'ID do usuário que criou o registro';
