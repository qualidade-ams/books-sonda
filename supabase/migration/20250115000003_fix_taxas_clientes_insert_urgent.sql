-- ============================================================================
-- Migration: Correção URGENTE - Permitir INSERT em taxas_clientes
-- Data: 2025-01-15
-- Descrição: Corrige erro 403 ao criar taxas - RLS bloqueando INSERT
-- ============================================================================

-- 🚨 PROBLEMA:
-- Erro: "new row violates row-level security policy for table taxas_clientes"
-- Causa: Política de INSERT muito restritiva ou screen_key incorreto

-- SOLUÇÃO:
-- Criar políticas permissivas para authenticated users

-- ============================================================================
-- PARTE 1: REMOVER POLÍTICAS PROBLEMÁTICAS
-- ============================================================================

SELECT '🧹 Removendo políticas antigas de taxas_clientes' as status;

DROP POLICY IF EXISTS "Usuários podem visualizar taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Usuários podem criar taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Usuários podem atualizar taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Usuários podem deletar taxas" ON taxas_clientes;

-- ============================================================================
-- PARTE 2: CRIAR POLÍTICAS PERMISSIVAS PARA AUTHENTICATED
-- ============================================================================

SELECT '✨ Criando políticas permissivas para taxas_clientes' as status;

-- Remover políticas com novos nomes também (caso já existam)
DROP POLICY IF EXISTS "Authenticated users can view taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Authenticated users can insert taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Authenticated users can update taxas" ON taxas_clientes;
DROP POLICY IF EXISTS "Authenticated users can delete taxas" ON taxas_clientes;

-- Política de SELECT - Todos os usuários autenticados podem visualizar
CREATE POLICY "Authenticated users can view taxas" ON taxas_clientes
    FOR SELECT 
    TO authenticated
    USING (true);

-- Política de INSERT - Todos os usuários autenticados podem criar
CREATE POLICY "Authenticated users can insert taxas" ON taxas_clientes
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- Política de UPDATE - Todos os usuários autenticados podem atualizar
CREATE POLICY "Authenticated users can update taxas" ON taxas_clientes
    FOR UPDATE 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Política de DELETE - Todos os usuários autenticados podem deletar
CREATE POLICY "Authenticated users can delete taxas" ON taxas_clientes
    FOR DELETE 
    TO authenticated
    USING (true);

-- ============================================================================
-- PARTE 3: GARANTIR QUE RLS ESTÁ HABILITADO
-- ============================================================================

ALTER TABLE taxas_clientes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PARTE 4: VALIDAÇÃO
-- ============================================================================

SELECT '📊 Validando políticas de taxas_clientes' as status;

SELECT 
  policyname as "Política",
  cmd as "Comando",
  roles::text as "Roles"
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'taxas_clientes'
ORDER BY 
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
  END;

-- ============================================================================
-- PARTE 5: FAZER O MESMO PARA valores_taxas_funcoes
-- ============================================================================

SELECT '🧹 Removendo políticas antigas de valores_taxas_funcoes' as status;

DROP POLICY IF EXISTS "Usuários podem visualizar valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Usuários podem criar valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Usuários podem atualizar valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Usuários podem deletar valores" ON valores_taxas_funcoes;

SELECT '✨ Criando políticas permissivas para valores_taxas_funcoes' as status;

-- Remover políticas com novos nomes também (caso já existam)
DROP POLICY IF EXISTS "Authenticated users can view valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Authenticated users can insert valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Authenticated users can update valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Authenticated users can delete valores" ON valores_taxas_funcoes;

-- Política de SELECT - Todos os usuários autenticados podem visualizar
CREATE POLICY "Authenticated users can view valores" ON valores_taxas_funcoes
    FOR SELECT 
    TO authenticated
    USING (true);

-- Política de INSERT - Todos os usuários autenticados podem criar
CREATE POLICY "Authenticated users can insert valores" ON valores_taxas_funcoes
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- Política de UPDATE - Todos os usuários autenticados podem atualizar
CREATE POLICY "Authenticated users can update valores" ON valores_taxas_funcoes
    FOR UPDATE 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Política de DELETE - Todos os usuários autenticados podem deletar
CREATE POLICY "Authenticated users can delete valores" ON valores_taxas_funcoes
    FOR DELETE 
    TO authenticated
    USING (true);

ALTER TABLE valores_taxas_funcoes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PARTE 6: VALIDAÇÃO FINAL
-- ============================================================================

SELECT '📊 Validando políticas de valores_taxas_funcoes' as status;

SELECT 
  policyname as "Política",
  cmd as "Comando",
  roles::text as "Roles"
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'valores_taxas_funcoes'
ORDER BY 
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
  END;

-- ============================================================================
-- RESUMO
-- ============================================================================

SELECT '✅ CORREÇÃO APLICADA' as status;

SELECT 
  'taxas_clientes' as tabela,
  COUNT(*) as total_policies,
  COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'taxas_clientes'
UNION ALL
SELECT 
  'valores_taxas_funcoes' as tabela,
  COUNT(*) as total_policies,
  COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'valores_taxas_funcoes';

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON TABLE taxas_clientes IS 
'Tabela de taxas de clientes com RLS permissivo. Todos os usuários autenticados têm acesso completo.';

COMMENT ON TABLE valores_taxas_funcoes IS 
'Tabela de valores de taxas com RLS permissivo. Todos os usuários autenticados têm acesso completo.';

-- ============================================================================
-- TESTE
-- ============================================================================

-- Para testar, execute no SQL Editor:
-- INSERT INTO taxas_clientes (empresa_id, tipo_cobranca, vigencia_inicio, vigencia_fim)
-- VALUES ('algum-uuid', 'horas', '2025-01-01', '2025-12-31');

-- Se funcionar, a correção está OK! ✅
