-- =====================================================================
-- Teste da migration 20261028000001_fase4_comparacao
-- (docs/especificacoes/Modelagem_Fase4.md, seções 3.5, 5 e 9).
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou.
-- Qualquer outra mensagem de erro diz qual verificação falhou.
-- =====================================================================
DO $teste$
DECLARE
  v_admin uuid := (SELECT uga.user_id FROM user_group_assignments uga JOIN user_groups ug ON ug.id = uga.group_id
                    WHERE ug.name = 'Administradores' LIMIT 1);
  v_sem_acesso uuid := gen_random_uuid();
  v_empresa uuid := (SELECT id FROM empresas ORDER BY nome_abreviado LIMIT 1);
  v_r record;
  v_n int;
  v_falhou boolean;
  v_mes jsonb := jsonb_build_object(
    'ano', 2026, 'mes', 8, 'situacao', 'igual',
    'legado', '{"horas": {"consumo": 600}}'::jsonb, 'novo', '{"horas": {"consumo": 600}}'::jsonb,
    'origem_saldo', NULL, 'itens', '[]'::jsonb, 'itens_total', 0,
    'fechamento_legado_em', '2026-09-05T12:00:00Z');
  v_resultado jsonb;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Precondição: precisa de um usuário no grupo Administradores';
  END IF;
  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'Precondição: precisa de uma empresa em empresas';
  END IF;

  -- -------------------------------------------------------------------
  -- 1. Estrutura e segurança
  -- -------------------------------------------------------------------
  SELECT count(*) INTO v_n FROM pg_tables
   WHERE schemaname = 'public' AND rowsecurity
     AND tablename IN ('bancos_horas_comparacao', 'bancos_horas_comparacao_meses');
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'As tabelas da comparação precisam existir com RLS habilitado';
  END IF;

  -- Só leitura direta: uma política (SELECT) por tabela, sem duplicata
  SELECT count(*) INTO v_n FROM pg_policies
   WHERE tablename IN ('bancos_horas_comparacao', 'bancos_horas_comparacao_meses');
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'Esperadas 2 políticas (SELECT) nas tabelas da comparação, há %', v_n;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies
              WHERE tablename IN ('bancos_horas_comparacao', 'bancos_horas_comparacao_meses')
                AND (cmd <> 'SELECT' OR qual NOT LIKE '%bancos_horas_comparacao%')) THEN
    RAISE EXCEPTION 'A política das tabelas da comparação deve ser só SELECT pela chave bancos_horas_comparacao';
  END IF;

  SELECT count(*) INTO v_n FROM pg_proc
   WHERE proname IN ('bancos_horas_gravar_comparacao', 'bancos_horas_erro_comparacao', 'validar_comparacao')
     AND pronamespace = 'public'::regnamespace
     AND prosecdef AND proconfig @> ARRAY['search_path=public'];
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'As funções da comparação precisam de SECURITY DEFINER e search_path fixo';
  END IF;
  IF has_function_privilege('authenticated', 'public.bancos_horas_gravar_comparacao(jsonb)', 'execute')
     OR has_function_privilege('anon', 'public.bancos_horas_gravar_comparacao(jsonb)', 'execute')
     OR has_function_privilege('authenticated', 'public.bancos_horas_erro_comparacao(uuid, text)', 'execute') THEN
    RAISE EXCEPTION 'A gravação da comparação é só da rotina (service role)';
  END IF;
  IF has_function_privilege('anon', 'public.validar_comparacao(uuid, boolean, text)', 'execute')
     OR NOT has_function_privilege('authenticated', 'public.validar_comparacao(uuid, boolean, text)', 'execute') THEN
    RAISE EXCEPTION 'validar_comparacao: executável por authenticated e não por anon';
  END IF;

  -- -------------------------------------------------------------------
  -- 2. Tela e permissão
  -- -------------------------------------------------------------------
  SELECT * INTO v_r FROM screens WHERE key = 'bancos_horas_comparacao';
  IF NOT FOUND OR v_r.category <> 'Banco de Horas' OR v_r.route <> '/admin/comparacao-bancos-horas' THEN
    RAISE EXCEPTION 'Tela bancos_horas_comparacao sem registro, categoria ou rota certos';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM screen_permissions sp JOIN user_groups ug ON ug.id = sp.group_id
                  WHERE ug.name = 'Administradores' AND sp.screen_key = 'bancos_horas_comparacao'
                    AND sp.permission_level = 'edit') THEN
    RAISE EXCEPTION 'Administradores sem Edição na Comparação';
  END IF;

  -- -------------------------------------------------------------------
  -- 3. Gravação pela rotina (sem usuário = service role no SQL Editor)
  -- -------------------------------------------------------------------
  PERFORM bancos_horas_gravar_comparacao(jsonb_build_object(
    'empresa_id', v_empresa, 'situacao', 'identico', 'meses_comparados', 1,
    'consumo_legado_minutos', 600, 'consumo_novo_minutos', 600,
    'consumo_legado_tickets', 0, 'consumo_novo_tickets', 0,
    'meses', jsonb_build_array(v_mes)));
  SELECT * INTO v_r FROM bancos_horas_comparacao WHERE empresa_id = v_empresa;
  IF v_r.situacao <> 'identico' OR v_r.meses_comparados <> 1 OR v_r.calculado_em IS NULL THEN
    RAISE EXCEPTION 'Gravação da empresa incompleta: %', to_jsonb(v_r);
  END IF;
  IF (SELECT count(*) FROM bancos_horas_comparacao_meses WHERE empresa_id = v_empresa) <> 1 THEN
    RAISE EXCEPTION 'Gravação dos meses incompleta';
  END IF;

  -- Regravar troca os meses (o que saiu da janela de 12 meses some)
  PERFORM bancos_horas_gravar_comparacao(jsonb_build_object(
    'empresa_id', v_empresa, 'situacao', 'identico', 'meses_comparados', 1,
    'consumo_legado_minutos', 600, 'consumo_novo_minutos', 600,
    'consumo_legado_tickets', 0, 'consumo_novo_tickets', 0,
    'meses', jsonb_build_array(v_mes || '{"mes": 9}'::jsonb)));
  SELECT count(*) INTO v_n FROM bancos_horas_comparacao_meses WHERE empresa_id = v_empresa AND mes = 8;
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'Regravar deixou o mês antigo';
  END IF;

  -- Erro da rotina fica na empresa sem perder o último resultado
  PERFORM bancos_horas_erro_comparacao(v_empresa, 'Falha ao ler o fechamento');
  SELECT * INTO v_r FROM bancos_horas_comparacao WHERE empresa_id = v_empresa;
  IF v_r.erro IS DISTINCT FROM 'Falha ao ler o fechamento' OR v_r.erro_em IS NULL OR v_r.situacao <> 'identico' THEN
    RAISE EXCEPTION 'O erro da rotina não ficou registrado ou apagou o resultado';
  END IF;

  -- Usuário comum não grava
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  v_falhou := false;
  BEGIN PERFORM bancos_horas_gravar_comparacao(jsonb_build_object('empresa_id', v_empresa, 'meses', '[]'::jsonb));
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  PERFORM set_config('request.jwt.claims', '', true);
  IF NOT v_falhou THEN RAISE EXCEPTION 'Usuário gravou a comparação'; END IF;

  -- -------------------------------------------------------------------
  -- 4. Validação (seção 3.5)
  -- -------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  PERFORM validar_comparacao(v_empresa, true, NULL);
  PERFORM set_config('request.jwt.claims', '', true);
  SELECT * INTO v_r FROM bancos_horas_comparacao WHERE empresa_id = v_empresa;
  IF v_r.validada_por IS DISTINCT FROM v_admin OR v_r.validada_em IS NULL OR v_r.validacao_situacao <> 'identico' THEN
    RAISE EXCEPTION 'Validação sem autor, data ou situação';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auditoria_alteracoes
                  WHERE tabela = 'bancos_horas_comparacao' AND registro_id = v_empresa::text
                    AND acao = 'update' AND usuario_id = v_admin) THEN
    RAISE EXCEPTION 'A validação não foi para a auditoria';
  END IF;

  -- Desfazer exige motivo
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  v_falhou := false;
  BEGIN PERFORM validar_comparacao(v_empresa, false, '  ');
  EXCEPTION WHEN OTHERS THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Desfez a validação sem motivo'; END IF;
  PERFORM validar_comparacao(v_empresa, false, 'Book de setembro retificado');
  PERFORM set_config('request.jwt.claims', '', true);
  SELECT * INTO v_r FROM bancos_horas_comparacao WHERE empresa_id = v_empresa;
  IF v_r.validada_em IS NOT NULL OR v_r.validada_por IS NOT NULL THEN
    RAISE EXCEPTION 'Desfazer não limpou a validação';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auditoria_alteracoes
                  WHERE tabela = 'bancos_horas_comparacao' AND registro_id = v_empresa::text
                    AND motivo = 'Book de setembro retificado') THEN
    RAISE EXCEPTION 'A auditoria de desfazer ficou sem o motivo';
  END IF;

  -- Nova divergência derruba a validação, com o mês no motivo
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  PERFORM validar_comparacao(v_empresa, true, NULL);
  PERFORM set_config('request.jwt.claims', '', true);
  PERFORM bancos_horas_gravar_comparacao(jsonb_build_object(
    'empresa_id', v_empresa, 'situacao', 'divergente', 'meses_comparados', 1,
    'consumo_legado_minutos', 600, 'consumo_novo_minutos', 660,
    'consumo_legado_tickets', 0, 'consumo_novo_tickets', 0,
    'meses', jsonb_build_array(v_mes || '{"mes": 9, "situacao": "divergente"}'::jsonb)));
  SELECT * INTO v_r FROM bancos_horas_comparacao WHERE empresa_id = v_empresa;
  IF v_r.validada_em IS NOT NULL OR v_r.situacao <> 'divergente' THEN
    RAISE EXCEPTION 'Nova divergência não derrubou a validação';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auditoria_alteracoes
                  WHERE tabela = 'bancos_horas_comparacao' AND registro_id = v_empresa::text
                    AND origem = 'sistema' AND motivo = 'Nova divergência em 9/2026') THEN
    RAISE EXCEPTION 'A queda da validação não foi para a auditoria com o mês';
  END IF;

  -- Empresa Divergente não é validada
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  v_falhou := false;
  BEGIN PERFORM validar_comparacao(v_empresa, true, NULL);
  EXCEPTION WHEN OTHERS THEN v_falhou := true; END;
  PERFORM set_config('request.jwt.claims', '', true);
  IF NOT v_falhou THEN RAISE EXCEPTION 'Validou empresa Divergente'; END IF;

  -- Sem permissão não valida
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_sem_acesso, 'role', 'authenticated')::text, true);
  v_falhou := false;
  BEGIN PERFORM validar_comparacao(v_empresa, false, 'x');
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  -- Nem lê
  SELECT count(*) INTO v_n FROM bancos_horas_comparacao;
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);
  IF NOT v_falhou THEN RAISE EXCEPTION 'Usuário sem permissão mexeu na validação'; END IF;
  IF v_n <> 0 THEN RAISE EXCEPTION 'Usuário sem permissão leu a comparação'; END IF;

  -- -------------------------------------------------------------------
  -- 5. Sem mês para comparar, a empresa sai da tela (P4)
  -- -------------------------------------------------------------------
  PERFORM bancos_horas_gravar_comparacao(jsonb_build_object('empresa_id', v_empresa, 'meses', '[]'::jsonb));
  IF EXISTS (SELECT 1 FROM bancos_horas_comparacao WHERE empresa_id = v_empresa)
     OR EXISTS (SELECT 1 FROM bancos_horas_comparacao_meses WHERE empresa_id = v_empresa) THEN
    RAISE EXCEPTION 'Empresa sem meses continuou na comparação';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
