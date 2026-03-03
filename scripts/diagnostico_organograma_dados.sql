-- Script: Diagnóstico de Dados do Organograma
-- Data: 2026-03-03
-- Objetivo: Verificar se há dados cadastrados no organograma

-- ============================================================================
-- PASSO 1: Verificar se há pessoas cadastradas
-- ============================================================================
SELECT 
  '📊 Total de Pessoas Cadastradas' as verificacao,
  COUNT(*) as total
FROM organizacao_estrutura;

-- ============================================================================
-- PASSO 2: Verificar distribuição por cargo
-- ============================================================================
SELECT 
  '📊 Distribuição por Cargo' as verificacao,
  cargo,
  COUNT(*) as total
FROM organizacao_estrutura
GROUP BY cargo
ORDER BY 
  CASE cargo
    WHEN 'Diretor' THEN 1
    WHEN 'Gerente' THEN 2
    WHEN 'Coordenador' THEN 3
    WHEN 'Central Escalação' THEN 4
    ELSE 5
  END;

-- ============================================================================
-- PASSO 3: Verificar vínculos com produtos
-- ============================================================================
SELECT 
  '📊 Vínculos com Produtos' as verificacao,
  produto,
  COUNT(*) as total_pessoas
FROM organizacao_produto
GROUP BY produto
ORDER BY produto;

-- ============================================================================
-- PASSO 4: Verificar pessoas por produto (detalhado)
-- ============================================================================
SELECT 
  '📊 Pessoas por Produto (Detalhado)' as verificacao,
  op.produto,
  oe.cargo,
  oe.nome,
  oe.departamento,
  CASE 
    WHEN op.superior_id IS NULL THEN '🔝 Raiz (sem superior)'
    ELSE '👤 Tem superior'
  END as hierarquia
FROM organizacao_produto op
JOIN organizacao_estrutura oe ON op.pessoa_id = oe.id
ORDER BY op.produto, 
  CASE oe.cargo
    WHEN 'Diretor' THEN 1
    WHEN 'Gerente' THEN 2
    WHEN 'Coordenador' THEN 3
    WHEN 'Central Escalação' THEN 4
    ELSE 5
  END,
  oe.nome;

-- ============================================================================
-- PASSO 5: Verificar se há pessoas sem produto vinculado
-- ============================================================================
SELECT 
  '⚠️ Pessoas SEM Produto Vinculado' as verificacao,
  oe.id,
  oe.nome,
  oe.cargo,
  oe.departamento
FROM organizacao_estrutura oe
LEFT JOIN organizacao_produto op ON oe.id = op.pessoa_id
WHERE op.id IS NULL;

-- ============================================================================
-- PASSO 6: Verificar hierarquia do produto COMEX
-- ============================================================================
SELECT 
  '🌳 Hierarquia COMEX' as verificacao,
  oe.cargo,
  oe.nome,
  CASE 
    WHEN op.superior_id IS NULL THEN '🔝 RAIZ'
    ELSE (SELECT nome FROM organizacao_estrutura WHERE id = op.superior_id)
  END as superior,
  op.superior_id
FROM organizacao_produto op
JOIN organizacao_estrutura oe ON op.pessoa_id = oe.id
WHERE op.produto = 'COMEX'
ORDER BY 
  CASE oe.cargo
    WHEN 'Diretor' THEN 1
    WHEN 'Gerente' THEN 2
    WHEN 'Coordenador' THEN 3
    WHEN 'Central Escalação' THEN 4
    ELSE 5
  END,
  oe.nome;

-- ============================================================================
-- PASSO 7: Verificar hierarquia do produto FISCAL
-- ============================================================================
SELECT 
  '🌳 Hierarquia FISCAL' as verificacao,
  oe.cargo,
  oe.nome,
  CASE 
    WHEN op.superior_id IS NULL THEN '🔝 RAIZ'
    ELSE (SELECT nome FROM organizacao_estrutura WHERE id = op.superior_id)
  END as superior,
  op.superior_id
FROM organizacao_produto op
JOIN organizacao_estrutura oe ON op.pessoa_id = oe.id
WHERE op.produto = 'FISCAL'
ORDER BY 
  CASE oe.cargo
    WHEN 'Diretor' THEN 1
    WHEN 'Gerente' THEN 2
    WHEN 'Coordenador' THEN 3
    WHEN 'Central Escalação' THEN 4
    ELSE 5
  END,
  oe.nome;

