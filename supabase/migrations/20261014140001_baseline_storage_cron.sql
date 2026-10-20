-- =====================================================================
-- BASELINE — complemento: Storage e pg_cron (14/10/2026)
--
-- O `supabase db dump` não exporta os schemas gerenciados pela plataforma.
-- Aqui ficam os itens desses schemas que foram configurados pelo projeto:
-- buckets e políticas do Storage e jobs do pg_cron.
-- Gerado por consulta ao catálogo do books-qualidade (qiahexepsdggkzgmklhq).
--
-- NÃO APLICAR no projeto atual: ele já está neste estado.
-- Os jobs do cron leem a URL do projeto e a chave do Vault pelo NOME
-- (project_url, publishable_key); esses segredos precisam existir no Vault
-- do ambiente de destino.
-- =====================================================================

-- Buckets do Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('anexos-permanentes', 'anexos-permanentes', f, 10485760, '{application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/png,image/gif,image/webp,text/plain,text/csv,application/zip,application/x-zip-compressed,application/x-zip,application/x-rar-compressed,application/vnd.ms-outlook,application/octet-stream}'::text[]) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('anexos-temporarios', 'anexos-temporarios', t, 52428800, '{application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet}'::text[]) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('email-images', 'email-images', t, 26214400, '{image/png,image/jpeg}'::text[]) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('organograma', 'organograma', t, NULL, NULL) ON CONFLICT (id) DO NOTHING;

-- Políticas do Storage (storage.objects / storage.buckets)
DROP POLICY IF EXISTS "Acesso público para PDFs de books temporários" ON storage.objects;
CREATE POLICY "Acesso público para PDFs de books temporários" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING (((bucket_id = 'anexos-temporarios'::text) AND ((storage.foldername(name))[1] = 'books-temp'::text)));
DROP POLICY IF EXISTS "Apenas admins podem deletar anexos temporários" ON storage.objects;
CREATE POLICY "Apenas admins podem deletar anexos temporários" ON storage.objects AS PERMISSIVE FOR DELETE TO public
  USING (((bucket_id = 'anexos-temporarios'::text) AND (EXISTS ( SELECT 1
   FROM (user_group_assignments uga
     JOIN user_groups ug ON ((uga.group_id = ug.id)))
  WHERE ((uga.user_id = auth.uid()) AND (ug.is_default_admin = true))))));
DROP POLICY IF EXISTS "Authenticated users can delete email images" ON storage.objects;
CREATE POLICY "Authenticated users can delete email images" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING ((bucket_id = 'email-images'::text));
DROP POLICY IF EXISTS "Authenticated users can delete photos" ON storage.objects;
CREATE POLICY "Authenticated users can delete photos" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING ((bucket_id = 'organograma'::text));
DROP POLICY IF EXISTS "Authenticated users can upload email images" ON storage.objects;
CREATE POLICY "Authenticated users can upload email images" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'email-images'::text));
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload photos" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'organograma'::text));
DROP POLICY IF EXISTS "Sistema e admins podem deletar anexos permanentes" ON storage.objects;
CREATE POLICY "Sistema e admins podem deletar anexos permanentes" ON storage.objects AS PERMISSIVE FOR DELETE TO public
  USING (((bucket_id = 'anexos-permanentes'::text) AND ((auth.role() = 'service_role'::text) OR (EXISTS ( SELECT 1
   FROM (user_group_assignments uga
     JOIN user_groups ug ON ((uga.group_id = ug.id)))
  WHERE ((uga.user_id = auth.uid()) AND (ug.is_default_admin = true)))))));
DROP POLICY IF EXISTS "Sistema pode mover anexos para permanente" ON storage.objects;
CREATE POLICY "Sistema pode mover anexos para permanente" ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((bucket_id = 'anexos-permanentes'::text) AND ((auth.role() = 'service_role'::text) OR (EXISTS ( SELECT 1
   FROM (user_group_assignments uga
     JOIN user_groups ug ON ((uga.group_id = ug.id)))
  WHERE ((uga.user_id = auth.uid()) AND (ug.is_default_admin = true)))))));
DROP POLICY IF EXISTS "Usuários podem atualizar anexos temporários" ON storage.objects;
CREATE POLICY "Usuários podem atualizar anexos temporários" ON storage.objects AS PERMISSIVE FOR UPDATE TO public
  USING (((bucket_id = 'anexos-temporarios'::text) AND (EXISTS ( SELECT 1
   FROM (user_group_assignments uga
     JOIN screen_permissions sp ON ((uga.group_id = sp.group_id)))
  WHERE ((uga.user_id = auth.uid()) AND ((sp.screen_key)::text = 'controle_disparos_personalizados'::text) AND ((sp.permission_level)::text = 'edit'::text))))));
