-- =====================================================================
-- Fase 2 — migration 7: tabelas operacionais do motor novo
-- (docs/especificacoes/Modelagem_Fase2.md, seção 6)
--
-- codigos_resolucao_banco         códigos de resolução que contam no banco (RC-65)
-- bancos_horas_reajustes          reajustes por banco (RN-10)
-- bancos_horas_observacoes        observações por banco; as automáticas só pela função de fechamento
-- requerimentos_bancos            só o ajuste manual do banco do requerimento (RN-09)
-- bancos_horas_fechamentos        resultado congelado do mês, com versões (D-05, D-11)
-- bancos_horas_fechamento_itens   o que entrou em cada fechamento
-- bancos_horas_transferencias     consumo entre bancos de cada fechamento (RN-17 a RN-26)
--
-- Também: repasse por período exige período de apuração = duração × períodos (Q3)
-- e a tela "bancos_horas_controle".
--
-- Mês aberto não é gravado: é calculado na hora (decisão A2).
-- Nenhuma tabela atual é alterada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Q3: uma fonte só para o fim do ciclo no repasse por período (RC-33)
-- ---------------------------------------------------------------------

ALTER TABLE bancos_horas DROP CONSTRAINT IF EXISTS bancos_horas_por_periodo_ciclo_ck;
ALTER TABLE bancos_horas ADD CONSTRAINT bancos_horas_por_periodo_ciclo_ck CHECK (
  repasse_especial <> 'por_periodo' OR periodo_apuracao = duracao_periodo_meses * periodos_ate_zerar
);

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS codigos_resolucao_banco (
  -- Valor exato do Aranda: "Banco=S |SLA=N" e "Banco=S| SLA=N" são códigos distintos
  codigo TEXT PRIMARY KEY CHECK (length(trim(codigo)) > 0),
  conta_horas BOOLEAN NOT NULL,
  conta_tickets BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT codigos_resolucao_banco_algum_ck CHECK (conta_horas OR conta_tickets)
);

CREATE TABLE IF NOT EXISTS bancos_horas_reajustes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banco_id UUID NOT NULL REFERENCES bancos_horas(id) ON DELETE RESTRICT,
  mes SMALLINT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano SMALLINT NOT NULL CHECK (ano >= 2020),
  -- Só entrada/saída: os tipos legados positivo/negativo não entram (RC-24)
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  minutos INTEGER NOT NULL DEFAULT 0 CHECK (minutos >= 0),
  tickets INTEGER NOT NULL DEFAULT 0 CHECK (tickets >= 0),
  justificativa TEXT NOT NULL CHECK (length(trim(justificativa)) > 0),
  origem TEXT NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual', 'ajuste_retroativo', 'carga_legado')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  inativado_em TIMESTAMPTZ,
  inativado_por UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  motivo_inativacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT bancos_horas_reajustes_valor_ck CHECK (minutos > 0 OR tickets > 0)
);
CREATE INDEX IF NOT EXISTS bancos_horas_reajustes_mes_idx ON bancos_horas_reajustes (banco_id, ano, mes) WHERE ativo;

