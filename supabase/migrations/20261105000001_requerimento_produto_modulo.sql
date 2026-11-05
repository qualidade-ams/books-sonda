-- =====================================================================
-- Requerimento de empresa liberada escolhe o produto e o módulo
--
-- Até aqui (20261104000001), quem lançava o requerimento escolhia o banco
-- direto. Agora escolhe o produto e, quando o banco daquele produto é por
-- módulo, o módulo, entre os que os bancos do cliente cobrem (escopo de
-- bancos_horas_escopo). O banco sai dessa escolha pela regra do motor: o
-- primeiro banco na ordem do cadastro, ativo e vigente no mês de cobrança,
-- cujo escopo cobre o produto inteiro ou o módulo.
--
-- Decisões do usuário (05/11/2026):
--   - o Banco padrão nunca aparece e o requerimento nunca vai para ele;
--   - produto com todos os módulos no mesmo banco dispensa o módulo; nos
--     outros casos, o módulo é obrigatório;
--   - o banco fica fixo no lançamento (gravado em requerimentos_bancos).
--
-- requerimentos_bancos ganha produto_id e modulo_id (tabela do modelo novo;
-- nenhuma coluna nova em requerimentos). requerimento_definir_banco continua
-- existindo para quem ainda chamar, mas a tela passa a usar as funções novas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Produto e módulo escolhidos
-- ---------------------------------------------------------------------

ALTER TABLE requerimentos_bancos
  ADD COLUMN IF NOT EXISTS produto_id UUID REFERENCES produtos(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS modulo_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'requerimentos_bancos_modulo_fk') THEN
    ALTER TABLE requerimentos_bancos
      ADD CONSTRAINT requerimentos_bancos_modulo_fk FOREIGN KEY (modulo_id, produto_id)
      REFERENCES produto_modulos (id, produto_id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'requerimentos_bancos_modulo_com_produto') THEN
    ALTER TABLE requerimentos_bancos
      ADD CONSTRAINT requerimentos_bancos_modulo_com_produto CHECK (modulo_id IS NULL OR produto_id IS NOT NULL);
  END IF;
END $$;

COMMENT ON COLUMN requerimentos_bancos.produto_id IS
  'Produto escolhido no lançamento do requerimento (empresa liberada); nulo nos ajustes do Controle e nos antigos.';
COMMENT ON COLUMN requerimentos_bancos.modulo_id IS
  'Módulo escolhido no lançamento; nulo = produto inteiro (todos os módulos no mesmo banco).';

-- ---------------------------------------------------------------------
-- Banco de um produto/módulo no mês: o primeiro na ordem, ativo, não
-- padrão, vigente, cujo escopo cobre o produto inteiro ou o módulo.
-- Interna: só as funções abaixo chamam.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.requerimento_banco_do_destino(
  p_empresa_id UUID,
  p_produto_id UUID,
  p_modulo_id UUID,
  p_mes DATE
)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id
    FROM bancos_horas b
   WHERE b.empresa_id = p_empresa_id
     AND b.ativo
     AND NOT b.padrao
     AND b.inicio_vigencia <= p_mes
     AND (b.fim_vigencia IS NULL OR b.fim_vigencia >= p_mes)
     AND EXISTS (SELECT 1 FROM bancos_horas_escopo e
                  WHERE e.banco_id = b.id
                    AND e.produto_id = p_produto_id
                    AND (e.modulo_id IS NULL OR e.modulo_id = p_modulo_id))
   ORDER BY b.ordem
   LIMIT 1;
$$;