DROP POLICY IF EXISTS "Usuários podem baixar anexos permanentes" ON storage.objects;
CREATE POLICY "Usuários podem baixar anexos permanentes" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING (((bucket_id = 'anexos-permanentes'::text) AND (EXISTS ( SELECT 1
   FROM (user_group_assignments uga
     JOIN screen_permissions sp ON ((uga.group_id = sp.group_id)))
  WHERE ((uga.user_id = auth.uid()) AND ((sp.screen_key)::text = ANY ((ARRAY['controle_disparos_personalizados'::character varying, 'historico_books'::character varying])::text[])) AND ((sp.permission_level)::text = ANY ((ARRAY['view'::character varying, 'edit'::character varying])::text[])))))));
DROP POLICY IF EXISTS "Usuários podem baixar anexos temporários" ON storage.objects;
CREATE POLICY "Usuários podem baixar anexos temporários" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING (((bucket_id = 'anexos-temporarios'::text) AND (EXISTS ( SELECT 1
   FROM (user_group_assignments uga
     JOIN screen_permissions sp ON ((uga.group_id = sp.group_id)))
  WHERE ((uga.user_id = auth.uid()) AND ((sp.screen_key)::text = 'controle_disparos_personalizados'::text) AND ((sp.permission_level)::text = ANY ((ARRAY['view'::character varying, 'edit'::character varying])::text[])))))));
DROP POLICY IF EXISTS "Usuários podem fazer upload de anexos temporários" ON storage.objects;
CREATE POLICY "Usuários podem fazer upload de anexos temporários" ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((bucket_id = 'anexos-temporarios'::text) AND (EXISTS ( SELECT 1
   FROM (user_group_assignments uga
     JOIN screen_permissions sp ON ((uga.group_id = sp.group_id)))
  WHERE ((uga.user_id = auth.uid()) AND ((sp.screen_key)::text = 'controle_disparos_personalizados'::text) AND ((sp.permission_level)::text = 'edit'::text))))));
DROP POLICY IF EXISTS authenticated_delete_empresa_anexos_storage ON storage.objects;
CREATE POLICY authenticated_delete_empresa_anexos_storage ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'anexos-permanentes'::text) AND ((storage.foldername(name))[1] = 'empresas'::text)));
DROP POLICY IF EXISTS authenticated_delete_requerimento_anexos_storage ON storage.objects;
CREATE POLICY authenticated_delete_requerimento_anexos_storage ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'anexos-permanentes'::text) AND ((storage.foldername(name))[1] = 'requerimentos'::text)));
DROP POLICY IF EXISTS authenticated_read_empresa_anexos ON storage.objects;
CREATE POLICY authenticated_read_empresa_anexos ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING (((bucket_id = 'anexos-permanentes'::text) AND ((storage.foldername(name))[1] = 'empresas'::text)));
DROP POLICY IF EXISTS authenticated_read_requerimento_anexos ON storage.objects;
CREATE POLICY authenticated_read_requerimento_anexos ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING (((bucket_id = 'anexos-permanentes'::text) AND ((storage.foldername(name))[1] = 'requerimentos'::text)));
DROP POLICY IF EXISTS authenticated_upload_anexos_emails ON storage.objects;
CREATE POLICY authenticated_upload_anexos_emails ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'anexos-temporarios'::text) AND ((storage.foldername(name))[1] = 'emails'::text)));
DROP POLICY IF EXISTS authenticated_upload_empresa_anexos ON storage.objects;
CREATE POLICY authenticated_upload_empresa_anexos ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'anexos-permanentes'::text) AND ((storage.foldername(name))[1] = 'empresas'::text)));
DROP POLICY IF EXISTS authenticated_upload_requerimento_anexos ON storage.objects;
CREATE POLICY authenticated_upload_requerimento_anexos ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'anexos-permanentes'::text) AND ((storage.foldername(name))[1] = 'requerimentos'::text)));

-- Jobs do pg_cron (os segredos são lidos do Vault pelo nome; nenhum valor fica aqui)
SELECT cron.unschedule('cleanup-storage-temp') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-storage-temp');
SELECT cron.schedule('cleanup-storage-temp', '0 */6 * * *', '
  SELECT
    net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''project_url'') || ''/functions/v1/cleanup-storage'',
      headers := jsonb_build_object(
        ''Content-Type'', ''application/json'',
        ''Authorization'', ''Bearer '' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''publishable_key'')
      ),
      body := ''{"source": "pg_cron"}''::jsonb
    ) AS request_id;
  ');
SELECT cron.unschedule('detectar-extemporaneos-6h') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'detectar-extemporaneos-6h');
SELECT cron.schedule('detectar-extemporaneos-6h', '0 */6 * * *', '
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''project_url'') || ''/functions/v1/detectar-extemporaneos?meses_atras=6'',
    headers := jsonb_build_object(
      ''Content-Type'', ''application/json'',
      ''Authorization'', ''Bearer '' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''publishable_key'')
    ),
    body := ''{"source": "pg_cron"}''::jsonb
  ) AS request_id;
  ');
