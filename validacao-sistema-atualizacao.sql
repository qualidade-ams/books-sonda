-- ============================================
-- Script de Validação - Sistema de Atualização
-- Data: 11/02/2026
-- Descrição: Valida se o sistema de atualização está funcionando corretamente
-- ============================================

-- 1️⃣ VERIFICAR SE COLUNAS FORAM CRIADAS
-- ============================================
SELECT 
  '1️⃣ VERIFICAÇÃO DE COLUNAS' as etapa,
  column_name as coluna,
  data_type as tipo,
  is_nullable as permite_nulo
FROM information_schema.columns 
WHERE table_name = 'apontamentos_aranda' 
  AND column_name IN ('data_ult_modificacao_geral', 'data_ult_modificacao_tarefa')
ORDER BY column_name;

-- Resultado esperado: 2 linhas (uma para cada coluna)
-- Se retornar 0 linhas: Migration não foi executada!


-- 2️⃣ VERIFICAR SE ÍNDICES FORAM CRIADOS
-- ============================================
SELECT 
  '2️⃣ VERIFICAÇÃO DE ÍNDICES' as etapa,
  indexname as nome_indice,
  tablename as tabela
FROM pg_indexes 
WHERE tablename = 'apontamentos_aranda' 
  AND indexname LIKE '%data_ult_modificacao%'
ORDER BY indexname;

-- Resultado esperado: 2 linhas (um índice para cada coluna)
-- Se retornar 0 linhas: Índices não foram criados!


-- 3️⃣ VERIFICAR REGISTROS COM DATAS DE MODIFICAÇÃO
-- ============================================
SELECT 
  '3️⃣ REGISTROS COM DATAS' as etapa,
  COUNT(*) as total_registros,
  COUNT(data_ult_modificacao_geral) as com_data_geral,
  COUNT(data_ult_modificacao_tarefa) as com_data_tarefa,
  COUNT(data_ult_modificacao) as com_data_modificacao
FROM apontamentos_aranda;

-- Resultado esperado após sincronização:
-- - total_registros: > 0
-- - com_data_geral: > 0 (se SQL Server tem esse campo preenchido)
-- - com_data_tarefa: > 0 (se SQL Server tem esse campo preenchido)
-- - com_data_modificacao: > 0


-- 4️⃣ VERIFICAR REGISTRO 8005040 (PROBLEMA ORIGINAL)
-- ============================================
SELECT 
  '4️⃣ REGISTRO 8005040' as etapa,
  nro_chamado,
  nro_tarefa,
  data_atividade,
  data_ult_modificacao,
  data_ult_modificacao_tarefa,
  data_ult_modificacao_geral,
  created_at,
  updated_at
FROM apontamentos_aranda
WHERE nro_chamado = '8005040'
  AND nro_tarefa = 'TK-8052223';

-- Resultado esperado:
-- - 1 linha encontrada
-- - data_ult_modificacao_geral: 2026-02-03 08:58:29
-- - data_ult_modificacao_tarefa: 2026-01-30 18:02:05
-- - updated_at: Data/hora da última sincronização


-- 5️⃣ TOP 10 REGISTROS MAIS RECENTES (POR DATA DE MODIFICAÇÃO)
-- ============================================
SELECT 
  '5️⃣ TOP 10 MAIS RECENTES' as etapa,
  nro_chamado,
  nro_tarefa,
  org_us_final as cliente,
  data_atividade,
  COALESCE(
    data_ult_modificacao_geral,
    data_ult_modificacao_tarefa,
    data_ult_modificacao
  ) as data_modificacao_final,
  updated_at as ultima_sincronizacao
FROM apontamentos_aranda
WHERE COALESCE(
    data_ult_modificacao_geral,
    data_ult_modificacao_tarefa,
    data_ult_modificacao
  ) IS NOT NULL
ORDER BY COALESCE(
    data_ult_modificacao_geral,
    data_ult_modificacao_tarefa,
    data_ult_modificacao
  ) DESC
LIMIT 10;

-- Resultado esperado:
-- - 10 registros ordenados por data de modificação mais recente
-- - Datas devem estar preenchidas
-- - ultima_sincronizacao deve ser recente


-- 6️⃣ ESTATÍSTICAS DE DATAS DE MODIFICAÇÃO
-- ============================================
SELECT 
  '6️⃣ ESTATÍSTICAS' as etapa,
  'Data Geral' as tipo_data,
  COUNT(*) as total,
  MIN(data_ult_modificacao_geral) as data_mais_antiga,
  MAX(data_ult_modificacao_geral) as data_mais_recente
FROM apontamentos_aranda
WHERE data_ult_modificacao_geral IS NOT NULL

UNION ALL

SELECT 
  '6️⃣ ESTATÍSTICAS' as etapa,
  'Data Tarefa' as tipo_data,
  COUNT(*) as total,
  MIN(data_ult_modificacao_tarefa) as data_mais_antiga,
  MAX(data_ult_modificacao_tarefa) as data_mais_recente
FROM apontamentos_aranda
WHERE data_ult_modificacao_tarefa IS NOT NULL

UNION ALL

SELECT 
  '6️⃣ ESTATÍSTICAS' as etapa,
  'Data Modificação' as tipo_data,
  COUNT(*) as total,
  MIN(data_ult_modificacao) as data_mais_antiga,
  MAX(data_ult_modificacao) as data_mais_recente
FROM apontamentos_aranda
WHERE data_ult_modificacao IS NOT NULL;

-- Resultado esperado:
-- - 3 linhas (uma para cada tipo de data)
-- - Totais devem ser > 0
-- - Datas devem fazer sentido (mais_antiga < mais_recente)


