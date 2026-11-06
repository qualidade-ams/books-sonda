-- =====================================================================
-- Fim do grupo de serviço da solução (decisão do usuário em 03/11/2026)
--
-- Desde que o mesmo grupo pode estar em vários produtos e módulos, o grupo que
-- atende a solução toda (DBA, Técnico, Orçamentos…) é vinculado aos produtos
-- como qualquer outro, e a hora segue a regra do primeiro banco na ordem. Antes,
-- o vínculo de serviço (solução sem produto) mandava a hora sempre para o
-- Banco padrão.
--
--   Carga: cada vínculo de serviço vira um vínculo ao produto inteiro de cada
--          produto ativo da solução (fora o "A classificar"). Sem produto ativo,
--          o grupo vai para o "A classificar" da solução; sem ele, fica sem
--          lugar (não se aplica, como já era na prática: Banco padrão).
--   grupos_aranda_vinculos.produto_id passa a ser obrigatório; o índice de
--          serviço sai.
--   grupos_aranda_vincular()     exige o produto. A base é a versão da migration
--          20261103000004 (vários módulos + "A classificar"), conferida em
--          produção em 03/11/2026; só sai o caminho do serviço da solução.
--   grupos_aranda_desvincular()  exige o produto; o resto fica como em produção
--          (base conferida em 03/11/2026).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Carga: serviço da solução → produto inteiro de cada produto ativo
-- ---------------------------------------------------------------------

DO $carga$
DECLARE
  v_servicos INT;
BEGIN
  PERFORM set_config('app.origem', 'carga', true);
  PERFORM set_config('app.motivo', 'Fim do grupo de serviço: vinculado a todos os produtos ativos da solução', true);

  INSERT INTO grupos_aranda_vinculos (grupo_id, solucao_id, produto_id, modulo_id)
  SELECT v.grupo_id, v.solucao_id, p.id, NULL
    FROM grupos_aranda_vinculos v
    JOIN produtos p ON p.solucao_id = v.solucao_id AND p.ativo AND NOT p.a_classificar
   WHERE v.produto_id IS NULL
     AND NOT EXISTS (SELECT 1 FROM grupos_aranda_vinculos x
                      WHERE x.grupo_id = v.grupo_id AND x.produto_id = p.id AND x.modulo_id IS NULL);

  -- Solução sem produto ativo: o grupo vai para o "A classificar" dela
  INSERT INTO grupos_aranda_vinculos (grupo_id, solucao_id, produto_id, modulo_id)
  SELECT v.grupo_id, v.solucao_id, acl.id, NULL
    FROM grupos_aranda_vinculos v
    JOIN LATERAL (SELECT id FROM produtos
                   WHERE solucao_id = v.solucao_id AND a_classificar
                   ORDER BY ordem, id LIMIT 1) acl ON TRUE
   WHERE v.produto_id IS NULL
     AND NOT EXISTS (SELECT 1 FROM produtos p
                      WHERE p.solucao_id = v.solucao_id AND p.ativo AND NOT p.a_classificar)
     AND NOT EXISTS (SELECT 1 FROM grupos_aranda_vinculos x
                      WHERE x.grupo_id = v.grupo_id AND x.produto_id = acl.id AND x.modulo_id IS NULL);

  -- Com lugar de verdade na solução, o grupo não fica também no "A classificar" dela
  DELETE FROM grupos_aranda_vinculos v
   USING produtos acl
   WHERE acl.id = v.produto_id
     AND acl.a_classificar
     AND EXISTS (SELECT 1 FROM grupos_aranda_vinculos s
                  WHERE s.grupo_id = v.grupo_id AND s.solucao_id = v.solucao_id AND s.produto_id IS NULL)
     AND EXISTS (SELECT 1 FROM grupos_aranda_vinculos x
                   JOIN produtos p ON p.id = x.produto_id
                  WHERE x.grupo_id = v.grupo_id AND x.solucao_id = v.solucao_id AND NOT p.a_classificar);

  DELETE FROM grupos_aranda_vinculos WHERE produto_id IS NULL;
  GET DIAGNOSTICS v_servicos = ROW_COUNT;
  RAISE NOTICE 'Vínculos de serviço convertidos: %', v_servicos;

  PERFORM set_config('app.origem', '', true);
  PERFORM set_config('app.motivo', '', true);
