-- Script de Diagnóstico: Organograma Comex ABBOTT
-- Data: 2026-03-03
-- Descrição: Identifica por que o organograma não está sendo exibido

-- ============================================================================
-- 1. VERIFICAR SE AS TABELAS EXISTEM
-- ============================================================================
SELECT 
  'Tabelas Existentes' as verificacao,
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS Habilitado'
    ELSE '❌ RLS Desabilitado'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('organizacao_estrutura', 'organizacao_produto', 'organizacao_multiplos_superiores')
ORDER BY tablename;

-- ============================================================================
-- 2. VERIFICAR SE HÁ DADOS NA TABELA PRINCIPAL
-- ============================================================================
SELECT 
  '📊 Dados na Tabela Principal' as verificacao,
  COUNT(*) as total_pessoas,
  COUNT(CASE WHEN cargo = 'Diretor' THEN 1 END) as diretores,
  COUNT(CASE WHEN cargo = 'Gerente' THEN 1 END) as gerentes,
  COUNT(CASE WHEN cargo = 'Coordenador' THEN 1 END) as coordenadores,
  COUNT(CASE WHEN cargo = 'Central Escalação' THEN 1 END) as central_escalacao
FROM organizacao_estrutura;

-- ============================================================================
-- 3. VERIFICAR SE HÁ DADOS NA TABELA DE PRODUTOS
-- ============================================================================
SELECT 
  '📊 Dados por Produto' as verificacao,
  produto,
  COUNT(*) as total_pessoas
FROM organizacao_produto
GROUP BY produto
ORDER BY produto;

-- ============================================================================
-- 4. LISTAR TODAS AS PESSOAS CADASTRADAS
-- ============================================================================
SELECT 
  '👥 Pessoas Cadastradas' as verificacao,
  oe.nome,
  oe.cargo,
  oe.departamento,
  oe.email,
  COALESCE(
    (SELECT STRING_AGG(op.produto, ', ' ORDER BY op.produto)
     FROM organizacao_produto op
     WHERE op.pessoa_id = oe.id),
    'Sem produtos'
  ) as produtos
FROM organizacao_estrutura oe
ORDER BY 
  CASE oe.cargo
    WHEN 'Diretor' THEN 1
    WHEN 'Gerente' THEN 2
    WHEN 'Coordenador' THEN 3
    WHEN 'Central Escalação' THEN 4
  END,
  oe.nome;

-- ============================================================================
-- 5. VERIFICAR POLÍTICAS RLS
-- ============================================================================
SELECT 
  '🔒 Políticas RLS' as verificacao,
  tablename,
  policyname,
  cmd as acao,
  roles,
  CASE 
    WHEN qual = 'true' OR qual LIKE '%true%' THEN '⚠️ PERMISSIVA (true)'
    WHEN qual LIKE '%user_has_organograma_permission%' THEN '✅ Com verificação de permissão'
    ELSE '✅ Restritiva'
  END as tipo_politica
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('organizacao_estrutura', 'organizacao_produto')
ORDER BY tablename, cmd, policyname;

-- ============================================================================
-- 6. VERIFICAR SE FUNÇÃO DE PERMISSÃO EXISTE
-- ============================================================================
SELECT 
  '🔧 Função de Permissão' as verificacao,
  proname as function_name,
  prosecdef as is_security_definer,
  CASE 
    WHEN proconfig IS NULL OR NOT ('search_path=public' = ANY(proconfig)) 
    THEN '⚠️ search_path não definido'
    ELSE '✅ search_path definido'
  END as security_status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname = 'user_has_organograma_permission';

-- ============================================================================
-- 7. VERIFICAR SE SCREEN 'organograma' EXISTE
-- ============================================================================
SELECT 
  '📺 Screen Organograma' as verificacao,
  key,
  name,
  description,
  category,
  route
FROM screens
WHERE key = 'organograma';

-- ============================================================================
-- 8. VERIFICAR PERMISSÕES DE GRUPOS PARA ORGANOGRAMA
-- ============================================================================
SELECT 
  '🔑 Permissões por Grupo' as verificacao,
  ug.name as grupo,
  sp.screen_key,
  sp.permission_level
FROM user_groups ug
LEFT JOIN screen_permissions sp ON sp.group_id = ug.id
WHERE sp.screen_key = 'organograma'
ORDER BY ug.name;

-- ============================================================================
-- 9. VERIFICAR SE HÁ USUÁRIOS COM PERMISSÃO
-- ============================================================================
SELECT 
  '👤 Usuários com Permissão' as verificacao,
  p.email,
  ug.name as grupo,
  sp.permission_level
