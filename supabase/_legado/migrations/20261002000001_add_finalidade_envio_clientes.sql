-- =====================================================
-- Finalidade de envio dos contatos de clientes
-- =====================================================
-- Indica para quais e-mails o contato é destinatário:
--   'book'          -> recebe apenas o Book mensal
--   'saldo_parcial' -> recebe apenas o Saldo Parcial do banco de horas
--   'ambos'         -> recebe os dois
-- Contatos existentes passam a 'book' (comportamento atual do disparo de Books).
-- O RLS existente da tabela (has_screen_permission('clientes', ...)) cobre a nova coluna.

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS finalidade_envio TEXT NOT NULL DEFAULT 'book';

ALTER TABLE public.clientes
  DROP CONSTRAINT IF EXISTS clientes_finalidade_envio_check;

ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_finalidade_envio_check
  CHECK (finalidade_envio IN ('book', 'saldo_parcial', 'ambos'));

COMMENT ON COLUMN public.clientes.finalidade_envio IS
  'Finalidade de envio do contato: book (Book mensal), saldo_parcial (Saldo Parcial do banco de horas) ou ambos';

-- Destinatários são sempre buscados por empresa + finalidade
CREATE INDEX IF NOT EXISTS idx_clientes_empresa_finalidade_envio
  ON public.clientes (empresa_id, finalidade_envio);

-- Verificação
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clientes' AND column_name = 'finalidade_envio'
  ) THEN
    RAISE EXCEPTION 'Coluna clientes.finalidade_envio não foi criada';
  END IF;
END $$;
