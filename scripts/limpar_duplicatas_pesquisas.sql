/**
 * Script para limpar registros duplicados de pesquisas
 * 
 * PROBLEMA: Registros com id_externo diferente mas mesma pesquisa
 * - Formato antigo: Empresa|Cliente|Caso|PENDENTE
 * - Formato antigo: Empresa|Cliente|Caso|2026-03-06T16:46:25.900Z
 * 
 * SOLUÇÃO: Manter apenas 1 registro por combinação Empresa|Cliente|Caso
 * - Prioridade: Registro com resposta (data_resposta NOT NULL)
 * - Se ambos têm resposta: Manter o mais recente (updated_at)
 * - Se nenhum tem resposta: Manter o mais recente (updated_at)
 * 
 * AÇÕES:
 * 1. Identificar duplicatas
 * 2. Atualizar id_externo dos registros que serão mantidos
 * 3. Deletar registros duplicados
 */

-- ============================================
-- PASSO 1: ANÁLISE DE DUPLICATAS
-- ============================================

-- Verificar quantas duplicatas existem
SELECT 
  empresa,
  cliente,
  nro_caso,
  COUNT(*) as total_registros,
  COUNT(*) - 1 as duplicatas
FROM pesquisas_satisfacao
WHERE origem = 'sql_server'
  AND empresa IS NOT NULL
  AND cliente IS NOT NULL
  AND nro_caso IS NOT NULL
GROUP BY empresa, cliente, nro_caso
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 20;

-- Ver exemplos de duplicatas
SELECT 
  id,
  id_externo,
  empresa,
  cliente,
  nro_caso,
  data_resposta,
  resposta,
  created_at,
  updated_at
FROM pesquisas_satisfacao
WHERE origem = 'sql_server'
  AND (empresa, cliente, nro_caso) IN (
    SELECT empresa, cliente, nro_caso
    FROM pesquisas_satisfacao
    WHERE origem = 'sql_server'
      AND empresa IS NOT NULL
      AND cliente IS NOT NULL
      AND nro_caso IS NOT NULL
    GROUP BY empresa, cliente, nro_caso
    HAVING COUNT(*) > 1
    LIMIT 5
  )
ORDER BY empresa, cliente, nro_caso, updated_at DESC;

-- ============================================
-- PASSO 2: BACKUP (RECOMENDADO)
-- ============================================

-- Criar tabela de backup antes de deletar
CREATE TABLE IF NOT EXISTS pesquisas_satisfacao_backup_duplicatas AS
SELECT *
FROM pesquisas_satisfacao
WHERE origem = 'sql_server'
  AND (empresa, cliente, nro_caso) IN (
    SELECT empresa, cliente, nro_caso
    FROM pesquisas_satisfacao
    WHERE origem = 'sql_server'
      AND empresa IS NOT NULL
      AND cliente IS NOT NULL
      AND nro_caso IS NOT NULL
    GROUP BY empresa, cliente, nro_caso
    HAVING COUNT(*) > 1
  );

-- Verificar backup
SELECT COUNT(*) as total_backup FROM pesquisas_satisfacao_backup_duplicatas;

-- ============================================
-- PASSO 3: ATUALIZAR ID_EXTERNO DOS REGISTROS A MANTER
-- ============================================

-- Atualizar id_externo para o novo padrão (sem data)
-- Apenas dos registros que serão mantidos
WITH registros_a_manter AS (
  SELECT DISTINCT ON (empresa, cliente, nro_caso)
    id,
    empresa,
    cliente,
    nro_caso
  FROM pesquisas_satisfacao
  WHERE origem = 'sql_server'
    AND empresa IS NOT NULL
    AND cliente IS NOT NULL
    AND nro_caso IS NOT NULL
  ORDER BY 
    empresa, 
    cliente, 
    nro_caso,
    -- Prioridade: com resposta > sem resposta
    CASE WHEN data_resposta IS NOT NULL THEN 0 ELSE 1 END,
    -- Desempate: mais recente
    updated_at DESC
)
UPDATE pesquisas_satisfacao
SET id_externo = CONCAT(
  registros_a_manter.empresa, '|',
  registros_a_manter.cliente, '|',
  registros_a_manter.nro_caso
)
FROM registros_a_manter
WHERE pesquisas_satisfacao.id = registros_a_manter.id;

-- Verificar quantos foram atualizados
SELECT COUNT(*) as registros_atualizados
FROM pesquisas_satisfacao
WHERE origem = 'sql_server'
  AND id_externo NOT LIKE '%PENDENTE%'
  AND id_externo NOT LIKE '%Z%'; -- Não contém timestamp

-- ============================================
-- PASSO 4: DELETAR REGISTROS DUPLICADOS
-- ============================================

