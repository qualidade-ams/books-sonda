-- =====================================================================
-- Teste da migration 20261022000001_validacao_solucao_titulo_colado.
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou.
-- Qualquer outra mensagem de erro diz qual verificação falhou.
--
-- Caso real: IM 9513569. No Aranda o título CAUSA é um bloco formatado; no
-- texto puro sincronizado ele chega colado à primeira palavra do parágrafo
-- ("CAUSAO ambiente..."), e a regra "causas?\M" não o reconhecia.
-- =====================================================================
DO $teste$
DECLARE
  v_resultado jsonb;
  v_desc text;
BEGIN
  -- 0. Função continua SECURITY DEFINER com search_path fixo
  IF EXISTS (SELECT 1 FROM pg_proc
              WHERE proname = 'detectar_inconsistencias'
                AND pronamespace = 'public'::regnamespace
                AND (NOT prosecdef OR NOT ('search_path=public' = ANY (coalesce(proconfig, '{}'))))) THEN
    RAISE EXCEPTION 'detectar_inconsistencias sem SECURITY DEFINER ou sem search_path fixo';
  END IF;

  -- Massa de teste: chamados elegíveis para o TIPO 6
  INSERT INTO apontamentos_tickets_aranda
    (nro_solicitacao, cod_tipo, caso_pai, nome_grupo, status, data_abertura, data_solucao, solucao)
  VALUES
    -- 1. Títulos colados (texto do IM 9513569), quebra de linha \n
    ('TESTE-SOL-1', 'Incidente', 'SIM', 'AMS TESTE', 'Resolved', '2026-10-20', '2026-10-21',
     E'CENÁRIOCliente solicitou esclarecimentos.\n'
     'CAUSAO ambiente estava operando com o comportamento padrão.\n'
     'SOLUÇÃO PALIATIVAFoi orientada a parametrização.\n'
     'SOLUÇÃO DEFINITIVAImplementar e validar a parametrização.\n'
     'PREVENÇÃOMonitorar os indicadores.'),
    -- 2. Títulos colados com quebra de linha \r\n e espaço antes do título
    ('TESTE-SOL-2', 'Incidente', 'SIM', 'AMS TESTE', 'Resolved', '2026-10-20', '2026-10-21',
     E'CENÁRIOCliente relatou erro.\r\n'
     '  CAUSASForam identificadas duas falhas.\r\n'
     'SOLUÇÃO PALIATIVAReprocessado.\r\n'
     'SOLUÇÃO DEFINITIVACorrigido.\r\n'
     'PREVENÇÃOMonitorar.'),
    -- 3. "causado" no meio da frase continua NÃO valendo como CAUSA
    ('TESTE-SOL-3', 'Incidente', 'SIM', 'AMS TESTE', 'Resolved', '2026-10-20', '2026-10-21',
     E'CENÁRIO: erro causado por falha de rede.\n'
     'SOLUÇÃO PALIATIVA: reprocessado.\n'
     'SOLUÇÃO DEFINITIVA: corrigido.\n'
     'PREVENÇÃO: monitorar.'),
    -- 4. Título separado normalmente (regra que já existia)
    ('TESTE-SOL-4', 'Incidente', 'SIM', 'AMS TESTE', 'Resolved', '2026-10-20', '2026-10-21',
     E'CENÁRIO: erro.\nCAUSA: falha de rede.\nSOLUÇÃO PALIATIVA: reprocessado.\n'
     'SOLUÇÃO DEFINITIVA: corrigido.\nPREVENÇÃO: monitorar.'),
    -- 5. Palavra inteira no meio do texto, sem estar no começo da linha (regra que já existia)
    ('TESTE-SOL-5', 'Incidente', 'SIM', 'AMS TESTE', 'Resolved', '2026-10-20', '2026-10-21',
     E'CENÁRIO: erro. A causa foi falha de rede.\nSOLUÇÃO PALIATIVA: reprocessado.\n'
     'SOLUÇÃO DEFINITIVA: corrigido.\nPREVENÇÃO: monitorar.');

  v_resultado := public.detectar_inconsistencias();

  -- 1 e 2. Título colado no começo da linha conta como CAUSA
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_resultado->'validacao_solucao') e
              WHERE e->>'nro_chamado' IN ('IM TESTE-SOL-1', 'IM TESTE-SOL-2')) THEN
    RAISE EXCEPTION 'Título CAUSA colado ao texto (início de linha) gerou inconsistência';
  END IF;

  -- 3. "causado" no meio da frase continua acusando CAUSA, e só CAUSA
  SELECT e->>'descricao_inconsistencia' INTO v_desc
    FROM jsonb_array_elements(v_resultado->'validacao_solucao') e
   WHERE e->>'nro_chamado' = 'IM TESTE-SOL-3';
  IF v_desc IS DISTINCT FROM 'Palavras faltando no campo Solução: CAUSA' THEN
    RAISE EXCEPTION 'Esperava só CAUSA faltando em TESTE-SOL-3 ("causado"), veio: %', coalesce(v_desc, '<nenhuma inconsistência>');
  END IF;

  -- 4 e 5. Regras anteriores continuam valendo
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_resultado->'validacao_solucao') e
              WHERE e->>'nro_chamado' IN ('IM TESTE-SOL-4', 'IM TESTE-SOL-5')) THEN
    RAISE EXCEPTION 'CAUSA como palavra inteira gerou inconsistência';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
