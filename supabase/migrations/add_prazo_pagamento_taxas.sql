-- =====================================================
-- MIGRATION: Adicionar campo "prazo_pagamento" na tabela taxas_clientes
-- =====================================================
-- Descrição: Adiciona campo para armazenar o prazo de pagamento em dias
--            Opções: 30, 45, 60, 90, 120 dias
-- Data: 2026-03-02
-- =====================================================

-- PASSO 1: Adicionar coluna prazo_pagamento (INTEGER, opcional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'taxas_clientes' 
    AND column_name = 'prazo_pagamento'
  ) THEN
    ALTER TABLE taxas_clientes 
    ADD COLUMN prazo_pagamento INTEGER;
    
    RAISE NOTICE '✅ Coluna "prazo_pagamento" adicionada com sucesso';
  ELSE
    RAISE NOTICE '⚠️ Coluna "prazo_pagamento" já existe';
  END IF;
END $$;

-- PASSO 2: Adicionar constraint para validar valores permitidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'taxas_clientes_prazo_pagamento_check'
  ) THEN
    ALTER TABLE taxas_clientes
    ADD CONSTRAINT taxas_clientes_prazo_pagamento_check
    CHECK (prazo_pagamento IS NULL OR prazo_pagamento IN (30, 45, 60, 90, 120));
    
    RAISE NOTICE '✅ Constraint de validação adicionada';
  ELSE
    RAISE NOTICE '⚠️ Constraint de validação já existe';
  END IF;
END $$;

-- PASSO 3: Adicionar comentário explicativo
COMMENT ON COLUMN taxas_clientes.prazo_pagamento IS 'Prazo de pagamento em dias. Valores permitidos: 30, 45, 60, 90, 120';

-- PASSO 4: Criar índice para consultas por prazo de pagamento
CREATE INDEX IF NOT EXISTS idx_taxas_clientes_prazo_pagamento 
ON taxas_clientes(prazo_pagamento) 
WHERE prazo_pagamento IS NOT NULL;

COMMENT ON INDEX idx_taxas_clientes_prazo_pagamento IS 'Índice para consultas por prazo de pagamento';

-- PASSO 5: Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '🎯 Migration concluída com sucesso!';
  RAISE NOTICE '   ✅ Campo "prazo_pagamento" adicionado';
  RAISE NOTICE '   ✅ Constraint de validação criada (30, 45, 60, 90, 120)';
  RAISE NOTICE '   ✅ Índice de performance criado';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Valores permitidos:';
  RAISE NOTICE '   - 30 dias';
  RAISE NOTICE '   - 45 dias';
  RAISE NOTICE '   - 60 dias';
  RAISE NOTICE '   - 90 dias';
  RAISE NOTICE '   - 120 dias';
END $$;
