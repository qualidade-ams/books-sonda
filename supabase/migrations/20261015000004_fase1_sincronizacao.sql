-- =====================================================================
-- Fase 1 — migration 4: sincronização atual → nova (Fases 1 a 5)
-- (docs/especificacoes/Modelagem_Fase1.md, seção 6)
--
-- PRIMEIRA migration que coloca gatilhos em tabelas ATUAIS:
--   empresas_clientes, empresa_produtos, baseline_historico,
--   percentual_repasse_historico, taxas_clientes
-- Os gatilhos são AFTER, não alteram a linha do legado e NUNCA bloqueiam a
-- gravação dele: qualquer erro vai para sincronizacao_legado_falhas (com
-- notificação no sino para quem edita a tela Empresas) e o legado segue.
--
-- O que é sincronizado:
--   - identidade da empresa → empresas (+ informações do contrato vazias e a
--     organização do Aranda = nome completo, só na criação)
--   - produtos contratados → empresas_produtos
--   - parâmetros e históricos de baseline/repasse → Banco padrão "espelho"
--     (espelha_legado = true), só enquanto a empresa estiver no modelo legado
--   - exclusão no legado → empresa inativada e marcada (nada é apagado)
-- O espelho desliga quando o banco é editado pelo app, quando a empresa ganha
-- outro banco ou quando ela é liberada para o modelo novo.
--
-- As funções sinc_* também servem para a carga inicial (migration 5).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Falhas de sincronização
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sincronizacao_legado_falhas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tabela_origem TEXT NOT NULL,
  registro_id TEXT NOT NULL,
  operacao TEXT NOT NULL,
  -- Só código e mensagem do erro; nunca os dados da linha (LGPD)
  sqlstate TEXT NOT NULL,
  erro TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolvida_em TIMESTAMPTZ,
  resolvida_por UUID REFERENCES auth.users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS sincronizacao_legado_falhas_abertas_idx
  ON sincronizacao_legado_falhas (created_at DESC) WHERE resolvida_em IS NULL;

ALTER TABLE sincronizacao_legado_falhas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sincronizacao_legado_falhas_select" ON sincronizacao_legado_falhas;
DROP POLICY IF EXISTS "sincronizacao_legado_falhas_update" ON sincronizacao_legado_falhas;
CREATE POLICY "sincronizacao_legado_falhas_select" ON sincronizacao_legado_falhas
  FOR SELECT TO authenticated
  USING (has_screen_permission('empresas'::text, 'view'::text));
-- Marcar como resolvida (sem INSERT/DELETE para usuários)
CREATE POLICY "sincronizacao_legado_falhas_update" ON sincronizacao_legado_falhas
  FOR UPDATE TO authenticated
  USING (has_screen_permission('empresas'::text, 'edit'::text))
  WITH CHECK (has_screen_permission('empresas'::text, 'edit'::text));

-- Notificação no sino (tabela notificacoes, branch feat/notificacoes-sino)
ALTER TABLE notificacoes DROP CONSTRAINT IF EXISTS notificacoes_tipo_check;
ALTER TABLE notificacoes ADD CONSTRAINT notificacoes_tipo_check CHECK (tipo IN (
  'book_precisa_retificacao',
  'ajuste_retroativo_pendente',
  'saldo_parcial_falha',
  'geracao_books_falha',
  'sincronizacao_legado_falha'
));

