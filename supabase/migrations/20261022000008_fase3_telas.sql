-- =====================================================================
-- Fase 3 — migration 16: ajustes das telas
-- (docs/especificacoes/Modelagem_Fase3.md, seções 6, 7, 11 e 12)
--
--   bancos_horas_reajustes.anotacao_interna   anotações internas do reajuste (até 700):
--                                    aparecem no Controle e na auditoria; nunca vão
--                                    ao Book, ao Saldo Parcial ou a e-mails
--   auditoria_alteracoes             quem vê o Controle lê as linhas dos bancos
--                                    (aba Histórico); a tela Auditoria continua lendo tudo
--   ramos_atividade                  exclusão com Edição (a FK protege o ramo em uso)
--   screens                          Produtos e Módulos na categoria Cliente
--   banco_horas_envio_execucoes      status "pulado": "Executar agora" pula quem já
--                                    recebeu no dia
-- As chaves novas (regras_contagem, bancos_horas_retroativos) foram registradas nas
-- migrations 13 e 15, junto com as políticas que dependem delas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Anotações internas do reajuste (seção 7)
-- ---------------------------------------------------------------------

ALTER TABLE bancos_horas_reajustes ADD COLUMN IF NOT EXISTS anotacao_interna TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bancos_horas_reajustes_anotacao_ck') THEN
    ALTER TABLE bancos_horas_reajustes ADD CONSTRAINT bancos_horas_reajustes_anotacao_ck
      CHECK (anotacao_interna IS NULL OR length(anotacao_interna) <= 700);
  END IF;
END $$;

COMMENT ON COLUMN bancos_horas_reajustes.anotacao_interna IS
  'Uso interno: aparece no Controle e na auditoria; nunca vai ao Book, ao Saldo Parcial ou a e-mails';

-- ---------------------------------------------------------------------
-- 2. Auditoria lida pelo Controle (aba Histórico)
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS "auditoria_alteracoes_select" ON auditoria_alteracoes;
CREATE POLICY "auditoria_alteracoes_select" ON auditoria_alteracoes
  FOR SELECT TO authenticated
  USING (
    has_screen_permission('bancos_horas_auditoria'::text, 'view'::text)
    OR (banco_id IS NOT NULL AND has_screen_permission('bancos_horas_controle'::text, 'view'::text))
  );

-- ---------------------------------------------------------------------
-- 3. Exclusão de ramo sem uso (seção 6)
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS "ramos_atividade_delete" ON ramos_atividade;
CREATE POLICY "ramos_atividade_delete" ON ramos_atividade
  FOR DELETE TO authenticated
  USING (has_screen_permission('ramos_atividade'::text, 'edit'::text));

-- ---------------------------------------------------------------------
-- 4. Telas (seção 12)
-- ---------------------------------------------------------------------

-- Fica no menu junto de Empresas (decisão de 21/10/2026)
UPDATE screens SET category = 'Cliente' WHERE key = 'produtos_modulos' AND category IS DISTINCT FROM 'Cliente';

-- ---------------------------------------------------------------------
-- 5. Envio de Saldo Parcial: status "pulado" (seção 11)
-- ---------------------------------------------------------------------

ALTER TABLE banco_horas_envio_execucoes DROP CONSTRAINT IF EXISTS banco_horas_envio_execucoes_status_check;
ALTER TABLE banco_horas_envio_execucoes ADD CONSTRAINT banco_horas_envio_execucoes_status_check
  CHECK (status IN ('executando', 'sucesso', 'erro', 'sem_destinatarios', 'interrompida', 'pulado'));