-- 7️⃣ VERIFICAR REGISTROS ATUALIZADOS RECENTEMENTE
-- ============================================
SELECT 
  '7️⃣ ATUALIZADOS RECENTEMENTE' as etapa,
  nro_chamado,
  nro_tarefa,
  org_us_final as cliente,
  data_atividade,
  COALESCE(
    data_ult_modificacao_geral,
    data_ult_modificacao_tarefa,
    data_ult_modificacao
  ) as data_modificacao,
  updated_at as ultima_sincronizacao,
  EXTRACT(EPOCH FROM (updated_at - created_at)) / 60 as minutos_entre_criacao_e_atualizacao
FROM apontamentos_aranda
WHERE updated_at > created_at  -- Registros que foram atualizados após criação
ORDER BY updated_at DESC
LIMIT 20;

-- Resultado esperado:
-- - Registros que foram atualizados (updated_at > created_at)
-- - minutos_entre_criacao_e_atualizacao > 0
-- - Se retornar 0 linhas: Nenhum registro foi atualizado ainda (normal se é primeira sincronização)


-- 8️⃣ COMPARAR DATAS DE MODIFICAÇÃO (PRIORIDADE)
-- ============================================
SELECT 
  '8️⃣ PRIORIDADE DE DATAS' as etapa,
  nro_chamado,
  nro_tarefa,
  data_ult_modificacao_geral as data_geral,
  data_ult_modificacao_tarefa as data_tarefa,
  data_ult_modificacao as data_modificacao,
  CASE 
    WHEN data_ult_modificacao_geral IS NOT NULL THEN 'Geral (Prioridade 1)'
    WHEN data_ult_modificacao_tarefa IS NOT NULL THEN 'Tarefa (Prioridade 2)'
    WHEN data_ult_modificacao IS NOT NULL THEN 'Modificação (Prioridade 3)'
    ELSE 'Sem data'
  END as prioridade_usada,
  COALESCE(
    data_ult_modificacao_geral,
    data_ult_modificacao_tarefa,
    data_ult_modificacao
  ) as data_final_usada
FROM apontamentos_aranda
WHERE COALESCE(
    data_ult_modificacao_geral,
    data_ult_modificacao_tarefa,
    data_ult_modificacao
  ) IS NOT NULL
ORDER BY COALESCE(
    data_ult_modificacao_geral,
    data_ult_modificacao_tarefa,
    data_ult_modificacao
  ) DESC
LIMIT 10;

-- Resultado esperado:
-- - Mostra qual data está sendo usada para cada registro
-- - Prioridade: Geral > Tarefa > Modificação
-- - data_final_usada deve ser a mais recente disponível


-- 9️⃣ VERIFICAR PERFORMANCE DOS ÍNDICES
-- ============================================
EXPLAIN ANALYZE
SELECT *
FROM apontamentos_aranda
WHERE data_ult_modificacao_geral > '2026-01-01'
ORDER BY data_ult_modificacao_geral DESC
LIMIT 100;

-- Resultado esperado:
-- - Deve usar o índice idx_apontamentos_aranda_data_ult_modificacao_geral
-- - Execution time deve ser baixo (< 100ms)
-- - Se não usar índice: Verificar se índice foi criado (etapa 2)


-- 🔟 RESUMO FINAL
-- ============================================
SELECT 
  '🔟 RESUMO FINAL' as etapa,
  (SELECT COUNT(*) FROM apontamentos_aranda) as total_registros,
  (SELECT COUNT(*) FROM apontamentos_aranda WHERE data_ult_modificacao_geral IS NOT NULL) as com_data_geral,
  (SELECT COUNT(*) FROM apontamentos_aranda WHERE data_ult_modificacao_tarefa IS NOT NULL) as com_data_tarefa,
  (SELECT COUNT(*) FROM apontamentos_aranda WHERE updated_at > created_at) as registros_atualizados,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'apontamentos_aranda' AND indexname LIKE '%data_ult_modificacao%') as indices_criados;

-- Resultado esperado:
-- - total_registros: > 0
-- - com_data_geral: > 0 (se SQL Server tem esse campo)
-- - com_data_tarefa: > 0 (se SQL Server tem esse campo)
-- - registros_atualizados: >= 0 (pode ser 0 na primeira sincronização)
-- - indices_criados: 2


-- ============================================
-- INTERPRETAÇÃO DOS RESULTADOS
-- ============================================

/*
✅ TUDO OK SE:
- Etapa 1: 2 colunas encontradas
- Etapa 2: 2 índices encontrados
- Etapa 3: Registros com datas > 0
- Etapa 4: Registro 8005040 encontrado com datas corretas
- Etapa 5: 10 registros listados
- Etapa 6: Estatísticas fazem sentido
- Etapa 7: Registros atualizados (se houver)
- Etapa 8: Prioridade de datas correta
- Etapa 9: Índice sendo usado
- Etapa 10: Resumo com valores esperados

❌ PROBLEMAS SE:
- Etapa 1: 0 colunas → Migration não executada
- Etapa 2: 0 índices → Índices não criados
- Etapa 3: Todos os contadores = 0 → Sincronização não executada
- Etapa 4: 0 linhas → Registro 8005040 não sincronizado
- Etapa 9: Índice não usado → Performance ruim

🔧 AÇÕES CORRETIVAS:
1. Se migration não executada: Executar migration (ver INSTRUCOES_FINAIS_ATUALIZACAO.md)
2. Se sincronização não executada: Executar curl -X POST http://localhost:3001/api/sync-apontamentos-full
3. Se índices não usados: Executar ANALYZE apontamentos_aranda;
*/
