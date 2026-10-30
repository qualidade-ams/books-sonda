-- =====================================================================
-- Grupo do Aranda em vários lugares do catálogo (pedido de 28/10/2026,
-- decisões de 28 e 30/10/2026)
--
--   grupos_aranda_vinculos      nova: cada lugar do grupo no catálogo (serviço da
--                               solução, produto inteiro ou módulo). Um lugar por
--                               produto e um serviço por solução. Grupo sem vínculo
--                               = não se aplica (Banco padrão). A hora vai para o
--                               primeiro banco, na ordem, que cobre algum vínculo.
--   grupos_aranda_vincular()    acrescenta um vínculo (outro módulo do mesmo produto
--                               move o grupo) ou, com p_substituir, troca todos
--                               (edição e atribuição em lote do De-para)
--   grupos_aranda_desvincular() tira um vínculo; do módulo, o grupo fica no produto
--
-- Carga: um vínculo por grupo, a partir das colunas de hoje, para nada mudar no dia.
-- Compatibilidade: as colunas de destino de grupos_aranda (solucao_id, produto_id,
-- modulo_id, classificacao) passam a ser o espelho do primeiro vínculo, mantido por
-- gatilho, para o front e o sync-api anteriores continuarem coerentes até o deploy.
-- Uma migration de limpeza remove essas colunas depois.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tabela
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS grupos_aranda_vinculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES grupos_aranda(id) ON DELETE RESTRICT,
  solucao_id UUID NOT NULL REFERENCES solucoes(id) ON DELETE RESTRICT,
  -- Nulo = serviço da solução
  produto_id UUID,
  -- Nulo = produto inteiro
  modulo_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT grupos_aranda_vinculos_produto_fk FOREIGN KEY (produto_id, solucao_id)
    REFERENCES produtos (id, solucao_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  -- O módulo "A classificar" pode mudar de produto: o vínculo acompanha
  CONSTRAINT grupos_aranda_vinculos_modulo_fk FOREIGN KEY (modulo_id, produto_id)
    REFERENCES produto_modulos (id, produto_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT grupos_aranda_vinculos_modulo_ck CHECK (modulo_id IS NULL OR produto_id IS NOT NULL)
);

-- Um lugar por produto (produto inteiro ou um módulo) e um serviço por solução
CREATE UNIQUE INDEX IF NOT EXISTS grupos_aranda_vinculos_produto_uq
  ON grupos_aranda_vinculos (grupo_id, produto_id) WHERE produto_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS grupos_aranda_vinculos_servico_uq
  ON grupos_aranda_vinculos (grupo_id, solucao_id) WHERE produto_id IS NULL;
CREATE INDEX IF NOT EXISTS grupos_aranda_vinculos_solucao_idx ON grupos_aranda_vinculos (solucao_id);
CREATE INDEX IF NOT EXISTS grupos_aranda_vinculos_produto_idx ON grupos_aranda_vinculos (produto_id);
CREATE INDEX IF NOT EXISTS grupos_aranda_vinculos_modulo_idx ON grupos_aranda_vinculos (modulo_id);

COMMENT ON TABLE grupos_aranda_vinculos IS
  'Lugares de cada grupo do Aranda no catálogo; a hora vai para o primeiro banco, na ordem, que cobre algum';

-- ---------------------------------------------------------------------
-- 2. Autoria, auditoria e RLS (iguais às de grupos_aranda)
-- ---------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_grupos_aranda_vinculos_autoria ON grupos_aranda_vinculos;
CREATE TRIGGER trg_grupos_aranda_vinculos_autoria BEFORE INSERT OR UPDATE ON grupos_aranda_vinculos
  FOR EACH ROW EXECUTE FUNCTION definir_autoria();
DROP TRIGGER IF EXISTS trg_grupos_aranda_vinculos_auditoria ON grupos_aranda_vinculos;
CREATE TRIGGER trg_grupos_aranda_vinculos_auditoria AFTER INSERT OR UPDATE OR DELETE ON grupos_aranda_vinculos
  FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();

ALTER TABLE grupos_aranda_vinculos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS grupos_aranda_vinculos_select ON grupos_aranda_vinculos;
DROP POLICY IF EXISTS grupos_aranda_vinculos_insert ON grupos_aranda_vinculos;
DROP POLICY IF EXISTS grupos_aranda_vinculos_update ON grupos_aranda_vinculos;
DROP POLICY IF EXISTS grupos_aranda_vinculos_delete ON grupos_aranda_vinculos;

CREATE POLICY grupos_aranda_vinculos_select ON grupos_aranda_vinculos FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY grupos_aranda_vinculos_insert ON grupos_aranda_vinculos FOR INSERT TO authenticated
  WITH CHECK (has_screen_permission('de_para_grupos'::text, 'edit'::text));
CREATE POLICY grupos_aranda_vinculos_update ON grupos_aranda_vinculos FOR UPDATE TO authenticated
  USING (has_screen_permission('de_para_grupos'::text, 'edit'::text))
  WITH CHECK (has_screen_permission('de_para_grupos'::text, 'edit'::text));
CREATE POLICY grupos_aranda_vinculos_delete ON grupos_aranda_vinculos FOR DELETE TO authenticated
  USING (has_screen_permission('de_para_grupos'::text, 'edit'::text));

-- ---------------------------------------------------------------------
-- 3. Espelho do primeiro vínculo nas colunas antigas de grupos_aranda
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.espelhar_grupo_aranda_vinculos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grupo UUID := CASE WHEN TG_OP = 'DELETE' THEN OLD.grupo_id ELSE NEW.grupo_id END;
  v RECORD;
BEGIN
  SELECT solucao_id, produto_id, modulo_id INTO v
    FROM grupos_aranda_vinculos
   WHERE grupo_id = v_grupo
   ORDER BY created_at, id
   LIMIT 1;

  -- A ponte da seção 3b não deve tratar esta atualização como edição da tela antiga
  PERFORM set_config('app.espelhando_vinculos', 'on', true);
  UPDATE grupos_aranda g
     SET solucao_id = v.solucao_id,
         produto_id = v.produto_id,
         modulo_id = v.modulo_id,
         classificacao = CASE
           WHEN v.modulo_id IS NOT NULL THEN 'modulo'
           WHEN v.produto_id IS NOT NULL THEN 'produto'
           WHEN v.solucao_id IS NOT NULL THEN 'solucao'
           ELSE 'nao_se_aplica'
         END
   WHERE g.id = v_grupo
     AND (g.solucao_id, g.produto_id, g.modulo_id) IS DISTINCT FROM (v.solucao_id, v.produto_id, v.modulo_id);
  PERFORM set_config('app.espelhando_vinculos', '', true);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_grupos_aranda_vinculos_espelho ON grupos_aranda_vinculos;
CREATE TRIGGER trg_grupos_aranda_vinculos_espelho AFTER INSERT OR UPDATE OR DELETE ON grupos_aranda_vinculos
  FOR EACH ROW EXECUTE FUNCTION espelhar_grupo_aranda_vinculos();

-- ---------------------------------------------------------------------
-- 3b. Ponte para a tela anterior: entre aplicar esta migration e publicar o front
--     novo, Produtos e Módulos e o De-para ainda gravam o destino direto nas
--     colunas de grupos_aranda. Essa gravação vira o único vínculo do grupo.
--     Sai na migration de limpeza.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.vinculos_da_tela_anterior()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.espelhando_vinculos', true) = 'on' THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'UPDATE'
     AND (NEW.solucao_id, NEW.produto_id, NEW.modulo_id) IS NOT DISTINCT FROM
         (OLD.solucao_id, OLD.produto_id, OLD.modulo_id) THEN
    RETURN NULL;
  END IF;

  DELETE FROM grupos_aranda_vinculos WHERE grupo_id = NEW.id;
  IF NEW.solucao_id IS NOT NULL THEN
    INSERT INTO grupos_aranda_vinculos (grupo_id, solucao_id, produto_id, modulo_id)
    VALUES (NEW.id, NEW.solucao_id, NEW.produto_id, NEW.modulo_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_grupos_aranda_vinculos_tela_anterior ON grupos_aranda;
CREATE TRIGGER trg_grupos_aranda_vinculos_tela_anterior
  AFTER INSERT OR UPDATE OF solucao_id, produto_id, modulo_id ON grupos_aranda
  FOR EACH ROW EXECUTE FUNCTION vinculos_da_tela_anterior();

-- ---------------------------------------------------------------------
-- 4. Carga: um vínculo por grupo com destino (ativos e inativos)
-- ---------------------------------------------------------------------

DO $carga$
DECLARE
  v_grupos INT;
  v_vinculos INT;
BEGIN
  PERFORM set_config('app.origem', 'carga', true);
  PERFORM set_config('app.motivo', 'Grupo em vários produtos: um vínculo por grupo, das colunas atuais', true);

  INSERT INTO grupos_aranda_vinculos (grupo_id, solucao_id, produto_id, modulo_id)
  SELECT g.id, g.solucao_id, g.produto_id, g.modulo_id
    FROM grupos_aranda g
   WHERE g.solucao_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM grupos_aranda_vinculos v WHERE v.grupo_id = g.id);

  SELECT count(*) INTO v_grupos FROM grupos_aranda WHERE solucao_id IS NOT NULL;
  SELECT count(DISTINCT grupo_id) INTO v_vinculos FROM grupos_aranda_vinculos;
  IF v_vinculos <> v_grupos THEN
    RAISE EXCEPTION 'Conferência da carga: % grupos com destino e % com vínculo', v_grupos, v_vinculos;
  END IF;

  PERFORM set_config('app.origem', '', true);
  PERFORM set_config('app.motivo', '', true);
END $carga$;

-- ---------------------------------------------------------------------
-- 5. Vincular e desvincular (Produtos e Módulos, De-para)
-- ---------------------------------------------------------------------

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
    ELSIF p_produto IS NOT NULL THEN
      -- Um lugar por produto: outro módulo (ou o produto inteiro) move o grupo
      DELETE FROM grupos_aranda_vinculos WHERE grupo_id = v_grupo AND produto_id = p_produto;
    ELSE
      DELETE FROM grupos_aranda_vinculos
       WHERE grupo_id = v_grupo AND solucao_id = v_solucao AND produto_id IS NULL;
    END IF;

    IF v_solucao IS NOT NULL THEN
      INSERT INTO grupos_aranda_vinculos (grupo_id, solucao_id, produto_id, modulo_id)
      VALUES (v_grupo, v_solucao, p_produto, p_modulo);
    END IF;
  END LOOP;
END;
$$;

-- Do módulo, o grupo fica no produto inteiro; do produto ou do serviço da solução, o
-- vínculo sai
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
BEGIN
  IF NOT has_screen_permission('de_para_grupos'::text, 'edit'::text) THEN
    RAISE EXCEPTION 'Sem permissão para desvincular grupos do Aranda.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_modulo IS NOT NULL THEN
    UPDATE grupos_aranda_vinculos SET modulo_id = NULL
     WHERE grupo_id = ANY (p_grupos) AND modulo_id = p_modulo;
  ELSIF p_produto IS NOT NULL THEN
    DELETE FROM grupos_aranda_vinculos WHERE grupo_id = ANY (p_grupos) AND produto_id = p_produto;
  ELSIF p_solucao IS NOT NULL THEN
    DELETE FROM grupos_aranda_vinculos
     WHERE grupo_id = ANY (p_grupos) AND solucao_id = p_solucao AND produto_id IS NULL;
  ELSE
    RAISE EXCEPTION 'Informe de onde desvincular o grupo.' USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.espelhar_grupo_aranda_vinculos() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vinculos_da_tela_anterior() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grupos_aranda_vincular(UUID[], UUID, UUID, UUID, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.grupos_aranda_desvincular(UUID[], UUID, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grupos_aranda_vincular(UUID[], UUID, UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grupos_aranda_desvincular(UUID[], UUID, UUID, UUID) TO authenticated;
