-- ========================================
-- CORREÇÃO COMPLETA E DEFINITIVA
-- Execute este script no Supabase SQL Editor
-- ========================================

-- Este script corrige TODOS os problemas da tabela banco_horas_reajustes

-- PASSO 1: Verificar estrutura atual
DO $$
BEGIN
  RAISE NOTICE '🔍 DIAGNÓSTICO INICIAL';
  RAISE NOTICE '====================';
END $$;

SELECT 
  'Coluna: ' || column_name || 
  ' | Tipo: ' || data_type || 
  ' | Nullable: ' || is_nullable as info
FROM information_schema.columns
WHERE table_name = 'banco_horas_reajustes'
AND column_name IN ('observacao', 'observacao_privada')
ORDER BY column_name;

-- PASSO 2: Remover TODOS os constraints relacionados a observacao
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🗑️ REMOVENDO CONSTRAINTS ANTIGOS';
  RAISE NOTICE '================================';
  
  -- Buscar e remover todos os constraints que contenham 'observacao'
  FOR constraint_record IN 
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'banco_horas_reajustes'::regclass
    AND conname LIKE '%observacao%'
  LOOP
    EXECUTE format('ALTER TABLE banco_horas_reajustes DROP CONSTRAINT IF EXISTS %I CASCADE', constraint_record.conname);
    RAISE NOTICE '✅ Removido: %', constraint_record.conname;
  END LOOP;
END $$;

-- PASSO 3: Garantir que a coluna se chama 'observacao' (não 'observacao_privada')
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📝 RENOMEANDO COLUNA (se necessário)';
  RAISE NOTICE '====================================';
  
  -- Verificar se observacao_privada existe
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'banco_horas_reajustes' 
    AND column_name = 'observacao_privada'
  ) THEN
    -- Renomear para observacao
    ALTER TABLE banco_horas_reajustes
    RENAME COLUMN observacao_privada TO observacao;
    RAISE NOTICE '✅ Coluna renomeada: observacao_privada → observacao';
  ELSE
    RAISE NOTICE '✅ Coluna observacao já existe';
  END IF;
END $$;

-- PASSO 4: Garantir que a coluna é TEXT (não VARCHAR)
ALTER TABLE banco_horas_reajustes
ALTER COLUMN observacao TYPE TEXT;

-- PASSO 5: Criar constraint correto
ALTER TABLE banco_horas_reajustes
ADD CONSTRAINT banco_horas_reajustes_observacao_check 
CHECK (LENGTH(observacao) >= 10);

-- PASSO 6: Garantir NOT NULL
ALTER TABLE banco_horas_reajustes
ALTER COLUMN observacao SET NOT NULL;

-- PASSO 7: Atualizar comentário
COMMENT ON COLUMN banco_horas_reajustes.observacao IS 
'Observação obrigatória (mínimo 10 caracteres) explicando motivo do reajuste';

-- PASSO 8: Verificar resultado final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ CORREÇÃO CONCLUÍDA COM SUCESSO!';
  RAISE NOTICE '==================================';
  RAISE NOTICE '';
END $$;

-- Mostrar estrutura final
SELECT 
  'Coluna: ' || column_name || 
  ' | Tipo: ' || data_type || 
  ' | Nullable: ' || is_nullable as estrutura_final
FROM information_schema.columns
WHERE table_name = 'banco_horas_reajustes'
AND column_name = 'observacao';

-- Mostrar constraints finais
SELECT 
  'Constraint: ' || conname || 
  ' | Definição: ' || pg_get_constraintdef(oid) as constraints_finais
FROM pg_constraint
WHERE conrelid = 'banco_horas_reajustes'::regclass
AND conname LIKE '%observacao%';

-- PASSO 9: Teste de INSERT
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TESTE DE INSERT';
  RAISE NOTICE '==================';
  
  -- Tentar inserir um registro de teste
  BEGIN
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
    RAISE NOTICE '';
    RAISE NOTICE '🎉 TUDO FUNCIONANDO PERFEITAMENTE!';
    RAISE NOTICE 'Agora você pode criar reajustes normalmente na aplicação.';
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Erro no INSERT de teste: %', SQLERRM;
    RAISE NOTICE 'Por favor, copie esta mensagem e envie para análise.';
  END;
END $$;
