-- O Envio de Saldo Parcial virou aba da tela "Rotinas Automáticas" (Administração).
-- No cadastro de permissões, a permissão dele passa a ficar ao lado da tela, na mesma
-- categoria e com nome que indica a aba.
--
-- Só dados de exibição: a chave 'envio_saldo_parcial' NÃO muda (RLS de
-- banco_horas_envio_* e sync-api dependem dela) e as permissões dos grupos continuam.

UPDATE screens
SET
  name = 'Rotinas Automáticas – Saldo Parcial',
  category = 'Administração'
WHERE key = 'envio_saldo_parcial';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM screens
    WHERE key = 'envio_saldo_parcial'
      AND name = 'Rotinas Automáticas – Saldo Parcial'
      AND category = 'Administração'
  ) THEN
    RAISE EXCEPTION 'Falha ao mover a permissão "envio_saldo_parcial" para Administração';
  END IF;
END $$;