FROM profiles p
JOIN user_groups ug ON p.group_id = ug.id
LEFT JOIN screen_permissions sp ON sp.group_id = ug.id
WHERE sp.screen_key = 'organograma'
ORDER BY p.email;

-- ============================================================================
-- 10. VERIFICAR HIERARQUIA (PRODUTO COMEX)
-- ============================================================================
SELECT 
  '🌳 Hierarquia COMEX' as verificacao,
  oe.nome,
  oe.cargo,
  op.produto,
  COALESCE(
    (SELECT nome FROM organizacao_estrutura WHERE id = op.superior_id),
    'Sem superior'
  ) as superior
FROM organizacao_estrutura oe
LEFT JOIN organizacao_produto op ON oe.id = op.pessoa_id
WHERE op.produto = 'COMEX' OR op.produto IS NULL
ORDER BY 
  CASE oe.cargo
    WHEN 'Diretor' THEN 1
    WHEN 'Gerente' THEN 2
    WHEN 'Coordenador' THEN 3
    WHEN 'Central Escalação' THEN 4
  END,
  oe.nome;

-- ============================================================================
-- 11. TESTAR FUNÇÃO DE PERMISSÃO (COMO AUTHENTICATED)
-- ============================================================================
-- NOTA: Esta query só funciona se executada por um usuário autenticado
-- Descomente para testar:
/*
SELECT 
  '🧪 Teste de Permissão' as verificacao,
  user_has_organograma_permission('view') as tem_permissao_view,
  user_has_organograma_permission('edit') as tem_permissao_edit,
  (SELECT auth.uid()) as user_id,
  (SELECT email FROM profiles WHERE id = (SELECT auth.uid())) as user_email;
*/

-- ============================================================================
-- 12. VERIFICAR SE HÁ POLÍTICAS DUPLICADAS
-- ============================================================================
SELECT 
  '⚠️ Políticas Duplicadas' as verificacao,
  tablename,
  cmd as acao,
  array_agg(policyname) as politicas_duplicadas,
  COUNT(*) as total
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('organizacao_estrutura', 'organizacao_produto')
GROUP BY tablename, cmd
HAVING COUNT(*) > 1;

-- ============================================================================
-- RESUMO E RECOMENDAÇÕES
-- ============================================================================
DO $
DECLARE
  total_pessoas INTEGER;
  total_produtos INTEGER;
  tem_screen BOOLEAN;
  tem_permissoes BOOLEAN;
BEGIN
  -- Contar pessoas
  SELECT COUNT(*) INTO total_pessoas FROM organizacao_estrutura;
  
  -- Contar produtos
  SELECT COUNT(*) INTO total_produtos FROM organizacao_produto;
  
  -- Verificar screen
  SELECT EXISTS (SELECT 1 FROM screens WHERE key = 'organograma') INTO tem_screen;
  
  -- Verificar permissões
  SELECT EXISTS (SELECT 1 FROM screen_permissions WHERE screen_key = 'organograma') INTO tem_permissoes;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '📋 RESUMO DO DIAGNÓSTICO';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Verificar pessoas
  IF total_pessoas = 0 THEN
    RAISE NOTICE '❌ PROBLEMA: Nenhuma pessoa cadastrada na tabela organizacao_estrutura';
    RAISE NOTICE '   SOLUÇÃO: Cadastre pessoas através da interface ou execute script de seed';
  ELSE
    RAISE NOTICE '✅ OK: % pessoas cadastradas', total_pessoas;
  END IF;
  
  -- Verificar produtos
  IF total_produtos = 0 THEN
    RAISE NOTICE '⚠️ AVISO: Nenhum vínculo pessoa-produto na tabela organizacao_produto';
    RAISE NOTICE '   SOLUÇÃO: Execute a migration de produtos ou cadastre pessoas com produtos';
  ELSE
    RAISE NOTICE '✅ OK: % vínculos pessoa-produto cadastrados', total_produtos;
  END IF;
  
  -- Verificar screen
  IF NOT tem_screen THEN
    RAISE NOTICE '❌ PROBLEMA: Screen "organograma" não existe na tabela screens';
    RAISE NOTICE '   SOLUÇÃO: Execute a migration 20260226_create_organizacao_screen.sql';
  ELSE
    RAISE NOTICE '✅ OK: Screen "organograma" cadastrada';
  END IF;
  
  -- Verificar permissões
  IF NOT tem_permissoes THEN
    RAISE NOTICE '❌ PROBLEMA: Nenhum grupo tem permissão para acessar organograma';
    RAISE NOTICE '   SOLUÇÃO: Conceda permissões aos grupos através da interface ou SQL';
  ELSE
    RAISE NOTICE '✅ OK: Permissões configuradas para organograma';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $;
