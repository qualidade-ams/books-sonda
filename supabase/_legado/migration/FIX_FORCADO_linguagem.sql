-- =====================================================
-- FIX FORÇADO: Corrigir linguagem IMEDIATAMENTE
-- Data: 2026-01-23
-- Descrição: Força a correção da coluna linguagem
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '🚨 INICIANDO FIX FORÇADO DA COLUNA LINGUAGEM';
  RAISE NOTICE '=============================================';
  RAISE NOTICE '';
  
  -- PASSO 1: Remover TODAS as constraints relacionadas a linguagem
  RAISE NOTICE '1️⃣ Removendo todas as constraints de linguagem...';
  
  BEGIN
    ALTER TABLE requerimentos DROP CONSTRAINT IF EXISTS valid_linguagem CASCADE;
    RAISE NOTICE '   ✅ Constraint valid_linguagem removida';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '   ⚠️ Erro ao remover valid_linguagem: %', SQLERRM;
  END;
  
  BEGIN
    ALTER TABLE requerimentos DROP CONSTRAINT IF EXISTS linguagem_required_with_horas_tecnico CASCADE;
    RAISE NOTICE '   ✅ Constraint linguagem_required_with_horas_tecnico removida';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '   ⚠️ Erro ao remover linguagem_required_with_horas_tecnico: %', SQLERRM;
  END;
  
  BEGIN
    ALTER TABLE requerimentos DROP CONSTRAINT IF EXISTS requerimentos_linguagem_check CASCADE;
    RAISE NOTICE '   ✅ Constraint requerimentos_linguagem_check removida';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '   ⚠️ Erro ao remover requerimentos_linguagem_check: %', SQLERRM;
  END;
  
  RAISE NOTICE '';
  
  -- PASSO 2: Remover NOT NULL da coluna
  RAISE NOTICE '2️⃣ Removendo NOT NULL da coluna linguagem...';
  
  BEGIN
    ALTER TABLE requerimentos ALTER COLUMN linguagem DROP NOT NULL;
    RAISE NOTICE '   ✅ NOT NULL removido com sucesso';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '   ⚠️ Erro (pode já estar removido): %', SQLERRM;
  END;
  
  RAISE NOTICE '';
  
  -- PASSO 3: Criar constraint valid_linguagem CORRETA (permite NULL)
  RAISE NOTICE '3️⃣ Criando constraint valid_linguagem (permite NULL)...';
  
  ALTER TABLE requerimentos 
  ADD CONSTRAINT valid_linguagem 
  CHECK (
    linguagem IS NULL OR 
    linguagem IN ('ABAP', 'DBA', 'Funcional', 'PL/SQL', 'Técnico')
  );
  
  RAISE NOTICE '   ✅ Constraint valid_linguagem criada (permite NULL)';
  RAISE NOTICE '';
  
  -- PASSO 4: Criar constraint condicional
  RAISE NOTICE '4️⃣ Criando constraint condicional...';
  
  ALTER TABLE requerimentos 
  ADD CONSTRAINT linguagem_required_with_horas_tecnico 
  CHECK (
    (horas_tecnico = 0 OR horas_tecnico IS NULL) OR 
    (horas_tecnico > 0 AND linguagem IS NOT NULL)
  );
  
  RAISE NOTICE '   ✅ Constraint linguagem_required_with_horas_tecnico criada';
  RAISE NOTICE '';
  
  -- PASSO 5: Atualizar comentário
  RAISE NOTICE '5️⃣ Atualizando comentário da coluna...';
  
  COMMENT ON COLUMN requerimentos.linguagem IS 
  'Linguagem/tipo técnico (ABAP, DBA, etc.) - Obrigatório apenas quando há horas técnicas';
  
  RAISE NOTICE '   ✅ Comentário atualizado';
  RAISE NOTICE '';
  
  -- PASSO 6: Verificar resultado
  RAISE NOTICE '6️⃣ Verificando resultado...';
  RAISE NOTICE '';
  
  -- Verificar coluna
  DECLARE
    is_nullable_result text;
    constraint_count int;
  BEGIN
    SELECT is_nullable INTO is_nullable_result
    FROM information_schema.columns 
    WHERE table_name = 'requerimentos' AND column_name = 'linguagem';
    
    SELECT COUNT(*) INTO constraint_count
    FROM pg_constraint 
    WHERE conrelid = 'requerimentos'::regclass 
    AND conname IN ('valid_linguagem', 'linguagem_required_with_horas_tecnico');
    
    IF is_nullable_result = 'YES' THEN
      RAISE NOTICE '   ✅ Coluna permite NULL';
    ELSE
      RAISE NOTICE '   ❌ ERRO: Coluna ainda é NOT NULL';
    END IF;
    
    IF constraint_count = 2 THEN
      RAISE NOTICE '   ✅ Ambas as constraints criadas';
    ELSE
      RAISE NOTICE '   ⚠️ Apenas % constraint(s) encontrada(s)', constraint_count;
    END IF;
  END;
  
  RAISE NOTICE '';
  RAISE NOTICE '=============================================';
  RAISE NOTICE '🎉 FIX FORÇADO CONCLUÍDO!';
  RAISE NOTICE '=============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 PRÓXIMOS PASSOS:';
  RAISE NOTICE '1. Execute DIAGNOSTICO_linguagem_URGENTE.sql para confirmar';
  RAISE NOTICE '2. Limpe o cache do navegador (Ctrl+Shift+Delete)';
  RAISE NOTICE '3. Faça hard refresh (Ctrl+F5)';
  RAISE NOTICE '4. Teste criar requerimento sem horas técnicas';
  RAISE NOTICE '';
  
END $$;
