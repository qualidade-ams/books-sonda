-- =====================================================================
-- Fase 3 — migration 15: Apontamentos Retroativos (modelo novo, por banco)
-- (docs/especificacoes/Modelagem_Fase3.md, seção 8)
--
--   bancos_horas_retroativos         diferença entre o fechamento do mês e o
--                                    recálculo com o que chegou depois do Aranda
--   bancos_horas_retroativos_itens   itens da diferença (podem ser negativos)
--   bancos_horas_registrar_retroativo()  gravação da detecção (job do sync-api,
--                                    service role): cria ou atualiza o aberto
--   decidir_retroativo()             aprovar ou descartar, com justificativa
--                                    (vai para a auditoria como motivo)
--   registrar_aviso_retroativo()     marca os itens avisados aos consultores
--   bancos_horas_registrar_fechamento  na retificação, o aprovado vira aplicado
--   aviso no sino                    "Apontamento retroativo pendente", para quem
--                                    edita a tela
--   tela bancos_horas_retroativos    registrada, com Edição para Administradores
--
-- A tabela atual banco_horas_ajustes_retroativos (modelo legado, por empresa) não
-- muda. Sem fechamentos do modelo novo (Fase 4), nenhum registro nasce aqui.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tela (as políticas dependem da chave)
-- ---------------------------------------------------------------------

INSERT INTO screens (key, name, description, category, route) VALUES
  ('bancos_horas_retroativos', 'Apontamentos Retroativos (novo)',
   'Apontamentos lançados no Aranda depois do fechamento do mês, por banco', 'Banco de Horas',
   '/admin/apontamentos-retroativos')
ON CONFLICT (key) DO NOTHING;

INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, 'bancos_horas_retroativos', 'edit'
  FROM user_groups ug
 WHERE ug.name = 'Administradores'
   AND NOT EXISTS (SELECT 1 FROM screen_permissions sp WHERE sp.group_id = ug.id AND sp.screen_key = 'bancos_horas_retroativos');

-- ---------------------------------------------------------------------
-- 2. Tabelas
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bancos_horas_retroativos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banco_id UUID NOT NULL REFERENCES bancos_horas(id) ON DELETE RESTRICT,
  -- Versão vigente do mês quando a diferença foi detectada
  fechamento_id UUID NOT NULL REFERENCES bancos_horas_fechamentos(id) ON DELETE RESTRICT,
  mes SMALLINT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano SMALLINT NOT NULL CHECK (ano >= 2020),
  consumo_antes_minutos INTEGER NOT NULL,
  consumo_depois_minutos INTEGER NOT NULL,
  consumo_antes_tickets INTEGER NOT NULL,
  consumo_depois_tickets INTEGER NOT NULL,
  -- aprovado = aguardando a retificação do Book; aplicado = a retificação já o incluiu
  situacao TEXT NOT NULL DEFAULT 'pendente' CHECK (situacao IN ('pendente', 'aprovado', 'aplicado', 'descartado')),
  detectado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Última detecção que mudou a diferença
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Nulo em decisão automática (diferença que sumiu)
  decidido_por UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  decidido_em TIMESTAMPTZ,
  justificativa TEXT CHECK (justificativa IS NULL OR length(justificativa) <= 500),
  fechamento_aplicado_id UUID REFERENCES bancos_horas_fechamentos(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT bancos_horas_retroativos_decisao_ck CHECK (
    situacao = 'pendente'
    OR (decidido_em IS NOT NULL AND length(trim(coalesce(justificativa, ''))) > 0)
  ),
  CONSTRAINT bancos_horas_retroativos_aplicado_ck CHECK ((situacao = 'aplicado') = (fechamento_aplicado_id IS NOT NULL))
);

-- Um aberto (pendente ou aprovado) por banco e mês
CREATE UNIQUE INDEX IF NOT EXISTS bancos_horas_retroativos_aberto_uq
  ON bancos_horas_retroativos (banco_id, ano, mes) WHERE situacao IN ('pendente', 'aprovado');
