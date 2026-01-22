-- Migration: Limpar dados de banco de horas e recriar estrutura correta
-- Data: 2026-01-22
-- Descrição: Remove todos os dados de banco de horas e recria a estrutura sem o campo versao

-- 1. LIMPAR TODOS OS DADOS (cuidado: isso apaga tudo!)
TRUNCATE TABLE banco_horas_versoes CASCADE;
TRUNCATE TABLE banco_horas_reajustes CASCADE;
TRUNCATE TABLE banco_horas_calculos CASCADE;

-- 2. Remover constraint antiga se existir
ALTER TABLE banco_horas_calculos
DROP CONSTRAINT IF EXISTS banco_horas_calculos_empresa_mes_ano_unique;

-- 3. Remover o campo versao (não é mais necessário)
ALTER TABLE banco_horas_calculos 
DROP COLUMN IF EXISTS versao;

-- 4. Adicionar constraint UNIQUE para garantir apenas 1 registro por empresa/mês/ano
ALTER TABLE banco_horas_calculos
ADD CONSTRAINT banco_horas_calculos_empresa_mes_ano_unique 
UNIQUE (empresa_id, mes, ano);

-- 5. Adicionar índice para melhorar performance de buscas
DROP INDEX IF EXISTS idx_banco_horas_calculos_empresa_mes_ano;
CREATE INDEX idx_banco_horas_calculos_empresa_mes_ano 
ON banco_horas_calculos(empresa_id, mes, ano);

-- 6. Adicionar comentário explicativo
COMMENT ON TABLE banco_horas_calculos IS 
'Armazena os cálculos mensais de banco de horas. 
Apenas 1 registro por empresa/mês/ano.
Versionamento para auditoria é feito na tabela banco_horas_versoes.
Recalcular não cria nova versão, apenas atualiza o registro existente.
Versões são criadas apenas quando há reajuste manual.';

-- 7. Log de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Migration concluída com sucesso!';
  RAISE NOTICE '🗑️  Todos os dados de banco de horas foram removidos';
  RAISE NOTICE '📝 Campo versao removido da tabela banco_horas_calculos';
  RAISE NOTICE '🔒 Constraint UNIQUE adicionada para empresa_id/mes/ano';
  RAISE NOTICE '⚡ Índice criado para melhorar performance';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Próximos passos:';
  RAISE NOTICE '1. Recarregue a página do sistema';
  RAISE NOTICE '2. Selecione uma empresa';
  RAISE NOTICE '3. O sistema calculará automaticamente os 3 meses do trimestre';
  RAISE NOTICE '4. Verifique se o repasse do mês anterior está correto';
END $$;
