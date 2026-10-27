-- =====================================================================
-- Fase 3 — migration 14: de-para de grupos
-- (docs/especificacoes/Modelagem_Fase3.md, seções 6 e 10)
--
--   grupos_aranda             o grupo do Aranda não muda depois de criado
--   de_para_categoria         recebe a cópia de grupos_aranda (mesmo id; grupo, grupo
--                             do Book e status). Hoje não há tela de De-para: a tabela
--                             é mantida direto no banco (P5). A cópia vai só da nova
--                             para a atual; edição direta na atual precisa parar.
--   grupos_aranda_nao_mapeados()  grupos que contam (regras de contagem), com horas
--                             ou tickets no período e sem linha ativa no de-para
--   aviso no sino             "Grupo do Aranda sem mapeamento" para quem edita o
--                             De-para, com resolução automática quando não sobra grupo
--                             sem mapeamento. A rotina diária que abre o aviso é
--                             agendada na ativação das telas, não aqui.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. O grupo do Aranda não muda depois de criado (seção 6)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validar_grupo_aranda()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.grupo_aranda IS DISTINCT FROM OLD.grupo_aranda THEN
    RAISE EXCEPTION 'O grupo do Aranda não muda depois de criado: inative este e crie outro.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grupos_aranda_validar ON grupos_aranda;
CREATE TRIGGER trg_grupos_aranda_validar BEFORE UPDATE OF grupo_aranda ON grupos_aranda
  FOR EACH ROW EXECUTE FUNCTION validar_grupo_aranda();

-- ---------------------------------------------------------------------
-- 2. Cópia para de_para_categoria (seção 10, spec 7.3)
-- ---------------------------------------------------------------------

-- A linha de mesmo id recebe grupo, grupo do Book e status. As outras linhas do
-- mesmo grupo (repetidas na tabela atual; a carga da Fase 1 ficou com a mais antiga)
-- recebem o grupo do Book e o status, para a tabela atual não ficar com duas respostas.
CREATE OR REPLACE FUNCTION public.sinc_de_para_categoria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT := CASE WHEN NEW.ativo THEN 'ativa' ELSE 'inativa' END;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.grupo_book IS NOT DISTINCT FROM OLD.grupo_book
     AND NEW.ativo IS NOT DISTINCT FROM OLD.ativo THEN
    RETURN NULL;
  END IF;

  UPDATE de_para_categoria d
     SET grupo = CASE WHEN d.id = NEW.id THEN NEW.grupo_aranda ELSE d.grupo END,
         grupo_book = NEW.grupo_book,
         status = v_status
   WHERE (d.id = NEW.id OR lower(trim(d.grupo)) = lower(trim(NEW.grupo_aranda)))
     AND (d.grupo, d.grupo_book, d.status) IS DISTINCT FROM
         (CASE WHEN d.id = NEW.id THEN NEW.grupo_aranda ELSE d.grupo END, NEW.grupo_book, v_status);

  IF NOT EXISTS (SELECT 1 FROM de_para_categoria WHERE id = NEW.id) THEN
    INSERT INTO de_para_categoria (id, grupo, grupo_book, status, criado_por)
    VALUES (NEW.id, NEW.grupo_aranda, NEW.grupo_book, v_status, (SELECT auth.uid()));
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_grupos_aranda_sinc_de_para ON grupos_aranda;
CREATE TRIGGER trg_grupos_aranda_sinc_de_para AFTER INSERT OR UPDATE ON grupos_aranda
  FOR EACH ROW EXECUTE FUNCTION sinc_de_para_categoria();

-- ---------------------------------------------------------------------
-- 3. Grupos não mapeados (aba "Não mapeados")
-- ---------------------------------------------------------------------

-- Grupos que contam pelas regras de contagem, com apontamentos ou tickets nos
-- últimos p_meses e sem linha ativa em grupos_aranda (comparação sem diferença de
-- maiúsculas). As empresas vêm pelas organizações do Aranda; organização sem
-- empresa aparece pelo próprio nome. A primeira ocorrência é no período.
CREATE OR REPLACE FUNCTION public.grupos_aranda_nao_mapeados(p_meses INTEGER DEFAULT 12)
RETURNS TABLE (grupo_aranda TEXT, apontamentos INTEGER, tickets INTEGER, empresas TEXT[], primeira_ocorrencia DATE)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_claims JSONB := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  v_desde TIMESTAMPTZ := now() - make_interval(months => coalesce(p_meses, 12));
  v_grupos TEXT[];
