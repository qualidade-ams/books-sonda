-- =====================================================
-- DIAGNÓSTICO URGENTE: Estado atual da coluna linguagem
-- =====================================================

-- 1. Verificar se coluna permite NULL
SELECT 
  '1️⃣ COLUNA LINGUAGEM' as secao,
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE 
    WHEN is_nullable = 'YES' THEN '✅ Permite NULL'
    ELSE '❌ NÃO PERMITE NULL - PROBLEMA AQUI!'
  END as status
FROM information_schema.columns 
WHERE table_name = 'requerimentos' 
AND column_name = 'linguagem';

-- 2. Listar TODAS as constraints da coluna linguagem
SELECT 
  '2️⃣ CONSTRAINTS EXISTENTES' as secao,
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition,
  CASE 
    WHEN conname = 'valid_linguagem' AND pg_get_constraintdef(oid) LIKE '%IS NULL%' 
      THEN '✅ Permite NULL'
    WHEN conname = 'valid_linguagem' AND pg_get_constraintdef(oid) NOT LIKE '%IS NULL%'
      THEN '❌ NÃO PERMITE NULL - PROBLEMA AQUI!'
    WHEN conname = 'linguagem_required_with_horas_tecnico'
      THEN '✅ Constraint condicional OK'
    ELSE '⚠️ Verificar'
  END as status
FROM pg_constraint 
WHERE conrelid = 'requerimentos'::regclass 
AND (
  conname LIKE '%linguagem%' OR
  pg_get_constraintdef(oid) LIKE '%linguagem%'
)
ORDER BY conname;

-- 3. Verificar definição EXATA da constraint valid_linguagem
SELECT 
  '3️⃣ DEFINIÇÃO EXATA valid_linguagem' as secao,
  pg_get_constraintdef(oid) as definicao_completa
FROM pg_constraint 
WHERE conrelid = 'requerimentos'::regclass 
AND conname = 'valid_linguagem';

-- 4. Testar se NULL é aceito pela constraint
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '4️⃣ TESTE DE NULL';
  RAISE NOTICE '================';
  
  -- Tentar validar NULL contra a constraint
  BEGIN
    PERFORM 1 WHERE NULL IN ('ABAP', 'DBA', 'Funcional', 'PL/SQL', 'Técnico');
    RAISE NOTICE '❌ NULL não passa na constraint atual';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Erro ao testar NULL: %', SQLERRM;
  END;
  
  -- Testar com OR NULL
  BEGIN
    PERFORM 1 WHERE NULL IS NULL OR NULL IN ('ABAP', 'DBA', 'Funcional', 'PL/SQL', 'Técnico');
    RAISE NOTICE '✅ NULL passaria com "IS NULL OR"';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Erro ao testar NULL com OR: %', SQLERRM;
  END;
  
END $$;

-- 5. Resumo do problema
DO $$
DECLARE
  is_nullable_check text;
  constraint_def text;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '5️⃣ RESUMO DO DIAGNÓSTICO';
  RAISE NOTICE '========================';
  
  -- Verificar coluna
  SELECT is_nullable INTO is_nullable_check
  FROM information_schema.columns 
  WHERE table_name = 'requerimentos' AND column_name = 'linguagem';
  
  -- Verificar constraint
  SELECT pg_get_constraintdef(oid) INTO constraint_def
  FROM pg_constraint 
  WHERE conrelid = 'requerimentos'::regclass 
  AND conname = 'valid_linguagem';
  
  RAISE NOTICE '';
  RAISE NOTICE 'Coluna permite NULL: %', is_nullable_check;
  RAISE NOTICE 'Constraint atual: %', constraint_def;
  RAISE NOTICE '';
  
  IF is_nullable_check = 'NO' THEN
    RAISE NOTICE '❌ PROBLEMA 1: Coluna definida como NOT NULL';
    RAISE NOTICE '   Solução: ALTER TABLE requerimentos ALTER COLUMN linguagem DROP NOT NULL;';
  ELSE
    RAISE NOTICE '✅ Coluna permite NULL';
  END IF;
  
  IF constraint_def NOT LIKE '%IS NULL%' THEN
    RAISE NOTICE '❌ PROBLEMA 2: Constraint não permite NULL';
    RAISE NOTICE '   Solução: Recriar constraint com "linguagem IS NULL OR"';
  ELSE
    RAISE NOTICE '✅ Constraint permite NULL';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '📋 AÇÃO NECESSÁRIA:';
  RAISE NOTICE 'Execute a migration 20260123000004_fix_linguagem_nullable.sql';
  RAISE NOTICE '';
  
END $$;
