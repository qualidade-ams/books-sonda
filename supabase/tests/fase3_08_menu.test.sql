-- =====================================================================
-- Teste da migration 20261022000009_fase3_menu
-- (docs/especificacoes/Modelagem_Fase3.md, seção 12.1).
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
  v_itens jsonb;
  v_texto text;
  v_r record;
  v_falhou boolean;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Precondição: precisa de um usuário no grupo Administradores';
  END IF;

  -- -------------------------------------------------------------------
  -- 1. Estrutura
  -- -------------------------------------------------------------------
  IF to_regclass('public.menu_itens') IS NULL OR to_regclass('public.menu_aparencia') IS NULL THEN
    RAISE EXCEPTION 'Tabelas do menu não existem';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.menu_itens'::regclass)
     OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.menu_aparencia'::regclass) THEN
    RAISE EXCEPTION 'RLS desligada nas tabelas do menu';
  END IF;
  -- Leitura para todo usuário logado; gravação só pela função
  IF (SELECT array_agg(DISTINCT cmd::text) FROM pg_policies WHERE tablename IN ('menu_itens', 'menu_aparencia'))
     IS DISTINCT FROM ARRAY['SELECT'] THEN
    RAISE EXCEPTION 'As tabelas do menu deveriam ter só políticas de SELECT';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM screens WHERE key = 'organizar_menu' AND category = 'Administração')
     OR NOT EXISTS (SELECT 1 FROM screen_permissions sp JOIN user_groups ug ON ug.id = sp.group_id
                     WHERE ug.name = 'Administradores' AND sp.screen_key = 'organizar_menu' AND sp.permission_level = 'edit') THEN
    RAISE EXCEPTION 'Tela organizar_menu não registrada em Administração com Edição para Administradores';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'menu-logos' AND NOT public AND file_size_limit = 512000
                    AND allowed_mime_types @> ARRAY['image/png', 'image/svg+xml', 'image/webp', 'image/jpeg']) THEN
    RAISE EXCEPTION 'Bucket menu-logos ausente ou com configuração errada (privado, 500 KB, imagens)';
  END IF;
  IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
        AND (coalesce(qual, '') || coalesce(with_check, '')) LIKE '%menu-logos%') <> 4 THEN
    RAISE EXCEPTION 'Esperava 4 políticas do bucket menu-logos (ler, enviar, trocar e apagar)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
              AND (coalesce(qual, '') || coalesce(with_check, '')) LIKE '%menu-logos%'
              AND cmd <> 'SELECT' AND (coalesce(qual, '') || coalesce(with_check, '')) NOT LIKE '%organizar_menu%') THEN
    RAISE EXCEPTION 'Gravação no bucket menu-logos sem exigir Edição em Organizar Menu';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'salvar_menu' AND pronamespace = 'public'::regnamespace
              AND (NOT prosecdef OR NOT ('search_path=public' = ANY (coalesce(proconfig, '{}'))))) THEN
    RAISE EXCEPTION 'salvar_menu sem SECURITY DEFINER ou sem search_path fixo';
  END IF;
  IF has_function_privilege('anon', 'public.salvar_menu(jsonb, jsonb)', 'execute') THEN
    RAISE EXCEPTION 'salvar_menu executável por anon';
  END IF;

  -- -------------------------------------------------------------------
  -- 2. Carga: aparência padrão nos dois temas
  -- -------------------------------------------------------------------
  SELECT string_agg(tema || ':' || menu_fundo || '/' || item_texto || '/' || hover_fundo || '/' || selecionado_fundo || '/' || selecionado_texto,
                    ', ' ORDER BY tema COLLATE "C") INTO v_texto
    FROM menu_aparencia;
  IF v_texto IS DISTINCT FROM 'claro:#FAFBFC/#5F6670/#EEF1F4/#2563EB/#FFFFFF, escuro:#1C1C1C/#B1B1B1/#262626/#00D4E8/#000000' THEN
    RAISE EXCEPTION 'Aparência padrão diferente do protótipo: %', v_texto;
  END IF;

  -- -------------------------------------------------------------------
  -- 3. Regras das tabelas
  -- -------------------------------------------------------------------
  v_falhou := false;
  BEGIN UPDATE menu_aparencia SET menu_fundo = 'azul' WHERE tema = 'claro';
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou cor fora do formato #RRGGBB'; END IF;

  v_falhou := false;
  BEGIN INSERT INTO menu_itens (chave, tipo, pai, posicao, rotulo_i18n) VALUES ('teste_menu', 'menu', 'outro', 0, 'nav.x');
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou menu dentro de menu'; END IF;

  -- -------------------------------------------------------------------
  -- 4. Salvar pela tela
  -- -------------------------------------------------------------------
  v_itens := jsonb_build_array(
    jsonb_build_object('chave', 'menu:/admin/dashboard', 'tipo', 'menu', 'pai', NULL, 'posicao', 0, 'rotulo_i18n', 'nav.dashboard', 'icone', 'Home'),
    jsonb_build_object('chave', '/admin/dashboard', 'tipo', 'tela', 'pai', 'menu:/admin/dashboard', 'posicao', 0, 'rotulo_i18n', 'nav.dashboard', 'icone', 'Home'),
    jsonb_build_object('chave', '/admin/lancar-requerimentos', 'tipo', 'tela', 'pai', 'menu:/admin/dashboard', 'posicao', 1, 'rotulo_i18n', 'nav.registerRequirements', 'icone', 'FileText'),
    jsonb_build_object('chave', 'requerimentos', 'tipo', 'menu', 'pai', NULL, 'posicao', 1, 'rotulo_i18n', 'nav.requirements', 'icone', 'FileText'),
    jsonb_build_object('chave', '/admin/faturar-requerimentos', 'tipo', 'tela', 'pai', 'requerimentos', 'posicao', 0, 'rotulo_i18n', 'nav.billingRequirements', 'icone', 'DollarSign'),
    jsonb_build_object('chave', '/admin/organizar-menu', 'tipo', 'tela', 'pai', NULL, 'posicao', 2, 'rotulo_i18n', 'nav.organizeMenu', 'icone', 'ListOrdered'));

  PERFORM set_config('role', 'authenticated', true);

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_sem_acesso, 'role', 'authenticated')::text, true);
  v_falhou := false;
  BEGIN PERFORM salvar_menu(v_itens, NULL);
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Usuário sem permissão salvou o menu'; END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  -- Gravar direto, nem o administrador grava (sem política de escrita)
  v_falhou := false;
  BEGIN INSERT INTO menu_itens (chave, tipo, posicao, rotulo_i18n) VALUES ('/admin/teste', 'tela', 9, 'nav.x');
  EXCEPTION WHEN insufficient_privilege THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Gravou em menu_itens direto, sem a função'; END IF;

  PERFORM salvar_menu(v_itens, jsonb_build_object('claro', jsonb_build_object('selecionado_fundo', '#16A34A',
                                                                              'logo_path', 'claro/logo.png')));

  -- Tela dentro de uma tela é recusada
  v_falhou := false;
  BEGIN PERFORM salvar_menu(v_itens || jsonb_build_array(jsonb_build_object(
          'chave', '/admin/teste', 'tipo', 'tela', 'pai', '/admin/dashboard', 'posicao', 0, 'rotulo_i18n', 'nav.x')), NULL);
  EXCEPTION WHEN raise_exception OR foreign_key_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou tela dentro de tela'; END IF;

  -- Duas telas na mesma posição do mesmo menu são recusadas
  v_falhou := false;
  BEGIN PERFORM salvar_menu(jsonb_set(v_itens, '{2,posicao}', '0'), NULL);
  EXCEPTION WHEN unique_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou duas telas na mesma posição'; END IF;
  -- Também no primeiro nível (sem pai)
  v_falhou := false;
  BEGIN PERFORM salvar_menu(jsonb_set(v_itens, '{5,posicao}', '1'), NULL);
  EXCEPTION WHEN unique_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou dois itens na mesma posição do primeiro nível'; END IF;

  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  SELECT string_agg(coalesce(pai, '-') || '>' || chave || '#' || posicao, ', ' ORDER BY coalesce(pai, '') COLLATE "C", posicao)
    INTO v_texto FROM menu_itens;
  IF v_texto IS DISTINCT FROM
     '->menu:/admin/dashboard#0, ->requerimentos#1, ->/admin/organizar-menu#2, '
     'menu:/admin/dashboard>/admin/dashboard#0, menu:/admin/dashboard>/admin/lancar-requerimentos#1, '
     'requerimentos>/admin/faturar-requerimentos#0' THEN
    RAISE EXCEPTION 'Menu salvo diferente do enviado: %', v_texto;
  END IF;
  SELECT * INTO v_r FROM menu_aparencia WHERE tema = 'claro';
  IF v_r.selecionado_fundo <> '#16A34A' OR v_r.logo_path <> 'claro/logo.png' OR v_r.menu_fundo <> '#FAFBFC'
     OR v_r.updated_by IS DISTINCT FROM v_admin THEN
    RAISE EXCEPTION 'Aparência salva errada (só os campos enviados mudam)';
  END IF;
  IF (SELECT selecionado_fundo FROM menu_aparencia WHERE tema = 'escuro') <> '#00D4E8' THEN
    RAISE EXCEPTION 'Salvar o tema claro mexeu no escuro';
  END IF;

  -- Trocar duas posições e salvar de novo grava só o que mudou
  PERFORM salvar_menu(jsonb_set(jsonb_set(v_itens, '{1,posicao}', '1'), '{2,posicao}', '0'), NULL);
  IF (SELECT posicao FROM menu_itens WHERE chave = '/admin/lancar-requerimentos') <> 0 THEN
    RAISE EXCEPTION 'Troca de posições não foi gravada';
  END IF;
  IF (SELECT count(*) FROM auditoria_alteracoes WHERE tabela = 'menu_itens' AND acao = 'update') <> 2 THEN
    RAISE EXCEPTION 'A troca de duas posições deveria gerar duas alterações na auditoria, gerou %',
      (SELECT count(*) FROM auditoria_alteracoes WHERE tabela = 'menu_itens' AND acao = 'update');
  END IF;

  -- "Ordem padrão": lista vazia volta para a ordem do código; aparência nula não muda
  PERFORM salvar_menu('[]'::jsonb, NULL);
  IF EXISTS (SELECT 1 FROM menu_itens) THEN RAISE EXCEPTION 'Ordem padrão não apagou a ordem salva'; END IF;
  IF (SELECT selecionado_fundo FROM menu_aparencia WHERE tema = 'claro') <> '#16A34A' THEN
    RAISE EXCEPTION 'Salvar só a ordem mexeu na aparência';
  END IF;

  -- Logo de volta para o padrão (nulo enviado)
  PERFORM salvar_menu(NULL, jsonb_build_object('claro', jsonb_build_object('logo_path', NULL)));
  IF (SELECT logo_path FROM menu_aparencia WHERE tema = 'claro') IS NOT NULL THEN
    RAISE EXCEPTION 'Não voltou o logo para o padrão';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