BEGIN
  -- Sem usuário na sessão (rotina diária, SQL Editor) libera; senão, quem vê o De-para
  IF v_claims IS NOT NULL AND v_claims ->> 'role' IS DISTINCT FROM 'service_role'
     AND NOT has_screen_permission('de_para_grupos'::text, 'view'::text) THEN
    RAISE EXCEPTION 'Sem permissão para consultar o de-para de grupos.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT r.grupos_que_contam INTO v_grupos FROM regras_contagem r WHERE r.id = 1;

  RETURN QUERY
  WITH usos AS (
    SELECT trim(a.caso_grupo) AS grupo, 1 AS apontamento, 0 AS ticket, a.data_atividade AS quando, a.org_us_final AS org
      FROM apontamentos_aranda a
     WHERE a.data_atividade >= v_desde AND a.caso_grupo IS NOT NULL
    UNION ALL
    SELECT trim(t.nome_grupo::text), 0, 1, t.data_fechamento, t.organizacao::text
      FROM apontamentos_tickets_aranda t
     WHERE t.data_fechamento >= v_desde AND t.nome_grupo IS NOT NULL
  ),
  sem_mapa AS (
    SELECT u.*
      FROM usos u
     WHERE EXISTS (SELECT 1 FROM unnest(v_grupos) g WHERE strpos(lower(u.grupo), lower(g)) > 0)
       AND NOT EXISTS (SELECT 1 FROM grupos_aranda ga
                        WHERE ga.ativo AND lower(trim(ga.grupo_aranda)) = lower(u.grupo))
  )
  SELECT min(s.grupo),
         sum(s.apontamento)::integer,
         sum(s.ticket)::integer,
         array_agg(DISTINCT coalesce(e.nome_abreviado, trim(s.org)) ORDER BY coalesce(e.nome_abreviado, trim(s.org)))
           FILTER (WHERE coalesce(e.nome_abreviado, trim(s.org)) IS NOT NULL),
         (min(s.quando) AT TIME ZONE 'America/Sao_Paulo')::date
    FROM sem_mapa s
    LEFT JOIN empresas_organizacoes_aranda o ON o.ativo AND lower(trim(o.nome_organizacao)) = lower(trim(s.org))
    LEFT JOIN empresas e ON e.id = o.empresa_id
   GROUP BY lower(s.grupo)
   ORDER BY sum(s.apontamento) + sum(s.ticket) DESC, min(s.grupo);
END;
$$;

-- ---------------------------------------------------------------------
-- 4. Aviso no sino (decisão complementar de 14/10/2026)
-- ---------------------------------------------------------------------

ALTER TABLE notificacoes DROP CONSTRAINT IF EXISTS notificacoes_tipo_check;
ALTER TABLE notificacoes ADD CONSTRAINT notificacoes_tipo_check CHECK (tipo IN (
  'book_precisa_retificacao',
  'ajuste_retroativo_pendente',
  'saldo_parcial_falha',
  'geracao_books_falha',
  'sincronizacao_legado_falha',
  'grupo_aranda_nao_mapeado'
));

-- Um aviso só (chave fixa), com a quantidade; sem grupo pendente, resolve
CREATE OR REPLACE FUNCTION public.notificar_grupos_nao_mapeados()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quantidade INTEGER;
BEGIN
  SELECT count(*) INTO v_quantidade FROM grupos_aranda_nao_mapeados();
  IF v_quantidade > 0 THEN
    PERFORM notificacoes_abrir(
      'grupo_aranda_nao_mapeado',
      'de_para_grupos',
      'Grupo do Aranda sem mapeamento',
      format('%s grupo(s) do Aranda com horas ou tickets nos últimos 12 meses não estão no De-para. Até serem mapeados, as horas deles vão para o Banco padrão.', v_quantidade),
      '/admin/de-para-grupos',
      NULL,
      'de_para_nao_mapeados',
      jsonb_build_object('quantidade', v_quantidade)
    );
  ELSE
    PERFORM notificacoes_resolver('de_para_nao_mapeados', 'Todos os grupos do Aranda estão mapeados');
  END IF;
END;
$$;

-- Ao mapear, reavalia o aviso aberto (atualiza a quantidade ou resolve). Sem aviso
-- aberto, não faz nada: a rotina diária abre quando aparecer grupo novo.
CREATE OR REPLACE FUNCTION public.resolver_grupos_nao_mapeados()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM notificacoes WHERE chave = 'de_para_nao_mapeados' AND resolvida_em IS NULL) THEN
    PERFORM notificar_grupos_nao_mapeados();
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_grupos_aranda_resolver_aviso ON grupos_aranda;
CREATE TRIGGER trg_grupos_aranda_resolver_aviso AFTER INSERT OR UPDATE ON grupos_aranda
  FOR EACH STATEMENT EXECUTE FUNCTION resolver_grupos_nao_mapeados();

-- A rotina diária (pg_cron, 8h de Brasília) NÃO é agendada aqui: ela entra na
-- migration de ativação, aplicada junto com a publicação das telas. Antes disso o
-- aviso apontaria para /admin/de-para-grupos, que ainda não está no ar.

REVOKE ALL ON FUNCTION public.validar_grupo_aranda() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sinc_de_para_categoria() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notificar_grupos_nao_mapeados() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolver_grupos_nao_mapeados() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grupos_aranda_nao_mapeados(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grupos_aranda_nao_mapeados(INTEGER) TO authenticated, service_role;
