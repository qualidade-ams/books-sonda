-- =====================================================================
-- Resumo diário do uso dos grupos do Aranda (desempenho do De-para)
--
-- grupos_aranda_uso (coluna Uso, 6 meses) e grupos_aranda_nao_mapeados (12 meses)
-- somavam a cada abertura de Produtos e Módulos e do De-para todos os apontamentos
-- e tickets do período: ~0,5 a 0,6 s cada. O aviso do sino e o gatilho de
-- grupos_aranda também usam a segunda.
--
--   aranda_uso_diario        apontamentos e tickets por dia, grupo e organização
--   atualizar_uso_aranda()   refaz os últimos 13 meses (pg_cron, de hora em hora)
--   as duas funções          somam o resumo; o cruzamento com o De-para e com as
--                            organizações continua na hora (mapear aparece na hora)
--
-- Diferenças: as contagens podem atrasar até 1 hora, e o corte do período passa a
-- ser pelo dia no horário de Brasília, não pelo instante exato.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Resumo
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS aranda_uso_diario (
  -- Dia no horário de Brasília
  dia DATE NOT NULL,
  fonte TEXT NOT NULL CHECK (fonte IN ('apontamento', 'ticket')),
  -- caso_grupo / nome_grupo sem espaços nas pontas, como vem do Aranda
  grupo TEXT NOT NULL,
  -- org_us_final / organizacao, como vem (nula e vazia são diferentes, como na conta direta)
  organizacao TEXT,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  -- Primeiro apontamento (data_atividade) ou ticket (data_fechamento) do dia
  primeiro_em TIMESTAMPTZ NOT NULL,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS aranda_uso_diario_uq
  ON aranda_uso_diario (dia, fonte, grupo, organizacao) NULLS NOT DISTINCT;

COMMENT ON TABLE aranda_uso_diario IS
  'Resumo diário de apontamentos e tickets por grupo e organização (últimos 13 meses), lido pelas funções do De-para';

-- Só as funções (SECURITY DEFINER) leem e gravam: RLS sem política nega o acesso direto
ALTER TABLE aranda_uso_diario ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE aranda_uso_diario FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.atualizar_uso_aranda()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_desde DATE := ((now() - interval '13 months') AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  DELETE FROM aranda_uso_diario;
  INSERT INTO aranda_uso_diario (dia, fonte, grupo, organizacao, quantidade, primeiro_em)
  SELECT (a.data_atividade AT TIME ZONE 'America/Sao_Paulo')::date,
         'apontamento',
         trim(a.caso_grupo),
         a.org_us_final,
         count(*),
         min(a.data_atividade)
    FROM apontamentos_aranda a
   WHERE a.data_atividade >= v_desde::timestamp AT TIME ZONE 'America/Sao_Paulo'
     AND a.caso_grupo IS NOT NULL
   GROUP BY 1, 3, 4
  UNION ALL
  SELECT (t.data_fechamento AT TIME ZONE 'America/Sao_Paulo')::date,
         'ticket',
         trim(t.nome_grupo::text),
         t.organizacao::text,
         count(*),
         min(t.data_fechamento)
    FROM apontamentos_tickets_aranda t
   WHERE t.data_fechamento >= v_desde::timestamp AT TIME ZONE 'America/Sao_Paulo'
     AND t.nome_grupo IS NOT NULL
   GROUP BY 1, 3, 4;
END;
$$;

-- ---------------------------------------------------------------------
-- 2. As funções da tela somam o resumo (mesmo contrato)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.grupos_aranda_uso(p_meses INTEGER DEFAULT 6)
RETURNS TABLE (grupo_aranda_id UUID, apontamentos INTEGER, tickets INTEGER, empresas_multiplos TEXT[])
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_claims JSONB := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  v_desde DATE := ((now() - make_interval(months => coalesce(p_meses, 6))) AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  IF v_claims IS NOT NULL AND v_claims ->> 'role' IS DISTINCT FROM 'service_role'
     AND NOT has_screen_permission('de_para_grupos'::text, 'view'::text) THEN
    RAISE EXCEPTION 'Sem permissão para consultar o de-para de grupos.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  WITH usos AS (
    SELECT lower(r.grupo) AS grupo,
           CASE WHEN r.fonte = 'apontamento' THEN r.quantidade ELSE 0 END AS apontamento,
           CASE WHEN r.fonte = 'ticket' THEN r.quantidade ELSE 0 END AS ticket,
           r.organizacao AS org
      FROM aranda_uso_diario r
     WHERE r.dia >= v_desde
  ),
  multiplos AS (
    SELECT b.empresa_id FROM bancos_horas b WHERE b.ativo GROUP BY b.empresa_id HAVING count(*) > 1
  )
  SELECT ga.id,
         sum(u.apontamento)::integer,
         sum(u.ticket)::integer,
         coalesce(array_agg(DISTINCT e.nome_abreviado ORDER BY e.nome_abreviado)
                    FILTER (WHERE m.empresa_id IS NOT NULL), '{}')
    FROM usos u
    JOIN grupos_aranda ga ON ga.ativo AND lower(trim(ga.grupo_aranda)) = u.grupo
    LEFT JOIN empresas_organizacoes_aranda o ON o.ativo AND lower(trim(o.nome_organizacao)) = lower(trim(u.org))
    LEFT JOIN empresas e ON e.id = o.empresa_id
    LEFT JOIN multiplos m ON m.empresa_id = e.id
   GROUP BY ga.id;
END;
$$;

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
  v_desde DATE := ((now() - make_interval(months => coalesce(p_meses, 12))) AT TIME ZONE 'America/Sao_Paulo')::date;
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
    SELECT r.grupo,
           CASE WHEN r.fonte = 'apontamento' THEN r.quantidade ELSE 0 END AS apontamento,
           CASE WHEN r.fonte = 'ticket' THEN r.quantidade ELSE 0 END AS ticket,
           r.primeiro_em AS quando,
           r.organizacao AS org
      FROM aranda_uso_diario r
     WHERE r.dia >= v_desde
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

REVOKE ALL ON FUNCTION public.atualizar_uso_aranda() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grupos_aranda_uso(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grupos_aranda_uso(INTEGER) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.grupos_aranda_nao_mapeados(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grupos_aranda_nao_mapeados(INTEGER) TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 3. Carga e rotina de hora em hora (minuto 10)
-- ---------------------------------------------------------------------

SELECT public.atualizar_uso_aranda();

SELECT cron.unschedule('resumo-uso-aranda')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'resumo-uso-aranda');

SELECT cron.schedule('resumo-uso-aranda', '10 * * * *', 'SELECT public.atualizar_uso_aranda();');
