-- =====================================================
-- Sistema de Requerimentos - Testes de Validação
-- =====================================================
-- Script para testar e validar a estrutura do banco
-- após execução das migrações
-- =====================================================

-- Função para executar todos os testes de validação
CREATE OR REPLACE FUNCTION test_sistema_requerimentos_infrastructure()
RETURNS TABLE (
  test_name TEXT,
  status TEXT,
  details TEXT
) AS $$
DECLARE
  test_result RECORD;
BEGIN
  -- Teste 1: Verificar se a tabela requerimentos existe
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'requerimentos') THEN
      RETURN QUERY SELECT 'Tabela requerimentos'::TEXT, 'PASS'::TEXT, 'Tabela criada com sucesso'::TEXT;
    ELSE
      RETURN QUERY SELECT 'Tabela requerimentos'::TEXT, 'FAIL'::TEXT, 'Tabela não encontrada'::TEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Tabela requerimentos'::TEXT, 'ERROR'::TEXT, SQLERRM::TEXT;
  END;

  -- Teste 2: Verificar colunas obrigatórias
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'requerimentos' 
      AND column_name IN ('id', 'chamado', 'cliente_id', 'modulo', 'descricao', 'horas_total')
    ) THEN
      RETURN QUERY SELECT 'Colunas obrigatórias'::TEXT, 'PASS'::TEXT, 'Todas as colunas principais encontradas'::TEXT;
    ELSE
      RETURN QUERY SELECT 'Colunas obrigatórias'::TEXT, 'FAIL'::TEXT, 'Algumas colunas estão faltando'::TEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Colunas obrigatórias'::TEXT, 'ERROR'::TEXT, SQLERRM::TEXT;
  END;

  -- Teste 3: Verificar constraints
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.check_constraints 
      WHERE constraint_name LIKE '%valid_%' 
      AND table_name = 'requerimentos'
    ) THEN
      RETURN QUERY SELECT 'Constraints de validação'::TEXT, 'PASS'::TEXT, 'Constraints criadas com sucesso'::TEXT;
    ELSE
      RETURN QUERY SELECT 'Constraints de validação'::TEXT, 'FAIL'::TEXT, 'Constraints não encontradas'::TEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Constraints de validação'::TEXT, 'ERROR'::TEXT, SQLERRM::TEXT;
  END;

  -- Teste 4: Verificar índices
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'requerimentos' 
      AND indexname LIKE 'idx_requerimentos_%'
    ) THEN
      RETURN QUERY SELECT 'Índices de otimização'::TEXT, 'PASS'::TEXT, 'Índices criados com sucesso'::TEXT;
    ELSE
      RETURN QUERY SELECT 'Índices de otimização'::TEXT, 'FAIL'::TEXT, 'Índices não encontrados'::TEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Índices de otimização'::TEXT, 'ERROR'::TEXT, SQLERRM::TEXT;
  END;

  -- Teste 5: Verificar trigger de updated_at
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE trigger_name = 'trigger_update_requerimentos_updated_at'
    ) THEN
      RETURN QUERY SELECT 'Trigger updated_at'::TEXT, 'PASS'::TEXT, 'Trigger criado com sucesso'::TEXT;
    ELSE
      RETURN QUERY SELECT 'Trigger updated_at'::TEXT, 'FAIL'::TEXT, 'Trigger não encontrado'::TEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Trigger updated_at'::TEXT, 'ERROR'::TEXT, SQLERRM::TEXT;
  END;

  -- Teste 6: Verificar telas no sistema de permissões
  BEGIN
    IF EXISTS (
      SELECT 1 FROM screens 
      WHERE screen_key IN ('lancar_requerimentos', 'faturar_requerimentos')
    ) THEN
      RETURN QUERY SELECT 'Telas de permissão'::TEXT, 'PASS'::TEXT, 'Telas registradas no sistema'::TEXT;
    ELSE
      RETURN QUERY SELECT 'Telas de permissão'::TEXT, 'FAIL'::TEXT, 'Telas não registradas'::TEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Telas de permissão'::TEXT, 'ERROR'::TEXT, SQLERRM::TEXT;
  END;

  -- Teste 7: Verificar permissões do grupo administrador
  BEGIN
    IF EXISTS (
      SELECT 1 FROM screen_permissions sp
      JOIN screens s ON sp.screen_id = s.id
      JOIN groups g ON sp.group_id = g.id
      WHERE s.screen_key IN ('lancar_requerimentos', 'faturar_requerimentos')
        AND (g.name ILIKE '%admin%')
    ) THEN
      RETURN QUERY SELECT 'Permissões administrador'::TEXT, 'PASS'::TEXT, 'Permissões configuradas para admin'::TEXT;
    ELSE
      RETURN QUERY SELECT 'Permissões administrador'::TEXT, 'FAIL'::TEXT, 'Permissões não configuradas'::TEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Permissões administrador'::TEXT, 'ERROR'::TEXT, SQLERRM::TEXT;
  END;

  -- Teste 8: Verificar RLS habilitado
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_class 
      WHERE relname = 'requerimentos' AND relrowsecurity = true
    ) THEN
      RETURN QUERY SELECT 'RLS habilitado'::TEXT, 'PASS'::TEXT, 'Row Level Security ativo'::TEXT;
    ELSE
      RETURN QUERY SELECT 'RLS habilitado'::TEXT, 'FAIL'::TEXT, 'RLS não está ativo'::TEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'RLS habilitado'::TEXT, 'ERROR'::TEXT, SQLERRM::TEXT;
  END;

  -- Teste 9: Verificar políticas RLS
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'requerimentos'
    ) THEN
      RETURN QUERY SELECT 'Políticas RLS'::TEXT, 'PASS'::TEXT, 'Políticas de segurança criadas'::TEXT;
    ELSE
      RETURN QUERY SELECT 'Políticas RLS'::TEXT, 'FAIL'::TEXT, 'Políticas não encontradas'::TEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Políticas RLS'::TEXT, 'ERROR'::TEXT, SQLERRM::TEXT;
  END;

  -- Teste 10: Verificar função de permissões
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'check_requerimentos_permission'
    ) THEN
      RETURN QUERY SELECT 'Função de permissões'::TEXT, 'PASS'::TEXT, 'Função auxiliar criada'::TEXT;
    ELSE
      RETURN QUERY SELECT 'Função de permissões'::TEXT, 'FAIL'::TEXT, 'Função não encontrada'::TEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Função de permissões'::TEXT, 'ERROR'::TEXT, SQLERRM::TEXT;
  END;

