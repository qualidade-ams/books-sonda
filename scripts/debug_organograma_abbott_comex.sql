-- =====================================================
-- Script: Debug Organograma ABBOTT COMEX
-- Descrição: Verifica os dados do organograma COMEX da ABBOTT
-- Data: 2026-03-04
-- =====================================================

-- 1. Verificar empresa ABBOTT
SELECT 
  id,
  nome,
  nome_abreviado
FROM empresas_clientes
WHERE nome ILIKE '%ABBOTT%';

-- 2. Verificar pessoas no organograma COMEX
SELECT 
  oe.id,
  oe.nome,
  oe.cargo,
  oe.departamento,
  oe.ordem_exibicao,
  op.produto,
  op.superior_id,
  (SELECT nome FROM organizacao_estrutura WHERE id = op.superior_id) as superior_nome
FROM organizacao_estrutura oe
JOIN organizacao_produto op ON oe.id = op.pessoa_id
WHERE op.produto = 'COMEX'
ORDER BY 
  CASE oe.cargo
    WHEN 'Diretor' THEN 1
    WHEN 'Gerente' THEN 2
    WHEN 'Coordenador' THEN 3
    WHEN 'Analista' THEN 4
    WHEN 'Central Escalação' THEN 5
    ELSE 6
  END,
  oe.ordem_exibicao NULLS LAST,
  oe.nome;

-- 3. Contar pessoas por cargo no COMEX
SELECT 
  oe.cargo,
  COUNT(*) as total
FROM organizacao_estrutura oe
JOIN organizacao_produto op ON oe.id = op.pessoa_id
WHERE op.produto = 'COMEX'
GROUP BY oe.cargo
ORDER BY 
  CASE oe.cargo
    WHEN 'Diretor' THEN 1
    WHEN 'Gerente' THEN 2
    WHEN 'Coordenador' THEN 3
    WHEN 'Analista' THEN 4
    WHEN 'Central Escalação' THEN 5
    ELSE 6
  END;

-- 4. Verificar hierarquia completa (quem reporta para quem)
WITH RECURSIVE hierarquia AS (
  -- Raízes (sem superior)
  SELECT 
    oe.id,
    oe.nome,
    oe.cargo,
    op.superior_id,
    0 as nivel,
    oe.nome as caminho
  FROM organizacao_estrutura oe
  JOIN organizacao_produto op ON oe.id = op.pessoa_id
  WHERE op.produto = 'COMEX'
    AND op.superior_id IS NULL
  
  UNION ALL
  
  -- Subordinados
  SELECT 
    oe.id,
    oe.nome,
    oe.cargo,
    op.superior_id,
    h.nivel + 1,
    h.caminho || ' > ' || oe.nome
  FROM organizacao_estrutura oe
  JOIN organizacao_produto op ON oe.id = op.pessoa_id
  JOIN hierarquia h ON op.superior_id = h.id
  WHERE op.produto = 'COMEX'
)
SELECT 
  REPEAT('  ', nivel) || nome as hierarquia,
  cargo,
  nivel
FROM hierarquia
ORDER BY caminho;

-- 5. Verificar se há pessoas sem superior (raízes)
SELECT 
  oe.id,
  oe.nome,
  oe.cargo,
  op.superior_id
FROM organizacao_estrutura oe
JOIN organizacao_produto op ON oe.id = op.pessoa_id
WHERE op.produto = 'COMEX'
  AND op.superior_id IS NULL;

-- 6. Verificar se há pessoas órfãs (superior não existe)
SELECT 
  oe.id,
  oe.nome,
  oe.cargo,
  op.superior_id,
  'Superior não encontrado' as problema
FROM organizacao_estrutura oe
JOIN organizacao_produto op ON oe.id = op.pessoa_id
WHERE op.produto = 'COMEX'
  AND op.superior_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM organizacao_estrutura oe2
    JOIN organizacao_produto op2 ON oe2.id = op2.pessoa_id
    WHERE op2.produto = 'COMEX'
      AND oe2.id = op.superior_id
  );

-- 7. Verificar políticas RLS
SELECT 
  tablename,
  policyname,
  cmd,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE tablename IN ('organizacao_estrutura', 'organizacao_produto')
  AND schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- 8. Testar query do componente BookOrganograma
SELECT 
  oe.id,
  oe.nome,
  oe.cargo,
  oe.departamento,
  oe.email,
  oe.telefone,
  oe.foto_url,
  oe.ordem_exibicao,
  op.id as produto_id,
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
    WHEN 'Analista' THEN 4
    WHEN 'Central Escalação' THEN 5
    ELSE 6
  END,
  oe.ordem_exibicao NULLS LAST,
  oe.nome;
