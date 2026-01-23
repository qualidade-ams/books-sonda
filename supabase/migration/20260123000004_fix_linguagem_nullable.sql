-- =====================================================
-- Migration: Tornar campo linguagem opcional (VERSÃO CORRIGIDA)
-- Data: 2026-01-23
-- Descrição: Permite que linguagem seja NULL quando não há horas técnicas
-- Versão: 2.0 - Com verificação de constraints existentes
-- =====================================================

DO $$
DECLARE
  is_nullable_check text;
  constraint_exists boolean;
BEGIN
  RAISE NOTICE '🚀 Iniciando migration: Campo linguagem opcional';
  RAISE NOTICE '================================================';
  
  -- 1. Verificar e remover NOT NULL do campo linguagem
  SELECT is_nullable INTO is_nullable_check
  FROM information_schema.columns 
  WHERE table_name = 'requerimentos' AND column_name = 'linguagem';
  
  IF is_nullable_check = 'NO' THEN
    RAISE NOTICE '📝 Removendo NOT NULL da coluna linguagem...';
    ALTER TABLE requerimentos ALTER COLUMN linguagem DROP NOT NULL;
    RAISE NOTICE '✅ NOT NULL removido com sucesso';
  ELSE
    RAISE NOTICE '✅ Coluna linguagem já permite NULL (skip)';
  END IF;
  
  -- 2. Atualizar constraint valid_linguagem
  RAISE NOTICE '';
  RAISE NOTICE '📝 Atualizando constraint valid_linguagem...';
  
  -- Remover constraint antiga se existir
  ALTER TABLE requerimentos DROP CONSTRAINT IF EXISTS valid_linguagem;
  
  -- Criar nova constraint que permite NULL
  ALTER TABLE requerimentos 
  ADD CONSTRAINT valid_linguagem 
  CHECK (
    linguagem IS NULL OR 
    linguagem IN ('ABAP', 'DBA', 'Funcional', 'PL/SQL', 'Técnico')
  );
  RAISE NOTICE '✅ Constraint valid_linguagem atualizada';
  
  -- 3. Verificar e adicionar constraint condicional
  RAISE NOTICE '';
  RAISE NOTICE '📝 Verificando constraint linguagem_required_with_horas_tecnico...';
  
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'requerimentos'::regclass 
    AND conname = 'linguagem_required_with_horas_tecnico'
  ) INTO constraint_exists;
  
  IF constraint_exists THEN
    RAISE NOTICE '⚠️ Constraint linguagem_required_with_horas_tecnico já existe';
    RAISE NOTICE '📝 Removendo constraint antiga...';
    ALTER TABLE requerimentos DROP CONSTRAINT linguagem_required_with_horas_tecnico;
    RAISE NOTICE '✅ Constraint antiga removida';
  END IF;
  
  RAISE NOTICE '📝 Criando constraint linguagem_required_with_horas_tecnico...';
  ALTER TABLE requerimentos 
  ADD CONSTRAINT linguagem_required_with_horas_tecnico 
  CHECK (
    (horas_tecnico = 0 OR horas_tecnico IS NULL) OR 
    (horas_tecnico > 0 AND linguagem IS NOT NULL)
  );
  RAISE NOTICE '✅ Constraint linguagem_required_with_horas_tecnico criada';
  
  -- 4. Atualizar comentário da coluna
  RAISE NOTICE '';
  RAISE NOTICE '📝 Atualizando comentário da coluna...';
  COMMENT ON COLUMN requerimentos.linguagem IS 
  'Linguagem/tipo técnico (ABAP, DBA, etc.) - Obrigatório apenas quando há horas técnicas';
  RAISE NOTICE '✅ Comentário atualizado';
  
  -- 5. Resumo final
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '🎉 MIGRATION CONCLUÍDA COM SUCESSO!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ Campo linguagem agora é opcional (nullable)';
  RAISE NOTICE '✅ Constraint valid_linguagem permite NULL';
  RAISE NOTICE '✅ Constraint condicional criada/atualizada';
  RAISE NOTICE '🔒 Linguagem obrigatória apenas quando horas_tecnico > 0';
  RAISE NOTICE '';
  RAISE NOTICE '📋 PRÓXIMOS PASSOS:';
  RAISE NOTICE '1. Execute o script VERIFICAR_linguagem_nullable.sql';
  RAISE NOTICE '2. Teste criar requerimento sem horas técnicas';
  RAISE NOTICE '3. Limpe o cache do navegador (Ctrl+Shift+Delete)';
  RAISE NOTICE '4. Faça hard refresh (Ctrl+F5)';
  RAISE NOTICE '================================================';
  
END $$;
