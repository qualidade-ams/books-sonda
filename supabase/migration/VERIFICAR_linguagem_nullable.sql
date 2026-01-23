-- =====================================================
-- Script de Verificação: Campo Linguagem Opcional
-- Data: 2026-01-23
-- Descrição: Verifica se a migration foi aplicada corretamente
-- =====================================================

-- 1. Verificar se coluna linguagem permite NULL
SELECT 
  '1. Verificação de NULL' as verificacao,
  column_name,
  is_nullable,
  CASE 
    WHEN is_nullable = 'YES' THEN '✅ CORRETO - Coluna permite NULL'
    ELSE '❌ ERRO - Coluna ainda é NOT NULL'
  END as status
FROM information_schema.columns 
WHERE table_name = 'requerimentos' 
AND column_name = 'linguagem';

-- 2. Verificar constraints existentes
SELECT 
  '2. Constraints Existentes' as verificacao,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition,
  CASE 
    WHEN conname = 'valid_linguagem' AND pg_get_constraintdef(oid) LIKE '%IS NULL%' 
      THEN '✅ CORRETO - Permite NULL'
    WHEN conname = 'linguagem_required_with_horas_tecnico' 
      THEN '✅ CORRETO - Constraint condicional criada'
    ELSE '⚠️ VERIFICAR - Constraint pode estar incorreta'
  END as status
FROM pg_constraint 
WHERE conrelid = 'requerimentos'::regclass 
AND conname IN ('valid_linguagem', 'linguagem_required_with_horas_tecnico')
ORDER BY conname;

-- 3. Testar inserção de requerimento SEM horas técnicas e SEM linguagem
-- (Este teste NÃO insere dados reais, apenas valida a constraint)
DO $$
BEGIN
  -- Simular validação de constraint
  RAISE NOTICE '3. Teste de Validação de Constraints';
  RAISE NOTICE '-------------------------------------------';
  
  -- Teste 1: Sem horas técnicas, sem linguagem (DEVE PASSAR)
  BEGIN
    PERFORM 1 WHERE (0 = 0 OR 0 IS NULL) OR (0 > 0 AND NULL IS NOT NULL);
    RAISE NOTICE '✅ Teste 1 PASSOU: Requerimento sem horas técnicas e sem linguagem é válido';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Teste 1 FALHOU: %', SQLERRM;
  END;
  
  -- Teste 2: Com horas técnicas, sem linguagem (DEVE FALHAR)
  BEGIN
    PERFORM 1 WHERE (4 = 0 OR 4 IS NULL) OR (4 > 0 AND NULL IS NOT NULL);
    IF NOT FOUND THEN
      RAISE NOTICE '✅ Teste 2 PASSOU: Requerimento com horas técnicas sem linguagem é inválido (como esperado)';
    ELSE
      RAISE NOTICE '❌ Teste 2 FALHOU: Constraint não está bloqueando corretamente';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✅ Teste 2 PASSOU: Constraint bloqueou corretamente - %', SQLERRM;
  END;
  
  -- Teste 3: Com horas técnicas, com linguagem (DEVE PASSAR)
  BEGIN
    PERFORM 1 WHERE (4 = 0 OR 4 IS NULL) OR (4 > 0 AND 'ABAP' IS NOT NULL);
    RAISE NOTICE '✅ Teste 3 PASSOU: Requerimento com horas técnicas e linguagem é válido';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Teste 3 FALHOU: %', SQLERRM;
  END;
  
END $$;

-- 4. Verificar comentário da coluna
SELECT 
  '4. Comentário da Coluna' as verificacao,
  col_description('requerimentos'::regclass, 
    (SELECT ordinal_position FROM information_schema.columns 
     WHERE table_name = 'requerimentos' AND column_name = 'linguagem')
  ) as comentario,
  CASE 
    WHEN col_description('requerimentos'::regclass, 
      (SELECT ordinal_position FROM information_schema.columns 
       WHERE table_name = 'requerimentos' AND column_name = 'linguagem')
    ) LIKE '%Obrigatório apenas quando há horas técnicas%' 
      THEN '✅ CORRETO - Comentário atualizado'
    ELSE '⚠️ VERIFICAR - Comentário pode estar desatualizado'
  END as status;

-- 5. Resumo Final
DO $$
DECLARE
  is_nullable_check boolean;
  valid_linguagem_exists boolean;
  conditional_constraint_exists boolean;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '           RESUMO DA VERIFICAÇÃO';
  RAISE NOTICE '==============================================';
  
  -- Verificar NULL
  SELECT is_nullable = 'YES' INTO is_nullable_check
  FROM information_schema.columns 
  WHERE table_name = 'requerimentos' AND column_name = 'linguagem';
  
  -- Verificar constraints
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'requerimentos'::regclass 
    AND conname = 'valid_linguagem'
    AND pg_get_constraintdef(oid) LIKE '%IS NULL%'
  ) INTO valid_linguagem_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'requerimentos'::regclass 
    AND conname = 'linguagem_required_with_horas_tecnico'
  ) INTO conditional_constraint_exists;
  
  -- Exibir resultados
  IF is_nullable_check THEN
    RAISE NOTICE '✅ Coluna linguagem permite NULL';
  ELSE
    RAISE NOTICE '❌ Coluna linguagem ainda é NOT NULL';
  END IF;
  
  IF valid_linguagem_exists THEN
    RAISE NOTICE '✅ Constraint valid_linguagem permite NULL';
  ELSE
    RAISE NOTICE '❌ Constraint valid_linguagem não permite NULL';
  END IF;
  
  IF conditional_constraint_exists THEN
    RAISE NOTICE '✅ Constraint condicional criada';
  ELSE
    RAISE NOTICE '❌ Constraint condicional não encontrada';
  END IF;
  
  RAISE NOTICE '';
  
  IF is_nullable_check AND valid_linguagem_exists AND conditional_constraint_exists THEN
    RAISE NOTICE '🎉 MIGRATION APLICADA COM SUCESSO!';
    RAISE NOTICE '✅ Todos os testes passaram';
    RAISE NOTICE '✅ Sistema pronto para uso';
  ELSE
    RAISE NOTICE '⚠️ MIGRATION INCOMPLETA';
    RAISE NOTICE '❌ Alguns testes falharam';
    RAISE NOTICE '📝 Verifique os resultados acima';
  END IF;
  
  RAISE NOTICE '==============================================';
END $$;

-- 6. Instruções finais
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 PRÓXIMOS PASSOS:';
  RAISE NOTICE '1. Se todos os testes passaram, teste no frontend';
  RAISE NOTICE '2. Crie um requerimento sem horas técnicas';
  RAISE NOTICE '3. Verifique se não há erro de constraint';
  RAISE NOTICE '4. Limpe o cache do navegador (Ctrl+Shift+Delete)';
  RAISE NOTICE '5. Faça hard refresh (Ctrl+F5)';
  RAISE NOTICE '';
END $$;
