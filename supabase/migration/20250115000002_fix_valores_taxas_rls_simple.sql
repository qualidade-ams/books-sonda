-- ============================================================================
-- Migration: Correção RLS valores_taxas_funcoes (VERSÃO SIMPLIFICADA)
-- Data: 2025-01-15
-- Descrição: Corrige erro "new row violates row-level security policy"
-- ============================================================================

-- PASSO 1: Remover TODAS as políticas existentes
DROP POLICY IF EXISTS "Usuários podem visualizar valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Usuários podem criar valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Usuários podem atualizar valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Usuários podem deletar valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Service role full access valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Service role pode visualizar valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Service role pode inserir valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Service role pode atualizar valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Service role pode deletar valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Authenticated users can view valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Authenticated users can insert valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Authenticated users can update valores" ON valores_taxas_funcoes;
DROP POLICY IF EXISTS "Authenticated users can delete valores" ON valores_taxas_funcoes;

-- PASSO 2: Criar políticas simplificadas para AUTHENTICATED
CREATE POLICY "Authenticated users can view valores" 
ON valores_taxas_funcoes
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert valores" 
ON valores_taxas_funcoes
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update valores" 
ON valores_taxas_funcoes
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete valores" 
ON valores_taxas_funcoes
FOR DELETE 
TO authenticated
USING (true);

-- PASSO 3: Criar política para SERVICE_ROLE
CREATE POLICY "Service role full access valores" 
ON valores_taxas_funcoes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- PASSO 4: Garantir que RLS está habilitado
ALTER TABLE valores_taxas_funcoes ENABLE ROW LEVEL SECURITY;

-- PASSO 5: Validação
SELECT 
  '✅ Migration concluída!' as status,
  COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'valores_taxas_funcoes';

-- Listar políticas criadas
SELECT 
  policyname as "Política",
  cmd as "Comando",
  roles::text as "Roles"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'valores_taxas_funcoes'
ORDER BY 
  CASE 
    WHEN roles::text = '{authenticated}' THEN 1
    WHEN roles::text = '{service_role}' THEN 2
  END,
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    WHEN 'ALL' THEN 5
  END;
