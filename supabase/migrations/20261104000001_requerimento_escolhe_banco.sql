-- =====================================================================
-- Requerimento de empresa liberada escolhe o banco no lançamento
--
-- Até aqui, o banco do requerimento vinha do campo Módulo (tabela
-- modulos_requerimento_produto) e só o Controle ajustava a escolha, gravada em
-- requerimentos_bancos. Agora, na empresa liberada (modelo_calculo
-- 'multiplo'), quem lança o requerimento de Banco de Horas escolhe o banco
-- na própria tela de Lançar Requerimentos. A empresa no legado continua igual.
--
-- Os requerimentos já lançados não mudam: sem escolha, o motor segue pelo
-- módulo (bancoDoRequerimento). Nenhuma coluna nova em requerimentos.
--
-- Quem lança requerimento não tem acesso ao Controle (RLS de
-- requerimentos_bancos e de bancos_horas). Por isso as duas funções abaixo
-- são SECURITY DEFINER e conferem a permissão da tela Lançar Requerimentos.
-- Autoria e auditoria continuam pelos gatilhos de requerimentos_bancos.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Bancos que o requerimento pode escolher: os ativos da empresa liberada,
-- na ordem do cadastro, com a vigência para o filtro do mês de cobrança.
-- Empresa no legado: nenhuma linha (o formulário fica como antes).
-- p_requerimento_id (opcional, na edição) marca o banco já escolhido.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.requerimento_bancos_disponiveis(
  p_empresa_id UUID,
  p_requerimento_id UUID DEFAULT NULL
)
RETURNS TABLE (
  banco_id UUID, nome TEXT, padrao BOOLEAN, ordem INTEGER,
  inicio_vigencia DATE, fim_vigencia DATE, escolhido BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  IF NOT has_screen_permission('lancar_requerimentos', 'view') THEN
    RAISE EXCEPTION 'Sem permissão para consultar os bancos do requerimento.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT b.id,
         b.nome::text,
         b.padrao,
         b.ordem::integer,
         b.inicio_vigencia,
         b.fim_vigencia,
         EXISTS (SELECT 1 FROM requerimentos_bancos rb
                  WHERE rb.requerimento_id = p_requerimento_id AND rb.banco_id = b.id)
    FROM bancos_horas b
    JOIN empresas e ON e.id = b.empresa_id
   WHERE b.empresa_id = p_empresa_id
     AND b.ativo
     AND e.modelo_calculo = 'multiplo'
   ORDER BY b.ordem;
END;
$$;

COMMENT ON FUNCTION public.requerimento_bancos_disponiveis(UUID, UUID) IS
  'Bancos ativos da empresa liberada para o lançamento do requerimento; vazio no legado.';

-- ---------------------------------------------------------------------
-- Grava o banco escolhido no lançamento ou na edição do requerimento.
-- Reescolher o mesmo banco não mexe na linha (mantém o motivo de um ajuste
-- feito no Controle). Depois do envio para faturamento, o ajuste é no Controle.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.requerimento_definir_banco(p_requerimento_id UUID, p_banco_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req RECORD;
  v_banco RECORD;
  v_mes DATE;
BEGIN
  IF NOT has_screen_permission('lancar_requerimentos', 'edit') THEN
    RAISE EXCEPTION 'Sem permissão para definir o banco do requerimento.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT r.id, r.cliente_id, r.tipo_cobranca, r.mes_cobranca, r.enviado_faturamento
    INTO v_req
    FROM requerimentos r
   WHERE r.id = p_requerimento_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Requerimento não encontrado.' USING ERRCODE = 'no_data_found';
  END IF;
  IF v_req.tipo_cobranca IS DISTINCT FROM 'Banco de Horas' THEN
    RAISE EXCEPTION 'Só requerimento de Banco de Horas desconta de um banco.'
      USING ERRCODE = 'check_violation';
  END IF;
  IF v_req.enviado_faturamento THEN
    RAISE EXCEPTION 'Requerimento já enviado para faturamento: o banco é ajustado na tela de Controle.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT b.ativo, b.inicio_vigencia, b.fim_vigencia, e.modelo_calculo
    INTO v_banco
    FROM bancos_horas b
    JOIN empresas e ON e.id = b.empresa_id
   WHERE b.id = p_banco_id
     AND b.empresa_id = v_req.cliente_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'O banco escolhido não é da empresa do requerimento.'
      USING ERRCODE = 'check_violation';
  END IF;
  IF v_banco.modelo_calculo IS DISTINCT FROM 'multiplo' THEN
    RAISE EXCEPTION 'A empresa ainda está no modelo legado: o requerimento não escolhe banco.'
      USING ERRCODE = 'check_violation';
  END IF;
  IF NOT v_banco.ativo THEN
    RAISE EXCEPTION 'O banco escolhido está inativo.' USING ERRCODE = 'check_violation';
  END IF;

  -- Mês de cobrança MM/AAAA; sem ele, não há vigência a conferir
  IF v_req.mes_cobranca ~ '^(0[1-9]|1[0-2])/[0-9]{4}$' THEN
    v_mes := to_date('01/' || v_req.mes_cobranca, 'DD/MM/YYYY');
    IF v_mes < v_banco.inicio_vigencia
       OR (v_banco.fim_vigencia IS NOT NULL AND v_mes > v_banco.fim_vigencia) THEN
      RAISE EXCEPTION 'O banco escolhido não está vigente no mês de cobrança do requerimento.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  INSERT INTO requerimentos_bancos (requerimento_id, banco_id, motivo)
  VALUES (p_requerimento_id, p_banco_id, 'Escolhido no lançamento do requerimento')
  ON CONFLICT (requerimento_id) DO UPDATE
     SET banco_id = EXCLUDED.banco_id,
         motivo = EXCLUDED.motivo
   WHERE requerimentos_bancos.banco_id IS DISTINCT FROM EXCLUDED.banco_id;
END;
$$;

COMMENT ON FUNCTION public.requerimento_definir_banco(UUID, UUID) IS
  'Banco escolhido no lançamento do requerimento de empresa liberada (Lançar Requerimentos).';

-- ---------------------------------------------------------------------
-- Permissões de execução
-- ---------------------------------------------------------------------

REVOKE ALL ON FUNCTION
  public.requerimento_bancos_disponiveis(UUID, UUID),
  public.requerimento_definir_banco(UUID, UUID)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.requerimento_bancos_disponiveis(UUID, UUID),
  public.requerimento_definir_banco(UUID, UUID)
TO authenticated, service_role;
