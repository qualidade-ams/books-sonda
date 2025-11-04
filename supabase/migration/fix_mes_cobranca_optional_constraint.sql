-- Migração para tornar o campo mes_cobranca opcional
-- Corrige a constraint para permitir valores vazios/null

-- 1. Remover a constraint atual que força formato obrigatório
ALTER TABLE requerimentos 
DROP CONSTRAINT IF EXISTS mes_cobranca_format_check;

-- 2. Adicionar nova constraint que permite valores vazios/null OU formato válido
ALTER TABLE requerimentos 
ADD CONSTRAINT mes_cobranca_format_check 
CHECK (
  mes_cobranca IS NULL OR 
  mes_cobranca = '' OR 
  mes_cobranca ~ '^(0[1-9]|1[0-2])\/\d{4}$'
);

-- 3. Verificar se a constraint foi aplicada corretamente
DO $$
BEGIN
  -- Verificar se a constraint existe
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'mes_cobranca_format_check' 
    AND table_name = 'requerimentos'
  ) THEN
    RAISE NOTICE 'Constraint mes_cobranca_format_check atualizada com sucesso';
  ELSE
    RAISE NOTICE 'ERRO: Constraint mes_cobranca_format_check não foi criada';
  END IF;
END $$;

-- 4. Testar a constraint com valores válidos
DO $$
BEGIN
  -- Teste 1: Valor vazio deve ser aceito
  BEGIN
    INSERT INTO requerimentos (
      chamado, cliente_id, modulo, descricao, data_envio, 
      horas_funcional, horas_tecnico, linguagem, tipo_cobranca, 
      mes_cobranca, autor_id, autor_nome
    ) VALUES (
      'TEST-EMPTY', 
      (SELECT id FROM empresas_clientes LIMIT 1),
      'Comply', 'Teste campo vazio', CURRENT_DATE,
      8, 4, 'Funcional', 'Banco de Horas',
      '', -- Campo vazio
      (SELECT id FROM auth.users LIMIT 1),
      'Sistema'
    );
    
    -- Limpar teste
    DELETE FROM requerimentos WHERE chamado = 'TEST-EMPTY';
    RAISE NOTICE 'Teste 1 PASSOU: Campo vazio aceito';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Teste 1 FALHOU: Campo vazio rejeitado - %', SQLERRM;
  END;

  -- Teste 2: Valor NULL deve ser aceito
  BEGIN
    INSERT INTO requerimentos (
      chamado, cliente_id, modulo, descricao, data_envio, 
      horas_funcional, horas_tecnico, linguagem, tipo_cobranca, 
      mes_cobranca, autor_id, autor_nome
    ) VALUES (
      'TEST-NULL', 
      (SELECT id FROM empresas_clientes LIMIT 1),
      'Comply', 'Teste campo null', CURRENT_DATE,
      8, 4, 'Funcional', 'Banco de Horas',
      NULL, -- Campo null
      (SELECT id FROM auth.users LIMIT 1),
      'Sistema'
    );
    
    -- Limpar teste
    DELETE FROM requerimentos WHERE chamado = 'TEST-NULL';
    RAISE NOTICE 'Teste 2 PASSOU: Campo NULL aceito';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Teste 2 FALHOU: Campo NULL rejeitado - %', SQLERRM;
  END;

  -- Teste 3: Valor válido deve ser aceito
  BEGIN
    INSERT INTO requerimentos (
      chamado, cliente_id, modulo, descricao, data_envio, 
      horas_funcional, horas_tecnico, linguagem, tipo_cobranca, 
      mes_cobranca, autor_id, autor_nome
    ) VALUES (
      'TEST-VALID', 
      (SELECT id FROM empresas_clientes LIMIT 1),
      'Comply', 'Teste campo válido', CURRENT_DATE,
      8, 4, 'Funcional', 'Banco de Horas',
      '11/2024', -- Campo válido
      (SELECT id FROM auth.users LIMIT 1),
      'Sistema'
    );
    
    -- Limpar teste
    DELETE FROM requerimentos WHERE chamado = 'TEST-VALID';
    RAISE NOTICE 'Teste 3 PASSOU: Campo válido aceito';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Teste 3 FALHOU: Campo válido rejeitado - %', SQLERRM;
  END;

  -- Teste 4: Valor inválido deve ser rejeitado
  BEGIN
    INSERT INTO requerimentos (
      chamado, cliente_id, modulo, descricao, data_envio, 
      horas_funcional, horas_tecnico, linguagem, tipo_cobranca, 
      mes_cobranca, autor_id, autor_nome
    ) VALUES (
      'TEST-INVALID', 
      (SELECT id FROM empresas_clientes LIMIT 1),
      'Comply', 'Teste campo inválido', CURRENT_DATE,
      8, 4, 'Funcional', 'Banco de Horas',
      '13/2024', -- Campo inválido
      (SELECT id FROM auth.users LIMIT 1),
      'Sistema'
    );
    
    -- Se chegou aqui, o teste falhou
    DELETE FROM requerimentos WHERE chamado = 'TEST-INVALID';
    RAISE NOTICE 'Teste 4 FALHOU: Campo inválido foi aceito (deveria ser rejeitado)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Teste 4 PASSOU: Campo inválido rejeitado corretamente';
  END;
END $$;

-- 5. Exibir resumo da migração
RAISE NOTICE '=== MIGRAÇÃO CONCLUÍDA ===';
RAISE NOTICE 'Campo mes_cobranca agora aceita:';
RAISE NOTICE '- Valores vazios ("")';
RAISE NOTICE '- Valores NULL';
RAISE NOTICE '- Formato MM/YYYY válido';
RAISE NOTICE 'E rejeita formatos inválidos';