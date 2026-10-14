-- Migration: Suporte a múltiplos superiores para Central Escalação
-- Descrição: Permite que Central Escalação seja subordinado a TODOS os Coordenadores de um produto

-- =====================================================
-- PASSO 1: Criar tabela de múltiplos superiores
-- =====================================================

-- Tabela para relacionamento N:N entre pessoa e seus superiores por produto
CREATE TABLE IF NOT EXISTS public.organizacao_multiplos_superiores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID NOT NULL REFERENCES public.organizacao_estrutura(id) ON DELETE CASCADE,
  superior_id UUID NOT NULL REFERENCES public.organizacao_estrutura(id) ON DELETE CASCADE,
  produto VARCHAR(20) NOT NULL CHECK (produto IN ('COMEX', 'FISCAL', 'GALLERY')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Garantir que não haja duplicatas
  UNIQUE(pessoa_id, superior_id, produto)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_multiplos_superiores_pessoa ON public.organizacao_multiplos_superiores(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_multiplos_superiores_superior ON public.organizacao_multiplos_superiores(superior_id);
CREATE INDEX IF NOT EXISTS idx_multiplos_superiores_produto ON public.organizacao_multiplos_superiores(produto);

-- Comentários
COMMENT ON TABLE public.organizacao_multiplos_superiores IS 'Relacionamento N:N entre pessoas e seus múltiplos superiores por produto (usado para Central Escalação)';
COMMENT ON COLUMN public.organizacao_multiplos_superiores.pessoa_id IS 'ID da pessoa subordinada (geralmente Central Escalação)';
COMMENT ON COLUMN public.organizacao_multiplos_superiores.superior_id IS 'ID do superior (geralmente Coordenador)';
COMMENT ON COLUMN public.organizacao_multiplos_superiores.produto IS 'Produto onde existe a relação hierárquica';

-- =====================================================
-- PASSO 2: Habilitar RLS
-- =====================================================

ALTER TABLE public.organizacao_multiplos_superiores ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "authenticated_select_multiplos_superiores" ON public.organizacao_multiplos_superiores;
DROP POLICY IF EXISTS "authenticated_insert_multiplos_superiores" ON public.organizacao_multiplos_superiores;
DROP POLICY IF EXISTS "authenticated_update_multiplos_superiores" ON public.organizacao_multiplos_superiores;
DROP POLICY IF EXISTS "authenticated_delete_multiplos_superiores" ON public.organizacao_multiplos_superiores;

-- Criar políticas RLS
CREATE POLICY "authenticated_select_multiplos_superiores"
  ON public.organizacao_multiplos_superiores FOR SELECT
  TO authenticated
  USING (user_has_organograma_permission());

CREATE POLICY "authenticated_insert_multiplos_superiores"
  ON public.organizacao_multiplos_superiores FOR INSERT
  TO authenticated
  WITH CHECK (user_has_organograma_permission());

CREATE POLICY "authenticated_update_multiplos_superiores"
  ON public.organizacao_multiplos_superiores FOR UPDATE
  TO authenticated
  USING (user_has_organograma_permission());

CREATE POLICY "authenticated_delete_multiplos_superiores"
  ON public.organizacao_multiplos_superiores FOR DELETE
  TO authenticated
  USING (user_has_organograma_permission());

-- =====================================================
-- PASSO 3: Trigger para updated_at
-- =====================================================

CREATE TRIGGER update_multiplos_superiores_updated_at
  BEFORE UPDATE ON public.organizacao_multiplos_superiores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PASSO 4: Função para sincronizar múltiplos superiores
-- =====================================================

-- Função para sincronizar automaticamente múltiplos superiores quando Central Escalação é criado/atualizado
CREATE OR REPLACE FUNCTION public.sync_central_escalacao_superiores()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_produto VARCHAR(20);
  v_coordenador RECORD;
BEGIN
  -- Só processar se for Central Escalação
  IF NEW.cargo != 'Central Escalação' THEN
    RETURN NEW;
  END IF;

  -- Buscar todos os produtos da pessoa
  FOR v_produto IN 
    SELECT DISTINCT produto 
    FROM organizacao_produto 
    WHERE pessoa_id = NEW.id
  LOOP
    -- Limpar superiores antigos deste produto
    DELETE FROM organizacao_multiplos_superiores
    WHERE pessoa_id = NEW.id AND produto = v_produto;

    -- Adicionar todos os coordenadores deste produto como superiores
    FOR v_coordenador IN
      SELECT DISTINCT oe.id
      FROM organizacao_estrutura oe
      INNER JOIN organizacao_produto op ON op.pessoa_id = oe.id
      WHERE oe.cargo = 'Coordenador'
        AND op.produto = v_produto
    LOOP
      INSERT INTO organizacao_multiplos_superiores (pessoa_id, superior_id, produto)
      VALUES (NEW.id, v_coordenador.id, v_produto)
      ON CONFLICT (pessoa_id, superior_id, produto) DO NOTHING;
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_central_escalacao_superiores() IS 'Sincroniza automaticamente múltiplos superiores para Central Escalação';

-- Trigger para sincronizar após INSERT/UPDATE
DROP TRIGGER IF EXISTS trigger_sync_central_escalacao ON public.organizacao_estrutura;
CREATE TRIGGER trigger_sync_central_escalacao
  AFTER INSERT OR UPDATE OF cargo ON public.organizacao_estrutura
  FOR EACH ROW
  EXECUTE FUNCTION sync_central_escalacao_superiores();

-- =====================================================
-- PASSO 5: Função para buscar superiores de uma pessoa
-- =====================================================

-- Função para buscar todos os superiores de uma pessoa (incluindo múltiplos)
CREATE OR REPLACE FUNCTION public.get_superiores_pessoa(p_pessoa_id UUID, p_produto VARCHAR(20))
RETURNS TABLE (
  superior_id UUID,
  superior_nome TEXT,
  superior_cargo VARCHAR(50)
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Buscar superior único da tabela organizacao_produto
  RETURN QUERY
  SELECT 
    oe.id,
    oe.nome,
    oe.cargo
  FROM organizacao_produto op
  INNER JOIN organizacao_estrutura oe ON oe.id = op.superior_id
  WHERE op.pessoa_id = p_pessoa_id
    AND op.produto = p_produto
    AND op.superior_id IS NOT NULL
  
  UNION
  
  -- Buscar múltiplos superiores da tabela organizacao_multiplos_superiores
  SELECT 
    oe.id,
    oe.nome,
    oe.cargo
  FROM organizacao_multiplos_superiores oms
  INNER JOIN organizacao_estrutura oe ON oe.id = oms.superior_id
  WHERE oms.pessoa_id = p_pessoa_id
    AND oms.produto = p_produto;
END;
$$;

COMMENT ON FUNCTION public.get_superiores_pessoa(UUID, VARCHAR) IS 'Retorna todos os superiores de uma pessoa em um produto (incluindo múltiplos superiores)';

-- =====================================================
-- PASSO 6: Migrar dados existentes (se houver)
-- =====================================================

-- Se já existem Central Escalação cadastrados, sincronizar seus superiores
DO $$
DECLARE
  v_central RECORD;
  v_produto VARCHAR(20);
  v_coordenador RECORD;
BEGIN
  -- Buscar todos os Central Escalação existentes
  FOR v_central IN
    SELECT id FROM organizacao_estrutura WHERE cargo = 'Central Escalação'
  LOOP
    RAISE NOTICE 'Sincronizando superiores para Central Escalação ID: %', v_central.id;
    
    -- Buscar todos os produtos da pessoa
    FOR v_produto IN 
      SELECT DISTINCT produto 
      FROM organizacao_produto 
      WHERE pessoa_id = v_central.id
    LOOP
      -- Limpar superiores antigos deste produto
      DELETE FROM organizacao_multiplos_superiores
      WHERE pessoa_id = v_central.id AND produto = v_produto;

      -- Adicionar todos os coordenadores deste produto como superiores
      FOR v_coordenador IN
        SELECT DISTINCT oe.id
        FROM organizacao_estrutura oe
        INNER JOIN organizacao_produto op ON op.pessoa_id = oe.id
        WHERE oe.cargo = 'Coordenador'
          AND op.produto = v_produto
      LOOP
        INSERT INTO organizacao_multiplos_superiores (pessoa_id, superior_id, produto)
        VALUES (v_central.id, v_coordenador.id, v_produto)
        ON CONFLICT (pessoa_id, superior_id, produto) DO NOTHING;
        
        RAISE NOTICE '  - Vinculado ao Coordenador ID: % no produto: %', v_coordenador.id, v_produto;
      END LOOP;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE '✅ Migração de dados concluída';
END $$;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se tabela foi criada
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'organizacao_multiplos_superiores'
  ) THEN
    RAISE NOTICE '✅ Tabela organizacao_multiplos_superiores criada com sucesso';
  ELSE
    RAISE EXCEPTION '❌ Erro: Tabela organizacao_multiplos_superiores não foi criada';
  END IF;
END $$;
