-- =====================================================================
-- Notificação "Banco réplica desatualizado" (tela Rotinas Automáticas).
--
-- Antes de cada sincronização o sync-api lê a data mais recente de
-- AMSapontamento e AMSticketsabertos no SQL Server. Se alguma estiver com mais
-- de 1 hora de atraso, chama notificacoes_sync_replica com a mensagem, que abre
-- (ou atualiza) a notificação; com a réplica em dia, chama com mensagem nula e
-- a notificação é resolvida. Chave fixa: no máximo uma aberta.
--
-- Diferente das outras notificações, não há gatilho: quem decide é o sync-api
-- (a origem está no SQL Server), por isso a função tem EXECUTE só para o
-- service_role.
-- =====================================================================

ALTER TABLE notificacoes DROP CONSTRAINT IF EXISTS notificacoes_tipo_check;
ALTER TABLE notificacoes ADD CONSTRAINT notificacoes_tipo_check CHECK (tipo IN (
  'book_precisa_retificacao',
  'ajuste_retroativo_pendente',
  'saldo_parcial_falha',
  'geracao_books_falha',
  'sincronizacao_legado_falha',
  'replica_desatualizada'
));

CREATE OR REPLACE FUNCTION public.notificacoes_sync_replica(p_mensagem TEXT, p_referencia JSONB DEFAULT '{}'::jsonb)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_mensagem IS NULL THEN
    PERFORM notificacoes_resolver('replica_desatualizada', 'Banco réplica atualizado');
  ELSE
    PERFORM notificacoes_abrir(
      'replica_desatualizada',
      'sincronizacao_sql_server',
      'Banco réplica desatualizado',
      p_mensagem,
      '/admin/rotinas-automaticas',
      NULL,
      'replica_desatualizada',
      COALESCE(p_referencia, '{}'::jsonb)
    );
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notificacoes_sync_replica(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notificacoes_sync_replica(TEXT, JSONB) TO service_role;
