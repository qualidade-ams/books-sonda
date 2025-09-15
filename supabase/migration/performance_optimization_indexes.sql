-- =====================================================
-- OTIMIZAÇÕES DE PERFORMANCE - ÍNDICES E CONSULTAS
-- Sistema de Gerenciamento de Clientes e Books
-- =====================================================

-- Índices para tabela empresas_clientes
-- Índice composto para consultas por status (mais comum)
CREATE INDEX IF NOT EXISTS idx_empresas_clientes_status_nome 
ON empresas_clientes(status, nome_completo);

-- Índice para busca por nome (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_empresas_clientes_nome_completo_lower 
ON empresas_clientes(LOWER(nome_completo));

CREATE INDEX IF NOT EXISTS idx_empresas_clientes_nome_abreviado_lower 
ON empresas_clientes(LOWER(nome_abreviado));

-- Índice para ordenação por data de criação (paginação)
CREATE INDEX IF NOT EXISTS idx_empresas_clientes_created_at 
ON empresas_clientes(created_at DESC);

-- Índice para consultas por data de status
CREATE INDEX IF NOT EXISTS idx_empresas_clientes_data_status 
ON empresas_clientes(data_status DESC) WHERE status IN ('inativo', 'suspenso');

-- Índices para tabela colaboradores
-- Índice composto para consultas por empresa e status
CREATE INDEX IF NOT EXISTS idx_colaboradores_empresa_status 
ON colaboradores(empresa_id, status);

-- Índice para busca por email (único por empresa)
CREATE INDEX IF NOT EXISTS idx_colaboradores_email_empresa 
ON colaboradores(email, empresa_id);

-- Índice para busca por nome (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_colaboradores_nome_lower 
ON colaboradores(LOWER(nome_completo));

-- Índice para principal contato por empresa
CREATE INDEX IF NOT EXISTS idx_colaboradores_principal_contato 
ON colaboradores(empresa_id) WHERE principal_contato = true;

-- Índice para ordenação por data de criação
CREATE INDEX IF NOT EXISTS idx_colaboradores_created_at 
ON colaboradores(created_at DESC);

-- Índices para tabela empresa_produtos
-- Índice composto para consultas por empresa e produto
CREATE INDEX IF NOT EXISTS idx_empresa_produtos_empresa_produto 
ON empresa_produtos(empresa_id, produto);

-- Índice para consultas por produto
CREATE INDEX IF NOT EXISTS idx_empresa_produtos_produto 
ON empresa_produtos(produto);

-- Índices para tabela empresa_grupos
-- Índice composto para relacionamento empresa-grupo
CREATE INDEX IF NOT EXISTS idx_empresa_grupos_empresa_grupo 
ON empresa_grupos(empresa_id, grupo_id);

-- Índice reverso para consultas por grupo
CREATE INDEX IF NOT EXISTS idx_empresa_grupos_grupo_empresa 
ON empresa_grupos(grupo_id, empresa_id);

-- Índices para tabela grupos_responsaveis
-- Índice para busca por nome
CREATE INDEX IF NOT EXISTS idx_grupos_responsaveis_nome_lower 
ON grupos_responsaveis(LOWER(nome));

-- Índice para ordenação por data de criação
CREATE INDEX IF NOT EXISTS idx_grupos_responsaveis_created_at 
ON grupos_responsaveis(created_at DESC);

-- Índices para tabela grupo_emails
-- Índice composto para consultas por grupo
CREATE INDEX IF NOT EXISTS idx_grupo_emails_grupo_email 
ON grupo_emails(grupo_id, email);

-- Índice para busca por email
CREATE INDEX IF NOT EXISTS idx_grupo_emails_email 
ON grupo_emails(email);

-- Índices para tabela historico_disparos
-- Índice composto para consultas por empresa e data (mais comum)
CREATE INDEX IF NOT EXISTS idx_historico_disparos_empresa_data 
ON historico_disparos(empresa_id, data_disparo DESC);

-- Índice composto para consultas por colaborador e data
CREATE INDEX IF NOT EXISTS idx_historico_disparos_colaborador_data 
ON historico_disparos(colaborador_id, data_disparo DESC);

-- Índice para consultas por status e data
CREATE INDEX IF NOT EXISTS idx_historico_disparos_status_data 
ON historico_disparos(status, data_disparo DESC);

-- Índice para consultas por mês/ano (relatórios)
CREATE INDEX IF NOT EXISTS idx_historico_disparos_mes_ano 
ON historico_disparos(
  EXTRACT(YEAR FROM data_disparo), 
  EXTRACT(MONTH FROM data_disparo), 
  data_disparo DESC
) WHERE data_disparo IS NOT NULL;

-- Índice para consultas de falhas
CREATE INDEX IF NOT EXISTS idx_historico_disparos_falhas 
ON historico_disparos(colaborador_id, data_disparo DESC) 
WHERE status = 'falhou';

-- Índice para ordenação por data de criação
CREATE INDEX IF NOT EXISTS idx_historico_disparos_created_at 
ON historico_disparos(created_at DESC);

-- Índices para tabela controle_mensal
-- Índice composto único para mês/ano/empresa
CREATE UNIQUE INDEX IF NOT EXISTS idx_controle_mensal_mes_ano_empresa 
ON controle_mensal(mes, ano, empresa_id);

-- Índice para consultas por mês/ano
CREATE INDEX IF NOT EXISTS idx_controle_mensal_mes_ano 
ON controle_mensal(ano DESC, mes DESC);

-- Índice para consultas por status
CREATE INDEX IF NOT EXISTS idx_controle_mensal_status 
ON controle_mensal(status, ano DESC, mes DESC);

-- Índice para consultas por empresa
CREATE INDEX IF NOT EXISTS idx_controle_mensal_empresa 
ON controle_mensal(empresa_id, ano DESC, mes DESC);

-- =====================================================
-- VIEWS MATERIALIZADAS PARA CONSULTAS COMPLEXAS
-- =====================================================

-- View materializada para estatísticas de empresas
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_empresas_stats AS
SELECT 
  status,
  COUNT(*) as total,
  COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as novos_30_dias,
  COUNT(CASE WHEN updated_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as atualizados_7_dias
FROM empresas_clientes 
GROUP BY status;

-- Índice para a view materializada
CREATE INDEX IF NOT EXISTS idx_mv_empresas_stats_status 
ON mv_empresas_stats(status);

-- View materializada para estatísticas de colaboradores
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_colaboradores_stats AS
SELECT 
  e.id as empresa_id,
  e.nome_completo as empresa_nome,
  e.status as empresa_status,
  COUNT(c.id) as total_colaboradores,
  COUNT(CASE WHEN c.status = 'ativo' THEN 1 END) as colaboradores_ativos,
  COUNT(CASE WHEN c.principal_contato = true THEN 1 END) as principal_contatos,
  MAX(c.created_at) as ultimo_colaborador_criado
FROM empresas_clientes e
LEFT JOIN colaboradores c ON e.id = c.empresa_id
GROUP BY e.id, e.nome_completo, e.status;

-- Índices para a view materializada de colaboradores
CREATE INDEX IF NOT EXISTS idx_mv_colaboradores_stats_empresa 
ON mv_colaboradores_stats(empresa_id);

CREATE INDEX IF NOT EXISTS idx_mv_colaboradores_stats_status 
ON mv_colaboradores_stats(empresa_status);

-- View materializada para métricas mensais de disparos
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_disparos_mensais AS
SELECT 
  EXTRACT(YEAR FROM data_disparo) as ano,
  EXTRACT(MONTH FROM data_disparo) as mes,
  empresa_id,
  status,
  COUNT(*) as total_disparos,
  COUNT(DISTINCT colaborador_id) as colaboradores_unicos
FROM historico_disparos 
WHERE data_disparo IS NOT NULL
GROUP BY 
  EXTRACT(YEAR FROM data_disparo),
  EXTRACT(MONTH FROM data_disparo),
  empresa_id,
  status;

-- Índices para a view materializada de disparos
CREATE INDEX IF NOT EXISTS idx_mv_disparos_mensais_ano_mes 
ON mv_disparos_mensais(ano DESC, mes DESC);

CREATE INDEX IF NOT EXISTS idx_mv_disparos_mensais_empresa 
ON mv_disparos_mensais(empresa_id, ano DESC, mes DESC);

CREATE INDEX IF NOT EXISTS idx_mv_disparos_mensais_status 
ON mv_disparos_mensais(status, ano DESC, mes DESC);

-- =====================================================
-- FUNÇÕES PARA REFRESH DAS VIEWS MATERIALIZADAS
-- =====================================================

-- Função para refresh automático das views materializadas
CREATE OR REPLACE FUNCTION refresh_client_books_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_empresas_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_colaboradores_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_disparos_mensais;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS PARA MANTER ESTATÍSTICAS ATUALIZADAS
-- =====================================================

-- Função para invalidar cache quando dados mudam
CREATE OR REPLACE FUNCTION invalidate_client_books_cache()
RETURNS trigger AS $$
BEGIN
  -- Aqui poderíamos notificar a aplicação para invalidar cache
  -- Por enquanto, apenas logamos a mudança
  PERFORM pg_notify('client_books_cache_invalidate', 
    json_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'timestamp', NOW()
    )::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers para invalidação de cache
CREATE TRIGGER trigger_empresas_cache_invalidate
  AFTER INSERT OR UPDATE OR DELETE ON empresas_clientes
  FOR EACH ROW EXECUTE FUNCTION invalidate_client_books_cache();

CREATE TRIGGER trigger_colaboradores_cache_invalidate
  AFTER INSERT OR UPDATE OR DELETE ON colaboradores
  FOR EACH ROW EXECUTE FUNCTION invalidate_client_books_cache();

CREATE TRIGGER trigger_historico_cache_invalidate
  AFTER INSERT OR UPDATE OR DELETE ON historico_disparos
  FOR EACH ROW EXECUTE FUNCTION invalidate_client_books_cache();

-- =====================================================
-- CONFIGURAÇÕES DE PERFORMANCE
-- =====================================================

-- Configurar autovacuum mais agressivo para tabelas com muitas escritas
ALTER TABLE historico_disparos SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE controle_mensal SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON INDEX idx_empresas_clientes_status_nome IS 
'Índice composto otimizado para consultas por status e ordenação por nome';

COMMENT ON INDEX idx_historico_disparos_empresa_data IS 
'Índice principal para consultas de histórico por empresa ordenado por data';

COMMENT ON MATERIALIZED VIEW mv_empresas_stats IS 
'View materializada com estatísticas agregadas de empresas para dashboards';

COMMENT ON MATERIALIZED VIEW mv_colaboradores_stats IS 
'View materializada com estatísticas de colaboradores por empresa';

COMMENT ON MATERIALIZED VIEW mv_disparos_mensais IS 
'View materializada com métricas mensais de disparos para relatórios';

-- =====================================================
-- SCRIPT DE MANUTENÇÃO (executar periodicamente)
-- =====================================================

-- Criar função para manutenção periódica
CREATE OR REPLACE FUNCTION maintain_client_books_performance()
RETURNS void AS $$
BEGIN
  -- Refresh das views materializadas
  PERFORM refresh_client_books_stats();
  
  -- Atualizar estatísticas das tabelas principais
  ANALYZE empresas_clientes;
  ANALYZE colaboradores;
  ANALYZE historico_disparos;
  ANALYZE controle_mensal;
  
  -- Log da manutenção
  RAISE NOTICE 'Manutenção de performance do Client Books executada em %', NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GRANTS DE PERMISSÃO
-- =====================================================

-- Garantir que o usuário da aplicação pode usar as views e funções
GRANT SELECT ON mv_empresas_stats TO authenticated;
GRANT SELECT ON mv_colaboradores_stats TO authenticated;
GRANT SELECT ON mv_disparos_mensais TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_client_books_stats() TO service_role;
GRANT EXECUTE ON FUNCTION maintain_client_books_performance() TO service_role;