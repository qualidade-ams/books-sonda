-- =====================================================================
-- Fase 1 — migration 3: bancos de horas (cadastro, escopo e históricos)
-- (docs/especificacoes/Modelagem_Fase1.md, seções 3.3 e 4)
--
-- bancos_horas            bancos da empresa e parâmetros
-- bancos_horas_escopo     produtos/módulos que o banco consome (RN-03 a RN-05)
-- bancos_horas_baseline   histórico de baseline (minutos/tickets), sem sobreposição
-- bancos_horas_repasse    histórico de percentuais de repasse, sem sobreposição
--
-- Regras garantidas no banco:
--   - no máximo um Banco padrão ativo por empresa (RN-01); "pelo menos um" fica
--     com a carga e a tela, para permitir trocar o padrão
--   - Banco padrão sem escopo e sem filtro avançado
--   - Banco padrão não é inativado enquanto houver outro banco ativo (RN-14)
--   - o mesmo módulo não fica em dois bancos ativos da empresa; produto inteiro
--     conflita com qualquer módulo dele (RN-05)
--   - início de vigência no dia 1 e não anterior à vigência do contrato (D-12)
--   - repasse especial só "por período" (D-03); % de repasse obrigatório e 0
--     respeitado (D-04)
--
-- Só cria estruturas novas e vazias; nenhuma tabela atual é alterada.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bancos_horas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  -- Exibido ao cliente (RN-11)
  nome TEXT NOT NULL CHECK (length(trim(nome)) > 0),
  -- Uso interno
  descricao TEXT,
  padrao BOOLEAN NOT NULL DEFAULT FALSE,
  -- false: Banco padrão interno do cenário 1, fora do Book e do Saldo Parcial (9.3-1)
  visivel_cliente BOOLEAN NOT NULL DEFAULT TRUE,
  -- Prioridade na classificação (RN-06)
  ordem SMALLINT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  inativado_em TIMESTAMPTZ,
  inativado_por UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  tipo_contrato TEXT NOT NULL CHECK (tipo_contrato IN ('horas', 'tickets', 'ambos')),
  periodo_apuracao SMALLINT NOT NULL CHECK (periodo_apuracao BETWEEN 1 AND 12),
  inicio_vigencia DATE NOT NULL CHECK (extract(day FROM inicio_vigencia) = 1),
  dia_inicio_apuracao SMALLINT NOT NULL DEFAULT 1 CHECK (dia_inicio_apuracao BETWEEN 1 AND 28),
  -- 0 = último dia do mês
  dia_fim_apuracao SMALLINT NOT NULL DEFAULT 0 CHECK (dia_fim_apuracao BETWEEN 0 AND 28),
  -- Qual taxa do cliente usar (taxas_clientes.tipo_produto)
  taxa_produto TEXT NOT NULL CHECK (taxa_produto IN ('GALLERY', 'OUTROS')),
  -- Hora excedente (adicional) ou hora normal (valor base) — 9.3-1b
  taxa_tipo_hora TEXT NOT NULL DEFAULT 'excedente' CHECK (taxa_tipo_hora IN ('excedente', 'normal')),
  repasse_especial TEXT NOT NULL DEFAULT 'nenhum' CHECK (repasse_especial IN ('nenhum', 'por_periodo')),
  duracao_periodo_meses SMALLINT CHECK (duracao_periodo_meses BETWEEN 1 AND 12),
  periodos_ate_zerar SMALLINT CHECK (periodos_ate_zerar BETWEEN 1 AND 12),
  -- RN-17
  consome_outros_bancos BOOLEAN NOT NULL DEFAULT FALSE,
  -- Filtro avançado por item de configuração (RN-06; ex.: ANGLO)
  filtro_ic_operador TEXT CHECK (filtro_ic_operador IN ('contem', 'igual')),
  filtro_ic_valor TEXT,
  origem TEXT NOT NULL CHECK (origem IN ('carga_legado', 'manual')),
  -- Parâmetros espelhados do legado até a liberação (Modelagem 6.3)
  espelha_legado BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT bancos_horas_por_periodo_ck CHECK (
    repasse_especial <> 'por_periodo' OR (duracao_periodo_meses IS NOT NULL AND periodos_ate_zerar IS NOT NULL)
  ),
  CONSTRAINT bancos_horas_filtro_ck CHECK (
    (filtro_ic_operador IS NULL) = (filtro_ic_valor IS NULL OR length(trim(filtro_ic_valor)) = 0)
  ),
  CONSTRAINT bancos_horas_padrao_sem_filtro_ck CHECK (NOT padrao OR filtro_ic_operador IS NULL)
);

