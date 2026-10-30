-- =====================================================================
-- Excluir solução, produto ou módulo que nunca foi usado (pedido de 30/10/2026)
--
-- O catálogo segue com exclusão lógica (inativar). A exclusão de verdade é só para o
-- item criado por engano: catalogo_excluir() apaga a linha e, se qualquer coisa
-- aponta para ela (grupo, banco, empresa, módulo, requerimento), a chave RESTRICT
-- barra e a função devolve "já foi usado, inative". O produto "A classificar" da
-- solução nunca sai. A auditoria (gatilho AFTER DELETE) guarda a cópia do apagado.
--
-- As tabelas seguem sem política de DELETE: só esta função apaga.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.catalogo_excluir(p_tipo TEXT, p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quantos INT := 0;
BEGIN
  IF NOT has_screen_permission('produtos_modulos'::text, 'edit'::text) THEN
    RAISE EXCEPTION 'Sem permissão para excluir do catálogo.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_tipo NOT IN ('solucao', 'produto', 'modulo') THEN
    RAISE EXCEPTION 'Tipo de item inválido: %', p_tipo USING ERRCODE = 'check_violation';
  END IF;
  IF p_tipo = 'produto' AND EXISTS (SELECT 1 FROM produtos WHERE id = p_id AND a_classificar) THEN
    RAISE EXCEPTION 'O produto "A classificar" da solução não pode ser excluído.' USING ERRCODE = 'check_violation';
  END IF;

  PERFORM set_config('app.motivo', 'Exclusão de item do catálogo que nunca foi usado', true);
  BEGIN
    IF p_tipo = 'solucao' THEN
      DELETE FROM solucoes WHERE id = p_id;
    ELSIF p_tipo = 'produto' THEN
      DELETE FROM produtos WHERE id = p_id;
    ELSE
      DELETE FROM produto_modulos WHERE id = p_id;
    END IF;
    GET DIAGNOSTICS v_quantos = ROW_COUNT;
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'Este item já foi usado (por produto, módulo, grupo do Aranda, banco, empresa ou requerimento) e não pode ser excluído: inative-o.'
      USING ERRCODE = 'check_violation';
  END;
  PERFORM set_config('app.motivo', '', true);

  IF v_quantos = 0 THEN
    RAISE EXCEPTION 'Item não encontrado.' USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.catalogo_excluir(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.catalogo_excluir(TEXT, UUID) TO authenticated;
