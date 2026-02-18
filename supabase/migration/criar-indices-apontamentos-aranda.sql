-- ============================================================================
-- CRIAR ÍNDICES PARA OTIMIZAR QUERIES DE BANCO DE HORAS
-- Data: 12/02/2026
-- Objetivo: Melhorar performance das queries de consumo de apontamentos
-- ============================================================================

-- IMPORTANTE: Execute estes comandos no Supabase SQL Editor
-- Estes índices vão acelerar significativamente as queries de banco de horas

-- ============================================================================
-- 1. ÍNDICE COMPOSTO PRINCIPAL (MAIS IMPORTANTE)
-- ============================================================================
-- Este índice cobre os filtros mais usados na query de consumo
-- Ordem dos campos: data_atividade (range), ativi_interna (=), tipo_chamado (!=), item_configuracao (!=)

CREATE INDEX IF NOT EXISTS idx_apontamentos_consumo_principal
ON apontamentos_aranda (
  data_atividade,           -- Filtro de período (range)
  ativi_interna,            -- Filtro = "Não"
  tipo_chamado,             -- Filtro != "PM"
  item_configuracao         -- Filtro != "000000 - PROJETOS APL"
);

-- Comentário explicativo
COMMENT ON INDEX idx_apontamentos_consumo_principal IS 
'Índice composto para otimizar queries de consumo de banco de horas. Cobre filtros de data_atividade, ativi_interna, tipo_chamado e item_configuracao.';


-- ============================================================================
-- 2. ÍNDICE PARA BUSCA POR EMPRESA (org_us_final)
-- ============================================================================
-- Índice GIN para busca ILIKE em org_us_final
-- GIN é otimizado para buscas de texto com LIKE/ILIKE

CREATE INDEX IF NOT EXISTS idx_apontamentos_org_us_final_gin
ON apontamentos_aranda 
USING gin (org_us_final gin_trgm_ops);

-- NOTA: Requer extensão pg_trgm (trigram)
-- Se der erro, execute primeiro:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Comentário explicativo
COMMENT ON INDEX idx_apontamentos_org_us_final_gin IS 
'Índice GIN para busca rápida por nome de empresa usando ILIKE. Requer extensão pg_trgm.';


-- ============================================================================
-- 3. ÍNDICE PARA cod_resolucao
-- ============================================================================
-- Índice para filtro IN (códigos de resolução válidos)

CREATE INDEX IF NOT EXISTS idx_apontamentos_cod_resolucao
ON apontamentos_aranda (cod_resolucao);

-- Comentário explicativo
COMMENT ON INDEX idx_apontamentos_cod_resolucao IS 
'Índice para filtro de códigos de resolução válidos (IN clause).';


-- ============================================================================
-- 4. ÍNDICE PARA data_sistema (validação de mesmo mês)
-- ============================================================================
-- Índice para comparação de data_sistema com data_atividade

CREATE INDEX IF NOT EXISTS idx_apontamentos_data_sistema
ON apontamentos_aranda (data_sistema);

-- Comentário explicativo
COMMENT ON INDEX idx_apontamentos_data_sistema IS 
'Índice para validação de mesmo mês entre data_atividade e data_sistema.';


-- ============================================================================
-- 5. ÍNDICE PARA id_externo (remoção de duplicatas)
-- ============================================================================
-- Índice para identificação única de apontamentos

CREATE INDEX IF NOT EXISTS idx_apontamentos_id_externo
ON apontamentos_aranda (id_externo);

-- Comentário explicativo
COMMENT ON INDEX idx_apontamentos_id_externo IS 
'Índice para identificação única de apontamentos e remoção de duplicatas.';


-- ============================================================================
-- 6. ÍNDICES PARA TABELA apontamentos_tickets_aranda
-- ============================================================================

-- Índice composto para tickets
CREATE INDEX IF NOT EXISTS idx_tickets_consumo_principal
ON apontamentos_tickets_aranda (
  data_fechamento,          -- Filtro de período (range)
  status                    -- Filtro = "Closed"
);

-- Comentário explicativo
COMMENT ON INDEX idx_tickets_consumo_principal IS 
'Índice composto para otimizar queries de consumo de tickets. Cobre filtros de data_fechamento e status.';

-- Índice GIN para busca por organização
CREATE INDEX IF NOT EXISTS idx_tickets_organizacao_gin
ON apontamentos_tickets_aranda 
USING gin (organizacao gin_trgm_ops);

