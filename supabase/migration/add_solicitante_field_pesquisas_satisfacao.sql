-- ============================================
-- ADICIONAR CAMPO SOLICITANTE À TABELA PESQUISAS_SATISFACAO
-- ============================================
-- Este script adiciona o campo solicitante para armazenar dados do SQL Server

-- Adicionar coluna solicitante
ALTER TABLE pesquisas_satisfacao 
ADD COLUMN IF NOT EXISTS solicitante VARCHAR(255);

-- Comentário para documentação
COMMENT ON COLUMN pesquisas_satisfacao.solicitante IS 'Nome do solicitante da pesquisa (campo do SQL Server AMSpesquisa)';

-- Verificação
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'pesquisas_satisfacao' 
    AND column_name = 'solicitante';

SELECT '✅ Campo solicitante adicionado com sucesso!' as status;