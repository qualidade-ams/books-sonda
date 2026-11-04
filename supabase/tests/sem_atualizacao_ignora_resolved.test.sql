-- =====================================================================
-- Teste da migration 20261104000002_sem_atualizacao_ignora_resolved.
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou.
-- Qualquer outra mensagem de erro diz qual verificação falhou.
--
-- Regra: chamado com status Resolved não é mais "Sem Atualização 16+ dias".
-- Sem a detecção, o sync-api move a inconsistência ativa para o Histórico.
-- =====================================================================
DO $teste$
DECLARE
  v_resultado jsonb;
BEGIN
  -- 0. Função continua SECURITY DEFINER com search_path fixo
  IF EXISTS (SELECT 1 FROM pg_proc
              WHERE proname = 'detectar_inconsistencias'
                AND pronamespace = 'public'::regnamespace
                AND (NOT prosecdef OR NOT ('search_path=public' = ANY (coalesce(proconfig, '{}'))))) THEN
    RAISE EXCEPTION 'detectar_inconsistencias sem SECURITY DEFINER ou sem search_path fixo';
  END IF;

  -- Massa de teste: chamados elegíveis, sem nota pública há 30 dias
  INSERT INTO apontamentos_tickets_aranda
    (nro_solicitacao, cod_tipo, caso_pai, nome_grupo, status, data_abertura, data_ultima_nota_publica)
  VALUES
    ('TESTE-SA-RESOLVED', 'Incidente', 'SIM', 'AMS TESTE', 'Resolved',     NOW() - INTERVAL '40 days', NOW() - INTERVAL '30 days'),
    ('TESTE-SA-OPEN',     'Incidente', 'SIM', 'AMS TESTE', 'Open',         NOW() - INTERVAL '40 days', NOW() - INTERVAL '30 days'),
    ('TESTE-SA-HOLD',     'Incidente', 'SIM', 'AMS TESTE', 'Hold',         NOW() - INTERVAL '40 days', NOW() - INTERVAL '30 days'),
    ('TESTE-SA-PROGRESS', 'Incidente', 'SIM', 'AMS TESTE', 'In Progress',  NOW() - INTERVAL '40 days', NOW() - INTERVAL '30 days'),
    ('TESTE-SA-ACK',      'Incidente', 'SIM', 'AMS TESTE', 'Acknowledged', NOW() - INTERVAL '40 days', NOW() - INTERVAL '30 days');

  v_resultado := public.detectar_inconsistencias();

  -- 1. Resolved não gera "Sem Atualização 16+ dias"
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_resultado->'sem_atualizacao') e
              WHERE e->>'nro_chamado' = 'IM TESTE-SA-RESOLVED') THEN
    RAISE EXCEPTION 'Chamado Resolved gerou inconsistência Sem Atualização 16+ dias';
  END IF;

  -- 2. Os outros status continuam gerando
  IF (SELECT count(*) FROM jsonb_array_elements(v_resultado->'sem_atualizacao') e
       WHERE e->>'nro_chamado' IN ('IM TESTE-SA-OPEN', 'IM TESTE-SA-HOLD', 'IM TESTE-SA-PROGRESS', 'IM TESTE-SA-ACK')) <> 4 THEN
    RAISE EXCEPTION 'Open, Hold, In Progress e Acknowledged deveriam continuar em Sem Atualização 16+ dias';
  END IF;

  -- 3. O total do tipo acompanha a lista
  IF (v_resultado->'totais'->>'sem_atualizacao')::int <> jsonb_array_length(v_resultado->'sem_atualizacao') THEN
    RAISE EXCEPTION 'totais.sem_atualizacao diferente da lista';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
