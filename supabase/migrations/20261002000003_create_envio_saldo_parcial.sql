-- =====================================================================
-- Envio automático do Saldo Parcial do banco de horas.
--
-- banco_horas_envio_agendamentos: regras de recorrência (mesmo formato de
--   sync_agendamentos) + CC opcional. O sync-api lê a cada 60s e dispara os
--   vencidos (proxima_execucao <= now()).
-- banco_horas_envio_agendamento_empresas: clientes de cada agendamento
--   (um cliente fica em no máximo um agendamento).
-- banco_horas_envio_execucoes: histórico por cliente. A chave única
--   (empresa_id, executado_para) impede envio duplicado se o serviço reiniciar.
--   Guarda só a CONTAGEM de destinatários, nunca os e-mails (LGPD).
-- Destinatários: contatos ativos da empresa com finalidade_envio
--   'saldo_parcial' ou 'ambos' (tabela clientes).
-- =====================================================================

CREATE TABLE IF NOT EXISTS banco_horas_envio_agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,

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

  -- Cópia opcional (além dos contatos Saldo Parcial/Ambos de cada cliente)
  emails_cc TEXT[] NOT NULL DEFAULT '{}',

  proxima_execucao TIMESTAMPTZ,
  ultima_execucao TIMESTAMPTZ,
  ultimo_status TEXT,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT bh_envio_agendamentos_semanal_dias CHECK (
    frequencia <> 'semanal' OR cardinality(dias_semana) > 0
  ),
  CONSTRAINT bh_envio_agendamentos_mensal_dias CHECK (
    frequencia <> 'mensal' OR cardinality(dias_mes) > 0 OR ultimo_dia_mes
  ),
  CONSTRAINT bh_envio_agendamentos_horarios CHECK (
    modo_horario <> 'horarios' OR cardinality(horarios) > 0
  ),
  CONSTRAINT bh_envio_agendamentos_intervalo CHECK (
    modo_horario <> 'intervalo' OR (intervalo_horas IS NOT NULL AND hora_inicio IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS banco_horas_envio_agendamento_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id UUID NOT NULL REFERENCES banco_horas_envio_agendamentos(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas_clientes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bh_envio_agendamento_empresas_empresa_unica UNIQUE (empresa_id)
);

CREATE TABLE IF NOT EXISTS banco_horas_envio_execucoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id UUID REFERENCES banco_horas_envio_agendamentos(id) ON DELETE SET NULL,
  empresa_id UUID NOT NULL REFERENCES empresas_clientes(id) ON DELETE CASCADE,
  origem TEXT NOT NULL CHECK (origem IN ('manual', 'agendado')),
  disparado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  executado_para TIMESTAMPTZ NOT NULL,            -- instante agendado (ou o clique, no manual)
  status TEXT NOT NULL DEFAULT 'executando'
    CHECK (status IN ('executando', 'sucesso', 'erro', 'sem_destinatarios', 'interrompida')),
  qtd_destinatarios INT,
  qtd_emails INT,                                 -- contrato "ambos" envia 2
  erro TEXT,
  iniciado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalizado_em TIMESTAMPTZ,
  CONSTRAINT bh_envio_execucoes_unica UNIQUE (empresa_id, executado_para)
);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
ALTER TABLE banco_horas_envio_agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE banco_horas_envio_agendamento_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE banco_horas_envio_execucoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bh_envio_agendamentos_select" ON banco_horas_envio_agendamentos;
DROP POLICY IF EXISTS "bh_envio_agendamentos_insert" ON banco_horas_envio_agendamentos;
DROP POLICY IF EXISTS "bh_envio_agendamentos_update" ON banco_horas_envio_agendamentos;
DROP POLICY IF EXISTS "bh_envio_agendamentos_delete" ON banco_horas_envio_agendamentos;

CREATE POLICY "bh_envio_agendamentos_select" ON banco_horas_envio_agendamentos
  FOR SELECT TO authenticated
  USING ((SELECT has_screen_permission('envio_saldo_parcial'::text, 'view'::text)));

CREATE POLICY "bh_envio_agendamentos_insert" ON banco_horas_envio_agendamentos
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT has_screen_permission('envio_saldo_parcial'::text, 'edit'::text)));

CREATE POLICY "bh_envio_agendamentos_update" ON banco_horas_envio_agendamentos
  FOR UPDATE TO authenticated
  USING ((SELECT has_screen_permission('envio_saldo_parcial'::text, 'edit'::text)))
  WITH CHECK ((SELECT has_screen_permission('envio_saldo_parcial'::text, 'edit'::text)));

CREATE POLICY "bh_envio_agendamentos_delete" ON banco_horas_envio_agendamentos
  FOR DELETE TO authenticated
  USING ((SELECT has_screen_permission('envio_saldo_parcial'::text, 'edit'::text)));

DROP POLICY IF EXISTS "bh_envio_agendamento_empresas_select" ON banco_horas_envio_agendamento_empresas;
DROP POLICY IF EXISTS "bh_envio_agendamento_empresas_insert" ON banco_horas_envio_agendamento_empresas;
DROP POLICY IF EXISTS "bh_envio_agendamento_empresas_update" ON banco_horas_envio_agendamento_empresas;
DROP POLICY IF EXISTS "bh_envio_agendamento_empresas_delete" ON banco_horas_envio_agendamento_empresas;