-- No máximo um Banco padrão ativo por empresa
CREATE UNIQUE INDEX IF NOT EXISTS bancos_horas_padrao_uq ON bancos_horas (empresa_id) WHERE padrao AND ativo;
-- Nome único na empresa
CREATE UNIQUE INDEX IF NOT EXISTS bancos_horas_nome_uq ON bancos_horas (empresa_id, lower(trim(nome)));
CREATE INDEX IF NOT EXISTS bancos_horas_empresa_idx ON bancos_horas (empresa_id, ordem);

CREATE TABLE IF NOT EXISTS bancos_horas_escopo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banco_id UUID NOT NULL REFERENCES bancos_horas(id) ON DELETE RESTRICT,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  -- Nulo = produto inteiro, inclusive módulos criados depois
  modulo_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT bancos_horas_escopo_modulo_fk FOREIGN KEY (modulo_id, produto_id)
    REFERENCES produto_modulos (id, produto_id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS bancos_horas_escopo_uq
  ON bancos_horas_escopo (banco_id, produto_id, COALESCE(modulo_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX IF NOT EXISTS bancos_horas_escopo_produto_idx ON bancos_horas_escopo (produto_id, modulo_id);

CREATE TABLE IF NOT EXISTS bancos_horas_baseline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banco_id UUID NOT NULL REFERENCES bancos_horas(id) ON DELETE RESTRICT,
  baseline_minutos INTEGER CHECK (baseline_minutos >= 0),
  baseline_tickets INTEGER CHECK (baseline_tickets >= 0),
  -- mensal: todo mês · anual: só no mês de data_inicio, todo ano (RC-09)
  credito TEXT NOT NULL DEFAULT 'mensal' CHECK (credito IN ('mensal', 'anual')),
  data_inicio DATE NOT NULL,
  -- Nulo = vigente
  data_fim DATE,
  motivo TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT bancos_horas_baseline_periodo_ck CHECK (data_fim IS NULL OR data_fim >= data_inicio),
  CONSTRAINT bancos_horas_baseline_sem_sobreposicao EXCLUDE USING gist (
    banco_id WITH =,
    daterange(data_inicio, data_fim, '[]') WITH &&
  )
);

CREATE TABLE IF NOT EXISTS bancos_horas_repasse (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banco_id UUID NOT NULL REFERENCES bancos_horas(id) ON DELETE RESTRICT,
  -- D-04: obrigatório, sem padrão; 0 é respeitado
  percentual_mensal NUMERIC(5,2) NOT NULL CHECK (percentual_mensal BETWEEN 0 AND 100),
  -- Obrigatórios se o banco for "por período" (gatilho)
  percentual_dentro_periodo NUMERIC(5,2) CHECK (percentual_dentro_periodo BETWEEN 0 AND 100),
  percentual_entre_periodos NUMERIC(5,2) CHECK (percentual_entre_periodos BETWEEN 0 AND 100),
  data_inicio DATE NOT NULL,
  data_fim DATE,
  motivo TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT bancos_horas_repasse_periodo_ck CHECK (data_fim IS NULL OR data_fim >= data_inicio),
  CONSTRAINT bancos_horas_repasse_sem_sobreposicao EXCLUDE USING gist (
    banco_id WITH =,
    daterange(data_inicio, data_fim, '[]') WITH &&
  )
);

-- ---------------------------------------------------------------------
-- Validações que dependem de outras linhas (gatilhos BEFORE)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validar_banco_horas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vigencia_contrato DATE;
BEGIN
  -- D-12: o banco não começa antes da vigência do contrato
  SELECT vigencia_inicio INTO v_vigencia_contrato FROM empresas WHERE id = NEW.empresa_id;
  IF v_vigencia_contrato IS NOT NULL AND NEW.inicio_vigencia < date_trunc('month', v_vigencia_contrato)::date THEN
    RAISE EXCEPTION 'O banco "%" não pode começar (%) antes da vigência do contrato da empresa (%).',
      NEW.nome, NEW.inicio_vigencia, v_vigencia_contrato
      USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- RN-14: padrão não é inativado enquanto houver outro banco ativo
    IF OLD.padrao AND OLD.ativo AND NOT NEW.ativo AND EXISTS (
      SELECT 1 FROM bancos_horas WHERE empresa_id = NEW.empresa_id AND id <> NEW.id AND ativo
    ) THEN
      RAISE EXCEPTION 'O Banco padrão não pode ser inativado enquanto a empresa tiver outros bancos ativos.'
        USING ERRCODE = 'check_violation';
    END IF;

    -- Banco que vira padrão não pode ter escopo
    IF NEW.padrao AND NOT OLD.padrao AND EXISTS (SELECT 1 FROM bancos_horas_escopo WHERE banco_id = NEW.id) THEN
      RAISE EXCEPTION 'O banco "%" tem escopo e não pode virar Banco padrão (o padrão recebe o restante).', NEW.nome
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validar_banco_horas_escopo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_banco RECORD;
  v_conflito TEXT;
BEGIN
  SELECT id, empresa_id, nome, padrao INTO v_banco FROM bancos_horas WHERE id = NEW.banco_id;

  IF v_banco.padrao THEN
    RAISE EXCEPTION 'O Banco padrão não tem escopo: ele recebe tudo o que não se encaixa em outro banco.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Serializa as validações de escopo da mesma empresa (evita conflito entre gravações simultâneas)
  PERFORM pg_advisory_xact_lock(hashtext('bancos_horas_escopo:' || v_banco.empresa_id::text));

  -- RN-05: o mesmo módulo (ou produto inteiro) em dois bancos ativos da mesma empresa
  SELECT b.nome INTO v_conflito
    FROM bancos_horas_escopo e
    JOIN bancos_horas b ON b.id = e.banco_id
   WHERE b.empresa_id = v_banco.empresa_id
     AND b.ativo
     AND e.banco_id <> NEW.banco_id
     AND e.produto_id = NEW.produto_id
     AND (e.modulo_id IS NULL OR NEW.modulo_id IS NULL OR e.modulo_id = NEW.modulo_id)
   LIMIT 1;

  IF v_conflito IS NOT NULL THEN
    RAISE EXCEPTION 'Conflito de escopo: o banco "%" já cobre este produto/módulo.', v_conflito
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validar_banco_horas_historico()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_banco RECORD;
BEGIN
  SELECT tipo_contrato, repasse_especial INTO v_banco FROM bancos_horas WHERE id = NEW.banco_id;

  IF TG_TABLE_NAME = 'bancos_horas_baseline' THEN
    IF v_banco.tipo_contrato IN ('horas', 'ambos') AND NEW.baseline_minutos IS NULL THEN
      RAISE EXCEPTION 'Banco de horas: informe o baseline em horas.' USING ERRCODE = 'check_violation';
    END IF;
    IF v_banco.tipo_contrato IN ('tickets', 'ambos') AND NEW.baseline_tickets IS NULL THEN
      RAISE EXCEPTION 'Banco de tickets: informe o baseline em tickets.' USING ERRCODE = 'check_violation';
    END IF;
  ELSIF TG_TABLE_NAME = 'bancos_horas_repasse' THEN
    IF v_banco.repasse_especial = 'por_periodo'
       AND (NEW.percentual_dentro_periodo IS NULL OR NEW.percentual_entre_periodos IS NULL) THEN
      RAISE EXCEPTION 'Repasse por período: informe os percentuais dentro do período e entre períodos.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bancos_horas_validar ON bancos_horas;
CREATE TRIGGER trg_bancos_horas_validar
  BEFORE INSERT OR UPDATE ON bancos_horas
  FOR EACH ROW EXECUTE FUNCTION validar_banco_horas();

DROP TRIGGER IF EXISTS trg_bancos_horas_escopo_validar ON bancos_horas_escopo;
CREATE TRIGGER trg_bancos_horas_escopo_validar
  BEFORE INSERT OR UPDATE ON bancos_horas_escopo
  FOR EACH ROW EXECUTE FUNCTION validar_banco_horas_escopo();

DROP TRIGGER IF EXISTS trg_bancos_horas_baseline_validar ON bancos_horas_baseline;
CREATE TRIGGER trg_bancos_horas_baseline_validar
  BEFORE INSERT OR UPDATE ON bancos_horas_baseline
  FOR EACH ROW EXECUTE FUNCTION validar_banco_horas_historico();

DROP TRIGGER IF EXISTS trg_bancos_horas_repasse_validar ON bancos_horas_repasse;
CREATE TRIGGER trg_bancos_horas_repasse_validar
  BEFORE INSERT OR UPDATE ON bancos_horas_repasse
  FOR EACH ROW EXECUTE FUNCTION validar_banco_horas_historico();

-- ---------------------------------------------------------------------
-- Auditoria: 3º argumento = coluna do banco. Nas tabelas filhas (que só têm
-- banco_id), a empresa é resolvida pelo banco.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.registrar_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_antes JSONB := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END;
  v_depois JSONB := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END;
  v_linha JSONB := COALESCE(v_depois, v_antes);
  v_coluna_id TEXT := COALESCE(TG_ARGV[0], 'id');
  v_coluna_empresa TEXT := COALESCE(TG_ARGV[1], 'empresa_id');
  v_coluna_banco TEXT := COALESCE(TG_ARGV[2], 'banco_id');
  v_empresa_id UUID;
  v_banco_id UUID;
  v_campos TEXT[];
  v_origem TEXT := COALESCE(NULLIF(current_setting('app.origem', true), ''), 'app');
BEGIN
  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(chave ORDER BY chave) INTO v_campos
      FROM jsonb_object_keys(v_depois) AS chave
     WHERE chave NOT IN ('created_at', 'created_by', 'updated_at', 'updated_by')
       AND v_antes -> chave IS DISTINCT FROM v_depois -> chave;
    IF v_campos IS NULL THEN
      RETURN NULL;
    END IF;
  END IF;

  v_empresa_id := NULLIF(v_linha ->> v_coluna_empresa, '')::uuid;
  v_banco_id := NULLIF(v_linha ->> v_coluna_banco, '')::uuid;
  IF v_empresa_id IS NULL AND v_banco_id IS NOT NULL THEN
    SELECT empresa_id INTO v_empresa_id FROM bancos_horas WHERE id = v_banco_id;
  END IF;

  INSERT INTO auditoria_alteracoes
    (tabela, registro_id, empresa_id, banco_id, acao, campos_alterados, dados_antes, dados_depois, usuario_id, origem)
  VALUES (
    TG_TABLE_NAME,
    v_linha ->> v_coluna_id,
    v_empresa_id,
    v_banco_id,
    lower(TG_OP),
    v_campos,
    v_antes,
    v_depois,
    (SELECT auth.uid()),
    v_origem
  );
  RETURN NULL;
END;
$$;

DO $$
DECLARE
  v_item RECORD;
BEGIN
  FOR v_item IN
    SELECT * FROM (VALUES
      ('bancos_horas', 'id'),
      ('bancos_horas_escopo', 'banco_id'),
      ('bancos_horas_baseline', 'banco_id'),
      ('bancos_horas_repasse', 'banco_id')
    ) AS t(tabela, coluna_banco)
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_autoria ON %1$I', v_item.tabela);
    EXECUTE format('CREATE TRIGGER trg_%1$s_autoria BEFORE INSERT OR UPDATE ON %1$I FOR EACH ROW EXECUTE FUNCTION definir_autoria()', v_item.tabela);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_auditoria ON %1$I', v_item.tabela);
    EXECUTE format('CREATE TRIGGER trg_%1$s_auditoria AFTER INSERT OR UPDATE OR DELETE ON %1$I FOR EACH ROW EXECUTE FUNCTION registrar_auditoria(%2$L, %3$L, %4$L)',
                   v_item.tabela, 'id', 'empresa_id', v_item.coluna_banco);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- RLS: tela "bancos_horas_parametros" (permissão própria, P4).
-- Exclusão física só no escopo (tabela de ligação). Históricos são encerrados
-- (data_fim), nunca apagados.
-- ---------------------------------------------------------------------

ALTER TABLE bancos_horas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bancos_horas_escopo ENABLE ROW LEVEL SECURITY;
ALTER TABLE bancos_horas_baseline ENABLE ROW LEVEL SECURITY;
ALTER TABLE bancos_horas_repasse ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_tabela TEXT;
BEGIN
  FOREACH v_tabela IN ARRAY ARRAY['bancos_horas', 'bancos_horas_escopo', 'bancos_horas_baseline', 'bancos_horas_repasse'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_tabela || '_select', v_tabela);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_tabela || '_insert', v_tabela);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_tabela || '_update', v_tabela);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_tabela || '_delete', v_tabela);

    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (has_screen_permission(''bancos_horas_parametros''::text, ''view''::text))',
      v_tabela || '_select', v_tabela);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK (has_screen_permission(''bancos_horas_parametros''::text, ''edit''::text))',
      v_tabela || '_insert', v_tabela);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING (has_screen_permission(''bancos_horas_parametros''::text, ''edit''::text)) WITH CHECK (has_screen_permission(''bancos_horas_parametros''::text, ''edit''::text))',
      v_tabela || '_update', v_tabela);
  END LOOP;
