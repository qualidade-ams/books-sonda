-- Migration: Create banco_horas_observacoes table
-- Tabela para armazenar observações manuais do banco de horas por empresa e período

-- Criar tabela de observações
CREATE TABLE IF NOT EXISTS public.banco_horas_observacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas_clientes(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL CHECK (ano >= 2020 AND ano <= 2100),
  observacao TEXT NOT NULL CHECK (char_length(observacao) <= 700),
  tipo VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (tipo IN ('manual', 'ajuste')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Índices para performance
  CONSTRAINT unique_observacao_empresa_periodo UNIQUE (id)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_banco_horas_observacoes_empresa ON public.banco_horas_observacoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_banco_horas_observacoes_periodo ON public.banco_horas_observacoes(mes, ano);
CREATE INDEX IF NOT EXISTS idx_banco_horas_observacoes_created_at ON public.banco_horas_observacoes(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.banco_horas_observacoes ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "authenticated_select_banco_horas_observacoes" ON public.banco_horas_observacoes;
DROP POLICY IF EXISTS "authenticated_insert_banco_horas_observacoes" ON public.banco_horas_observacoes;
DROP POLICY IF EXISTS "authenticated_update_banco_horas_observacoes" ON public.banco_horas_observacoes;
DROP POLICY IF EXISTS "authenticated_delete_banco_horas_observacoes" ON public.banco_horas_observacoes;

-- Criar função de verificação de permissão para banco de horas
-- Reutiliza a função existente se já estiver criada, senão cria
CREATE OR REPLACE FUNCTION public.user_has_banco_horas_permission()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se usuário tem permissão através de user_group_assignments
  RETURN EXISTS (
    SELECT 1
    FROM profiles p
    JOIN user_group_assignments uga ON p.id = uga.user_id
    JOIN user_groups ug ON uga.group_id = ug.id
    JOIN screen_permissions sp ON sp.group_id = ug.id
    WHERE p.id = (SELECT auth.uid())
      AND sp.screen_key IN ('controle_banco_horas', 'geracao_books')
      AND sp.permission_level IN ('view', 'edit')
  );
END;
$$;

COMMENT ON FUNCTION public.user_has_banco_horas_permission() IS 
  'Verifica se o usuário tem permissão para banco de horas. Usa user_group_assignments para relacionar usuário com grupo.';

-- Políticas RLS otimizadas
CREATE POLICY "authenticated_select_banco_horas_observacoes"
  ON public.banco_horas_observacoes FOR SELECT
  TO authenticated
  USING (user_has_banco_horas_permission());

CREATE POLICY "authenticated_insert_banco_horas_observacoes"
  ON public.banco_horas_observacoes FOR INSERT
  TO authenticated
  WITH CHECK (user_has_banco_horas_permission());

CREATE POLICY "authenticated_update_banco_horas_observacoes"
  ON public.banco_horas_observacoes FOR UPDATE
  TO authenticated
  USING (user_has_banco_horas_permission());

CREATE POLICY "authenticated_delete_banco_horas_observacoes"
  ON public.banco_horas_observacoes FOR DELETE
  TO authenticated
  USING (user_has_banco_horas_permission());

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_banco_horas_observacoes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_banco_horas_observacoes_updated_at ON public.banco_horas_observacoes;

CREATE TRIGGER trigger_update_banco_horas_observacoes_updated_at
  BEFORE UPDATE ON public.banco_horas_observacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_banco_horas_observacoes_updated_at();

-- Comentários
COMMENT ON TABLE public.banco_horas_observacoes IS 'Observações manuais do banco de horas por empresa e período';
COMMENT ON COLUMN public.banco_horas_observacoes.tipo IS 'Tipo da observação: manual (criada pelo usuário) ou ajuste (vinda de reajuste)';
COMMENT ON COLUMN public.banco_horas_observacoes.observacao IS 'Texto da observação (máximo 700 caracteres)';