END $carga$;

-- ---------------------------------------------------------------------
-- 2. O vínculo sempre tem produto
-- ---------------------------------------------------------------------

DROP INDEX IF EXISTS grupos_aranda_vinculos_servico_uq;
ALTER TABLE grupos_aranda_vinculos ALTER COLUMN produto_id SET NOT NULL;
COMMENT ON COLUMN grupos_aranda_vinculos.produto_id IS 'Produto do lugar; obrigatório desde o fim do grupo de serviço (03/11/2026)';
COMMENT ON COLUMN grupos_aranda_vinculos.modulo_id IS 'Nulo = produto inteiro';

-- ---------------------------------------------------------------------
-- 3. Vincular: acrescenta o lugar (produto inteiro ou módulo); com p_substituir,
--    troca todos. Sem produto, só com p_substituir (o grupo passa a não se aplicar).
--    p_solucao fica na assinatura por compatibilidade: a solução vem do produto.
-- ---------------------------------------------------------------------

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
  v_solucao UUID;
  v_a_classificar BOOLEAN := FALSE;
  v_grupo UUID;
BEGIN
  IF NOT has_screen_permission('de_para_grupos'::text, 'edit'::text) THEN
    RAISE EXCEPTION 'Sem permissão para vincular grupos do Aranda.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_modulo IS NOT NULL AND p_produto IS NULL THEN
    RAISE EXCEPTION 'Informe o produto do módulo.' USING ERRCODE = 'check_violation';
  END IF;
  IF p_produto IS NULL AND (p_solucao IS NOT NULL OR NOT p_substituir) THEN
    RAISE EXCEPTION 'Informe o produto: o grupo é vinculado a produtos e módulos.' USING ERRCODE = 'check_violation';
  END IF;
  IF p_produto IS NOT NULL THEN
    SELECT solucao_id, a_classificar INTO v_solucao, v_a_classificar FROM produtos WHERE id = p_produto;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produto não encontrado.' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  FOREACH v_grupo IN ARRAY COALESCE(p_grupos, '{}') LOOP
    IF p_substituir THEN
      DELETE FROM grupos_aranda_vinculos WHERE grupo_id = v_grupo;
    END IF;
    CONTINUE WHEN p_produto IS NULL;

    -- Lugar de verdade na solução: o grupo sai do "A classificar" dela
    IF NOT v_a_classificar THEN
      DELETE FROM grupos_aranda_vinculos v
       USING produtos p
       WHERE v.grupo_id = v_grupo
         AND v.solucao_id = v_solucao
         AND p.id = v.produto_id
         AND p.a_classificar;
    END IF;

    -- Acrescenta o lugar se o grupo ainda não está nele
    IF NOT EXISTS (
      SELECT 1 FROM grupos_aranda_vinculos v
       WHERE v.grupo_id = v_grupo
         AND v.produto_id = p_produto
         AND v.modulo_id IS NOT DISTINCT FROM p_modulo
    ) THEN
      INSERT INTO grupos_aranda_vinculos (grupo_id, solucao_id, produto_id, modulo_id)
      VALUES (v_grupo, v_solucao, p_produto, p_modulo);
    END IF;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------
-- 4. Desvincular: do módulo, só aquele lugar sai (sem outro lugar no produto, o
--    grupo fica no produto inteiro); do produto inteiro, o vínculo sai e, sem
--    lugar na solução, o grupo volta ao "A classificar" dela.
-- ---------------------------------------------------------------------

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
    FOR r IN
      DELETE FROM grupos_aranda_vinculos v
       WHERE v.grupo_id = ANY (p_grupos) AND v.produto_id = p_produto AND v.modulo_id IS NULL
      RETURNING v.grupo_id, v.solucao_id, v.produto_id
    LOOP
      PERFORM grupos_aranda_volta_ao_a_classificar(r.grupo_id, r.solucao_id, r.produto_id);
    END LOOP;
  ELSE
    RAISE EXCEPTION 'Informe o produto de onde desvincular o grupo.' USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.grupos_aranda_vincular(UUID[], UUID, UUID, UUID, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.grupos_aranda_desvincular(UUID[], UUID, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grupos_aranda_vincular(UUID[], UUID, UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grupos_aranda_desvincular(UUID[], UUID, UUID, UUID) TO authenticated;
