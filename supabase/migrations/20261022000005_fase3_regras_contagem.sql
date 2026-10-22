-- =====================================================================
-- Fase 3 — migration 13: regras de contagem em tabela
-- (docs/especificacoes/Modelagem_Fase3.md, seção 5)
--
--   regras_contagem            nova, uma linha só: os filtros que estavam fixos em
--                              bancos_horas_consumo_itens (grupos que contam, tipos de
--                              chamado, atividade interna, itens excluídos e tickets
--                              fechados). A carga grava os valores atuais.
--   bancos_horas_consumo_itens passa a ler essa linha (mesmo resultado com a carga)
--   codigos_resolucao_banco    ganha escrita pela tela Regras de contagem; a leitura
--                              aberta (USING true) vira "usuário logado"
--   codigos_resolucao_uso()    apontamentos e tickets por código nos últimos meses,
--                              com e sem regra (abas Códigos e Códigos sem regra)
--   salvar_regras_contagem()   grava regras e códigos numa transação, com o motivo
--   auditoria_alteracoes       + motivo, preenchido pelo gatilho com app.motivo
--   tela regras_contagem       registrada, com Edição para Administradores
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Motivo na auditoria (seção 5.3)
-- ---------------------------------------------------------------------

ALTER TABLE auditoria_alteracoes ADD COLUMN IF NOT EXISTS motivo TEXT;

-- Igual à versão da Fase 1 (migration 3), mais o motivo da sessão (app.motivo),
-- que a função de salvar define antes de gravar
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
  v_motivo TEXT := NULLIF(trim(current_setting('app.motivo', true)), '');
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
    (tabela, registro_id, empresa_id, banco_id, acao, campos_alterados, dados_antes, dados_depois, usuario_id, origem, motivo)
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
    v_origem,
    v_motivo
  );
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.registrar_auditoria() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Tela Regras de contagem (as políticas abaixo dependem da chave)
-- ---------------------------------------------------------------------

INSERT INTO screens (key, name, description, category, route) VALUES
  ('regras_contagem', 'Regras de contagem', 'Códigos de resolução e filtros que definem o que conta nos bancos de horas',
   'Banco de Horas', '/admin/regras-contagem')
ON CONFLICT (key) DO NOTHING;

INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, 'regras_contagem', 'edit'
  FROM user_groups ug
 WHERE ug.name = 'Administradores'
   AND NOT EXISTS (SELECT 1 FROM screen_permissions sp WHERE sp.group_id = ug.id AND sp.screen_key = 'regras_contagem');

-- ---------------------------------------------------------------------
-- 3. regras_contagem (seção 5.1)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS regras_contagem (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  -- caso_grupo / nome_grupo contém um destes textos (sem diferenciar maiúsculas)
  grupos_que_contam TEXT[] NOT NULL CHECK (cardinality(grupos_que_contam) > 0),
  -- apontamentos_aranda.tipo_chamado
  tipos_chamado TEXT[] NOT NULL CHECK (cardinality(tipos_chamado) > 0),
  -- true: apontamento com ativi_interna diferente de 'Não' não conta
  ignorar_atividade_interna BOOLEAN NOT NULL,
  -- item_configuracao igual a um destes não conta (apontamentos e tickets)
  itens_excluidos TEXT[] NOT NULL DEFAULT '{}',
  -- true: só tickets com status 'Closed', pela data de fechamento
  so_tickets_fechados BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT
);

DROP TRIGGER IF EXISTS trg_regras_contagem_autoria ON regras_contagem;
CREATE TRIGGER trg_regras_contagem_autoria BEFORE INSERT OR UPDATE ON regras_contagem
  FOR EACH ROW EXECUTE FUNCTION definir_autoria();
DROP TRIGGER IF EXISTS trg_regras_contagem_auditoria ON regras_contagem;
CREATE TRIGGER trg_regras_contagem_auditoria AFTER INSERT OR UPDATE OR DELETE ON regras_contagem
  FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();

-- Carga com os filtros fixos da Fase 2 (migration 8): o consumo não muda
INSERT INTO regras_contagem (id, grupos_que_contam, tipos_chamado, ignorar_atividade_interna, itens_excluidos, so_tickets_fechados)
SELECT 1, ARRAY['AMS APL', 'AMS - APL', 'AMS - ATENDIMENTO', 'AMS T&M'], ARRAY['IM', 'RF', 'PM'], TRUE,
       ARRAY['000000 - PROJETOS APL'], TRUE
WHERE NOT EXISTS (SELECT 1 FROM regras_contagem);

