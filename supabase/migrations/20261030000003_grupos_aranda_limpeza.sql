-- =====================================================================
-- Limpeza do grupo em vários produtos (depois do front e do sync-api novos no ar)
--
-- Os lugares do grupo ficam só em grupos_aranda_vinculos (migration 20261030000001).
-- Saem as peças de compatibilidade com a versão anterior:
--   - o espelho do primeiro vínculo nas colunas de grupos_aranda;
--   - a ponte que transformava a gravação da tela anterior em vínculo;
--   - as colunas de destino de grupos_aranda (solucao_id, produto_id, modulo_id,
--     classificacao), com as chaves, o CHECK e os índices delas.
-- Sem CASCADE: se alguma view ainda depende das colunas, a migration falha e nada muda.
-- =====================================================================

-- Conferência: todo grupo com destino nas colunas tem o vínculo (o espelho garantia isso)
DO $conferencia$
DECLARE
  v_sem_vinculo INT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'grupos_aranda' AND column_name = 'solucao_id') THEN
    EXECUTE $q$
      SELECT count(*) FROM grupos_aranda g
       WHERE g.solucao_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM grupos_aranda_vinculos v WHERE v.grupo_id = g.id)
    $q$ INTO v_sem_vinculo;
    IF v_sem_vinculo > 0 THEN
      RAISE EXCEPTION 'Limpeza abortada: % grupos com destino nas colunas e sem vínculo', v_sem_vinculo;
    END IF;
  END IF;
END $conferencia$;

DROP TRIGGER IF EXISTS trg_grupos_aranda_vinculos_espelho ON grupos_aranda_vinculos;
DROP TRIGGER IF EXISTS trg_grupos_aranda_vinculos_tela_anterior ON grupos_aranda;
DROP FUNCTION IF EXISTS public.espelhar_grupo_aranda_vinculos();
DROP FUNCTION IF EXISTS public.vinculos_da_tela_anterior();

ALTER TABLE grupos_aranda
  DROP COLUMN IF EXISTS classificacao,
  DROP COLUMN IF EXISTS modulo_id,
  DROP COLUMN IF EXISTS produto_id,
  DROP COLUMN IF EXISTS solucao_id;
