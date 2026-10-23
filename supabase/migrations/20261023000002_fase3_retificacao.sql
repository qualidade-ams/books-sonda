-- =====================================================================
-- Fase 3 — migration 20: mudança em mês fechado pede retificação do Book
-- (docs/especificacoes/Modelagem_Fase3.md, seção 7; decisão de 23/10/2026)
--
-- Observação manual ou reajuste manual lançado, editado ou inativado num mês com
-- fechamento vigente marca books.precisa_retificacao da empresa e do mês. O aviso
-- "Book precisa de retificação" no sino e a resolução no reenvio do Book já
-- existem (migration 20261014000001) e passam a valer também para o Controle.
--
-- Não marcam: observações automáticas (nascem com o fechamento) e reajustes de
-- retroativo (seguem o fluxo próprio da tela Apontamentos Retroativos).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.marcar_book_para_retificacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_linha RECORD;
BEGIN
  -- Só mudança que altera o Book (não autoria nem campos internos). IF aninhado:
  -- o PL/pgSQL não garante parar no primeiro termo de um AND, e cada tabela tem
  -- campos que a outra não tem.
  IF TG_OP = 'UPDATE' THEN
    IF TG_TABLE_NAME = 'bancos_horas_observacoes' THEN
      IF (NEW.texto, NEW.mes, NEW.ano, NEW.ativo) IS NOT DISTINCT FROM (OLD.texto, OLD.mes, OLD.ano, OLD.ativo) THEN
        RETURN NULL;
      END IF;
    ELSIF (NEW.tipo, NEW.minutos, NEW.tickets, NEW.mes, NEW.ano, NEW.ativo)
          IS NOT DISTINCT FROM (OLD.tipo, OLD.minutos, OLD.tickets, OLD.mes, OLD.ano, OLD.ativo) THEN
      RETURN NULL;
    END IF;
  END IF;

  -- As duas tabelas têm origem; só a manual pede retificação
  IF NEW.origem <> 'manual' THEN
    RETURN NULL;
  END IF;

  -- O mês novo e, numa mudança de mês, também o antigo
  FOR v_linha IN
    SELECT DISTINCT m.mes, m.ano
      FROM (VALUES (NEW.mes, NEW.ano), (CASE WHEN TG_OP = 'UPDATE' THEN OLD.mes END,
                                          CASE WHEN TG_OP = 'UPDATE' THEN OLD.ano END)) AS m(mes, ano)
     WHERE m.mes IS NOT NULL
  LOOP
    IF EXISTS (SELECT 1 FROM bancos_horas_fechamentos f
                WHERE f.banco_id = NEW.banco_id AND f.mes = v_linha.mes AND f.ano = v_linha.ano AND f.vigente) THEN
      UPDATE books bk
         SET precisa_retificacao = true
        FROM bancos_horas b
       WHERE b.id = NEW.banco_id
         AND bk.empresa_id = b.empresa_id
         AND bk.mes = v_linha.mes
         AND bk.ano = v_linha.ano;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.marcar_book_para_retificacao() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_bancos_horas_observacoes_retificacao ON bancos_horas_observacoes;
CREATE TRIGGER trg_bancos_horas_observacoes_retificacao
  AFTER INSERT OR UPDATE ON bancos_horas_observacoes
  FOR EACH ROW EXECUTE FUNCTION marcar_book_para_retificacao();

DROP TRIGGER IF EXISTS trg_bancos_horas_reajustes_retificacao ON bancos_horas_reajustes;
CREATE TRIGGER trg_bancos_horas_reajustes_retificacao
  AFTER INSERT OR UPDATE ON bancos_horas_reajustes
  FOR EACH ROW EXECUTE FUNCTION marcar_book_para_retificacao();
