-- =====================================================
-- RESET E CRIAÇÃO: Sistema de Especialistas
-- Remove estruturas existentes e recria do zero
-- =====================================================

-- Passo 1: Limpar estruturas existentes (se existirem)
DROP TABLE IF EXISTS especialistas CASCADE;
DROP TYPE IF EXISTS origem_especialista_enum CASCADE;
DROP TYPE IF EXISTS status_especialista_enum CASCADE;

-- Passo 2: Remover tela do sistema de permissões
DELETE FROM screen_permissions WHERE screen_key = 'especialistas';
DELETE FROM screens WHERE key = 'especialistas';

-- Passo 3: Criar ENUMs
CREATE TYPE origem_especialista_enum AS ENUM ('sql_server', 'manual');
CREATE TYPE status_especialista_enum AS ENUM ('ativo', 'inativo');

-- Passo 4: Criar tabela especialistas
CREATE TABLE especialistas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origem origem_especialista_enum NOT NULL DEFAULT 'manual',
    id_externo TEXT,
    codigo TEXT,
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    cargo TEXT,
    departamento TEXT,
    empresa TEXT,
    especialidade TEXT,
    nivel TEXT,
    observacoes TEXT,
    status status_especialista_enum NOT NULL DEFAULT 'ativo',
    autor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    autor_nome TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Passo 5: Criar índices
CREATE INDEX idx_especialistas_origem ON especialistas(origem);
CREATE INDEX idx_especialistas_status ON especialistas(status);
CREATE INDEX idx_especialistas_nome ON especialistas(nome);
CREATE INDEX idx_especialistas_email ON especialistas(email) WHERE email IS NOT NULL;
CREATE INDEX idx_especialistas_codigo ON especialistas(codigo) WHERE codigo IS NOT NULL;
CREATE INDEX idx_especialistas_empresa ON especialistas(empresa) WHERE empresa IS NOT NULL;
CREATE INDEX idx_especialistas_created_at ON especialistas(created_at DESC);
CREATE UNIQUE INDEX unique_especialistas_id_externo ON especialistas(id_externo) WHERE id_externo IS NOT NULL;

-- Passo 6: Criar função de trigger para updated_at
CREATE OR REPLACE FUNCTION update_especialistas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Passo 7: Criar trigger
CREATE TRIGGER trigger_update_especialistas_updated_at
    BEFORE UPDATE ON especialistas
    FOR EACH ROW
    EXECUTE FUNCTION update_especialistas_updated_at();

-- Passo 8: Habilitar RLS
ALTER TABLE especialistas ENABLE ROW LEVEL SECURITY;

-- Passo 9: Política para service role (necessária para sincronização)
CREATE POLICY "especialistas_service_role_all"
ON especialistas
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Passo 10: Política básica para usuários autenticados (temporária)
CREATE POLICY "especialistas_authenticated_all"
ON especialistas
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Passo 11: Inserir tela no sistema de permissões
INSERT INTO screens (key, name, description, category)
VALUES ('especialistas', 'Especialistas', 'Gerenciamento de especialistas/consultores', 'Administração');

-- Passo 12: Adicionar comentários
COMMENT ON TABLE especialistas IS 'Tabela para gerenciamento de especialistas/consultores (origem SQL Server e manual)';
COMMENT ON COLUMN especialistas.origem IS 'Origem dos dados: sql_server (sincronizado) ou manual (inserido manualmente)';
COMMENT ON COLUMN especialistas.id_externo IS 'ID único do registro no banco SQL Server (apenas para origem sql_server)';
COMMENT ON COLUMN especialistas.nome IS 'Nome completo do especialista';
COMMENT ON COLUMN especialistas.status IS 'Status do especialista: ativo ou inativo';

-- Verificação final
SELECT 
    'especialistas' as tabela_criada,
    COUNT(*) as total_colunas
FROM information_schema.columns 
WHERE table_name = 'especialistas';

SELECT 
    'Índices criados' as status,
    COUNT(*) as total_indices
FROM pg_indexes 
WHERE tablename = 'especialistas';

SELECT 
    'Políticas RLS' as status,
    COUNT(*) as total_politicas
FROM pg_policies 
WHERE tablename = 'especialistas';