CREATE INDEX IF NOT EXISTS bancos_horas_retroativos_situacao_idx ON bancos_horas_retroativos (situacao, ano, mes);

CREATE TABLE IF NOT EXISTS bancos_horas_retroativos_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retroativo_id UUID NOT NULL REFERENCES bancos_horas_retroativos(id) ON DELETE RESTRICT,
  tipo TEXT NOT NULL CHECK (tipo IN ('apontamento', 'ticket')),
  -- apontamentos_aranda.id ou apontamentos_tickets_aranda.id (chamado, tarefa e consultor vêm de lá)
  item_id UUID NOT NULL,
  -- Negativo: item alterado ou removido no Aranda depois do fechamento
  minutos INTEGER NOT NULL DEFAULT 0,
  tickets INTEGER NOT NULL DEFAULT 0,
  aviso_enviado_em TIMESTAMPTZ,
  aviso_enviado_por UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT bancos_horas_retroativos_itens_uq UNIQUE (retroativo_id, tipo, item_id)
);

DO $$
DECLARE
  v_item RECORD;
BEGIN
  FOR v_item IN
    SELECT * FROM (VALUES
      ('bancos_horas_retroativos', 'id', 'empresa_id', 'banco_id'),
      ('bancos_horas_retroativos_itens', 'id', 'empresa_id', 'banco_id')
    ) AS t(tabela, coluna_id, coluna_empresa, coluna_banco)
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_autoria ON %1$I', v_item.tabela);
    EXECUTE format('CREATE TRIGGER trg_%1$s_autoria BEFORE INSERT OR UPDATE ON %1$I FOR EACH ROW EXECUTE FUNCTION definir_autoria()', v_item.tabela);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_auditoria ON %1$I', v_item.tabela);
    EXECUTE format('CREATE TRIGGER trg_%1$s_auditoria AFTER INSERT OR UPDATE OR DELETE ON %1$I FOR EACH ROW EXECUTE FUNCTION registrar_auditoria(%2$L, %3$L, %4$L)',
                   v_item.tabela, v_item.coluna_id, v_item.coluna_empresa, v_item.coluna_banco);
  END LOOP;
END $$;

-- Só leitura direta. A gravação é feita pelas funções abaixo: a detecção pelo job
-- (service role), a decisão e o aviso pela tela, com permissão checada na função.
ALTER TABLE bancos_horas_retroativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bancos_horas_retroativos_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bancos_horas_retroativos_select" ON bancos_horas_retroativos;
DROP POLICY IF EXISTS "bancos_horas_retroativos_insert" ON bancos_horas_retroativos;
DROP POLICY IF EXISTS "bancos_horas_retroativos_update" ON bancos_horas_retroativos;
DROP POLICY IF EXISTS "bancos_horas_retroativos_delete" ON bancos_horas_retroativos;
DROP POLICY IF EXISTS "bancos_horas_retroativos_itens_select" ON bancos_horas_retroativos_itens;
DROP POLICY IF EXISTS "bancos_horas_retroativos_itens_insert" ON bancos_horas_retroativos_itens;
DROP POLICY IF EXISTS "bancos_horas_retroativos_itens_update" ON bancos_horas_retroativos_itens;
DROP POLICY IF EXISTS "bancos_horas_retroativos_itens_delete" ON bancos_horas_retroativos_itens;
CREATE POLICY "bancos_horas_retroativos_select" ON bancos_horas_retroativos
  FOR SELECT TO authenticated
  USING (has_screen_permission('bancos_horas_retroativos'::text, 'view'::text));
CREATE POLICY "bancos_horas_retroativos_itens_select" ON bancos_horas_retroativos_itens
  FOR SELECT TO authenticated
  USING (has_screen_permission('bancos_horas_retroativos'::text, 'view'::text));

-- ---------------------------------------------------------------------
-- 3. Aviso no sino
-- ---------------------------------------------------------------------

