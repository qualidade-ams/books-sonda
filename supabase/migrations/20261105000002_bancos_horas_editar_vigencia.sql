-- =====================================================================
-- Editar vigência de baseline ou de repasse (tela Empresas → banco)
--
-- Até aqui só havia bancos_horas_nova_vigencia (20261023000001). Agora
-- qualquer vigência, inclusive as anteriores, pode ter os valores e os meses
-- corrigidos, com motivo (vai para a auditoria por app.motivo).
--
-- Decisões do usuário (05/11/2026):
--   - edita valores e meses; a vigência vizinha acompanha a fronteira, sem
--     buraco e sem sobreposição. A primeira começa sempre no início do banco
--     e só a última fica em aberto;
--   - mês fechado não bloqueia: o resultado dele continua congelado no
--     fechamento até a retificação do Book (D-11); os meses abertos já usam
--     o valor novo.
--
-- As regras da Fase 1 continuam nos gatilhos e nas restrições (baseline
-- obrigatório pelo tipo, percentuais do repasse por período, vigências sem
-- sobreposição, verificada a cada comando). Por isso a ordem das gravações:
-- primeiro encolhe a vizinha que perde meses, depois grava a vigência e por
-- fim estica a vizinha que ganha meses.
-- =====================================================================

-- p_tipo: 'baseline' ({baseline_minutos, baseline_tickets, credito}) ou
-- 'repasse' ({percentual_mensal, percentual_dentro_periodo, percentual_entre_periodos}).
-- p_inicio: dia 1 do primeiro mês. p_ate: dia 1 do último mês; nulo = em aberto.
CREATE OR REPLACE FUNCTION public.bancos_horas_editar_vigencia(
  p_vigencia_id UUID, p_tipo TEXT, p_inicio DATE, p_ate DATE, p_valores JSONB, p_motivo TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_motivo TEXT;
  v_valores JSONB := coalesce(p_valores, '{}'::jsonb);
  v_fim DATE;
  v_atual RECORD;
  v_inicio_banco DATE;
  v_anterior RECORD;
  v_seguinte RECORD;
  v_tem_anterior BOOLEAN;
  v_tem_seguinte BOOLEAN;
BEGIN
  IF NOT pode_editar_bancos_horas() THEN
    RAISE EXCEPTION 'Sem permissão para alterar os bancos de horas.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_tipo NOT IN ('baseline', 'repasse') THEN
    RAISE EXCEPTION 'Tipo de vigência desconhecido: %.', p_tipo;
  END IF;
  v_motivo := exigir_motivo(p_motivo);
  IF p_inicio IS NULL OR extract(day FROM p_inicio) <> 1 THEN
    RAISE EXCEPTION 'A vigência começa no dia 1 do mês.';
  END IF;
  IF p_ate IS NOT NULL AND extract(day FROM p_ate) <> 1 THEN
    RAISE EXCEPTION 'Informe o último mês da vigência.';
  END IF;
  v_fim := CASE WHEN p_ate IS NULL THEN NULL
                ELSE (p_ate + INTERVAL '1 month' - INTERVAL '1 day')::date END;
  IF v_fim IS NOT NULL AND v_fim < p_inicio THEN
    RAISE EXCEPTION 'O último mês da vigência é antes do primeiro.';
  END IF;

  -- Vigência, banco e vizinhas, travados até o fim da transação
  IF p_tipo = 'baseline' THEN
    SELECT id, banco_id, data_inicio, data_fim INTO v_atual
      FROM bancos_horas_baseline WHERE id = p_vigencia_id FOR UPDATE;
  ELSE
    SELECT id, banco_id, data_inicio, data_fim INTO v_atual
      FROM bancos_horas_repasse WHERE id = p_vigencia_id FOR UPDATE;
  END IF;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vigência não encontrada.';
  END IF;
  SELECT inicio_vigencia INTO v_inicio_banco FROM bancos_horas WHERE id = v_atual.banco_id FOR UPDATE;

  IF p_tipo = 'baseline' THEN
    SELECT id, data_inicio, data_fim INTO v_anterior FROM bancos_horas_baseline
     WHERE banco_id = v_atual.banco_id AND data_inicio < v_atual.data_inicio
     ORDER BY data_inicio DESC LIMIT 1 FOR UPDATE;
    v_tem_anterior := FOUND;
    SELECT id, data_inicio, data_fim INTO v_seguinte FROM bancos_horas_baseline
     WHERE banco_id = v_atual.banco_id AND data_inicio > v_atual.data_inicio
     ORDER BY data_inicio LIMIT 1 FOR UPDATE;
    v_tem_seguinte := FOUND;
  ELSE
    SELECT id, data_inicio, data_fim INTO v_anterior FROM bancos_horas_repasse
     WHERE banco_id = v_atual.banco_id AND data_inicio < v_atual.data_inicio
     ORDER BY data_inicio DESC LIMIT 1 FOR UPDATE;
    v_tem_anterior := FOUND;
    SELECT id, data_inicio, data_fim INTO v_seguinte FROM bancos_horas_repasse
     WHERE banco_id = v_atual.banco_id AND data_inicio > v_atual.data_inicio
     ORDER BY data_inicio LIMIT 1 FOR UPDATE;
    v_tem_seguinte := FOUND;
  END IF;

  -- Fronteiras: sem buraco, sem sobreposição e sem vizinha vazia
  IF NOT v_tem_anterior AND p_inicio <> v_inicio_banco THEN
    RAISE EXCEPTION 'A primeira vigência começa no início do banco (%).', to_char(v_inicio_banco, 'MM/YYYY');
  END IF;
  IF v_tem_anterior AND p_inicio <= v_anterior.data_inicio THEN
    RAISE EXCEPTION 'A vigência anterior (desde %) ficaria sem nenhum mês.', to_char(v_anterior.data_inicio, 'MM/YYYY');
  END IF;
  IF NOT v_tem_seguinte AND v_fim IS NOT NULL THEN
    RAISE EXCEPTION 'A última vigência fica em aberto: para encerrá-la, registre uma vigência nova.';
  END IF;
  IF v_tem_seguinte AND v_fim IS NULL THEN
    RAISE EXCEPTION 'Só a última vigência fica em aberto.';
  END IF;
  IF v_tem_seguinte AND v_seguinte.data_fim IS NOT NULL AND v_fim >= v_seguinte.data_fim THEN
    RAISE EXCEPTION 'A vigência seguinte (desde %) ficaria sem nenhum mês.', to_char(v_seguinte.data_inicio, 'MM/YYYY');
  END IF;

  PERFORM set_config('app.motivo', v_motivo, true);

  IF p_tipo = 'baseline' THEN
    -- 1. Encolhe a vizinha que perde meses
    IF v_tem_anterior AND p_inicio < v_atual.data_inicio THEN
      UPDATE bancos_horas_baseline SET data_fim = p_inicio - 1 WHERE id = v_anterior.id;
    END IF;
    IF v_tem_seguinte AND v_fim > v_atual.data_fim THEN
      UPDATE bancos_horas_baseline SET data_inicio = v_fim + 1 WHERE id = v_seguinte.id;
    END IF;
    -- 2. A vigência, com os valores e os meses novos
    UPDATE bancos_horas_baseline
       SET data_inicio = p_inicio,
           data_fim = v_fim,
           baseline_minutos = (v_valores ->> 'baseline_minutos')::integer,
           baseline_tickets = (v_valores ->> 'baseline_tickets')::integer,
           credito = coalesce(v_valores ->> 'credito', credito),
           motivo = v_motivo
     WHERE id = v_atual.id;
    -- 3. Estica a vizinha que ganha meses
    IF v_tem_anterior AND p_inicio > v_atual.data_inicio THEN
      UPDATE bancos_horas_baseline SET data_fim = p_inicio - 1 WHERE id = v_anterior.id;
    END IF;
    IF v_tem_seguinte AND v_fim < v_atual.data_fim THEN
      UPDATE bancos_horas_baseline SET data_inicio = v_fim + 1 WHERE id = v_seguinte.id;
    END IF;
  ELSE
    IF v_tem_anterior AND p_inicio < v_atual.data_inicio THEN
      UPDATE bancos_horas_repasse SET data_fim = p_inicio - 1 WHERE id = v_anterior.id;
    END IF;
    IF v_tem_seguinte AND v_fim > v_atual.data_fim THEN
      UPDATE bancos_horas_repasse SET data_inicio = v_fim + 1 WHERE id = v_seguinte.id;
    END IF;
    UPDATE bancos_horas_repasse
       SET data_inicio = p_inicio,
           data_fim = v_fim,
           percentual_mensal = (v_valores ->> 'percentual_mensal')::numeric,
           percentual_dentro_periodo = (v_valores ->> 'percentual_dentro_periodo')::numeric,
           percentual_entre_periodos = (v_valores ->> 'percentual_entre_periodos')::numeric,
           motivo = v_motivo
     WHERE id = v_atual.id;
    IF v_tem_anterior AND p_inicio > v_atual.data_inicio THEN
      UPDATE bancos_horas_repasse SET data_fim = p_inicio - 1 WHERE id = v_anterior.id;
    END IF;
    IF v_tem_seguinte AND v_fim < v_atual.data_fim THEN
      UPDATE bancos_horas_repasse SET data_inicio = v_fim + 1 WHERE id = v_seguinte.id;
    END IF;
  END IF;

  PERFORM set_config('app.motivo', '', true);
END;
$$;

COMMENT ON FUNCTION public.bancos_horas_editar_vigencia(UUID, TEXT, DATE, DATE, JSONB, TEXT) IS
  'Corrige valores e meses de uma vigência de baseline ou repasse; a vizinha acompanha a fronteira. Mês fechado fica congelado até a retificação.';

REVOKE ALL ON FUNCTION public.bancos_horas_editar_vigencia(UUID, TEXT, DATE, DATE, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bancos_horas_editar_vigencia(UUID, TEXT, DATE, DATE, JSONB, TEXT) TO authenticated, service_role;
