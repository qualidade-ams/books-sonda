-- =====================================================================
-- Fase 4 — migration 25: reajustes do legado no modelo novo
-- (docs/especificacoes/Modelagem_Fase4.md, seção 6; P1 decidida em 28/10/2026)
--
-- Enquanto a empresa estiver em Legado, os reajustes continuam sendo lançados no
-- Controle atual. Sem eles o saldo do modelo novo diverge, e na liberação (Fase 5)
-- o banco começaria com um saldo diferente do que o cliente vê.
--
--   bancos_horas_reajustes.reajuste_legado_id   reajuste do legado que o originou
--   bancos_horas_minutos_legado(texto)          horas em minutos como o legado lê
--   espelhar_reajuste_legado(id, excluido)      cria, atualiza ou inativa o espelho
--   trg_sinc_banco_horas_reajustes              espelho a cada gravação no legado;
--                                               nunca bloqueia o legado
--   carga                                       todos os reajustes, desde o primeiro
--
-- Só os tipos entrada e saida, ativos e inativos: o cálculo legado ignora positivo e
-- negativo. Reajuste comum vai para o Banco padrão; o de segmento, para o banco de
-- mesmo nome, ou para o padrão com o segmento na justificativa. A origem no modelo
-- novo é carga_legado, que não pede retificação do Book (migration 20).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Vínculo com o legado
-- ---------------------------------------------------------------------

-- Sem FK: a tabela do legado sai na Fase 8
ALTER TABLE bancos_horas_reajustes ADD COLUMN IF NOT EXISTS reajuste_legado_id UUID;
CREATE UNIQUE INDEX IF NOT EXISTS bancos_horas_reajustes_legado_uq
  ON bancos_horas_reajustes (reajuste_legado_id) WHERE reajuste_legado_id IS NOT NULL;
COMMENT ON COLUMN bancos_horas_reajustes.reajuste_legado_id IS
  'banco_horas_reajustes.id do legado espelhado (Fase 4); nulo nos lançados no modelo novo';