-- Um aviso por banco e mês enquanto estiver pendente
CREATE OR REPLACE FUNCTION public.notificar_retroativo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chave TEXT := 'retroativo:' || NEW.banco_id || ':' || NEW.ano || '-' || NEW.mes;
  v_banco RECORD;
BEGIN
  IF NEW.situacao = 'pendente' THEN
    SELECT b.nome, b.empresa_id, e.nome_abreviado INTO v_banco
      FROM bancos_horas b JOIN empresas e ON e.id = b.empresa_id WHERE b.id = NEW.banco_id;
    PERFORM notificacoes_abrir(
      'ajuste_retroativo_pendente',
      'bancos_horas_retroativos',
      'Apontamento retroativo pendente',
      format('%s › %s: apontamentos lançados depois do fechamento de %s/%s mudam o consumo do mês. Aprove ou descarte.',
             v_banco.nome_abreviado, v_banco.nome, lpad(NEW.mes::text, 2, '0'), NEW.ano),
      '/admin/apontamentos-retroativos',
      v_banco.empresa_id,
      v_chave,
      jsonb_build_object('retroativo_id', NEW.id, 'banco_id', NEW.banco_id, 'ano', NEW.ano, 'mes', NEW.mes)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.situacao = 'pendente' THEN
    PERFORM notificacoes_resolver(v_chave, 'Retroativo ' || NEW.situacao);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_bancos_horas_retroativos_notificar ON bancos_horas_retroativos;
CREATE TRIGGER trg_bancos_horas_retroativos_notificar AFTER INSERT OR UPDATE OF situacao ON bancos_horas_retroativos
  FOR EACH ROW EXECUTE FUNCTION notificar_retroativo();

-- ---------------------------------------------------------------------
-- 4. Detecção (job do sync-api, seção 8.2)
-- ---------------------------------------------------------------------

-- p_retroativo: { banco_id, ano, mes, fechamento_id,
--   consumo_antes_minutos, consumo_depois_minutos, consumo_antes_tickets, consumo_depois_tickets,
--   itens: [{ tipo, item_id, minutos, tickets }] }
-- - Sem aberto: cria o pendente (se houver diferença).
-- - Com aberto: atualiza a diferença e os itens. Se a diferença mudou e ele estava
--   aprovado, volta a pendente (a aprovação era de outra diferença).
-- - Sem diferença e com aberto: descarta sozinho ("a diferença sumiu").
-- Devolve o id do registro, ou nulo quando não há diferença nem aberto.
CREATE OR REPLACE FUNCTION public.bancos_horas_registrar_retroativo(p_retroativo JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claims JSONB := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  v_banco UUID := (p_retroativo ->> 'banco_id')::uuid;
  v_ano SMALLINT := (p_retroativo ->> 'ano')::smallint;
  v_mes SMALLINT := (p_retroativo ->> 'mes')::smallint;
  v_antes_min INTEGER := coalesce((p_retroativo ->> 'consumo_antes_minutos')::int, 0);
  v_depois_min INTEGER := coalesce((p_retroativo ->> 'consumo_depois_minutos')::int, 0);
  v_antes_tic INTEGER := coalesce((p_retroativo ->> 'consumo_antes_tickets')::int, 0);
  v_depois_tic INTEGER := coalesce((p_retroativo ->> 'consumo_depois_tickets')::int, 0);
  v_itens JSONB := coalesce(p_retroativo -> 'itens', '[]'::jsonb);
  v_tem_diferenca BOOLEAN;
  v_aberto bancos_horas_retroativos%ROWTYPE;
  v_id UUID;
BEGIN
  -- Só o job (service role) ou o SQL Editor
  IF NOT (v_claims IS NULL OR v_claims ->> 'role' = 'service_role') THEN
    RAISE EXCEPTION 'Só a rotina de detecção grava retroativos.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  PERFORM set_config('app.origem', 'sincronizacao', true);
  PERFORM pg_advisory_xact_lock(hashtext('bancos_horas_retroativo:' || v_banco || ':' || v_ano || '-' || v_mes));

  v_tem_diferenca := v_antes_min <> v_depois_min OR v_antes_tic <> v_depois_tic OR jsonb_array_length(v_itens) > 0;

  SELECT * INTO v_aberto FROM bancos_horas_retroativos
   WHERE banco_id = v_banco AND ano = v_ano AND mes = v_mes AND situacao IN ('pendente', 'aprovado')
   FOR UPDATE;

  IF NOT FOUND THEN
    IF NOT v_tem_diferenca THEN
      RETURN NULL;
    END IF;
    INSERT INTO bancos_horas_retroativos (banco_id, fechamento_id, mes, ano, consumo_antes_minutos, consumo_depois_minutos,
                                          consumo_antes_tickets, consumo_depois_tickets)
    VALUES (v_banco, (p_retroativo ->> 'fechamento_id')::uuid, v_mes, v_ano, v_antes_min, v_depois_min, v_antes_tic, v_depois_tic)
    RETURNING id INTO v_id;
  ELSE
    v_id := v_aberto.id;
    IF NOT v_tem_diferenca THEN
      UPDATE bancos_horas_retroativos
         SET situacao = 'descartado', decidido_por = NULL, decidido_em = NOW(),
             justificativa = 'Descartado automaticamente: a diferença deixou de existir no Aranda.',
             consumo_depois_minutos = v_depois_min, consumo_depois_tickets = v_depois_tic, atualizado_em = clock_timestamp()
       WHERE id = v_id;
      DELETE FROM bancos_horas_retroativos_itens WHERE retroativo_id = v_id;
      RETURN v_id;
    END IF;
    IF (v_aberto.consumo_antes_minutos, v_aberto.consumo_depois_minutos, v_aberto.consumo_antes_tickets, v_aberto.consumo_depois_tickets)
       IS DISTINCT FROM (v_antes_min, v_depois_min, v_antes_tic, v_depois_tic) THEN
      UPDATE bancos_horas_retroativos
         SET fechamento_id = (p_retroativo ->> 'fechamento_id')::uuid,
             consumo_antes_minutos = v_antes_min, consumo_depois_minutos = v_depois_min,
             consumo_antes_tickets = v_antes_tic, consumo_depois_tickets = v_depois_tic,
             atualizado_em = clock_timestamp(),
             situacao = 'pendente', decidido_por = NULL, decidido_em = NULL, justificativa = NULL
       WHERE id = v_id;
    END IF;
  END IF;

  -- Itens: os que saíram da diferença saem; os demais são gravados ou atualizados
  DELETE FROM bancos_horas_retroativos_itens ri
   WHERE ri.retroativo_id = v_id
     AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_itens) e
                      WHERE e ->> 'tipo' = ri.tipo AND (e ->> 'item_id')::uuid = ri.item_id);
  INSERT INTO bancos_horas_retroativos_itens (retroativo_id, tipo, item_id, minutos, tickets)
  SELECT v_id, e ->> 'tipo', (e ->> 'item_id')::uuid, coalesce((e ->> 'minutos')::int, 0), coalesce((e ->> 'tickets')::int, 0)
    FROM jsonb_array_elements(v_itens) e
  ON CONFLICT (retroativo_id, tipo, item_id) DO UPDATE
    SET minutos = EXCLUDED.minutos, tickets = EXCLUDED.tickets
    WHERE (bancos_horas_retroativos_itens.minutos, bancos_horas_retroativos_itens.tickets)
          IS DISTINCT FROM (EXCLUDED.minutos, EXCLUDED.tickets);

  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------
