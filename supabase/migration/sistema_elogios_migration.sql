-- =====================================================
-- MIGRAÇÃO: Sistema de Pesquisas
-- Descrição: Criação da estrutura completa para gerenciamento de pesquisas
-- Data: 2025-11-25
-- =====================================================

-- Passo 1: Criar ENUM para origem dos dados
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'origem_pesquisa_enum') THEN
        CREATE TYPE origem_pesquisa_enum AS ENUM ('sql_server', 'manual');
        RAISE NOTICE 'ENUM origem_pesquisa_enum criado com sucesso';
    ELSE
        RAISE NOTICE 'ENUM origem_pesquisa_enum já existe';
    END IF;
END $$;

-- Passo 2: Criar ENUM para status
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_pesquisa_enum') THEN
        CREATE TYPE status_pesquisa_enum AS ENUM ('pendente', 'enviado');
        RAISE NOTICE 'ENUM status_pesquisa_enum criado com sucesso';
    ELSE
        RAISE NOTICE 'ENUM status_pesquisa_enum já existe';
    END IF;
END $$;

-- Passo 3: Criar tabela pesquisas
CREATE TABLE IF NOT EXISTS pesquisas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Controle de origem
    origem origem_pesquisa_enum NOT NULL DEFAULT 'manual',
    id_externo VARCHAR(100), -- ID do registro no SQL Server
    
    -- Dados do SQL Server
    empresa VARCHAR(255) NOT NULL,
    categoria VARCHAR(100),
    grupo VARCHAR(100),
    cliente VARCHAR(255) NOT NULL,
    email_cliente VARCHAR(255),
    prestador VARCHAR(255),
    nro_caso VARCHAR(100),
    tipo_caso VARCHAR(100),
    ano_abertura INTEGER,
    mes_abertura INTEGER,
    data_resposta TIMESTAMP,
    resposta TEXT,
    comentario_pesquisa TEXT,
    
    -- Relacionamentos (opcional, para dados manuais)
    empresa_id UUID REFERENCES empresas_clientes(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    
    -- Controle de envio
    status status_pesquisa_enum NOT NULL DEFAULT 'pendente',
    data_envio TIMESTAMP,
    
    -- Auditoria
    autor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    autor_nome VARCHAR(255),
    observacao TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_mes_abertura CHECK (mes_abertura >= 1 AND mes_abertura <= 12),
    CONSTRAINT check_ano_abertura CHECK (ano_abertura >= 2000 AND ano_abertura <= 2100),
    CONSTRAINT check_origem_id_externo CHECK (
        (origem = 'sql_server' AND id_externo IS NOT NULL) OR
        (origem = 'manual' AND id_externo IS NULL)
    )
);

-- Passo 4: Criar índices otimizados
CREATE INDEX IF NOT EXISTS idx_pesquisas_origem ON pesquisas(origem);
CREATE INDEX IF NOT EXISTS idx_pesquisas_status ON pesquisas(status);
CREATE INDEX IF NOT EXISTS idx_pesquisas_empresa ON pesquisas(empresa);
CREATE INDEX IF NOT EXISTS idx_pesquisas_cliente ON pesquisas(cliente);
CREATE INDEX IF NOT EXISTS idx_pesquisas_id_externo ON pesquisas(id_externo) WHERE id_externo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pesquisas_empresa_id ON pesquisas(empresa_id) WHERE empresa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pesquisas_cliente_id ON pesquisas(cliente_id) WHERE cliente_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pesquisas_data_resposta ON pesquisas(data_resposta);
CREATE INDEX IF NOT EXISTS idx_pesquisas_ano_mes ON pesquisas(ano_abertura, mes_abertura);
CREATE INDEX IF NOT EXISTS idx_pesquisas_created_at ON pesquisas(created_at DESC);

-- Passo 5: Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_pesquisas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pesquisas_updated_at ON pesquisas;
CREATE TRIGGER trigger_update_pesquisas_updated_at
    BEFORE UPDATE ON pesquisas
    FOR EACH ROW
    EXECUTE FUNCTION update_pesquisas_updated_at();

-- Passo 6: Adicionar comentários
COMMENT ON TABLE pesquisas IS 'Tabela para gerenciamento de pesquisas de clientes (origem SQL Server e manual)';
COMMENT ON COLUMN pesquisas.origem IS 'Origem dos dados: sql_server (sincronizado) ou manual (inserido manualmente)';
COMMENT ON COLUMN pesquisas.id_externo IS 'ID do registro no banco SQL Server (apenas para origem sql_server)';
COMMENT ON COLUMN pesquisas.empresa IS 'Nome da empresa cliente';
COMMENT ON COLUMN pesquisas.categoria IS 'Categoria do pesquisa';
COMMENT ON COLUMN pesquisas.grupo IS 'Grupo responsável';
COMMENT ON COLUMN pesquisas.cliente IS 'Nome do cliente que fez o pesquisa';
COMMENT ON COLUMN pesquisas.email_cliente IS 'Email do cliente';
COMMENT ON COLUMN pesquisas.prestador IS 'Nome do prestador de serviço elogiado';
COMMENT ON COLUMN pesquisas.nro_caso IS 'Número do caso/chamado relacionado';
COMMENT ON COLUMN pesquisas.tipo_caso IS 'Tipo do caso';
COMMENT ON COLUMN pesquisas.data_resposta IS 'Data e hora da resposta do cliente';
COMMENT ON COLUMN pesquisas.resposta IS 'Resposta/feedback do cliente';
COMMENT ON COLUMN pesquisas.comentario_pesquisa IS 'Comentários adicionais da pesquisa';
COMMENT ON COLUMN pesquisas.status IS 'Status do pesquisa: pendente ou enviado';

-- Passo 7: Verificar estrutura criada
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Verificar tabela
    SELECT COUNT(*) INTO v_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pesquisas';
    
    IF v_count > 0 THEN
        RAISE NOTICE '✓ Tabela pesquisas criada com sucesso';
    ELSE
        RAISE EXCEPTION '✗ Erro: Tabela pesquisas não foi criada';
    END IF;
    
    -- Verificar índices
    SELECT COUNT(*) INTO v_count
    FROM pg_indexes
    WHERE tablename = 'pesquisas';
    
    RAISE NOTICE '✓ % índices criados para tabela pesquisas', v_count;
    
    -- Verificar trigger
    SELECT COUNT(*) INTO v_count
    FROM pg_trigger
    WHERE tgname = 'trigger_update_pesquisas_updated_at';
    
    IF v_count > 0 THEN
        RAISE NOTICE '✓ Trigger de updated_at configurado';
    END IF;
END $$;

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================
