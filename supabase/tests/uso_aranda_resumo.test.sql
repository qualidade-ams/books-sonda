-- =====================================================================
-- Teste da migration 20261028000005_uso_aranda_resumo
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", com o tempo das duas funções. Qualquer
-- outra mensagem de erro diz qual verificação falhou.
-- =====================================================================
DO $teste$
DECLARE
  v_n int;
  v_job record;
  v_inicio timestamptz;
  v_ms_uso int;
  v_ms_nao int;
  v_desde6 date := ((now() - interval '6 months') AT TIME ZONE 'America/Sao_Paulo')::date;
  v_desde12 date := ((now() - interval '12 months') AT TIME ZONE 'America/Sao_Paulo')::date;
  v_grupos text[] := (SELECT grupos_que_contam FROM regras_contagem WHERE id = 1);
BEGIN
  -- -------------------------------------------------------------------
  -- 1. Estrutura e segurança
  -- -------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'aranda_uso_diario' AND rowsecurity) THEN
    RAISE EXCEPTION 'aranda_uso_diario precisa existir com RLS habilitado';
  END IF;
  IF has_table_privilege('authenticated', 'public.aranda_uso_diario', 'select')
     OR has_table_privilege('anon', 'public.aranda_uso_diario', 'select') THEN
    RAISE EXCEPTION 'aranda_uso_diario não pode ser lida direto pela API';
  END IF;
  SELECT count(*) INTO v_n FROM pg_proc
   WHERE proname IN ('atualizar_uso_aranda', 'grupos_aranda_uso', 'grupos_aranda_nao_mapeados')
     AND pronamespace = 'public'::regnamespace
     AND prosecdef AND proconfig @> ARRAY['search_path=public'];
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'As funções precisam de SECURITY DEFINER e search_path fixo';
  END IF;
  IF has_function_privilege('authenticated', 'public.atualizar_uso_aranda()', 'execute')
     OR has_function_privilege('anon', 'public.atualizar_uso_aranda()', 'execute') THEN
    RAISE EXCEPTION 'atualizar_uso_aranda executável pela API';
  END IF;

  SELECT * INTO v_job FROM cron.job WHERE jobname = 'resumo-uso-aranda';
  IF NOT FOUND OR v_job.schedule <> '10 * * * *' OR NOT v_job.active
     OR v_job.command NOT LIKE '%public.atualizar_uso_aranda()%' THEN
    RAISE EXCEPTION 'Rotina horária resumo-uso-aranda ausente ou diferente';
  END IF;

  -- -------------------------------------------------------------------
  -- 2. O resumo refeito agora dá o mesmo resultado da conta direta
  --    (corte do período pelo dia no horário de Brasília)
  -- -------------------------------------------------------------------
  PERFORM atualizar_uso_aranda();

  CREATE TEMP TABLE esperado_uso ON COMMIT DROP AS
  WITH usos AS (
    SELECT lower(trim(a.caso_grupo)) AS grupo, 1 AS apontamento, 0 AS ticket, a.org_us_final AS org
      FROM apontamentos_aranda a
     WHERE (a.data_atividade AT TIME ZONE 'America/Sao_Paulo')::date >= v_desde6 AND a.caso_grupo IS NOT NULL
    UNION ALL
    SELECT lower(trim(t.nome_grupo::text)), 0, 1, t.organizacao::text
      FROM apontamentos_tickets_aranda t
     WHERE (t.data_fechamento AT TIME ZONE 'America/Sao_Paulo')::date >= v_desde6 AND t.nome_grupo IS NOT NULL
  ),
  multiplos AS (
    SELECT b.empresa_id FROM bancos_horas b WHERE b.ativo GROUP BY b.empresa_id HAVING count(*) > 1
  )
  SELECT ga.id AS grupo_aranda_id,
         sum(u.apontamento)::integer AS apontamentos,
         sum(u.ticket)::integer AS tickets,
         coalesce(array_agg(DISTINCT e.nome_abreviado ORDER BY e.nome_abreviado)
                    FILTER (WHERE m.empresa_id IS NOT NULL), '{}') AS empresas_multiplos
    FROM usos u
    JOIN grupos_aranda ga ON ga.ativo AND lower(trim(ga.grupo_aranda)) = u.grupo
    LEFT JOIN empresas_organizacoes_aranda o ON o.ativo AND lower(trim(o.nome_organizacao)) = lower(trim(u.org))
    LEFT JOIN empresas e ON e.id = o.empresa_id
    LEFT JOIN multiplos m ON m.empresa_id = e.id
   GROUP BY ga.id;

  v_inicio := clock_timestamp();
  CREATE TEMP TABLE obtido_uso ON COMMIT DROP AS SELECT * FROM grupos_aranda_uso(6);
  v_ms_uso := extract(milliseconds FROM clock_timestamp() - v_inicio)::int;

  SELECT count(*) INTO v_n FROM (
    (SELECT * FROM esperado_uso EXCEPT SELECT * FROM obtido_uso)
    UNION ALL
    (SELECT * FROM obtido_uso EXCEPT SELECT * FROM esperado_uso)
  ) d;
  IF v_n > 0 THEN
    RAISE EXCEPTION 'grupos_aranda_uso pelo resumo difere da conta direta em % linha(s)', v_n;
  END IF;

  CREATE TEMP TABLE esperado_nao ON COMMIT DROP AS
  WITH usos AS (
    SELECT trim(a.caso_grupo) AS grupo, 1 AS apontamento, 0 AS ticket, a.data_atividade AS quando, a.org_us_final AS org
      FROM apontamentos_aranda a
     WHERE (a.data_atividade AT TIME ZONE 'America/Sao_Paulo')::date >= v_desde12 AND a.caso_grupo IS NOT NULL
    UNION ALL
    SELECT trim(t.nome_grupo::text), 0, 1, t.data_fechamento, t.organizacao::text
      FROM apontamentos_tickets_aranda t
     WHERE (t.data_fechamento AT TIME ZONE 'America/Sao_Paulo')::date >= v_desde12 AND t.nome_grupo IS NOT NULL
  ),
  sem_mapa AS (
    SELECT u.*
      FROM usos u
     WHERE EXISTS (SELECT 1 FROM unnest(v_grupos) g WHERE strpos(lower(u.grupo), lower(g)) > 0)
       AND NOT EXISTS (SELECT 1 FROM grupos_aranda ga
                        WHERE ga.ativo AND lower(trim(ga.grupo_aranda)) = lower(u.grupo))
  )
  SELECT min(s.grupo) AS grupo_aranda,
         sum(s.apontamento)::integer AS apontamentos,
         sum(s.ticket)::integer AS tickets,
         array_agg(DISTINCT coalesce(e.nome_abreviado, trim(s.org)) ORDER BY coalesce(e.nome_abreviado, trim(s.org)))
           FILTER (WHERE coalesce(e.nome_abreviado, trim(s.org)) IS NOT NULL) AS empresas,
         (min(s.quando) AT TIME ZONE 'America/Sao_Paulo')::date AS primeira_ocorrencia
    FROM sem_mapa s
    LEFT JOIN empresas_organizacoes_aranda o ON o.ativo AND lower(trim(o.nome_organizacao)) = lower(trim(s.org))
    LEFT JOIN empresas e ON e.id = o.empresa_id
   GROUP BY lower(s.grupo);

  v_inicio := clock_timestamp();
  CREATE TEMP TABLE obtido_nao ON COMMIT DROP AS SELECT * FROM grupos_aranda_nao_mapeados(12);
  v_ms_nao := extract(milliseconds FROM clock_timestamp() - v_inicio)::int;

  SELECT count(*) INTO v_n FROM (
    (SELECT * FROM esperado_nao EXCEPT SELECT * FROM obtido_nao)
    UNION ALL
    (SELECT * FROM obtido_nao EXCEPT SELECT * FROM esperado_nao)
  ) d;
  IF v_n > 0 THEN
    RAISE EXCEPTION 'grupos_aranda_nao_mapeados pelo resumo difere da conta direta em % linha(s)', v_n;
  END IF;

  -- -------------------------------------------------------------------
  -- 3. Permissão das funções da tela continua a mesma
  -- -------------------------------------------------------------------
  IF has_function_privilege('anon', 'public.grupos_aranda_uso(integer)', 'execute')
     OR NOT has_function_privilege('authenticated', 'public.grupos_aranda_uso(integer)', 'execute') THEN
    RAISE EXCEPTION 'grupos_aranda_uso: executável por authenticated e não por anon';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido (uso: % ms; não mapeados: % ms)', v_ms_uso, v_ms_nao;
END
$teste$;
