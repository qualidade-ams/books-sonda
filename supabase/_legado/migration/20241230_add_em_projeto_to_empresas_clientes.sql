-- Adicionar coluna em_projeto à tabela empresas_clientes
-- Esta coluna indica se a empresa ainda está em fase de projeto/implementação

ALTER TABLE empresas_clientes 
ADD COLUMN em_projeto BOOLEAN DEFAULT FALSE;

-- Comentário para documentar a coluna
COMMENT ON COLUMN empresas_clientes.em_projeto IS 'Indica se a empresa ainda está em fase de projeto/implementação';

-- Atualizar a função de trigger para incluir a nova coluna no updated_at
-- (não é necessário pois o trigger já funciona para todas as colunas)

-- Criar índice para melhorar performance das consultas por em_projeto
CREATE INDEX idx_empresas_clientes_em_projeto ON empresas_clientes(em_projeto);