-- =====================================================
-- MIGRAÇÃO: Adicionar campo 'personalizado' na tabela taxas_clientes
-- =====================================================
-- Descrição: Adiciona coluna boolean 'personalizado' para indicar se os valores
--            da taxa são personalizados (editados manualmente) ou calculados automaticamente
-- Data: 2024-12-05
-- =====================================================

-- Adicionar coluna 'personalizado' na tabela taxas_clientes
ALTER TABLE taxas_clientes 
ADD COLUMN IF NOT EXISTS personalizado BOOLEAN DEFAULT FALSE;

-- Comentário explicativo da coluna
COMMENT ON COLUMN taxas_clientes.personalizado IS 'Indica se os valores da taxa são personalizados (true) ou calculados automaticamente (false). Quando true, todos os campos das tabelas podem ser editados manualmente e o reajuste não está disponível.';

-- Verificar se a coluna foi criada
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'taxas_clientes' 
    AND column_name = 'personalizado'
  ) THEN
    RAISE NOTICE '✓ Coluna personalizado criada com sucesso na tabela taxas_clientes';
  ELSE
    RAISE WARNING '⚠ Falha ao criar coluna personalizado na tabela taxas_clientes';
  END IF;
END $$;
