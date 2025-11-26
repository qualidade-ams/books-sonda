-- =====================================================
-- CORREÇÃO: Remover limites de VARCHAR
-- =====================================================
-- Altera campos VARCHAR com limite para TEXT (ilimitado)
-- Resolve erro: value too long for type character varying(1000)
-- =====================================================

-- Identificar campos com VARCHAR e seus limites atuais
DO $$
DECLARE
  col RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CAMPOS VARCHAR NA TABELA pesquisas_satisfacao';
  RAISE NOTICE '========================================';
  
  FOR col IN 
    SELECT 
      column_name,
      data_type,
      character_maximum_length
    FROM information_schema.columns
    WHERE table_name = 'pesquisas_satisfacao'
      AND data_type = 'character varying'
    ORDER BY column_name
  LOOP
    RAISE NOTICE '% - VARCHAR(%) → será alterado para TEXT', 
      col.column_name, 
      COALESCE(col.character_maximum_length::text, 'ilimitado');
  END LOOP;
  
  RAISE NOTICE '========================================';
END $$;

-- Alterar todos os campos VARCHAR para TEXT
-- TEXT é mais eficiente e não tem limite de tamanho

ALTER TABLE pesquisas_satisfacao 
  ALTER COLUMN empresa TYPE TEXT,
  ALTER COLUMN categoria TYPE TEXT,
  ALTER COLUMN grupo TYPE TEXT,
  ALTER COLUMN cliente TYPE TEXT,
  ALTER COLUMN prestador TYPE TEXT,
  ALTER COLUMN nro_caso TYPE TEXT,
  ALTER COLUMN tipo_caso TYPE TEXT,
  ALTER COLUMN resposta TYPE TEXT,
  ALTER COLUMN comentario_pesquisa TYPE TEXT,
  ALTER COLUMN email_cliente TYPE TEXT,
  ALTER COLUMN observacao TYPE TEXT,
  ALTER COLUMN id_externo TYPE TEXT,
  ALTER COLUMN autor_nome TYPE TEXT;

-- Verificar alterações
DO $$
DECLARE
  v_text_count INTEGER;
  v_varchar_count INTEGER;
BEGIN
  -- Contar campos TEXT
  SELECT COUNT(*) INTO v_text_count
  FROM information_schema.columns
  WHERE table_name = 'pesquisas_satisfacao'
    AND data_type = 'text';
  
  -- Contar campos VARCHAR restantes
  SELECT COUNT(*) INTO v_varchar_count
  FROM information_schema.columns
  WHERE table_name = 'pesquisas_satisfacao'
    AND data_type = 'character varying';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESULTADO DA MIGRAÇÃO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Campos TEXT: %', v_text_count;
  RAISE NOTICE 'Campos VARCHAR restantes: %', v_varchar_count;
  RAISE NOTICE '========================================';
  
  IF v_varchar_count = 0 THEN
    RAISE NOTICE '✓ Todos os campos VARCHAR foram convertidos para TEXT';
    RAISE NOTICE '✓ Não há mais limites de tamanho';
    RAISE NOTICE '✓ Sistema totalmente escalável';
  ELSE
    RAISE WARNING '⚠ Ainda existem % campos VARCHAR', v_varchar_count;
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- Adicionar comentário na tabela
COMMENT ON TABLE pesquisas_satisfacao IS 
  'Tabela de pesquisas de satisfação. Campos de texto usam tipo TEXT para escalabilidade ilimitada.';
