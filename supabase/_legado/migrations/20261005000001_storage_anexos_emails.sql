-- =====================================================================
-- Anexos de e-mails grandes no Storage (anexos-temporarios/emails)
--
-- O envio de e-mail passa pelo proxy /api/email/send (Vercel), que recusa
-- requisições acima de 4,5 MB. Acima de ~4 MB o emailService sobe os anexos
-- para anexos-temporarios/emails e o Power Automate baixa pelo link
-- (mesmo mecanismo dos anexos dos Books). Limite: 25 MB por e-mail.
--
-- Qualquer tela que envia e-mail (Elogios, Ajustes Retroativos,
-- Inconsistências...) precisa gravar nessa pasta, por isso a política vale
-- para todo usuário autenticado, restrita à pasta "emails".
-- As políticas existentes do bucket NÃO são alteradas.
-- =====================================================================

DROP POLICY IF EXISTS "authenticated_upload_anexos_emails" ON storage.objects;

CREATE POLICY "authenticated_upload_anexos_emails"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'anexos-temporarios'
    AND (storage.foldername(name))[1] = 'emails'
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'authenticated_upload_anexos_emails'
  ) THEN
    RAISE EXCEPTION 'Política authenticated_upload_anexos_emails não foi criada';
  END IF;
END $$;
