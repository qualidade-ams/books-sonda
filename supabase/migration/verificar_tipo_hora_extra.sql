-- =====================================================
-- Script: Verificar e corrigir coluna tipo_hora_extra
-- Descrição: Verifica se a coluna existe e a cria se necessário
-- Data: 2024-12-08
-- =====================================================

-- Verificar se a coluna existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'requerimentos'
    AND column_name = 'tipo_hora_extra'
  ) THEN
    RAISE NOTICE '❌ Coluna tipo_hora_extra NÃO existe na tabela requerimentos';
    RAISE NOTICE '🔧 Criando coluna...';
    
    -- Criar coluna
    ALTER TABLE requerimentos
    ADD COLUMN tipo_hora_extra TEXT CHECK (tipo_hora_extra IN ('17h30-19h30', 'apos_19h30', 'fim_semana'));
    
    -- Adicionar comentário
    COMMENT ON COLUMN requerimentos.tipo_hora_extra IS 'Tipo de hora extra: 17h30-19h30 (Seg-Sex 17h30-19h30), apos_19h30 (Seg-Sex Após 19h30), fim_semana (Sáb/Dom/Feriados). Usado apenas quando tipo_cobranca = Hora Extra';
    
    -- Criar índice
    CREATE INDEX IF NOT EXISTS idx_requerimentos_tipo_hora_extra ON requerimentos(tipo_hora_extra) WHERE tipo_hora_extra IS NOT NULL;
    
    RAISE NOTICE '✅ Coluna tipo_hora_extra criada com sucesso!';
  ELSE
    RAISE NOTICE '✅ Coluna tipo_hora_extra JÁ existe na tabela requerimentos';
  END IF;
END $$;

-- Verificar estrutura da coluna
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'requerimentos'
AND column_name = 'tipo_hora_extra';

-- Verificar se há índice
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'requerimentos'
AND indexname = 'idx_requerimentos_tipo_hora_extra';

-- Contar requerimentos com tipo_cobranca = 'Hora Extra'
DO $$
DECLARE
  total_hora_extra INTEGER;
  com_tipo_preenchido INTEGER;
  sem_tipo_preenchido INTEGER;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(tipo_hora_extra),
    COUNT(*) - COUNT(tipo_hora_extra)
  INTO total_hora_extra, com_tipo_preenchido, sem_tipo_preenchido
  FROM requerimentos
  WHERE tipo_cobranca = 'Hora Extra';
  
  RAISE NOTICE '';
  RAISE NOTICE '=== ESTATÍSTICAS ===';
  RAISE NOTICE 'Total de requerimentos com Hora Extra: %', total_hora_extra;
  RAISE NOTICE 'Com tipo_hora_extra preenchido: %', com_tipo_preenchido;
  RAISE NOTICE 'Sem tipo_hora_extra preenchido: %', sem_tipo_preenchido;
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICAÇÃO CONCLUÍDA ===';
END $$;
