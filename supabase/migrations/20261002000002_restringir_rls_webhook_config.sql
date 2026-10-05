-- =====================================================
-- Restringe o acesso à URL assinada do webhook de e-mail
-- =====================================================
-- Antes: qualquer usuário autenticado podia ler webhook_config (a URL com "sig=" do
-- Power Automate), e não havia política de INSERT/UPDATE (a tela Configuração de Email
-- não conseguia salvar).
-- Depois: só quem tem permissão de edição na tela "email-config" lê/grava a configuração.
-- O envio de e-mails lê a URL no servidor com service role (api/email/send e sync-api).
--
-- ⚠️ ORDEM DE DEPLOY: aplicar SOMENTE DEPOIS que o front com o proxy /api/email/send
-- estiver publicado. O front antigo lê esta tabela no navegador de todos os usuários.

-- 1. Remover TODAS as políticas existentes da tabela (evita duplicatas)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'webhook_config' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.webhook_config', pol.policyname);
  END LOOP;
END $$;

-- 2. RLS habilitado
ALTER TABLE public.webhook_config ENABLE ROW LEVEL SECURITY;

-- 3. Políticas: apenas editores da tela Configuração de Email
CREATE POLICY "webhook_config_select_editores_email_config"
  ON public.webhook_config FOR SELECT TO authenticated
  USING (has_screen_permission('email-config'::text, 'edit'::text));

CREATE POLICY "webhook_config_insert_editores_email_config"
  ON public.webhook_config FOR INSERT TO authenticated
  WITH CHECK (has_screen_permission('email-config'::text, 'edit'::text));

CREATE POLICY "webhook_config_update_editores_email_config"
  ON public.webhook_config FOR UPDATE TO authenticated
  USING (has_screen_permission('email-config'::text, 'edit'::text))
  WITH CHECK (has_screen_permission('email-config'::text, 'edit'::text));

CREATE POLICY "webhook_config_delete_editores_email_config"
  ON public.webhook_config FOR DELETE TO authenticated
  USING (has_screen_permission('email-config'::text, 'edit'::text));

-- 4. Verificação: exatamente 4 políticas, nenhuma para anon
DO $$
DECLARE
  qtd INTEGER;
BEGIN
  SELECT count(*) INTO qtd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'webhook_config';
  IF qtd <> 4 THEN
    RAISE EXCEPTION 'webhook_config deveria ter 4 políticas, tem %', qtd;
  END IF;
END $$;
