-- =====================================================
-- Otimização de Índices para Especialistas
-- =====================================================
-- NOTA: Removido CONCURRENTLY para evitar erro de transação

-- Remover índices desnecessários se existirem
DROP INDEX IF EXISTS idx_especialistas_nome;
DROP INDEX IF EXISTS idx_especialistas_email;
DROP INDEX IF EXISTS idx_especialistas_empresa;

-- Criar índice composto otimizado para a consulta principal
-- Este índice cobre: status + nome (para ORDER BY)
CREATE INDEX IF NOT EXISTS idx_especialistas_status_nome 
ON especialistas (status, nome) 
WHERE status = 'ativo';

-- Índice para busca por texto (nome, email, codigo) - versão simplificada
CREATE INDEX IF NOT EXISTS idx_especialistas_nome_lower 
ON especialistas (lower(nome)) 
WHERE status = 'ativo';

CREATE INDEX IF NOT EXISTS idx_especialistas_email_lower 
ON especialistas (lower(email)) 
WHERE status = 'ativo' AND email IS NOT NULL;

-- Índice para consultas de relacionamento
CREATE INDEX IF NOT EXISTS idx_pesquisa_especialistas_pesquisa_id 
ON pesquisa_especialistas (pesquisa_id);

CREATE INDEX IF NOT EXISTS idx_pesquisa_especialistas_especialista_id 
ON pesquisa_especialistas (especialista_id);

CREATE INDEX IF NOT EXISTS idx_elogio_especialistas_elogio_id 
ON elogio_especialistas (elogio_id);

CREATE INDEX IF NOT EXISTS idx_elogio_especialistas_especialista_id 
ON elogio_especialistas (especialista_id);

-- Estatísticas da tabela para o otimizador
ANALYZE especialistas;
ANALYZE pesquisa_especialistas;
ANALYZE elogio_especialistas;

-- Verificar índices criados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('especialistas', 'pesquisa_especialistas', 'elogio_especialistas')
ORDER BY tablename, indexname;