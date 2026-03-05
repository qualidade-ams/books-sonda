-- Migration: Adicionar novos cargos ao organograma (Customer Success e Comercial)
-- Data: 2026-03-04
-- Descrição: Adiciona os cargos "Customer Success" e "Comercial" ao sistema de organograma
--            Estes cargos não têm superior nem subordinados (cargos independentes)

-- PASSO 1: Verificar constraint atual
DO $$
BEGIN
  RAISE NOTICE '📋 Verificando constraint atual da coluna cargo...';
END $$;

SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'organizacao_estrutura'::regclass
  AND conname LIKE '%cargo%';

-- PASSO 2: Remover constraints antigas (se existirem)
DO $$
BEGIN
  -- Remover constraint de cargo (valores permitidos)
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'organizacao_estrutura'::regclass 
      AND conname = 'organizacao_estrutura_cargo_check'
  ) THEN
    ALTER TABLE organizacao_estrutura 
    DROP CONSTRAINT organizacao_estrutura_cargo_check;
    RAISE NOTICE '✅ Constraint antiga removida: organizacao_estrutura_cargo_check';
  END IF;

  -- Remover constraint de hierarquia flexível
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'organizacao_estrutura'::regclass 
      AND conname = 'valid_hierarchy_flexible'
  ) THEN
    ALTER TABLE organizacao_estrutura 
    DROP CONSTRAINT valid_hierarchy_flexible;
    RAISE NOTICE '✅ Constraint antiga removida: valid_hierarchy_flexible';
  END IF;

  -- Tentar remover outras possíveis constraints de cargo
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'organizacao_estrutura'::regclass 
      AND conname LIKE '%cargo%'
      AND conname NOT IN ('organizacao_estrutura_cargo_check', 'valid_hierarchy_flexible')
  ) THEN
    DECLARE
      constraint_name TEXT;
    BEGIN
      SELECT conname INTO constraint_name
      FROM pg_constraint
      WHERE conrelid = 'organizacao_estrutura'::regclass
        AND conname LIKE '%cargo%'
        AND conname NOT IN ('organizacao_estrutura_cargo_check', 'valid_hierarchy_flexible')
      LIMIT 1;
      
      IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE organizacao_estrutura DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE '✅ Constraint antiga removida: %', constraint_name;
      END IF;
    END;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Erro ao remover constraint antiga: %', SQLERRM;
END $$;

-- PASSO 3: Adicionar novas constraints com os novos cargos

-- 3.1: Constraint de valores permitidos para cargo
ALTER TABLE organizacao_estrutura
ADD CONSTRAINT organizacao_estrutura_cargo_check 
CHECK (cargo IN (
  'Diretor', 
  'Gerente', 
  'Coordenador', 
  'Central Escalação',
  'Customer Success',
  'Comercial'
));

-- 3.2: Constraint de hierarquia flexível (atualizada com novos cargos)
-- Regras:
-- - Diretor, Customer Success, Comercial: NÃO podem ter superior (superior_id MUST be NULL)
-- - Gerente, Coordenador, Central Escalação: podem ou não ter superior (flexível)
ALTER TABLE organizacao_estrutura
ADD CONSTRAINT valid_hierarchy_flexible CHECK (
  (cargo IN ('Diretor', 'Customer Success', 'Comercial') AND superior_id IS NULL) OR
  (cargo IN ('Gerente', 'Coordenador', 'Central Escalação'))
);

-- PASSO 4: Verificar se as constraints foram criadas corretamente
DO $$
BEGIN
  -- Verificar constraint de cargo
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'organizacao_estrutura'::regclass 
      AND conname = 'organizacao_estrutura_cargo_check'
  ) THEN
    RAISE NOTICE '✅ Constraint de cargo criada com sucesso!';
    RAISE NOTICE '📋 Cargos permitidos: Diretor, Gerente, Coordenador, Central Escalação, Customer Success, Comercial';
  ELSE
    RAISE EXCEPTION '❌ Falha ao criar constraint de cargo!';
  END IF;

  -- Verificar constraint de hierarquia
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'organizacao_estrutura'::regclass 
      AND conname = 'valid_hierarchy_flexible'
  ) THEN
    RAISE NOTICE '✅ Constraint de hierarquia criada com sucesso!';
    RAISE NOTICE '📋 Regras: Diretor/Customer Success/Comercial sem superior, demais cargos flexíveis';
  ELSE
    RAISE EXCEPTION '❌ Falha ao criar constraint de hierarquia!';
  END IF;
END $$;

-- PASSO 5: Testar inserção de novos cargos (rollback automático)
DO $$
BEGIN
  -- Teste Customer Success
  BEGIN
    INSERT INTO organizacao_estrutura (nome, cargo, departamento, email)
    VALUES ('Teste Customer Success', 'Customer Success', 'CS', 'teste.cs@exemplo.com');
    
    DELETE FROM organizacao_estrutura WHERE email = 'teste.cs@exemplo.com';
    RAISE NOTICE '✅ Teste Customer Success: OK';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION '❌ Teste Customer Success falhou: %', SQLERRM;
  END;

  -- Teste Comercial
  BEGIN
    INSERT INTO organizacao_estrutura (nome, cargo, departamento, email)
    VALUES ('Teste Comercial', 'Comercial', 'Vendas', 'teste.comercial@exemplo.com');
    
    DELETE FROM organizacao_estrutura WHERE email = 'teste.comercial@exemplo.com';
    RAISE NOTICE '✅ Teste Comercial: OK';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION '❌ Teste Comercial falhou: %', SQLERRM;
  END;
END $$;

-- PASSO 6: Adicionar comentários para documentação
COMMENT ON CONSTRAINT organizacao_estrutura_cargo_check ON organizacao_estrutura IS 
'Constraint que define os cargos permitidos no organograma. 
Cargos independentes (sem hierarquia): Diretor, Customer Success, Comercial
Cargos com hierarquia: Gerente → Coordenador → Central Escalação';

COMMENT ON CONSTRAINT valid_hierarchy_flexible ON organizacao_estrutura IS 
'Constraint de hierarquia flexível:
- Diretor, Customer Success, Comercial: NÃO podem ter superior (superior_id MUST be NULL)
- Gerente, Coordenador, Central Escalação: podem ou não ter superior (vinculação flexível)
Hierarquia: Diretor > Gerente > Coordenador > Central Escalação';

COMMENT ON COLUMN organizacao_estrutura.cargo IS 
'Cargo da pessoa no organograma. Valores permitidos: Diretor, Gerente, Coordenador, Central Escalação, Customer Success, Comercial';

-- PASSO 7: Verificar dados existentes
DO $$
DECLARE
  total_pessoas INTEGER;
  total_por_cargo RECORD;
BEGIN
  SELECT COUNT(*) INTO total_pessoas FROM organizacao_estrutura;
  RAISE NOTICE '📊 Total de pessoas cadastradas: %', total_pessoas;
  
  RAISE NOTICE '📊 Distribuição por cargo:';
  FOR total_por_cargo IN 
    SELECT cargo, COUNT(*) as total 
    FROM organizacao_estrutura 
    GROUP BY cargo 
    ORDER BY cargo
  LOOP
    RAISE NOTICE '   - %: % pessoa(s)', total_por_cargo.cargo, total_por_cargo.total;
  END LOOP;
END $$;

-- Finalização
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Migration concluída com sucesso!';
  RAISE NOTICE '✅ Novos cargos adicionados: Customer Success e Comercial';
  RAISE NOTICE '📝 Estes cargos não têm superior nem subordinados (cargos independentes)';
  RAISE NOTICE '';
END $$;
