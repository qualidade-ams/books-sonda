-- =====================================================================
-- Teste da migration 20261015000008_fase2_consumo (regra única de consumo).
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou
-- (inclusive os apontamentos e tickets fictícios). Qualquer outra mensagem diz
-- qual verificação falhou.
-- =====================================================================
DO $teste$
DECLARE
  v_admin uuid := (SELECT uga.user_id FROM user_group_assignments uga JOIN user_groups ug ON ug.id = uga.group_id
                    WHERE ug.name = 'Administradores' LIMIT 1);
  v_sem_permissao uuid := (SELECT uga.user_id FROM user_group_assignments uga
                    WHERE NOT EXISTS (SELECT 1 FROM user_group_assignments x JOIN screen_permissions sp ON sp.group_id = x.group_id
                                       WHERE x.user_id = uga.user_id AND sp.screen_key IN ('bancos_horas_controle', 'geracao_books'))
                    LIMIT 1);
  v_emp uuid := gen_random_uuid();
  v_org text := 'EMPRESA TESTE CONSUMO F2';
  v_ini timestamptz; v_fim timestamptz;
  v_n bigint;
  v_m bigint;
  v_falhou boolean;
  v_divergencias text;
BEGIN
  -- 1. Janela de apuração em America/Sao_Paulo (D-16, RC-05); fim exclusivo
  SELECT inicio, fim INTO v_ini, v_fim FROM bancos_horas_janela(2026, 1, 1, 0);
  IF v_ini <> '2026-01-01 00:00-03' OR v_fim <> '2026-02-01 00:00-03' THEN
    RAISE EXCEPTION 'Janela civil errada: % a %', v_ini, v_fim;
  END IF;
  SELECT inicio, fim INTO v_ini, v_fim FROM bancos_horas_janela(2026, 1, 1, 15);
  IF v_ini <> '2026-01-01 00:00-03' OR v_fim <> '2026-02-01 00:00-03' THEN
    RAISE EXCEPTION 'Com início no dia 1, o dia fim deve ser ignorado: % a %', v_ini, v_fim;
  END IF;
  SELECT inicio, fim INTO v_ini, v_fim FROM bancos_horas_janela(2026, 12, 16, 15);
  IF v_ini <> '2026-12-16 00:00-03' OR v_fim <> '2027-01-16 00:00-03' THEN
    RAISE EXCEPTION 'Janela 16 a 15 na virada do ano errada: % a %', v_ini, v_fim;
  END IF;
  SELECT inicio, fim INTO v_ini, v_fim FROM bancos_horas_janela(2026, 1, 16, 0);
  IF v_fim <> '2026-02-16 00:00-03' THEN
    RAISE EXCEPTION 'Dia fim 0 com início 16 deve terminar no dia 15 do mês seguinte: %', v_fim;
  END IF;
  SELECT inicio, fim INTO v_ini, v_fim FROM bancos_horas_janela(2026, 1, 16, 10);
  IF v_fim <> '2026-02-11 00:00-03' THEN
    RAISE EXCEPTION 'Dia fim 10 deve terminar no fim do dia 10 do mês seguinte: %', v_fim;
  END IF;

  -- Massa fictícia
  INSERT INTO empresas (id, nome_completo, nome_abreviado, vigencia_inicio) VALUES (v_emp, v_org, 'TCF2', '2025-01-01');
  INSERT INTO empresas_organizacoes_aranda (empresa_id, nome_organizacao) VALUES (v_emp, v_org);

  INSERT INTO apontamentos_aranda (id_externo, org_us_final, ativi_interna, item_configuracao, tipo_chamado, caso_grupo,
                                   cod_resolucao, data_atividade, tempo_gasto_minutos, tempo_gasto_horas) VALUES
    ('TF2-A1',  v_org, 'Não', 'IC 1', 'IM', 'AMS APL - CAMBIO - N2', 'Consultoria', '2026-01-10 10:00-03', 90, '01:30'),
    ('TF2-A2',  v_org, 'Sim', 'IC 1', 'IM', 'AMS APL - CAMBIO - N2', 'Consultoria', '2026-01-10 10:00-03', 50, '00:50'),
    ('TF2-A3',  v_org, 'Não', '000000 - PROJETOS APL', 'IM', 'AMS APL - CAMBIO - N2', 'Consultoria', '2026-01-10 10:00-03', 50, '00:50'),
    ('TF2-A4',  v_org, 'Não', 'IC 1', 'XX', 'AMS APL - CAMBIO - N2', 'Consultoria', '2026-01-10 10:00-03', 50, '00:50'),
    ('TF2-A5',  v_org, 'Não', 'IC 1', 'IM', 'SUPORTE GERAL', 'Consultoria', '2026-01-10 10:00-03', 50, '00:50'),
    ('TF2-A6',  v_org, 'Não', 'IC 1', 'IM', 'AMS APL - CAMBIO - N2', 'Melhoria Fictícia', '2026-01-10 10:00-03', 50, '00:50'),
    -- D-16: 02:00 de 1º/02 em Brasília é fevereiro; 23:30 de 31/01 é janeiro
    ('TF2-A7',  v_org, 'Não', 'IC 1', 'RF', 'AMS - ATENDIMENTO', 'Consultoria', '2026-02-01 02:00-03', 60, '01:00'),
    ('TF2-A8',  v_org, 'Não', 'IC 1', 'PM', 'AMS T&M - TIME & MATERIAL', 'Alocação T&M', '2026-01-31 23:30-03', 30, '00:30'),
    -- Organização sem diferenciar maiúsculas e com espaços
    ('TF2-A9',  ' empresa teste consumo f2 ', 'Não', 'IC 2', 'IM', 'AMS - APL - SPED', 'Consultoria', '2026-01-20 10:00-03', 45, '00:45'),
    -- Sem minutos: usa o texto
    ('TF2-A10', v_org, 'Não', 'IC 1', 'IM', 'AMS APL - CAMBIO - N2', 'Consultoria', '2026-01-05 10:00-03', NULL, '01:15'),
    -- Acima de 24 h: vale o minuto real, não o texto que perdeu os dias (A3)
    ('TF2-A11', v_org, 'Não', 'IC 1', 'IM', 'AMS APL - CAMBIO - N2', 'Consultoria', '2026-01-25 10:00-03', 1500, '01:00'),
    -- Outra organização
    ('TF2-A12', 'OUTRA EMPRESA F2', 'Não', 'IC 1', 'IM', 'AMS APL - CAMBIO - N2', 'Consultoria', '2026-01-10 10:00-03', 50, '00:50');

  INSERT INTO apontamentos_tickets_aranda (nro_solicitacao, organizacao, status, data_fechamento, nome_grupo, cod_resolucao, item_configuracao) VALUES
    ('TF2-T1', v_org, 'Closed', '2026-01-15 10:00-03', 'AMS APL - CAMBIO - N2', 'Consultoria', 'IC 1'),
    ('TF2-T2', v_org, 'Open',   '2026-01-15 10:00-03', 'AMS APL - CAMBIO - N2', 'Consultoria', 'IC 1'),
    ('TF2-T3', v_org, 'Closed', '2026-01-15 10:00-03', 'AMS APL - CAMBIO - N2', 'Nota Publicada (Banco=S| SLA=N)', 'IC 1'),
    ('TF2-T4', v_org, 'Closed', '2026-01-15 10:00-03', 'AMS APL - CAMBIO - N2', 'Consultoria', '000000 - PROJETOS APL'),
    ('TF2-T5', v_org, 'Closed', '2026-01-15 10:00-03', 'OUTRO', 'Consultoria', 'IC 1'),
    ('TF2-T6', v_org, 'Closed', '2026-02-01 01:00-03', 'AMS APL - CAMBIO - N2', 'Consultoria', 'IC 1');

  -- 2. Apontamentos: filtros, fuso, organização e duração
  SELECT COALESCE(sum(minutos), 0), count(*) INTO v_n, v_m
    FROM bancos_horas_consumo_itens(v_emp, 2026, 1, 1, 0) WHERE fonte = 'apontamento';
  IF v_n <> 1740 OR v_m <> 5 THEN
    RAISE EXCEPTION 'Apontamentos de jan/2026: esperado 1740 min em 5 itens, veio % min em %', v_n, v_m;
  END IF;
  SELECT COALESCE(sum(minutos), 0) INTO v_n FROM bancos_horas_consumo_itens(v_emp, 2026, 2, 1, 0) WHERE fonte = 'apontamento';
  IF v_n <> 60 THEN RAISE EXCEPTION 'Apontamentos de fev/2026: esperado 60 min, veio %', v_n; END IF;
  SELECT COALESCE(sum(minutos), 0) INTO v_n FROM bancos_horas_consumo_itens(v_emp, 2026, 1, 16, 15) WHERE fonte = 'apontamento';
  IF v_n <> 1635 THEN RAISE EXCEPTION 'Apontamentos de jan/2026 com janela 16 a 15: esperado 1635 min, veio %', v_n; END IF;

  -- 3. Tickets
  SELECT COALESCE(sum(tickets), 0) INTO v_n FROM bancos_horas_consumo_itens(v_emp, 2026, 1, 1, 0) WHERE fonte = 'ticket';
  IF v_n <> 1 THEN RAISE EXCEPTION 'Tickets de jan/2026: esperado 1, veio %', v_n; END IF;

  -- 4. Versão somada = soma dos itens, por grupo e item de configuração
  SELECT COALESCE(sum(minutos), 0), COALESCE(sum(itens), 0) INTO v_n, v_m
    FROM bancos_horas_consumo(v_emp, 2026, 1, 1, 0) WHERE fonte = 'apontamento';
  IF v_n <> 1740 OR v_m <> 5 THEN RAISE EXCEPTION 'Consumo somado difere dos itens: % min, % itens', v_n, v_m; END IF;
  SELECT minutos INTO v_n FROM bancos_horas_consumo(v_emp, 2026, 1, 1, 0)
   WHERE fonte = 'apontamento' AND grupo = 'AMS APL - CAMBIO - N2' AND item_configuracao = 'IC 1';
  IF v_n <> 1665 THEN RAISE EXCEPTION 'Soma do grupo CAMBIO / IC 1: esperado 1665, veio %', v_n; END IF;

  -- 5. Acesso: quem não vê o Controle nem a Geração de Books não consulta
  IF v_sem_permissao IS NOT NULL THEN
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_sem_permissao, 'role', 'authenticated')::text, true);
    v_falhou := false;
    BEGIN PERFORM * FROM bancos_horas_consumo_itens(v_emp, 2026, 1, 1, 0);
    EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
    IF NOT v_falhou THEN RAISE EXCEPTION 'Usuário sem permissão consultou o consumo'; END IF;
    v_falhou := false;
    BEGIN PERFORM * FROM bancos_horas_requerimentos(v_emp, 2026, 1);
    EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
    IF NOT v_falhou THEN RAISE EXCEPTION 'Usuário sem permissão consultou os requerimentos'; END IF;
  END IF;
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO v_n FROM bancos_horas_consumo_itens(v_emp, 2026, 1, 1, 0);
  IF v_n <> 6 THEN RAISE EXCEPTION 'Administrador deveria ver 6 itens, viu %', v_n; END IF;
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  -- 6. Equivalência com o motor atual em dados reais (jul a set/2026, todas as
  --    empresas com banco). O motor atual liga a empresa pelo nome completo
  --    (ilike) e usa a mesma lista de códigos; a duração aqui já é a da decisão A3.
  --    Os dados do lado legado são filtrados uma vez só, para o teste ser rápido.
  WITH meses AS (
    SELECT b.empresa_id, e.nome_completo, j.inicio, j.fim,
           extract(year FROM m)::int AS ano, extract(month FROM m)::int AS mes,
           b.dia_inicio_apuracao AS di, b.dia_fim_apuracao AS df
      FROM bancos_horas b
      JOIN empresas_clientes e ON e.id = b.empresa_id
     CROSS JOIN generate_series('2026-07-01'::date, '2026-09-01'::date, interval '1 month') m
     CROSS JOIN LATERAL bancos_horas_janela(extract(year FROM m)::int, extract(month FROM m)::int,
                                            b.dia_inicio_apuracao, b.dia_fim_apuracao) j
     WHERE b.padrao AND b.ativo
  ),
  ap AS (
    SELECT a.org_us_final, a.data_atividade,
           COALESCE(round(a.tempo_gasto_minutos)::int,
                    split_part(a.tempo_gasto_horas, ':', 1)::int * 60 + split_part(a.tempo_gasto_horas, ':', 2)::int) AS minutos
      FROM apontamentos_aranda a
     WHERE a.data_atividade >= '2026-06-01' AND a.data_atividade < '2026-11-01'
       AND a.ativi_interna = 'Não' AND a.item_configuracao <> '000000 - PROJETOS APL'
       AND a.tipo_chamado IN ('IM', 'RF', 'PM')
       AND a.caso_grupo ILIKE ANY (ARRAY['%AMS APL%', '%AMS - APL%', '%AMS - ATENDIMENTO%', '%AMS T&M%'])
       AND a.cod_resolucao IN (SELECT codigo FROM codigos_resolucao_banco WHERE conta_horas)
  ),
  tk AS (
    SELECT t.organizacao, t.data_fechamento
      FROM apontamentos_tickets_aranda t
     WHERE t.data_fechamento >= '2026-06-01' AND t.data_fechamento < '2026-11-01'
       AND t.status = 'Closed' AND t.item_configuracao <> '000000 - PROJETOS APL'
       AND t.nome_grupo ILIKE ANY (ARRAY['%AMS APL%', '%AMS - APL%', '%AMS - ATENDIMENTO%', '%AMS T&M%'])
       AND t.cod_resolucao IN (SELECT codigo FROM codigos_resolucao_banco WHERE conta_tickets)
  ),
  comparacao AS (
    SELECT m.nome_completo, m.ano, m.mes,
      novo.minutos AS novo_min,
      (SELECT COALESCE(sum(ap.minutos), 0) FROM ap
        WHERE ap.org_us_final ILIKE m.nome_completo AND ap.data_atividade >= m.inicio AND ap.data_atividade < m.fim) AS legado_min,
      novo.tickets AS novo_tk,
      (SELECT count(*) FROM tk
        WHERE tk.organizacao ILIKE m.nome_completo AND tk.data_fechamento >= m.inicio AND tk.data_fechamento < m.fim) AS legado_tk,
      (SELECT COALESCE(sum(horas), 0) FROM bancos_horas_requerimentos(m.empresa_id, m.ano, m.mes)) AS novo_req,
      (SELECT COALESCE(sum(COALESCE(r.horas_funcional, 0) + COALESCE(r.horas_tecnico, 0)), 0)
         FROM requerimentos r
        WHERE r.cliente_id = m.empresa_id AND r.tipo_cobranca = 'Banco de Horas'
          AND r.mes_cobranca = lpad(m.mes::text, 2, '0') || '/' || m.ano
          AND r.enviado_faturamento AND r.status IN ('enviado_faturamento', 'faturado')) AS legado_req
    FROM meses m
    CROSS JOIN LATERAL (
      SELECT COALESCE(sum(i.minutos), 0) AS minutos, COALESCE(sum(i.tickets), 0) AS tickets
        FROM bancos_horas_consumo_itens(m.empresa_id, m.ano, m.mes, m.di, m.df) i
    ) novo
  )
  SELECT string_agg(format('%s %s/%s: min %s×%s, tickets %s×%s, req %s×%s', nome_completo, mes, ano,
                           novo_min, legado_min, novo_tk, legado_tk, novo_req, legado_req), '; ')
         FILTER (WHERE novo_min <> legado_min OR novo_tk <> legado_tk OR novo_req <> legado_req),
         sum(novo_min)
    INTO v_divergencias, v_n
    FROM comparacao;
  IF v_divergencias IS NOT NULL THEN
    RAISE EXCEPTION 'Divergência com o motor atual (novo × legado): %', left(v_divergencias, 3000);
  END IF;
  IF COALESCE(v_n, 0) = 0 THEN
    RAISE EXCEPTION 'Nenhum consumo real em jul a set/2026: a comparação não exercitou dados reais';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
