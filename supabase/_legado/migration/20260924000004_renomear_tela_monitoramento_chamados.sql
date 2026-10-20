-- =====================================================================
-- A tela criada em 20260924000003 passa a se chamar "Monitoramento de
-- Chamados", em /admin/auditoria/monitoramento-chamados.
-- A key 'troca_codigo_resolucao' é mantida para não mexer nas permissões
-- já concedidas em screen_permissions.
-- =====================================================================

UPDATE screens
SET
  name = 'Monitoramento de Chamados',
  description = 'Trocas de código de resolução que mudaram a cobrança do banco de horas',
  route = '/admin/auditoria/monitoramento-chamados'
WHERE key = 'troca_codigo_resolucao';
