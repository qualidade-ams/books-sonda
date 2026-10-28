-- =====================================================================
-- Fase 4 — migration 24: Comparação Legado x Novo
-- (docs/especificacoes/Modelagem_Fase4.md, seções 3.5, 5 e 9)
--
--   bancos_horas_comparacao          uma linha por empresa em Legado: situação, somas
--                                    de consumo, último cálculo, erro e validação
--   bancos_horas_comparacao_meses    uma linha por empresa e mês comparado
--   bancos_horas_gravar_comparacao   gravação pela rotina do sync-api (service role);
--                                    nova divergência derruba a validação
--   bancos_horas_erro_comparacao     falha da rotina para a empresa
--   validar_comparacao               marcar e desfazer a validação pela tela
--
-- As tabelas são só de leitura para a tela; quem grava é a rotina, pelas funções.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tela (as políticas dependem da chave)
-- ---------------------------------------------------------------------

INSERT INTO screens (key, name, description, category, route) VALUES
  ('bancos_horas_comparacao', 'Comparação Legado x Novo',
   'Cálculo novo em sombra comparado com o que o cliente recebeu no Book', 'Banco de Horas',
   '/admin/comparacao-bancos-horas')
ON CONFLICT (key) DO NOTHING;

INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, 'bancos_horas_comparacao', 'edit'
  FROM user_groups ug
 WHERE ug.name = 'Administradores'
   AND NOT EXISTS (SELECT 1 FROM screen_permissions sp WHERE sp.group_id = ug.id AND sp.screen_key = 'bancos_horas_comparacao');

