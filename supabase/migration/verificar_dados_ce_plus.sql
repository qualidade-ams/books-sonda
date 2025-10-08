-- Script de verificação dos dados CE Plus antes da migração
-- Execute este script primeiro para ver o que será alterado

-- 1. Verificar produtos CE_PLUS na tabela empresa_produtos
SELECT 
  'empresa_produtos' as tabela,
  COUNT(*) as total_registros,
  'CE_PLUS' as valor_atual,
  'COMEX' as valor_novo
FROM empresa_produtos 
WHERE produto = 'CE_PLUS'

UNION ALL

-- 2. Verificar grupos CE Plus na tabela grupos_responsaveis
SELECT 
  'grupos_responsaveis' as tabela,
  COUNT(*) as total_registros,
  'CE Plus' as valor_atual,
  'Comex' as valor_novo
FROM grupos_responsaveis 
WHERE nome = 'CE Plus'

UNION ALL

-- 3. Verificar requerimentos CE Plus (se a tabela existir)
SELECT 
  'requerimentos' as tabela,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'requerimentos') 
    THEN (SELECT COUNT(*)::text FROM requerimentos WHERE modulo = 'CE Plus')
    ELSE '0 (tabela não existe)'
  END::integer as total_registros,
  'CE Plus' as valor_atual,
  'Comex' as valor_novo
FROM (SELECT 1) as dummy;

-- 4. Mostrar detalhes dos registros que serão alterados
SELECT 
  'DETALHES - Produtos CE_PLUS:' as info,
  ep.id,
  ec.nome_completo as empresa,
  ep.produto,
  ep.created_at
FROM empresa_produtos ep
JOIN empresas_clientes ec ON ep.empresa_id = ec.id
WHERE ep.produto = 'CE_PLUS'
ORDER BY ec.nome_completo;

-- 5. Mostrar detalhes dos grupos CE Plus
SELECT 
  'DETALHES - Grupos CE Plus:' as info,
  gr.id,
  gr.nome,
  gr.descricao,
  gr.created_at,
  COUNT(gre.id) as total_emails
FROM grupos_responsaveis gr
LEFT JOIN grupo_responsavel_emails gre ON gr.id = gre.grupo_id
WHERE gr.nome = 'CE Plus'
GROUP BY gr.id, gr.nome, gr.descricao, gr.created_at;

-- 6. Verificar constraint atual
SELECT 
  'CONSTRAINT ATUAL:' as info,
  conname as nome_constraint,
  consrc as definicao
FROM pg_constraint 
WHERE conname = 'empresa_produtos_produto_check';