-- Deletar registros duplicados (mantém apenas o melhor de cada grupo)
WITH registros_a_manter AS (
  SELECT DISTINCT ON (empresa, cliente, nro_caso)
    id
  FROM pesquisas_satisfacao
  WHERE origem = 'sql_server'
    AND empresa IS NOT NULL
    AND cliente IS NOT NULL
    AND nro_caso IS NOT NULL
  ORDER BY 
    empresa, 
    cliente, 
    nro_caso,
    -- Prioridade: com resposta > sem resposta
    CASE WHEN data_resposta IS NOT NULL THEN 0 ELSE 1 END,
    -- Desempate: mais recente
    updated_at DESC
),
registros_a_deletar AS (
  SELECT p.id
  FROM pesquisas_satisfacao p
  WHERE p.origem = 'sql_server'
    AND p.empresa IS NOT NULL
    AND p.cliente IS NOT NULL
    AND p.nro_caso IS NOT NULL
    AND p.id NOT IN (SELECT id FROM registros_a_manter)
)
DELETE FROM pesquisas_satisfacao
WHERE id IN (SELECT id FROM registros_a_deletar);

-- ============================================
-- PASSO 5: VERIFICAÇÃO FINAL
-- ============================================

-- Verificar se ainda existem duplicatas
SELECT 
  empresa,
  cliente,
  nro_caso,
  COUNT(*) as total_registros
FROM pesquisas_satisfacao
WHERE origem = 'sql_server'
  AND empresa IS NOT NULL
  AND cliente IS NOT NULL
  AND nro_caso IS NOT NULL
GROUP BY empresa, cliente, nro_caso
HAVING COUNT(*) > 1;

-- Deve retornar 0 linhas se tudo foi limpo corretamente

-- Estatísticas finais
SELECT 
  COUNT(*) as total_pesquisas,
  COUNT(DISTINCT CONCAT(empresa, '|', cliente, '|', nro_caso)) as pesquisas_unicas,
  COUNT(*) - COUNT(DISTINCT CONCAT(empresa, '|', cliente, '|', nro_caso)) as duplicatas_restantes
FROM pesquisas_satisfacao
WHERE origem = 'sql_server';

-- Verificar formato dos id_externo
SELECT 
  CASE 
    WHEN id_externo LIKE '%PENDENTE%' THEN 'Formato antigo (PENDENTE)'
    WHEN id_externo LIKE '%Z%' THEN 'Formato antigo (com timestamp)'
    ELSE 'Formato novo (sem data)'
  END as formato,
  COUNT(*) as total
FROM pesquisas_satisfacao
WHERE origem = 'sql_server'
GROUP BY 
  CASE 
    WHEN id_externo LIKE '%PENDENTE%' THEN 'Formato antigo (PENDENTE)'
    WHEN id_externo LIKE '%Z%' THEN 'Formato antigo (com timestamp)'
    ELSE 'Formato novo (sem data)'
  END;

-- ============================================
-- PASSO 6: RESTAURAR BACKUP (SE NECESSÁRIO)
-- ============================================

-- ⚠️ APENAS SE ALGO DEU ERRADO! ⚠️
-- Restaurar dados do backup
-- INSERT INTO pesquisas_satisfacao
-- SELECT * FROM pesquisas_satisfacao_backup_duplicatas;

-- Deletar tabela de backup após confirmar que tudo está OK
-- DROP TABLE IF EXISTS pesquisas_satisfacao_backup_duplicatas;

-- ============================================
-- RESUMO DE EXECUÇÃO
-- ============================================

/*
ORDEM DE EXECUÇÃO RECOMENDADA:

1. Execute PASSO 1 (Análise) para ver quantas duplicatas existem
2. Execute PASSO 2 (Backup) para criar backup de segurança
3. Execute PASSO 3 (Atualizar id_externo) para padronizar IDs
4. Execute PASSO 4 (Deletar duplicatas) para limpar registros
5. Execute PASSO 5 (Verificação) para confirmar limpeza
6. Se tudo OK, execute DROP TABLE do backup (PASSO 6)

CRITÉRIOS DE PRIORIDADE:
- Registro com resposta > Registro sem resposta
- Se ambos têm resposta: Mais recente (updated_at DESC)
- Se nenhum tem resposta: Mais recente (updated_at DESC)

NOVO PADRÃO DE ID_EXTERNO:
- Antes: Empresa|Cliente|Caso|PENDENTE ou Empresa|Cliente|Caso|2026-03-06T16:46:25.900Z
- Depois: Empresa|Cliente|Caso

SEGURANÇA:
- Backup criado antes de qualquer alteração
- Possibilidade de restaurar se necessário
- Verificações em cada etapa
*/
