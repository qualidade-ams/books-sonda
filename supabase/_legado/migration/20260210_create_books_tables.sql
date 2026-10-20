-- Migration: Criar tabelas para sistema de Books
-- Descrição: Tabelas para armazenar snapshots de books gerados por período

-- ============================================================================
-- LIMPEZA: Remover objetos existentes para evitar conflitos
-- IMPORTANTE: Se houver erro de função duplicada, execute primeiro:
--   supabase/migrations/20260210_cleanup_books_functions.sql
-- ============================================================================

-- Remover view existente
DROP VIEW IF EXISTS public.books_com_empresa CASCADE;

-- Remover TODAS as versões possíveis das funções
DO $$
BEGIN
  -- Remover user_has_books_permission
  EXECUTE 'DROP FUNCTION IF EXISTS public.user_has_books_permission() CASCADE';
  EXECUTE 'DROP FUNCTION IF EXISTS public.user_has_books_permission(TEXT) CASCADE';
  EXECUTE 'DROP FUNCTION IF EXISTS public.user_has_books_permission(VARCHAR) CASCADE';
  
  -- Remover buscar_books_por_periodo
  EXECUTE 'DROP FUNCTION IF EXISTS public.buscar_books_por_periodo(INTEGER, INTEGER) CASCADE';
  EXECUTE 'DROP FUNCTION IF EXISTS public.buscar_books_por_periodo(INT, INT) CASCADE';
  
  RAISE NOTICE '✅ Funções antigas removidas';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Erro ao remover funções antigas: %', SQLERRM;
    RAISE NOTICE 'Execute o script de limpeza: 20260210_cleanup_books_functions.sql';
END $$;

-- ============================================================================
-- TABELA: books
-- Armazena os books gerados com dados congelados (snapshot)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas_clientes(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL CHECK (ano >= 2020 AND ano <= 2100),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'gerando', 'gerado', 'erro', 'desatualizado')),
  
  -- Dados congelados (snapshot) em JSONB
  dados_capa JSONB,
  dados_volumetria JSONB,
  dados_sla JSONB,
  dados_backlog JSONB,
  dados_consumo JSONB,
  dados_pesquisa JSONB,
  
  -- Metadados
  pdf_url TEXT,
  pdf_gerado_em TIMESTAMPTZ,
  erro_detalhes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: Um book por empresa por período
  UNIQUE(empresa_id, mes, ano)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_books_empresa_id ON public.books(empresa_id);
CREATE INDEX IF NOT EXISTS idx_books_periodo ON public.books(mes, ano);
CREATE INDEX IF NOT EXISTS idx_books_status ON public.books(status);
CREATE INDEX IF NOT EXISTS idx_books_created_at ON public.books(created_at DESC);

-- ============================================================================
-- TABELA: books_historico_geracao
-- Registra histórico de gerações de books
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.books_historico_geracao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acao TEXT NOT NULL CHECK (acao IN ('criacao', 'atualizacao', 'regeneracao', 'exclusao')),
  status TEXT NOT NULL CHECK (status IN ('sucesso', 'erro')),
  detalhes JSONB,
  tempo_processamento_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_books_historico_book_id ON public.books_historico_geracao(book_id);
CREATE INDEX IF NOT EXISTS idx_books_historico_usuario_id ON public.books_historico_geracao(usuario_id);
CREATE INDEX IF NOT EXISTS idx_books_historico_created_at ON public.books_historico_geracao(created_at DESC);

-- ============================================================================
-- FUNÇÃO: Atualizar updated_at automaticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_books_updated_at()
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

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_books_updated_at ON public.books;
CREATE TRIGGER trigger_update_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION public.update_books_updated_at();

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books_historico_geracao ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FUNÇÃO: Verificar permissão de acesso a books
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_has_books_permission(required_level TEXT DEFAULT 'view')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role sempre tem acesso
  IF current_setting('role', true) = 'service_role' THEN
    RETURN true;
  END IF;

  -- Verificar se usuário tem permissão na tela 'geracao_books'
  RETURN EXISTS (
    SELECT 1
    FROM profiles p
    JOIN user_group_assignments uga ON p.id = uga.user_id
    JOIN user_groups ug ON uga.group_id = ug.id
    JOIN screen_permissions sp ON sp.group_id = ug.id
    WHERE p.id = (SELECT auth.uid())
      AND sp.screen_key = 'geracao_books'
      AND (
        (required_level = 'view' AND sp.permission_level IN ('view', 'edit')) OR
        (required_level = 'edit' AND sp.permission_level = 'edit')
      )
  );
END;
$$;

COMMENT ON FUNCTION public.user_has_books_permission(TEXT) IS 'Verifica se usuário tem permissão para acessar books. Usa user_group_assignments para relacionar usuário com grupo.';

-- ============================================================================
-- POLÍTICAS RLS - TABELA: books
-- ============================================================================

-- REMOVER TODAS as políticas antigas (evitar duplicação)
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar books" ON public.books;
DROP POLICY IF EXISTS "Usuários autenticados podem criar books" ON public.books;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar books" ON public.books;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar books" ON public.books;
DROP POLICY IF EXISTS "authenticated_select_books" ON public.books;
DROP POLICY IF EXISTS "authenticated_insert_books" ON public.books;
DROP POLICY IF EXISTS "authenticated_update_books" ON public.books;
DROP POLICY IF EXISTS "authenticated_delete_books" ON public.books;

-- SELECT: Usuários com permissão 'view' ou 'edit' podem visualizar
CREATE POLICY "authenticated_select_books"
  ON public.books FOR SELECT
  TO authenticated
  USING (user_has_books_permission('view'));

