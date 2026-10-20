-- Migration: Corrigir constraint de observacao na tabela banco_horas_reajustes
-- Data: 2026-01-22
-- Descrição: Remove constraint antigo de observacao_privada e cria novo para observacao

-- IMPORTANTE: Esta migration corrige o problema do constraint que mantém o nome antigo
-- após renomear a coluna observacao_privada para observacao

-- 1. Listar todos os constraints da tabela para debug
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  RAISE NOTICE '🔍 Listando constraints da tabela banco_horas_reajustes:';
  FOR constraint_record IN 
    SELECT conname, pg_get_constraintdef(oid) as definition
    FROM pg_constraint
    WHERE conrelid = 'banco_horas_reajustes'::regclass
  LOOP
    RAISE NOTICE '  - %: %', constraint_record.conname, constraint_record.definition;
  END LOOP;
END $$;

-- 2. Remover TODOS os constraints relacionados a observacao (antigos e novos)
DO $$
BEGIN
  -- Tentar remover constraint antigo (observacao_privada)
  BEGIN
    ALTER TABLE banco_horas_reajustes
    DROP CONSTRAINT IF EXISTS banco_horas_reajustes_observacao_privada_check;
    RAISE NOTICE '✅ Constraint antigo removido: banco_horas_reajustes_observacao_privada_check';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Constraint antigo não encontrado ou já removido';
  END;

  -- Tentar remover constraint novo (se existir)
  BEGIN
    ALTER TABLE banco_horas_reajustes
    DROP CONSTRAINT IF EXISTS banco_horas_reajustes_observacao_check;
    RAISE NOTICE '✅ Constraint novo removido: banco_horas_reajustes_observacao_check';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Constraint novo não encontrado';
  END;
END $$;

-- 3. Verificar se a coluna observacao existe, senão renomear
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'banco_horas_reajustes' 
    AND column_name = 'observacao'
  ) THEN
    -- Coluna observacao não existe, renomear observacao_privada
    ALTER TABLE banco_horas_reajustes
    RENAME COLUMN observacao_privada TO observacao;
    RAISE NOTICE '✅ Coluna renomeada: observacao_privada → observacao';
  ELSE
    RAISE NOTICE '✅ Coluna observacao já existe';
  END IF;
END $$;

-- 4. Criar novo constraint para observacao
ALTER TABLE banco_horas_reajustes
ADD CONSTRAINT banco_horas_reajustes_observacao_check 
CHECK (LENGTH(observacao) >= 10);

-- 5. Garantir que observacao não seja NULL
ALTER TABLE banco_horas_reajustes
ALTER COLUMN observacao SET NOT NULL;

-- 6. Atualizar comentário
COMMENT ON COLUMN banco_horas_reajustes.observacao IS 
'Observação obrigatória (mínimo 10 caracteres) explicando motivo do reajuste';

-- 7. Listar constraints finais para confirmar
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Constraint de observacao corrigido com sucesso!';
  RAISE NOTICE '📝 Mudanças aplicadas:';
  RAISE NOTICE '  - Removidos constraints antigos relacionados a observacao';
  RAISE NOTICE '  - Criado novo constraint: banco_horas_reajustes_observacao_check';
  RAISE NOTICE '  - Observacao agora é NOT NULL com mínimo 10 caracteres';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Constraints finais da tabela:';
  FOR constraint_record IN 
    SELECT conname, pg_get_constraintdef(oid) as definition
    FROM pg_constraint
    WHERE conrelid = 'banco_horas_reajustes'::regclass
    AND conname LIKE '%observacao%'
  LOOP
    RAISE NOTICE '  - %: %', constraint_record.conname, constraint_record.definition;
  END LOOP;
END $$;
