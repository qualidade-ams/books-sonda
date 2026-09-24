-- =====================================================================
-- Agendamento da sincronização SQL Server (Aranda) → Supabase.
--
-- sync_agendamentos: regras de recorrência configuradas na tela
--   "Sincronização SQL Server". O sync-api lê esta tabela a cada 60s e
--   dispara as execuções vencidas (proxima_execucao <= now()).
-- sync_execucoes: histórico de cada execução (manual ou agendada), com
--   status, resultado e logs. Só o sync-api (service role) grava.
-- =====================================================================

CREATE TABLE IF NOT EXISTS sync_agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  tabelas JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Em quais dias roda
  frequencia TEXT NOT NULL CHECK (frequencia IN ('diario', 'semanal', 'mensal')),
  dias_semana INT[] NOT NULL DEFAULT '{}',        -- 0 = domingo ... 6 = sábado
  dias_mes INT[] NOT NULL DEFAULT '{}',           -- 1 a 31
  ultimo_dia_mes BOOLEAN NOT NULL DEFAULT FALSE,

  -- Em que horas roda (fuso America/Sao_Paulo)
  modo_horario TEXT NOT NULL CHECK (modo_horario IN ('horarios', 'intervalo')),
  horarios TEXT[] NOT NULL DEFAULT '{}',          -- 'HH:MM'
  intervalo_horas INT CHECK (intervalo_horas BETWEEN 1 AND 23),
  hora_inicio TIME,
  hora_fim TIME,

  proxima_execucao TIMESTAMPTZ,
  ultima_execucao TIMESTAMPTZ,
  ultimo_status TEXT,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT sync_agendamentos_semanal_dias CHECK (
    frequencia <> 'semanal' OR cardinality(dias_semana) > 0
  ),
  CONSTRAINT sync_agendamentos_mensal_dias CHECK (
    frequencia <> 'mensal' OR cardinality(dias_mes) > 0 OR ultimo_dia_mes
  ),
  CONSTRAINT sync_agendamentos_horarios CHECK (
    modo_horario <> 'horarios' OR cardinality(horarios) > 0
  ),
  CONSTRAINT sync_agendamentos_intervalo CHECK (
    modo_horario <> 'intervalo' OR (intervalo_horas IS NOT NULL AND hora_inicio IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS sync_execucoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id UUID REFERENCES sync_agendamentos(id) ON DELETE SET NULL,
  origem TEXT NOT NULL CHECK (origem IN ('manual', 'agendado')),
  disparado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tabelas JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'executando'
    CHECK (status IN ('executando', 'sucesso', 'parcial', 'erro', 'ignorada', 'interrompida')),
  iniciado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalizado_em TIMESTAMPTZ,
  resultado JSONB,
  logs JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
ALTER TABLE sync_agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_execucoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sync_agendamentos_select" ON sync_agendamentos;
DROP POLICY IF EXISTS "sync_agendamentos_insert" ON sync_agendamentos;
DROP POLICY IF EXISTS "sync_agendamentos_update" ON sync_agendamentos;
DROP POLICY IF EXISTS "sync_agendamentos_delete" ON sync_agendamentos;

CREATE POLICY "sync_agendamentos_select" ON sync_agendamentos
  FOR SELECT TO authenticated
  USING ((SELECT has_screen_permission('sincronizacao_sql_server', 'view')));

CREATE POLICY "sync_agendamentos_insert" ON sync_agendamentos
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT has_screen_permission('sincronizacao_sql_server', 'edit')));

CREATE POLICY "sync_agendamentos_update" ON sync_agendamentos
  FOR UPDATE TO authenticated
  USING ((SELECT has_screen_permission('sincronizacao_sql_server', 'edit')))
  WITH CHECK ((SELECT has_screen_permission('sincronizacao_sql_server', 'edit')));

CREATE POLICY "sync_agendamentos_delete" ON sync_agendamentos
  FOR DELETE TO authenticated
  USING ((SELECT has_screen_permission('sincronizacao_sql_server', 'edit')));

DROP POLICY IF EXISTS "sync_execucoes_select" ON sync_execucoes;
DROP POLICY IF EXISTS "sync_execucoes_insert" ON sync_execucoes;
DROP POLICY IF EXISTS "sync_execucoes_update" ON sync_execucoes;
DROP POLICY IF EXISTS "sync_execucoes_delete" ON sync_execucoes;

CREATE POLICY "sync_execucoes_select" ON sync_execucoes
  FOR SELECT TO authenticated
  USING ((SELECT has_screen_permission('sincronizacao_sql_server', 'view')));

-- Escrita só pelo sync-api (service role ignora RLS)
CREATE POLICY "sync_execucoes_insert" ON sync_execucoes
  FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY "sync_execucoes_update" ON sync_execucoes
  FOR UPDATE TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "sync_execucoes_delete" ON sync_execucoes
  FOR DELETE TO authenticated
  USING (false);

-- ---------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sync_agendamentos_proxima
  ON sync_agendamentos (proxima_execucao) WHERE ativo;

CREATE INDEX IF NOT EXISTS idx_sync_execucoes_iniciado_em
  ON sync_execucoes (iniciado_em DESC);

CREATE INDEX IF NOT EXISTS idx_sync_execucoes_status
  ON sync_execucoes (status) WHERE status = 'executando';

-- ---------------------------------------------------------------------
-- Trigger: updated_at + zera proxima_execucao quando a regra muda,
-- para o agendador recalcular no próximo ciclo.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_agendamentos_before_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := NOW();

  IF TG_OP = 'INSERT' THEN
    NEW.proxima_execucao := NULL;
  ELSIF NEW.ativo IS DISTINCT FROM OLD.ativo
     OR NEW.frequencia IS DISTINCT FROM OLD.frequencia
     OR NEW.dias_semana IS DISTINCT FROM OLD.dias_semana
     OR NEW.dias_mes IS DISTINCT FROM OLD.dias_mes
     OR NEW.ultimo_dia_mes IS DISTINCT FROM OLD.ultimo_dia_mes
     OR NEW.modo_horario IS DISTINCT FROM OLD.modo_horario
     OR NEW.horarios IS DISTINCT FROM OLD.horarios
     OR NEW.intervalo_horas IS DISTINCT FROM OLD.intervalo_horas
     OR NEW.hora_inicio IS DISTINCT FROM OLD.hora_inicio
     OR NEW.hora_fim IS DISTINCT FROM OLD.hora_fim THEN
    NEW.proxima_execucao := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_agendamentos_before_write ON sync_agendamentos;
CREATE TRIGGER trg_sync_agendamentos_before_write
  BEFORE INSERT OR UPDATE ON sync_agendamentos
  FOR EACH ROW EXECUTE FUNCTION sync_agendamentos_before_write();
