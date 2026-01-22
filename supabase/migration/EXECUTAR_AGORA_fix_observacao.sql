-- ========================================
-- SCRIPT DE CORREÇÃO URGENTE
-- Execute este script no Supabase SQL Editor
-- ========================================

-- Este script corrige o problema do constraint observacao_privada_check
-- que impede a criação de reajustes

-- 1. Remover constraint antigo (força remoção)
ALTER TABLE banco_horas_reajustes
DROP CONSTRAINT IF EXISTS banco_horas_reajustes_observacao_privada_check CASCADE;

-- 2. Verificar se coluna observacao existe, senão renomear
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'banco_horas_reajustes' 
    AND column_name = 'observacao'
  ) THEN
    ALTER TABLE banco_horas_reajustes
    RENAME COLUMN observacao_privada TO observacao;
  END IF;
END $$;

-- 3. Remover constraint novo se existir
ALTER TABLE banco_horas_reajustes
DROP CONSTRAINT IF EXISTS banco_horas_reajustes_observacao_check CASCADE;

-- 4. Criar constraint correto
ALTER TABLE banco_horas_reajustes
ADD CONSTRAINT banco_horas_reajustes_observacao_check 
CHECK (LENGTH(observacao) >= 10);

-- 5. Garantir NOT NULL
ALTER TABLE banco_horas_reajustes
ALTER COLUMN observacao SET NOT NULL;

-- 6. Verificar resultado
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'banco_horas_reajustes'::regclass
AND conname LIKE '%observacao%';

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Correção aplicada com sucesso!';
  RAISE NOTICE 'Agora você pode criar reajustes normalmente.';
END $$;
