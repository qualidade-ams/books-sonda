-- ========================================
-- DIAGNÓSTICO DA TABELA banco_horas_reajustes
-- Execute este script para verificar a estrutura
-- ========================================

-- 1. Verificar estrutura da tabela
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'banco_horas_reajustes'
ORDER BY ordinal_position;

-- 2. Listar TODOS os constraints
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'banco_horas_reajustes'::regclass
ORDER BY conname;

-- 3. Verificar se há dados na tabela
SELECT COUNT(*) as total_registros
FROM banco_horas_reajustes;

-- 4. Verificar últimos registros (se houver)
SELECT 
  id,
  empresa_id,
  mes,
  ano,
  valor_reajuste_horas,
  tipo_reajuste,
  LENGTH(observacao) as observacao_length,
  LEFT(observacao, 50) as observacao_preview,
  created_at
FROM banco_horas_reajustes
ORDER BY created_at DESC
LIMIT 5;

-- 5. Testar INSERT manualmente
DO $$
BEGIN
  -- Tentar inserir um registro de teste
  INSERT INTO banco_horas_reajustes (
    empresa_id,
    mes,
    ano,
    valor_reajuste_horas,
    tipo_reajuste,
    observacao,
    ativo
  ) VALUES (
    'bb8199f7-f447-4179-804f-0bab7525c6d2',
    11,
    2025,
    '10:30',
    'entrada',
    'Teste de reajuste com observação válida de mais de 10 caracteres',
    true
  );
  
  RAISE NOTICE '✅ INSERT de teste bem-sucedido!';
  
  -- Remover registro de teste
  DELETE FROM banco_horas_reajustes 
  WHERE observacao = 'Teste de reajuste com observação válida de mais de 10 caracteres';
  
  RAISE NOTICE '✅ Registro de teste removido';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Erro no INSERT de teste: %', SQLERRM;
END $$;