-- Comentário explicativo
COMMENT ON INDEX idx_tickets_organizacao_gin IS 
'Índice GIN para busca rápida por nome de organização usando ILIKE. Requer extensão pg_trgm.';

-- Índice para nro_solicitacao (remoção de duplicatas)
CREATE INDEX IF NOT EXISTS idx_tickets_nro_solicitacao
ON apontamentos_tickets_aranda (nro_solicitacao);

-- Comentário explicativo
COMMENT ON INDEX idx_tickets_nro_solicitacao IS 
'Índice para identificação única de tickets e remoção de duplicatas.';


-- ============================================================================
-- 7. VERIFICAR ÍNDICES CRIADOS
-- ============================================================================

-- Listar todos os índices da tabela apontamentos_aranda
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('apontamentos_aranda', 'apontamentos_tickets_aranda')
ORDER BY tablename, indexname;


-- ============================================================================
-- 8. ESTATÍSTICAS DE TAMANHO DOS ÍNDICES
-- ============================================================================

-- Ver tamanho dos índices criados
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE tablename IN ('apontamentos_aranda', 'apontamentos_tickets_aranda')
ORDER BY pg_relation_size(indexrelid) DESC;


-- ============================================================================
-- 9. ANALISAR TABELAS (ATUALIZAR ESTATÍSTICAS)
-- ============================================================================

-- Atualizar estatísticas para o otimizador de queries usar os novos índices
ANALYZE apontamentos_aranda;
ANALYZE apontamentos_tickets_aranda;


-- ============================================================================
-- 10. TESTAR PERFORMANCE DA QUERY
-- ============================================================================

-- Testar query de consumo para ABBOTT em 02/2026
-- EXPLAIN ANALYZE mostra o plano de execução e tempo real

EXPLAIN ANALYZE
SELECT 
  tempo_gasto_horas,
  tempo_gasto_minutos,
  cod_resolucao,
  org_us_final,
  item_configuracao,
  tipo_chamado,
  data_atividade,
  data_sistema,
  id_externo,
  nro_chamado
FROM apontamentos_aranda
WHERE 
  ativi_interna = 'Não'
  AND item_configuracao != '000000 - PROJETOS APL'
  AND tipo_chamado != 'PM'
  AND data_atividade >= '2026-02-01 00:00:00'
  AND data_atividade <= '2026-02-28 23:59:59'
  AND org_us_final ILIKE '%ABBOTT%'
  AND cod_resolucao IN (
    'Alocação - T&M',
    'AMS SAP',
    'Aplicação de Nota / Licença - Contratados',
    'Consultoria',
    'Consultoria - Banco de Dados',
    'Consultoria - Nota Publicada',
    'Consultoria - Solução Paliativa',
    'Dúvida',
    'Erro de classificação na abertura',
    'Erro de programa especifico (SEM SLA)',
    'Levantamento de Versão / Orçamento',
    'Monitoramento DBA',
    'Nota Publicada',
    'Parametrização / Cadastro',
    'Parametrização / Funcionalidade',
    'Validação de Arquivo'
  )
LIMIT 10000;

-- Resultado esperado:
-- - Deve usar índice idx_apontamentos_consumo_principal
-- - Deve usar índice idx_apontamentos_org_us_final_gin para ILIKE
-- - Tempo de execução deve ser < 1 segundo


-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

-- 1. EXTENSÃO pg_trgm:
--    Se os índices GIN falharem, execute primeiro:
--    CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. MANUTENÇÃO:
--    Índices são atualizados automaticamente quando dados são inseridos/atualizados
--    Execute ANALYZE periodicamente para manter estatísticas atualizadas

-- 3. ESPAÇO EM DISCO:
--    Índices ocupam espaço adicional no banco
--    Monitore o tamanho usando a query de estatísticas acima

-- 4. PERFORMANCE:
--    Com estes índices, queries devem ser 10-100x mais rápidas
--    Timeout de statement não deve mais ocorrer

-- 5. ROLLBACK:
--    Para remover índices (se necessário):
--    DROP INDEX IF EXISTS idx_apontamentos_consumo_principal;
--    DROP INDEX IF EXISTS idx_apontamentos_org_us_final_gin;
--    -- etc...

-- ============================================================================