CREATE TABLE IF NOT EXISTS bancos_horas_fechamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banco_id UUID NOT NULL REFERENCES bancos_horas(id) ON DELETE RESTRICT,
  mes SMALLINT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano SMALLINT NOT NULL CHECK (ano >= 2020),
  versao SMALLINT NOT NULL CHECK (versao >= 1),
  vigente BOOLEAN NOT NULL DEFAULT TRUE,
  motivo TEXT NOT NULL CHECK (motivo IN ('geracao_book', 'retificacao')),
  -- Nome exibido ao cliente na data do fechamento (RN-11)
  nome_banco TEXT NOT NULL,
  fim_periodo BOOLEAN NOT NULL DEFAULT FALSE,
  transicao_periodo BOOLEAN NOT NULL DEFAULT FALSE,
  -- Horas, em minutos (nulo quando o contrato não tem horas)
  baseline_minutos INTEGER,
  repasse_anterior_minutos INTEGER,
  saldo_a_utilizar_minutos INTEGER,
  consumo_minutos INTEGER,
  requerimentos_minutos INTEGER,
  reajustes_minutos INTEGER,
  consumo_total_minutos INTEGER,
  saldo_minutos INTEGER,
  consumido_outros_minutos INTEGER,
  cedido_outros_minutos INTEGER,
  saldo_final_minutos INTEGER,
  repasse_minutos INTEGER,
  excedente_minutos INTEGER,
  -- Tickets (nulo quando o contrato não tem tickets)
  baseline_tickets INTEGER,
  repasse_anterior_tickets INTEGER,
  saldo_a_utilizar_tickets INTEGER,
  consumo_tickets INTEGER,
  requerimentos_tickets INTEGER,
  reajustes_tickets INTEGER,
  consumo_total_tickets INTEGER,
  saldo_tickets INTEGER,
  consumido_outros_tickets INTEGER,
  cedido_outros_tickets INTEGER,
  saldo_final_tickets INTEGER,
  repasse_tickets INTEGER,
  excedente_tickets INTEGER,
  -- Valores e parâmetros usados
  percentual_repasse NUMERIC(5,2),
  taxa_hora NUMERIC(12,2),
  taxa_ticket NUMERIC(12,2),
  valor_excedente_horas NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_excedente_tickets NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_a_faturar NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Ex.: "Taxa não encontrada" (RC-75)
  alertas TEXT[] NOT NULL DEFAULT '{}',
  parametros JSONB NOT NULL DEFAULT '{}'::jsonb,
  fechado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fechado_por UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT bancos_horas_fechamentos_versao_uq UNIQUE (banco_id, ano, mes, versao)
);
-- Uma versão vigente por banco e mês
CREATE UNIQUE INDEX IF NOT EXISTS bancos_horas_fechamentos_vigente_uq
  ON bancos_horas_fechamentos (banco_id, ano, mes) WHERE vigente;

CREATE TABLE IF NOT EXISTS bancos_horas_fechamento_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fechamento_id UUID NOT NULL REFERENCES bancos_horas_fechamentos(id) ON DELETE RESTRICT,
  tipo TEXT NOT NULL CHECK (tipo IN ('apontamento', 'ticket', 'requerimento', 'reajuste')),
  -- Id na tabela de origem; sem FK para não bloquear o legado
  item_id UUID NOT NULL,
  minutos INTEGER NOT NULL DEFAULT 0,
  tickets INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT bancos_horas_fechamento_itens_uq UNIQUE (fechamento_id, tipo, item_id)
);
CREATE INDEX IF NOT EXISTS bancos_horas_fechamento_itens_item_idx ON bancos_horas_fechamento_itens (tipo, item_id);

CREATE TABLE IF NOT EXISTS bancos_horas_transferencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fechamento_consumidor_id UUID NOT NULL REFERENCES bancos_horas_fechamentos(id) ON DELETE RESTRICT,
  fechamento_cedente_id UUID NOT NULL REFERENCES bancos_horas_fechamentos(id) ON DELETE RESTRICT,
  unidade TEXT NOT NULL CHECK (unidade IN ('horas', 'tickets')),
  -- Minutos (horas) ou tickets
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT bancos_horas_transferencias_bancos_ck CHECK (fechamento_consumidor_id <> fechamento_cedente_id)
);
CREATE INDEX IF NOT EXISTS bancos_horas_transferencias_consumidor_idx ON bancos_horas_transferencias (fechamento_consumidor_id);
CREATE INDEX IF NOT EXISTS bancos_horas_transferencias_cedente_idx ON bancos_horas_transferencias (fechamento_cedente_id);

