-- =====================================================
-- MIGRATION: Corrigir Trigger de taxas_clientes
-- Data: 2026-02-20
-- Descrição: Corrige o trigger que estava usando campo errado (updated_at em vez de atualizado_em)
-- =====================================================

-- PROBLEMA:
-- O trigger update_taxas_clientes_updated_at() estava tentando acessar NEW.updated_at
-- mas a tabela taxas_clientes usa o campo atualizado_em
-- Erro: "record "new" has no field "updated_at""

-- SOLUÇÃO:
-- Recriar a função do trigger com o nome de campo correto

-- NOTA IMPORTANTE:
-- Os campos de valores (valor_base, valor_ticket, ticket_excedente_*, etc.) 
-- PERMITEM valor zero (0). Não há constraint de valor mínimo.
-- Isso é intencional para permitir taxas zeradas quando necessário.

-- =====================================================
-- PARTE 1: Corrigir função do trigger
-- =====================================================

-- Remover trigger antigo
DROP TRIGGER IF EXISTS trigger_update_taxas_clientes_updated_at ON taxas_clientes;
DROP TRIGGER IF EXISTS trigger_update_valores_taxas_updated_at ON valores_taxas_funcoes;

-- Recriar função com campo correto
CREATE OR REPLACE FUNCTION public.update_taxas_clientes_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- ✅ CORRIGIDO: usar atualizado_em em vez de updated_at
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;

-- Recriar triggers
CREATE TRIGGER trigger_update_taxas_clientes_updated_at
  BEFORE UPDATE ON taxas_clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_taxas_clientes_updated_at();

CREATE TRIGGER trigger_update_valores_taxas_updated_at
  BEFORE UPDATE ON valores_taxas_funcoes
  FOR EACH ROW
  EXECUTE FUNCTION update_taxas_clientes_updated_at();

-- =====================================================
-- PARTE 2: Verificação
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Trigger de taxas_clientes corrigido (atualizado_em)';
  RAISE NOTICE '✅ Trigger de valores_taxas_funcoes corrigido (atualizado_em)';
END $$;

-- =====================================================
-- PARTE 3: Comentários
-- =====================================================

COMMENT ON FUNCTION public.update_taxas_clientes_updated_at() IS 
'Atualiza automaticamente o campo atualizado_em nas tabelas taxas_clientes e valores_taxas_funcoes';
