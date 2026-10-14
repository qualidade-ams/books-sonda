------------------------------------------------------
-- 1. Criar tabela para logs de envio de e-mail
------------------------------------------------------
CREATE TABLE public.email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  destinatario text NOT NULL,
  assunto text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  erro text,
  enviado_em timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

------------------------------------------------------
-- 2. Habilitar RLS na tabela
------------------------------------------------------
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

------------------------------------------------------
-- 3. Políticas para email_logs (apenas usuários autenticados podem acessar)
------------------------------------------------------
CREATE POLICY "Authenticated users can view email logs" 
  ON public.email_logs 
  FOR SELECT 
  USING ((SELECT auth.role() AS role) = 'authenticated');

CREATE POLICY "Authenticated users can insert email logs" 
  ON public.email_logs 
  FOR INSERT 
  WITH CHECK ((SELECT auth.role() AS role) = 'authenticated');

------------------------------------------------------
-- 4. Índices para melhor performance
------------------------------------------------------
CREATE INDEX idx_email_logs_status ON public.email_logs(status);
CREATE INDEX idx_email_logs_enviado_em ON public.email_logs(enviado_em);

------------------------------------------------------------------------
-- 5. Criar tabela para configuração do webhook do Power Automate
------------------------------------------------------------------------
CREATE TABLE public.webhook_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_url text NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

------------------------------------------------------
-- 6. Habilitar RLS na tabela
------------------------------------------------------
ALTER TABLE public.webhook_config ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- 7. Políticas para webhook_config (apenas usuários autenticados podem acessar)
--------------------------------------------------------------------------------
CREATE POLICY "Authenticated users can view webhook config" 
  ON public.webhook_config 
  FOR SELECT 
  USING ((SELECT auth.role() AS role) = 'authenticated');

CREATE POLICY "Authenticated users can insert webhook config" 
  ON public.webhook_config 
  FOR INSERT 
  WITH CHECK ((SELECT auth.role() AS role) = 'authenticated');

CREATE POLICY "Authenticated users can update webhook config" 
  ON public.webhook_config 
  FOR UPDATE 
  USING ((SELECT auth.role() AS role) = 'authenticated');

------------------------------------------
-- 8. Trigger para atualizar updated_at
------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_webhook_config_updated_at
  BEFORE UPDATE ON public.webhook_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

---------------------------------------------
-- 9. Criar tabela para templates de e-mail
---------------------------------------------
CREATE TABLE public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL DEFAULT 'template_orcamento',
  assunto text NOT NULL,
  corpo text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

---------------------------------------------
-- 10. Habilitar RLS nas tabelas
---------------------------------------------
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-------------------------------------------------------------------------------------
-- 11. Políticas para email_templates (apenas usuários autenticados podem acessar)
-------------------------------------------------------------------------------------
CREATE POLICY "Authenticated users can view email templates" 
  ON public.email_templates 
  FOR SELECT 
  USING ((SELECT auth.role() AS role) = 'authenticated');

CREATE POLICY "Authenticated users can insert email templates" 
  ON public.email_templates 
  FOR INSERT 
  WITH CHECK ((SELECT auth.role() AS role) = 'authenticated');

CREATE POLICY "Authenticated users can update email templates" 
  ON public.email_templates 
  FOR UPDATE 
  USING ((SELECT auth.role() AS role) = 'authenticated');

CREATE POLICY "Authenticated users can delete email templates" 
  ON public.email_templates 
  FOR DELETE 
  USING ((SELECT auth.role() AS role) = 'authenticated');