CREATE POLICY "bh_envio_agendamento_empresas_select" ON banco_horas_envio_agendamento_empresas
  FOR SELECT TO authenticated
  USING ((SELECT has_screen_permission('envio_saldo_parcial'::text, 'view'::text)));

CREATE POLICY "bh_envio_agendamento_empresas_insert" ON banco_horas_envio_agendamento_empresas
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT has_screen_permission('envio_saldo_parcial'::text, 'edit'::text)));

CREATE POLICY "bh_envio_agendamento_empresas_update" ON banco_horas_envio_agendamento_empresas
  FOR UPDATE TO authenticated
  USING ((SELECT has_screen_permission('envio_saldo_parcial'::text, 'edit'::text)))
  WITH CHECK ((SELECT has_screen_permission('envio_saldo_parcial'::text, 'edit'::text)));

CREATE POLICY "bh_envio_agendamento_empresas_delete" ON banco_horas_envio_agendamento_empresas
  FOR DELETE TO authenticated
  USING ((SELECT has_screen_permission('envio_saldo_parcial'::text, 'edit'::text)));

DROP POLICY IF EXISTS "bh_envio_execucoes_select" ON banco_horas_envio_execucoes;
DROP POLICY IF EXISTS "bh_envio_execucoes_insert" ON banco_horas_envio_execucoes;
DROP POLICY IF EXISTS "bh_envio_execucoes_update" ON banco_horas_envio_execucoes;
DROP POLICY IF EXISTS "bh_envio_execucoes_delete" ON banco_horas_envio_execucoes;

CREATE POLICY "bh_envio_execucoes_select" ON banco_horas_envio_execucoes
  FOR SELECT TO authenticated
  USING ((SELECT has_screen_permission('envio_saldo_parcial'::text, 'view'::text)));

-- Escrita só pelo sync-api (service role ignora RLS)
CREATE POLICY "bh_envio_execucoes_insert" ON banco_horas_envio_execucoes
  FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY "bh_envio_execucoes_update" ON banco_horas_envio_execucoes
  FOR UPDATE TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "bh_envio_execucoes_delete" ON banco_horas_envio_execucoes
  FOR DELETE TO authenticated
  USING (false);

-- ---------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bh_envio_agendamentos_proxima
  ON banco_horas_envio_agendamentos (proxima_execucao) WHERE ativo;

CREATE INDEX IF NOT EXISTS idx_bh_envio_agendamento_empresas_agendamento
  ON banco_horas_envio_agendamento_empresas (agendamento_id);

CREATE INDEX IF NOT EXISTS idx_bh_envio_execucoes_iniciado_em
  ON banco_horas_envio_execucoes (iniciado_em DESC);

CREATE INDEX IF NOT EXISTS idx_bh_envio_execucoes_agendamento
  ON banco_horas_envio_execucoes (agendamento_id);

-- ---------------------------------------------------------------------
-- Trigger: updated_at + zera proxima_execucao quando a regra muda,
-- para o agendador recalcular no próximo ciclo.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION banco_horas_envio_agendamentos_before_write()
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

-- Função de trigger não deve ser chamável via /rest/v1/rpc
REVOKE EXECUTE ON FUNCTION banco_horas_envio_agendamentos_before_write() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_bh_envio_agendamentos_before_write ON banco_horas_envio_agendamentos;
CREATE TRIGGER trg_bh_envio_agendamentos_before_write
  BEFORE INSERT OR UPDATE ON banco_horas_envio_agendamentos
  FOR EACH ROW EXECUTE FUNCTION banco_horas_envio_agendamentos_before_write();

-- ---------------------------------------------------------------------
-- Tela "Envio Automático de Saldo Parcial" (menu Books)
-- Permissões: o mesmo nível que cada grupo já tem em Controle de Banco de Horas.
-- ---------------------------------------------------------------------
INSERT INTO screens (key, name, description, category, route)
VALUES (
  'envio_saldo_parcial',
  'Envio Automático de Saldo Parcial',
  'Agendamento do envio automático do e-mail de Saldo Parcial do banco de horas por cliente',
  'Comunicação',
  '/admin/envio-saldo-parcial'
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  route = EXCLUDED.route;

INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT sp.group_id, 'envio_saldo_parcial', sp.permission_level
FROM screen_permissions sp
WHERE sp.screen_key = 'controle_banco_horas'
ON CONFLICT (group_id, screen_key)
DO UPDATE SET permission_level = EXCLUDED.permission_level;

-- Administradores sempre com edição
INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, 'envio_saldo_parcial', 'edit'
FROM user_groups ug
WHERE ug.name = 'Administradores'
ON CONFLICT (group_id, screen_key)
DO UPDATE SET permission_level = EXCLUDED.permission_level;

-- ---------------------------------------------------------------------
-- Verificação
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM screens WHERE key = 'envio_saldo_parcial') THEN
    RAISE EXCEPTION 'Falha ao criar screen "envio_saldo_parcial"';
  END IF;
  IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'public'
      AND tablename IN ('banco_horas_envio_agendamentos', 'banco_horas_envio_agendamento_empresas', 'banco_horas_envio_execucoes')) <> 12 THEN
    RAISE EXCEPTION 'Esperadas 12 políticas nas tabelas de envio de Saldo Parcial';
  END IF;
END $$;