CREATE OR REPLACE FUNCTION public.registrar_falha_sincronizacao(
  p_tabela TEXT, p_registro TEXT, p_operacao TEXT, p_sqlstate TEXT, p_erro TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_abertas INTEGER;
BEGIN
  -- Nem o registro da falha pode derrubar a gravação do legado
  BEGIN
    INSERT INTO sincronizacao_legado_falhas (tabela_origem, registro_id, operacao, sqlstate, erro)
    VALUES (p_tabela, p_registro, p_operacao, p_sqlstate, left(p_erro, 1000));

    SELECT count(*) INTO v_abertas FROM sincronizacao_legado_falhas WHERE resolvida_em IS NULL;
    PERFORM notificacoes_abrir(
      'sincronizacao_legado_falha',
      'empresas',
      'Falha na sincronização de empresas',
      format('Há %s falha(s) ao copiar alterações do cadastro atual de empresas para o novo. O cadastro atual gravou normalmente.', v_abertas),
      '/admin/empresas',
      NULL,
      'sincronizacao_legado',
      jsonb_build_object('abertas', v_abertas)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolver_notificacao_sincronizacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sincronizacao_legado_falhas WHERE resolvida_em IS NULL) THEN
    PERFORM notificacoes_resolver('sincronizacao_legado', 'Falhas de sincronização resolvidas');
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sincronizacao_legado_falhas_resolver ON sincronizacao_legado_falhas;
CREATE TRIGGER trg_sincronizacao_legado_falhas_resolver
  AFTER UPDATE OF resolvida_em ON sincronizacao_legado_falhas
  FOR EACH STATEMENT EXECUTE FUNCTION resolver_notificacao_sincronizacao();

-- ---------------------------------------------------------------------
-- Funções de sincronização (também usadas pela carga)
-- ---------------------------------------------------------------------

-- Produtos contratados: espelho exato de empresa_produtos
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

  DELETE FROM empresas_produtos ep
   WHERE ep.empresa_id = p_empresa_id
     AND NOT EXISTS (
       SELECT 1 FROM empresa_produtos lp JOIN produtos p ON p.codigo = upper(lp.produto)
        WHERE lp.empresa_id = p_empresa_id AND p.id = ep.produto_id
     );

  INSERT INTO empresas_produtos (empresa_id, produto_id)
  SELECT DISTINCT p_empresa_id, p.id
    FROM empresa_produtos lp JOIN produtos p ON p.codigo = upper(lp.produto)
   WHERE lp.empresa_id = p_empresa_id
  ON CONFLICT (empresa_id, produto_id) DO NOTHING;
END;
$$;

-- Identidade da empresa (campos exclusivos da tabela nova nunca são tocados)
CREATE OR REPLACE FUNCTION public.sinc_empresa_do_legado(p_empresa_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e empresas_clientes%ROWTYPE;
  v_nova BOOLEAN;
  v_origem_anterior TEXT := COALESCE(current_setting('app.origem', true), '');
BEGIN
  SELECT * INTO e FROM empresas_clientes WHERE id = p_empresa_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_origem_anterior NOT IN ('carga') THEN
    PERFORM set_config('app.origem', 'sincronizacao', true);
  END IF;

  -- A consolidadora precisa existir antes (FK)
  IF e.empresa_consolidadora_id IS NOT NULL
     AND e.empresa_consolidadora_id <> p_empresa_id
     AND NOT EXISTS (SELECT 1 FROM empresas WHERE id = e.empresa_consolidadora_id) THEN
    PERFORM sinc_empresa_do_legado(e.empresa_consolidadora_id);
  END IF;

  v_nova := NOT EXISTS (SELECT 1 FROM empresas WHERE id = p_empresa_id);

  INSERT INTO empresas (
    id, nome_completo, nome_abreviado, status, data_status, descricao_status,
    email_gestor, email_comercial, email_tm, link_sharepoint, observacao,
    em_projeto, tem_ams, vigencia_inicio, vigencia_fim, empresa_consolidadora_id,
    tipo_book, book_personalizado, book_anexo, template_padrao,
    meta_sla_percentual, quantidade_minima_chamados_sla, sincronizado_em
  ) VALUES (
    e.id, e.nome_completo, e.nome_abreviado,
    CASE WHEN e.status = 'ativo' THEN 'ativo' ELSE 'inativo' END,  -- D-13: suspenso vira inativo
    e.data_status, e.descricao_status,
    e.email_gestor, e.email_comercial, e.email_tm, e.link_sharepoint, e.observacao,
    COALESCE(e.em_projeto, false), COALESCE(e.tem_ams, false), e.vigencia_inicial, e.vigencia_final,
    NULLIF(e.empresa_consolidadora_id, e.id),
    COALESCE(e.tipo_book::text, 'nao_tem_book'), COALESCE(e.book_personalizado, false), COALESCE(e.anexo, false),
    e.template_padrao, e.meta_sla_percentual, e.quantidade_minima_chamados_sla, NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    nome_completo = EXCLUDED.nome_completo,
    nome_abreviado = EXCLUDED.nome_abreviado,
    status = EXCLUDED.status,
    data_status = EXCLUDED.data_status,
    descricao_status = EXCLUDED.descricao_status,
    email_gestor = EXCLUDED.email_gestor,
    email_comercial = EXCLUDED.email_comercial,
    email_tm = EXCLUDED.email_tm,
    link_sharepoint = EXCLUDED.link_sharepoint,
    observacao = EXCLUDED.observacao,
    em_projeto = EXCLUDED.em_projeto,
    tem_ams = EXCLUDED.tem_ams,
    vigencia_inicio = EXCLUDED.vigencia_inicio,
    vigencia_fim = EXCLUDED.vigencia_fim,
    empresa_consolidadora_id = EXCLUDED.empresa_consolidadora_id,
    tipo_book = EXCLUDED.tipo_book,
    book_personalizado = EXCLUDED.book_personalizado,
    book_anexo = EXCLUDED.book_anexo,
    template_padrao = EXCLUDED.template_padrao,
    meta_sla_percentual = EXCLUDED.meta_sla_percentual,
    quantidade_minima_chamados_sla = EXCLUDED.quantidade_minima_chamados_sla,
    sincronizado_em = EXCLUDED.sincronizado_em
  -- Só grava (e audita) quando algum campo de identidade mudou
  WHERE (empresas.nome_completo, empresas.nome_abreviado, empresas.status, empresas.data_status,
         empresas.descricao_status, empresas.email_gestor, empresas.email_comercial, empresas.email_tm,
         empresas.link_sharepoint, empresas.observacao, empresas.em_projeto, empresas.tem_ams,
         empresas.vigencia_inicio, empresas.vigencia_fim, empresas.empresa_consolidadora_id,
         empresas.tipo_book, empresas.book_personalizado, empresas.book_anexo, empresas.template_padrao,
         empresas.meta_sla_percentual, empresas.quantidade_minima_chamados_sla)
        IS DISTINCT FROM
        (EXCLUDED.nome_completo, EXCLUDED.nome_abreviado, EXCLUDED.status, EXCLUDED.data_status,
         EXCLUDED.descricao_status, EXCLUDED.email_gestor, EXCLUDED.email_comercial, EXCLUDED.email_tm,
         EXCLUDED.link_sharepoint, EXCLUDED.observacao, EXCLUDED.em_projeto, EXCLUDED.tem_ams,
         EXCLUDED.vigencia_inicio, EXCLUDED.vigencia_fim, EXCLUDED.empresa_consolidadora_id,
         EXCLUDED.tipo_book, EXCLUDED.book_personalizado, EXCLUDED.book_anexo, EXCLUDED.template_padrao,
         EXCLUDED.meta_sla_percentual, EXCLUDED.quantidade_minima_chamados_sla);

  INSERT INTO empresas_informacoes_contrato (empresa_id) VALUES (p_empresa_id)
  ON CONFLICT (empresa_id) DO NOTHING;

  -- Organização do Aranda = nome completo, só na criação (renomear depois não
  -- desliga o consumo no modelo novo; Inventário 5)
  IF v_nova THEN
    INSERT INTO empresas_organizacoes_aranda (empresa_id, nome_organizacao)
    VALUES (p_empresa_id, e.nome_completo)
    ON CONFLICT ((lower(trim(nome_organizacao)))) WHERE ativo DO NOTHING;
  END IF;

  PERFORM sinc_empresa_produtos(p_empresa_id);

  PERFORM set_config('app.origem', v_origem_anterior, true);
END;
$$;

-- Banco padrão espelho: parâmetros e históricos iguais aos do legado
CREATE OR REPLACE FUNCTION public.sinc_banco_espelho(p_empresa_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e empresas_clientes%ROWTYPE;
  v_banco_id UUID;
  v_taxa TEXT;
  v_repasse TEXT;
  v_origem_anterior TEXT := COALESCE(current_setting('app.origem', true), '');
BEGIN
  SELECT * INTO e FROM empresas_clientes WHERE id = p_empresa_id;
  IF NOT FOUND OR e.tipo_contrato IS NULL OR e.inicio_vigencia IS NULL THEN
    RETURN;
  END IF;
  -- Só enquanto a empresa estiver no modelo legado
  IF NOT EXISTS (SELECT 1 FROM empresas WHERE id = p_empresa_id AND modelo_calculo = 'legado') THEN
    RETURN;
  END IF;

  SELECT id INTO v_banco_id FROM bancos_horas WHERE empresa_id = p_empresa_id AND espelha_legado;
  -- Empresa que já tem bancos próprios (sem espelho): não mexe
  IF v_banco_id IS NULL AND EXISTS (SELECT 1 FROM bancos_horas WHERE empresa_id = p_empresa_id) THEN
    RETURN;
  END IF;

  IF v_origem_anterior NOT IN ('carga') THEN
    PERFORM set_config('app.origem', 'sincronizacao', true);
  END IF;

  -- Taxa mais recente do cliente, como o motor atual faz
  SELECT CASE WHEN upper(tipo_produto) = 'GALLERY' THEN 'GALLERY' ELSE 'OUTROS' END INTO v_taxa
    FROM taxas_clientes WHERE cliente_id = p_empresa_id AND vigencia_inicio <= CURRENT_DATE
   ORDER BY vigencia_inicio DESC LIMIT 1;
  v_taxa := COALESCE(v_taxa, 'OUTROS');

  -- D-03: o "simples" não existe no modelo novo
  v_repasse := CASE WHEN e.possui_repasse_especial AND e.tipo_repasse_especial = 'por_periodo' THEN 'por_periodo' ELSE 'nenhum' END;

  IF v_banco_id IS NULL THEN
    INSERT INTO bancos_horas (
      empresa_id, nome, padrao, visivel_cliente, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia,
      dia_inicio_apuracao, dia_fim_apuracao, taxa_produto, repasse_especial, duracao_periodo_meses,
      periodos_ate_zerar, origem, espelha_legado
    ) VALUES (
      p_empresa_id, 'Banco de Horas', true, true, 1, e.tipo_contrato, e.periodo_apuracao,
      date_trunc('month', e.inicio_vigencia)::date,
      COALESCE(e.dia_inicio_apuracao, 1), COALESCE(e.dia_fim_apuracao, 0), v_taxa, v_repasse,
      CASE WHEN v_repasse = 'por_periodo' THEN e.duracao_periodo_meses END,
      CASE WHEN v_repasse = 'por_periodo' THEN e.periodos_ate_zerar END,
      'carga_legado', true
    )
    RETURNING id INTO v_banco_id;
  ELSE
    UPDATE bancos_horas SET
      tipo_contrato = e.tipo_contrato,
      periodo_apuracao = e.periodo_apuracao,
      inicio_vigencia = date_trunc('month', e.inicio_vigencia)::date,
      dia_inicio_apuracao = COALESCE(e.dia_inicio_apuracao, 1),
      dia_fim_apuracao = COALESCE(e.dia_fim_apuracao, 0),
      taxa_produto = v_taxa,
      repasse_especial = v_repasse,
      duracao_periodo_meses = CASE WHEN v_repasse = 'por_periodo' THEN e.duracao_periodo_meses END,
      periodos_ate_zerar = CASE WHEN v_repasse = 'por_periodo' THEN e.periodos_ate_zerar END
    WHERE id = v_banco_id;
  END IF;

  -- Baseline: mesmos ids do legado; ordem remove → atualiza → insere (evita
  -- sobreposição transitória na constraint de vigência)
  DELETE FROM bancos_horas_baseline b
   WHERE b.banco_id = v_banco_id
     AND NOT EXISTS (SELECT 1 FROM baseline_historico h WHERE h.id = b.id AND h.empresa_id = p_empresa_id);

  UPDATE bancos_horas_baseline b SET
    baseline_minutos = round(h.baseline_horas * 60)::integer,
    baseline_tickets = h.baseline_tickets,
    credito = CASE WHEN h.tipo_banco = 'anual' THEN 'anual' ELSE 'mensal' END,
    data_inicio = h.data_inicio,
    data_fim = h.data_fim,
    motivo = h.motivo,
    observacao = h.observacao
  FROM baseline_historico h
  WHERE h.id = b.id AND b.banco_id = v_banco_id
    AND (b.baseline_minutos, b.baseline_tickets, b.credito, b.data_inicio, b.data_fim, b.motivo, b.observacao)
        IS DISTINCT FROM
        (round(h.baseline_horas * 60)::integer, h.baseline_tickets, CASE WHEN h.tipo_banco = 'anual' THEN 'anual' ELSE 'mensal' END,
         h.data_inicio, h.data_fim, h.motivo, h.observacao);

  INSERT INTO bancos_horas_baseline (id, banco_id, baseline_minutos, baseline_tickets, credito, data_inicio, data_fim, motivo, observacao)
  SELECT h.id, v_banco_id, round(h.baseline_horas * 60)::integer, h.baseline_tickets,
         CASE WHEN h.tipo_banco = 'anual' THEN 'anual' ELSE 'mensal' END,
         h.data_inicio, h.data_fim, h.motivo, h.observacao
    FROM baseline_historico h
   WHERE h.empresa_id = p_empresa_id
     AND NOT EXISTS (SELECT 1 FROM bancos_horas_baseline b WHERE b.id = h.id)
   ORDER BY h.data_inicio;

  -- Repasse: mesmos ids; percentuais por período vêm da empresa (no legado não têm histórico)
  DELETE FROM bancos_horas_repasse r
   WHERE r.banco_id = v_banco_id
     AND NOT EXISTS (SELECT 1 FROM percentual_repasse_historico h WHERE h.id = r.id AND h.empresa_id = p_empresa_id);

  UPDATE bancos_horas_repasse r SET
    percentual_mensal = h.percentual,
    percentual_dentro_periodo = CASE WHEN v_repasse = 'por_periodo' THEN e.percentual_dentro_periodo END,
    percentual_entre_periodos = CASE WHEN v_repasse = 'por_periodo' THEN e.percentual_entre_periodos END,
    data_inicio = h.data_inicio,
    data_fim = h.data_fim,
    motivo = h.motivo,
    observacao = h.observacao
  FROM percentual_repasse_historico h
  WHERE h.id = r.id AND r.banco_id = v_banco_id
    AND (r.percentual_mensal, r.percentual_dentro_periodo, r.percentual_entre_periodos, r.data_inicio, r.data_fim, r.motivo, r.observacao)
        IS DISTINCT FROM
        (h.percentual,
         CASE WHEN v_repasse = 'por_periodo' THEN e.percentual_dentro_periodo END,
         CASE WHEN v_repasse = 'por_periodo' THEN e.percentual_entre_periodos END,
         h.data_inicio, h.data_fim, h.motivo, h.observacao);

  INSERT INTO bancos_horas_repasse (id, banco_id, percentual_mensal, percentual_dentro_periodo, percentual_entre_periodos, data_inicio, data_fim, motivo, observacao)
  SELECT h.id, v_banco_id, h.percentual,
         CASE WHEN v_repasse = 'por_periodo' THEN e.percentual_dentro_periodo END,
         CASE WHEN v_repasse = 'por_periodo' THEN e.percentual_entre_periodos END,
         h.data_inicio, h.data_fim, h.motivo, h.observacao
    FROM percentual_repasse_historico h
   WHERE h.empresa_id = p_empresa_id
     AND NOT EXISTS (SELECT 1 FROM bancos_horas_repasse r WHERE r.id = h.id)
   ORDER BY h.data_inicio;

  PERFORM set_config('app.origem', v_origem_anterior, true);
END;
$$;

-- Exclusão física no legado: a empresa nova é inativada e marcada (D-14)
CREATE OR REPLACE FUNCTION public.sinc_empresa_excluida(p_empresa_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_origem_anterior TEXT := COALESCE(current_setting('app.origem', true), '');
BEGIN
  PERFORM set_config('app.origem', 'sincronizacao', true);
  UPDATE empresas
     SET status = 'inativo',
         data_status = NOW(),
         descricao_status = COALESCE(descricao_status, 'Empresa excluída no cadastro atual'),
         excluida_no_legado_em = NOW()
   WHERE id = p_empresa_id;
  PERFORM set_config('app.origem', v_origem_anterior, true);
END;
$$;

-- ---------------------------------------------------------------------
-- Gatilhos nas tabelas atuais (AFTER; nunca bloqueiam o legado)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_sinc_empresas_clientes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
BEGIN
  IF TG_OP = 'DELETE' THEN
    BEGIN
      PERFORM sinc_empresa_excluida(v_id);
    EXCEPTION WHEN OTHERS THEN
      PERFORM registrar_falha_sincronizacao('empresas_clientes', v_id::text, 'DELETE', SQLSTATE, SQLERRM);
    END;
    RETURN NULL;
  END IF;

  -- Empresa e banco em blocos separados: falha no banco não impede a empresa
  BEGIN
    PERFORM sinc_empresa_do_legado(v_id);
  EXCEPTION WHEN OTHERS THEN
    PERFORM registrar_falha_sincronizacao('empresas_clientes', v_id::text, TG_OP, SQLSTATE, SQLERRM);
  END;
  BEGIN
    PERFORM sinc_banco_espelho(v_id);
  EXCEPTION WHEN OTHERS THEN
    PERFORM registrar_falha_sincronizacao('empresas_clientes (banco)', v_id::text, TG_OP, SQLSTATE, SQLERRM);
  END;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sinc_empresa_produtos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa UUID := CASE WHEN TG_OP = 'DELETE' THEN OLD.empresa_id ELSE NEW.empresa_id END;
BEGIN
  BEGIN
    PERFORM sinc_empresa_produtos(v_empresa);
  EXCEPTION WHEN OTHERS THEN
    PERFORM registrar_falha_sincronizacao('empresa_produtos', v_empresa::text, TG_OP, SQLSTATE, SQLERRM);
  END;
  RETURN NULL;
END;
$$;

-- baseline_historico, percentual_repasse_historico (empresa_id) e taxas_clientes (cliente_id)
CREATE OR REPLACE FUNCTION public.trg_sinc_banco_espelho()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_linha JSONB := to_jsonb(CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END);
  v_empresa UUID := COALESCE(v_linha ->> 'empresa_id', v_linha ->> 'cliente_id')::uuid;
BEGIN
  BEGIN
    PERFORM sinc_banco_espelho(v_empresa);
  EXCEPTION WHEN OTHERS THEN
    PERFORM registrar_falha_sincronizacao(TG_TABLE_NAME, v_empresa::text, TG_OP, SQLSTATE, SQLERRM);
  END;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sinc_empresas_clientes ON empresas_clientes;
CREATE TRIGGER trg_sinc_empresas_clientes
  AFTER INSERT OR UPDATE OR DELETE ON empresas_clientes
  FOR EACH ROW EXECUTE FUNCTION trg_sinc_empresas_clientes();

DROP TRIGGER IF EXISTS trg_sinc_empresa_produtos ON empresa_produtos;
CREATE TRIGGER trg_sinc_empresa_produtos
  AFTER INSERT OR UPDATE OR DELETE ON empresa_produtos
  FOR EACH ROW EXECUTE FUNCTION trg_sinc_empresa_produtos();

DROP TRIGGER IF EXISTS trg_sinc_baseline_historico ON baseline_historico;
CREATE TRIGGER trg_sinc_baseline_historico
  AFTER INSERT OR UPDATE OR DELETE ON baseline_historico
  FOR EACH ROW EXECUTE FUNCTION trg_sinc_banco_espelho();

DROP TRIGGER IF EXISTS trg_sinc_percentual_repasse_historico ON percentual_repasse_historico;
CREATE TRIGGER trg_sinc_percentual_repasse_historico
  AFTER INSERT OR UPDATE OR DELETE ON percentual_repasse_historico
  FOR EACH ROW EXECUTE FUNCTION trg_sinc_banco_espelho();

DROP TRIGGER IF EXISTS trg_sinc_taxas_clientes ON taxas_clientes;
CREATE TRIGGER trg_sinc_taxas_clientes
  AFTER INSERT OR UPDATE OR DELETE ON taxas_clientes
  FOR EACH ROW EXECUTE FUNCTION trg_sinc_banco_espelho();

-- ---------------------------------------------------------------------
-- Desligar o espelho (Modelagem 6.3)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.desligar_espelho_legado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_origem TEXT := COALESCE(NULLIF(current_setting('app.origem', true), ''), 'app');
  v_banco UUID;
BEGIN
  -- Alterações da própria sincronização ou da carga não desligam o espelho
  IF v_origem IN ('sincronizacao', 'carga') THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_TABLE_NAME = 'bancos_horas' THEN
    IF TG_OP = 'UPDATE' THEN
      -- editar o banco pelo app desliga o espelho dele
      NEW.espelha_legado := false;
    ELSIF TG_OP = 'INSERT' THEN
      -- novo banco criado pelo app: a empresa deixa de ser espelho do legado
      NEW.espelha_legado := false;
      UPDATE bancos_horas SET espelha_legado = false WHERE empresa_id = NEW.empresa_id AND espelha_legado;
    END IF;
    RETURN NEW;
  END IF;

  -- históricos editados pelo app: desliga o espelho do banco
  v_banco := CASE WHEN TG_OP = 'DELETE' THEN OLD.banco_id ELSE NEW.banco_id END;
  UPDATE bancos_horas SET espelha_legado = false WHERE id = v_banco AND espelha_legado;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS trg_bancos_horas_desligar_espelho ON bancos_horas;
CREATE TRIGGER trg_bancos_horas_desligar_espelho
  BEFORE INSERT OR UPDATE ON bancos_horas
  FOR EACH ROW EXECUTE FUNCTION desligar_espelho_legado();

DROP TRIGGER IF EXISTS trg_bancos_horas_baseline_desligar_espelho ON bancos_horas_baseline;
CREATE TRIGGER trg_bancos_horas_baseline_desligar_espelho
  BEFORE INSERT OR UPDATE OR DELETE ON bancos_horas_baseline
  FOR EACH ROW EXECUTE FUNCTION desligar_espelho_legado();

DROP TRIGGER IF EXISTS trg_bancos_horas_repasse_desligar_espelho ON bancos_horas_repasse;
CREATE TRIGGER trg_bancos_horas_repasse_desligar_espelho
  BEFORE INSERT OR UPDATE OR DELETE ON bancos_horas_repasse
  FOR EACH ROW EXECUTE FUNCTION desligar_espelho_legado();

-- Empresa liberada para o modelo novo: os bancos deixam de espelhar o legado
CREATE OR REPLACE FUNCTION public.desligar_espelho_ao_liberar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.modelo_calculo = 'multiplo' AND OLD.modelo_calculo IS DISTINCT FROM 'multiplo' THEN
    UPDATE bancos_horas SET espelha_legado = false WHERE empresa_id = NEW.id AND espelha_legado;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_empresas_desligar_espelho ON empresas;
CREATE TRIGGER trg_empresas_desligar_espelho
  AFTER UPDATE OF modelo_calculo ON empresas
  FOR EACH ROW EXECUTE FUNCTION desligar_espelho_ao_liberar();

-- Funções internas: ninguém chama direto pela API
REVOKE EXECUTE ON FUNCTION
  public.registrar_falha_sincronizacao(TEXT, TEXT, TEXT, TEXT, TEXT),
  public.resolver_notificacao_sincronizacao(),
  public.sinc_empresa_produtos(UUID),
  public.sinc_empresa_do_legado(UUID),
  public.sinc_banco_espelho(UUID),
  public.sinc_empresa_excluida(UUID),
  public.trg_sinc_empresas_clientes(),
  public.trg_sinc_empresa_produtos(),
  public.trg_sinc_banco_espelho(),
  public.desligar_espelho_legado(),
  public.desligar_espelho_ao_liberar()
FROM PUBLIC, anon, authenticated;
