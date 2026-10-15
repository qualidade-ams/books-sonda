-- =====================================================================
-- Fase 1 — migration 2: empresa nova e satélites
-- (docs/especificacoes/Modelagem_Fase1.md, seções 3.2 e 4)
--
-- empresas                        identidade, Book e modelo de cálculo (mesmo id do legado)
-- empresas_produtos               produtos contratados
-- empresas_organizacoes_aranda    vínculo com o Aranda por cadastro (não pelo nome da empresa)
-- empresas_informacoes_contrato   ramo e informações FISCAL (1:1)
--
-- Só cria estruturas novas e vazias; nenhuma tabela atual é alterada.
-- A carga e a sincronização com empresas_clientes vêm em migrations próprias.
-- =====================================================================

CREATE TABLE IF NOT EXISTS empresas (
  -- Sem default: é sempre o id de empresas_clientes (CA-18)
  id UUID PRIMARY KEY,
  nome_completo TEXT NOT NULL CHECK (length(trim(nome_completo)) > 0),
  nome_abreviado TEXT NOT NULL CHECK (length(trim(nome_abreviado)) > 0),
  -- D-13: sem "suspenso"
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  data_status TIMESTAMPTZ,
  descricao_status TEXT,
  email_gestor TEXT,
  email_comercial TEXT,
  email_tm TEXT,
  link_sharepoint TEXT,
  observacao TEXT CHECK (observacao IS NULL OR length(observacao) <= 500),
  em_projeto BOOLEAN NOT NULL DEFAULT FALSE,
  tem_ams BOOLEAN NOT NULL DEFAULT FALSE,
  -- D-12: vigência do CONTRATO (controla disparo, lista de Books e inativação)
  vigencia_inicio DATE,
  vigencia_fim DATE,
  empresa_consolidadora_id UUID REFERENCES empresas(id) ON DELETE RESTRICT,
  -- Configurações de Book
  tipo_book TEXT NOT NULL DEFAULT 'nao_tem_book' CHECK (tipo_book IN ('nao_tem_book', 'qualidade', 'outros')),
  book_personalizado BOOLEAN NOT NULL DEFAULT FALSE,
  book_anexo BOOLEAN NOT NULL DEFAULT FALSE,
  -- 'portugues', 'ingles' ou UUID de email_templates (igual ao legado; normalizar na Fase 6)
  template_padrao TEXT,
  meta_sla_percentual NUMERIC(5,2) CHECK (meta_sla_percentual BETWEEN 0 AND 100),
  quantidade_minima_chamados_sla INTEGER CHECK (quantidade_minima_chamados_sla >= 0),
  -- RN-15: empresa calculada pelo modelo atual até ser liberada
  modelo_calculo TEXT NOT NULL DEFAULT 'legado' CHECK (modelo_calculo IN ('legado', 'multiplo')),
  modelo_alterado_em TIMESTAMPTZ,
  modelo_alterado_por UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  -- Sincronização com empresas_clientes (Fases 1 a 5)
  sincronizado_em TIMESTAMPTZ,
  excluida_no_legado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT empresas_vigencia_ck CHECK (vigencia_fim IS NULL OR vigencia_inicio IS NULL OR vigencia_fim >= vigencia_inicio),
  CONSTRAINT empresas_consolidadora_ck CHECK (empresa_consolidadora_id IS DISTINCT FROM id)
);

-- Nomes não são únicos no banco de propósito: uma duplicidade criada no legado
-- não pode travar a sincronização. A tela nova valida.
CREATE INDEX IF NOT EXISTS empresas_nome_abreviado_idx ON empresas (lower(nome_abreviado));
CREATE INDEX IF NOT EXISTS empresas_status_idx ON empresas (status);
CREATE INDEX IF NOT EXISTS empresas_consolidadora_idx ON empresas (empresa_consolidadora_id) WHERE empresa_consolidadora_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS empresas_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT empresas_produtos_uq UNIQUE (empresa_id, produto_id)
);

CREATE INDEX IF NOT EXISTS empresas_produtos_produto_idx ON empresas_produtos (produto_id);

CREATE TABLE IF NOT EXISTS empresas_organizacoes_aranda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  -- Exatamente como vem do Aranda (org_us_final / organizacao)
  nome_organizacao TEXT NOT NULL CHECK (length(trim(nome_organizacao)) > 0),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  inativado_em TIMESTAMPTZ,
  inativado_por UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT
);

-- Uma organização (ativa) pertence a uma única empresa
CREATE UNIQUE INDEX IF NOT EXISTS empresas_organizacoes_aranda_nome_uq
  ON empresas_organizacoes_aranda (lower(trim(nome_organizacao))) WHERE ativo;
CREATE INDEX IF NOT EXISTS empresas_organizacoes_aranda_empresa_idx ON empresas_organizacoes_aranda (empresa_id);