CREATE TABLE IF NOT EXISTS bancos_horas_observacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banco_id UUID NOT NULL REFERENCES bancos_horas(id) ON DELETE RESTRICT,
  mes SMALLINT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano SMALLINT NOT NULL CHECK (ano >= 2020),
  -- Ao cliente vai só o texto (D-08)
  texto TEXT NOT NULL CHECK (length(trim(texto)) > 0),
  -- manual e ajuste: do usuário; consumo_entre_bancos e faturamento: automáticas (RN-24, RC-36)
  origem TEXT NOT NULL CHECK (origem IN ('manual', 'ajuste', 'consumo_entre_bancos', 'faturamento')),
  reajuste_id UUID REFERENCES bancos_horas_reajustes(id) ON DELETE RESTRICT,
  fechamento_id UUID REFERENCES bancos_horas_fechamentos(id) ON DELETE RESTRICT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  inativado_em TIMESTAMPTZ,
  inativado_por UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT bancos_horas_observacoes_automatica_ck CHECK (
    (origem IN ('consumo_entre_bancos', 'faturamento')) = (fechamento_id IS NOT NULL)
  ),
  CONSTRAINT bancos_horas_observacoes_ajuste_ck CHECK (origem <> 'ajuste' OR reajuste_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS bancos_horas_observacoes_mes_idx ON bancos_horas_observacoes (banco_id, ano, mes) WHERE ativo;

CREATE TABLE IF NOT EXISTS requerimentos_bancos (
  -- CASCADE: apagar o requerimento no legado nunca pode ser bloqueado
  requerimento_id UUID PRIMARY KEY REFERENCES requerimentos(id) ON DELETE CASCADE,
  banco_id UUID NOT NULL REFERENCES bancos_horas(id) ON DELETE RESTRICT,
  motivo TEXT NOT NULL CHECK (length(trim(motivo)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS requerimentos_bancos_banco_idx ON requerimentos_bancos (banco_id);

-- ---------------------------------------------------------------------
-- Validação: o banco ajustado é da empresa do requerimento
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validar_requerimento_banco()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM requerimentos r JOIN bancos_horas b ON b.empresa_id = r.cliente_id
     WHERE r.id = NEW.requerimento_id AND b.id = NEW.banco_id
  ) THEN
    RAISE EXCEPTION 'O banco escolhido não é da empresa do requerimento.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_requerimentos_bancos_validar ON requerimentos_bancos;
CREATE TRIGGER trg_requerimentos_bancos_validar
  BEFORE INSERT OR UPDATE ON requerimentos_bancos
  FOR EACH ROW EXECUTE FUNCTION validar_requerimento_banco();

-- ---------------------------------------------------------------------
-- Autoria em todas; auditoria nas que o usuário altera ou que guardam o
-- resultado. Itens e transferências são gravados junto com o fechamento
-- (já auditado) e nunca mudam.
-- ---------------------------------------------------------------------

DO $$
DECLARE
  v_item RECORD;
BEGIN
  FOR v_item IN
    SELECT * FROM (VALUES
      ('codigos_resolucao_banco', 'codigo', true),
      ('bancos_horas_reajustes', 'id', true),
      ('bancos_horas_observacoes', 'id', true),
      ('requerimentos_bancos', 'requerimento_id', true),
      ('bancos_horas_fechamentos', 'id', true),
      ('bancos_horas_fechamento_itens', 'id', false),
      ('bancos_horas_transferencias', 'id', false)
    ) AS t(tabela, coluna_id, auditar)
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_autoria ON %1$I', v_item.tabela);
    EXECUTE format('CREATE TRIGGER trg_%1$s_autoria BEFORE INSERT OR UPDATE ON %1$I FOR EACH ROW EXECUTE FUNCTION definir_autoria()', v_item.tabela);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_auditoria ON %1$I', v_item.tabela);
    IF v_item.auditar THEN
      EXECUTE format('CREATE TRIGGER trg_%1$s_auditoria AFTER INSERT OR UPDATE OR DELETE ON %1$I FOR EACH ROW EXECUTE FUNCTION registrar_auditoria(%2$L, %3$L, %4$L)',
                     v_item.tabela, v_item.coluna_id, 'empresa_id', 'banco_id');
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- RLS
--   tela "bancos_horas_controle": reajustes, observações e ajuste de requerimento
--   fechamentos: leitura pelo Controle ou pela Geração de Books; gravação só
--   pela função de fechamento (SECURITY DEFINER, migration 9)
--   códigos: leitura para qualquer autenticado; gravação só por migration (Q6)
-- ---------------------------------------------------------------------

ALTER TABLE codigos_resolucao_banco ENABLE ROW LEVEL SECURITY;
ALTER TABLE bancos_horas_reajustes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bancos_horas_observacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE requerimentos_bancos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bancos_horas_fechamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bancos_horas_fechamento_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE bancos_horas_transferencias ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_tabela TEXT;
  v_acao TEXT;
BEGIN
  FOREACH v_tabela IN ARRAY ARRAY['codigos_resolucao_banco', 'bancos_horas_reajustes', 'bancos_horas_observacoes',
                                  'requerimentos_bancos', 'bancos_horas_fechamentos', 'bancos_horas_fechamento_itens',
                                  'bancos_horas_transferencias'] LOOP
    FOREACH v_acao IN ARRAY ARRAY['select', 'insert', 'update', 'delete'] LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_tabela || '_' || v_acao, v_tabela);
    END LOOP;
  END LOOP;

  -- Reajustes e ajuste do banco do requerimento
  FOREACH v_tabela IN ARRAY ARRAY['bancos_horas_reajustes', 'requerimentos_bancos'] LOOP
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (has_screen_permission(''bancos_horas_controle''::text, ''view''::text))',
      v_tabela || '_select', v_tabela);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK (has_screen_permission(''bancos_horas_controle''::text, ''edit''::text))',
      v_tabela || '_insert', v_tabela);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING (has_screen_permission(''bancos_horas_controle''::text, ''edit''::text)) WITH CHECK (has_screen_permission(''bancos_horas_controle''::text, ''edit''::text))',
      v_tabela || '_update', v_tabela);
  END LOOP;

  -- Fechamentos, itens e transferências: só leitura
  FOREACH v_tabela IN ARRAY ARRAY['bancos_horas_fechamentos', 'bancos_horas_fechamento_itens', 'bancos_horas_transferencias'] LOOP
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (has_screen_permission(''bancos_horas_controle''::text, ''view''::text) OR has_screen_permission(''geracao_books''::text, ''view''::text))',
      v_tabela || '_select', v_tabela);
  END LOOP;
