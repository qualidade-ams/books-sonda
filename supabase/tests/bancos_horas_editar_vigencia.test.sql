-- =====================================================================
-- Teste da migration 20261105000002_bancos_horas_editar_vigencia
--
-- Na edição do banco (tela Empresas), qualquer vigência de baseline ou de
-- repasse, inclusive as anteriores, pode ter os valores e os meses alterados.
-- A vigência vizinha é ajustada junto: sem buraco e sem sobreposição. A
-- primeira começa sempre no início do banco e a última fica em aberto. Mês
-- fechado não bloqueia: o resultado dele continua congelado até a retificação.
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou.
-- Qualquer outra mensagem de erro diz qual verificação falhou.
-- =====================================================================
DO $teste$
DECLARE
  v_sem_acesso uuid := gen_random_uuid();
  v_empresa uuid := gen_random_uuid();
  v_banco uuid;
  v_a uuid;  -- baseline 40:00, Jan a Jun/2025
  v_b uuid;  -- baseline 24:00, Jul/2025 em diante
  v_r1 uuid; -- repasse 100%, Jan/2025 a Mar/2026
  v_r2 uuid; -- repasse 50%, Abr/2026 em diante
  v_r record;
  v_falhou boolean;
  v_msg text;

  -- Confere início e fim de uma vigência de baseline
  v_ini date; v_fim date;
