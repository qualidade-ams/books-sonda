-- =====================================================================
-- Fase 3 — migration 18: uso dos grupos e nome de quem alterou
-- (docs/especificacoes/Modelagem_Fase3.md, seções 3.5 e 6; decisões de 22/10/2026)
--
--   grupos_aranda_uso()   coluna "Uso" do De-para: apontamentos e tickets de cada
--                         grupo mapeado nos últimos meses e as empresas com mais
--                         de um banco ativo que têm esse consumo (avisa quem será
--                         afetado ao mudar o destino das horas)
--   perfis_resumo()       passa a responder também a quem vê as telas da Fase 3,
--                         para mostrar "Última alteração por <nome>"
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Uso dos grupos mapeados (seção 6)
-- ---------------------------------------------------------------------

-- Só os grupos ativos com consumo no período. As empresas vêm pelas organizações
-- do Aranda, como em grupos_aranda_nao_mapeados(); organização sem empresa não
-- entra (não tem banco).
CREATE OR REPLACE FUNCTION public.grupos_aranda_uso(p_meses INTEGER DEFAULT 6)
RETURNS TABLE (grupo_aranda_id UUID, apontamentos INTEGER, tickets INTEGER, empresas_multiplos TEXT[])
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_claims JSONB := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  v_desde TIMESTAMPTZ := now() - make_interval(months => coalesce(p_meses, 6));
BEGIN
  IF v_claims IS NOT NULL AND v_claims ->> 'role' IS DISTINCT FROM 'service_role'
     AND NOT has_screen_permission('de_para_grupos'::text, 'view'::text) THEN
    RAISE EXCEPTION 'Sem permissão para consultar o de-para de grupos.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  WITH usos AS (
    SELECT lower(trim(a.caso_grupo)) AS grupo, 1 AS apontamento, 0 AS ticket, a.org_us_final AS org
      FROM apontamentos_aranda a
     WHERE a.data_atividade >= v_desde AND a.caso_grupo IS NOT NULL
    UNION ALL
    SELECT lower(trim(t.nome_grupo::text)), 0, 1, t.organizacao::text
      FROM apontamentos_tickets_aranda t
     WHERE t.data_fechamento >= v_desde AND t.nome_grupo IS NOT NULL
  ),
  multiplos AS (
    SELECT b.empresa_id FROM bancos_horas b WHERE b.ativo GROUP BY b.empresa_id HAVING count(*) > 1
  )
  SELECT ga.id,
         sum(u.apontamento)::integer,
         sum(u.ticket)::integer,
         coalesce(array_agg(DISTINCT e.nome_abreviado ORDER BY e.nome_abreviado)
                    FILTER (WHERE m.empresa_id IS NOT NULL), '{}')
    FROM usos u
    JOIN grupos_aranda ga ON ga.ativo AND lower(trim(ga.grupo_aranda)) = u.grupo
    LEFT JOIN empresas_organizacoes_aranda o ON o.ativo AND lower(trim(o.nome_organizacao)) = lower(trim(u.org))
    LEFT JOIN empresas e ON e.id = o.empresa_id
    LEFT JOIN multiplos m ON m.empresa_id = e.id
   GROUP BY ga.id;
END;
$$;

COMMENT ON FUNCTION public.grupos_aranda_uso(INTEGER) IS
  'Coluna Uso do De-para: consumo de cada grupo mapeado e empresas com bancos múltiplos afetadas';

REVOKE ALL ON FUNCTION public.grupos_aranda_uso(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grupos_aranda_uso(INTEGER) TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 2. Nome de quem alterou nas telas da Fase 3 (seção 3.5)
-- ---------------------------------------------------------------------

-- Mesmo contrato da migration 11: só id, e-mail e nome, e só dos ids ou e-mails
-- pedidos. Muda só a lista de telas que podem consultar.
CREATE OR REPLACE FUNCTION public.perfis_resumo(p_ids UUID[], p_emails TEXT[])
RETURNS TABLE (id UUID, email TEXT, full_name TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM unnest(ARRAY[
        'empresas', 'bancos_horas_auditoria', 'bancos_horas_controle', 'bancos_horas_retroativos',
        'produtos_modulos', 'de_para_grupos', 'ramos_atividade', 'regras_contagem', 'organizar_menu'
      ]) AS tela
     WHERE has_screen_permission(tela, 'view'::text)
  ) THEN
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
  'Nome dos usuários pelos ids ou e-mails (CS e Comercial em Empresas, autor das alterações nas telas da Fase 3)';

REVOKE ALL ON FUNCTION public.perfis_resumo(UUID[], TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.perfis_resumo(UUID[], TEXT[]) TO authenticated, service_role;
