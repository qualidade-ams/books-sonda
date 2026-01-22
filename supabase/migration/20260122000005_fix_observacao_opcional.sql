-- Migration: Corrigir problemas na tabela banco_horas_reajustes
-- Data: 2026-01-22
-- Descrição: Corrige constraint de observacao e garante compatibilidade com o serviço

-- PROBLEMAS IDENTIFICADOS:
-- 1. Constraint exige LENGTH(observacao) >= 10, mas frontend pode enviar valores menores
-- 2. Coluna observacao pode não existir (ainda pode ser observacao_privada)
-- 3. Tipo de valor_reajuste_horas pode estar como INTERVAL em vez de TEXT

-- =====================================================
-- PASSO 1: Verificar e renomear coluna se necessário
-- =====================================================
DO $
BEGIN
  -- Verificar se observacao_privada existe e renomear para observacao
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'banco_horas_reajustes' 
    AND column_name = 'observacao_privada'
  ) THEN
    -- Remover constraint antigo primeiro
    ALTER TABLE banco_horas_reajustes
    DROP CONSTRAINT IF EXISTS banco_horas_reajustes_observacao_privada_check;
    
    -- Renomear coluna
    ALTER TABLE banco_horas_reajustes
    RENAME COLUMN observacao_privada TO observacao;
    
    RAISE NOTICE '✅ Coluna renomeada: observacao_privada → observacao';
  ELSE
    RAISE NOTICE '✅ Coluna observacao já existe';
  END IF;
END $;

-- =====================================================
-- PASSO 2: Remover constraints antigos
-- =====================================================
ALTER TABLE banco_horas_reajustes
DROP CONSTRAINT IF EXISTS banco_horas_reajustes_observacao_check;

ALTER TABLE banco_horas_reajustes
DROP CONSTRAINT IF EXISTS banco_horas_reajustes_observacao_privada_check;

-- =====================================================
-- PASSO 3: Criar novo constraint flexível
-- =====================================================
-- Permitir observacao com mínimo de 3 caracteres (mais razoável que 10)
ALTER TABLE banco_horas_reajustes
ADD CONSTRAINT banco_horas_reajustes_observacao_check 
CHECK (observacao IS NULL OR LENGTH(TRIM(observacao)) >= 3);

-- =====================================================
-- PASSO 4: Tornar observacao opcional
-- =====================================================
ALTER TABLE banco_horas_reajustes
ALTER COLUMN observacao DROP NOT NULL;

-- =====================================================
-- PASSO 5: Ajustar tipo de valor_reajuste_horas
-- =====================================================
-- Converter INTERVAL para TEXT se necessário
DO $
BEGIN
  -- Verificar tipo atual
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'banco_horas_reajustes' 
    AND column_name = 'valor_reajuste_horas'
    AND data_type = 'interval'
  ) THEN
    -- Converter INTERVAL para TEXT
    ALTER TABLE banco_horas_reajustes
    ALTER COLUMN valor_reajuste_horas TYPE TEXT
    USING CASE 
      WHEN valor_reajuste_horas IS NULL THEN NULL
      ELSE EXTRACT(EPOCH FROM valor_reajuste_horas)::INTEGER / 60 || ':' || 
           LPAD((EXTRACT(EPOCH FROM valor_reajuste_horas)::INTEGER % 60)::TEXT, 2, '0')
    END;
    
    RAISE NOTICE '✅ Tipo de valor_reajuste_horas convertido: INTERVAL → TEXT';
  ELSE
    RAISE NOTICE '✅ valor_reajuste_horas já é TEXT';
  END IF;
END $;

-- =====================================================
-- PASSO 6: Atualizar comentários
-- =====================================================
COMMENT ON COLUMN banco_horas_reajustes.observacao IS 
'Observação opcional (mínimo 3 caracteres se fornecida) explicando motivo do reajuste';

COMMENT ON COLUMN banco_horas_reajustes.valor_reajuste_horas IS 
'Valor do reajuste em formato HH:MM (ex: 10:30)';

-- =====================================================
-- PASSO 7: Log de sucesso
-- =====================================================
DO $
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Tabela banco_horas_reajustes corrigida com sucesso!';
  RAISE NOTICE '📝 Mudanças aplicadas:';
  RAISE NOTICE '  - Observacao agora é opcional (pode ser NULL)';
  RAISE NOTICE '  - Se fornecida, deve ter mínimo 3 caracteres (após trim)';
  RAISE NOTICE '  - Constraint: observacao IS NULL OR LENGTH(TRIM(observacao)) >= 3';
  RAISE NOTICE '  - valor_reajuste_horas convertido para TEXT (formato HH:MM)';
  RAISE NOTICE '';
END $;
