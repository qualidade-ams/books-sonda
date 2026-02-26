-- Migration: Adicionar campo ordem_exibicao ao organograma
-- Data: 2026-02-26
-- Descrição: Permite definir ordem customizada de exibição das pessoas no organograma

-- Adicionar coluna ordem_exibicao
ALTER TABLE public.organizacao_estrutura 
ADD COLUMN IF NOT EXISTS ordem_exibicao INTEGER DEFAULT 0;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_organizacao_estrutura_ordem 
ON public.organizacao_estrutura(superior_id, ordem_exibicao);

-- Atualizar ordem inicial baseada na ordem alfabética
WITH ranked_pessoas AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY superior_id ORDER BY nome) as nova_ordem
  FROM public.organizacao_estrutura
)
UPDATE public.organizacao_estrutura o
SET ordem_exibicao = r.nova_ordem
FROM ranked_pessoas r
WHERE o.id = r.id;

-- Comentário
COMMENT ON COLUMN public.organizacao_estrutura.ordem_exibicao IS 'Ordem de exibição no organograma (menor número aparece primeiro)';

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Campo ordem_exibicao adicionado!';
  RAISE NOTICE '';
  RAISE NOTICE 'Agora você pode reordenar pessoas no organograma';
  RAISE NOTICE 'através da interface de gerenciamento.';
  RAISE NOTICE '========================================';
END $$;
