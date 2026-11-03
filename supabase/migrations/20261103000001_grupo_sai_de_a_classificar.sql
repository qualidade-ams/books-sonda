-- =====================================================================
-- Vincular o grupo a um lugar de verdade tira o grupo do "A classificar"
-- (bug de 03/11/2026)
--
-- Desde a migration 20261030000001, vincular acrescenta um lugar ao grupo. Com
-- isso, o grupo vinculado a um produto ficava também no "A classificar" da mesma
-- solução, e era preciso desvincular de lá à mão.
--
-- O "A classificar" é o lugar provisório do grupo enquanto o produto não é
-- conhecido (decisão P8). Ao vincular a um produto, um módulo ou ao serviço da
-- solução, o vínculo com o "A classificar" da mesma solução sai. Um lugar em
-- outra solução não mexe nele, porque o "A classificar" é de cada solução.
--
-- Só muda grupos_aranda_vincular. A versão anterior está na migration
-- 20261030000001 e foi conferida em produção em 03/11/2026 antes desta.
-- Em produção, nenhum grupo estava no "A classificar" e em outro lugar da mesma
-- solução, então não há carga de correção.
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
    ELSIF p_produto IS NOT NULL THEN
      -- Um lugar por produto: outro módulo (ou o produto inteiro) move o grupo
      DELETE FROM grupos_aranda_vinculos WHERE grupo_id = v_grupo AND produto_id = p_produto;
    ELSE
      DELETE FROM grupos_aranda_vinculos
       WHERE grupo_id = v_grupo AND solucao_id = v_solucao AND produto_id IS NULL;
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

    IF v_solucao IS NOT NULL THEN
      INSERT INTO grupos_aranda_vinculos (grupo_id, solucao_id, produto_id, modulo_id)
      VALUES (v_grupo, v_solucao, p_produto, p_modulo);
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.grupos_aranda_vincular(UUID[], UUID, UUID, UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grupos_aranda_vincular(UUID[], UUID, UUID, UUID, BOOLEAN) TO authenticated;