-- ---------------------------------------------------------------------
-- 2. Tabelas
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bancos_horas_comparacao (
  empresa_id UUID PRIMARY KEY REFERENCES empresas(id) ON DELETE RESTRICT,
  -- NULL: a rotina só registrou erro, ainda sem resultado
  situacao TEXT CHECK (situacao IN ('identico', 'soma_confere', 'explicada', 'divergente')),
  meses_comparados SMALLINT NOT NULL DEFAULT 0,
  consumo_legado_minutos INTEGER NOT NULL DEFAULT 0,
  consumo_novo_minutos INTEGER NOT NULL DEFAULT 0,
  consumo_legado_tickets INTEGER NOT NULL DEFAULT 0,
  consumo_novo_tickets INTEGER NOT NULL DEFAULT 0,
  -- Último cálculo com sucesso
  calculado_em TIMESTAMPTZ,
  -- Última falha da rotina para a empresa (sem dado pessoal); some no próximo sucesso
  erro TEXT CHECK (erro IS NULL OR length(erro) <= 500),
  erro_em TIMESTAMPTZ,
  validada_por UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  validada_em TIMESTAMPTZ,
  -- Situação no momento da validação
  validacao_situacao TEXT CHECK (validacao_situacao IN ('identico', 'soma_confere', 'explicada')),
  CONSTRAINT bancos_horas_comparacao_validacao_ck CHECK (
    (validada_em IS NULL) = (validada_por IS NULL) AND (validada_em IS NULL) = (validacao_situacao IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS bancos_horas_comparacao_situacao_idx ON bancos_horas_comparacao (situacao);

CREATE TABLE IF NOT EXISTS bancos_horas_comparacao_meses (
  empresa_id UUID NOT NULL REFERENCES bancos_horas_comparacao(empresa_id) ON DELETE RESTRICT,
  ano SMALLINT NOT NULL,
  mes SMALLINT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  situacao TEXT NOT NULL CHECK (situacao IN ('igual', 'explicada', 'divergente')),
  -- Medidas do mês (Modelagem_Fase4.md, 3.1), em minutos e tickets
  legado JSONB NOT NULL,
  -- As mesmas medidas, mais o consumo por banco
  novo JSONB NOT NULL,
  -- Mês onde começou a diferença de saldo que este mês carrega (3.3)
  origem_saldo JSONB,
  -- Diferenças por item com o motivo (seção 4), no máximo 500
  itens JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(itens) = 'array' AND jsonb_array_length(itens) <= 500),
  -- Quantos itens tinham diferença (pode passar de 500)
  itens_total INTEGER NOT NULL DEFAULT 0,
  -- fechado_em do fechamento do legado usado
  fechamento_legado_em TIMESTAMPTZ NOT NULL,
  calculado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (empresa_id, ano, mes)
);

-- Auditoria só da validação: a rotina regrava os resultados todo dia
DROP TRIGGER IF EXISTS trg_bancos_horas_comparacao_auditoria ON bancos_horas_comparacao;
CREATE TRIGGER trg_bancos_horas_comparacao_auditoria
  AFTER UPDATE OF validada_por, validada_em ON bancos_horas_comparacao
  FOR EACH ROW EXECUTE FUNCTION registrar_auditoria('empresa_id', 'empresa_id', 'banco_id');

ALTER TABLE bancos_horas_comparacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE bancos_horas_comparacao_meses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bancos_horas_comparacao_select" ON bancos_horas_comparacao;
DROP POLICY IF EXISTS "bancos_horas_comparacao_insert" ON bancos_horas_comparacao;
DROP POLICY IF EXISTS "bancos_horas_comparacao_update" ON bancos_horas_comparacao;
DROP POLICY IF EXISTS "bancos_horas_comparacao_delete" ON bancos_horas_comparacao;
DROP POLICY IF EXISTS "bancos_horas_comparacao_meses_select" ON bancos_horas_comparacao_meses;
DROP POLICY IF EXISTS "bancos_horas_comparacao_meses_insert" ON bancos_horas_comparacao_meses;
DROP POLICY IF EXISTS "bancos_horas_comparacao_meses_update" ON bancos_horas_comparacao_meses;
DROP POLICY IF EXISTS "bancos_horas_comparacao_meses_delete" ON bancos_horas_comparacao_meses;
CREATE POLICY "bancos_horas_comparacao_select" ON bancos_horas_comparacao
  FOR SELECT TO authenticated
  USING (has_screen_permission('bancos_horas_comparacao'::text, 'view'::text));
CREATE POLICY "bancos_horas_comparacao_meses_select" ON bancos_horas_comparacao_meses
  FOR SELECT TO authenticated
  USING (has_screen_permission('bancos_horas_comparacao'::text, 'view'::text));

-- ---------------------------------------------------------------------
-- 3. Gravação pela rotina
-- ---------------------------------------------------------------------

-- p_comparacao: { empresa_id, situacao, meses_comparados, consumo_legado_minutos,
--   consumo_novo_minutos, consumo_legado_tickets, consumo_novo_tickets,
--   meses: [{ ano, mes, situacao, legado, novo, origem_saldo, itens, itens_total,
--             fechamento_legado_em }] }
-- Sem meses, a empresa sai da comparação (P4).
CREATE OR REPLACE FUNCTION public.bancos_horas_gravar_comparacao(p_comparacao JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claims JSONB := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  v_empresa UUID := (p_comparacao ->> 'empresa_id')::uuid;
  v_situacao TEXT := p_comparacao ->> 'situacao';
  v_meses JSONB := COALESCE(p_comparacao -> 'meses', '[]'::jsonb);
  v_validada BOOLEAN;
  v_divergencia TEXT;
BEGIN
  IF NOT (v_claims IS NULL OR v_claims ->> 'role' = 'service_role') THEN
    RAISE EXCEPTION 'Só a rotina do modo sombra grava a comparação.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_empresa IS NULL OR NOT EXISTS (SELECT 1 FROM empresas WHERE id = v_empresa) THEN
    RAISE EXCEPTION 'Empresa não encontrada.';
  END IF;

  PERFORM set_config('app.origem', 'sistema', true);

  IF jsonb_array_length(v_meses) = 0 THEN
    DELETE FROM bancos_horas_comparacao_meses WHERE empresa_id = v_empresa;
    DELETE FROM bancos_horas_comparacao WHERE empresa_id = v_empresa;
    PERFORM set_config('app.origem', '', true);
    RETURN;
  END IF;

  -- Nova divergência derruba a validação (3.5), com o primeiro mês divergente no motivo
  SELECT validada_em IS NOT NULL INTO v_validada
    FROM bancos_horas_comparacao WHERE empresa_id = v_empresa FOR UPDATE;
  IF v_validada AND v_situacao = 'divergente' THEN
    SELECT format('Nova divergência em %s/%s', m ->> 'mes', m ->> 'ano') INTO v_divergencia
      FROM jsonb_array_elements(v_meses) m
     WHERE m ->> 'situacao' = 'divergente'
     ORDER BY (m ->> 'ano')::int, (m ->> 'mes')::int
     LIMIT 1;
    PERFORM set_config('app.motivo', COALESCE(v_divergencia, 'Nova divergência'), true);
    UPDATE bancos_horas_comparacao
       SET validada_por = NULL, validada_em = NULL, validacao_situacao = NULL
     WHERE empresa_id = v_empresa;
    PERFORM set_config('app.motivo', '', true);
  END IF;

  INSERT INTO bancos_horas_comparacao AS c
    (empresa_id, situacao, meses_comparados, consumo_legado_minutos, consumo_novo_minutos,
     consumo_legado_tickets, consumo_novo_tickets, calculado_em, erro, erro_em)
  VALUES (
    v_empresa, v_situacao, (p_comparacao ->> 'meses_comparados')::smallint,
    COALESCE((p_comparacao ->> 'consumo_legado_minutos')::int, 0),
    COALESCE((p_comparacao ->> 'consumo_novo_minutos')::int, 0),
    COALESCE((p_comparacao ->> 'consumo_legado_tickets')::int, 0),
    COALESCE((p_comparacao ->> 'consumo_novo_tickets')::int, 0),
    NOW(), NULL, NULL)
  ON CONFLICT (empresa_id) DO UPDATE
     SET situacao = EXCLUDED.situacao,
         meses_comparados = EXCLUDED.meses_comparados,
         consumo_legado_minutos = EXCLUDED.consumo_legado_minutos,
         consumo_novo_minutos = EXCLUDED.consumo_novo_minutos,
         consumo_legado_tickets = EXCLUDED.consumo_legado_tickets,
         consumo_novo_tickets = EXCLUDED.consumo_novo_tickets,
         calculado_em = EXCLUDED.calculado_em,
         erro = NULL,
         erro_em = NULL;

  DELETE FROM bancos_horas_comparacao_meses WHERE empresa_id = v_empresa;
  INSERT INTO bancos_horas_comparacao_meses
    (empresa_id, ano, mes, situacao, legado, novo, origem_saldo, itens, itens_total, fechamento_legado_em)
  SELECT v_empresa,
         (m ->> 'ano')::smallint,
         (m ->> 'mes')::smallint,
         m ->> 'situacao',
         m -> 'legado',
         m -> 'novo',
         NULLIF(m -> 'origem_saldo', 'null'::jsonb),
         COALESCE(m -> 'itens', '[]'::jsonb),
         COALESCE((m ->> 'itens_total')::int, 0),
         (m ->> 'fechamento_legado_em')::timestamptz
    FROM jsonb_array_elements(v_meses) m;

  PERFORM set_config('app.origem', '', true);
END;
$$;

-- Falha da rotina para a empresa: guarda a mensagem sem apagar o último resultado
CREATE OR REPLACE FUNCTION public.bancos_horas_erro_comparacao(p_empresa_id UUID, p_erro TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claims JSONB := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
BEGIN
  IF NOT (v_claims IS NULL OR v_claims ->> 'role' = 'service_role') THEN
    RAISE EXCEPTION 'Só a rotina do modo sombra grava a comparação.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  INSERT INTO bancos_horas_comparacao (empresa_id, erro, erro_em)
  VALUES (p_empresa_id, left(COALESCE(p_erro, 'Erro desconhecido'), 500), NOW())
  ON CONFLICT (empresa_id) DO UPDATE SET erro = EXCLUDED.erro, erro_em = EXCLUDED.erro_em;
END;
$$;

-- ---------------------------------------------------------------------
-- 4. Validação pela tela (3.5)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validar_comparacao(p_empresa_id UUID, p_validar BOOLEAN, p_motivo TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_motivo TEXT := trim(COALESCE(p_motivo, ''));
  v_atual bancos_horas_comparacao%ROWTYPE;
BEGIN
  IF NOT has_screen_permission('bancos_horas_comparacao'::text, 'edit'::text) THEN
    RAISE EXCEPTION 'Sem permissão para validar a comparação.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_atual FROM bancos_horas_comparacao WHERE empresa_id = p_empresa_id FOR UPDATE;
  IF NOT FOUND OR v_atual.situacao IS NULL THEN
    RAISE EXCEPTION 'Empresa sem comparação para validar.';
  END IF;

  IF p_validar THEN
    IF v_atual.situacao = 'divergente' THEN
      RAISE EXCEPTION 'Empresa com divergência não pode ser validada.';
    END IF;
    IF v_atual.validada_em IS NOT NULL THEN
      RAISE EXCEPTION 'A empresa já está validada.';
    END IF;
    -- Motivo opcional ao validar; vazio vira nulo na auditoria
    PERFORM set_config('app.motivo', v_motivo, true);
    UPDATE bancos_horas_comparacao
       SET validada_por = (SELECT auth.uid()), validada_em = NOW(), validacao_situacao = v_atual.situacao
     WHERE empresa_id = p_empresa_id;
  ELSE
    IF v_motivo = '' THEN
      RAISE EXCEPTION 'Informe o motivo.';
    END IF;
    IF v_atual.validada_em IS NULL THEN
      RAISE EXCEPTION 'A empresa não está validada.';
    END IF;
    PERFORM set_config('app.motivo', v_motivo, true);
    UPDATE bancos_horas_comparacao
       SET validada_por = NULL, validada_em = NULL, validacao_situacao = NULL
     WHERE empresa_id = p_empresa_id;
  END IF;
  PERFORM set_config('app.motivo', '', true);
END;
$$;

REVOKE ALL ON FUNCTION public.bancos_horas_gravar_comparacao(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bancos_horas_erro_comparacao(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bancos_horas_gravar_comparacao(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.bancos_horas_erro_comparacao(UUID, TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.validar_comparacao(UUID, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validar_comparacao(UUID, BOOLEAN, TEXT) TO authenticated, service_role;
