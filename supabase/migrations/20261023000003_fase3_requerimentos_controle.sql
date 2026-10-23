-- =====================================================================
-- Fase 3 — migration 21: requerimentos na aba do Controle
-- (docs/especificacoes/Modelagem_Fase3.md, seção 7; decisão de 23/10/2026)
--
-- bancos_horas_requerimentos_controle()  todos os requerimentos cobrados no banco
--   de horas da empresa num mês, com o título, se já consomem (a mesma regra de
--   bancos_horas_requerimentos) ou ainda estão em desenvolvimento, e o ajuste de
--   banco com o motivo. Com a permissão do consumo (Controle ou Geração de Books):
--   quem vê o Controle sem ver a tela Requerimentos também enxerga a lista.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.bancos_horas_requerimentos_controle(p_empresa_id UUID, p_ano INTEGER, p_mes INTEGER)
RETURNS TABLE (
  requerimento_id UUID, chamado TEXT, descricao TEXT, modulo TEXT, produto_id UUID, modulo_id UUID,
  horas NUMERIC, tickets INTEGER, consome BOOLEAN,
  banco_ajustado_id UUID, ajuste_motivo TEXT, ajuste_por UUID, ajuste_em TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  IF NOT pode_consultar_bancos_horas() THEN
    RAISE EXCEPTION 'Sem permissão para consultar os requerimentos dos bancos de horas.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT r.id,
         r.chamado::text,
         r.descricao,
         r.modulo::text,
         mrp.produto_id,
         mrp.modulo_id,
         -- D-01: horas de gestor não descontam
         COALESCE(r.horas_funcional, 0) + COALESCE(r.horas_tecnico, 0),
         COALESCE(r.quantidade_tickets, 0),
         -- Mesma regra de bancos_horas_requerimentos (migration 20261015000008)
         (r.enviado_faturamento AND r.status IN ('enviado_faturamento', 'faturado')),
         rb.banco_id,
         rb.motivo,
         rb.updated_by,
         rb.updated_at
    FROM requerimentos r
    LEFT JOIN modulos_requerimento_produto mrp ON mrp.modulo_requerimento = r.modulo
    LEFT JOIN requerimentos_bancos rb ON rb.requerimento_id = r.id
   WHERE r.cliente_id = p_empresa_id
     AND r.tipo_cobranca = 'Banco de Horas'
     AND r.mes_cobranca = lpad(p_mes::text, 2, '0') || '/' || p_ano
   ORDER BY r.chamado;
END;
$$;

COMMENT ON FUNCTION public.bancos_horas_requerimentos_controle(UUID, INTEGER, INTEGER) IS
  'Aba Requerimentos do Controle: requerimentos do banco de horas no mês, com título, situação e ajuste';

REVOKE ALL ON FUNCTION public.bancos_horas_requerimentos_controle(UUID, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bancos_horas_requerimentos_controle(UUID, INTEGER, INTEGER) TO authenticated, service_role;