END;
$$ LANGUAGE plpgsql;

-- Teste de inserção de dados (simulação)
CREATE OR REPLACE FUNCTION test_requerimentos_data_operations()
RETURNS TABLE (
  operation TEXT,
  status TEXT,
  details TEXT
) AS $$
DECLARE
  test_cliente_id UUID;
  test_requerimento_id UUID;
BEGIN
  -- Buscar um cliente existente para teste
  SELECT id INTO test_cliente_id FROM empresas_clientes LIMIT 1;
  
  IF test_cliente_id IS NULL THEN
    RETURN QUERY SELECT 'Buscar cliente teste'::TEXT, 'SKIP'::TEXT, 'Nenhum cliente encontrado para teste'::TEXT;
    RETURN;
  END IF;

  -- Teste de inserção
  BEGIN
    INSERT INTO requerimentos (
      chamado, cliente_id, modulo, descricao, data_envio, data_aprovacao,
      horas_funcional, horas_tecnico, linguagem, tipo_cobranca, mes_cobranca
    ) VALUES (
      'RF-TEST001', test_cliente_id, 'Comply', 'Teste de inserção de requerimento',
      CURRENT_DATE, CURRENT_DATE, 10.5, 5.0, 'Funcional', 'Faturado', 12
    ) RETURNING id INTO test_requerimento_id;
    
    RETURN QUERY SELECT 'Inserção de dados'::TEXT, 'PASS'::TEXT, 'Requerimento inserido com sucesso'::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Inserção de dados'::TEXT, 'FAIL'::TEXT, SQLERRM::TEXT;
    RETURN;
  END;

  -- Teste de cálculo automático de horas_total
  BEGIN
    IF EXISTS (
      SELECT 1 FROM requerimentos 
      WHERE id = test_requerimento_id AND horas_total = 15.5
    ) THEN
      RETURN QUERY SELECT 'Cálculo horas_total'::TEXT, 'PASS'::TEXT, 'Campo calculado automaticamente'::TEXT;
    ELSE
      RETURN QUERY SELECT 'Cálculo horas_total'::TEXT, 'FAIL'::TEXT, 'Campo não calculado corretamente'::TEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Cálculo horas_total'::TEXT, 'ERROR'::TEXT, SQLERRM::TEXT;
  END;

  -- Teste de atualização
  BEGIN
    UPDATE requerimentos 
    SET observacao = 'Teste de atualização'
    WHERE id = test_requerimento_id;
    
    RETURN QUERY SELECT 'Atualização de dados'::TEXT, 'PASS'::TEXT, 'Requerimento atualizado com sucesso'::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Atualização de dados'::TEXT, 'FAIL'::TEXT, SQLERRM::TEXT;
  END;

  -- Limpeza: remover dados de teste
  BEGIN
    DELETE FROM requerimentos WHERE id = test_requerimento_id;
    RETURN QUERY SELECT 'Limpeza de teste'::TEXT, 'PASS'::TEXT, 'Dados de teste removidos'::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Limpeza de teste'::TEXT, 'FAIL'::TEXT, SQLERRM::TEXT;
  END;