CREATE TABLE IF NOT EXISTS empresas_informacoes_contrato (
  empresa_id UUID PRIMARY KEY REFERENCES empresas(id) ON DELETE RESTRICT,
  ramo_atividade_id UUID REFERENCES ramos_atividade(id) ON DELETE RESTRICT,
  -- Só domínios: a obrigatoriedade condicional (RN-28 a RN-32) fica na tela, e os
  -- campos que deixam de se aplicar ficam guardados (RN-33). Nulos = pendente (RN-35).
  fiscal_modalidade TEXT CHECK (fiscal_modalidade IN ('saas', 'on_premise')),
  fiscal_edocs_24x7 BOOLEAN,
  fiscal_atualizacao_contratada BOOLEAN,
  fiscal_atualizacoes_por_ano SMALLINT CHECK (fiscal_atualizacoes_por_ano > 0),
  fiscal_dba TEXT CHECK (fiscal_dba IN ('atendimento', 'monitoramento', 'atendimento_monitoramento', 'nao_contratado')),
  fiscal_banco_dados TEXT CHECK (fiscal_banco_dados IN ('sql_server', 'oracle')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS empresas_informacoes_contrato_ramo_idx ON empresas_informacoes_contrato (ramo_atividade_id);

-- ---------------------------------------------------------------------
-- Autoria e auditoria
-- ---------------------------------------------------------------------

-- registrar_auditoria ganha um 2º argumento opcional: a coluna que identifica a
-- empresa (padrão "empresa_id"). Na tabela empresas, a própria "id".
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
  v_coluna_empresa TEXT := COALESCE(TG_ARGV[1], 'empresa_id');
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
    NULLIF(v_linha ->> v_coluna_empresa, '')::uuid,
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

REVOKE EXECUTE ON FUNCTION public.registrar_auditoria() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  v_item RECORD;
BEGIN
  FOR v_item IN
    SELECT * FROM (VALUES
      ('empresas', 'id', 'id'),
      ('empresas_produtos', 'id', 'empresa_id'),
      ('empresas_organizacoes_aranda', 'id', 'empresa_id'),
      ('empresas_informacoes_contrato', 'empresa_id', 'empresa_id')
    ) AS t(tabela, coluna_id, coluna_empresa)
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_autoria ON %1$I', v_item.tabela);
    EXECUTE format('CREATE TRIGGER trg_%1$s_autoria BEFORE INSERT OR UPDATE ON %1$I FOR EACH ROW EXECUTE FUNCTION definir_autoria()', v_item.tabela);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_auditoria ON %1$I', v_item.tabela);
    EXECUTE format('CREATE TRIGGER trg_%1$s_auditoria AFTER INSERT OR UPDATE OR DELETE ON %1$I FOR EACH ROW EXECUTE FUNCTION registrar_auditoria(%2$L, %3$L)',
                   v_item.tabela, v_item.coluna_id, v_item.coluna_empresa);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- RLS: tudo pela tela "empresas". Exclusão física só em empresas_produtos
-- (tabela de ligação); nas demais, só inativação (D-14).
-- ---------------------------------------------------------------------

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas_organizacoes_aranda ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas_informacoes_contrato ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_tabela TEXT;
BEGIN
  FOREACH v_tabela IN ARRAY ARRAY['empresas', 'empresas_produtos', 'empresas_organizacoes_aranda', 'empresas_informacoes_contrato'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_tabela || '_select', v_tabela);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_tabela || '_insert', v_tabela);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_tabela || '_update', v_tabela);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_tabela || '_delete', v_tabela);

    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (has_screen_permission(''empresas''::text, ''view''::text))',
      v_tabela || '_select', v_tabela);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK (has_screen_permission(''empresas''::text, ''edit''::text))',
      v_tabela || '_insert', v_tabela);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING (has_screen_permission(''empresas''::text, ''edit''::text)) WITH CHECK (has_screen_permission(''empresas''::text, ''edit''::text))',
      v_tabela || '_update', v_tabela);
  END LOOP;
END $$;

CREATE POLICY "empresas_produtos_delete" ON empresas_produtos
  FOR DELETE TO authenticated
  USING (has_screen_permission('empresas'::text, 'edit'::text));

-- ---------------------------------------------------------------------
-- Tela nova (rota e menu só na Fase 3) e permissão inicial
-- ---------------------------------------------------------------------

INSERT INTO screens (key, name, description, category, route) VALUES
  ('empresas', 'Empresas', 'Cadastro de empresas (novo): identidade, produtos, organizações do Aranda e informações do contrato', 'Cliente', '/admin/empresas')
ON CONFLICT (key) DO NOTHING;

INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, 'empresas', 'edit'
  FROM user_groups ug
 WHERE ug.name = 'Administradores'
   AND NOT EXISTS (SELECT 1 FROM screen_permissions sp WHERE sp.group_id = ug.id AND sp.screen_key = 'empresas');
