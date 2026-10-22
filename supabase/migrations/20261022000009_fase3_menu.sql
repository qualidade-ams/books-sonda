-- =====================================================================
-- Fase 3 — migration 17: Organizar Menu (ordem, cores e logo do menu lateral)
-- (docs/especificacoes/Modelagem_Fase3.md, seção 12.1; protótipo de 22/10/2026)
--
-- A estrutura do menu continua no código (Sidebar.tsx) como ordem padrão. As
-- tabelas guardam só o que foi mudado na tela:
--   menu_itens       ordem salva: menus e telas, com o pai e a posição. Sem linhas,
--                    vale o menu do código; tela nova (sem linha) entra no fim do
--                    menu em que o código a coloca. A chave da tela é a rota, porque
--                    duas telas dividem a mesma screen_key (Validar e Enviar Elogios).
--   menu_aparencia   uma linha por tema: fundo e texto do menu, dos itens, dos
--                    subitens, do hover e do selecionado, e o logo. O selecionado é
--                    também o destaque do sistema naquele tema.
--   menu-logos       bucket privado para os logos (até 500 KB, imagens)
--   salvar_menu()    grava ordem e aparência numa transação (só quem edita a tela)
--   tela organizar_menu  registrada em Administração, com Edição para Administradores
--
-- Todo usuário logado lê as duas tabelas (todo mundo monta o menu). Nada muda nas
-- telas atuais até o Sidebar passar a ler estas tabelas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tela
-- ---------------------------------------------------------------------

INSERT INTO screens (key, name, description, category, route) VALUES
  ('organizar_menu', 'Organizar Menu', 'Ordem, agrupamento e cores do menu lateral, iguais para todos os usuários',
   'Administração', '/admin/organizar-menu')
ON CONFLICT (key) DO NOTHING;

INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, 'organizar_menu', 'edit'
  FROM user_groups ug
 WHERE ug.name = 'Administradores'
   AND NOT EXISTS (SELECT 1 FROM screen_permissions sp WHERE sp.group_id = ug.id AND sp.screen_key = 'organizar_menu');

-- ---------------------------------------------------------------------
-- 2. Ordem do menu
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS menu_itens (
  -- Tela: a rota (/admin/...). Menu: a chave da seção (requerimentos, administracao...)
  -- ou "menu:<rota>" quando nasceu ao soltar uma tela dentro de uma tela solta
  chave TEXT PRIMARY KEY CHECK (length(trim(chave)) > 0),
  tipo TEXT NOT NULL CHECK (tipo IN ('menu', 'tela')),
  -- Só em tela; nulo = solta no primeiro nível (como o Dashboard). O pai é sempre um
  -- menu (conferido em salvar_menu).
  pai TEXT REFERENCES menu_itens(chave) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  posicao SMALLINT NOT NULL CHECK (posicao >= 0),
  -- Chave do i18n (nav.dashboard...); o menu criado herda a da tela de origem
  rotulo_i18n TEXT NOT NULL CHECK (length(trim(rotulo_i18n)) > 0),
  -- Nome do ícone do lucide
  icone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT menu_itens_menu_sem_pai_ck CHECK (tipo = 'tela' OR pai IS NULL),
  -- Trocar duas posições numa gravação só: conferido no fim da transação. No primeiro
  -- nível (pai nulo) a restrição não vale; salvar_menu confere.
  CONSTRAINT menu_itens_posicao_uq UNIQUE (pai, posicao) DEFERRABLE INITIALLY DEFERRED
);

-- ---------------------------------------------------------------------
-- 3. Aparência do menu
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS menu_aparencia (
  tema TEXT PRIMARY KEY CHECK (tema IN ('claro', 'escuro')),
  menu_fundo TEXT NOT NULL CHECK (menu_fundo ~ '^#[0-9A-F]{6}$'),
  -- Texto do menu fora dos itens (botão Recolher)
  menu_texto TEXT NOT NULL CHECK (menu_texto ~ '^#[0-9A-F]{6}$'),
  item_fundo TEXT NOT NULL CHECK (item_fundo ~ '^#[0-9A-F]{6}$'),
  item_texto TEXT NOT NULL CHECK (item_texto ~ '^#[0-9A-F]{6}$'),
  subitem_fundo TEXT NOT NULL CHECK (subitem_fundo ~ '^#[0-9A-F]{6}$'),
  subitem_texto TEXT NOT NULL CHECK (subitem_texto ~ '^#[0-9A-F]{6}$'),
  hover_fundo TEXT NOT NULL CHECK (hover_fundo ~ '^#[0-9A-F]{6}$'),
  hover_texto TEXT NOT NULL CHECK (hover_texto ~ '^#[0-9A-F]{6}$'),
  -- Também o destaque do sistema no tema (título da faixa, botões principais, foco)
  selecionado_fundo TEXT NOT NULL CHECK (selecionado_fundo ~ '^#[0-9A-F]{6}$'),
  selecionado_texto TEXT NOT NULL CHECK (selecionado_texto ~ '^#[0-9A-F]{6}$'),
  -- Caminho no bucket menu-logos; nulo = logo da Sonda
  logo_path TEXT,
  logo_recolhido_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT
);

