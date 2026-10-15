-- =====================================================================
-- Fase 1 — migration 1: infraestrutura comum e catálogos
-- (docs/especificacoes/Modelagem_Fase1.md, seções 2, 3.1, 3.5 e 4)
--
-- Infraestrutura usada por todas as tabelas novas da reconstrução:
--   definir_autoria()      gatilho BEFORE: created_by/updated_by/updated_at
--   registrar_auditoria()  gatilho AFTER: grava em auditoria_alteracoes
--   auditoria_alteracoes   trilha genérica (só INSERT, feito pelo gatilho)
-- Catálogos: produtos, produto_modulos, grupos_aranda (de-para novo),
--   ramos_atividade, modulos_requerimento_produto.
-- Telas registradas (Edição só para Administradores): produtos_modulos,
--   de_para_grupos, ramos_atividade, bancos_horas_auditoria.
--
-- Só cria estruturas novas e vazias; nenhuma tabela atual é alterada.
-- A carga dos catálogos é feita na migration de carga.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Auditoria genérica
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS auditoria_alteracoes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tabela TEXT NOT NULL,
  registro_id TEXT NOT NULL,
  -- Sem FK de propósito: a trilha nunca é apagada junto com o registro
  empresa_id UUID,
  banco_id UUID,
  acao TEXT NOT NULL CHECK (acao IN ('insert', 'update', 'delete')),
  campos_alterados TEXT[],
  dados_antes JSONB,
  dados_depois JSONB,
  usuario_id UUID,
  origem TEXT NOT NULL CHECK (origem IN ('app', 'sincronizacao', 'carga', 'sistema')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auditoria_alteracoes_registro_idx ON auditoria_alteracoes (tabela, registro_id, created_at DESC);
CREATE INDEX IF NOT EXISTS auditoria_alteracoes_empresa_idx ON auditoria_alteracoes (empresa_id, created_at DESC) WHERE empresa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS auditoria_alteracoes_banco_idx ON auditoria_alteracoes (banco_id, created_at DESC) WHERE banco_id IS NOT NULL;

ALTER TABLE auditoria_alteracoes ENABLE ROW LEVEL SECURITY;

-- Leitura pela tela Auditoria do Banco de Horas. Sem INSERT/UPDATE/DELETE para
-- usuários: só o gatilho (SECURITY DEFINER) grava, e ninguém altera ou apaga.
DROP POLICY IF EXISTS "auditoria_alteracoes_select" ON auditoria_alteracoes;
CREATE POLICY "auditoria_alteracoes_select" ON auditoria_alteracoes
  FOR SELECT TO authenticated
  USING (has_screen_permission('bancos_horas_auditoria'::text, 'view'::text));

-- Preenche a autoria. Na atualização, preserva created_* e atualiza updated_*.
CREATE OR REPLACE FUNCTION public.definir_autoria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := COALESCE(NEW.created_at, NOW());
    NEW.created_by := COALESCE(NEW.created_by, (SELECT auth.uid()));
  ELSE
    NEW.created_at := OLD.created_at;
    NEW.created_by := OLD.created_by;
  END IF;
  NEW.updated_at := NOW();
  NEW.updated_by := (SELECT auth.uid());
  RETURN NEW;
END;
$$;

-- Grava a alteração em auditoria_alteracoes.
-- Origem: app.origem da sessão ('sincronizacao', 'carga', 'sistema'); padrão 'app'.
-- TG_ARGV[0] (opcional): coluna que identifica o registro, quando não é "id".
-- Atualização sem mudança real (só colunas de autoria) não é registrada.
CREATE OR REPLACE FUNCTION public.registrar_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_antes JSONB := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END;
  v_depois JSONB := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END;
  v_linha JSONB := COALESCE(v_depois, v_antes);
  v_coluna_id TEXT := COALESCE(TG_ARGV[0], 'id');
  v_campos TEXT[];
  v_origem TEXT := COALESCE(NULLIF(current_setting('app.origem', true), ''), 'app');
BEGIN
  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(chave ORDER BY chave) INTO v_campos
      FROM jsonb_object_keys(v_depois) AS chave
     WHERE chave NOT IN ('created_at', 'created_by', 'updated_at', 'updated_by')
       AND v_antes -> chave IS DISTINCT FROM v_depois -> chave;
    IF v_campos IS NULL THEN
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO auditoria_alteracoes
    (tabela, registro_id, empresa_id, banco_id, acao, campos_alterados, dados_antes, dados_depois, usuario_id, origem)
  VALUES (
    TG_TABLE_NAME,
    v_linha ->> v_coluna_id,
    NULLIF(v_linha ->> 'empresa_id', '')::uuid,
    NULLIF(v_linha ->> 'banco_id', '')::uuid,
    lower(TG_OP),
    v_campos,
    v_antes,
    v_depois,
    (SELECT auth.uid()),
    v_origem
  );
  RETURN NULL;
END;
$$;

-- ---------------------------------------------------------------------
-- Catálogos
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL CHECK (length(trim(nome)) > 0),
  descricao TEXT,
  ordem SMALLINT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  inativado_em TIMESTAMPTZ,
  inativado_por UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS produto_modulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  nome TEXT NOT NULL CHECK (length(trim(nome)) > 0),
  descricao TEXT,
  ordem SMALLINT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  inativado_em TIMESTAMPTZ,
  inativado_por UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  -- Alvo das FKs compostas (garante que o módulo pertence ao produto informado)
  CONSTRAINT produto_modulos_id_produto_uq UNIQUE (id, produto_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS produto_modulos_nome_uq ON produto_modulos (produto_id, lower(nome));

CREATE TABLE IF NOT EXISTS grupos_aranda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_aranda TEXT NOT NULL UNIQUE CHECK (length(trim(grupo_aranda)) > 0),
  grupo_book TEXT NOT NULL CHECK (length(trim(grupo_book)) > 0),
  produto_id UUID REFERENCES produtos(id) ON DELETE RESTRICT,
  modulo_id UUID,
  -- modulo: tem módulo (e produto) · sem_modulo: pode ter só o produto, horas vão
  -- para o banco do produto inteiro ou para o padrão · nao_se_aplica: grupos sem
  -- produto (DEDICADOS, T&M...), sempre para o Banco padrão
  classificacao TEXT NOT NULL CHECK (classificacao IN ('modulo', 'sem_modulo', 'nao_se_aplica')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  inativado_em TIMESTAMPTZ,
  inativado_por UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT grupos_aranda_modulo_fk FOREIGN KEY (modulo_id, produto_id)
    REFERENCES produto_modulos (id, produto_id) ON DELETE RESTRICT,
  CONSTRAINT grupos_aranda_classificacao_ck CHECK (
    (classificacao = 'modulo' AND modulo_id IS NOT NULL AND produto_id IS NOT NULL)
    OR (classificacao = 'sem_modulo' AND modulo_id IS NULL)
    OR (classificacao = 'nao_se_aplica' AND modulo_id IS NULL AND produto_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS grupos_aranda_modulo_idx ON grupos_aranda (modulo_id);
CREATE INDEX IF NOT EXISTS grupos_aranda_produto_idx ON grupos_aranda (produto_id);

CREATE TABLE IF NOT EXISTS ramos_atividade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL CHECK (length(trim(nome)) > 0),
  ordem SMALLINT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  inativado_em TIMESTAMPTZ,
  inativado_por UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS ramos_atividade_nome_uq ON ramos_atividade (lower(trim(nome)));

CREATE TABLE IF NOT EXISTS modulos_requerimento_produto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Valor de requerimentos.modulo (Comex, Comply, Comply e-DOCS, pw.SATI...)
  modulo_requerimento TEXT NOT NULL UNIQUE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  -- Nulo = produto inteiro
  modulo_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT modulos_requerimento_produto_modulo_fk FOREIGN KEY (modulo_id, produto_id)
    REFERENCES produto_modulos (id, produto_id) ON DELETE RESTRICT
);

-- ---------------------------------------------------------------------
-- Autoria e auditoria nos catálogos
-- ---------------------------------------------------------------------

DO $$
DECLARE
  v_tabela TEXT;
BEGIN
  FOREACH v_tabela IN ARRAY ARRAY['produtos', 'produto_modulos', 'grupos_aranda', 'ramos_atividade', 'modulos_requerimento_produto'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_autoria ON %1$I', v_tabela);
    EXECUTE format('CREATE TRIGGER trg_%1$s_autoria BEFORE INSERT OR UPDATE ON %1$I FOR EACH ROW EXECUTE FUNCTION definir_autoria()', v_tabela);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_auditoria ON %1$I', v_tabela);
    EXECUTE format('CREATE TRIGGER trg_%1$s_auditoria AFTER INSERT OR UPDATE OR DELETE ON %1$I FOR EACH ROW EXECUTE FUNCTION registrar_auditoria()', v_tabela);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- RLS dos catálogos
-- Leitura: qualquer usuário logado (dados de referência, sem dado pessoal,
-- usados por várias telas). Escrita: Edição na tela dona do catálogo.
-- Sem DELETE: a exclusão é lógica (ativo/inativo).
-- ---------------------------------------------------------------------

ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE produto_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupos_aranda ENABLE ROW LEVEL SECURITY;
ALTER TABLE ramos_atividade ENABLE ROW LEVEL SECURITY;
ALTER TABLE modulos_requerimento_produto ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_item RECORD;
BEGIN
  FOR v_item IN
    SELECT * FROM (VALUES
      ('produtos', 'produtos_modulos'),
      ('produto_modulos', 'produtos_modulos'),
      ('modulos_requerimento_produto', 'produtos_modulos'),
      ('grupos_aranda', 'de_para_grupos'),
      ('ramos_atividade', 'ramos_atividade')
    ) AS t(tabela, tela)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_item.tabela || '_select', v_item.tabela);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_item.tabela || '_insert', v_item.tabela);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_item.tabela || '_update', v_item.tabela);

    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL)',
      v_item.tabela || '_select', v_item.tabela);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK (has_screen_permission(%L::text, ''edit''::text))',
      v_item.tabela || '_insert', v_item.tabela, v_item.tela);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING (has_screen_permission(%L::text, ''edit''::text)) WITH CHECK (has_screen_permission(%L::text, ''edit''::text))',
      v_item.tabela || '_update', v_item.tabela, v_item.tela, v_item.tela);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- Telas novas (rotas e menu só na Fase 3) e permissão inicial (9.3-3)