-- Uma linha só, criada aqui: sem INSERT nem DELETE pela API
ALTER TABLE regras_contagem ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "regras_contagem_select" ON regras_contagem;
DROP POLICY IF EXISTS "regras_contagem_insert" ON regras_contagem;
DROP POLICY IF EXISTS "regras_contagem_update" ON regras_contagem;
DROP POLICY IF EXISTS "regras_contagem_delete" ON regras_contagem;
CREATE POLICY "regras_contagem_select" ON regras_contagem
  FOR SELECT TO authenticated
  USING (has_screen_permission('regras_contagem'::text, 'view'::text));
CREATE POLICY "regras_contagem_update" ON regras_contagem
  FOR UPDATE TO authenticated
  USING (has_screen_permission('regras_contagem'::text, 'edit'::text))
  WITH CHECK (has_screen_permission('regras_contagem'::text, 'edit'::text));

-- ---------------------------------------------------------------------
-- 4. codigos_resolucao_banco: escrita pela tela (seção 5.2)
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS "codigos_resolucao_banco_select" ON codigos_resolucao_banco;
DROP POLICY IF EXISTS "codigos_resolucao_banco_insert" ON codigos_resolucao_banco;
DROP POLICY IF EXISTS "codigos_resolucao_banco_update" ON codigos_resolucao_banco;
DROP POLICY IF EXISTS "codigos_resolucao_banco_delete" ON codigos_resolucao_banco;
-- Referência sem dado pessoal, lida por várias telas: qualquer usuário logado
CREATE POLICY "codigos_resolucao_banco_select" ON codigos_resolucao_banco
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "codigos_resolucao_banco_insert" ON codigos_resolucao_banco
  FOR INSERT TO authenticated
  WITH CHECK (has_screen_permission('regras_contagem'::text, 'edit'::text));
CREATE POLICY "codigos_resolucao_banco_update" ON codigos_resolucao_banco
  FOR UPDATE TO authenticated
  USING (has_screen_permission('regras_contagem'::text, 'edit'::text))
  WITH CHECK (has_screen_permission('regras_contagem'::text, 'edit'::text));
CREATE POLICY "codigos_resolucao_banco_delete" ON codigos_resolucao_banco
  FOR DELETE TO authenticated
  USING (has_screen_permission('regras_contagem'::text, 'edit'::text));

-- ---------------------------------------------------------------------
-- 5. Consumo lendo as regras (mesma assinatura e mesmo resultado da Fase 2)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bancos_horas_consumo_itens(
  p_empresa_id UUID, p_ano INTEGER, p_mes INTEGER, p_dia_inicio INTEGER DEFAULT 1, p_dia_fim INTEGER DEFAULT 0
)
RETURNS TABLE (fonte TEXT, item_id UUID, grupo TEXT, item_configuracao TEXT, minutos INTEGER, tickets INTEGER)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_inicio TIMESTAMPTZ;
  v_fim TIMESTAMPTZ;
  r regras_contagem%ROWTYPE;
BEGIN
  IF NOT pode_consultar_bancos_horas() THEN
    RAISE EXCEPTION 'Sem permissão para consultar o consumo dos bancos de horas.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO r FROM regras_contagem WHERE id = 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Regras de contagem não cadastradas.';
  END IF;

  SELECT j.inicio, j.fim INTO v_inicio, v_fim FROM bancos_horas_janela(p_ano, p_mes, p_dia_inicio, p_dia_fim) j;

  RETURN QUERY
  WITH orgs AS (
    SELECT lower(trim(o.nome_organizacao)) AS nome
      FROM empresas_organizacoes_aranda o
     WHERE o.empresa_id = p_empresa_id AND o.ativo
  )
  -- Apontamentos (RC-61 a RC-63); duração = minuto real (A3), texto só se faltar
  SELECT 'apontamento'::text,
         a.id,
         a.caso_grupo,
         a.item_configuracao,
         COALESCE(round(a.tempo_gasto_minutos)::integer,
                  CASE WHEN a.tempo_gasto_horas ~ '^\d+:\d{2}(:\d{2})?$'
                       THEN split_part(a.tempo_gasto_horas, ':', 1)::integer * 60
                            + split_part(a.tempo_gasto_horas, ':', 2)::integer
                       ELSE 0 END),
         0
    FROM apontamentos_aranda a
   WHERE lower(trim(a.org_us_final)) IN (SELECT nome FROM orgs)
     AND a.data_atividade >= v_inicio AND a.data_atividade < v_fim
     AND (NOT r.ignorar_atividade_interna OR a.ativi_interna = 'Não')
     AND a.item_configuracao <> ALL (r.itens_excluidos)
     AND a.tipo_chamado = ANY (r.tipos_chamado)
     AND EXISTS (SELECT 1 FROM unnest(r.grupos_que_contam) g WHERE strpos(lower(a.caso_grupo), lower(g)) > 0)
     AND a.cod_resolucao IN (SELECT c.codigo FROM codigos_resolucao_banco c WHERE c.conta_horas)
  UNION ALL
  -- Tickets (RC-52, RC-64) pela data de fechamento; nro_solicitacao é único na tabela
  SELECT 'ticket'::text,
         t.id,
         t.nome_grupo::text,
         t.item_configuracao::text,
         0,
         1
    FROM apontamentos_tickets_aranda t
   WHERE lower(trim(t.organizacao)) IN (SELECT nome FROM orgs)
     AND (NOT r.so_tickets_fechados OR t.status = 'Closed')
     AND t.data_fechamento >= v_inicio AND t.data_fechamento < v_fim
     AND t.item_configuracao::text <> ALL (r.itens_excluidos)
     AND EXISTS (SELECT 1 FROM unnest(r.grupos_que_contam) g WHERE strpos(lower(t.nome_grupo::text), lower(g)) > 0)
     AND t.cod_resolucao IN (SELECT c.codigo FROM codigos_resolucao_banco c WHERE c.conta_tickets);
