-- =====================================================================
-- Teste da migration 20261125000004_ic_inativos_comex_gallery.
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou.
-- Qualquer outra mensagem de erro diz qual verificação falhou.
--
-- Regra: ic_inativo (Monitoramento de Chamados) é o chamado não encerrado em
-- qualquer uma das três filas de ICs inativos, com qualquer IC:
--   AMS APL - FISCAL - ICS INATIVOS
--   AMS APL - COMEX - ICS INATIVOS
--   AMS APL – GALLERY - ICS INATIVOS   (com travessão, como está no Aranda)
-- A descrição traz a fila do chamado. IC 999999 fora dessas filas não entra.
-- =====================================================================
DO $teste$
DECLARE
  v_resultado jsonb;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc
              WHERE proname = 'detectar_inconsistencias'
                AND pronamespace = 'public'::regnamespace
                AND (NOT prosecdef OR NOT ('search_path=public' = ANY (coalesce(proconfig, '{}'))))) THEN
    RAISE EXCEPTION 'detectar_inconsistencias sem SECURITY DEFINER ou sem search_path fixo';
  END IF;

  INSERT INTO apontamentos_tickets_aranda
    (nro_solicitacao, cod_tipo, caso_pai, nome_grupo, status, item_configuracao, organizacao, data_abertura)
  VALUES
    ('TESTE-ICC-FISCAL',   'Solicitação', 'NAO', 'AMS APL - FISCAL - ICS INATIVOS',  'Hold',   '123456 - OK',       'ORG TESTE', NOW() - INTERVAL '2 days'),
    ('TESTE-ICC-COMEX',    'Incidente',   'SIM', 'AMS APL - COMEX - ICS INATIVOS',   'Open',   '123456 - OK',       'ORG TESTE', NOW() - INTERVAL '2 days'),
    ('TESTE-ICC-GALLERY',  'Solicitação', 'SIM', 'AMS APL – GALLERY - ICS INATIVOS', 'Open',   '123456 - OK',       'ORG TESTE', NOW() - INTERVAL '2 days'),
    ('TESTE-ICC-COMEX-OK', 'Incidente',   'SIM', 'AMS APL - COMEX',                  'Open',   '999999 - IC TESTE', 'ORG TESTE', NOW() - INTERVAL '2 days'),
    ('TESTE-ICC-COMEX-FC', 'Incidente',   'SIM', 'AMS APL - COMEX - ICS INATIVOS',   'Closed', '123456 - OK',       'ORG TESTE', NOW() - INTERVAL '2 days'),
    ('TESTE-ICC-GAL-CANC', 'Incidente',   'SIM', 'AMS APL – GALLERY - ICS INATIVOS', 'Cancelled', '123456 - OK',    'ORG TESTE', NOW() - INTERVAL '2 days');

  v_resultado := public.detectar_inconsistencias();

  -- 1. As três filas entram
  IF (SELECT count(*) FROM jsonb_array_elements(v_resultado->'ic_inativo') e
       WHERE e->>'nro_chamado' IN ('RF TESTE-ICC-FISCAL', 'IM TESTE-ICC-COMEX', 'RF TESTE-ICC-GALLERY')) <> 3 THEN
    RAISE EXCEPTION 'Nem todas as filas ICS INATIVOS (FISCAL, COMEX, GALLERY) viraram ic_inativo';
  END IF;

  -- 2. A descrição traz a fila do chamado
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_resultado->'ic_inativo') e
                  WHERE e->>'nro_chamado' = 'RF TESTE-ICC-FISCAL'
                    AND e->>'descricao_inconsistencia' = 'Chamado na fila AMS APL - FISCAL - ICS INATIVOS') THEN
    RAISE EXCEPTION 'Descrição do ic_inativo FISCAL diferente da esperada';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_resultado->'ic_inativo') e
                  WHERE e->>'nro_chamado' = 'IM TESTE-ICC-COMEX'
                    AND e->>'descricao_inconsistencia' = 'Chamado na fila AMS APL - COMEX - ICS INATIVOS') THEN
    RAISE EXCEPTION 'Descrição do ic_inativo COMEX diferente da esperada';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_resultado->'ic_inativo') e
                  WHERE e->>'nro_chamado' = 'RF TESTE-ICC-GALLERY'
                    AND e->>'descricao_inconsistencia' = 'Chamado na fila AMS APL – GALLERY - ICS INATIVOS') THEN
    RAISE EXCEPTION 'Descrição do ic_inativo GALLERY diferente da esperada';
  END IF;

  -- 3. IC 999999 fora das filas não entra
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_resultado->'ic_inativo') e
              WHERE e->>'nro_chamado' = 'IM TESTE-ICC-COMEX-OK') THEN
    RAISE EXCEPTION 'Chamado com IC 999999 fora das filas ICS INATIVOS entrou em ic_inativo';
  END IF;

  -- 4. Encerrado ou cancelado não entra
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_resultado->'ic_inativo') e
              WHERE e->>'nro_chamado' IN ('IM TESTE-ICC-COMEX-FC', 'IM TESTE-ICC-GAL-CANC')) THEN
    RAISE EXCEPTION 'Chamado encerrado ou cancelado entrou em ic_inativo';
  END IF;

  -- 5. Totais acompanham a lista
  IF (v_resultado->'totais'->>'ic_inativo')::int <> jsonb_array_length(v_resultado->'ic_inativo') THEN
    RAISE EXCEPTION 'totais.ic_inativo diferente da lista';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