-- Padrões do protótipo (CORES_PADRAO_MOCK): selecionado azul no claro, ciano no escuro
INSERT INTO menu_aparencia (tema, menu_fundo, menu_texto, item_fundo, item_texto, subitem_fundo, subitem_texto,
                            hover_fundo, hover_texto, selecionado_fundo, selecionado_texto) VALUES
  ('claro', '#FAFBFC', '#5F6670', '#FAFBFC', '#5F6670', '#FAFBFC', '#5F6670', '#EEF1F4', '#1B1F24', '#2563EB', '#FFFFFF'),
  ('escuro', '#1C1C1C', '#B1B1B1', '#1C1C1C', '#B1B1B1', '#1C1C1C', '#B1B1B1', '#262626', '#FFFFFF', '#00D4E8', '#000000')
ON CONFLICT (tema) DO NOTHING;

-- ---------------------------------------------------------------------
-- 4. Autoria, auditoria e RLS
-- ---------------------------------------------------------------------

DO $$
DECLARE
  v_item RECORD;
BEGIN
  FOR v_item IN SELECT * FROM (VALUES ('menu_itens', 'chave'), ('menu_aparencia', 'tema')) AS t(tabela, coluna_id) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_autoria ON %1$I', v_item.tabela);
    EXECUTE format('CREATE TRIGGER trg_%1$s_autoria BEFORE INSERT OR UPDATE ON %1$I FOR EACH ROW EXECUTE FUNCTION definir_autoria()', v_item.tabela);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_auditoria ON %1$I', v_item.tabela);
    EXECUTE format('CREATE TRIGGER trg_%1$s_auditoria AFTER INSERT OR UPDATE OR DELETE ON %1$I FOR EACH ROW EXECUTE FUNCTION registrar_auditoria(%2$L)',
                   v_item.tabela, v_item.coluna_id);
  END LOOP;
END $$;

-- Leitura para todo usuário logado (todo mundo monta o menu); gravação só por salvar_menu
ALTER TABLE menu_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_aparencia ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_tabela TEXT;
  v_acao TEXT;
BEGIN
  FOREACH v_tabela IN ARRAY ARRAY['menu_itens', 'menu_aparencia'] LOOP
    FOREACH v_acao IN ARRAY ARRAY['select', 'insert', 'update', 'delete'] LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_tabela || '_' || v_acao, v_tabela);
    END LOOP;
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL)',
                   v_tabela || '_select', v_tabela);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 5. Logos (Storage)
