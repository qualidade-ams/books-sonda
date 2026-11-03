-- =====================================================================
-- Tirar o último lugar do grupo numa solução devolve o grupo ao
-- "A classificar" dela (decisão do usuário em 03/11/2026)
--
-- Antes, o grupo desvinculado do único produto ficava sem vínculo ("não se
-- aplica", Banco padrão) e sumia da tela Produtos e Módulos. Agora:
--   - Sem nenhum lugar na solução depois de desvincular (produto ou serviço), o
--     grupo volta ao produto inteiro "A classificar" da solução.
--   - A volta é por solução: um lugar em outra solução não a impede.
--   - Desvincular do próprio "A classificar" tira o grupo de vez (não se aplica).
--   - A solução sem "A classificar" fica como antes: o grupo fica sem vínculo.
--   - Desvincular do módulo continua deixando o grupo no produto inteiro.
-- Para deixar o grupo como "não se aplica" de propósito: De-para, solução Nenhuma.
--
-- Só muda grupos_aranda_desvincular. A base é a versão em produção em
-- 03/11/2026, que difere da migration 20261030000001: do módulo, apaga o vínculo
-- e recria o produto inteiro se o grupo não tiver outro lugar no produto; do
-- produto, apaga só o vínculo do produto inteiro.
-- =====================================================================

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
    RETURN;
  ELSIF p_produto IS NOT NULL THEN
    FOR r IN
      DELETE FROM grupos_aranda_vinculos v
       WHERE v.grupo_id = ANY (p_grupos) AND v.produto_id = p_produto AND v.modulo_id IS NULL
      RETURNING v.grupo_id, v.solucao_id, v.produto_id
    LOOP
      PERFORM grupos_aranda_volta_ao_a_classificar(r.grupo_id, r.solucao_id, r.produto_id);
    END LOOP;
  ELSIF p_solucao IS NOT NULL THEN
    FOR r IN
      DELETE FROM grupos_aranda_vinculos v
       WHERE v.grupo_id = ANY (p_grupos) AND v.solucao_id = p_solucao AND v.produto_id IS NULL
      RETURNING v.grupo_id, v.solucao_id, v.produto_id
    LOOP
      PERFORM grupos_aranda_volta_ao_a_classificar(r.grupo_id, r.solucao_id, r.produto_id);
    END LOOP;
  ELSE
    RAISE EXCEPTION 'Informe de onde desvincular o grupo.' USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

-- Sem lugar na solução, o grupo volta ao "A classificar" dela (se a solução tiver um).
-- Quem saiu do próprio "A classificar" não volta.
CREATE OR REPLACE FUNCTION public.grupos_aranda_volta_ao_a_classificar(
  p_grupo UUID,
  p_solucao UUID,
  p_produto_que_saiu UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_a_classificar UUID;
BEGIN
  IF p_produto_que_saiu IS NOT NULL
     AND EXISTS (SELECT 1 FROM produtos WHERE id = p_produto_que_saiu AND a_classificar) THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM grupos_aranda_vinculos WHERE grupo_id = p_grupo AND solucao_id = p_solucao) THEN
    RETURN;
  END IF;

  SELECT id INTO v_a_classificar
    FROM produtos
   WHERE solucao_id = p_solucao AND a_classificar
   ORDER BY ordem, id
   LIMIT 1;
  IF v_a_classificar IS NOT NULL THEN
    INSERT INTO grupos_aranda_vinculos (grupo_id, solucao_id, produto_id, modulo_id)
    VALUES (p_grupo, p_solucao, v_a_classificar, NULL);
  END IF;
END;
$$;

-- A auxiliar só é chamada por grupos_aranda_desvincular, que confere a permissão
REVOKE ALL ON FUNCTION public.grupos_aranda_volta_ao_a_classificar(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grupos_aranda_desvincular(UUID[], UUID, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grupos_aranda_desvincular(UUID[], UUID, UUID, UUID) TO authenticated;
