-- =====================================================
-- Migration: Desabilitar Trigger de Hash Problemático
-- Data: 30/01/2026
-- Descrição: Desabilitar trigger que referencia campo hash_dados inexistente
-- =====================================================

-- 1. DESABILITAR TRIGGER PROBLEMÁTICO
-- =====================================================

DO $$
BEGIN
  -- Verificar se o trigger existe
  IF EXISTS (
    SELECT 1 
    FROM pg_trigger 
    WHERE tgname = 'trigger_atualizar_hash_pesquisa'
  ) THEN
    -- Desabilitar o trigger
    DROP TRIGGER IF EXISTS trigger_atualizar_hash_pesquisa ON pesquisas_satisfacao;
    RAISE NOTICE '✅ Trigger trigger_atualizar_hash_pesquisa removido';
  ELSE
    RAISE NOTICE '⚠️ Trigger trigger_atualizar_hash_pesquisa não existe';
  END IF;
END $$;

-- 2. VERIFICAR SE FUNÇÃO EXISTE E REMOVER SE NECESSÁRIO
-- =====================================================

DO $$
BEGIN
  -- Verificar se a função existe
  IF EXISTS (
    SELECT 1 
    FROM pg_proc 
    WHERE proname = 'atualizar_hash_pesquisa'
  ) THEN
    -- Remover a função
    DROP FUNCTION IF EXISTS atualizar_hash_pesquisa() CASCADE;
    RAISE NOTICE '✅ Função atualizar_hash_pesquisa removida';
  ELSE
    RAISE NOTICE '⚠️ Função atualizar_hash_pesquisa não existe';
  END IF;
END $$;

-- 3. VERIFICAR SE CAMPO hash_dados EXISTE
-- =====================================================

DO $$
DECLARE
  v_column_exists BOOLEAN;
BEGIN
  -- Verificar se a coluna hash_dados existe
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'pesquisas_satisfacao' 
      AND column_name = 'hash_dados'
  ) INTO v_column_exists;
  
  IF v_column_exists THEN
    RAISE NOTICE '✅ Campo hash_dados existe na tabela pesquisas_satisfacao';
  ELSE
    RAISE NOTICE '⚠️ Campo hash_dados NÃO existe na tabela pesquisas_satisfacao';
    RAISE NOTICE '   Trigger foi removido porque tentava acessar campo inexistente';
  END IF;
END $$;

-- 4. VALIDAÇÃO FINAL
-- =====================================================

DO $$
DECLARE
  v_trigger_count INTEGER;
  v_function_count INTEGER;
BEGIN
  -- Contar triggers restantes
  SELECT COUNT(*) INTO v_trigger_count
  FROM pg_trigger
  WHERE tgname = 'trigger_atualizar_hash_pesquisa';
  
  -- Contar funções restantes
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc
  WHERE proname = 'atualizar_hash_pesquisa';
  
  -- Validar
  IF v_trigger_count = 0 AND v_function_count = 0 THEN
    RAISE NOTICE '
╔════════════════════════════════════════════════════════════╗
║  TRIGGER PROBLEMÁTICO REMOVIDO                             ║
╠════════════════════════════════════════════════════════════╣
║  ✅ Trigger trigger_atualizar_hash_pesquisa removido       ║
║  ✅ Função atualizar_hash_pesquisa removida                ║
║  ✅ Sincronização deve funcionar sem erros                 ║
╚════════════════════════════════════════════════════════════╝
    ';
  ELSE
    RAISE WARNING '⚠️ Ainda existem triggers ou funções problemáticas:';
    RAISE WARNING '   - Triggers: %', v_trigger_count;
    RAISE WARNING '   - Funções: %', v_function_count;
  END IF;
END $$;

-- 5. COMENTÁRIO EXPLICATIVO
-- =====================================================

COMMENT ON TABLE pesquisas_satisfacao IS 
'Tabela de pesquisas de satisfação. 
NOTA: Trigger de hash foi removido porque referenciava campo hash_dados inexistente.
Se necessário recriar o trigger, primeiro adicione o campo hash_dados à tabela.';
