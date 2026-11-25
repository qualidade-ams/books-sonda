-- =====================================================================
-- Teste da migration 20261125000001_saldo_parcial_cs_fora_do_cc.
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou.
-- Qualquer outra mensagem de erro diz qual verificação falhou.
--
-- Regra: o Customer Success das empresas não fica gravado na cópia do
-- agendamento de Saldo Parcial; o sync-api o lê do cadastro a cada envio.
-- Rodado antes da migration, falha na verificação 1 (é o Red).
-- =====================================================================
DO $teste$
DECLARE
  v_qtd int;
BEGIN
  -- 1. Nenhum agendamento guarda na cópia o CS atual de uma das suas empresas
  SELECT count(*) INTO v_qtd
    FROM banco_horas_envio_agendamentos a
    CROSS JOIN LATERAL unnest(a.emails_cc) AS e(email)
   WHERE EXISTS (SELECT 1
                   FROM banco_horas_envio_agendamento_empresas ae
                   JOIN empresas_clientes ec ON ec.id = ae.empresa_id
                  WHERE ae.agendamento_id = a.id
                    AND lower(trim(ec.email_gestor)) = lower(trim(e.email)));
  IF v_qtd > 0 THEN
    RAISE EXCEPTION '% e-mail(s) de Customer Success ainda gravado(s) na cópia dos agendamentos', v_qtd;
  END IF;

  -- 2. A cópia continua um array válido, sem nulo nem vazio
  IF EXISTS (SELECT 1 FROM banco_horas_envio_agendamentos
              WHERE emails_cc IS NULL
                 OR EXISTS (SELECT 1 FROM unnest(emails_cc) e WHERE coalesce(trim(e), '') = '')) THEN
    RAISE EXCEPTION 'Cópia de agendamento ficou nula ou com e-mail vazio';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