END $$;

-- Voltar o requerimento para a classificação automática = apagar o ajuste (auditado)
CREATE POLICY "requerimentos_bancos_delete" ON requerimentos_bancos
  FOR DELETE TO authenticated
  USING (has_screen_permission('bancos_horas_controle'::text, 'edit'::text));

CREATE POLICY "codigos_resolucao_banco_select" ON codigos_resolucao_banco
  FOR SELECT TO authenticated USING (true);

-- Observações: o usuário só grava as suas, manuais ou de ajuste; edita ou
-- inativa só as próprias, salvo administrador (D-06)
CREATE POLICY "bancos_horas_observacoes_select" ON bancos_horas_observacoes
  FOR SELECT TO authenticated
  USING (has_screen_permission('bancos_horas_controle'::text, 'view'::text));

CREATE POLICY "bancos_horas_observacoes_insert" ON bancos_horas_observacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    has_screen_permission('bancos_horas_controle'::text, 'edit'::text)
    AND origem IN ('manual', 'ajuste')
    AND created_by = (SELECT auth.uid())
  );

CREATE POLICY "bancos_horas_observacoes_update" ON bancos_horas_observacoes
  FOR UPDATE TO authenticated
  USING (
    has_screen_permission('bancos_horas_controle'::text, 'edit'::text)
    AND origem IN ('manual', 'ajuste')
    AND (created_by = (SELECT auth.uid()) OR is_admin())
  )
  WITH CHECK (
    has_screen_permission('bancos_horas_controle'::text, 'edit'::text)
    AND origem IN ('manual', 'ajuste')
  );

-- ---------------------------------------------------------------------
-- Tela do Controle novo (Fase 3) e permissão inicial
-- ---------------------------------------------------------------------

INSERT INTO screens (key, name, description, category, route) VALUES
  ('bancos_horas_controle', 'Controle de Bancos de Horas (novo)', 'Quadro mensal por banco, reajustes, observações e ajuste do banco dos requerimentos', 'Banco de Horas', '/admin/bancos-horas')
ON CONFLICT (key) DO NOTHING;

INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, 'bancos_horas_controle', 'edit'
  FROM user_groups ug
 WHERE ug.name = 'Administradores'
   AND NOT EXISTS (SELECT 1 FROM screen_permissions sp WHERE sp.group_id = ug.id AND sp.screen_key = 'bancos_horas_controle');

-- ---------------------------------------------------------------------
-- Carga: códigos de resolução do motor atual (bancoHorasIntegracaoService.ts)
-- 48 contam horas; 47 contam tickets (sem "Nota Publicada (Banco=S| SLA=N)")
-- ---------------------------------------------------------------------

DO $$
BEGIN
  PERFORM set_config('app.origem', 'carga', true);
  INSERT INTO codigos_resolucao_banco (codigo, conta_horas, conta_tickets) VALUES
  ('Alocação', true, true),
  ('Alocação (Banco=S |SLA=N)', true, true),
  ('Alocação (Banco=S| SLA=N)', true, true),
  ('Alocação - T&M', true, true),
  ('Alocação T&M', true, true),
  ('Alocação - T&M Banco de Horas (Banco=S |SLA=N)', true, true),
  ('Alocação - T&M (Banco=S| SLA=N)', true, true),
  ('AMS SAP', true, true),
  ('AMS SAP (Banco=S |SLA=S)', true, true),
  ('AMS SAP (Banco=S| SLA=S)', true, true),
  ('Aplicação de Nota / Licença - Contratados', true, true),
  ('Aplicação de Nota / Licença (Banco=S |SLA=N)', true, true),
  ('Consultoria', true, true),
  ('Consultoria (Banco=S |SLA=S)', true, true),
  ('Consultoria (Banco=S| SLA=S)', true, true),
  ('Consultoria - Banco de Dados', true, true),
  ('Consultoria - Banco de Dados (Banco=S |SLA=S)', true, true),
  ('Consultoria - Banco de Dados (Banco=S| SLA=S)', true, true),
  ('Consultoria - Nota Publicada', true, true),
  ('Consultoria - Nota Publicada (Banco=S |SLA=S)', true, true),
  ('Consultoria - Nota Publicada (Banco=S| SLA=S)', true, true),
  ('Consultoria - Solução Paliativa', true, true),
  ('Consultoria - Solução Paliativa (Banco=S |SLA=S)', true, true),
  ('Consultoria - Solução Paliativa (Banco=S| SLA=S)', true, true),
  ('Dúvida', true, true),
  ('Dúvida (Banco=S |SLA=N)', true, true),
  ('Erro de classificação na abertura', true, true),
  ('Erro de classificação na abertura (Banco=S |SLA=N)', true, true),
  ('Erro de classificação na abertura (Banco=S| SLA=N)', true, true),
  ('Erro de programa especifico (SEM SLA)', true, true),
  ('Erro de programa especifico (Banco=S |SLA=N)', true, true),
  ('Erro de programa especifico (Banco=S| SLA=N)', true, true),
  ('Levantamento de Versão / Orçamento', true, true),
  ('Levantamento de Versão / Orçamento (Banco=S |SLA=N)', true, true),
  ('Levantamento de Versão /Orçamento (Banco=S |SLA=N)', true, true),
  ('Monitoramento DBA', true, true),
  ('Monitoramento DBA (Banco=S |SLA=N)', true, true),
  ('Nota Publicada', true, true),
  ('Nota Publicada (Banco=S |SLA=N)', true, true),
  ('Nota Publicada (Banco=S| SLA=N)', true, false),
  ('Parametrização / Cadastro', true, true),
  ('Parametrização / Cadastro (Banco=S |SLA=N)', true, true),
  ('Parametrização / Funcionalidade', true, true),
  ('Parametrização / Funcionalidade (Banco=S |SLA=N)', true, true),
  ('Parametrização / Funcionalidade (Banco=S| SLA=N)', true, true),
  ('Validação de Arquivo', true, true),
  ('Validação de Arquivo (Banco=S |SLA=N)', true, true),
  ('Validação de Arquivo (Banco=S| SLA=N)', true, true)
  ON CONFLICT (codigo) DO NOTHING;
END $$;

REVOKE EXECUTE ON FUNCTION public.validar_requerimento_banco() FROM PUBLIC, anon, authenticated;
