-- =====================================================================
-- Fase 3, migration 23: ativação (Modelagem_Fase3.md, quadro das migrations).
--
-- Aplicada junto com a publicação das telas novas. Agenda a rotina diária que abre
-- (ou resolve) o aviso "Grupo do Aranda sem mapeamento" no sino, criada na migration
-- do De-para (20261022000006); o aviso aponta para /admin/de-para-grupos, por isso
-- só entra quando a tela estiver no ar.
--
-- 8h de Brasília = 11h UTC: o pg_cron agenda em UTC, e o Brasil não tem horário de
-- verão desde 2019. A função é SECURITY DEFINER com search_path fixo e não é
-- executável por anon/authenticated (REVOKE na migration do De-para); o job roda
-- como o dono do agendamento.
--
-- Reaplicável: desagenda o job de mesmo nome antes de agendar de novo.
-- Para desfazer: SELECT cron.unschedule('de-para-grupos-nao-mapeados');
-- =====================================================================

SELECT cron.unschedule('de-para-grupos-nao-mapeados')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'de-para-grupos-nao-mapeados');

SELECT cron.schedule(
  'de-para-grupos-nao-mapeados',
  '0 11 * * *',
  'SELECT public.notificar_grupos_nao_mapeados();'
);
