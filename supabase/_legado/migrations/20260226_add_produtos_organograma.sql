-- Migration: Adicionar suporte a múltiplos produtos no organograma
-- Data: 2026-02-26
-- Descrição: Permite que uma pessoa esteja em múltiplos organogramas (produtos)
-- Uma pessoa mantém o mesmo cargo, mas pode ter superiores diferentes em cada produto

-- PASSO 1: Criar tabela de relacionamento pessoa-produto
CREATE TABLE IF NOT EXISTS public.organizacao_produto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID NOT NULL REFERENCES public.organizacao_estrutura(id) ON DELETE CASCADE,
  produto VARCHAR(50) NOT NULL CHECK (produto IN ('COMEX', 'FISCAL', 'GALLERY')),
  superior_id UUID REFERENCES public.organizacao_estrutura(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Uma pessoa só pode estar uma vez em cada produto
  UNIQUE(pessoa_id, produto)
);

-- PASSO 2: Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_organizacao_produto_pessoa_id ON public.organizacao_produto(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_organizacao_produto_produto ON public.organizacao_produto(produto);
CREATE INDEX IF NOT EXISTS idx_organizacao_produto_superior_id ON public.organizacao_produto(superior_id);

-- PASSO 3: Trigger para atualizar updated_at
CREATE TRIGGER update_organizacao_produto_updated_at
  BEFORE UPDATE ON public.organizacao_produto
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- PASSO 3.5: Função para validar hierarquia (Diretor não pode ter superior)
CREATE OR REPLACE FUNCTION public.validate_organizacao_produto_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cargo TEXT;
BEGIN
  -- Se não há superior, sempre válido
  IF NEW.superior_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Buscar cargo da pessoa
  SELECT cargo INTO v_cargo
  FROM organizacao_estrutura
  WHERE id = NEW.pessoa_id;
  
  -- Diretor não pode ter superior
  IF v_cargo = 'Diretor' THEN
    RAISE EXCEPTION 'Diretor não pode ter superior em nenhum produto';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para validar hierarquia
CREATE TRIGGER validate_organizacao_produto_hierarchy_trigger
  BEFORE INSERT OR UPDATE ON public.organizacao_produto
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_organizacao_produto_hierarchy();

-- PASSO 4: Habilitar RLS
ALTER TABLE public.organizacao_produto ENABLE ROW LEVEL SECURITY;

-- PASSO 5: Políticas RLS (mesmas permissões da tabela principal)
CREATE POLICY "authenticated_select_organizacao_produto"
  ON public.organizacao_produto FOR SELECT
  TO authenticated
  USING (user_has_organograma_permission('view'));

CREATE POLICY "authenticated_insert_organizacao_produto"
  ON public.organizacao_produto FOR INSERT
  TO authenticated
  WITH CHECK (user_has_organograma_permission('edit'));

CREATE POLICY "authenticated_update_organizacao_produto"
  ON public.organizacao_produto FOR UPDATE
  TO authenticated
  USING (user_has_organograma_permission('edit'));

CREATE POLICY "authenticated_delete_organizacao_produto"
  ON public.organizacao_produto FOR DELETE
  TO authenticated
  USING (user_has_organograma_permission('edit'));

-- PASSO 6: Migrar dados existentes (se houver)
-- Assumindo que dados existentes são do produto COMEX por padrão
INSERT INTO public.organizacao_produto (pessoa_id, produto, superior_id)
SELECT 
  id as pessoa_id,
  'COMEX' as produto,
  superior_id
FROM public.organizacao_estrutura
WHERE NOT EXISTS (
  SELECT 1 FROM public.organizacao_produto op 
  WHERE op.pessoa_id = organizacao_estrutura.id 
  AND op.produto = 'COMEX'
);

-- PASSO 7: Remover coluna superior_id da tabela principal (agora está em organizacao_produto)
-- IMPORTANTE: Comentado para não quebrar código existente. Descomentar após atualizar o código.
-- ALTER TABLE public.organizacao_estrutura DROP COLUMN IF EXISTS superior_id;

-- PASSO 8: Comentários
COMMENT ON TABLE public.organizacao_produto IS 'Relacionamento N:N entre pessoas e produtos. Uma pessoa pode estar em múltiplos organogramas (produtos) com superiores diferentes.';
COMMENT ON COLUMN public.organizacao_produto.pessoa_id IS 'Referência à pessoa na estrutura organizacional';
COMMENT ON COLUMN public.organizacao_produto.produto IS 'Produto: COMEX, FISCAL ou GALLERY';
COMMENT ON COLUMN public.organizacao_produto.superior_id IS 'Superior hierárquico específico para este produto. Diretor não pode ter superior (validado por trigger).';
COMMENT ON COLUMN public.organizacao_produto.created_at IS 'Data de criação (UTC, exibir em America/Sao_Paulo)';
COMMENT ON COLUMN public.organizacao_produto.updated_at IS 'Data de última atualização (UTC, exibir em America/Sao_Paulo)';

-- PASSO 9: Função auxiliar para buscar pessoas por produto
CREATE OR REPLACE FUNCTION public.get_organizacao_por_produto(p_produto VARCHAR(50))
RETURNS TABLE (
  id UUID,
  nome TEXT,
  cargo TEXT,
  departamento TEXT,
  email TEXT,
  telefone TEXT,
  foto_url TEXT,
  superior_id UUID,
  produto VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    oe.id,
    oe.nome,
    oe.cargo,
    oe.departamento,
    oe.email,
    oe.telefone,
    oe.foto_url,
    op.superior_id,
    op.produto,
    oe.created_at,
    oe.updated_at
  FROM organizacao_estrutura oe
  INNER JOIN organizacao_produto op ON oe.id = op.pessoa_id
  WHERE op.produto = p_produto
  ORDER BY 
    CASE oe.cargo
      WHEN 'Diretor' THEN 1
      WHEN 'Gerente' THEN 2
      WHEN 'Coordenador' THEN 3
      WHEN 'Central Escalação' THEN 4
    END,
    oe.nome;
END;
$$;

COMMENT ON FUNCTION public.get_organizacao_por_produto IS 'Retorna todas as pessoas de um produto específico com seus superiores';

-- PASSO 10: Verificação
DO $$
DECLARE
  table_exists BOOLEAN;
  index_count INTEGER;
BEGIN
  -- Verificar se tabela foi criada
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'organizacao_produto'
  ) INTO table_exists;
  
  -- Contar índices criados
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'organizacao_produto';
  
  IF table_exists AND index_count >= 3 THEN
    RAISE NOTICE '✅ SUCESSO: Tabela organizacao_produto criada com sucesso';
    RAISE NOTICE '   - Suporte a múltiplos produtos: COMEX, FISCAL, GALLERY';
    RAISE NOTICE '   - Uma pessoa pode estar em múltiplos organogramas';
    RAISE NOTICE '   - Superiores específicos por produto';
    RAISE NOTICE '   - % índices criados', index_count;
  ELSE
    IF NOT table_exists THEN
      RAISE EXCEPTION '❌ FALHA: Tabela organizacao_produto não foi criada';
    END IF;
    IF index_count < 3 THEN
      RAISE EXCEPTION '❌ FALHA: Índices não foram criados corretamente';
    END IF;
  END IF;
END $$;
