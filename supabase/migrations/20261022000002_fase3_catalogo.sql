-- =====================================================================
-- Fase 3 — migration 10: catálogo em três níveis e soluções da empresa
-- (docs/especificacoes/Modelagem_Fase3.md, seções 2, 3.2 e 10)
--
--   solucoes            nova: COMEX, FISCAIS, FINANCEIRAS (Solução › Produto › Módulo)
--   produtos            + solucao_id e a_classificar (produto provisório da carga, P8)
--   grupos_aranda       + solucao_id; classificação com quatro valores
--                       (modulo, produto, solucao, nao_se_aplica); sem_modulo sai
--   empresas_solucoes   nova; substitui empresas_produtos (a empresa contrata soluções,
--                       com AMS e Em projeto por solução)
--
-- Reorganização dos dados (bloco DO único, origem 'carga' na auditoria): cria as
-- soluções e os produtos novos e redistribui os módulos dos produtos antigos COMEX e
-- FISCAL pela decisão de 22/10/2026:
--   - módulos que continuam módulos mudam de produto e mantêm o id;
--   - módulos que viram o próprio produto (RECOF, FCI, Fluxo de Caixa...) e os que
--     viram grupo de serviço (DBA, Técnico, Orçamentos...) deixam de ser módulos: os
--     grupos do Aranda passam a apontar para o produto ou para a solução, e a linha
--     do módulo é apagada (a auditoria guarda a cópia);
--   - sem destino definido: produto "A classificar" da solução.
-- No fim, apaga os produtos COMEX e FISCAL e confere as contagens; se algo não
-- bater, nada fica gravado.
--
-- Regras novas, por gatilho: código de solução e de produto não muda; só o módulo
-- "A classificar" muda de produto, uma vez, para um produto da mesma solução; o
-- produto "A classificar" não entra no escopo de bancos.
-- Sincronização: os produtos da tela atual viram soluções (FISCAL e GALLERY → FISCAIS),
-- e Tem AMS / Em projeto da tela atual valem para todas as soluções.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Soluções
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS solucoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- FISCAIS habilita o Contrato FISCAL na empresa: o código não muda (gatilho)
  codigo TEXT NOT NULL UNIQUE CHECK (length(trim(codigo)) > 0 AND codigo = upper(codigo)),
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

CREATE UNIQUE INDEX IF NOT EXISTS solucoes_nome_uq ON solucoes (lower(trim(nome)));

DROP TRIGGER IF EXISTS trg_solucoes_autoria ON solucoes;
CREATE TRIGGER trg_solucoes_autoria BEFORE INSERT OR UPDATE ON solucoes
  FOR EACH ROW EXECUTE FUNCTION definir_autoria();
DROP TRIGGER IF EXISTS trg_solucoes_auditoria ON solucoes;
CREATE TRIGGER trg_solucoes_auditoria AFTER INSERT OR UPDATE OR DELETE ON solucoes
  FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();

-- Mesmo padrão dos catálogos da Fase 1: leitura para quem está logado, escrita
-- com Edição em Produtos e Módulos, sem DELETE (exclusão lógica)
ALTER TABLE solucoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "solucoes_select" ON solucoes;
DROP POLICY IF EXISTS "solucoes_insert" ON solucoes;
DROP POLICY IF EXISTS "solucoes_update" ON solucoes;
CREATE POLICY "solucoes_select" ON solucoes
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "solucoes_insert" ON solucoes
  FOR INSERT TO authenticated
  WITH CHECK (has_screen_permission('produtos_modulos'::text, 'edit'::text));
CREATE POLICY "solucoes_update" ON solucoes
  FOR UPDATE TO authenticated
  USING (has_screen_permission('produtos_modulos'::text, 'edit'::text))
  WITH CHECK (has_screen_permission('produtos_modulos'::text, 'edit'::text));

-- ---------------------------------------------------------------------
-- 2. Colunas novas em produtos e grupos_aranda
--    (NOT NULL, FK composta e CHECK novo entram no bloco de reorganização,
--    depois dos dados)
-- ---------------------------------------------------------------------

ALTER TABLE produtos ADD COLUMN IF NOT EXISTS solucao_id UUID REFERENCES solucoes(id) ON DELETE RESTRICT;
-- Só os dois produtos provisórios da carga; não muda depois (gatilho)
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS a_classificar BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS produtos_solucao_idx ON produtos (solucao_id);

DO $$
BEGIN
  -- Alvo da FK composta de grupos_aranda (o produto pertence à solução informada)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'produtos_id_solucao_uq') THEN
    ALTER TABLE produtos ADD CONSTRAINT produtos_id_solucao_uq UNIQUE (id, solucao_id);
  END IF;
