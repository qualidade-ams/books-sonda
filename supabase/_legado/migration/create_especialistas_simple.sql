-- =====================================================
-- MIGRAÇÃO SIMPLIFICADA: Sistema de Especialistas
-- Versão simplificada para evitar erros de sintaxe
-- =====================================================

-- Passo 1: Criar ENUMs (apenas se não existirem)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'origem_especialista_enum') THEN
        CREATE TYPE origem_especialista_enum AS ENUM ('sql_server', 'manual');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_especialista_enum') THEN
        CREATE TYPE status_especialista_enum AS ENUM ('ativo', 'inativo');
    END IF;
END $$;

-- Passo 2: Criar tabela especialistas (apenas se não existir)
CREATE TABLE IF NOT EXISTS especialistas (
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

-- Passo 3: Criar índices (apenas se não existirem)
CREATE INDEX IF NOT EXISTS idx_especialistas_origem ON especialistas(origem);
CREATE INDEX IF NOT EXISTS idx_especialistas_status ON especialistas(status);
CREATE INDEX IF NOT EXISTS idx_especialistas_nome ON especialistas(nome);
CREATE UNIQUE INDEX IF NOT EXISTS unique_especialistas_id_externo ON especialistas(id_externo) WHERE id_externo IS NOT NULL;

-- Passo 4: Habilitar RLS
ALTER TABLE especialistas ENABLE ROW LEVEL SECURITY;

-- Passo 5: Política para service role (apenas se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'especialistas' 
        AND policyname = 'especialistas_service_role_all'
    ) THEN
        CREATE POLICY "especialistas_service_role_all"
        ON especialistas
        FOR ALL TO service_role
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- Passo 6: Inserir tela no sistema de permissões
INSERT INTO screens (key, name, description, category)
VALUES ('especialistas', 'Especialistas', 'Gerenciamento de especialistas/consultores', 'Administração')
ON CONFLICT (key) DO NOTHING;