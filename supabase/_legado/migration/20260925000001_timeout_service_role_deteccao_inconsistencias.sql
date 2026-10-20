-- =====================================================================
-- detectar_inconsistencias(): "canceling statement due to statement timeout"
--
-- Causa: o sync-api chama a função via PostgREST com a service key. O
-- `SET LOCAL statement_timeout = '60s'` dentro da função NÃO estende o limite
-- da chamada em andamento — o Postgres arma o timer quando o statement começa,
-- com o limite do role (a RPC inteira é um único statement). Com o TIPO 5
-- (troca de código de resolução) a função passou desse limite.
--
-- Correção: limite próprio para o service_role, usado só por backend
-- (sync-api e Edge Functions), e índices para as consultas mais pesadas.
-- =====================================================================

-- 1. Timeout das chamadas via API feitas com a service key
ALTER ROLE service_role SET statement_timeout = '5min';

-- PostgREST relê as configurações de role sem reiniciar
NOTIFY pgrst, 'reload config';

-- 2. Índices usados pela detecção
-- TIPOS 3 e 4: filtro por data_atividade >= início do ano anterior
CREATE INDEX IF NOT EXISTS idx_apontamentos_aranda_data_atividade
  ON public.apontamentos_aranda (data_atividade);

-- TIPO 5: soma das horas do chamado apontadas antes da troca
CREATE INDEX IF NOT EXISTS idx_apontamentos_aranda_nro_chamado_data_sistema
  ON public.apontamentos_aranda (nro_chamado, data_sistema);

-- Verificação:
-- SELECT rolname, rolconfig FROM pg_roles WHERE rolname = 'service_role';
--   → deve conter statement_timeout=5min
-- Depois, rodar "Executar agora" só com Apontamentos + Detectar inconsistências
-- e conferir no histórico que a etapa "Inconsistências" ficou verde.