BEGIN
  -- -------------------------------------------------------------------
  -- 1. Estrutura e segurança
  -- -------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'bancos_horas_editar_vigencia'
                    AND pronamespace = 'public'::regnamespace
                    AND prosecdef AND proconfig @> ARRAY['search_path=public']) THEN
    RAISE EXCEPTION 'bancos_horas_editar_vigencia ausente, sem SECURITY DEFINER ou sem search_path fixo';
  END IF;
  IF has_function_privilege('anon', 'public.bancos_horas_editar_vigencia(uuid, text, date, date, jsonb, text)', 'execute') THEN
    RAISE EXCEPTION 'bancos_horas_editar_vigencia executável por anon';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.bancos_horas_editar_vigencia(uuid, text, date, date, jsonb, text)', 'execute') THEN
    RAISE EXCEPTION 'bancos_horas_editar_vigencia não executável por authenticated';
  END IF;

  -- -------------------------------------------------------------------
  -- Cenário: banco desde Jan/2025 com duas vigências de baseline e de repasse
  -- -------------------------------------------------------------------
  INSERT INTO empresas_clientes (id, nome_completo, nome_abreviado, status, tem_ams, tipo_book, email_gestor, vigencia_inicial, anexo)
  VALUES (v_empresa, 'EMPRESA TESTE VIGENCIAS LTDA', 'TESTE VIGENCIAS', 'ativo', true, 'qualidade', 'gestor@sonda.com', '2025-01-01', false);
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem)
  VALUES (v_empresa, 'TESTE VIGENCIAS', false, 1, 'horas', 3, '2025-01-01', 'OUTROS', 'manual')
  RETURNING id INTO v_banco;

  INSERT INTO bancos_horas_baseline (banco_id, baseline_minutos, credito, data_inicio, data_fim, motivo)
  VALUES (v_banco, 2400, 'mensal', '2025-01-01', '2025-06-30', 'Cadastro do banco') RETURNING id INTO v_a;
  INSERT INTO bancos_horas_baseline (banco_id, baseline_minutos, credito, data_inicio, data_fim, motivo)
  VALUES (v_banco, 1440, 'mensal', '2025-07-01', NULL, 'Redução Baseline') RETURNING id INTO v_b;
  INSERT INTO bancos_horas_repasse (banco_id, percentual_mensal, data_inicio, data_fim, motivo)
  VALUES (v_banco, 100, '2025-01-01', '2026-03-31', 'Cadastro do banco') RETURNING id INTO v_r1;
  INSERT INTO bancos_horas_repasse (banco_id, percentual_mensal, data_inicio, data_fim, motivo)
  VALUES (v_banco, 50, '2026-04-01', NULL, 'Novo contrato') RETURNING id INTO v_r2;

  -- -------------------------------------------------------------------
  -- 2. Valores de uma vigência anterior (sem mexer nos meses)
  -- -------------------------------------------------------------------
  PERFORM bancos_horas_editar_vigencia(v_a, 'baseline', '2025-01-01', '2025-06-01',
    '{"baseline_minutos": 1800, "credito": "mensal"}'::jsonb, 'Baseline cadastrado errado');
  SELECT * INTO v_r FROM bancos_horas_baseline WHERE id = v_a;
  IF v_r.baseline_minutos <> 1800 OR v_r.motivo <> 'Baseline cadastrado errado'
     OR v_r.data_inicio <> '2025-01-01' OR v_r.data_fim <> '2025-06-30' THEN
    RAISE EXCEPTION 'Valor da vigência anterior não foi gravado como pedido: %', row_to_json(v_r);
  END IF;
  IF (SELECT data_inicio FROM bancos_horas_baseline WHERE id = v_b) <> '2025-07-01' THEN
    RAISE EXCEPTION 'Editar só o valor mexeu na vigência seguinte';
  END IF;

  -- -------------------------------------------------------------------
  -- 3. Meses: a vizinha acompanha a fronteira
  -- -------------------------------------------------------------------
  -- A seguinte começa mais cedo: a anterior termina antes
  PERFORM bancos_horas_editar_vigencia(v_b, 'baseline', '2025-05-01', NULL,
    '{"baseline_minutos": 1440, "credito": "mensal"}'::jsonb, 'Redução começou em maio');
  SELECT data_inicio, data_fim INTO v_ini, v_fim FROM bancos_horas_baseline WHERE id = v_a;
  IF v_fim <> '2025-04-30' THEN
    RAISE EXCEPTION 'A vigência anterior deveria terminar em 30/04/2025; ficou %', v_fim;
  END IF;
  -- A anterior termina mais tarde: a seguinte começa depois
  PERFORM bancos_horas_editar_vigencia(v_a, 'baseline', '2025-01-01', '2025-08-01',
    '{"baseline_minutos": 1800, "credito": "mensal"}'::jsonb, 'Redução só em setembro');
  IF (SELECT data_fim FROM bancos_horas_baseline WHERE id = v_a) <> '2025-08-31'
     OR (SELECT data_inicio FROM bancos_horas_baseline WHERE id = v_b) <> '2025-09-01' THEN
    RAISE EXCEPTION 'Esticar a anterior deveria empurrar o início da seguinte para 09/2025';
  END IF;
  -- Repasse: a última também move a fronteira
  PERFORM bancos_horas_editar_vigencia(v_r2, 'repasse', '2026-02-01', NULL,
    '{"percentual_mensal": 60}'::jsonb, 'Percentual corrigido');
  SELECT * INTO v_r FROM bancos_horas_repasse WHERE id = v_r2;
  IF v_r.percentual_mensal <> 60 OR v_r.data_inicio <> '2026-02-01'
     OR (SELECT data_fim FROM bancos_horas_repasse WHERE id = v_r1) <> '2026-01-31' THEN
    RAISE EXCEPTION 'Repasse não foi editado como pedido';
  END IF;

  -- -------------------------------------------------------------------
  -- 4. Recusas
  -- -------------------------------------------------------------------
  -- A primeira começa no início do banco
  v_falhou := false;
  BEGIN
    PERFORM bancos_horas_editar_vigencia(v_a, 'baseline', '2025-03-01', '2025-08-01',
      '{"baseline_minutos": 1800}'::jsonb, 'x');
  EXCEPTION WHEN OTHERS THEN v_falhou := true; v_msg := SQLERRM;
  END;
  IF NOT v_falhou OR v_msg NOT ILIKE '%início do banco%' THEN
    RAISE EXCEPTION 'A primeira vigência não pode sair do início do banco (veio: %)', v_msg;
  END IF;
  -- A última fica em aberto
  v_falhou := false;
  BEGIN
    PERFORM bancos_horas_editar_vigencia(v_b, 'baseline', '2025-09-01', '2026-12-01',
      '{"baseline_minutos": 1440}'::jsonb, 'x');
  EXCEPTION WHEN OTHERS THEN v_falhou := true; v_msg := SQLERRM;
  END;
  IF NOT v_falhou OR v_msg NOT ILIKE '%em aberto%' THEN
    RAISE EXCEPTION 'A última vigência deveria ficar em aberto (veio: %)', v_msg;
  END IF;
  -- A vizinha não pode sumir
  v_falhou := false;
  BEGIN
    PERFORM bancos_horas_editar_vigencia(v_b, 'baseline', '2025-01-01', NULL,
      '{"baseline_minutos": 1440}'::jsonb, 'x');
  EXCEPTION WHEN OTHERS THEN v_falhou := true; v_msg := SQLERRM;
  END;
  IF NOT v_falhou OR v_msg NOT ILIKE '%anterior%' THEN
    RAISE EXCEPTION 'A vigência anterior ficaria vazia e deveria ser recusado (veio: %)', v_msg;
  END IF;
  -- Fim antes do início, mês que não começa no dia 1, motivo vazio, tipo errado
  v_falhou := false;
  BEGIN
    PERFORM bancos_horas_editar_vigencia(v_a, 'baseline', '2025-01-01', '2024-12-01',
      '{"baseline_minutos": 1800}'::jsonb, 'x');
  EXCEPTION WHEN OTHERS THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Fim antes do início deveria ser recusado'; END IF;
  v_falhou := false;
  BEGIN
    PERFORM bancos_horas_editar_vigencia(v_b, 'baseline', '2025-09-15', NULL,
      '{"baseline_minutos": 1440}'::jsonb, 'x');
  EXCEPTION WHEN OTHERS THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Início fora do dia 1 deveria ser recusado'; END IF;
  v_falhou := false;
  BEGIN
    PERFORM bancos_horas_editar_vigencia(v_b, 'baseline', '2025-09-01', NULL,
      '{"baseline_minutos": 1440}'::jsonb, '   ');
  EXCEPTION WHEN OTHERS THEN v_falhou := true; v_msg := SQLERRM;
  END;
  IF NOT v_falhou OR v_msg NOT ILIKE '%motivo%' THEN
    RAISE EXCEPTION 'Motivo vazio deveria ser recusado (veio: %)', v_msg;
  END IF;
  v_falhou := false;
  BEGIN
    PERFORM bancos_horas_editar_vigencia(v_b, 'repasse', '2025-09-01', NULL,
      '{"percentual_mensal": 10}'::jsonb, 'x');
  EXCEPTION WHEN OTHERS THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION 'Vigência de baseline editada como repasse deveria ser recusada';
  END IF;
  -- Banco de horas sem as horas: a regra do banco continua valendo
  v_falhou := false;
  BEGIN
    PERFORM bancos_horas_editar_vigencia(v_b, 'baseline', '2025-09-01', NULL, '{}'::jsonb, 'x');
  EXCEPTION WHEN OTHERS THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Baseline sem horas deveria ser recusado'; END IF;

  -- Nada mudou com as recusas
  IF (SELECT data_fim FROM bancos_horas_baseline WHERE id = v_a) <> '2025-08-31'
     OR (SELECT data_inicio FROM bancos_horas_baseline WHERE id = v_b) <> '2025-09-01' THEN
    RAISE EXCEPTION 'Uma edição recusada deixou alteração para trás';
  END IF;

  -- Três vigências (a terceira pela função de vigência nova): a do meio
  -- (Set a Dez/2025) não pode sumir quando a primeira estica
  PERFORM bancos_horas_nova_vigencia(v_banco, 'baseline', '2026-01-01',
    '{"baseline_minutos": 1200, "credito": "mensal"}'::jsonb, 'Nova redução');
  IF (SELECT data_fim FROM bancos_horas_baseline WHERE id = v_b) <> '2025-12-31' THEN
    RAISE EXCEPTION 'Precondição: a vigência nova deveria fechar a do meio em 12/2025';
  END IF;
  v_falhou := false;
  BEGIN
    PERFORM bancos_horas_editar_vigencia(v_a, 'baseline', '2025-01-01', '2025-12-01',
      '{"baseline_minutos": 1800}'::jsonb, 'x');
  EXCEPTION WHEN OTHERS THEN v_falhou := true; v_msg := SQLERRM;
  END;
  IF NOT v_falhou OR v_msg NOT ILIKE '%seguinte%' THEN
    RAISE EXCEPTION 'A vigência seguinte ficaria vazia e deveria ser recusado (veio: %)', v_msg;
  END IF;
  -- Só a última fica em aberto
  v_falhou := false;
  BEGIN
    PERFORM bancos_horas_editar_vigencia(v_b, 'baseline', '2025-09-01', NULL,
      '{"baseline_minutos": 1440}'::jsonb, 'x');
  EXCEPTION WHEN OTHERS THEN v_falhou := true; v_msg := SQLERRM;
  END;
  IF NOT v_falhou OR v_msg NOT ILIKE '%última%' THEN
    RAISE EXCEPTION 'Só a última vigência pode ficar em aberto (veio: %)', v_msg;
  END IF;
  -- A do meio mexe nas duas fronteiras de uma vez
  PERFORM bancos_horas_editar_vigencia(v_b, 'baseline', '2025-10-01', '2026-02-01',
    '{"baseline_minutos": 1440, "credito": "mensal"}'::jsonb, 'Fronteiras corrigidas');
  IF (SELECT data_fim FROM bancos_horas_baseline WHERE id = v_a) <> '2025-09-30'
     OR (SELECT data_inicio FROM bancos_horas_baseline WHERE id = v_b) <> '2025-10-01'
     OR (SELECT data_fim FROM bancos_horas_baseline WHERE id = v_b) <> '2026-02-28'
     OR (SELECT data_inicio FROM bancos_horas_baseline WHERE banco_id = v_banco AND data_fim IS NULL) <> '2026-03-01' THEN
    RAISE EXCEPTION 'Editar a vigência do meio deveria ajustar a anterior e a seguinte';
  END IF;

  -- -------------------------------------------------------------------
  -- 5. Sem permissão de Edição em Parâmetros dos bancos
  -- -------------------------------------------------------------------
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_sem_acesso, 'role', 'authenticated')::text, true);
  v_falhou := false;
  BEGIN
    PERFORM bancos_horas_editar_vigencia(v_b, 'baseline', '2025-09-01', NULL,
      '{"baseline_minutos": 1000}'::jsonb, 'Sem permissão');
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true;
  END;
  IF NOT v_falhou THEN
    RAISE EXCEPTION 'Sem Edição em Parâmetros dos bancos, não pode editar vigência';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
