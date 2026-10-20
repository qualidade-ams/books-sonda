-- Tela "Sincronização SQL Server" passa a se chamar "Rotinas Automáticas" e reúne
-- a sincronização com o Aranda, a geração de books e o envio de Saldo Parcial (aba).
--
-- Só nome, descrição e rota exibidos no cadastro de permissões. As chaves
-- ('sincronizacao_sql_server' e 'envio_saldo_parcial') NÃO mudam: as políticas RLS de
-- sync_agendamentos, sync_execucoes e banco_horas_envio_* e o sync-api dependem delas.
-- Os endereços antigos continuam redirecionando no frontend.

UPDATE screens
SET
  name = 'Rotinas Automáticas',
  description = 'Agendamento, execução manual e histórico das rotinas automáticas: sincronização com o SQL Server Aranda, geração de books e envio de Saldo Parcial',
  route = '/admin/rotinas-automaticas'
WHERE key = 'sincronizacao_sql_server';

UPDATE screens
SET route = '/admin/rotinas-automaticas?aba=saldo-parcial'
WHERE key = 'envio_saldo_parcial';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM screens
    WHERE key = 'sincronizacao_sql_server'
      AND name = 'Rotinas Automáticas'
      AND route = '/admin/rotinas-automaticas'
  ) THEN
    RAISE EXCEPTION 'Falha ao renomear a tela "sincronizacao_sql_server"';
  END IF;
END $$;
