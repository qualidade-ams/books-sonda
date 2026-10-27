-- =====================================================================
-- Teste da migration 20261027000002_fase3_ativacao (Fase 3, migration 23).
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou
-- (inclusive o aviso que a rotina abrir ou resolver). Qualquer outra mensagem de
-- erro diz qual verificação falhou.
-- =====================================================================
DO $teste$
DECLARE
  v_job record;
  v_jobs int;
BEGIN
  -- 1. Um único job com o nome, ativo, às 11h UTC (8h de Brasília) todos os dias
  SELECT count(*) INTO v_jobs FROM cron.job WHERE jobname = 'de-para-grupos-nao-mapeados';
  IF v_jobs <> 1 THEN
    RAISE EXCEPTION 'esperado 1 job de-para-grupos-nao-mapeados, há %', v_jobs;
  END IF;

  SELECT * INTO v_job FROM cron.job WHERE jobname = 'de-para-grupos-nao-mapeados';
  IF v_job.schedule <> '0 11 * * *' THEN
    RAISE EXCEPTION 'agendamento errado: % (esperado 0 11 * * *)', v_job.schedule;
  END IF;
  IF NOT v_job.active THEN
    RAISE EXCEPTION 'o job está desativado';
  END IF;
  IF v_job.command NOT LIKE '%public.notificar_grupos_nao_mapeados()%' THEN
    RAISE EXCEPTION 'o job não chama notificar_grupos_nao_mapeados: %', v_job.command;
  END IF;

  -- 2. A função chamada continua SECURITY DEFINER com search_path fixo e fechada ao app
  IF NOT EXISTS (SELECT 1 FROM pg_proc
                  WHERE proname = 'notificar_grupos_nao_mapeados'
                    AND pronamespace = 'public'::regnamespace
                    AND prosecdef
                    AND 'search_path=public' = ANY (coalesce(proconfig, '{}'))) THEN
    RAISE EXCEPTION 'notificar_grupos_nao_mapeados não existe, sem SECURITY DEFINER ou sem search_path fixo';
  END IF;
  IF has_function_privilege('authenticated', 'public.notificar_grupos_nao_mapeados()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.notificar_grupos_nao_mapeados()', 'EXECUTE') THEN
    RAISE EXCEPTION 'notificar_grupos_nao_mapeados está executável por anon ou authenticated';
  END IF;

  -- 3. O comando do job roda sem erro (o que ele gravar é desfeito no fim)
  EXECUTE v_job.command;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
