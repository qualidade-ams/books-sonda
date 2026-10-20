-- Book: snapshot da aba "Requerimentos Faturados"
--
-- Requerimentos de Banco de Horas faturados (enviado_faturamento/faturado/concluido)
-- com mes_cobranca igual ao mês do book. Mesmo formato de
-- dados_requerimentos_em_desenvolvimento.
--
-- NULL = book gerado antes da aba existir: a tela busca os faturados em tempo real.
-- Só adiciona coluna: RLS da tabela books não muda.

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS dados_requerimentos_faturados JSONB;

COMMENT ON COLUMN public.books.dados_requerimentos_faturados IS
  'Snapshot de requerimentos faturados no mês (Banco de Horas) para a aba Requerimentos Faturados do book';
