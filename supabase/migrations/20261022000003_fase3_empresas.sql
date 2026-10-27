-- =====================================================================
-- Fase 3 — migration 11: campos novos da empresa e do contrato
-- (docs/especificacoes/Modelagem_Fase3.md, seções 3.1, 3.3 e 3.5)
--
--   empresas                        + grupo_empresarial (maiúsculas) e id_aranda
--   empresas_informacoes_contrato   + ramo secundário, descrição da atividade e
--                                     horas de DBA por mês (atendimento e monitoramento)
--   perfis_resumo()                 id, e-mail e nome dos usuários, para mostrar o
--                                     nome do CS, do Comercial e de quem alterou sem
--                                     abrir profiles a quem vê Empresas
--
-- Carga: nas empresas com FISCAIS, os campos vazios do contrato FISCAL recebem os
-- valores padrão do protótipo (o padrão conta como preenchido).
-- As colunas novas são exclusivas da tabela nova: a sincronização com a tela atual
-- não as toca. Autoria, auditoria e RLS são os da Fase 1, que já cobrem as tabelas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Empresa
-- ---------------------------------------------------------------------

-- Texto livre em maiúsculas; as sugestões da tela vêm dos grupos já usados.
-- Editável só depois da virada (é identidade).
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS grupo_empresarial TEXT;
-- Opcional e manual; o consumo continua pelas organizações do Aranda (16/10/2026)
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS id_aranda TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'empresas_grupo_empresarial_ck') THEN
    ALTER TABLE empresas ADD CONSTRAINT empresas_grupo_empresarial_ck
      CHECK (grupo_empresarial IS NULL OR (grupo_empresarial = upper(grupo_empresarial) AND length(trim(grupo_empresarial)) > 0));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS empresas_grupo_empresarial_idx ON empresas (grupo_empresarial) WHERE grupo_empresarial IS NOT NULL;

-- ---------------------------------------------------------------------
-- 2. Informações do contrato
-- ---------------------------------------------------------------------

ALTER TABLE empresas_informacoes_contrato
  ADD COLUMN IF NOT EXISTS ramo_secundario_id UUID REFERENCES ramos_atividade(id) ON DELETE RESTRICT;
ALTER TABLE empresas_informacoes_contrato ADD COLUMN IF NOT EXISTS descricao_atividade TEXT;
-- Horas contratadas por mês, em minutos (pergunta P2). A que não se aplica à opção
-- de DBA fica guardada (RN-33).
ALTER TABLE empresas_informacoes_contrato ADD COLUMN IF NOT EXISTS fiscal_dba_minutos_atendimento INTEGER;
ALTER TABLE empresas_informacoes_contrato ADD COLUMN IF NOT EXISTS fiscal_dba_minutos_monitoramento INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'empresas_informacoes_contrato_ramo_secundario_ck') THEN
    ALTER TABLE empresas_informacoes_contrato ADD CONSTRAINT empresas_informacoes_contrato_ramo_secundario_ck
      CHECK (ramo_secundario_id IS NULL OR ramo_secundario_id IS DISTINCT FROM ramo_atividade_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'empresas_informacoes_contrato_descricao_ck') THEN
    ALTER TABLE empresas_informacoes_contrato ADD CONSTRAINT empresas_informacoes_contrato_descricao_ck
      CHECK (descricao_atividade IS NULL OR length(descricao_atividade) <= 500);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'empresas_informacoes_contrato_dba_minutos_ck') THEN
    ALTER TABLE empresas_informacoes_contrato ADD CONSTRAINT empresas_informacoes_contrato_dba_minutos_ck
      CHECK (coalesce(fiscal_dba_minutos_atendimento, 0) >= 0 AND coalesce(fiscal_dba_minutos_monitoramento, 0) >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS empresas_informacoes_contrato_ramo_secundario_idx
  ON empresas_informacoes_contrato (ramo_secundario_id) WHERE ramo_secundario_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 3. Carga do contrato FISCAL (seção 3.3): só os campos vazios
-- ---------------------------------------------------------------------

DO $carga$
DECLARE
  v_pendentes BIGINT;
BEGIN
  PERFORM set_config('app.origem', 'carga', true);

  UPDATE empresas_informacoes_contrato c
     SET fiscal_modalidade = coalesce(c.fiscal_modalidade, 'on_premise'),
         fiscal_edocs_24x7 = coalesce(c.fiscal_edocs_24x7, false),
         fiscal_atualizacao_contratada = coalesce(c.fiscal_atualizacao_contratada, false),
         fiscal_banco_dados = coalesce(c.fiscal_banco_dados, 'sql_server'),
         fiscal_dba = coalesce(c.fiscal_dba, 'nao_contratado')
   WHERE EXISTS (SELECT 1 FROM empresas_solucoes es JOIN solucoes s ON s.id = es.solucao_id
                  WHERE es.empresa_id = c.empresa_id AND s.codigo = 'FISCAIS')
     AND (c.fiscal_modalidade IS NULL OR c.fiscal_edocs_24x7 IS NULL OR c.fiscal_atualizacao_contratada IS NULL
          OR c.fiscal_banco_dados IS NULL OR c.fiscal_dba IS NULL);

  -- Conferência: empresa com FISCAIS sem informações do contrato não recebeu o padrão
  SELECT count(*) INTO v_pendentes
    FROM empresas_solucoes es JOIN solucoes s ON s.id = es.solucao_id
   WHERE s.codigo = 'FISCAIS'
     AND NOT EXISTS (SELECT 1 FROM empresas_informacoes_contrato c WHERE c.empresa_id = es.empresa_id);
  IF v_pendentes > 0 THEN
    RAISE EXCEPTION 'Carga abortada: % empresa(s) com FISCAIS sem linha em empresas_informacoes_contrato', v_pendentes;
  END IF;
END
$carga$;

-- ---------------------------------------------------------------------
-- 4. perfis_resumo (seção 3.5)
-- ---------------------------------------------------------------------

-- Só id, e-mail e nome, e só dos ids ou e-mails pedidos: sem filtro, não devolve
-- ninguém (não serve para listar todos os usuários). O e-mail é comparado sem
-- diferença de maiúsculas.
CREATE OR REPLACE FUNCTION public.perfis_resumo(p_ids UUID[], p_emails TEXT[])
RETURNS TABLE (id UUID, email TEXT, full_name TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (has_screen_permission('empresas'::text, 'view'::text)
          OR has_screen_permission('bancos_horas_auditoria'::text, 'view'::text)) THEN
    RAISE EXCEPTION 'Sem permissão para consultar nomes de usuários'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT p.id, p.email, p.full_name
    FROM profiles p
   WHERE p.id = ANY (coalesce(p_ids, '{}'))
      OR lower(p.email) = ANY (SELECT lower(e) FROM unnest(coalesce(p_emails, '{}')) AS e);
END;
$$;

COMMENT ON FUNCTION public.perfis_resumo(UUID[], TEXT[]) IS
  'Nome dos usuários pelos ids ou e-mails (CS e Comercial em Empresas, autor na Auditoria)';

REVOKE ALL ON FUNCTION public.perfis_resumo(UUID[], TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.perfis_resumo(UUID[], TEXT[]) TO authenticated, service_role;
