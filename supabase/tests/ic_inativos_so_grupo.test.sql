-- =====================================================================
-- Teste da migration 20261125000003_ic_inativos_so_grupo.
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou.
-- Qualquer outra mensagem de erro diz qual verificação falhou.
--
-- Regra: ic_inativo (Monitoramento de Chamados) é só o chamado não encerrado
-- no grupo "AMS APL - FISCAL - ICS INATIVOS", com qualquer IC. IC 999999 fora
-- desse grupo não entra (continua no ic_999999 das Inconsistências).
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
    ('TESTE-ICG-SO-IC',   'Incidente',   'SIM', 'AMS APL - FISCAL',                'Open',   '999999 - IC TESTE', 'ORG TESTE', NOW() - INTERVAL '3 days'),
    ('TESTE-ICG-GRUPO',   'Solicitação', 'NAO', 'AMS APL - FISCAL - ICS INATIVOS', 'Hold',   '123456 - OK',       'ORG TESTE', NOW() - INTERVAL '2 days'),
    ('TESTE-ICG-GRUPO-IC','Incidente',   'SIM', 'AMS APL - FISCAL - ICS INATIVOS', 'Open',   '999999 - IC TESTE', 'ORG TESTE', NOW() - INTERVAL '2 days'),
    ('TESTE-ICG-FECHADO', 'Incidente',   'SIM', 'AMS APL - FISCAL - ICS INATIVOS', 'Closed', '123456 - OK',       'ORG TESTE', NOW() - INTERVAL '2 days');

  v_resultado := public.detectar_inconsistencias();

  -- 1. IC 999999 fora do grupo não é ic_inativo
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_resultado->'ic_inativo') e
              WHERE e->>'nro_chamado' = 'IM TESTE-ICG-SO-IC') THEN
    RAISE EXCEPTION 'Chamado com IC 999999 fora do grupo ICS INATIVOS entrou em ic_inativo';
  END IF;

  -- 2. No grupo, com qualquer IC (e sem filtro de caso pai), é ic_inativo
  IF (SELECT count(*) FROM jsonb_array_elements(v_resultado->'ic_inativo') e
       WHERE e->>'nro_chamado' IN ('RF TESTE-ICG-GRUPO', 'IM TESTE-ICG-GRUPO-IC')) <> 2 THEN
    RAISE EXCEPTION 'Chamado no grupo AMS APL - FISCAL - ICS INATIVOS não virou ic_inativo';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_resultado->'ic_inativo') e
                  WHERE e->>'nro_chamado' = 'RF TESTE-ICG-GRUPO'
                    AND e->>'descricao_inconsistencia' = 'Chamado na fila AMS APL - FISCAL - ICS INATIVOS') THEN
    RAISE EXCEPTION 'Descrição do ic_inativo diferente da esperada';
  END IF;

  -- 3. Encerrado não entra
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_resultado->'ic_inativo') e
              WHERE e->>'nro_chamado' = 'IM TESTE-ICG-FECHADO') THEN
    RAISE EXCEPTION 'Chamado encerrado entrou em ic_inativo';
  END IF;

  -- 4. Totais acompanham a lista
  IF (v_resultado->'totais'->>'ic_inativo')::int <> jsonb_array_length(v_resultado->'ic_inativo') THEN
    RAISE EXCEPTION 'totais.ic_inativo diferente da lista';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