---------------------------------------------
-- 12. Inserir template padrão
---------------------------------------------
INSERT INTO public.email_templates (nome, assunto, corpo)
VALUES (
  'template_book',
  'E-mail book - {{razaoSocial}}',
  '</html>
	<!DOCTYPE html>
	<html lang="pt-BR">

	<head>
		<meta charset="UTF-8" />
		<title>Book AMS</title>
	</head>

	<body style="margin: 0; padding: 0; background-color: #f4f6fb; font-family: Arial, sans-serif;">
		<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f6fb">
			<tr>
				<td align="center" style="padding: 20px 20px;">
					<table width="640" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="border-radius: 10px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08); overflow: hidden;">
						<tr>
							<td align="center" bgcolor="#1a4eff" style="padding: 20px;">
								<!--[if gte mso 9]>
							<table width="150" border="0" cellspacing="0" cellpadding="0">
							   <tr>
								  <td>
							<![endif]-->

								<img src="http://books-sonda.vercel.app/images/logo-sonda.png" alt="Logo" width="150" style="display: block; width: 100%; max-width: 150px; height: auto; border: 0; line-height: 100%; outline: none; text-decoration: none;" />

								<!--[if gte mso 9]>
								  </td>
							   </tr>
							</table>
							<![endif]-->
							</td>
						</tr>
						<tr>
							<td style="padding: 24px; font-size: 14px; color: #111; line-height: 1.5;">
								<p>Prezados,</p>

								<p>Informamos que está disponível o <strong>Book Mensal AMS</strong>,
									<a href="#" style="color:#005baa; font-weight:bold; text-decoration:none;">CLIQUE AQUI</a>.
								</p>

								<p>Para visualizar o book, somente e-mails cadastrados vão conseguir ter acesso. Na tela de Login insira o seu e-mail corporativo e você receberá um código de autenticação. Copie o código e cole no campo indicado, para completar o Login.</p>

								<p>Caso não esteja cadastrado, envie um e-mail para <a href=mailto:qualidadeams@sonda.com style="color:#005baa; text-decoration:none;">qualidadeams@sonda.com</a>.</p>

								<p>Os dados sobre o fechamento do banco de horas serão enviados de forma separada dentro do mês corrente.</p>
							</td>
						</tr>
						<tr>
							<td align="center" style="padding: 16px; font-size: 12px; color: #777;">
								© 2025 SONDA. Todos os direitos reservados.
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
	</body>
	</html>'
);

---------------------------------------------------------------
-- 13. WEBHOOK_CONFIG - Permitir acesso público para leitura
---------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view webhook config" ON webhook_config;
DROP POLICY IF EXISTS "Authenticated users can insert webhook config" ON webhook_config;
DROP POLICY IF EXISTS "Authenticated users can update webhook config" ON webhook_config;

CREATE POLICY "Public can view webhook config" ON webhook_config
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage webhook config" ON webhook_config
  FOR ALL USING ((SELECT auth.role() AS role) = 'authenticated');

---------------------------------------------------------------
-- 14. EMAIL_LOGS - Permitir acesso público para inserção
---------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view email logs" ON email_logs;
DROP POLICY IF EXISTS "Authenticated users can insert email logs" ON email_logs;

CREATE POLICY "Public can insert email logs" ON email_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can view email logs" ON email_logs
  FOR SELECT USING ((SELECT auth.role() AS role) = 'authenticated');

---------------------------------------------------------------
-- 15. Verificar se outras tabelas de configuração precisam de acesso público
-- EMAIL_TEMPLATES - Permitir leitura pública para templates
---------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_templates') THEN
        DROP POLICY IF EXISTS "Authenticated users can manage email_templates" ON email_templates;
        DROP POLICY IF EXISTS "Public can view email_templates" ON email_templates;
        
        CREATE POLICY "Public can view email_templates" ON email_templates
          FOR SELECT USING (true);
          
        CREATE POLICY "Authenticated users can manage email_templates" ON email_templates
          FOR ALL USING ((SELECT auth.role() AS role) = 'authenticated');
          
        RAISE NOTICE 'Políticas aplicadas à tabela email_templates';
    END IF;
END $$;

---------------------------------------------------------------
-- 16. Comentários para documentação
---------------------------------------------------------------
COMMENT ON POLICY "Public can view webhook config" ON webhook_config IS 
'Permite acesso público para leitura da configuração de webhook';

COMMENT ON POLICY "Public can insert email logs" ON email_logs IS 
'Permite acesso público para inserção de logs de email';

SELECT 'Todas as políticas de acesso público foram aplicadas com sucesso!' as resultado;

---------------------------------------------------------------
-- 17. Criar função para atualizar updated_at se não existir
---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

---------------------------------------------------------------
-- 17. Adicionar campos necessários à tabela email_templates
---------------------------------------------------------------
ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS descricao text,
ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'book',
ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS vinculado_formulario boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS formulario text,
ADD COLUMN IF NOT EXISTS modalidade text;

-------------------------------------------------------------------------
-- 18. Atualizar templates existentes para serem vinculados ao formulário
-------------------------------------------------------------------------
UPDATE public.email_templates 
SET vinculado_formulario = true 
WHERE vinculado_formulario IS NULL OR vinculado_formulario = false;

