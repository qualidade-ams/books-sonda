-- =====================================================================
-- Teste da migration 20261023000003_fase3_requerimentos_controle
-- (docs/especificacoes/Modelagem_Fase3.md, seção 7).
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou
-- (inclusive as linhas criadas no legado). Qualquer outra mensagem de erro diz
-- qual verificação falhou.
-- =====================================================================
DO $teste$
DECLARE
  v_sem_acesso uuid := gen_random_uuid();
  v_empresa uuid := gen_random_uuid();
  v_banco uuid;
  v_r1 uuid;
  v_r2 uuid;
  v_r record;
  v_n int;
  v_falhou boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'bancos_horas_requerimentos_controle'
                    AND pronamespace = 'public'::regnamespace
                    AND prosecdef AND proconfig @> ARRAY['search_path=public']) THEN
    RAISE EXCEPTION 'bancos_horas_requerimentos_controle ausente, sem SECURITY DEFINER ou sem search_path fixo';
  END IF;
  IF has_function_privilege('anon', 'public.bancos_horas_requerimentos_controle(uuid, integer, integer)', 'execute') THEN
    RAISE EXCEPTION 'bancos_horas_requerimentos_controle executável por anon';
  END IF;

  INSERT INTO empresas_clientes (id, nome_completo, nome_abreviado, status, tem_ams, tipo_book, email_gestor, vigencia_inicial, anexo)
  VALUES (v_empresa, 'EMPRESA TESTE REQUERIMENTOS LTDA', 'TESTE REQ', 'ativo', true, 'qualidade', 'gestor@sonda.com', '2025-01-01', false);
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem)
  VALUES (v_empresa, 'TESTE PADRÃO', true, 1, 'horas', 3, '2026-07-01', 'OUTROS', 'manual')
  RETURNING id INTO v_banco;

  -- Enviado para faturamento (consome) e lançado (em desenvolvimento), em Out/2026
  INSERT INTO requerimentos (chamado, cliente_id, modulo, descricao, data_envio, horas_funcional, horas_tecnico,
                             linguagem, tipo_cobranca, status, enviado_faturamento, mes_cobranca, quantidade_tickets)
  VALUES ('RF-TESTE-1', v_empresa, 'Comex', 'Ajuste no relatório de câmbio', '2026-10-01', 2.5, 1, 'ABAP',
          'Banco de Horas', 'enviado_faturamento', true, '10/2026', 2)
  RETURNING id INTO v_r1;
  INSERT INTO requerimentos (chamado, cliente_id, modulo, descricao, data_envio, horas_funcional, horas_tecnico,
                             tipo_cobranca, status, enviado_faturamento, mes_cobranca)
  VALUES ('RF-TESTE-2', v_empresa, 'Gallery', 'Nova tela de cadastro', '2026-10-05', 4, 0,
          'Banco de Horas', 'lancado', false, '10/2026')
  RETURNING id INTO v_r2;
  -- Fora: outro mês e outra cobrança
  INSERT INTO requerimentos (chamado, cliente_id, modulo, descricao, data_envio, horas_funcional, horas_tecnico,
                             tipo_cobranca, status, enviado_faturamento, mes_cobranca)
  VALUES ('RF-TESTE-3', v_empresa, 'Comex', 'Outro mês', '2026-09-01', 1, 0, 'Banco de Horas', 'faturado', true, '09/2026'),
         ('RF-TESTE-4', v_empresa, 'Comex', 'Outra cobrança', '2026-10-01', 1, 0, 'Contrato', 'faturado', true, '10/2026');

  INSERT INTO requerimentos_bancos (requerimento_id, banco_id, motivo)
  VALUES (v_r1, v_banco, 'Atendimento do contrato FISCAL');

  -- -------------------------------------------------------------------
  -- 1. Os requerimentos do mês cobrados no banco de horas
  -- -------------------------------------------------------------------
  SELECT count(*) INTO v_n FROM bancos_horas_requerimentos_controle(v_empresa, 2026, 10);
  IF v_n <> 2 THEN RAISE EXCEPTION 'Esperava 2 requerimentos em Out/2026, veio %', v_n; END IF;

  SELECT * INTO v_r FROM bancos_horas_requerimentos_controle(v_empresa, 2026, 10) WHERE requerimento_id = v_r1;
  IF v_r.chamado <> 'RF-TESTE-1' OR v_r.descricao <> 'Ajuste no relatório de câmbio' OR v_r.modulo <> 'Comex'
     OR v_r.horas <> 3.5 OR v_r.tickets <> 2 OR NOT v_r.consome THEN
    RAISE EXCEPTION 'Requerimento enviado veio errado (horas de gestor não contam; consome)';
  END IF;
  IF v_r.banco_ajustado_id IS DISTINCT FROM v_banco OR v_r.ajuste_motivo <> 'Atendimento do contrato FISCAL'
     OR v_r.ajuste_em IS NULL THEN
    RAISE EXCEPTION 'O ajuste de banco veio sem banco, motivo ou data';
  END IF;
  -- O produto vem da correspondência dos módulos de requerimento
  IF v_r.produto_id IS DISTINCT FROM (SELECT produto_id FROM modulos_requerimento_produto WHERE modulo_requerimento = 'Comex') THEN
    RAISE EXCEPTION 'Produto do requerimento não veio da correspondência';
  END IF;

  SELECT * INTO v_r FROM bancos_horas_requerimentos_controle(v_empresa, 2026, 10) WHERE requerimento_id = v_r2;
  IF v_r.consome OR v_r.banco_ajustado_id IS NOT NULL OR v_r.horas <> 4 OR v_r.tickets <> 0 THEN
    RAISE EXCEPTION 'Requerimento em desenvolvimento veio errado';
  END IF;

  -- Os que consomem são exatamente os da função do motor
  IF (SELECT array_agg(requerimento_id ORDER BY requerimento_id) FROM bancos_horas_requerimentos_controle(v_empresa, 2026, 10) WHERE consome)
     IS DISTINCT FROM (SELECT array_agg(requerimento_id ORDER BY requerimento_id) FROM bancos_horas_requerimentos(v_empresa, 2026, 10)) THEN
    RAISE EXCEPTION 'A lista do Controle diverge do consumo do motor';
  END IF;

  -- -------------------------------------------------------------------
  -- 2. Permissão: a mesma do consumo (Controle ou Geração de Books)
  -- -------------------------------------------------------------------
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_sem_acesso, 'role', 'authenticated')::text, true);
  v_falhou := false;
  BEGIN PERFORM bancos_horas_requerimentos_controle(v_empresa, 2026, 10);
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Usuário sem permissão leu os requerimentos'; END IF;
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
