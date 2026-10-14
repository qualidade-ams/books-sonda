-- =====================================================================
-- Exclui trocas de código de resolução que não valem pela regra de
-- 20260924000001 (troca no mesmo mês/ano da abertura ou sem horas apontadas
-- antes da troca).
--
-- Foram detectadas pela regra antiga e nunca foram inconsistência pela nova.
-- Marcá-las como resolvidas as levaria para o Histórico como se o analista
-- tivesse corrigido, por isso são excluídas (qualquer status, inclusive as que
-- o sync-api já tenha resolvido).
--
-- historico_inconsistencias_chamados.inconsistencia_id é ON DELETE SET NULL:
-- os registros de envio de email continuam guardados.
-- O sync-api não as reinsere, porque detectar_inconsistencias() não as retorna.
-- =====================================================================

DELETE FROM public.inconsistencias_chamados ic
WHERE ic.tipo_inconsistencia = 'troca_codigo_resolucao'
  AND (
    -- nro_chamado vem com prefixo ("RF 123"); data_atividade guarda a data/hora da troca
    date_trunc('month', ic.data_atividade::timestamptz AT TIME ZONE 'America/Sao_Paulo')
      = date_trunc('month', ic.data_abertura::timestamptz AT TIME ZONE 'America/Sao_Paulo')
    OR NOT EXISTS (
      SELECT 1
      FROM public.apontamentos_aranda a
      WHERE a.nro_chamado = regexp_replace(ic.nro_chamado, '^(RF|IM|PM) ', '')
        AND a.data_sistema < ic.data_atividade::timestamptz
        AND ROUND(a.tempo_gasto_minutos) > 0
    )
  );

-- Verificação: deve retornar 0
-- SELECT COUNT(*) FROM inconsistencias_chamados
-- WHERE tipo_inconsistencia = 'troca_codigo_resolucao'
--   AND date_trunc('month', data_atividade::timestamptz AT TIME ZONE 'America/Sao_Paulo')
--     = date_trunc('month', data_abertura::timestamptz AT TIME ZONE 'America/Sao_Paulo');
