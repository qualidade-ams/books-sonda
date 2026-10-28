-- =====================================================================
-- Fase 4 — migration 26: nome de quem validou na Comparação Legado x Novo
-- (docs/especificacoes/Modelagem_Fase4.md, seção 9)
--
-- perfis_resumo passa a responder também a quem vê a tela da Comparação, para o
-- "Validada por <nome>". Mesmo contrato da migration 18 (20261022000010): só id,
-- e-mail e nome, e só dos ids ou e-mails pedidos. Muda só a lista de telas.
-- =====================================================================

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
        'produtos_modulos', 'de_para_grupos', 'ramos_atividade', 'regras_contagem', 'organizar_menu',
        'bancos_horas_comparacao'
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
  'Nome dos usuários pelos ids ou e-mails (CS e Comercial em Empresas, autor das alterações nas telas da Fase 3, quem validou na Comparação)';

REVOKE ALL ON FUNCTION public.perfis_resumo(UUID[], TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.perfis_resumo(UUID[], TEXT[]) TO authenticated, service_role;
