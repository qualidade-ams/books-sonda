-- Migration para Sistema de Gerenciamento de Clientes e Books
-- Criação das tabelas principais do sistema

-- Tabela de empresas clientes
CREATE TABLE IF NOT EXISTS empresas_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo VARCHAR(255) NOT NULL,
  nome_abreviado VARCHAR(100) NOT NULL,
  link_sharepoint TEXT,
  template_padrao VARCHAR(50) DEFAULT 'portugues' CHECK (template_padrao IN ('portugues', 'ingles')),
  status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'suspenso')),
  data_status TIMESTAMP DEFAULT NOW(),
  descricao_status TEXT,
  email_gestor VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de produtos contratados (relacionamento N:N)
CREATE TABLE IF NOT EXISTS empresa_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas_clientes(id) ON DELETE CASCADE,
  produto VARCHAR(50) NOT NULL CHECK (produto IN ('CE_PLUS', 'FISCAL', 'GALLERY')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(empresa_id, produto)
);

-- Tabela de grupos de responsáveis
CREATE TABLE IF NOT EXISTS grupos_responsaveis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL UNIQUE,
  descricao TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de e-mails dos grupos
CREATE TABLE IF NOT EXISTS grupo_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID REFERENCES grupos_responsaveis(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  nome VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(grupo_id, email)
);

-- Tabela de relacionamento empresa-grupos
CREATE TABLE IF NOT EXISTS empresa_grupos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas_clientes(id) ON DELETE CASCADE,
  grupo_id UUID REFERENCES grupos_responsaveis(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(empresa_id, grupo_id)
);

-- Tabela de colaboradores
CREATE TABLE IF NOT EXISTS colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  funcao VARCHAR(100),
  empresa_id UUID REFERENCES empresas_clientes(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  data_status TIMESTAMP DEFAULT NOW(),
  descricao_status TEXT,
  principal_contato BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de histórico de disparos
CREATE TABLE IF NOT EXISTS historico_disparos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas_clientes(id),
  colaborador_id UUID REFERENCES colaboradores(id),
  template_id UUID,
  status VARCHAR(20) NOT NULL CHECK (status IN ('enviado', 'falhou', 'agendado', 'cancelado')),
  data_disparo TIMESTAMP,
  data_agendamento TIMESTAMP,
  erro_detalhes TEXT,
  assunto VARCHAR(500),
  emails_cc TEXT[], -- Array de e-mails em cópia
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de controle mensal
CREATE TABLE IF NOT EXISTS controle_mensal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL CHECK (ano >= 2020),
  empresa_id UUID REFERENCES empresas_clientes(id),
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'falhou', 'agendado')),
  data_processamento TIMESTAMP,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(mes, ano, empresa_id)
);

-- Índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_empresas_clientes_status ON empresas_clientes(status);
CREATE INDEX IF NOT EXISTS idx_empresas_clientes_nome ON empresas_clientes(nome_completo);
CREATE INDEX IF NOT EXISTS idx_colaboradores_empresa ON colaboradores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_status ON colaboradores(status);
CREATE INDEX IF NOT EXISTS idx_colaboradores_email ON colaboradores(email);
CREATE INDEX IF NOT EXISTS idx_historico_disparos_empresa ON historico_disparos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_historico_disparos_data ON historico_disparos(data_disparo);
CREATE INDEX IF NOT EXISTS idx_controle_mensal_periodo ON controle_mensal(ano, mes);
CREATE INDEX IF NOT EXISTS idx_controle_mensal_empresa ON controle_mensal(empresa_id);

-- Triggers para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_empresas_clientes_updated_at BEFORE UPDATE ON empresas_clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grupos_responsaveis_updated_at BEFORE UPDATE ON grupos_responsaveis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_colaboradores_updated_at BEFORE UPDATE ON colaboradores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir grupos padrão
INSERT INTO grupos_responsaveis (nome, descricao) VALUES
('CE Plus', 'Grupo responsável pelo produto CE Plus'),
('Fiscal', 'Grupo responsável pelo produto Fiscal'),
('Gallery', 'Grupo responsável pelo produto Gallery'),
('Todos', 'Grupo com demais responsáveis')
ON CONFLICT (nome) DO NOTHING;

-- Inserir e-mails padrão para o grupo "Todos" (exemplo - ajustar conforme necessário)
INSERT INTO grupo_emails (grupo_id, email, nome)
SELECT 
  gr.id,
  email_data.email,
  email_data.nome
FROM grupos_responsaveis gr
CROSS JOIN (
  VALUES 
    ('andreia@sonda.com', 'Andreia'),
    ('aline@sonda.com', 'Aline'),
    ('angela@sonda.com', 'Angela'),
    ('qualidade@sonda.com', 'Qualidade')
) AS email_data(email, nome)
WHERE gr.nome = 'Todos'
ON CONFLICT (grupo_id, email) DO NOTHING;

-- Registrar novas telas no sistema de permissões
INSERT INTO screens (key, name, description, category, route) VALUES
('empresas_clientes', 'Cadastro de Empresas', 'Gerenciamento de empresas clientes', 'Administração', '/admin/empresas-clientes'),
('colaboradores', 'Cadastro de Colaboradores', 'Gerenciamento de colaboradores', 'Administração', '/admin/colaboradores'),
('grupos_responsaveis', 'Grupos de Responsáveis', 'Gerenciamento de grupos de e-mail', 'Administração', '/admin/grupos-responsaveis'),
('controle_disparos', 'Controle de Disparos', 'Controle mensal de envio de books', 'Administração', '/admin/controle-disparos'),
('historico_books', 'Histórico de Books', 'Relatórios e histórico de envios', 'Administração', '/admin/historico-books')
ON CONFLICT (key) DO NOTHING;

-- Comentários nas tabelas para documentação
COMMENT ON TABLE empresas_clientes IS 'Tabela de empresas clientes para o sistema de books';
COMMENT ON TABLE empresa_produtos IS 'Relacionamento N:N entre empresas e produtos contratados';
COMMENT ON TABLE grupos_responsaveis IS 'Grupos de responsáveis para receber cópias dos e-mails';
COMMENT ON TABLE grupo_emails IS 'E-mails associados aos grupos de responsáveis';
COMMENT ON TABLE empresa_grupos IS 'Relacionamento N:N entre empresas e grupos responsáveis';
COMMENT ON TABLE colaboradores IS 'Colaboradores das empresas clientes';
COMMENT ON TABLE historico_disparos IS 'Histórico detalhado de todos os disparos de e-mail';
COMMENT ON TABLE controle_mensal IS 'Controle de status dos disparos mensais por empresa';