-- ============================================================================
-- PASSO 8: Testar query que o BookOrganograma usa
-- ============================================================================
-- Esta é a mesma query que o componente BookOrganograma.tsx executa
SELECT 
  '🔍 Teste Query BookOrganograma (COMEX)' as verificacao,
  oe.id,
  oe.nome,
  oe.cargo,
  oe.departamento,
  op.produto,
  op.superior_id
FROM organizacao_estrutura oe
JOIN organizacao_produto op ON oe.id = op.pessoa_id
WHERE op.produto = 'COMEX'
ORDER BY 
  CASE oe.cargo
    WHEN 'Diretor' THEN 1
    WHEN 'Gerente' THEN 2
    WHEN 'Coordenador' THEN 3
    WHEN 'Central Escalação' THEN 4
    ELSE 5
  END,
  oe.ordem_exibicao,
  oe.nome;

-- ============================================================================
-- PASSO 9: Verificar políticas RLS ativas
-- ============================================================================
SELECT 
  '🔒 Políticas RLS Ativas' as verificacao,
  tablename,
  policyname,
  cmd as acao,
  roles,
  CASE 
    WHEN 'anon' = ANY(roles) THEN '✅ Permite anon (PDFs)'
    WHEN 'authenticated' = ANY(roles) THEN '🔒 Apenas authenticated'
    ELSE '❓ Outras roles'
  END as acesso
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('organizacao_estrutura', 'organizacao_produto')
ORDER BY tablename, cmd, policyname;

-- ============================================================================
-- DIAGNÓSTICO FINAL
-- ============================================================================
DO $
DECLARE
  total_pessoas INTEGER;
  total_comex INTEGER;
  total_fiscal INTEGER;
  tem_anon_estrutura BOOLEAN;
  tem_anon_produto BOOLEAN;
BEGIN
  -- Contar pessoas
  SELECT COUNT(*) INTO total_pessoas FROM organizacao_estrutura;
  SELECT COUNT(*) INTO total_comex FROM organizacao_produto WHERE produto = 'COMEX';
  SELECT COUNT(*) INTO total_fiscal FROM organizacao_produto WHERE produto = 'FISCAL';
  
  -- Verificar políticas anon
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organizacao_estrutura'
      AND 'anon' = ANY(roles)
      AND cmd = 'SELECT'
  ) INTO tem_anon_estrutura;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organizacao_produto'
      AND 'anon' = ANY(roles)
      AND cmd = 'SELECT'
  ) INTO tem_anon_produto;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '📋 DIAGNÓSTICO FINAL DO ORGANOGRAMA';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Dados Cadastrados:';
  RAISE NOTICE '   - Total de pessoas: %', total_pessoas;
  RAISE NOTICE '   - Pessoas em COMEX: %', total_comex;
  RAISE NOTICE '   - Pessoas em FISCAL: %', total_fiscal;
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Políticas RLS:';
  
  IF tem_anon_estrutura THEN
    RAISE NOTICE '   ✅ organizacao_estrutura: Política anon OK';
  ELSE
    RAISE NOTICE '   ❌ organizacao_estrutura: Política anon FALTANDO';
  END IF;
  
  IF tem_anon_produto THEN
    RAISE NOTICE '   ✅ organizacao_produto: Política anon OK';
  ELSE
    RAISE NOTICE '   ❌ organizacao_produto: Política anon FALTANDO';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Diagnóstico:';
  
  IF total_pessoas = 0 THEN
    RAISE NOTICE '   ❌ PROBLEMA: Nenhuma pessoa cadastrada!';
    RAISE NOTICE '   → Cadastre pessoas no organograma primeiro';
  ELSIF total_comex = 0 AND total_fiscal = 0 THEN
    RAISE NOTICE '   ❌ PROBLEMA: Pessoas cadastradas mas sem produto vinculado!';
    RAISE NOTICE '   → Vincule as pessoas aos produtos (COMEX, FISCAL, etc)';
  ELSIF NOT tem_anon_estrutura OR NOT tem_anon_produto THEN
    RAISE NOTICE '   ❌ PROBLEMA: Políticas RLS para anon faltando!';
    RAISE NOTICE '   → Execute o script fix_organograma_pdf_rls.sql';
  ELSE
    RAISE NOTICE '   ✅ Tudo OK! Organograma deve funcionar nos PDFs';
    RAISE NOTICE '   → Se ainda não funciona, verifique:';
    RAISE NOTICE '      1. Chave publishable no .env está correta';
    RAISE NOTICE '      2. Produto no PDF está correto (COMEX, FISCAL, etc)';
    RAISE NOTICE '      3. Console do navegador para erros';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $;