-- 5. Decisão e aviso (tela)
-- ---------------------------------------------------------------------

-- p_decisao: 'aprovar' | 'descartar'. Só o pendente é decidido. A justificativa vai
-- para o registro e, como motivo, para a auditoria.
CREATE OR REPLACE FUNCTION public.decidir_retroativo(p_retroativo_id UUID, p_decisao TEXT, p_justificativa TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_justificativa TEXT := trim(coalesce(p_justificativa, ''));
  v_situacao TEXT;
BEGIN
  IF NOT has_screen_permission('bancos_horas_retroativos'::text, 'edit'::text) THEN
    RAISE EXCEPTION 'Sem permissão para decidir apontamentos retroativos.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_decisao NOT IN ('aprovar', 'descartar') THEN
    RAISE EXCEPTION 'Decisão inválida: %', p_decisao;
  END IF;
  IF v_justificativa = '' THEN
    RAISE EXCEPTION 'Informe a justificativa.';
  END IF;

  SELECT situacao INTO v_situacao FROM bancos_horas_retroativos WHERE id = p_retroativo_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Apontamento retroativo não encontrado.';
  END IF;
  IF v_situacao <> 'pendente' THEN
    RAISE EXCEPTION 'Só o pendente é aprovado ou descartado (situação atual: %).', v_situacao;
  END IF;

  PERFORM set_config('app.motivo', v_justificativa, true);
  UPDATE bancos_horas_retroativos
     SET situacao = CASE p_decisao WHEN 'aprovar' THEN 'aprovado' ELSE 'descartado' END,
         decidido_por = (SELECT auth.uid()), decidido_em = NOW(), justificativa = v_justificativa
   WHERE id = p_retroativo_id;
  PERFORM set_config('app.motivo', '', true);
END;
$$;

-- Marca como avisados os itens informados (o e-mail aos consultores é enviado pela tela)
CREATE OR REPLACE FUNCTION public.registrar_aviso_retroativo(p_retroativo_id UUID, p_item_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_screen_permission('bancos_horas_retroativos'::text, 'edit'::text) THEN
    RAISE EXCEPTION 'Sem permissão para avisar os consultores.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  UPDATE bancos_horas_retroativos_itens
     SET aviso_enviado_em = NOW(), aviso_enviado_por = (SELECT auth.uid())
   WHERE retroativo_id = p_retroativo_id AND item_id = ANY (p_item_ids);
END;
$$;

-- ---------------------------------------------------------------------
-- 6. Retificação aplica o aprovado (seção 8.3)
--    Igual à versão da Fase 2 (migration 9), mais o bloco marcado abaixo.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bancos_horas_registrar_fechamento(p_fechamento JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claims JSONB := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  v_empresa UUID := (p_fechamento ->> 'empresa_id')::uuid;
  v_ano SMALLINT := (p_fechamento ->> 'ano')::smallint;
  v_mes SMALLINT := (p_fechamento ->> 'mes')::smallint;
  v_motivo TEXT := p_fechamento ->> 'motivo';
  v_bancos UUID[];
  v_banco JSONB;
  v_h JSONB;
  v_t JSONB;
  v_banco_id UUID;
  v_fechamento_id UUID;
  v_versao SMALLINT;
  v_ids JSONB := '{}'::jsonb;
  v_retorno JSONB := '[]'::jsonb;
BEGIN
  IF NOT (v_claims IS NULL OR v_claims ->> 'role' = 'service_role'
          OR has_screen_permission('geracao_books'::text, 'edit'::text)) THEN
    RAISE EXCEPTION 'Sem permissão para fechar o mês dos bancos de horas.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_motivo IS NULL OR v_motivo NOT IN ('geracao_book', 'retificacao') THEN
    RAISE EXCEPTION 'Motivo de fechamento inválido: %', v_motivo USING ERRCODE = 'check_violation';
  END IF;

  SELECT array_agg((b ->> 'banco_id')::uuid) INTO v_bancos
    FROM jsonb_array_elements(COALESCE(p_fechamento -> 'bancos', '[]'::jsonb)) b;
  IF v_bancos IS NULL THEN
    RAISE EXCEPTION 'Fechamento sem bancos.' USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(v_bancos) AS u(banco_id)
     WHERE NOT EXISTS (SELECT 1 FROM bancos_horas b WHERE b.id = u.banco_id AND b.empresa_id = v_empresa)
  ) THEN
    RAISE EXCEPTION 'O fechamento tem banco que não é da empresa.' USING ERRCODE = 'check_violation';
  END IF;

  -- Um fechamento por vez para a empresa e o mês
  PERFORM pg_advisory_xact_lock(hashtext('bancos_horas_fechamento:' || v_empresa::text || ':' || v_ano || '-' || v_mes));

  IF EXISTS (SELECT 1 FROM bancos_horas_fechamentos f
              WHERE f.banco_id = ANY (v_bancos) AND f.ano = v_ano AND f.mes = v_mes AND f.vigente) THEN
    IF v_motivo = 'geracao_book' THEN
      -- D-11: regerar o Book usa o que já foi fechado
      SELECT jsonb_agg(jsonb_build_object('banco_id', f.banco_id, 'fechamento_id', f.id, 'versao', f.versao))
        INTO v_retorno
        FROM bancos_horas_fechamentos f
       WHERE f.banco_id = ANY (v_bancos) AND f.ano = v_ano AND f.mes = v_mes AND f.vigente;
      RETURN jsonb_build_object('acao', 'existente', 'fechamentos', v_retorno);
    END IF;
    UPDATE bancos_horas_fechamentos SET vigente = FALSE
     WHERE banco_id = ANY (v_bancos) AND ano = v_ano AND mes = v_mes AND vigente;
  ELSIF v_motivo = 'retificacao' THEN
    RAISE EXCEPTION 'O mês %/% não está fechado: não há o que retificar.', v_mes, v_ano
      USING ERRCODE = 'check_violation';
  END IF;

  FOR v_banco IN SELECT * FROM jsonb_array_elements(p_fechamento -> 'bancos') LOOP
    v_banco_id := (v_banco ->> 'banco_id')::uuid;
    v_h := NULLIF(v_banco -> 'horas', 'null'::jsonb);
    v_t := NULLIF(v_banco -> 'tickets', 'null'::jsonb);

    SELECT COALESCE(max(versao), 0) + 1 INTO v_versao
      FROM bancos_horas_fechamentos WHERE banco_id = v_banco_id AND ano = v_ano AND mes = v_mes;

    INSERT INTO bancos_horas_fechamentos (
      banco_id, mes, ano, versao, vigente, motivo, nome_banco, fim_periodo, transicao_periodo,
      baseline_minutos, repasse_anterior_minutos, saldo_a_utilizar_minutos, consumo_minutos, requerimentos_minutos,
      reajustes_minutos, consumo_total_minutos, saldo_minutos, consumido_outros_minutos, cedido_outros_minutos,
      saldo_final_minutos, repasse_minutos, excedente_minutos,
      baseline_tickets, repasse_anterior_tickets, saldo_a_utilizar_tickets, consumo_tickets, requerimentos_tickets,
      reajustes_tickets, consumo_total_tickets, saldo_tickets, consumido_outros_tickets, cedido_outros_tickets,
      saldo_final_tickets, repasse_tickets, excedente_tickets,
      percentual_repasse, taxa_hora, taxa_ticket, valor_excedente_horas, valor_excedente_tickets, valor_a_faturar,
      alertas, parametros, fechado_por
    ) VALUES (
      v_banco_id, v_mes, v_ano, v_versao, TRUE, v_motivo, v_banco ->> 'nome_banco',
      COALESCE((v_banco ->> 'fim_periodo')::boolean, FALSE), COALESCE((v_banco ->> 'transicao_periodo')::boolean, FALSE),
      (v_h ->> 'baseline')::int, (v_h ->> 'repasse_anterior')::int, (v_h ->> 'saldo_a_utilizar')::int,
      (v_h ->> 'consumo')::int, (v_h ->> 'requerimentos')::int, (v_h ->> 'reajustes')::int,
      (v_h ->> 'consumo_total')::int, (v_h ->> 'saldo')::int, (v_h ->> 'consumido_outros')::int,
      (v_h ->> 'cedido_outros')::int, (v_h ->> 'saldo_final')::int, (v_h ->> 'repasse')::int, (v_h ->> 'excedente')::int,
      (v_t ->> 'baseline')::int, (v_t ->> 'repasse_anterior')::int, (v_t ->> 'saldo_a_utilizar')::int,
      (v_t ->> 'consumo')::int, (v_t ->> 'requerimentos')::int, (v_t ->> 'reajustes')::int,
      (v_t ->> 'consumo_total')::int, (v_t ->> 'saldo')::int, (v_t ->> 'consumido_outros')::int,
      (v_t ->> 'cedido_outros')::int, (v_t ->> 'saldo_final')::int, (v_t ->> 'repasse')::int, (v_t ->> 'excedente')::int,
      (v_banco ->> 'percentual_repasse')::numeric, (v_banco ->> 'taxa_hora')::numeric, (v_banco ->> 'taxa_ticket')::numeric,
      COALESCE((v_banco ->> 'valor_excedente_horas')::numeric, 0), COALESCE((v_banco ->> 'valor_excedente_tickets')::numeric, 0),
      COALESCE((v_banco ->> 'valor_a_faturar')::numeric, 0),
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_banco -> 'alertas', '[]'::jsonb))), '{}'),
      COALESCE(v_banco -> 'parametros', '{}'::jsonb),
      (SELECT auth.uid())
    )
    RETURNING id INTO v_fechamento_id;

    v_ids := v_ids || jsonb_build_object(v_banco_id::text, v_fechamento_id);
    v_retorno := v_retorno || jsonb_build_array(
      jsonb_build_object('banco_id', v_banco_id, 'fechamento_id', v_fechamento_id, 'versao', v_versao));

    INSERT INTO bancos_horas_fechamento_itens (fechamento_id, tipo, item_id, minutos, tickets)
    SELECT v_fechamento_id, i ->> 'tipo', (i ->> 'item_id')::uuid,
           COALESCE((i ->> 'minutos')::int, 0), COALESCE((i ->> 'tickets')::int, 0)
      FROM jsonb_array_elements(COALESCE(v_banco -> 'itens', '[]'::jsonb)) i;

    -- Só automáticas: a constraint recusa "manual" ou "ajuste" com fechamento
    INSERT INTO bancos_horas_observacoes (banco_id, mes, ano, texto, origem, fechamento_id)
    SELECT v_banco_id, v_mes, v_ano, o ->> 'texto', o ->> 'origem', v_fechamento_id
      FROM jsonb_array_elements(COALESCE(v_banco -> 'observacoes', '[]'::jsonb)) o;

    -- Fase 3: a retificação aplica os retroativos aprovados do banco e do mês
    IF v_motivo = 'retificacao' THEN
      UPDATE bancos_horas_retroativos
         SET situacao = 'aplicado', fechamento_aplicado_id = v_fechamento_id
       WHERE banco_id = v_banco_id AND ano = v_ano AND mes = v_mes AND situacao = 'aprovado';
    END IF;
  END LOOP;

  INSERT INTO bancos_horas_transferencias (fechamento_consumidor_id, fechamento_cedente_id, unidade, quantidade)
  SELECT (v_ids ->> (t ->> 'consumidor_id'))::uuid, (v_ids ->> (t ->> 'cedente_id'))::uuid,
         t ->> 'unidade', (t ->> 'quantidade')::int
    FROM jsonb_array_elements(COALESCE(p_fechamento -> 'transferencias', '[]'::jsonb)) t;

  RETURN jsonb_build_object('acao', 'criado', 'fechamentos', v_retorno);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bancos_horas_registrar_fechamento(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bancos_horas_registrar_fechamento(JSONB) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.notificar_retroativo() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bancos_horas_registrar_retroativo(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bancos_horas_registrar_retroativo(JSONB) TO service_role;
REVOKE ALL ON FUNCTION public.decidir_retroativo(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.registrar_aviso_retroativo(UUID, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decidir_retroativo(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.registrar_aviso_retroativo(UUID, UUID[]) TO authenticated, service_role;
