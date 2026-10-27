-- =====================================================================
-- Fase 3 — migration 22: envio manual do Saldo Parcial pelo Controle
-- (docs/especificacoes/Modelagem_Fase3.md, seções 7 e 11; decisão de 26/10/2026)
--
-- registrar_envio_saldo_parcial_controle()  grava o envio feito pelo Controle em
--   banco_horas_envio_execucoes, com origem 'manual' e sem agendamento, para aparecer
--   no histórico de envios. O app não grava direto na tabela (as políticas de
--   INSERT/UPDATE continuam false): só por esta função, que confere a permissão de
--   edição do Controle e que a empresa já está no modelo novo (em modo sombra o
--   Controle não envia). A falha também fica registrada, e o gatilho que já existe
--   abre a notificação "Falha no envio do Saldo Parcial" no sino.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.registrar_envio_saldo_parcial_controle(
  p_empresa_id UUID,
  p_sucesso BOOLEAN,
  p_qtd_destinatarios INTEGER,
  p_erro TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  -- clock_timestamp: dois envios na mesma transação não colidem em (empresa, executado_para)
  v_agora TIMESTAMPTZ := clock_timestamp();
BEGIN
  IF NOT has_screen_permission('bancos_horas_controle', 'edit') THEN
    RAISE EXCEPTION 'Sem permissão para enviar o Saldo Parcial pelo Controle.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM empresas WHERE id = p_empresa_id AND modelo_calculo = 'multiplo') THEN
    RAISE EXCEPTION 'A empresa ainda está no cálculo atual: o Saldo Parcial é enviado pelo fluxo atual.'
      USING ERRCODE = 'check_violation';
  END IF;
  IF COALESCE(p_qtd_destinatarios, 0) < 1 THEN
    RAISE EXCEPTION 'O envio precisa de ao menos um destinatário.'
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO banco_horas_envio_execucoes (
    agendamento_id, empresa_id, origem, disparado_por, executado_para, status,
    qtd_destinatarios, qtd_emails, erro, iniciado_em, finalizado_em
  )
  VALUES (
    NULL, p_empresa_id, 'manual', (SELECT auth.uid()), v_agora,
    CASE WHEN p_sucesso THEN 'sucesso' ELSE 'erro' END,
    p_qtd_destinatarios,
    CASE WHEN p_sucesso THEN 1 ELSE 0 END,
    CASE WHEN p_sucesso THEN NULL ELSE left(COALESCE(NULLIF(trim(p_erro), ''), 'Erro no envio'), 500) END,
    v_agora, v_agora
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.registrar_envio_saldo_parcial_controle(UUID, BOOLEAN, INTEGER, TEXT) IS
  'Controle: registra o envio manual do Saldo Parcial (sucesso ou falha) no histórico de envios';

REVOKE ALL ON FUNCTION public.registrar_envio_saldo_parcial_controle(UUID, BOOLEAN, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_envio_saldo_parcial_controle(UUID, BOOLEAN, INTEGER, TEXT) TO authenticated, service_role;
