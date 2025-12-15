-- =====================================================
-- MIGRAÇÃO: Relacionamentos com Especialistas
-- Descrição: Tabelas para relacionar pesquisas e elogios com especialistas
-- Data: 2025-12-15
-- =====================================================

-- Tabela de relacionamento: Pesquisas x Especialistas
CREATE TABLE IF NOT EXISTS pesquisa_especialistas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pesquisa_id UUID NOT NULL REFERENCES pesquisas_satisfacao(id) ON DELETE CASCADE,
    especialista_id UUID NOT NULL REFERENCES especialistas(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint para evitar duplicatas
    UNIQUE(pesquisa_id, especialista_id)
);

-- Tabela de relacionamento: Elogios x Especialistas
CREATE TABLE IF NOT EXISTS elogio_especialistas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elogio_id UUID NOT NULL REFERENCES elogios(id) ON DELETE CASCADE,
    especialista_id UUID NOT NULL REFERENCES especialistas(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint para evitar duplicatas
    UNIQUE(elogio_id, especialista_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pesquisa_especialistas_pesquisa_id ON pesquisa_especialistas(pesquisa_id);
CREATE INDEX IF NOT EXISTS idx_pesquisa_especialistas_especialista_id ON pesquisa_especialistas(especialista_id);
CREATE INDEX IF NOT EXISTS idx_elogio_especialistas_elogio_id ON elogio_especialistas(elogio_id);
CREATE INDEX IF NOT EXISTS idx_elogio_especialistas_especialista_id ON elogio_especialistas(especialista_id);

-- RLS (Row Level Security)
ALTER TABLE pesquisa_especialistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE elogio_especialistas ENABLE ROW LEVEL SECURITY;

-- Políticas para service role
CREATE POLICY "pesquisa_especialistas_service_role_all"
ON pesquisa_especialistas
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "elogio_especialistas_service_role_all"
ON elogio_especialistas
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Políticas para usuários autenticados (baseadas nas permissões das tabelas principais)
CREATE POLICY "pesquisa_especialistas_authenticated_all"
ON pesquisa_especialistas
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "elogio_especialistas_authenticated_all"
ON elogio_especialistas
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Comentários
COMMENT ON TABLE pesquisa_especialistas IS 'Relacionamento N:N entre pesquisas e especialistas';
COMMENT ON TABLE elogio_especialistas IS 'Relacionamento N:N entre elogios e especialistas';

-- Verificação
SELECT 
    'pesquisa_especialistas' as tabela,
    COUNT(*) as total_colunas
FROM information_schema.columns 
WHERE table_name = 'pesquisa_especialistas';

SELECT 
    'elogio_especialistas' as tabela,
    COUNT(*) as total_colunas
FROM information_schema.columns 
WHERE table_name = 'elogio_especialistas';