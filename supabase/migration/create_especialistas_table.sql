-- =====================================================
-- MIGRAÇÃO: Sistema de Especialistas/Consultores
-- Descrição: Criação da estrutura para sincronização da tabela AMSespecialistas
-- Data: 2025-12-15
-- =====================================================

-- Passo 1: Criar ENUM para origem dos dados
DO $enum_origem$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'origem_especialista_enum') THEN
        CREATE TYPE origem_especialista_enum AS ENUM ('sql_server', 'manual');
        RAISE NOTICE 'ENUM origem_especialista_enum criado com sucesso';
    ELSE
        RAISE NOTICE 'ENUM origem_especialista_enum já existe';
    END IF;
END $enum_origem$;

-- Passo 2: Criar ENUM para status
DO $enum_status$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_especialista_enum') THEN
        CREATE TYPE status_especialista_enum AS ENUM ('ativo', 'inativo');
        RAISE NOTICE 'ENUM status_especialista_enum criado com sucesso';
    ELSE
        RAISE NOTICE 'ENUM status_especialista_enum já existe';
    END IF;
END $enum_status$;

-- Passo 3: Criar tabela especialistas
CREATE TABLE IF NOT EXISTS especialistas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Controle de origem
    origem origem_especialista_enum NOT NULL DEFAULT 'manual',
    id_externo TEXT, -- ID único do registro no SQL Server
    
    -- Dados do SQL Server (AMSespecialistas)
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
    
    -- Controle
    status status_especialista_enum NOT NULL DEFAULT 'ativo',
    
    -- Auditoria
    autor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    autor_nome TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_origem_id_externo_especialistas CHECK (
        (origem = 'sql_server' AND id_externo IS NOT NULL) OR
        (origem = 'manual' AND id_externo IS NULL)
    )
);

-- Passo 4: Criar índices otimizados
CREATE INDEX IF NOT EXISTS idx_especialistas_origem ON especialistas(origem);
CREATE INDEX IF NOT EXISTS idx_especialistas_status ON especialistas(status);
CREATE INDEX IF NOT EXISTS idx_especialistas_nome ON especialistas(nome);
CREATE INDEX IF NOT EXISTS idx_especialistas_email ON especialistas(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_especialistas_codigo ON especialistas(codigo) WHERE codigo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_especialistas_id_externo ON especialistas(id_externo) WHERE id_externo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_especialistas_empresa ON especialistas(empresa) WHERE empresa IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_especialistas_departamento ON especialistas(departamento) WHERE departamento IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_especialistas_especialidade ON especialistas(especialidade) WHERE especialidade IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_especialistas_created_at ON especialistas(created_at DESC);

-- Criar índice único para id_externo (apenas para registros não nulos)
CREATE UNIQUE INDEX IF NOT EXISTS unique_especialistas_id_externo 
ON especialistas(id_externo) 
WHERE id_externo IS NOT NULL;

-- Passo 5: Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_especialistas_updated_at()
RETURNS TRIGGER AS $trigger_func$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$trigger_func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_especialistas_updated_at ON especialistas;
CREATE TRIGGER trigger_update_especialistas_updated_at
    BEFORE UPDATE ON especialistas
    FOR EACH ROW
    EXECUTE FUNCTION update_especialistas_updated_at();

-- Passo 6: Configurar RLS (Row Level Security)
ALTER TABLE especialistas ENABLE ROW LEVEL SECURITY;

-- Política para service role (API de sincronização)
CREATE POLICY "especialistas_service_role_all"
ON especialistas
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Política para usuários autenticados - SELECT
CREATE POLICY "especialistas_select_policy"
ON especialistas
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_group_assignments uga
    JOIN screen_permissions sp ON uga.group_id = sp.group_id
    WHERE uga.user_id = auth.uid()
    AND sp.screen_key = 'especialistas'
    AND sp.permission_level IN ('view', 'edit')
  )
);

-- Política para usuários autenticados - INSERT
CREATE POLICY "especialistas_insert_policy"
ON especialistas
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_group_assignments uga
    JOIN screen_permissions sp ON uga.group_id = sp.group_id
    WHERE uga.user_id = auth.uid()
    AND sp.screen_key = 'especialistas'
    AND sp.permission_level = 'edit'
  )
);

