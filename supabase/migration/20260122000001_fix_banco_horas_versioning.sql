-- Migration: Corrigir sistema de versionamento do banco de horas
-- Data: 2026-01-22
-- Descrição: Remove campo versao da tabela banco_horas_calculos e garante apenas 1 registro por mês/ano
--            O versionamento deve ser feito apenas na tabela banco_horas_versoes para auditoria

-- 1. Remover registros duplicados (manter apenas a versão mais recente de cada mês)
WITH ranked_calculos AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY empresa_id, mes, ano 
      ORDER BY versao DESC, updated_at DESC
    ) as rn
  FROM banco_horas_calculos
)
DELETE FROM banco_horas_calculos
WHERE id IN (
  SELECT id FROM ranked_calculos WHERE rn > 1
);

-- 2. Remover o campo versao (não é mais necessário)
ALTER TABLE banco_horas_calculos 
DROP COLUMN IF EXISTS versao;

-- 3. Adicionar constraint UNIQUE para garantir apenas 1 registro por empresa/mês/ano
ALTER TABLE banco_horas_calculos
ADD CONSTRAINT banco_horas_calculos_empresa_mes_ano_unique 
UNIQUE (empresa_id, mes, ano);

-- 4. Adicionar comentário explicativo
COMMENT ON TABLE banco_horas_calculos IS 
'Armazena os cálculos mensais de banco de horas. 
Apenas 1 registro por empresa/mês/ano.
Versionamento para auditoria é feito na tabela banco_horas_versoes.';

-- 5. Adicionar índice para melhorar performance de buscas
CREATE INDEX IF NOT EXISTS idx_banco_horas_calculos_empresa_mes_ano 
ON banco_horas_calculos(empresa_id, mes, ano);

-- 6. Log de sucesso
DO $$
BEGIN
  RAISE NOTICE 'Migration concluída com sucesso!';
  RAISE NOTICE 'Campo versao removido da tabela banco_horas_calculos';
  RAISE NOTICE 'Constraint UNIQUE adicionada para empresa_id/mes/ano';
  RAISE NOTICE 'Registros duplicados removidos (mantida apenas a versão mais recente)';
END $$;