-- ---------------------------------------------------------------------

INSERT INTO screens (key, name, description, category, route) VALUES
  ('produtos_modulos', 'Produtos e Módulos', 'Catálogo de produtos e módulos usado no escopo dos bancos de horas', 'Banco de Horas', '/admin/produtos-modulos'),
  ('de_para_grupos', 'De-para de Grupos', 'Vínculo dos grupos do Aranda com o grupo do Book e o módulo', 'Banco de Horas', '/admin/de-para-grupos'),
  ('ramos_atividade', 'Ramos de Atividade', 'Lista de ramos de atividade das empresas', 'Cliente', '/admin/ramos-atividade'),
  ('bancos_horas_auditoria', 'Auditoria do Banco de Horas (nova)', 'Trilha de alterações das tabelas novas do banco de horas', 'Banco de Horas', '/admin/bancos-horas/auditoria')
ON CONFLICT (key) DO NOTHING;

INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, s.key, 'edit'
  FROM user_groups ug
 CROSS JOIN (VALUES ('produtos_modulos'), ('de_para_grupos'), ('ramos_atividade'), ('bancos_horas_auditoria')) AS s(key)
 WHERE ug.name = 'Administradores'
   AND NOT EXISTS (SELECT 1 FROM screen_permissions sp WHERE sp.group_id = ug.id AND sp.screen_key = s.key);

-- Funções internas: só os gatilhos chamam
REVOKE EXECUTE ON FUNCTION public.definir_autoria(), public.registrar_auditoria() FROM PUBLIC, anon, authenticated;