-- ---------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('menu-logos', 'menu-logos', false, 512000, ARRAY['image/png', 'image/svg+xml', 'image/webp', 'image/jpeg'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "menu_logos_select" ON storage.objects;
DROP POLICY IF EXISTS "menu_logos_insert" ON storage.objects;
DROP POLICY IF EXISTS "menu_logos_update" ON storage.objects;
DROP POLICY IF EXISTS "menu_logos_delete" ON storage.objects;
CREATE POLICY "menu_logos_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'menu-logos' AND (SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "menu_logos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'menu-logos' AND public.has_screen_permission('organizar_menu'::text, 'edit'::text));
CREATE POLICY "menu_logos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'menu-logos' AND public.has_screen_permission('organizar_menu'::text, 'edit'::text))
  WITH CHECK (bucket_id = 'menu-logos' AND public.has_screen_permission('organizar_menu'::text, 'edit'::text));
CREATE POLICY "menu_logos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'menu-logos' AND public.has_screen_permission('organizar_menu'::text, 'edit'::text));

-- ---------------------------------------------------------------------
-- 6. Salvar (tela Organizar Menu)
-- ---------------------------------------------------------------------

-- p_itens: lista completa [{chave, tipo, pai, posicao, rotulo_i18n, icone}]. O que
--   não estiver nela sai; lista vazia = "Ordem padrão" (volta ao menu do código).
--   Nulo = a ordem não muda.
-- p_aparencia: { "claro": {...}, "escuro": {...} } só com os campos que mudam
--   (menu_fundo, ..., selecionado_texto, logo_path, logo_recolhido_path). Nulo = não muda.
-- Só grava o que mudou, para a auditoria não registrar o menu inteiro a cada vez.
CREATE OR REPLACE FUNCTION public.salvar_menu(p_itens JSONB, p_aparencia JSONB DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claims JSONB := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  v_tema TEXT;
  v_a JSONB;
  v_invalidos TEXT;
BEGIN
  IF NOT (v_claims IS NULL OR v_claims ->> 'role' = 'service_role'
          OR has_screen_permission('organizar_menu'::text, 'edit'::text)) THEN
    RAISE EXCEPTION 'Sem permissão para organizar o menu.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_itens IS NOT NULL THEN
    DELETE FROM menu_itens m
     WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_itens) e WHERE e ->> 'chave' = m.chave);

    INSERT INTO menu_itens (chave, tipo, pai, posicao, rotulo_i18n, icone)
    SELECT e ->> 'chave', e ->> 'tipo', NULLIF(e ->> 'pai', ''), (e ->> 'posicao')::smallint, e ->> 'rotulo_i18n', e ->> 'icone'
      FROM jsonb_array_elements(p_itens) e
    ON CONFLICT (chave) DO UPDATE
      SET tipo = EXCLUDED.tipo, pai = EXCLUDED.pai, posicao = EXCLUDED.posicao,
          rotulo_i18n = EXCLUDED.rotulo_i18n, icone = EXCLUDED.icone
      WHERE (menu_itens.tipo, menu_itens.pai, menu_itens.posicao, menu_itens.rotulo_i18n, menu_itens.icone)
            IS DISTINCT FROM (EXCLUDED.tipo, EXCLUDED.pai, EXCLUDED.posicao, EXCLUDED.rotulo_i18n, EXCLUDED.icone);

    -- O pai é sempre um menu
    SELECT string_agg(f.chave, ', ') INTO v_invalidos
      FROM menu_itens f JOIN menu_itens p ON p.chave = f.pai
     WHERE p.tipo <> 'menu';
    IF v_invalidos IS NOT NULL THEN
      RAISE EXCEPTION 'Tela dentro de tela não é permitido: %', v_invalidos;
    END IF;

    -- Confere posição única e pai existente aqui, e não só no fim da transação
    SET CONSTRAINTS menu_itens_posicao_uq, menu_itens_pai_fkey IMMEDIATE;
    IF EXISTS (SELECT 1 FROM menu_itens WHERE pai IS NULL GROUP BY posicao HAVING count(*) > 1) THEN
      RAISE EXCEPTION 'Dois itens na mesma posição do primeiro nível.' USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  IF p_aparencia IS NOT NULL THEN
    FOREACH v_tema IN ARRAY ARRAY['claro', 'escuro'] LOOP
      v_a := p_aparencia -> v_tema;
      CONTINUE WHEN v_a IS NULL OR jsonb_typeof(v_a) <> 'object';
      UPDATE menu_aparencia
         SET menu_fundo = coalesce(upper(v_a ->> 'menu_fundo'), menu_fundo),
             menu_texto = coalesce(upper(v_a ->> 'menu_texto'), menu_texto),
             item_fundo = coalesce(upper(v_a ->> 'item_fundo'), item_fundo),
             item_texto = coalesce(upper(v_a ->> 'item_texto'), item_texto),
             subitem_fundo = coalesce(upper(v_a ->> 'subitem_fundo'), subitem_fundo),
             subitem_texto = coalesce(upper(v_a ->> 'subitem_texto'), subitem_texto),
             hover_fundo = coalesce(upper(v_a ->> 'hover_fundo'), hover_fundo),
             hover_texto = coalesce(upper(v_a ->> 'hover_texto'), hover_texto),
             selecionado_fundo = coalesce(upper(v_a ->> 'selecionado_fundo'), selecionado_fundo),
             selecionado_texto = coalesce(upper(v_a ->> 'selecionado_texto'), selecionado_texto),
             -- Logo: a chave presente com nulo volta ao logo da Sonda
             logo_path = CASE WHEN v_a ? 'logo_path' THEN v_a ->> 'logo_path' ELSE logo_path END,
             logo_recolhido_path = CASE WHEN v_a ? 'logo_recolhido_path' THEN v_a ->> 'logo_recolhido_path'
                                        ELSE logo_recolhido_path END
       WHERE tema = v_tema;
    END LOOP;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.salvar_menu(JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.salvar_menu(JSONB, JSONB) TO authenticated, service_role;
