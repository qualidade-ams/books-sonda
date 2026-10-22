-- =====================================================================
-- Teste da migration 20261020000005_especialistas_coordenadores.
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou.
-- Qualquer outra mensagem de erro diz qual verificação falhou.
-- =====================================================================
DO $teste$
DECLARE
  v_admin uuid := (SELECT uga.user_id FROM user_group_assignments uga JOIN user_groups ug ON ug.id = uga.group_id
                    WHERE ug.name = 'Administradores' LIMIT 1);
  v_grupo_admin uuid := (SELECT id FROM user_groups WHERE name = 'Administradores');
  -- Usuário sem nenhum grupo: has_screen_permission devolve falso para qualquer tela
  v_sem_acesso uuid := gen_random_uuid();
  v_consultor uuid;
  v_coordenador uuid;
  v_gerente uuid;
  v_escalacao uuid;
  v_n int;
  v_linha record;
  v_falhou boolean;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Precondição: precisa de um usuário no grupo Administradores';
  END IF;

  -- 1. Estrutura: RLS ligada, uma política por operação, nenhuma duplicada
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.especialistas_coordenadores'::regclass) THEN
    RAISE EXCEPTION 'RLS desligada em especialistas_coordenadores';
  END IF;
  SELECT count(*) INTO v_n FROM pg_policies WHERE tablename = 'especialistas_coordenadores';
  IF v_n <> 4 THEN RAISE EXCEPTION 'Esperava 4 políticas em especialistas_coordenadores, achei %', v_n; END IF;
  IF (SELECT count(DISTINCT cmd) FROM pg_policies WHERE tablename = 'especialistas_coordenadores') <> 4 THEN
    RAISE EXCEPTION 'Políticas de especialistas_coordenadores não cobrem SELECT/INSERT/UPDATE/DELETE uma vez cada';
  END IF;

  -- 2. Funções: SECURITY DEFINER, search_path fixo, sem EXECUTE para anon
  IF EXISTS (SELECT 1 FROM pg_proc
              WHERE proname IN ('listar_responsaveis_organograma', 'listar_especialistas_para_email',
                                'especialistas_coordenadores_antes_gravar')
                AND pronamespace = 'public'::regnamespace
                AND (NOT prosecdef OR NOT ('search_path=public' = ANY (coalesce(proconfig, '{}'))))) THEN
    RAISE EXCEPTION 'Função nova sem SECURITY DEFINER ou sem search_path fixo';
  END IF;
  IF has_function_privilege('anon', 'public.listar_responsaveis_organograma()', 'execute')
     OR has_function_privilege('anon', 'public.listar_especialistas_para_email()', 'execute') THEN
    RAISE EXCEPTION 'Função nova executável por anon';
  END IF;

  -- 3. Tela registrada em Administração, com edição para Administradores
  IF NOT EXISTS (SELECT 1 FROM screens WHERE key = 'consultores_coordenadores'
                  AND category = 'Administração' AND route = '/admin/consultores-coordenadores') THEN
    RAISE EXCEPTION 'Tela consultores_coordenadores não registrada em Administração';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM screen_permissions WHERE group_id = v_grupo_admin
                  AND screen_key = 'consultores_coordenadores' AND permission_level = 'edit') THEN
    RAISE EXCEPTION 'Administradores sem edição em consultores_coordenadores';
  END IF;

  -- Massa de teste (ainda como dono do banco)
  INSERT INTO especialistas (nome, email, origem) VALUES ('TESTE Consultor', 'teste.consultor@sonda.com', 'manual')
    RETURNING id INTO v_consultor;
  INSERT INTO organizacao_estrutura (nome, cargo, departamento, email) VALUES
    ('TESTE Coordenador', 'Coordenador', 'TESTE', 'teste.coordenador@sonda.com') RETURNING id INTO v_coordenador;
  INSERT INTO organizacao_estrutura (nome, cargo, departamento, email) VALUES
    ('TESTE Gerente', 'Gerente', 'TESTE', 'teste.gerente@sonda.com') RETURNING id INTO v_gerente;
  INSERT INTO organizacao_estrutura (nome, cargo, departamento, email) VALUES
    ('TESTE Escalação', 'Central Escalação', 'TESTE', 'teste.escalacao@sonda.com') RETURNING id INTO v_escalacao;
  -- Garante que o administrador enxerga a tela de inconsistências (revertido no fim)
  INSERT INTO screen_permissions (group_id, screen_key, permission_level)
  VALUES (v_grupo_admin, 'inconsistencia_chamados', 'edit')
  ON CONFLICT (group_id, screen_key) DO UPDATE SET permission_level = 'edit';

  PERFORM set_config('role', 'authenticated', true);

  -- 4. Sem permissão: não grava vínculo nem lê as funções
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_sem_acesso, 'role', 'authenticated')::text, true);
  v_falhou := false;
  BEGIN INSERT INTO especialistas_coordenadores (especialista_id, coordenador_id) VALUES (v_consultor, v_coordenador);
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Usuário sem permissão gravou vínculo'; END IF;
  v_falhou := false;
  BEGIN PERFORM listar_responsaveis_organograma();
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Usuário sem permissão listou os responsáveis do organograma'; END IF;
  v_falhou := false;
  BEGIN PERFORM listar_especialistas_para_email();
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Usuário sem permissão listou os emails dos coordenadores'; END IF;

  -- 5. Responsáveis: só Coordenador, Gerente e Diretor
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  IF NOT EXISTS (SELECT 1 FROM listar_responsaveis_organograma() WHERE id = v_coordenador)
     OR NOT EXISTS (SELECT 1 FROM listar_responsaveis_organograma() WHERE id = v_gerente) THEN
    RAISE EXCEPTION 'listar_responsaveis_organograma não trouxe Coordenador e Gerente';
  END IF;
  IF EXISTS (SELECT 1 FROM listar_responsaveis_organograma() WHERE cargo NOT IN ('Coordenador', 'Gerente', 'Diretor')) THEN
    RAISE EXCEPTION 'listar_responsaveis_organograma trouxe cargo fora de Coordenador/Gerente/Diretor';
  END IF;

  -- 6. Cargo fora da lista é recusado
  v_falhou := false;
  BEGIN INSERT INTO especialistas_coordenadores (especialista_id, coordenador_id) VALUES (v_consultor, v_escalacao);
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou responsável com cargo Central Escalação'; END IF;

  -- 7. Vínculo com autoria; um consultor tem um coordenador só (upsert troca)
  INSERT INTO especialistas_coordenadores (especialista_id, coordenador_id) VALUES (v_consultor, v_coordenador);
  IF NOT EXISTS (SELECT 1 FROM especialistas_coordenadores WHERE especialista_id = v_consultor
                  AND created_by = v_admin AND updated_by = v_admin) THEN
    RAISE EXCEPTION 'Autoria do vínculo não é o usuário logado';
  END IF;
  INSERT INTO especialistas_coordenadores (especialista_id, coordenador_id) VALUES (v_consultor, v_gerente)
  ON CONFLICT (especialista_id) DO UPDATE SET coordenador_id = EXCLUDED.coordenador_id;
  SELECT count(*) INTO v_n FROM especialistas_coordenadores WHERE especialista_id = v_consultor;
  IF v_n <> 1 THEN RAISE EXCEPTION 'Consultor ficou com % vínculos', v_n; END IF;

  -- 8. Email: o consultor vem com o email do responsável
  SELECT * INTO v_linha FROM listar_especialistas_para_email() WHERE nome = 'TESTE Consultor';
  IF v_linha.email IS DISTINCT FROM 'teste.consultor@sonda.com'
     OR v_linha.email_coordenador IS DISTINCT FROM 'teste.gerente@sonda.com' THEN
    RAISE EXCEPTION 'listar_especialistas_para_email devolveu % / %', v_linha.email, v_linha.email_coordenador;
  END IF;

  -- 9. Remover o vínculo deixa o consultor sem coordenador
  DELETE FROM especialistas_coordenadores WHERE especialista_id = v_consultor;
  SELECT * INTO v_linha FROM listar_especialistas_para_email() WHERE nome = 'TESTE Consultor';
  IF v_linha.email_coordenador IS NOT NULL THEN
    RAISE EXCEPTION 'Consultor sem vínculo ainda veio com email de coordenador';
  END IF;

  -- 10. Pessoa removida do organograma leva o vínculo junto
  INSERT INTO especialistas_coordenadores (especialista_id, coordenador_id) VALUES (v_consultor, v_coordenador);
  PERFORM set_config('role', 'postgres', true);
  DELETE FROM organizacao_estrutura WHERE id = v_coordenador;
  IF EXISTS (SELECT 1 FROM especialistas_coordenadores WHERE especialista_id = v_consultor) THEN
    RAISE EXCEPTION 'Vínculo ficou órfão após remover a pessoa do organograma';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
