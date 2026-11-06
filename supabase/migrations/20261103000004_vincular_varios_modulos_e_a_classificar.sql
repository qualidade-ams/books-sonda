-- =====================================================================
-- grupos_aranda_vincular com as duas regras de 03/11/2026 juntas
--
-- Em produção, a ordem de aplicação foi 20261103000001 (vários módulos do mesmo
-- produto), 20261103000002 (sai do "A classificar") e 20261103000003. A 000002 foi
-- escrita sobre a versão anterior da função e trouxe de volta o "um lugar por
-- produto": vincular a um segundo módulo do mesmo produto movia o grupo.
--
-- Esta versão:
--   - acrescenta o lugar sem mover o grupo dentro do produto; repetir o mesmo lugar
--     não duplica (regra da 000001);
--   - um lugar de verdade (produto, módulo ou serviço da solução) tira o grupo do
--     "A classificar" da mesma solução (regra da 000002).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.grupos_aranda_vincular(
  p_grupos UUID[],
  p_solucao UUID,
  p_produto UUID,
  p_modulo UUID,
  p_substituir BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_solucao UUID := p_solucao;
  v_a_classificar BOOLEAN := FALSE;
  v_grupo UUID;
BEGIN
  IF NOT has_screen_permission('de_para_grupos'::text, 'edit'::text) THEN
    RAISE EXCEPTION 'Sem permissão para vincular grupos do Aranda.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_modulo IS NOT NULL AND p_produto IS NULL THEN
    RAISE EXCEPTION 'Informe o produto do módulo.' USING ERRCODE = 'check_violation';
  END IF;
  IF p_produto IS NOT NULL THEN
    SELECT solucao_id, a_classificar INTO v_solucao, v_a_classificar FROM produtos WHERE id = p_produto;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produto não encontrado.' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF v_solucao IS NULL AND NOT p_substituir THEN
    RAISE EXCEPTION 'Informe onde vincular o grupo.' USING ERRCODE = 'check_violation';
  END IF;

  FOREACH v_grupo IN ARRAY COALESCE(p_grupos, '{}') LOOP
    IF p_substituir THEN
      DELETE FROM grupos_aranda_vinculos WHERE grupo_id = v_grupo;
    END IF;

    -- Lugar de verdade na solução: o grupo sai do "A classificar" dela
    IF v_solucao IS NOT NULL AND NOT v_a_classificar THEN
      DELETE FROM grupos_aranda_vinculos v
       USING produtos p
       WHERE v.grupo_id = v_grupo
         AND v.solucao_id = v_solucao
         AND p.id = v.produto_id
         AND p.a_classificar;
    END IF;

    -- Acrescenta o lugar se o grupo ainda não está nele
    IF v_solucao IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM grupos_aranda_vinculos v
       WHERE v.grupo_id = v_grupo
         AND v.solucao_id = v_solucao
         AND v.produto_id IS NOT DISTINCT FROM p_produto
         AND v.modulo_id IS NOT DISTINCT FROM p_modulo
    ) THEN
      INSERT INTO grupos_aranda_vinculos (grupo_id, solucao_id, produto_id, modulo_id)
      VALUES (v_grupo, v_solucao, p_produto, p_modulo);
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.grupos_aranda_vincular(UUID[], UUID, UUID, UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grupos_aranda_vincular(UUID[], UUID, UUID, UUID, BOOLEAN) TO authenticated;
