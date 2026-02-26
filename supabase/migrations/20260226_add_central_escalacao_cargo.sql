-- Migration: Adicionar cargo "Central Escalação"
-- Data: 2026-02-26
-- Descrição: Adiciona o cargo "Central Escalação" ao CHECK constraint da tabela organizacao_estrutura
-- Central Escalação se relaciona com Coordenador (subordinado a Coordenador)

-- PASSO 1: Remover constraints antigas
ALTER TABLE public.organizacao_estrutura 
DROP CONSTRAINT IF EXISTS organizacao_estrutura_cargo_check;

ALTER TABLE public.organizacao_estrutura 
DROP CONSTRAINT IF EXISTS valid_hierarchy_flexible;

ALTER TABLE public.organizacao_estrutura 
DROP CONSTRAINT IF EXISTS valid_hierarchy;

-- PASSO 2: Adicionar nova constraint de cargo com "Central Escalação"
ALTER TABLE public.organizacao_estrutura 
ADD CONSTRAINT organizacao_estrutura_cargo_check 
CHECK (cargo IN ('Diretor', 'Gerente', 'Coordenador', 'Central Escalação'));

-- PASSO 3: Adicionar nova constraint de hierarquia flexível
-- Regras:
-- - Diretor: não pode ter superior
-- - Gerente, Coordenador, Central Escalação: podem ou não ter superior (flexível)
ALTER TABLE public.organizacao_estrutura 
ADD CONSTRAINT valid_hierarchy_flexible CHECK (
  (cargo = 'Diretor' AND superior_id IS NULL) OR
  (cargo IN ('Gerente', 'Coordenador', 'Central Escalação'))
);

-- PASSO 4: Atualizar comentários
COMMENT ON COLUMN public.organizacao_estrutura.cargo IS 'Cargo: Diretor, Gerente, Coordenador ou Central Escalação';
COMMENT ON CONSTRAINT valid_hierarchy_flexible ON public.organizacao_estrutura IS 
'Constraint flexível: Diretor não pode ter superior. Gerente, Coordenador e Central Escalação podem ser criados sem superior e vinculados depois. Hierarquia: Diretor > Gerente > Coordenador > Central Escalação.';

-- PASSO 5: Verificar se as constraints foram criadas corretamente
DO $$
DECLARE
  cargo_constraint_exists BOOLEAN;
  hierarchy_constraint_exists BOOLEAN;
BEGIN
  -- Verificar constraint de cargo
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint 
    WHERE conname = 'organizacao_estrutura_cargo_check'
      AND conrelid = 'public.organizacao_estrutura'::regclass
  ) INTO cargo_constraint_exists;
  
  -- Verificar constraint de hierarquia
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint 
    WHERE conname = 'valid_hierarchy_flexible'
      AND conrelid = 'public.organizacao_estrutura'::regclass
  ) INTO hierarchy_constraint_exists;
  
  IF cargo_constraint_exists AND hierarchy_constraint_exists THEN
    RAISE NOTICE '✅ SUCESSO: Constraints atualizadas com sucesso';
    RAISE NOTICE '   - Cargo: Diretor, Gerente, Coordenador, Central Escalação';
    RAISE NOTICE '   - Hierarquia: Diretor sem superior, demais cargos flexíveis';
  ELSE
    IF NOT cargo_constraint_exists THEN
      RAISE EXCEPTION '❌ FALHA: Constraint de cargo não foi criada';
    END IF;
    IF NOT hierarchy_constraint_exists THEN
      RAISE EXCEPTION '❌ FALHA: Constraint de hierarquia não foi criada';
    END IF;
  END IF;
END $$;