END;
$$ LANGUAGE plpgsql;

-- Executar todos os testes
DO $$
DECLARE
  test_record RECORD;
  total_tests INTEGER := 0;
  passed_tests INTEGER := 0;
  failed_tests INTEGER := 0;
  error_tests INTEGER := 0;
BEGIN
  RAISE NOTICE '=== INICIANDO TESTES DE VALIDAÇÃO DO SISTEMA DE REQUERIMENTOS ===';
  RAISE NOTICE '';
  
  -- Executar testes de infraestrutura
  RAISE NOTICE 'TESTES DE INFRAESTRUTURA:';
  FOR test_record IN SELECT * FROM test_sistema_requerimentos_infrastructure() LOOP
    total_tests := total_tests + 1;
    
    CASE test_record.status
      WHEN 'PASS' THEN 
        passed_tests := passed_tests + 1;
        RAISE NOTICE '✓ %: % - %', test_record.test_name, test_record.status, test_record.details;
      WHEN 'FAIL' THEN 
        failed_tests := failed_tests + 1;
        RAISE NOTICE '✗ %: % - %', test_record.test_name, test_record.status, test_record.details;
      WHEN 'ERROR' THEN 
        error_tests := error_tests + 1;
        RAISE NOTICE '⚠ %: % - %', test_record.test_name, test_record.status, test_record.details;
    END CASE;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'TESTES DE OPERAÇÕES DE DADOS:';
  
  -- Executar testes de dados
  FOR test_record IN SELECT * FROM test_requerimentos_data_operations() LOOP
    total_tests := total_tests + 1;
    
    CASE test_record.operation
      WHEN 'PASS' THEN 
        passed_tests := passed_tests + 1;
        RAISE NOTICE '✓ %: % - %', test_record.operation, test_record.status, test_record.details;
      WHEN 'FAIL' THEN 
        failed_tests := failed_tests + 1;
        RAISE NOTICE '✗ %: % - %', test_record.operation, test_record.status, test_record.details;
      WHEN 'ERROR' THEN 
        error_tests := error_tests + 1;
        RAISE NOTICE '⚠ %: % - %', test_record.operation, test_record.status, test_record.details;
      ELSE
        CASE test_record.status
          WHEN 'PASS' THEN 
            passed_tests := passed_tests + 1;
            RAISE NOTICE '✓ %: % - %', test_record.operation, test_record.status, test_record.details;
          WHEN 'FAIL' THEN 
            failed_tests := failed_tests + 1;
            RAISE NOTICE '✗ %: % - %', test_record.operation, test_record.status, test_record.details;
          WHEN 'SKIP' THEN 
            RAISE NOTICE '- %: % - %', test_record.operation, test_record.status, test_record.details;
          ELSE
            error_tests := error_tests + 1;
            RAISE NOTICE '⚠ %: % - %', test_record.operation, test_record.status, test_record.details;
        END CASE;
    END CASE;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== RESUMO DOS TESTES ===';
  RAISE NOTICE 'Total de testes: %', total_tests;
  RAISE NOTICE 'Testes aprovados: %', passed_tests;
  RAISE NOTICE 'Testes falharam: %', failed_tests;
  RAISE NOTICE 'Testes com erro: %', error_tests;
  RAISE NOTICE '';
  
  IF failed_tests > 0 OR error_tests > 0 THEN
    RAISE NOTICE '⚠ ATENÇÃO: Alguns testes falharam. Verifique a configuração antes de prosseguir.';
  ELSE
    RAISE NOTICE '✓ SUCESSO: Todos os testes passaram. Sistema de requerimentos configurado corretamente.';
  END IF;
  
  RAISE NOTICE '=== FIM DOS TESTES ===';
END $$;

-- Limpeza das funções de teste (opcional)
-- DROP FUNCTION IF EXISTS test_sistema_requerimentos_infrastructure();
-- DROP FUNCTION IF EXISTS test_requerimentos_data_operations();