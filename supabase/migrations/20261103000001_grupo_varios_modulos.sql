-- =====================================================================
-- O mesmo grupo do Aranda em vários módulos do mesmo produto (decisão de
-- 03/11/2026, no lugar do "um lugar por produto" de 28/10/2026)
--
--   Lugares únicos: cada módulo, cada produto inteiro e cada serviço de solução
--   aparecem uma vez por grupo; o grupo pode estar em vários módulos do mesmo produto
--   e também no produto inteiro. A hora segue indo para o primeiro banco, na ordem,
--   que cobre algum lugar do grupo (classificador, sem mudança).
--   grupos_aranda_vincular()     acrescenta o lugar, sem mover o grupo dentro do
--                                produto; repetir o mesmo lugar não duplica
--   grupos_aranda_desvincular()  do módulo: só aquele lugar sai; se era o único lugar
--                                do grupo no produto, ele fica no produto inteiro
-- =====================================================================

DROP INDEX IF EXISTS grupos_aranda_vinculos_produto_uq;
CREATE UNIQUE INDEX IF NOT EXISTS grupos_aranda_vinculos_produto_inteiro_uq
  ON grupos_aranda_vinculos (grupo_id, produto_id) WHERE produto_id IS NOT NULL AND modulo_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS grupos_aranda_vinculos_modulo_uq
  ON grupos_aranda_vinculos (grupo_id, modulo_id) WHERE modulo_id IS NOT NULL;
-- grupos_aranda_vinculos_servico_uq (um serviço por solução) continua

-- p_produto sem p_solucao: a solução vem do produto. Sem produto nem solução, só com
-- p_substituir (o grupo passa a não se aplicar).
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
  v_grupo UUID;
BEGIN
  IF NOT has_screen_permission('de_para_grupos'::text, 'edit'::text) THEN
    RAISE EXCEPTION 'Sem permissão para vincular grupos do Aranda.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_modulo IS NOT NULL AND p_produto IS NULL THEN
    RAISE EXCEPTION 'Informe o produto do módulo.' USING ERRCODE = 'check_violation';
  END IF;
  IF p_produto IS NOT NULL THEN
    SELECT solucao_id INTO v_solucao FROM produtos WHERE id = p_produto;
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

-- Do módulo, só aquele lugar sai; se era o único lugar do grupo no produto, o grupo
-- fica no produto inteiro. Do produto inteiro ou do serviço da solução, o vínculo sai.
CREATE OR REPLACE FUNCTION public.grupos_aranda_desvincular(
  p_grupos UUID[],
  p_solucao UUID,
  p_produto UUID,
  p_modulo UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  IF NOT has_screen_permission('de_para_grupos'::text, 'edit'::text) THEN
    RAISE EXCEPTION 'Sem permissão para desvincular grupos do Aranda.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_modulo IS NOT NULL THEN
    FOR r IN
      DELETE FROM grupos_aranda_vinculos
       WHERE grupo_id = ANY (p_grupos) AND modulo_id = p_modulo
      RETURNING grupo_id, solucao_id, produto_id
    LOOP
      IF NOT EXISTS (SELECT 1 FROM grupos_aranda_vinculos
                      WHERE grupo_id = r.grupo_id AND produto_id = r.produto_id) THEN
        INSERT INTO grupos_aranda_vinculos (grupo_id, solucao_id, produto_id, modulo_id)
        VALUES (r.grupo_id, r.solucao_id, r.produto_id, NULL);
      END IF;
    END LOOP;
  ELSIF p_produto IS NOT NULL THEN
    DELETE FROM grupos_aranda_vinculos
     WHERE grupo_id = ANY (p_grupos) AND produto_id = p_produto AND modulo_id IS NULL;
  ELSIF p_solucao IS NOT NULL THEN
    DELETE FROM grupos_aranda_vinculos
     WHERE grupo_id = ANY (p_grupos) AND solucao_id = p_solucao AND produto_id IS NULL;
  ELSE
    RAISE EXCEPTION 'Informe de onde desvincular o grupo.' USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.grupos_aranda_vincular(UUID[], UUID, UUID, UUID, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.grupos_aranda_desvincular(UUID[], UUID, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grupos_aranda_vincular(UUID[], UUID, UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grupos_aranda_desvincular(UUID[], UUID, UUID, UUID) TO authenticated;