-- Política para usuários autenticados - UPDATE
CREATE POLICY "especialistas_update_policy"
ON especialistas
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_group_assignments uga
    JOIN screen_permissions sp ON uga.group_id = sp.group_id
    WHERE uga.user_id = auth.uid()
    AND sp.screen_key = 'especialistas'
    AND sp.permission_level = 'edit'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_group_assignments uga
    JOIN screen_permissions sp ON uga.group_id = sp.group_id
    WHERE uga.user_id = auth.uid()
    AND sp.screen_key = 'especialistas'
    AND sp.permission_level = 'edit'
  )
);

-- Política para usuários autenticados - DELETE
CREATE POLICY "especialistas_delete_policy"
ON especialistas
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_group_assignments uga
    JOIN screen_permissions sp ON uga.group_id = sp.group_id
    WHERE uga.user_id = auth.uid()
    AND sp.screen_key = 'especialistas'
    AND sp.permission_level = 'edit'
  )
);

-- Passo 7: Adicionar comentários
COMMENT ON TABLE especialistas IS 'Tabela para gerenciamento de especialistas/consultores (origem SQL Server e manual)';
COMMENT ON COLUMN especialistas.origem IS 'Origem dos dados: sql_server (sincronizado) ou manual (inserido manualmente)';
COMMENT ON COLUMN especialistas.id_externo IS 'ID único do registro no banco SQL Server (apenas para origem sql_server)';
COMMENT ON COLUMN especialistas.codigo IS 'Código do especialista no sistema';
COMMENT ON COLUMN especialistas.nome IS 'Nome completo do especialista';
COMMENT ON COLUMN especialistas.email IS 'Email do especialista';
COMMENT ON COLUMN especialistas.telefone IS 'Telefone de contato';
COMMENT ON COLUMN especialistas.cargo IS 'Cargo/função do especialista';
COMMENT ON COLUMN especialistas.departamento IS 'Departamento onde trabalha';
COMMENT ON COLUMN especialistas.empresa IS 'Empresa do especialista';
COMMENT ON COLUMN especialistas.especialidade IS 'Área de especialidade';
COMMENT ON COLUMN especialistas.nivel IS 'Nível de experiência';
COMMENT ON COLUMN especialistas.observacoes IS 'Observações adicionais';
COMMENT ON COLUMN especialistas.status IS 'Status do especialista: ativo ou inativo';

-- Passo 8: Inserir tela no sistema de permissões (se não existir)
INSERT INTO screens (key, name, description, category)
VALUES ('especialistas', 'Especialistas', 'Gerenciamento de especialistas/consultores', 'Administração')
ON CONFLICT (key) DO NOTHING;

-- Passo 9: Verificar estrutura criada
DO $verificacao$
DECLARE
    v_count INTEGER;
BEGIN
    -- Verificar tabela
    SELECT COUNT(*) INTO v_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'especialistas';
    
    IF v_count > 0 THEN
        RAISE NOTICE '✓ Tabela especialistas criada com sucesso';
    ELSE
        RAISE EXCEPTION '✗ Erro: Tabela especialistas não foi criada';
    END IF;
    
    -- Verificar índices
    SELECT COUNT(*) INTO v_count
    FROM pg_indexes
    WHERE tablename = 'especialistas';
    
    RAISE NOTICE '✓ % índices criados para tabela especialistas', v_count;
    
    -- Verificar trigger
    SELECT COUNT(*) INTO v_count
    FROM pg_trigger
    WHERE tgname = 'trigger_update_especialistas_updated_at';
    
    IF v_count > 0 THEN
        RAISE NOTICE '✓ Trigger de updated_at configurado';
    END IF;
    
    -- Verificar políticas RLS
    SELECT COUNT(*) INTO v_count
    FROM pg_policies
    WHERE tablename = 'especialistas';
    
    RAISE NOTICE '✓ % políticas RLS criadas para especialistas', v_count;
    
    -- Verificar tela no sistema de permissões
    SELECT COUNT(*) INTO v_count
    FROM screens
    WHERE key = 'especialistas';
    
    IF v_count > 0 THEN
        RAISE NOTICE '✓ Tela especialistas registrada no sistema de permissões';
    END IF;
END $verificacao$;

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================

DO $final$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ Tabela especialistas criada';
    RAISE NOTICE '✓ Índices otimizados aplicados';
    RAISE NOTICE '✓ Triggers configurados';
    RAISE NOTICE '✓ Políticas RLS aplicadas';
    RAISE NOTICE '✓ Sistema de permissões configurado';
    RAISE NOTICE '📊 Sistema de Especialistas pronto para sincronização!';
    RAISE NOTICE '========================================';
END $final$;