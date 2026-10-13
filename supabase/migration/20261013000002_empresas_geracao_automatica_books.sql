-- =====================================================================
-- Geração automática de Books: restringir o agendamento a algumas empresas.
--
-- sync_agendamentos.empresa_ids (só para tipo = 'books'):
--   vazio       → todas as empresas liberadas e ainda não enviadas
--   preenchido  → somente estas (continuam valendo as regras de liberação
--                 e de book já enviado)
-- Sem FK em array: empresa excluída/inativada é simplesmente ignorada
-- (a geração só processa empresas que aparecem na lista de books do período).
-- =====================================================================

ALTER TABLE sync_agendamentos
  ADD COLUMN IF NOT EXISTS empresa_ids UUID[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN sync_agendamentos.empresa_ids IS
  'Só para tipo = books: empresas a gerar (vazio = todas as liberadas e ainda não enviadas)';
