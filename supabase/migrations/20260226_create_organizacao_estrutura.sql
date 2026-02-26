-- Migration: Criar tabela de estrutura organizacional
-- Data: 2026-02-26
-- Descrição: Tabela para armazenar hierarquia de pessoas na organização

-- Criar tabela organizacao_estrutura
CREATE TABLE IF NOT EXISTS public.organizacao_estrutura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cargo TEXT NOT NULL CHECK (cargo IN ('Diretor', 'Gerente', 'Coordenador')),
  departamento TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  foto_url TEXT,
  superior_id UUID REFERENCES public.organizacao_estrutura(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Constraint para garantir hierarquia correta
  CONSTRAINT valid_hierarchy CHECK (
    (cargo = 'Diretor' AND superior_id IS NULL) OR
    (cargo IN ('Gerente', 'Coordenador') AND superior_id IS NOT NULL)
  )
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_organizacao_estrutura_cargo ON public.organizacao_estrutura(cargo);
CREATE INDEX IF NOT EXISTS idx_organizacao_estrutura_superior_id ON public.organizacao_estrutura(superior_id);
CREATE INDEX IF NOT EXISTS idx_organizacao_estrutura_departamento ON public.organizacao_estrutura(departamento);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_organizacao_estrutura_updated_at
  BEFORE UPDATE ON public.organizacao_estrutura
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.organizacao_estrutura ENABLE ROW LEVEL SECURITY;

-- Função para verificar permissão de organograma
CREATE OR REPLACE FUNCTION public.user_has_organograma_permission(required_level TEXT DEFAULT 'view')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles p
    JOIN user_groups ug ON p.group_id = ug.id
    JOIN screen_permissions sp ON sp.group_id = ug.id
    WHERE p.id = (SELECT auth.uid())
      AND sp.screen_key = 'organograma'
      AND (
        (required_level = 'view' AND sp.permission_level IN ('view', 'edit')) OR
        (required_level = 'edit' AND sp.permission_level = 'edit')
      )
  );
END;
$$;

COMMENT ON FUNCTION public.user_has_organograma_permission IS 'Verifica se usuário tem permissão para acessar organograma';

-- Políticas RLS com controle de permissões
DROP POLICY IF EXISTS "authenticated_select_organizacao" ON public.organizacao_estrutura;
DROP POLICY IF EXISTS "authenticated_insert_organizacao" ON public.organizacao_estrutura;
DROP POLICY IF EXISTS "authenticated_update_organizacao" ON public.organizacao_estrutura;
DROP POLICY IF EXISTS "authenticated_delete_organizacao" ON public.organizacao_estrutura;

CREATE POLICY "authenticated_select_organizacao"
  ON public.organizacao_estrutura FOR SELECT
  TO authenticated
  USING (user_has_organograma_permission('view'));

CREATE POLICY "authenticated_insert_organizacao"
  ON public.organizacao_estrutura FOR INSERT
  TO authenticated
  WITH CHECK (user_has_organograma_permission('edit'));

CREATE POLICY "authenticated_update_organizacao"
  ON public.organizacao_estrutura FOR UPDATE
  TO authenticated
  USING (user_has_organograma_permission('edit'));

CREATE POLICY "authenticated_delete_organizacao"
  ON public.organizacao_estrutura FOR DELETE
  TO authenticated
  USING (user_has_organograma_permission('edit'));

-- Comentários
COMMENT ON TABLE public.organizacao_estrutura IS 'Estrutura organizacional hierárquica da empresa';
COMMENT ON COLUMN public.organizacao_estrutura.cargo IS 'Cargo: Diretor, Gerente ou Coordenador';
COMMENT ON COLUMN public.organizacao_estrutura.superior_id IS 'Referência ao superior hierárquico (NULL para Diretores)';
COMMENT ON COLUMN public.organizacao_estrutura.created_at IS 'Data de criação (UTC, exibir em America/Sao_Paulo)';
COMMENT ON COLUMN public.organizacao_estrutura.updated_at IS 'Data de última atualização (UTC, exibir em America/Sao_Paulo)';

-- Criar bucket no Supabase Storage para fotos
INSERT INTO storage.buckets (id, name, public)
VALUES ('organograma', 'organograma', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete photos" ON storage.objects;

CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'organograma');

CREATE POLICY "Public can view photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'organograma');

CREATE POLICY "Authenticated users can delete photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'organograma');
