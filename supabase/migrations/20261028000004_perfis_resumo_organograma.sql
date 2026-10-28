-- =====================================================================
-- perfis_resumo: nome do Comercial pelo organograma
--
-- A tela nova de Empresas mostra o Customer Success e o Comercial pelo nome e copia
-- o e-mail. O nome vem do cadastro de usuários (profiles), mas os comerciais não
-- são usuários do sistema: a coluna mostrava o e-mail. Agora os e-mails pedidos que
-- não estão em profiles são completados pelo organograma (organizacao_estrutura),
-- onde os comerciais estão cadastrados.
--
-- Mesmo contrato: só id, e-mail e nome, e só dos ids ou e-mails pedidos; a busca
-- por id continua só em profiles. A lista de telas é a da migration
-- 20261028000003 (Fase 4), que incluiu a Comparação Legado x Novo.
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
  -- Colunas com nome próprio: id, email e full_name são as colunas de saída da função
  WITH pedidos AS (
    SELECT DISTINCT lower(trim(e)) AS pedido FROM unnest(coalesce(p_emails, '{}')) AS e
  ),
  usuarios AS (
    SELECT p.id AS u_id, p.email AS u_email, p.full_name AS u_nome
      FROM profiles p
     WHERE p.id = ANY (coalesce(p_ids, '{}'))
        OR lower(p.email) IN (SELECT pd.pedido FROM pedidos pd)
  )
  SELECT u.u_id, u.u_email, u.u_nome FROM usuarios u
  UNION ALL
  -- Quem não é usuário do sistema: o primeiro cadastro do e-mail no organograma
  (SELECT DISTINCT ON (lower(o.email)) o.id, o.email, o.nome
     FROM organizacao_estrutura o
    WHERE lower(trim(o.email)) IN (SELECT pd.pedido FROM pedidos pd)
      AND NOT EXISTS (SELECT 1 FROM usuarios u WHERE lower(u.u_email) = lower(trim(o.email)))
    ORDER BY lower(o.email), o.created_at);
END;
$$;

COMMENT ON FUNCTION public.perfis_resumo(UUID[], TEXT[]) IS
  'Nome dos usuários pelos ids ou e-mails (CS e Comercial em Empresas, autor das alterações nas telas da Fase 3, quem validou na Comparação); e-mail fora do cadastro de usuários vem do organograma';

REVOKE ALL ON FUNCTION public.perfis_resumo(UUID[], TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.perfis_resumo(UUID[], TEXT[]) TO authenticated, service_role;
