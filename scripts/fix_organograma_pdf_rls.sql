-- Script: Corrigir políticas RLS para geração de PDFs do organograma
-- Data: 2026-03-03
-- Problema: BookOrganograma recebe 0 pessoas porque políticas RLS bloqueiam anon
-- Solução: Adicionar políticas de leitura pública para anon (chave publishable)

-- ============================================================================
-- PASSO 1: Verificar políticas atuais
-- ============================================================================
SELECT 
  '🔍 Políticas RLS Atuais' as verificacao,
  tablename,
  policyname,
  cmd as acao,
  roles,
  CASE 
    WHEN 'anon' = ANY(roles) THEN '✅ Permite anon'
    WHEN 'authenticated' = ANY(roles) THEN '⚠️ Apenas authenticated'
    ELSE '❓ Outras roles'
  END as acesso
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('organizacao_estrutura', 'organizacao_produto')
ORDER BY tablename, cmd, policyname;

-- ============================================================================
-- PASSO 2: Verificar se políticas para anon existem
-- ============================================================================
DO $
DECLARE
  tem_anon_estrutura BOOLEAN;
  tem_anon_produto BOOLEAN;
BEGIN
  -- Verificar organizacao_estrutura
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organizacao_estrutura'
      AND 'anon' = ANY(roles)
      AND cmd = 'SELECT'
  ) INTO tem_anon_estrutura;
  
  -- Verificar organizacao_produto
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organizacao_produto'
      AND 'anon' = ANY(roles)
      AND cmd = 'SELECT'
  ) INTO tem_anon_produto;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '📋 VERIFICAÇÃO DE POLÍTICAS PARA ANON';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  IF tem_anon_estrutura THEN
    RAISE NOTICE '✅ organizacao_estrutura: Política para anon EXISTE';
  ELSE
    RAISE NOTICE '❌ organizacao_estrutura: Política para anon NÃO EXISTE';
    RAISE NOTICE '   → Será criada no próximo passo';
  END IF;
  
  IF tem_anon_produto THEN
    RAISE NOTICE '✅ organizacao_produto: Política para anon EXISTE';
  ELSE
    RAISE NOTICE '❌ organizacao_produto: Política para anon NÃO EXISTE';
    RAISE NOTICE '   → Será criada no próximo passo';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $;

-- ============================================================================
-- PASSO 3: Criar políticas para anon (se não existirem)
-- ============================================================================

-- Política para organizacao_estrutura
DROP POLICY IF EXISTS "anon_select_organizacao_estrutura" ON organizacao_estrutura;

CREATE POLICY "anon_select_organizacao_estrutura"
  ON organizacao_estrutura FOR SELECT
  TO anon
  USING (true);

COMMENT ON POLICY "anon_select_organizacao_estrutura" ON organizacao_estrutura IS 
  'Leitura pública para anon (chave publishable). Necessário para geração de PDFs.';

-- Política para organizacao_produto
DROP POLICY IF EXISTS "anon_select_organizacao_produto" ON organizacao_produto;

CREATE POLICY "anon_select_organizacao_produto"
  ON organizacao_produto FOR SELECT
  TO anon
  USING (true);

COMMENT ON POLICY "anon_select_organizacao_produto" ON organizacao_produto IS 
  'Leitura pública para anon (chave publishable). Necessário para geração de PDFs.';

-- ============================================================================
-- PASSO 4: Verificar se políticas foram criadas
-- ============================================================================
DO $
DECLARE
  tem_anon_estrutura BOOLEAN;
  tem_anon_produto BOOLEAN;
BEGIN
  -- Verificar organizacao_estrutura
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organizacao_estrutura'
      AND 'anon' = ANY(roles)
      AND cmd = 'SELECT'
  ) INTO tem_anon_estrutura;
  
  -- Verificar organizacao_produto
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organizacao_produto'
      AND 'anon' = ANY(roles)
      AND cmd = 'SELECT'
  ) INTO tem_anon_produto;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ POLÍTICAS CRIADAS COM SUCESSO!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  IF tem_anon_estrutura THEN
    RAISE NOTICE '✅ organizacao_estrutura: Política para anon criada';
  ELSE
    RAISE EXCEPTION '❌ ERRO: Política para organizacao_estrutura não foi criada!';
  END IF;
  
  IF tem_anon_produto THEN
    RAISE NOTICE '✅ organizacao_produto: Política para anon criada';
  ELSE
    RAISE EXCEPTION '❌ ERRO: Política para organizacao_produto não foi criada!';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '📋 O que foi feito:';
  RAISE NOTICE '   1. Criada política anon_select_organizacao_estrutura';
  RAISE NOTICE '   2. Criada política anon_select_organizacao_produto';
  RAISE NOTICE '   3. Políticas authenticated_* mantidas (não foram removidas)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Resultado:';
  RAISE NOTICE '   - Usuários autenticados: Continuam usando permissões (screen_permissions)';
  RAISE NOTICE '   - Chave publishable (anon): Pode ler dados para gerar PDFs';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Organograma agora funciona em PDFs!';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $;

-- ============================================================================
-- PASSO 5: Listar todas as políticas após correção
-- ============================================================================
SELECT 
  '📋 Políticas RLS Após Correção' as verificacao,
  tablename,
  policyname,
  cmd as acao,
  roles,
  CASE 
    WHEN 'anon' = ANY(roles) THEN '✅ Permite anon (PDFs)'
    WHEN 'authenticated' = ANY(roles) THEN '🔒 Apenas authenticated (com permissões)'
    ELSE '❓ Outras roles'
  END as acesso
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('organizacao_estrutura', 'organizacao_produto')
ORDER BY tablename, cmd, policyname;

-- ============================================================================
-- PRÓXIMOS PASSOS
-- ============================================================================
-- 1. Recarregue a página de geração de PDFs
-- 2. Verifique os logs do console:
--    - Deve mostrar "✅ Dados recebidos: X pessoas" (X > 0)
--    - Deve mostrar "🌳 Árvore construída com X raízes" (X > 0)
-- 3. Se ainda não funcionar, verifique:
--    - Se está usando a chave publishable correta no .env
--    - Se o produto está correto (COMEX, FISCAL, GALLERY)
--    - Se há dados cadastrados para o produto
-- ============================================================================
