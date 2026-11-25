-- =====================================================================
-- Teste da migration 20261125000002_monitoramento_ic_inativos.
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou.
-- Qualquer outra mensagem de erro diz qual verificação falhou.
--
-- Regra (Monitoramento de Chamados): chamado não encerrado (fora de Closed e
-- Cancelled) no grupo "AMS APL - FISCAL - ICS INATIVOS" é a inconsistência
-- 'ic_inativo', sem os filtros de ticket elegível. O 'ic_999999' das
-- Inconsistências não muda. (O critério "IC 999999" saiu do ic_inativo em
-- 20261125000003; ver ic_inativos_so_grupo.test.sql.)
-- A rotina 'ic_inativos' de Rotinas Automáticas guarda o CC em emails_cc.
-- =====================================================================
DO $teste$
DECLARE
  v_resultado jsonb;
  v_ag uuid;
BEGIN
  -- 0. Função continua SECURITY DEFINER com search_path fixo
  IF EXISTS (SELECT 1 FROM pg_proc
              WHERE proname = 'detectar_inconsistencias'
                AND pronamespace = 'public'::regnamespace
                AND (NOT prosecdef OR NOT ('search_path=public' = ANY (coalesce(proconfig, '{}'))))) THEN
    RAISE EXCEPTION 'detectar_inconsistencias sem SECURITY DEFINER ou sem search_path fixo';
  END IF;

  -- 1. Os tipos novos são aceitos
  INSERT INTO inconsistencias_chamados (origem, nro_chamado, tipo_inconsistencia, descricao_inconsistencia, chave_unica)
  VALUES ('tickets', 'IM TESTE-ICI-CHK', 'ic_inativo', 'teste', 'tickets-IM TESTE-ICI-CHK-ic_inativo');
  INSERT INTO historico_inconsistencias_chamados
    (origem, nro_chamado, tipo_inconsistencia, descricao_inconsistencia, mes_referencia, ano_referencia)
  VALUES ('tickets', 'IM TESTE-ICI-CHK', 'ic_inativo', 'teste', 11, 2026);
  INSERT INTO sync_agendamentos (nome, tipo, frequencia, modo_horario, intervalo_horas, hora_inicio, hora_fim, emails_cc)
  VALUES ('Teste IC Inativos', 'ic_inativos', 'diario', 'intervalo', 2, '09:00', '17:00', ARRAY['cc@sonda.com'])
  RETURNING id INTO v_ag;
  INSERT INTO sync_execucoes (tipo, agendamento_id, origem, status) VALUES ('ic_inativos', v_ag, 'agendado', 'sucesso');

  -- 2. emails_cc nasce vazio nos agendamentos que não informam
  IF (SELECT emails_cc FROM sync_agendamentos WHERE id = v_ag) <> ARRAY['cc@sonda.com'] THEN
    RAISE EXCEPTION 'emails_cc não gravou o CC da rotina';
  END IF;

  -- Massa: qualquer chamado (caso pai NÃO e grupo excluído também entram)
  INSERT INTO apontamentos_tickets_aranda
    (nro_solicitacao, cod_tipo, caso_pai, nome_grupo, status, item_configuracao, organizacao, data_abertura)
  VALUES
    ('TESTE-ICI-IC',     'Incidente',   'NAO', 'AMS SAP - TESTE',                 'Open',      '999999 - IC TESTE', 'ORG TESTE', NOW() - INTERVAL '3 days'),
    ('TESTE-ICI-GRUPO',  'Solicitação', 'SIM', 'AMS APL - FISCAL - ICS INATIVOS', 'Hold',      '123456 - OK',       'ORG TESTE', NOW() - INTERVAL '2 days'),
    ('TESTE-ICI-FECHADO','Incidente',   'SIM', 'AMS APL - FISCAL - ICS INATIVOS', 'Closed',    '999999 - IC TESTE', 'ORG TESTE', NOW() - INTERVAL '2 days'),
    ('TESTE-ICI-CANCEL', 'Incidente',   'SIM', 'AMS APL - FISCAL',                'Cancelled', '999999 - IC TESTE', 'ORG TESTE', NOW() - INTERVAL '2 days'),
    ('TESTE-ICI-NORMAL', 'Incidente',   'SIM', 'AMS APL - FISCAL',                'Open',      '123456 - OK',       'ORG TESTE', NOW() - INTERVAL '2 days');

  v_resultado := public.detectar_inconsistencias();

  -- 3. Grupo ICS INATIVOS entra, com os campos da tela
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_resultado->'ic_inativo') e
                  WHERE e->>'nro_chamado' = 'RF TESTE-ICI-GRUPO'
                    AND e->>'chave_unica' = 'tickets-RF TESTE-ICI-GRUPO-ic_inativo'
                    AND e->>'tipo_inconsistencia' = 'ic_inativo'
                    AND e->>'empresa' = 'ORG TESTE'
                    AND e->>'origem' = 'tickets') THEN
    RAISE EXCEPTION 'Chamado no grupo AMS APL - FISCAL - ICS INATIVOS não virou ic_inativo';
  END IF;

  -- 4. Encerrado, cancelado e chamado comum não entram
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_resultado->'ic_inativo') e
              WHERE e->>'nro_chamado' IN ('IM TESTE-ICI-FECHADO', 'IM TESTE-ICI-CANCEL', 'IM TESTE-ICI-NORMAL')) THEN
    RAISE EXCEPTION 'Chamado encerrado, cancelado ou comum entrou em ic_inativo';
  END IF;

  -- 5. O ic_999999 das Inconsistências continua com os filtros de elegibilidade
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_resultado->'ic_999999') e
              WHERE e->>'nro_chamado' = 'IM TESTE-ICI-IC') THEN
    RAISE EXCEPTION 'ic_999999 perdeu os filtros de ticket elegível';
  END IF;

  -- 6. Totais acompanham a lista
  IF (v_resultado->'totais'->>'ic_inativo')::int <> jsonb_array_length(v_resultado->'ic_inativo') THEN
    RAISE EXCEPTION 'totais.ic_inativo diferente da lista';
  END IF;
  IF (v_resultado->'totais'->>'total')::int <>
     jsonb_array_length(v_resultado->'ic_999999') + jsonb_array_length(v_resultado->'sem_atualizacao')
     + jsonb_array_length(v_resultado->'mes_diferente') + jsonb_array_length(v_resultado->'tempo_excessivo')
     + jsonb_array_length(v_resultado->'troca_codigo_resolucao') + jsonb_array_length(v_resultado->'validacao_solucao')
     + jsonb_array_length(v_resultado->'ic_inativo') THEN
    RAISE EXCEPTION 'totais.total não soma o ic_inativo';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