-- ---------------------------------------------------------------------
-- Destinos do requerimento: um por produto/módulo que algum banco ativo e
-- não padrão cobre. Escopo de produto inteiro vira um destino por módulo
-- ativo (ou um só, sem módulo, se o produto não tem módulos). A vigência e a
-- ordem do banco vão junto: a tela filtra pelo mês de cobrança e fica com o
-- primeiro banco de cada módulo, como a função de gravação.
-- Retorno: { liberada, escolhido: {produtoId, moduloId, bancoId} | null, opcoes: [...] }
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.requerimento_destinos(
  p_empresa_id UUID,
  p_requerimento_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_liberada BOOLEAN;
  v_escolhido JSONB;
  v_opcoes JSONB;
BEGIN
  IF NOT has_screen_permission('lancar_requerimentos', 'view') THEN
    RAISE EXCEPTION 'Sem permissão para consultar os produtos do requerimento.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT COALESCE(e.modelo_calculo = 'multiplo', false) INTO v_liberada
    FROM empresas e WHERE e.id = p_empresa_id;
  v_liberada := COALESCE(v_liberada, false);

  IF NOT v_liberada THEN
    RETURN jsonb_build_object('liberada', false, 'escolhido', NULL, 'opcoes', '[]'::jsonb);
  END IF;

  SELECT jsonb_build_object('produtoId', rb.produto_id, 'moduloId', rb.modulo_id, 'bancoId', rb.banco_id)
    INTO v_escolhido
    FROM requerimentos_bancos rb
   WHERE rb.requerimento_id = p_requerimento_id
     AND rb.produto_id IS NOT NULL;

  WITH bancos AS (
    SELECT b.id, b.nome, b.ordem, b.inicio_vigencia, b.fim_vigencia
      FROM bancos_horas b
     WHERE b.empresa_id = p_empresa_id AND b.ativo AND NOT b.padrao
  ),
  total AS (
    SELECT m.produto_id, count(*)::int AS n
      FROM produto_modulos m WHERE m.ativo GROUP BY m.produto_id
  ),
  destinos AS (
    -- Módulo marcado
    SELECT b.*, e.produto_id, e.modulo_id
      FROM bancos b
      JOIN bancos_horas_escopo e ON e.banco_id = b.id
      JOIN produto_modulos m ON m.id = e.modulo_id AND m.ativo
     WHERE e.modulo_id IS NOT NULL
    UNION
    -- Produto inteiro com módulos: um destino por módulo ativo
    SELECT b.*, e.produto_id, m.id
      FROM bancos b
      JOIN bancos_horas_escopo e ON e.banco_id = b.id AND e.modulo_id IS NULL
      JOIN produto_modulos m ON m.produto_id = e.produto_id AND m.ativo
    UNION
    -- Produto inteiro sem módulos
    SELECT b.*, e.produto_id, NULL::uuid
      FROM bancos b
      JOIN bancos_horas_escopo e ON e.banco_id = b.id AND e.modulo_id IS NULL
     WHERE NOT EXISTS (SELECT 1 FROM produto_modulos m WHERE m.produto_id = e.produto_id AND m.ativo)
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'bancoId', d.id,
           'bancoNome', d.nome,
           'bancoOrdem', d.ordem,
           'inicioVigencia', d.inicio_vigencia,
           'fimVigencia', d.fim_vigencia,
           'produtoId', p.id,
           'produtoNome', p.nome,
           'produtoOrdem', p.ordem,
           'moduloId', m.id,
           'moduloNome', m.nome,
           'moduloOrdem', m.ordem,
           'totalModulos', COALESCE(t.n, 0)
         ) ORDER BY p.ordem, p.nome, m.ordem NULLS FIRST, m.nome, d.ordem), '[]'::jsonb)
    INTO v_opcoes
    FROM destinos d
    JOIN produtos p ON p.id = d.produto_id AND p.ativo
    LEFT JOIN produto_modulos m ON m.id = d.modulo_id
    LEFT JOIN total t ON t.produto_id = p.id;

  RETURN jsonb_build_object('liberada', true, 'escolhido', v_escolhido, 'opcoes', v_opcoes);
END;
$$;

COMMENT ON FUNCTION public.requerimento_destinos(UUID, UUID) IS
  'Produtos/módulos que o requerimento da empresa liberada pode escolher, com o banco de cada um (sem o Banco padrão).';