-------------------------------------------------------------------------
-- 19. Criar índices para melhor performance
------------------------------------------------------------------------- 
CREATE INDEX IF NOT EXISTS idx_email_templates_ativo ON public.email_templates(ativo);
CREATE INDEX IF NOT EXISTS idx_email_templates_vinculado ON public.email_templates(vinculado_formulario);
CREATE INDEX IF NOT EXISTS idx_email_templates_tipo ON public.email_templates(tipo);
CREATE INDEX IF NOT EXISTS idx_email_templates_formulario ON public.email_templates(formulario);
CREATE INDEX IF NOT EXISTS idx_email_templates_modalidade ON public.email_templates(modalidade);

-------------------------------------------------------------------------
-- 20. Criar trigger para atualizar updated_at (apenas se não existir)
------------------------------------------------------------------------- 
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_email_templates_updated_at'
  ) THEN
    CREATE TRIGGER update_email_templates_updated_at
      BEFORE UPDATE ON public.email_templates
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-------------------------------------------------------------------------
-- 21. Criar função para atualizar updated_at se não existir
------------------------------------------------------------------------- 
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-------------------------------------------------------------------------
-- 22. Adicionar campos necessários à tabela email_templates
------------------------------------------------------------------------- 
ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS descricao text,
ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'book',
ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS vinculado_formulario boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS formulario text,
ADD COLUMN IF NOT EXISTS modalidade text;

-------------------------------------------------------------------------
-- 23. Atualizar templates existentes para serem vinculados ao formulário
------------------------------------------------------------------------- 
UPDATE public.email_templates 
SET vinculado_formulario = true 
WHERE vinculado_formulario IS NULL OR vinculado_formulario = false;

-------------------------------------------------------------------------
-- 24. Criar índices para melhor performance
------------------------------------------------------------------------- 
CREATE INDEX IF NOT EXISTS idx_email_templates_ativo ON public.email_templates(ativo);
CREATE INDEX IF NOT EXISTS idx_email_templates_vinculado ON public.email_templates(vinculado_formulario);
CREATE INDEX IF NOT EXISTS idx_email_templates_tipo ON public.email_templates(tipo);
CREATE INDEX IF NOT EXISTS idx_email_templates_formulario ON public.email_templates(formulario);
CREATE INDEX IF NOT EXISTS idx_email_templates_modalidade ON public.email_templates(modalidade);

-------------------------------------------------------------------------
-- 25. Trigger para atualizar updated_at (criar apenas se não existir)
------------------------------------------------------------------------- 
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_email_templates_updated_at'
  ) THEN
    CREATE TRIGGER update_email_templates_updated_at
      BEFORE UPDATE ON public.email_templates
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-------------------------------------------------------------------------
-- 26. Drop a política restritiva existente para modelos de leitura
------------------------------------------------------------------------- 
-- Drop existing policies and create comprehensive ones
DROP POLICY IF EXISTS "Authenticated users can view email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Public can view email_templates" ON public.email_templates;
DROP POLICY IF EXISTS "Authenticated users can manage email_templates" ON public.email_templates;

-------------------------------------------------------------------------------------------
-- 27. Políticas completas para email_templates
------------------------------------------------------------------------- ------------------
-- Permitir leitura pública de templates ativos
CREATE POLICY "Public can view active email templates" 
  ON public.email_templates 
  FOR SELECT 
  USING (ativo = true);

-- Permitir que usuários autenticados vejam todos os templates
CREATE POLICY "Authenticated users can view all email templates" 
  ON public.email_templates 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Permitir que usuários autenticados criem templates
CREATE POLICY "Authenticated users can create email templates" 
  ON public.email_templates 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Permitir que usuários autenticados atualizem templates
CREATE POLICY "Authenticated users can update email templates" 
  ON public.email_templates 
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Permitir que usuários autenticados deletem templates
CREATE POLICY "Authenticated users can delete email templates" 
  ON public.email_templates 
  FOR DELETE 
  USING (auth.uid() IS NOT NULL);
  
-------------------------------------------------------------------------
-- 28. Adicionar comentários para documentar as alterações
------------------------------------------------------------------------- 
COMMENT ON POLICY "Public can view active email templates" ON public.email_templates IS 
'Allows public access to read active email templates for use in public forms.';

COMMENT ON POLICY "Authenticated users can view all email templates" ON public.email_templates IS 
'Allows authenticated users to view all email templates for management purposes.';

COMMENT ON POLICY "Authenticated users can create email templates" ON public.email_templates IS 
'Allows authenticated users to create new email templates.';

COMMENT ON POLICY "Authenticated users can update email templates" ON public.email_templates IS 
'Allows authenticated users to update existing email templates.';

COMMENT ON POLICY "Authenticated users can delete email templates" ON public.email_templates IS 
'Allows authenticated users to delete email templates.';