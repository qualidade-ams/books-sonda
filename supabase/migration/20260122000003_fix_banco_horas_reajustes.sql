-- Migration: Ajustar estrutura da tabela banco_horas_reajustes
-- Data: 2026-01-22
-- Descrição: Ajusta a tabela para corresponder ao serviço de reajustes

-- 1. Remover constraint de calculo_id (não é mais necessário)
ALTER TABLE banco_horas_reajustes
DROP CONSTRAINT IF EXISTS banco_horas_reajustes_calculo_id_fkey;

-- 2. Tornar calculo_id opcional
ALTER TABLE banco_horas_reajustes
ALTER COLUMN calculo_id DROP NOT NULL;

-- 3. Renomear observacao_privada para observacao
ALTER TABLE banco_horas_reajustes
RENAME COLUMN observacao_privada TO observacao;

-- 4. Alterar tipo_reajuste para aceitar 'entrada' e 'saida'
ALTER TABLE banco_horas_reajustes
DROP CONSTRAINT IF EXISTS banco_horas_reajustes_tipo_reajuste_check;

ALTER TABLE banco_horas_reajustes
ADD CONSTRAINT banco_horas_reajustes_tipo_reajuste_check 
CHECK (tipo_reajuste IN ('entrada', 'saida', 'positivo', 'negativo'));

-- 5. Alterar valor_reajuste_horas para TEXT (formato HH:MM)
ALTER TABLE banco_horas_reajustes
ALTER COLUMN valor_reajuste_horas TYPE TEXT;

-- 6. Tornar created_by opcional (pode ser NULL para sistema)
ALTER TABLE banco_horas_reajustes
ALTER COLUMN created_by DROP NOT NULL;

-- 7. Atualizar comentários
COMMENT ON TABLE banco_horas_reajustes IS 
'Reajustes manuais no banco de horas. Cada reajuste cria uma versão para auditoria.';

COMMENT ON COLUMN banco_horas_reajustes.observacao IS 
'Observação obrigatória (mínimo 10 caracteres) explicando motivo do reajuste';

COMMENT ON COLUMN banco_horas_reajustes.tipo_reajuste IS 
'Tipo do reajuste: entrada (adiciona horas) ou saida (remove horas)';

COMMENT ON COLUMN banco_horas_reajustes.valor_reajuste_horas IS 
'Valor do reajuste em formato HH:MM (ex: 10:30)';

-- 8. Log de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Tabela banco_horas_reajustes ajustada com sucesso!';
  RAISE NOTICE '📝 Mudanças aplicadas:';
  RAISE NOTICE '  - calculo_id agora é opcional';
  RAISE NOTICE '  - observacao_privada renomeada para observacao';
  RAISE NOTICE '  - tipo_reajuste aceita entrada/saida';
  RAISE NOTICE '  - valor_reajuste_horas agora é TEXT (HH:MM)';
  RAISE NOTICE '  - created_by agora é opcional';
END $$;
