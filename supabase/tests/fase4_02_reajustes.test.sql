-- =====================================================================
-- Teste da migration 20261028000002_fase4_reajustes_legado
-- (docs/especificacoes/Modelagem_Fase4.md, seção 6).
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", seguido das contagens da carga. O erro
-- desfaz tudo o que o teste gravou (inclusive os reajustes criados no legado).
-- Qualquer outra mensagem de erro diz qual verificação falhou.
-- =====================================================================
DO $teste$
DECLARE
  v_empresa uuid;
  v_padrao uuid;
  v_legado uuid;
  v_r record;
  v_n int;
  v_espelhados int;
  v_outros_tipos int;
  v_sem_banco int;
BEGIN
  SELECT e.id, b.id INTO v_empresa, v_padrao
    FROM empresas e JOIN bancos_horas b ON b.empresa_id = e.id AND b.padrao AND b.ativo
   WHERE e.modelo_calculo = 'legado'
   ORDER BY e.nome_abreviado LIMIT 1;
  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'Precondição: precisa de uma empresa em Legado com Banco padrão ativo';
  END IF;

  -- -------------------------------------------------------------------
  -- 1. Estrutura e segurança
  -- -------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'bancos_horas_reajustes' AND column_name = 'reajuste_legado_id') THEN
    RAISE EXCEPTION 'bancos_horas_reajustes sem a coluna reajuste_legado_id';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes
                  WHERE tablename = 'bancos_horas_reajustes' AND indexname = 'bancos_horas_reajustes_legado_uq') THEN
    RAISE EXCEPTION 'Falta o índice único de reajuste_legado_id';
  END IF;
  SELECT count(*) INTO v_n FROM pg_proc
   WHERE proname IN ('espelhar_reajuste_legado', 'trg_sinc_reajuste_legado')
     AND pronamespace = 'public'::regnamespace
     AND prosecdef AND proconfig @> ARRAY['search_path=public'];
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'As funções do espelho precisam de SECURITY DEFINER e search_path fixo';
  END IF;
  IF has_function_privilege('authenticated', 'public.espelhar_reajuste_legado(uuid, boolean)', 'execute')
     OR has_function_privilege('anon', 'public.espelhar_reajuste_legado(uuid, boolean)', 'execute') THEN
    RAISE EXCEPTION 'espelhar_reajuste_legado executável pela API';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger
                  WHERE tgname = 'trg_sinc_banco_horas_reajustes'
                    AND tgrelid = 'public.banco_horas_reajustes'::regclass) THEN
    RAISE EXCEPTION 'Falta o gatilho do espelho em banco_horas_reajustes';
  END IF;

  -- -------------------------------------------------------------------
  -- 2. Conversão das horas como o legado lê (converterHorasParaMinutos)
  -- -------------------------------------------------------------------
  IF bancos_horas_minutos_legado('02:30') <> 150
     OR bancos_horas_minutos_legado('10:30:00') <> 630
     OR bancos_horas_minutos_legado('-4:-40') <> -280
     OR bancos_horas_minutos_legado('1:75') <> 135
     OR bancos_horas_minutos_legado('10') <> 600
     OR bancos_horas_minutos_legado('1.5') <> 60
     OR bancos_horas_minutos_legado('abc') <> 0
     OR bancos_horas_minutos_legado('') <> 0
     OR bancos_horas_minutos_legado(NULL) <> 0 THEN
    RAISE EXCEPTION 'bancos_horas_minutos_legado não lê as horas como o legado';
  END IF;

  -- -------------------------------------------------------------------
  -- 3. Carga: todo reajuste que vale no legado tem espelho igual
  -- -------------------------------------------------------------------
  -- Reajuste espelhado com valor diferente do legado
  SELECT count(*) INTO v_n
    FROM bancos_horas_reajustes n
    JOIN banco_horas_reajustes r ON r.id = n.reajuste_legado_id
   WHERE n.mes <> r.mes OR n.ano <> r.ano OR n.ativo <> COALESCE(r.ativo, true)
      OR n.minutos * (CASE n.tipo WHEN 'entrada' THEN 1 ELSE -1 END)
         <> bancos_horas_minutos_legado(r.valor_reajuste_horas) * (CASE r.tipo_reajuste WHEN 'entrada' THEN 1 ELSE -1 END)
      OR n.tickets * (CASE n.tipo WHEN 'entrada' THEN 1 ELSE -1 END)
         <> COALESCE(r.valor_reajuste_tickets, 0) * (CASE r.tipo_reajuste WHEN 'entrada' THEN 1 ELSE -1 END);
  IF v_n > 0 THEN
    RAISE EXCEPTION '% reajuste(s) espelhado(s) diferente(s) do legado', v_n;
  END IF;

  -- Reajuste que vale no legado e ficou sem espelho
  SELECT count(*) INTO v_n
    FROM banco_horas_reajustes r
    JOIN empresas e ON e.id = r.empresa_id AND e.modelo_calculo = 'legado'
   WHERE r.tipo_reajuste IN ('entrada', 'saida')
     AND EXISTS (SELECT 1 FROM bancos_horas b WHERE b.empresa_id = r.empresa_id AND b.padrao AND b.ativo)
     AND (bancos_horas_minutos_legado(r.valor_reajuste_horas) <> 0 OR COALESCE(r.valor_reajuste_tickets, 0) <> 0)
     -- sinais trocados entre horas e tickets ou ticket fracionado não cabem no modelo novo (viram falha)
     AND sign(bancos_horas_minutos_legado(r.valor_reajuste_horas)) * sign(COALESCE(r.valor_reajuste_tickets, 0)) >= 0
     AND COALESCE(r.valor_reajuste_tickets, 0) = trunc(COALESCE(r.valor_reajuste_tickets, 0))
     AND NOT EXISTS (SELECT 1 FROM bancos_horas_reajustes n WHERE n.reajuste_legado_id = r.id);
  IF v_n > 0 THEN
    RAISE EXCEPTION '% reajuste(s) do legado sem espelho', v_n;
  END IF;

  -- Os tipos legados positivo/negativo não entram (o cálculo legado os ignora)
  IF EXISTS (SELECT 1 FROM bancos_horas_reajustes n JOIN banco_horas_reajustes r ON r.id = n.reajuste_legado_id
              WHERE r.tipo_reajuste NOT IN ('entrada', 'saida')) THEN
    RAISE EXCEPTION 'Reajuste positivo/negativo foi espelhado';
  END IF;

  SELECT count(*) INTO v_espelhados FROM bancos_horas_reajustes WHERE reajuste_legado_id IS NOT NULL;
  SELECT count(*) INTO v_outros_tipos FROM banco_horas_reajustes WHERE tipo_reajuste NOT IN ('entrada', 'saida');
  SELECT count(*) INTO v_sem_banco FROM banco_horas_reajustes r
   WHERE tipo_reajuste IN ('entrada', 'saida')
     AND NOT EXISTS (SELECT 1 FROM bancos_horas b WHERE b.empresa_id = r.empresa_id AND b.padrao AND b.ativo);

  -- -------------------------------------------------------------------
  -- 4. Espelho: incluir, alterar, inativar, reativar e excluir
  -- -------------------------------------------------------------------
  INSERT INTO banco_horas_reajustes (empresa_id, mes, ano, valor_reajuste_horas, valor_reajuste_tickets, tipo_reajuste, observacao, ativo)
  VALUES (v_empresa, 1, 2020, '02:30', 0, 'entrada', 'Teste do espelho', true)
  RETURNING id INTO v_legado;
  SELECT * INTO v_r FROM bancos_horas_reajustes WHERE reajuste_legado_id = v_legado;
  IF NOT FOUND OR v_r.banco_id <> v_padrao OR v_r.tipo <> 'entrada' OR v_r.minutos <> 150 OR v_r.tickets <> 0
     OR v_r.origem <> 'carga_legado' OR v_r.justificativa <> 'Teste do espelho' OR NOT v_r.ativo THEN
    RAISE EXCEPTION 'Reajuste incluído no legado não foi espelhado certo: %', to_jsonb(v_r);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auditoria_alteracoes
                  WHERE tabela = 'bancos_horas_reajustes' AND registro_id = v_r.id::text
                    AND acao = 'insert' AND origem = 'sincronizacao') THEN
    RAISE EXCEPTION 'O espelho não foi para a auditoria como sincronização';
  END IF;

  UPDATE banco_horas_reajustes SET valor_reajuste_horas = '03:00' WHERE id = v_legado;
  IF (SELECT minutos FROM bancos_horas_reajustes WHERE reajuste_legado_id = v_legado) <> 180 THEN
    RAISE EXCEPTION 'Alteração do valor não foi espelhada';
  END IF;

  UPDATE banco_horas_reajustes SET ativo = false WHERE id = v_legado;
  SELECT * INTO v_r FROM bancos_horas_reajustes WHERE reajuste_legado_id = v_legado;
  IF v_r.ativo OR v_r.inativado_em IS NULL OR v_r.motivo_inativacao IS NULL THEN
    RAISE EXCEPTION 'Inativação não foi espelhada';
  END IF;

  UPDATE banco_horas_reajustes SET ativo = true WHERE id = v_legado;
  SELECT * INTO v_r FROM bancos_horas_reajustes WHERE reajuste_legado_id = v_legado;
  IF NOT v_r.ativo OR v_r.inativado_em IS NOT NULL OR v_r.motivo_inativacao IS NOT NULL THEN
    RAISE EXCEPTION 'Reativação não foi espelhada';
  END IF;

  DELETE FROM banco_horas_reajustes WHERE id = v_legado;
  SELECT * INTO v_r FROM bancos_horas_reajustes WHERE reajuste_legado_id = v_legado;
  IF NOT FOUND OR v_r.ativo THEN
    RAISE EXCEPTION 'Exclusão no legado não inativou o espelho';
  END IF;

  -- Valor negativo numa entrada vira saída (o legado subtrai)
  INSERT INTO banco_horas_reajustes (empresa_id, mes, ano, valor_reajuste_horas, valor_reajuste_tickets, tipo_reajuste, ativo)
  VALUES (v_empresa, 1, 2020, '-01:00', 0, 'entrada', true)
  RETURNING id INTO v_legado;
  SELECT * INTO v_r FROM bancos_horas_reajustes WHERE reajuste_legado_id = v_legado;
  IF NOT FOUND OR v_r.tipo <> 'saida' OR v_r.minutos <> 60 THEN
    RAISE EXCEPTION 'Entrada negativa não virou saída: %', to_jsonb(v_r);
  END IF;

  -- Segmento sem banco de mesmo nome: vai para o Banco padrão, com o segmento na justificativa
  INSERT INTO banco_horas_reajustes (empresa_id, mes, ano, valor_reajuste_horas, valor_reajuste_tickets, tipo_reajuste, observacao, empresa_segmentada, ativo)
  VALUES (v_empresa, 1, 2020, '01:00', 0, 'saida', 'Ajuste do segmento', 'SEGMENTO INEXISTENTE', true)
  RETURNING id INTO v_legado;
  SELECT * INTO v_r FROM bancos_horas_reajustes WHERE reajuste_legado_id = v_legado;
  IF NOT FOUND OR v_r.banco_id <> v_padrao OR v_r.justificativa NOT LIKE '%SEGMENTO INEXISTENTE%' THEN
    RAISE EXCEPTION 'Reajuste de segmento sem banco não foi para o padrão com o segmento: %', to_jsonb(v_r);
  END IF;

  -- Tipo legado e reajuste sem valor: não espelham
  INSERT INTO banco_horas_reajustes (empresa_id, mes, ano, valor_reajuste_horas, valor_reajuste_tickets, tipo_reajuste, ativo)
  VALUES (v_empresa, 1, 2020, '01:00', 0, 'positivo', true)
  RETURNING id INTO v_legado;
  IF EXISTS (SELECT 1 FROM bancos_horas_reajustes WHERE reajuste_legado_id = v_legado) THEN
    RAISE EXCEPTION 'Reajuste positivo foi espelhado';
  END IF;
  INSERT INTO banco_horas_reajustes (empresa_id, mes, ano, valor_reajuste_horas, valor_reajuste_tickets, tipo_reajuste, ativo)
  VALUES (v_empresa, 1, 2020, 'abc', 0, 'entrada', true)
  RETURNING id INTO v_legado;
  IF EXISTS (SELECT 1 FROM bancos_horas_reajustes WHERE reajuste_legado_id = v_legado) THEN
    RAISE EXCEPTION 'Reajuste sem valor foi espelhado';
  END IF;

  -- -------------------------------------------------------------------
  -- 5. Nunca bloqueia o legado: o que não cabe vira falha de sincronização
  -- -------------------------------------------------------------------
  SELECT count(*) INTO v_n FROM sincronizacao_legado_falhas WHERE tabela_origem = 'banco_horas_reajustes';
  INSERT INTO banco_horas_reajustes (empresa_id, mes, ano, valor_reajuste_horas, valor_reajuste_tickets, tipo_reajuste, ativo)
  VALUES (v_empresa, 1, 2020, '-01:00', 2, 'entrada', true)
  RETURNING id INTO v_legado;
  INSERT INTO banco_horas_reajustes (empresa_id, mes, ano, valor_reajuste_horas, valor_reajuste_tickets, tipo_reajuste, ativo)
  VALUES (v_empresa, 1, 2020, '00:00', 1.5, 'entrada', true);
  IF (SELECT count(*) FROM sincronizacao_legado_falhas WHERE tabela_origem = 'banco_horas_reajustes') <> v_n + 2 THEN
    RAISE EXCEPTION 'Reajuste que não cabe no modelo novo não virou falha de sincronização';
  END IF;
  IF EXISTS (SELECT 1 FROM bancos_horas_reajustes WHERE reajuste_legado_id = v_legado) THEN
    RAISE EXCEPTION 'Reajuste com sinais trocados foi espelhado';
  END IF;

  -- -------------------------------------------------------------------
  -- 6. Empresa liberada: o espelho para
  -- -------------------------------------------------------------------
  UPDATE empresas SET modelo_calculo = 'multiplo' WHERE id = v_empresa;
  INSERT INTO banco_horas_reajustes (empresa_id, mes, ano, valor_reajuste_horas, valor_reajuste_tickets, tipo_reajuste, ativo)
  VALUES (v_empresa, 1, 2020, '01:00', 0, 'entrada', true)
  RETURNING id INTO v_legado;
  IF EXISTS (SELECT 1 FROM bancos_horas_reajustes WHERE reajuste_legado_id = v_legado) THEN
    RAISE EXCEPTION 'Reajuste de empresa liberada foi espelhado';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido (carga: % espelhados; % positivo/negativo fora; % sem Banco padrão)',
    v_espelhados, v_outros_tipos, v_sem_banco;
END
$teste$;