END;
$$;

-- ---------------------------------------------------------------------
-- 6. Uso dos códigos (abas Códigos e Códigos sem regra)
-- ---------------------------------------------------------------------

-- Quem pode ver a tela; sem usuário na sessão (SQL Editor, rotinas), libera
CREATE OR REPLACE FUNCTION public.pode_ver_regras_contagem(p_nivel TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claims JSONB := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
BEGIN
  IF v_claims IS NULL OR v_claims ->> 'role' = 'service_role' THEN
    RETURN TRUE;
  END IF;
  RETURN has_screen_permission('regras_contagem'::text, p_nivel);
END;
$$;

-- Apontamentos e tickets dos últimos p_meses por código de resolução, contando só
-- o que passa nos demais filtros das regras (o código é o que se está avaliando).
-- Inclui os códigos cadastrados sem uso no período. A primeira ocorrência é no período.
CREATE OR REPLACE FUNCTION public.codigos_resolucao_uso(p_meses INTEGER DEFAULT 6)
RETURNS TABLE (
  codigo TEXT, apontamentos INTEGER, tickets INTEGER, primeira_ocorrencia DATE,
  tem_regra BOOLEAN, conta_horas BOOLEAN, conta_tickets BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_desde TIMESTAMPTZ;
  r regras_contagem%ROWTYPE;
BEGIN
  IF NOT pode_ver_regras_contagem('view') THEN
    RAISE EXCEPTION 'Sem permissão para consultar as regras de contagem.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_meses IS NULL OR p_meses < 1 THEN
    RAISE EXCEPTION 'Informe o número de meses (1 ou mais).';
  END IF;

  SELECT * INTO r FROM regras_contagem WHERE id = 1;
  v_desde := (date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') - make_interval(months => p_meses - 1))
             AT TIME ZONE 'America/Sao_Paulo';

  RETURN QUERY
  WITH usos AS (
    SELECT a.cod_resolucao AS codigo, 1 AS apontamento, 0 AS ticket, a.data_atividade AS quando
      FROM apontamentos_aranda a
     WHERE a.data_atividade >= v_desde
       AND a.cod_resolucao IS NOT NULL
       AND (NOT r.ignorar_atividade_interna OR a.ativi_interna = 'Não')
       AND a.item_configuracao <> ALL (r.itens_excluidos)
       AND a.tipo_chamado = ANY (r.tipos_chamado)
       AND EXISTS (SELECT 1 FROM unnest(r.grupos_que_contam) g WHERE strpos(lower(a.caso_grupo), lower(g)) > 0)
    UNION ALL
    SELECT t.cod_resolucao::text, 0, 1, t.data_fechamento
      FROM apontamentos_tickets_aranda t
     WHERE t.data_fechamento >= v_desde
       AND t.cod_resolucao IS NOT NULL
       AND (NOT r.so_tickets_fechados OR t.status = 'Closed')
       AND t.item_configuracao::text <> ALL (r.itens_excluidos)
       AND EXISTS (SELECT 1 FROM unnest(r.grupos_que_contam) g WHERE strpos(lower(t.nome_grupo::text), lower(g)) > 0)
  ),
  por_codigo AS (
    SELECT u.codigo, sum(u.apontamento)::integer AS apontamentos, sum(u.ticket)::integer AS tickets,
           (min(u.quando) AT TIME ZONE 'America/Sao_Paulo')::date AS primeira
      FROM usos u
     GROUP BY u.codigo
  )
  SELECT coalesce(p.codigo, c.codigo),
         coalesce(p.apontamentos, 0),
         coalesce(p.tickets, 0),
         p.primeira,
         c.codigo IS NOT NULL,
         c.conta_horas,
         c.conta_tickets
    FROM por_codigo p
    FULL JOIN codigos_resolucao_banco c ON c.codigo = p.codigo
   ORDER BY (c.codigo IS NOT NULL), coalesce(p.apontamentos, 0) + coalesce(p.tickets, 0) DESC, coalesce(p.codigo, c.codigo);
END;
$$;

-- ---------------------------------------------------------------------
-- 7. Salvar com motivo (seção 5.3)
-- ---------------------------------------------------------------------

-- p_regras: campos de regras_contagem a mudar (os ausentes ficam como estão).
-- p_codigos: lista completa de códigos [{codigo, conta_horas, conta_tickets}];
--   o que não estiver nela sai. Nulo = códigos não mudam.
-- Tudo numa transação, com o motivo na auditoria de cada linha alterada.
CREATE OR REPLACE FUNCTION public.salvar_regras_contagem(p_motivo TEXT, p_regras JSONB DEFAULT NULL, p_codigos JSONB DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_motivo TEXT := trim(coalesce(p_motivo, ''));
BEGIN
  IF NOT pode_ver_regras_contagem('edit') THEN
    RAISE EXCEPTION 'Sem permissão para alterar as regras de contagem.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_motivo = '' THEN
    RAISE EXCEPTION 'Informe o motivo da alteração.';
  END IF;
  IF length(v_motivo) > 500 THEN
    RAISE EXCEPTION 'O motivo passa de 500 caracteres.';
  END IF;
  IF p_regras IS NULL AND p_codigos IS NULL THEN
    RAISE EXCEPTION 'Nada para salvar.';
  END IF;

  PERFORM set_config('app.motivo', v_motivo, true);

  IF p_regras IS NOT NULL THEN
    UPDATE regras_contagem
       SET grupos_que_contam = CASE WHEN p_regras ? 'grupos_que_contam'
                                    THEN ARRAY(SELECT jsonb_array_elements_text(p_regras -> 'grupos_que_contam'))
                                    ELSE grupos_que_contam END,
           tipos_chamado = CASE WHEN p_regras ? 'tipos_chamado'
                                THEN ARRAY(SELECT jsonb_array_elements_text(p_regras -> 'tipos_chamado'))
                                ELSE tipos_chamado END,
           ignorar_atividade_interna = coalesce((p_regras ->> 'ignorar_atividade_interna')::boolean, ignorar_atividade_interna),
           itens_excluidos = CASE WHEN p_regras ? 'itens_excluidos'
                                  THEN ARRAY(SELECT jsonb_array_elements_text(p_regras -> 'itens_excluidos'))
                                  ELSE itens_excluidos END,
           so_tickets_fechados = coalesce((p_regras ->> 'so_tickets_fechados')::boolean, so_tickets_fechados)
     WHERE id = 1;
  END IF;

  IF p_codigos IS NOT NULL THEN
    DELETE FROM codigos_resolucao_banco c
     WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_codigos) e WHERE e ->> 'codigo' = c.codigo);

    INSERT INTO codigos_resolucao_banco (codigo, conta_horas, conta_tickets)
    SELECT e ->> 'codigo', (e ->> 'conta_horas')::boolean, (e ->> 'conta_tickets')::boolean
      FROM jsonb_array_elements(p_codigos) e
    ON CONFLICT (codigo) DO UPDATE
      SET conta_horas = EXCLUDED.conta_horas, conta_tickets = EXCLUDED.conta_tickets
      WHERE (codigos_resolucao_banco.conta_horas, codigos_resolucao_banco.conta_tickets)
            IS DISTINCT FROM (EXCLUDED.conta_horas, EXCLUDED.conta_tickets);
  END IF;

  -- O motivo vale só para esta gravação
  PERFORM set_config('app.motivo', '', true);
END;
$$;

REVOKE ALL ON FUNCTION public.pode_ver_regras_contagem(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.codigos_resolucao_uso(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.salvar_regras_contagem(TEXT, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.codigos_resolucao_uso(INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.salvar_regras_contagem(TEXT, JSONB, JSONB) TO authenticated, service_role;