-- ---------------------------------------------------------------------
-- 2. Horas em minutos como o legado lê (converterHorasParaMinutos)
--    "HH:MM" (os sinais de menos são ignorados e o primeiro caractere decide o
--    sinal; minutos acima de 59 somam), ou só horas inteiras; o que não for
--    número vale 0.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bancos_horas_minutos_legado(p_texto TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_valor TEXT := trim(COALESCE(p_texto, ''));
  v_limpo TEXT;
  v_horas INTEGER;
  v_minutos INTEGER;
BEGIN
  IF v_valor IN ('', 'null', 'undefined', 'NaN') THEN
    RETURN 0;
  END IF;
  IF position(':' IN v_valor) > 0 THEN
    v_limpo := replace(v_valor, '-', '');
    v_horas := substring(split_part(v_limpo, ':', 1) FROM '^\s*(\d+)')::int;
    v_minutos := substring(split_part(v_limpo, ':', 2) FROM '^\s*(\d+)')::int;
    IF v_horas IS NULL OR v_minutos IS NULL THEN
      RETURN 0;
    END IF;
    RETURN (v_horas * 60 + v_minutos) * (CASE WHEN left(v_valor, 1) = '-' THEN -1 ELSE 1 END);
  END IF;
  v_horas := substring(v_valor FROM '^([+-]?\d+)')::int;
  RETURN COALESCE(v_horas, 0) * 60;
END;
$$;

-- ---------------------------------------------------------------------
-- 3. Espelho de um reajuste do legado
--    Devolve o que fez: espelhado, atualizado, inativado, ignorado (tipo legado,
--    sem valor, empresa fora do modelo legado) ou sem_banco. Levanta erro quando o
--    reajuste não cabe no modelo novo (horas e tickets com sinais trocados, ticket
--    fracionado): o gatilho registra como falha de sincronização.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.espelhar_reajuste_legado(p_reajuste_id UUID, p_excluido BOOLEAN DEFAULT false)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r banco_horas_reajustes%ROWTYPE;
  v_espelho bancos_horas_reajustes%ROWTYPE;
  v_minutos INTEGER;
  v_tickets NUMERIC;
  v_tipo TEXT;
  v_banco UUID;
  v_justificativa TEXT;
  v_valido BOOLEAN;
  v_motivo_inativacao TEXT;
BEGIN
  SELECT * INTO v_espelho FROM bancos_horas_reajustes WHERE reajuste_legado_id = p_reajuste_id;

  -- Excluído no legado: o espelho fica inativo (no modelo novo nada é apagado)
  IF p_excluido THEN
    IF v_espelho.id IS NULL OR NOT v_espelho.ativo THEN
      RETURN 'ignorado';
    END IF;
    UPDATE bancos_horas_reajustes
       SET ativo = false, inativado_em = NOW(), motivo_inativacao = 'Excluído no Controle atual'
     WHERE id = v_espelho.id;
    RETURN 'inativado';
  END IF;

  SELECT * INTO r FROM banco_horas_reajustes WHERE id = p_reajuste_id;
  IF NOT FOUND THEN
    RETURN 'ignorado';
  END IF;

  -- Empresa liberada (ou fora do cadastro novo): o legado não manda mais
  IF NOT EXISTS (SELECT 1 FROM empresas WHERE id = r.empresa_id AND modelo_calculo = 'legado') THEN
    RETURN 'ignorado';
  END IF;

  v_minutos := bancos_horas_minutos_legado(r.valor_reajuste_horas);
  v_tickets := COALESCE(r.valor_reajuste_tickets, 0);
  v_valido := r.tipo_reajuste IN ('entrada', 'saida') AND (v_minutos <> 0 OR v_tickets <> 0);

  IF v_valido THEN
    IF sign(v_minutos) * sign(v_tickets) < 0 THEN
      RAISE EXCEPTION 'Reajuste com horas e tickets de sinais trocados não cabe no modelo novo'
        USING ERRCODE = 'check_violation';
    END IF;
    IF v_tickets <> trunc(v_tickets) THEN
      RAISE EXCEPTION 'Reajuste com ticket fracionado não cabe no modelo novo' USING ERRCODE = 'check_violation';
    END IF;

    -- Valor negativo inverte o tipo: o legado soma entradas e saídas com o sinal
    v_tipo := r.tipo_reajuste;
    IF v_minutos < 0 OR v_tickets < 0 THEN
      v_tipo := CASE v_tipo WHEN 'entrada' THEN 'saida' ELSE 'entrada' END;
    END IF;

    -- Banco: o do segmento (mesmo nome), senão o Banco padrão ativo
    v_justificativa := COALESCE(NULLIF(trim(r.observacao), ''), 'Reajuste lançado no Controle atual');
    IF NULLIF(trim(r.empresa_segmentada), '') IS NOT NULL THEN
      SELECT id INTO v_banco FROM bancos_horas
       WHERE empresa_id = r.empresa_id AND upper(trim(nome)) = upper(trim(r.empresa_segmentada))
       ORDER BY ativo DESC, created_at
       LIMIT 1;
      IF v_banco IS NULL THEN
        v_justificativa := v_justificativa || format(' (segmento %s, sem banco próprio)', trim(r.empresa_segmentada));
      END IF;
    END IF;
    IF v_banco IS NULL THEN
      SELECT id INTO v_banco FROM bancos_horas WHERE empresa_id = r.empresa_id AND padrao AND ativo;
    END IF;
    IF v_banco IS NULL THEN
      RETURN 'sem_banco';
    END IF;
  END IF;

  -- Deixou de valer (tipo legado ou sem valor): inativa o espelho, se houver
  IF NOT v_valido THEN
    IF v_espelho.id IS NOT NULL AND v_espelho.ativo THEN
      UPDATE bancos_horas_reajustes
         SET ativo = false, inativado_em = NOW(), motivo_inativacao = 'Deixou de valer no Controle atual'
       WHERE id = v_espelho.id;
      RETURN 'inativado';
    END IF;
    RETURN 'ignorado';
  END IF;

  v_motivo_inativacao := CASE WHEN COALESCE(r.ativo, true) THEN NULL ELSE 'Inativado no Controle atual' END;

  IF v_espelho.id IS NULL THEN
    INSERT INTO bancos_horas_reajustes
      (banco_id, mes, ano, tipo, minutos, tickets, justificativa, origem, ativo,
       inativado_em, motivo_inativacao, reajuste_legado_id, created_at)
    VALUES
      (v_banco, r.mes, r.ano, v_tipo, abs(v_minutos), abs(v_tickets)::int, v_justificativa, 'carga_legado',
       COALESCE(r.ativo, true),
       CASE WHEN COALESCE(r.ativo, true) THEN NULL ELSE NOW() END,
       v_motivo_inativacao, r.id, r.created_at);
    RETURN 'espelhado';
  END IF;

  UPDATE bancos_horas_reajustes
     SET banco_id = v_banco, mes = r.mes, ano = r.ano, tipo = v_tipo,
         minutos = abs(v_minutos), tickets = abs(v_tickets)::int, justificativa = v_justificativa,
         ativo = COALESCE(r.ativo, true),
         inativado_em = CASE WHEN COALESCE(r.ativo, true) THEN NULL ELSE COALESCE(inativado_em, NOW()) END,
         motivo_inativacao = v_motivo_inativacao
   WHERE id = v_espelho.id;
  RETURN 'atualizado';
END;
$$;

-- ---------------------------------------------------------------------
-- 4. Gatilho no legado (como os da Fase 1: nunca bloqueia a gravação)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_sinc_reajuste_legado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
  v_origem_anterior TEXT := COALESCE(current_setting('app.origem', true), '');
BEGIN
  BEGIN
    PERFORM set_config('app.origem', 'sincronizacao', true);
    PERFORM espelhar_reajuste_legado(v_id, TG_OP = 'DELETE');
    PERFORM set_config('app.origem', v_origem_anterior, true);
  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.origem', v_origem_anterior, true);
    PERFORM registrar_falha_sincronizacao(TG_TABLE_NAME, v_id::text, TG_OP, SQLSTATE, SQLERRM);
  END;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.espelhar_reajuste_legado(UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_sinc_reajuste_legado() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sinc_banco_horas_reajustes ON banco_horas_reajustes;
CREATE TRIGGER trg_sinc_banco_horas_reajustes
  AFTER INSERT OR UPDATE OR DELETE ON banco_horas_reajustes
  FOR EACH ROW EXECUTE FUNCTION trg_sinc_reajuste_legado();

-- ---------------------------------------------------------------------
-- 5. Carga: todos os reajustes, desde o primeiro (P1)
--    O que não cabe no modelo novo vira falha de sincronização, sem parar a carga.
-- ---------------------------------------------------------------------

DO $$
DECLARE
  v_r RECORD;
  v_resultado TEXT;
  v_contagem JSONB := '{}'::jsonb;
BEGIN
  PERFORM set_config('app.origem', 'carga', true);
  FOR v_r IN SELECT id FROM banco_horas_reajustes ORDER BY ano, mes, created_at LOOP
    BEGIN
      v_resultado := espelhar_reajuste_legado(v_r.id, false);
    EXCEPTION WHEN OTHERS THEN
      PERFORM registrar_falha_sincronizacao('banco_horas_reajustes', v_r.id::text, 'CARGA', SQLSTATE, SQLERRM);
      v_resultado := 'falha';
    END;
    v_contagem := jsonb_set(v_contagem, ARRAY[v_resultado],
                            to_jsonb(COALESCE((v_contagem ->> v_resultado)::int, 0) + 1));
  END LOOP;
  PERFORM set_config('app.origem', '', true);
  RAISE NOTICE 'Carga dos reajustes do legado: %', v_contagem;
END $$;