END $$;

CREATE POLICY "bancos_horas_escopo_delete" ON bancos_horas_escopo
  FOR DELETE TO authenticated
  USING (has_screen_permission('bancos_horas_parametros'::text, 'edit'::text));

-- ---------------------------------------------------------------------
-- Tela (aba Bancos de Horas da tela Empresas, Fase 3) e permissão inicial
-- ---------------------------------------------------------------------

INSERT INTO screens (key, name, description, category, route) VALUES
  ('bancos_horas_parametros', 'Bancos de Horas — Parâmetros', 'Cadastro dos bancos de horas da empresa: parâmetros, escopo, baseline e repasse', 'Banco de Horas', '/admin/empresas')
ON CONFLICT (key) DO NOTHING;

INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, 'bancos_horas_parametros', 'edit'
  FROM user_groups ug
 WHERE ug.name = 'Administradores'
   AND NOT EXISTS (SELECT 1 FROM screen_permissions sp WHERE sp.group_id = ug.id AND sp.screen_key = 'bancos_horas_parametros');

REVOKE EXECUTE ON FUNCTION
  public.registrar_auditoria(),
  public.validar_banco_horas(),
  public.validar_banco_horas_escopo(),
  public.validar_banco_horas_historico()
FROM PUBLIC, anon, authenticated;