-- INSERT: Usuários com permissão 'edit' podem criar
CREATE POLICY "authenticated_insert_books"
  ON public.books FOR INSERT
  TO authenticated
  WITH CHECK (user_has_books_permission('edit'));

-- UPDATE: Usuários com permissão 'edit' podem atualizar
CREATE POLICY "authenticated_update_books"
  ON public.books FOR UPDATE
  TO authenticated
  USING (user_has_books_permission('edit'))
  WITH CHECK (user_has_books_permission('edit'));

-- DELETE: Usuários com permissão 'edit' podem deletar
CREATE POLICY "authenticated_delete_books"
  ON public.books FOR DELETE
  TO authenticated
  USING (user_has_books_permission('edit'));

-- ============================================================================
-- POLÍTICAS RLS - TABELA: books_historico_geracao
-- ============================================================================

-- REMOVER TODAS as políticas antigas (evitar duplicação)
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar histórico" ON public.books_historico_geracao;
DROP POLICY IF EXISTS "Usuários autenticados podem criar histórico" ON public.books_historico_geracao;
DROP POLICY IF EXISTS "authenticated_select_books_historico" ON public.books_historico_geracao;
DROP POLICY IF EXISTS "authenticated_insert_books_historico" ON public.books_historico_geracao;

-- SELECT: Usuários com permissão 'view' ou 'edit' podem visualizar histórico
CREATE POLICY "authenticated_select_books_historico"
  ON public.books_historico_geracao FOR SELECT
  TO authenticated
  USING (user_has_books_permission('view'));

-- INSERT: Sistema pode criar registros de histórico (via função SECURITY DEFINER)
CREATE POLICY "authenticated_insert_books_historico"
  ON public.books_historico_geracao FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Permite inserção se usuário tem permissão 'edit' OU se é o próprio usuário
    user_has_books_permission('edit') OR 
    usuario_id = (SELECT auth.uid())
  );

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================
COMMENT ON TABLE public.books IS 'Armazena books gerados com dados congelados (snapshot) por período';
COMMENT ON TABLE public.books_historico_geracao IS 'Histórico de gerações e atualizações de books';

COMMENT ON COLUMN public.books.dados_capa IS 'Snapshot dos dados da capa (JSONB)';
COMMENT ON COLUMN public.books.dados_volumetria IS 'Snapshot dos dados de volumetria (JSONB)';
COMMENT ON COLUMN public.books.dados_sla IS 'Snapshot dos dados de SLA (JSONB)';
COMMENT ON COLUMN public.books.dados_backlog IS 'Snapshot dos dados de backlog (JSONB)';
COMMENT ON COLUMN public.books.dados_consumo IS 'Snapshot dos dados de consumo (JSONB)';
COMMENT ON COLUMN public.books.dados_pesquisa IS 'Snapshot dos dados de pesquisa (JSONB)';

-- ============================================================================
-- VIEWS ÚTEIS
-- ============================================================================

-- View: Books com informações da empresa
-- NOTA: Removido SECURITY DEFINER para evitar alerta de segurança
-- A view herda as permissões RLS das tabelas subjacentes
CREATE OR REPLACE VIEW public.books_com_empresa 
WITH (security_invoker = true)
AS
SELECT 
  b.id,
  b.empresa_id,
  e.nome_completo as empresa_nome,
  e.nome_abreviado as empresa_nome_abreviado,
  b.mes,
  b.ano,
  b.status,
  b.pdf_url,
  b.pdf_gerado_em,
  b.created_at,
  b.updated_at,
  CASE 
    WHEN b.dados_capa IS NOT NULL THEN true
    ELSE false
  END as tem_dados
FROM public.books b
INNER JOIN public.empresas_clientes e ON b.empresa_id = e.id;

COMMENT ON VIEW public.books_com_empresa IS 'Books com informações básicas da empresa. Usa security_invoker para respeitar RLS.';

-- ============================================================================
-- DADOS INICIAIS (OPCIONAL)
-- ============================================================================

-- Inserir screen para permissões
INSERT INTO public.screens (key, name, description, category, route)
VALUES (
  'geracao_books',
  'Geração de Books',
  'Gerar e visualizar relatórios mensais de books para clientes',
  'Comunicação',
  '/admin/geracao-books'
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  route = EXCLUDED.route;

-- Conceder permissão para Administradores
INSERT INTO public.screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, 'geracao_books', 'edit'
FROM public.user_groups ug 
WHERE ug.name = 'Administradores'
ON CONFLICT (group_id, screen_key) 
DO UPDATE SET permission_level = EXCLUDED.permission_level;

-- ============================================================================
-- FUNÇÕES AUXILIARES
-- ============================================================================

-- Função para buscar books por período
CREATE OR REPLACE FUNCTION public.buscar_books_por_periodo(
  p_mes INTEGER,
  p_ano INTEGER
)
RETURNS TABLE (
  id UUID,
  empresa_id UUID,
  empresa_nome TEXT,
  mes INTEGER,
  ano INTEGER,
  status TEXT,
  pdf_url TEXT,
  data_geracao TIMESTAMPTZ,
  tem_dados BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.empresa_id,
    e.nome_completo as empresa_nome,
    b.mes,
    b.ano,
    b.status,
    b.pdf_url,
    b.created_at as data_geracao,
    CASE 
      WHEN b.dados_capa IS NOT NULL THEN true
      ELSE false
    END as tem_dados
  FROM public.books b
  INNER JOIN public.empresas_clientes e ON b.empresa_id = e.id
  WHERE b.mes = p_mes AND b.ano = p_ano
  ORDER BY e.nome_abreviado;
END;
$$;

COMMENT ON FUNCTION public.buscar_books_por_periodo IS 'Busca books de um período específico com informações da empresa';