-- ---------------------------------------------------------------------
-- Grava o produto/módulo e o banco que sai deles. Devolve o banco.
-- Reescolher o mesmo produto/módulo não mexe na linha (mantém um ajuste
-- feito no Controle). Depois do envio para faturamento, o ajuste é no Controle.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.requerimento_definir_destino(
  p_requerimento_id UUID,
  p_produto_id UUID,
  p_modulo_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req RECORD;
  v_atual RECORD;
  v_mes DATE;
  v_banco UUID;
  v_bancos UUID[];
  v_sem_banco INTEGER;
BEGIN
  IF NOT has_screen_permission('lancar_requerimentos', 'edit') THEN
    RAISE EXCEPTION 'Sem permissão para definir o produto do requerimento.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT r.id, r.cliente_id, r.tipo_cobranca, r.mes_cobranca, r.enviado_faturamento, e.modelo_calculo
    INTO v_req
    FROM requerimentos r
    LEFT JOIN empresas e ON e.id = r.cliente_id
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
  IF v_req.modelo_calculo IS DISTINCT FROM 'multiplo' THEN
    RAISE EXCEPTION 'A empresa ainda está no modelo legado: o requerimento não escolhe produto.'
      USING ERRCODE = 'check_violation';
  END IF;
  IF p_produto_id IS NULL THEN
    RAISE EXCEPTION 'Escolha o produto do requerimento.' USING ERRCODE = 'check_violation';
  END IF;
  IF p_modulo_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM produto_modulos m WHERE m.id = p_modulo_id AND m.produto_id = p_produto_id AND m.ativo
  ) THEN
    RAISE EXCEPTION 'O módulo escolhido não é do produto.' USING ERRCODE = 'check_violation';
  END IF;

  -- Mês de cobrança MM/AAAA; sem ele, o mês atual em Brasília
  IF v_req.mes_cobranca ~ '^(0[1-9]|1[0-2])/[0-9]{4}$' THEN
    v_mes := to_date('01/' || v_req.mes_cobranca, 'DD/MM/YYYY');
  ELSE
    v_mes := date_trunc('month', NOW() AT TIME ZONE 'America/Sao_Paulo')::date;
  END IF;

  IF p_modulo_id IS NOT NULL
     OR NOT EXISTS (SELECT 1 FROM produto_modulos m WHERE m.produto_id = p_produto_id AND m.ativo) THEN
    v_banco := requerimento_banco_do_destino(v_req.cliente_id, p_produto_id, p_modulo_id, v_mes);
  ELSE
    -- Sem módulo num produto com módulos: só se todos os módulos vão para o mesmo banco
    SELECT array_agg(DISTINCT x.banco), count(*) FILTER (WHERE x.banco IS NULL)
      INTO v_bancos, v_sem_banco
      FROM (SELECT requerimento_banco_do_destino(v_req.cliente_id, p_produto_id, m.id, v_mes) AS banco
              FROM produto_modulos m WHERE m.produto_id = p_produto_id AND m.ativo) x;
    IF v_sem_banco > 0 OR array_length(v_bancos, 1) <> 1 THEN
      RAISE EXCEPTION 'Os módulos deste produto ficam em bancos diferentes: escolha o módulo.'
        USING ERRCODE = 'check_violation';
    END IF;
    v_banco := v_bancos[1];
  END IF;

  IF v_banco IS NULL THEN
    RAISE EXCEPTION 'Nenhum banco do cliente cobre esse produto/módulo no mês de cobrança.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT rb.produto_id, rb.modulo_id, rb.banco_id INTO v_atual
    FROM requerimentos_bancos rb WHERE rb.requerimento_id = p_requerimento_id;
  IF FOUND AND v_atual.produto_id IS NOT DISTINCT FROM p_produto_id
     AND v_atual.modulo_id IS NOT DISTINCT FROM p_modulo_id THEN
    RETURN v_atual.banco_id;
  END IF;

  INSERT INTO requerimentos_bancos (requerimento_id, banco_id, produto_id, modulo_id, motivo)
  VALUES (p_requerimento_id, v_banco, p_produto_id, p_modulo_id, 'Escolhido no lançamento do requerimento')
  ON CONFLICT (requerimento_id) DO UPDATE
     SET banco_id = EXCLUDED.banco_id,
         produto_id = EXCLUDED.produto_id,
         modulo_id = EXCLUDED.modulo_id,
         motivo = EXCLUDED.motivo;

  RETURN v_banco;
END;
$$;

COMMENT ON FUNCTION public.requerimento_definir_destino(UUID, UUID, UUID) IS
  'Produto/módulo escolhido no lançamento do requerimento de empresa liberada; grava o banco que sai deles.';

-- ---------------------------------------------------------------------
-- Permissões de execução
-- ---------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.requerimento_banco_do_destino(UUID, UUID, UUID, DATE)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
  public.requerimento_destinos(UUID, UUID),
  public.requerimento_definir_destino(UUID, UUID, UUID)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.requerimento_destinos(UUID, UUID),
  public.requerimento_definir_destino(UUID, UUID, UUID)
TO authenticated, service_role;