END $$;

ALTER TABLE grupos_aranda ADD COLUMN IF NOT EXISTS solucao_id UUID REFERENCES solucoes(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS grupos_aranda_solucao_idx ON grupos_aranda (solucao_id);

-- ---------------------------------------------------------------------
-- 3. Soluções contratadas pela empresa
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS empresas_solucoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  solucao_id UUID NOT NULL REFERENCES solucoes(id) ON DELETE RESTRICT,
  tem_ams BOOLEAN NOT NULL,
  em_projeto BOOLEAN NOT NULL DEFAULT FALSE,
  justificativa_projeto TEXT CHECK (justificativa_projeto IS NULL OR length(justificativa_projeto) <= 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT empresas_solucoes_uq UNIQUE (empresa_id, solucao_id),
  -- Em projeto pede uma breve justificativa (decisão de 20/10/2026)
  CONSTRAINT empresas_solucoes_projeto_ck CHECK (NOT em_projeto OR length(trim(coalesce(justificativa_projeto, ''))) > 0)
);

CREATE INDEX IF NOT EXISTS empresas_solucoes_solucao_idx ON empresas_solucoes (solucao_id);

DROP TRIGGER IF EXISTS trg_empresas_solucoes_autoria ON empresas_solucoes;
CREATE TRIGGER trg_empresas_solucoes_autoria BEFORE INSERT OR UPDATE ON empresas_solucoes
  FOR EACH ROW EXECUTE FUNCTION definir_autoria();
DROP TRIGGER IF EXISTS trg_empresas_solucoes_auditoria ON empresas_solucoes;
CREATE TRIGGER trg_empresas_solucoes_auditoria AFTER INSERT OR UPDATE OR DELETE ON empresas_solucoes
  FOR EACH ROW EXECUTE FUNCTION registrar_auditoria('id', 'empresa_id');

-- Tabela de ligação da tela Empresas: aceita DELETE com Edição
ALTER TABLE empresas_solucoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "empresas_solucoes_select" ON empresas_solucoes;
DROP POLICY IF EXISTS "empresas_solucoes_insert" ON empresas_solucoes;
DROP POLICY IF EXISTS "empresas_solucoes_update" ON empresas_solucoes;
DROP POLICY IF EXISTS "empresas_solucoes_delete" ON empresas_solucoes;
CREATE POLICY "empresas_solucoes_select" ON empresas_solucoes
  FOR SELECT TO authenticated
  USING (has_screen_permission('empresas'::text, 'view'::text));
CREATE POLICY "empresas_solucoes_insert" ON empresas_solucoes
  FOR INSERT TO authenticated
  WITH CHECK (has_screen_permission('empresas'::text, 'edit'::text));
CREATE POLICY "empresas_solucoes_update" ON empresas_solucoes
  FOR UPDATE TO authenticated
  USING (has_screen_permission('empresas'::text, 'edit'::text))
  WITH CHECK (has_screen_permission('empresas'::text, 'edit'::text));
CREATE POLICY "empresas_solucoes_delete" ON empresas_solucoes
  FOR DELETE TO authenticated
  USING (has_screen_permission('empresas'::text, 'edit'::text));

-- ---------------------------------------------------------------------
-- 4. Sincronização com a tela atual (seção 10)
--    Definida antes da reorganização, que a usa para converter os produtos
--    contratados em soluções.
-- ---------------------------------------------------------------------

-- Mantém o nome da Fase 1, chamado por sinc_empresa_do_legado e pelo gatilho de
-- empresa_produtos. Agora grava as soluções: COMEX → COMEX; FISCAL ou GALLERY →
-- FISCAIS. Só mexe em COMEX e FISCAIS, as soluções que a tela atual conhece.
-- Solução nova entra com o Tem AMS da empresa.
CREATE OR REPLACE FUNCTION public.sinc_empresa_produtos(p_empresa_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Empresa excluída no legado ou ainda não sincronizada: nada a fazer
  IF NOT EXISTS (SELECT 1 FROM empresas_clientes WHERE id = p_empresa_id)
     OR NOT EXISTS (SELECT 1 FROM empresas WHERE id = p_empresa_id) THEN
    RETURN;
  END IF;

  -- Sai a solução que nenhum produto da tela atual leva mais (apagar GALLERY com
  -- FISCAL ainda contratado mantém FISCAIS)
  DELETE FROM empresas_solucoes es
   USING solucoes s
   WHERE es.empresa_id = p_empresa_id
     AND s.id = es.solucao_id
     AND s.codigo IN ('COMEX', 'FISCAIS')
     AND NOT EXISTS (
       SELECT 1 FROM empresa_produtos lp
        WHERE lp.empresa_id = p_empresa_id
          AND CASE upper(lp.produto) WHEN 'COMEX' THEN 'COMEX' ELSE 'FISCAIS' END = s.codigo
     );

  INSERT INTO empresas_solucoes (empresa_id, solucao_id, tem_ams, em_projeto)
  SELECT DISTINCT p_empresa_id, s.id, e.tem_ams, FALSE
    FROM empresa_produtos lp
    JOIN solucoes s ON s.codigo = CASE upper(lp.produto) WHEN 'COMEX' THEN 'COMEX' ELSE 'FISCAIS' END
    JOIN empresas e ON e.id = p_empresa_id
   WHERE lp.empresa_id = p_empresa_id
  ON CONFLICT (empresa_id, solucao_id) DO NOTHING;
END;
$$;

-- Tem AMS e Em projeto da empresa (espelho da tela atual) valem para as soluções:
--   Tem AMS: Sim põe AMS em todas; Não tira de todas (decisão de 21/10/2026).
--   Em projeto: Não tira todas do projeto e limpa as justificativas; Sim não muda
--   nada, e a pendência "em projeto sem solução definida" é calculada na tela.
-- Alteração da empresa que não muda esses dois campos não toca no ajuste por
-- solução feito na tela nova.
CREATE OR REPLACE FUNCTION public.sinc_solucoes_da_empresa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tem_ams IS DISTINCT FROM OLD.tem_ams THEN
    UPDATE empresas_solucoes SET tem_ams = NEW.tem_ams
     WHERE empresa_id = NEW.id AND tem_ams IS DISTINCT FROM NEW.tem_ams;
  END IF;
  IF OLD.em_projeto AND NOT NEW.em_projeto THEN
    UPDATE empresas_solucoes SET em_projeto = FALSE, justificativa_projeto = NULL
     WHERE empresa_id = NEW.id AND (em_projeto OR justificativa_projeto IS NOT NULL);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_empresas_sinc_solucoes ON empresas;
CREATE TRIGGER trg_empresas_sinc_solucoes
  AFTER UPDATE OF tem_ams, em_projeto ON empresas
  FOR EACH ROW
  WHEN (OLD.tem_ams IS DISTINCT FROM NEW.tem_ams OR OLD.em_projeto IS DISTINCT FROM NEW.em_projeto)
  EXECUTE FUNCTION sinc_solucoes_da_empresa();

-- ---------------------------------------------------------------------
-- 5. Reorganização do catálogo (seção 2.6)
-- ---------------------------------------------------------------------

-- Compara nomes de módulo sem acento e sem diferença de maiúsculas
CREATE OR REPLACE FUNCTION pg_temp.chave_nome(p_texto TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(trim(translate(p_texto,
    'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç',
    'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc')));
$$;

DO $reorganizacao$
DECLARE
  v_comex_antigo UUID;
  v_fiscal_antigo UUID;
  v_gallery UUID;
  v_comex UUID;
  v_fiscais UUID;
  v_financeiras UUID;
  v_violacoes TEXT;
  v_modulos_antes BIGINT;
  v_convertidos BIGINT;
  v_grupos_antes BIGINT;
  v_esperado BIGINT;
  v_obtido BIGINT;
  v_empresa RECORD;
BEGIN
  -- Já reorganizado (a migration rodou antes): nada a fazer
  IF EXISTS (SELECT 1 FROM solucoes) THEN
    RAISE NOTICE 'Catálogo já reorganizado; nada a fazer.';
    RETURN;
  END IF;

  PERFORM set_config('app.origem', 'carga', true);

  SELECT id INTO v_comex_antigo FROM produtos WHERE codigo = 'COMEX';
  SELECT id INTO v_fiscal_antigo FROM produtos WHERE codigo = 'FISCAL';
  SELECT id INTO v_gallery FROM produtos WHERE codigo = 'GALLERY';
  IF v_comex_antigo IS NULL OR v_fiscal_antigo IS NULL OR v_gallery IS NULL THEN
    RAISE EXCEPTION 'Reorganização abortada: produtos COMEX, FISCAL e GALLERY da Fase 1 não encontrados (a carga da Fase 1 rodou?)';
  END IF;

  -- Destino de cada módulo atual (decisões de 21 e 22/10/2026)
  --   mover:   continua módulo, no produto de destino (mesmo id)
  --   produto: vira o próprio produto de destino
  --   servico: vira grupo de serviço da solução de destino
  CREATE TEMP TABLE fase3_mapa (produto_antigo TEXT, modulo TEXT, acao TEXT, destino TEXT) ON COMMIT DROP;
  INSERT INTO fase3_mapa VALUES
    ('COMEX', 'Câmbio', 'mover', 'CE_PLUS'),
    ('COMEX', 'Drawback', 'mover', 'CE_PLUS'),
    ('COMEX', 'Exportação', 'mover', 'CE_PLUS'),
    ('COMEX', 'Importação', 'mover', 'CE_PLUS'),
    ('COMEX', 'ABAP', 'mover', 'COMEX_A_CLASSIFICAR'),
    ('COMEX', 'LEGEM', 'mover', 'COMEX_A_CLASSIFICAR'),
    ('COMEX', 'TP One', 'mover', 'COMEX_A_CLASSIFICAR'),
    ('COMEX', 'RECOF', 'produto', 'CE_PLUS_RECOF'),
    ('COMEX', 'Catálogo de Produtos', 'produto', 'CATALOGO_PRODUTOS'),
    ('COMEX', 'FCI', 'produto', 'FCI'),
    ('COMEX', 'Fluxo de Caixa', 'produto', 'FC'),
    ('COMEX', 'SAPC', 'produto', 'SAPC'),
    ('COMEX', 'VENDOR', 'produto', 'VENDOR'),
    ('COMEX', 'ICS Inativos', 'servico', 'COMEX'),
    ('COMEX', 'Orçamentos', 'servico', 'COMEX'),
    ('FISCAL', 'Cadastros Básicos', 'mover', 'COMPLY'),
    ('FISCAL', 'Conciliação', 'mover', 'COMPLY'),
    ('FISCAL', 'Contabilização', 'mover', 'COMPLY'),
    ('FISCAL', 'Indiretos', 'mover', 'COMPLY'),
    ('FISCAL', 'Infraestrutura', 'mover', 'COMPLY'),
    ('FISCAL', 'Obrigações Estaduais', 'mover', 'COMPLY'),
    ('FISCAL', 'Retidos', 'mover', 'COMPLY'),
    ('FISCAL', 'ECD/ECF', 'mover', 'COMPLY'),
    ('FISCAL', 'EFD Contribuições', 'mover', 'COMPLY'),
    ('FISCAL', 'EFD ICMS', 'mover', 'COMPLY'),
    ('FISCAL', 'REINF', 'mover', 'COMPLY'),
    ('FISCAL', 'Integração Indiretos', 'mover', 'COMPLY'),
    ('FISCAL', 'ETL', 'mover', 'FISCAIS_A_CLASSIFICAR'),
    ('FISCAL', 'SVA', 'mover', 'FISCAIS_A_CLASSIFICAR'),
    ('FISCAL', 'Framework', 'mover', 'FISCAIS_A_CLASSIFICAR'),
    ('FISCAL', 'COMPLY Analytics', 'mover', 'FISCAIS_A_CLASSIFICAR'),
    ('FISCAL', 'Ciclo de Vida', 'mover', 'FISCAIS_A_CLASSIFICAR'),
    ('FISCAL', 'Controle de Terceiros', 'mover', 'FISCAIS_A_CLASSIFICAR'),
    ('FISCAL', 'COMPLY e-DOCS', 'produto', 'COMPLY_EDOCS'),
    ('FISCAL', 'DBA', 'servico', 'FISCAIS'),
    ('FISCAL', 'Técnico', 'servico', 'FISCAIS'),
    ('FISCAL', 'Atualização Ambientes', 'servico', 'FISCAIS'),
    ('FISCAL', 'SAAS', 'servico', 'FISCAIS'),
    ('FISCAL', 'Orçamentos', 'servico', 'FISCAIS'),
    ('FISCAL', 'ICS Inativos', 'servico', 'FISCAIS'),
    ('GALLERY', 'ICS Inativos', 'servico', 'FISCAIS');

  -- Módulos atuais com a ação. Módulo de COMEX ou FISCAL fora do mapa vai para
  -- "A classificar" (listado no aviso final); o GALLERY fica onde está.
  CREATE TEMP TABLE fase3_modulos ON COMMIT DROP AS
  SELECT m.id, m.nome, p.codigo AS produto_antigo,
         COALESCE(mp.acao, CASE WHEN p.codigo = 'GALLERY' THEN 'ficar' ELSE 'mover' END) AS acao,
         COALESCE(mp.destino, CASE p.codigo WHEN 'COMEX' THEN 'COMEX_A_CLASSIFICAR'
                                            WHEN 'FISCAL' THEN 'FISCAIS_A_CLASSIFICAR' END) AS destino,
         (mp.acao IS NULL AND p.codigo <> 'GALLERY') AS fora_do_mapa
    FROM produto_modulos m
    JOIN produtos p ON p.id = m.produto_id
    LEFT JOIN fase3_mapa mp ON mp.produto_antigo = p.codigo
                           AND pg_temp.chave_nome(mp.modulo) = pg_temp.chave_nome(m.nome);

  -- Pré-condição: nenhum banco com escopo no que deixa de existir. A tela de escopo
  -- ainda não está no ar, então não deve haver; se houver, ajuste antes de rodar.
  SELECT string_agg(DISTINCT format('%s / %s', e.nome_abreviado, b.nome), '; ')
    INTO v_violacoes
    FROM bancos_horas_escopo be
    JOIN bancos_horas b ON b.id = be.banco_id
    JOIN empresas e ON e.id = b.empresa_id
    LEFT JOIN fase3_modulos fm ON fm.id = be.modulo_id
   WHERE (be.modulo_id IS NULL AND be.produto_id IN (v_comex_antigo, v_fiscal_antigo))
      OR fm.acao IN ('produto', 'servico');
  IF v_violacoes IS NOT NULL THEN
    RAISE EXCEPTION 'Reorganização abortada: banco com escopo em produto inteiro COMEX/FISCAL ou em módulo que vira produto ou grupo de serviço: %', v_violacoes;
  END IF;

  -- Pré-condição: nenhum grupo ligado ao produto inteiro COMEX ou FISCAL (a carga
  -- da Fase 1 só criou grupos com módulo ou "não se aplica")
  SELECT string_agg(grupo_aranda, ', ') INTO v_violacoes
    FROM grupos_aranda
   WHERE modulo_id IS NULL AND produto_id IN (v_comex_antigo, v_fiscal_antigo);
  IF v_violacoes IS NOT NULL THEN
    RAISE EXCEPTION 'Reorganização abortada: grupos ligados ao produto inteiro COMEX/FISCAL, sem módulo: %', v_violacoes;
  END IF;

  SELECT count(*) INTO v_modulos_antes FROM produto_modulos;
  SELECT count(*) INTO v_convertidos FROM fase3_modulos WHERE acao IN ('produto', 'servico');
  SELECT count(*) INTO v_grupos_antes FROM grupos_aranda;

  -- 5.1 Soluções e produtos
  INSERT INTO solucoes (codigo, nome, ordem) VALUES ('COMEX', 'COMEX', 1) RETURNING id INTO v_comex;
  INSERT INTO solucoes (codigo, nome, ordem) VALUES ('FISCAIS', 'FISCAIS', 2) RETURNING id INTO v_fiscais;
  INSERT INTO solucoes (codigo, nome, ordem) VALUES ('FINANCEIRAS', 'FINANCEIRAS', 3) RETURNING id INTO v_financeiras;

  INSERT INTO produtos (codigo, nome, descricao, ordem, solucao_id, a_classificar) VALUES
    ('CE_PLUS', 'CE PLUS', 'Comércio exterior', 1, v_comex, FALSE),
    ('CE_PLUS_RECOF', 'CE PLUS RECOF', NULL, 2, v_comex, FALSE),
    ('CATALOGO_PRODUTOS', 'CATÁLOGO DE PRODUTOS', NULL, 3, v_comex, FALSE),
    ('FCI', 'FCI', NULL, 4, v_comex, FALSE),
    ('COMEX_A_CLASSIFICAR', 'A classificar', 'Módulos da carga ainda sem produto definido', 5, v_comex, TRUE),
    ('COMPLY', 'COMPLY', NULL, 1, v_fiscais, FALSE),
    ('COMPLY_EDOCS', 'COMPLY e-DOCS', 'Documentos fiscais eletrônicos', 2, v_fiscais, FALSE),
    ('SATI', 'SATI', NULL, 4, v_fiscais, FALSE),
    ('FISCAIS_A_CLASSIFICAR', 'A classificar', 'Módulos da carga ainda sem produto definido', 5, v_fiscais, TRUE),
    ('FC', 'FC', 'Fluxo de caixa', 1, v_financeiras, FALSE),
    ('SAPC', 'SAPC', NULL, 2, v_financeiras, FALSE),
    ('VENDOR', 'VENDOR', NULL, 3, v_financeiras, FALSE);

  -- GALLERY continua a mesma linha (mesmo id), agora em FISCAIS
  UPDATE produtos SET solucao_id = v_fiscais, ordem = 3 WHERE id = v_gallery;
  -- Os antigos também ganham solução, só para a FK composta; são apagados no fim
  UPDATE produtos SET solucao_id = v_comex WHERE id = v_comex_antigo;
  UPDATE produtos SET solucao_id = v_fiscais WHERE id = v_fiscal_antigo;

  -- 5.2 FKs compostas para produto_modulos com ON UPDATE CASCADE (seção 2.3): ao
  -- mover o módulo, grupos, escopos e módulos do requerimento acompanham
  ALTER TABLE grupos_aranda DROP CONSTRAINT IF EXISTS grupos_aranda_modulo_fk;
  ALTER TABLE grupos_aranda ADD CONSTRAINT grupos_aranda_modulo_fk FOREIGN KEY (modulo_id, produto_id)
    REFERENCES produto_modulos (id, produto_id) ON UPDATE CASCADE ON DELETE RESTRICT;
  ALTER TABLE modulos_requerimento_produto DROP CONSTRAINT IF EXISTS modulos_requerimento_produto_modulo_fk;
  ALTER TABLE modulos_requerimento_produto ADD CONSTRAINT modulos_requerimento_produto_modulo_fk FOREIGN KEY (modulo_id, produto_id)
    REFERENCES produto_modulos (id, produto_id) ON UPDATE CASCADE ON DELETE RESTRICT;
  ALTER TABLE bancos_horas_escopo DROP CONSTRAINT IF EXISTS bancos_horas_escopo_modulo_fk;
  ALTER TABLE bancos_horas_escopo ADD CONSTRAINT bancos_horas_escopo_modulo_fk FOREIGN KEY (modulo_id, produto_id)
    REFERENCES produto_modulos (id, produto_id) ON UPDATE CASCADE ON DELETE RESTRICT;

  -- A classificação antiga (com sem_modulo) sai; a nova entra depois dos dados
  ALTER TABLE grupos_aranda DROP CONSTRAINT IF EXISTS grupos_aranda_classificacao_ck;
  ALTER TABLE grupos_aranda DROP CONSTRAINT IF EXISTS grupos_aranda_classificacao_check;

  -- 5.3 Módulos do requerimento (seção 2.5), antes de apagar os módulos convertidos.
  -- pw.SPED vai para o COMPLY inteiro: o módulo SPED ainda não existe e é cadastrado
  -- na tela, que também ajusta esta ligação.
  UPDATE modulos_requerimento_produto r
     SET produto_id = p.id, modulo_id = NULL
    FROM (VALUES ('Comex', 'CE_PLUS'), ('Comply', 'COMPLY'), ('Comply e-DOCS', 'COMPLY_EDOCS'),
                 ('pw.SATI', 'SATI'), ('pw.SPED', 'COMPLY'), ('pw.SATI/pw.SPED', 'SATI'),
                 ('Gallery', 'GALLERY')) AS v(modulo_requerimento, produto)
    JOIN produtos p ON p.codigo = v.produto
   WHERE r.modulo_requerimento = v.modulo_requerimento;
  INSERT INTO modulos_requerimento_produto (modulo_requerimento, produto_id, modulo_id)
  SELECT v.modulo_requerimento, p.id, NULL
    FROM (VALUES ('Comex', 'CE_PLUS'), ('Comply', 'COMPLY'), ('Comply e-DOCS', 'COMPLY_EDOCS'),
                 ('pw.SATI', 'SATI'), ('pw.SPED', 'COMPLY'), ('pw.SATI/pw.SPED', 'SATI'),
                 ('Gallery', 'GALLERY')) AS v(modulo_requerimento, produto)
    JOIN produtos p ON p.codigo = v.produto
  ON CONFLICT (modulo_requerimento) DO NOTHING;

  -- 5.4 Módulos que continuam módulos: mudam de produto (o CASCADE leva os grupos)
  UPDATE produto_modulos m
     SET produto_id = p.id
    FROM fase3_modulos fm
    JOIN produtos p ON p.codigo = fm.destino
   WHERE fm.id = m.id AND fm.acao = 'mover';

  -- 5.5 Módulos que viram produto: o grupo passa a apontar para o produto inteiro
  UPDATE grupos_aranda g
     SET classificacao = 'produto', modulo_id = NULL, produto_id = p.id
    FROM fase3_modulos fm
    JOIN produtos p ON p.codigo = fm.destino
   WHERE g.modulo_id = fm.id AND fm.acao = 'produto';

  -- 5.6 Módulos que viram grupo de serviço: o grupo fica só na solução
  UPDATE grupos_aranda g
     SET classificacao = 'solucao', modulo_id = NULL, produto_id = NULL, solucao_id = s.id
    FROM fase3_modulos fm
    JOIN solucoes s ON s.codigo = fm.destino
   WHERE g.modulo_id = fm.id AND fm.acao = 'servico';

  DELETE FROM produto_modulos m
   USING fase3_modulos fm
   WHERE fm.id = m.id AND fm.acao IN ('produto', 'servico');

  -- Ordem alfabética dentro de cada produto que mudou
  UPDATE produto_modulos m
     SET ordem = o.ordem
    FROM (SELECT id, row_number() OVER (PARTITION BY produto_id ORDER BY nome) AS ordem FROM produto_modulos) o
   WHERE o.id = m.id AND m.ordem IS DISTINCT FROM o.ordem;

  -- 5.7 Grupos: sem_modulo vira produto; a solução vem do produto
  UPDATE grupos_aranda SET classificacao = 'produto' WHERE classificacao = 'sem_modulo';
  UPDATE grupos_aranda g
     SET solucao_id = p.solucao_id
    FROM produtos p
   WHERE p.id = g.produto_id AND g.solucao_id IS DISTINCT FROM p.solucao_id;

  -- 5.8 Produtos contratados → soluções contratadas (mesma regra da sincronização),
  -- e empresas_produtos sai: só a sincronização e a carga da Fase 1 a usavam
  FOR v_empresa IN SELECT id FROM empresas ORDER BY id LOOP
    PERFORM sinc_empresa_produtos(v_empresa.id);
  END LOOP;
  DROP TABLE empresas_produtos;

  -- 5.9 Produtos antigos (a FK RESTRICT confere que nada mais aponta para eles)
  DELETE FROM produtos WHERE id IN (v_comex_antigo, v_fiscal_antigo);

  -- 5.10 Restrições que dependem dos dados
  ALTER TABLE produtos ALTER COLUMN solucao_id SET NOT NULL;
  ALTER TABLE grupos_aranda ADD CONSTRAINT grupos_aranda_solucao_produto_fk FOREIGN KEY (produto_id, solucao_id)
    REFERENCES produtos (id, solucao_id) ON UPDATE CASCADE ON DELETE RESTRICT;
  ALTER TABLE grupos_aranda ADD CONSTRAINT grupos_aranda_classificacao_ck CHECK (
    (classificacao = 'modulo' AND modulo_id IS NOT NULL AND produto_id IS NOT NULL AND solucao_id IS NOT NULL)
    OR (classificacao = 'produto' AND modulo_id IS NULL AND produto_id IS NOT NULL AND solucao_id IS NOT NULL)
    OR (classificacao = 'solucao' AND modulo_id IS NULL AND produto_id IS NULL AND solucao_id IS NOT NULL)
    OR (classificacao = 'nao_se_aplica' AND modulo_id IS NULL AND produto_id IS NULL AND solucao_id IS NULL)
  );

  -- 5.11 Conferência
  SELECT count(*) INTO v_obtido FROM produtos;
  IF v_obtido <> 13 THEN
    RAISE EXCEPTION 'Conferência: % produtos (esperado 13)', v_obtido;
  END IF;

  SELECT count(*) INTO v_obtido FROM produto_modulos;
  IF v_obtido <> v_modulos_antes - v_convertidos THEN
    RAISE EXCEPTION 'Conferência: % módulos (antes %, convertidos %)', v_obtido, v_modulos_antes, v_convertidos;
  END IF;

  SELECT count(*) INTO v_obtido FROM grupos_aranda;
  IF v_obtido <> v_grupos_antes THEN
    RAISE EXCEPTION 'Conferência: % grupos do de-para (antes %)', v_obtido, v_grupos_antes;
  END IF;

  SELECT count(DISTINCT (lp.empresa_id, CASE upper(lp.produto) WHEN 'COMEX' THEN 'COMEX' ELSE 'FISCAIS' END))
    INTO v_esperado
    FROM empresa_produtos lp
   WHERE EXISTS (SELECT 1 FROM empresas e WHERE e.id = lp.empresa_id);
  SELECT count(*) INTO v_obtido FROM empresas_solucoes;
  IF v_obtido <> v_esperado THEN
    RAISE EXCEPTION 'Conferência: % soluções contratadas (produtos da tela atual: %)', v_obtido, v_esperado;
  END IF;

  SELECT count(*) INTO v_obtido FROM modulos_requerimento_produto;
  IF v_obtido <> 7 THEN
    RAISE EXCEPTION 'Conferência: % módulos do requerimento (esperado 7)', v_obtido;
  END IF;

  RAISE NOTICE 'Catálogo reorganizado: % soluções, % produtos, % módulos (% convertidos em produto ou grupo de serviço), % soluções contratadas',
    (SELECT count(*) FROM solucoes), (SELECT count(*) FROM produtos), (SELECT count(*) FROM produto_modulos),
    v_convertidos, (SELECT count(*) FROM empresas_solucoes);
  RAISE NOTICE 'Módulos fora do mapa, enviados para "A classificar": %',
    COALESCE((SELECT string_agg(produto_antigo || ' - ' || nome, ', ' ORDER BY produto_antigo, nome)
                FROM fase3_modulos WHERE fora_do_mapa), 'nenhum');
END
$reorganizacao$;

-- ---------------------------------------------------------------------
-- 6. Regras do catálogo (depois da reorganização, que precisa mover e apagar)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validar_codigo_solucao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.codigo IS DISTINCT FROM OLD.codigo THEN
    RAISE EXCEPTION 'O código da solução não muda depois de criado.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_solucoes_validar ON solucoes;
CREATE TRIGGER trg_solucoes_validar BEFORE UPDATE ON solucoes
  FOR EACH ROW EXECUTE FUNCTION validar_codigo_solucao();

-- Código do produto não muda; "A classificar" só nasce na carga e não é desmarcado
CREATE OR REPLACE FUNCTION public.validar_produto()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.a_classificar AND current_setting('app.origem', true) IS DISTINCT FROM 'carga' THEN
      RAISE EXCEPTION 'O produto "A classificar" só existe na carga do catálogo.';
    END IF;
  ELSE
    IF NEW.codigo IS DISTINCT FROM OLD.codigo THEN
      RAISE EXCEPTION 'O código do produto não muda depois de criado.';
    END IF;
    IF NEW.a_classificar IS DISTINCT FROM OLD.a_classificar THEN
      RAISE EXCEPTION 'Um produto não entra nem sai de "A classificar".';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_produtos_validar ON produtos;
CREATE TRIGGER trg_produtos_validar BEFORE INSERT OR UPDATE ON produtos
  FOR EACH ROW EXECUTE FUNCTION validar_produto();

-- O produto do módulo não muda, salvo o módulo "A classificar", que vai uma vez
-- para um produto da mesma solução (decisão P8). Na mesma solução, a FK composta
-- dos grupos (produto, solução) continua válida quando o CASCADE os move.
CREATE OR REPLACE FUNCTION public.validar_produto_modulo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_de produtos%ROWTYPE;
  v_para produtos%ROWTYPE;
BEGIN
  IF NEW.produto_id IS NOT DISTINCT FROM OLD.produto_id THEN
    RETURN NEW;
  END IF;
  SELECT * INTO v_de FROM produtos WHERE id = OLD.produto_id;
  SELECT * INTO v_para FROM produtos WHERE id = NEW.produto_id;
  IF NOT v_de.a_classificar THEN
    RAISE EXCEPTION 'O produto do módulo não muda depois de criado; só os módulos "A classificar" mudam de produto.';
  END IF;
  IF v_para.a_classificar OR v_para.solucao_id IS DISTINCT FROM v_de.solucao_id THEN
    RAISE EXCEPTION 'O módulo "A classificar" vai para um produto da mesma solução que não seja "A classificar".';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_produto_modulos_validar ON produto_modulos;
CREATE TRIGGER trg_produto_modulos_validar BEFORE UPDATE OF produto_id ON produto_modulos
  FOR EACH ROW EXECUTE FUNCTION validar_produto_modulo();

-- O produto "A classificar" não entra no escopo de bancos
CREATE OR REPLACE FUNCTION public.validar_escopo_a_classificar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM produtos WHERE id = NEW.produto_id AND a_classificar) THEN
    RAISE EXCEPTION 'Produto "A classificar" não entra no escopo de bancos: classifique o módulo antes.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bancos_horas_escopo_a_classificar ON bancos_horas_escopo;
CREATE TRIGGER trg_bancos_horas_escopo_a_classificar BEFORE INSERT ON bancos_horas_escopo
  FOR EACH ROW EXECUTE FUNCTION validar_escopo_a_classificar();

-- Funções internas: só os gatilhos e a sincronização chamam
REVOKE EXECUTE ON FUNCTION
  public.sinc_empresa_produtos(UUID),
  public.sinc_solucoes_da_empresa(),
  public.validar_codigo_solucao(),
  public.validar_produto(),
  public.validar_produto_modulo(),
  public.validar_escopo_a_classificar()
FROM PUBLIC, anon, authenticated;
