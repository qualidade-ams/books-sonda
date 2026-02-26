-- Migration: Remover constraint de hierarquia obrigatória
-- Data: 2026-02-26
-- Descrição: Permite criar pessoas sem superior e fazer vínculo depois

-- Remover constraint antiga que exigia superior para Gerente/Coordenador
ALTER TABLE public.organizacao_estrutura 
DROP CONSTRAINT IF EXISTS valid_hierarchy;

-- Adicionar nova constraint mais flexível (apenas valida que Diretor não pode ter superior)
ALTER TABLE public.organizacao_estrutura 
ADD CONSTRAINT valid_hierarchy_flexible CHECK (
  (cargo = 'Diretor' AND superior_id IS NULL) OR
  (cargo IN ('Gerente', 'Coordenador'))
);

COMMENT ON CONSTRAINT valid_hierarchy_flexible ON public.organizacao_estrutura IS 
'Constraint flexível: Diretor não pode ter superior. Gerente e Coordenador podem ser criados sem superior e vinculados depois.';

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Constraint atualizada com sucesso!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Agora é possível:';
  RAISE NOTICE '- Criar Gerentes sem superior (vincular depois)';
  RAISE NOTICE '- Criar Coordenadores sem superior (vincular depois)';
  RAISE NOTICE '- Diretores continuam sem poder ter superior';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
