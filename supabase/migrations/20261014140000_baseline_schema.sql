-- =====================================================================
-- BASELINE DO SCHEMA — estrutura real do banco em 14/10/2026
--
-- Gerado com `supabase db dump --linked` (pg_dump 17.6, só schema) a partir do
-- projeto books-qualidade (qiahexepsdggkzgmklhq). Inclui tudo o que estava
-- aplicado até esta data, inclusive o que nunca teve migration no repositório
-- e a migration 20261014000001_create_notificacoes (aplicada pelo SQL Editor).
--
-- NÃO APLICAR no projeto atual: ele já está neste estado. Este arquivo serve
-- para versionar a estrutura real e recriar um ambiente do zero.
--
-- Ficam fora deste dump (padrão do Supabase CLI): schemas gerenciados pela
-- plataforma (auth, storage, realtime, extensions, vault, cron...). Os buckets,
-- as políticas do Storage e os jobs do pg_cron estão no arquivo seguinte,
-- 20261014140001_baseline_storage_cron.sql.
--
-- Ajuste manual: as opções vault_* do servidor FDW anexos_temporarios_fdw_server
-- tinham os IDs dos segredos do Vault deste projeto; foram trocadas por
-- marcadores <...>, que precisam ser preenchidos em outro ambiente.
--
-- As migrations anteriores foram arquivadas em supabase/_legado/ (ver README).
-- =====================================================================




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "backups";


ALTER SCHEMA "backups" OWNER TO "postgres";


COMMENT ON SCHEMA "backups" IS 'Schema para armazenar backups temporários de migrations';



CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'View vw_requerimentos_completo removida em 2026-02-10 por não estar em uso';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "wrappers" WITH SCHEMA "extensions";






CREATE TYPE "public"."origem_especialista_enum" AS ENUM (
    'sql_server',
    'manual'
);


ALTER TYPE "public"."origem_especialista_enum" OWNER TO "postgres";


CREATE TYPE "public"."origem_pesquisa_enum" AS ENUM (
    'sql_server',
    'manual'
);


ALTER TYPE "public"."origem_pesquisa_enum" OWNER TO "postgres";


CREATE TYPE "public"."status_especialista_enum" AS ENUM (
    'ativo',
    'inativo',
    'manual'
);


ALTER TYPE "public"."status_especialista_enum" OWNER TO "postgres";


CREATE TYPE "public"."status_pesquisa_enum" AS ENUM (
    'pendente',
    'enviado',
    'enviado_plano_acao',
    'enviado_elogios'
);


ALTER TYPE "public"."status_pesquisa_enum" OWNER TO "postgres";


CREATE TYPE "public"."tipo_book_enum" AS ENUM (
    'nao_tem_book',
    'qualidade',
    'outros'
);


ALTER TYPE "public"."tipo_book_enum" OWNER TO "postgres";


CREATE TYPE "public"."tipo_cobranca_enum" AS ENUM (
    'banco_horas',
    'ticket',
    'outros'
);


ALTER TYPE "public"."tipo_cobranca_enum" OWNER TO "postgres";


COMMENT ON TYPE "public"."tipo_cobranca_enum" IS 'Tipos de cobrança disponíveis para empresas clientes: banco_horas, ticket, outros';



CREATE OR REPLACE FUNCTION "public"."admin_create_user"("p_email" "text", "p_password" "text", "p_full_name" "text", "p_group_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  -- Verificar se usuário atual tem permissão de admin
  IF NOT EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN screen_permissions sp ON sp.group_id = uga.group_id
    WHERE uga.user_id = auth.uid()
      AND sp.screen_key = 'cadastro-usuarios'
      AND sp.permission_level IN ('admin', 'edit')
  ) AND NOT EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN user_groups ug ON ug.id = uga.group_id
    WHERE uga.user_id = auth.uid()
      AND ug.name IN ('Administradores', 'Admin', 'Administrador')
  ) THEN
    RAISE EXCEPTION 'Usuário não tem permissão para criar usuários';
  END IF;

  -- Por enquanto, retornar erro amigável
  -- A criação real do usuário deve ser feita via Edge Function
  RAISE EXCEPTION 'Criação de usuários deve ser feita via Edge Function. Configure uma Edge Function para esta operação.';
  
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."admin_create_user"("p_email" "text", "p_password" "text", "p_full_name" "text", "p_group_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_create_user"("p_email" "text", "p_password" "text", "p_full_name" "text", "p_group_id" "uuid") IS 'Função para criar usuário (requer Edge Function)';



CREATE OR REPLACE FUNCTION "public"."admin_delete_user"("p_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Verificar se usuário atual tem permissão de admin
  IF NOT EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN screen_permissions sp ON sp.group_id = uga.group_id
    WHERE uga.user_id = auth.uid()
      AND sp.screen_key = 'cadastro-usuarios'
      AND sp.permission_level IN ('admin', 'edit')
  ) AND NOT EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN user_groups ug ON ug.id = uga.group_id
    WHERE uga.user_id = auth.uid()
      AND ug.name IN ('Administradores', 'Admin', 'Administrador')
  ) THEN
    RAISE EXCEPTION 'Usuário não tem permissão para deletar usuários';
  END IF;

  -- Não permitir deletar o próprio usuário
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Não é possível deletar o próprio usuário';
  END IF;

  -- Deletar atribuições de grupo
  DELETE FROM user_group_assignments
  WHERE user_id = p_user_id;

  -- Deletar perfil
  DELETE FROM profiles
  WHERE id = p_user_id;

  -- Retornar resultado
  SELECT json_build_object(
    'success', true,
    'user_id', p_user_id,
    'message', 'Usuário deletado com sucesso (perfil e grupos). Para deletar completamente, use Edge Function.'
  ) INTO v_result;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."admin_delete_user"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_delete_user"("p_user_id" "uuid") IS 'Deleta um usuário (perfil e grupos)';



CREATE OR REPLACE FUNCTION "public"."admin_reset_user_password"("p_user_id" "uuid", "p_new_password" "text") RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Verificar se usuário atual tem permissão de admin
  IF NOT EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN screen_permissions sp ON sp.group_id = uga.group_id
    WHERE uga.user_id = auth.uid()
      AND sp.screen_key = 'cadastro-usuarios'
      AND sp.permission_level IN ('admin', 'edit')
  ) AND NOT EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN user_groups ug ON ug.id = uga.group_id
    WHERE uga.user_id = auth.uid()
      AND ug.name IN ('Administradores', 'Admin', 'Administrador')
  ) THEN
    RAISE EXCEPTION 'Usuário não tem permissão para resetar senhas';
  END IF;

  -- NOTA: Reset de senha deve ser feito via Edge Function
  RAISE EXCEPTION 'Reset de senha deve ser feito via Edge Function. Configure uma Edge Function para esta operação.';
  
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."admin_reset_user_password"("p_user_id" "uuid", "p_new_password" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_reset_user_password"("p_user_id" "uuid", "p_new_password" "text") IS 'Reseta senha de usuário (requer Edge Function)';



CREATE OR REPLACE FUNCTION "public"."admin_update_user"("p_user_id" "uuid", "p_email" "text" DEFAULT NULL::"text", "p_full_name" "text" DEFAULT NULL::"text", "p_group_id" "uuid" DEFAULT NULL::"uuid", "p_active" boolean DEFAULT NULL::boolean) RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Verificar se usuário atual tem permissão de admin
  IF NOT EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN screen_permissions sp ON sp.group_id = uga.group_id
    WHERE uga.user_id = (SELECT auth.uid())
      AND sp.screen_key = 'cadastro-usuarios'
      AND sp.permission_level IN ('admin', 'edit')
  ) AND NOT EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN user_groups ug ON ug.id = uga.group_id
    WHERE uga.user_id = (SELECT auth.uid())
      AND ug.name IN ('Administradores', 'Admin', 'Administrador')
  ) THEN
    RAISE EXCEPTION 'Usuário não tem permissão para atualizar usuários';
  END IF;

  -- Atualizar perfil
  UPDATE profiles
  SET
    email = COALESCE(p_email, email),
    full_name = COALESCE(p_full_name, full_name),
    active = COALESCE(p_active, active),
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Atualizar grupo se fornecido
  IF p_group_id IS NOT NULL THEN
    -- Remover grupos antigos
    DELETE FROM user_group_assignments
    WHERE user_id = p_user_id;

    -- Adicionar novo grupo
    INSERT INTO user_group_assignments (user_id, group_id)
    VALUES (p_user_id, p_group_id);
  END IF;

  -- Retornar resultado
  SELECT json_build_object(
    'success', true,
    'user_id', p_user_id,
    'message', 'Usuário atualizado com sucesso'
  ) INTO v_result;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."admin_update_user"("p_user_id" "uuid", "p_email" "text", "p_full_name" "text", "p_group_id" "uuid", "p_active" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_update_user"("p_user_id" "uuid", "p_email" "text", "p_full_name" "text", "p_group_id" "uuid", "p_active" boolean) IS 'Atualiza dados de um usuário (email, nome, grupo, status ativo). Requer permissão admin ou edit na tela cadastro-usuarios.';



CREATE OR REPLACE FUNCTION "public"."assign_user_to_group"("user_uuid" "uuid", "group_uuid" "uuid", "assigned_by_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM user_groups WHERE id = group_uuid) THEN
        RAISE EXCEPTION 'Grupo não encontrado';
    END IF;
    
    INSERT INTO user_group_assignments (user_id, group_id, assigned_by, assigned_at)
    VALUES (user_uuid, group_uuid, assigned_by_uuid, NOW())
    ON CONFLICT (user_id, group_id) DO NOTHING;
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."assign_user_to_group"("user_uuid" "uuid", "group_uuid" "uuid", "assigned_by_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."atualizar_data_resposta_elogio"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
  -- Buscar data_resposta da pesquisa relacionada (resolução determinística de schema)
  SELECT data_resposta INTO NEW.data_resposta
  FROM pesquisas_satisfacao
  WHERE id = NEW.pesquisa_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."atualizar_data_resposta_elogio"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."atualizar_data_resposta_plano_acao"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF NEW.status = 'respondido' AND OLD.status != 'respondido' THEN
        NEW.data_resposta = NOW();
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."atualizar_data_resposta_plano_acao"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."atualizar_data_resposta_plano_acao"() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Atualiza data de resposta de planos.';



CREATE OR REPLACE FUNCTION "public"."atualizar_elogios_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."atualizar_elogios_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."atualizar_timestamp_plano_acao"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."atualizar_timestamp_plano_acao"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."atualizar_timestamp_plano_acao"() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Atualiza timestamp de planos.';



CREATE OR REPLACE FUNCTION "public"."audit_taxas_trigger_function"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Auditoria específica para taxas
    INSERT INTO audit_logs (table_name, operation, old_data, new_data, user_id, timestamp)
    VALUES (TG_TABLE_NAME, TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid(), NOW());
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;


ALTER FUNCTION "public"."audit_taxas_trigger_function"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_trigger_function"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Lógica de auditoria (implementar conforme necessário)
    INSERT INTO audit_logs (table_name, operation, old_data, new_data, user_id, timestamp)
    VALUES (TG_TABLE_NAME, TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid(), NOW());
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;


ALTER FUNCTION "public"."audit_trigger_function"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."banco_horas_envio_agendamentos_before_write"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at := NOW();

  IF TG_OP = 'INSERT' THEN
    NEW.proxima_execucao := NULL;
  ELSIF NEW.ativo IS DISTINCT FROM OLD.ativo
     OR NEW.frequencia IS DISTINCT FROM OLD.frequencia
     OR NEW.dias_semana IS DISTINCT FROM OLD.dias_semana
     OR NEW.dias_mes IS DISTINCT FROM OLD.dias_mes
     OR NEW.ultimo_dia_mes IS DISTINCT FROM OLD.ultimo_dia_mes
     OR NEW.modo_horario IS DISTINCT FROM OLD.modo_horario
     OR NEW.horarios IS DISTINCT FROM OLD.horarios
     OR NEW.intervalo_horas IS DISTINCT FROM OLD.intervalo_horas
     OR NEW.hora_inicio IS DISTINCT FROM OLD.hora_inicio
     OR NEW.hora_fim IS DISTINCT FROM OLD.hora_fim THEN
    NEW.proxima_execucao := NULL;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."banco_horas_envio_agendamentos_before_write"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bloquear_atualizacao_book_enviado"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Se o book está com status 'enviado' e tentam mudar dados do snapshot
  IF OLD.status = 'enviado' THEN
    -- Permitir mudança de status (para retificação via função RPC)
    IF NEW.status != OLD.status THEN
      RETURN NEW;
    END IF;
    
    -- Bloquear alteração de dados do snapshot
    IF NEW.dados_capa IS DISTINCT FROM OLD.dados_capa
       OR NEW.dados_volumetria IS DISTINCT FROM OLD.dados_volumetria
       OR NEW.dados_sla IS DISTINCT FROM OLD.dados_sla
       OR NEW.dados_backlog IS DISTINCT FROM OLD.dados_backlog
       OR NEW.dados_consumo IS DISTINCT FROM OLD.dados_consumo
       OR NEW.dados_pesquisa IS DISTINCT FROM OLD.dados_pesquisa THEN
      RAISE EXCEPTION 'Book já enviado ao cliente (versão %). Use o fluxo de retificação para alterações.', OLD.versao_atual;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."bloquear_atualizacao_book_enviado"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bloquear_modificacao_versao_book"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Versões são imutáveis - bloquear qualquer UPDATE nos dados do snapshot
  IF NEW.dados_capa IS DISTINCT FROM OLD.dados_capa
     OR NEW.dados_volumetria IS DISTINCT FROM OLD.dados_volumetria
     OR NEW.dados_sla IS DISTINCT FROM OLD.dados_sla
     OR NEW.dados_backlog IS DISTINCT FROM OLD.dados_backlog
     OR NEW.dados_consumo IS DISTINCT FROM OLD.dados_consumo
     OR NEW.dados_pesquisa IS DISTINCT FROM OLD.dados_pesquisa THEN
    RAISE EXCEPTION 'Versões de books são imutáveis. Não é possível alterar dados de uma versão já criada.';
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."bloquear_modificacao_versao_book"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."buscar_books_por_periodo"("p_mes" integer, "p_ano" integer) RETURNS TABLE("id" "uuid", "empresa_id" "uuid", "empresa_nome" "text", "mes" integer, "ano" integer, "status" "text", "pdf_url" "text", "data_geracao" timestamp with time zone, "tem_dados" boolean)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.empresa_id,
    e.nome_completo as empresa_nome,
    b.mes,
    b.ano,
    b.status,
    b.pdf_url,
    b.created_at as data_geracao,
    CASE 
      WHEN b.dados_capa IS NOT NULL THEN true
      ELSE false
    END as tem_dados
  FROM public.books b
  INNER JOIN public.empresas_clientes e ON b.empresa_id = e.id
  WHERE b.mes = p_mes AND b.ano = p_ano
  ORDER BY e.nome_abreviado;
END;
$$;


ALTER FUNCTION "public"."buscar_books_por_periodo"("p_mes" integer, "p_ano" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."buscar_books_por_periodo"("p_mes" integer, "p_ano" integer) IS 'Busca books de um período específico com informações da empresa';



CREATE OR REPLACE FUNCTION "public"."buscar_historico_com_anexos"("item_id" "uuid") RETURNS TABLE("id" "uuid", "acao" "text", "detalhes" "text", "usuario_id" "uuid", "created_at" timestamp with time zone, "anexos" "jsonb")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Validar parâmetro
    IF item_id IS NULL THEN
        RAISE EXCEPTION 'ID do item não pode ser nulo';
    END IF;
    
    -- Buscar histórico com anexos
    RETURN QUERY
    SELECT 
        h.id,
        h.acao,
        h.detalhes,
        h.usuario_id,
        h.created_at,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', a.id,
                    'nome', a.nome_arquivo,
                    'tamanho', a.tamanho
                )
            ) FILTER (WHERE a.id IS NOT NULL),
            '[]'::jsonb
        ) as anexos
    FROM historico h
    LEFT JOIN anexos a ON h.id = a.historico_id
    WHERE h.item_id = buscar_historico_com_anexos.item_id
    GROUP BY h.id, h.acao, h.detalhes, h.usuario_id, h.created_at
    ORDER BY h.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."buscar_historico_com_anexos"("item_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."buscar_historico_com_anexos"("item_id" "uuid") IS 'FORÇA BRUTA: Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Busca histórico com anexos.';



CREATE OR REPLACE FUNCTION "public"."buscar_historico_com_anexos"("p_empresa_id" "uuid" DEFAULT NULL::"uuid", "p_mes_referencia" "date" DEFAULT NULL::"date", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "empresa_id" "uuid", "empresa_nome" "text", "mes_referencia" "date", "data_disparo" timestamp with time zone, "status" "text", "detalhes_erro" "text", "anexo_id" "uuid", "anexo_processado" boolean, "anexo_nome_original" "text", "anexo_tamanho_bytes" integer, "anexo_status" "text", "total_clientes" integer, "clientes_processados" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Fixar search_path localmente para evitar resolução ambígua de objetos
  PERFORM pg_catalog.set_config('search_path', 'public,pg_catalog', true);

  RETURN QUERY
  SELECT
    h.id,
    h.empresa_id,
    ec.nome AS empresa_nome,
    h.mes_referencia,
    h.data_disparo,
    h.status,
    h.detalhes_erro,
    h.anexo_id,
    h.anexo_processado,
    at.nome_original AS anexo_nome_original,
    at.tamanho_bytes AS anexo_tamanho_bytes,
    at.status AS anexo_status,
    h.total_clientes,
    h.clientes_processados
  FROM public.historico_disparos h
  LEFT JOIN public.empresas_clientes ec ON h.empresa_id = ec.id
  LEFT JOIN public.anexos_temporarios at ON h.anexo_id = at.id
  WHERE
    (p_empresa_id IS NULL OR h.empresa_id = p_empresa_id)
    AND (p_mes_referencia IS NULL OR h.mes_referencia = p_mes_referencia)
  ORDER BY h.data_disparo DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."buscar_historico_com_anexos"("p_empresa_id" "uuid", "p_mes_referencia" "date", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calcular_valores_requerimento"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Verificar se o tipo de cobrança requer cálculo de valores
  IF NEW.tipo_cobranca IN ('Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel') THEN
    -- Calcular valor total funcional
    IF NEW.valor_hora_funcional IS NOT NULL AND NEW.horas_funcional IS NOT NULL THEN
      NEW.valor_total_funcional := NEW.horas_funcional * NEW.valor_hora_funcional;
    ELSE
      NEW.valor_total_funcional := NULL;
    END IF;
    
    -- Calcular valor total técnico
    IF NEW.valor_hora_tecnico IS NOT NULL AND NEW.horas_tecnico IS NOT NULL THEN
      NEW.valor_total_tecnico := NEW.horas_tecnico * NEW.valor_hora_tecnico;
    ELSE
      NEW.valor_total_tecnico := NULL;
    END IF;
    
    -- Calcular valor total gestor
    IF NEW.valor_hora_gestor IS NOT NULL AND NEW.horas_gestor IS NOT NULL AND NEW.horas_gestor > 0 THEN
      NEW.valor_total_gestor := NEW.horas_gestor * NEW.valor_hora_gestor;
    ELSE
      NEW.valor_total_gestor := NULL;
    END IF;
    
    -- Calcular valor total geral (funcional + técnico + gestor)
    NEW.valor_total_geral := COALESCE(NEW.valor_total_funcional, 0) + COALESCE(NEW.valor_total_tecnico, 0) + COALESCE(NEW.valor_total_gestor, 0);
    
    -- Se valor total geral for 0, definir como NULL
    IF NEW.valor_total_geral = 0 THEN
      NEW.valor_total_geral := NULL;
    END IF;
  ELSE
    -- Para outros tipos de cobrança, limpar os valores
    NEW.valor_hora_funcional := NULL;
    NEW.valor_hora_tecnico := NULL;
    NEW.valor_hora_gestor := NULL;
    NEW.valor_total_funcional := NULL;
    NEW.valor_total_tecnico := NULL;
    NEW.valor_total_gestor := NULL;
    NEW.valor_total_geral := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calcular_valores_requerimento"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calcular_valores_requerimento"() IS 'Calcula automaticamente valor_total_funcional, valor_total_tecnico e valor_total_geral baseado nas horas e valores/hora. Usa SECURITY DEFINER e search_path fixo.';



CREATE OR REPLACE FUNCTION "public"."can_delete_group"("group_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE 
    is_admin BOOLEAN; 
    user_count INTEGER;
BEGIN
    SELECT is_default_admin INTO is_admin FROM user_groups WHERE id = group_uuid;
    IF is_admin = true THEN 
        RETURN FALSE; 
    END IF;
    
    SELECT COUNT(*) INTO user_count FROM user_group_assignments WHERE group_id = group_uuid;
    RETURN user_count = 0;
END;
$$;


ALTER FUNCTION "public"."can_delete_group"("group_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_delete_group"("group_uuid" "uuid") IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Verifica se grupo pode ser excluído (não é admin e não tem usuários).';



CREATE OR REPLACE FUNCTION "public"."can_edit_pesquisas"() RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN has_screen_permission('pesquisas', 'edit');
END;
$$;


ALTER FUNCTION "public"."can_edit_pesquisas"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_especialistas_view_access"() RETURNS TABLE("view_name" "text", "accessible" boolean, "reason" "text")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Verificar acesso para usuário atual
    RETURN QUERY
    SELECT 
        'v_especialistas_ativos'::TEXT,
        (
            -- Service role sempre tem acesso
            current_setting('role') = 'service_role' OR
            -- Usuários autenticados com permissão
            EXISTS (
                SELECT 1 FROM user_group_assignments uga
                JOIN screen_permissions sp ON uga.group_id = sp.group_id
                JOIN screens s ON sp.screen_key = s.key
                WHERE uga.user_id = auth.uid()
                  AND s.key = 'especialistas'
                  AND sp.permission_level IN ('view', 'edit')
            )
        ),
        CASE 
            WHEN current_setting('role') = 'service_role' THEN 'Service role access'
            WHEN auth.uid() IS NULL THEN 'User not authenticated'
            WHEN EXISTS (
                SELECT 1 FROM user_group_assignments uga
                JOIN screen_permissions sp ON uga.group_id = sp.group_id
                JOIN screens s ON sp.screen_key = s.key
                WHERE uga.user_id = auth.uid()
                  AND s.key = 'especialistas'
                  AND sp.permission_level IN ('view', 'edit')
            ) THEN 'User has valid permissions'
            ELSE 'User lacks required permissions'
        END::TEXT
    
    UNION ALL
    
    SELECT 
        'v_especialistas_sql_server'::TEXT,
        (
            -- Service role sempre tem acesso
            current_setting('role') = 'service_role' OR
            -- Usuários autenticados com permissão
            EXISTS (
                SELECT 1 FROM user_group_assignments uga
                JOIN screen_permissions sp ON uga.group_id = sp.group_id
                JOIN screens s ON sp.screen_key = s.key
                WHERE uga.user_id = auth.uid()
                  AND s.key = 'especialistas'
                  AND sp.permission_level IN ('view', 'edit')
            )
        ),
        CASE 
            WHEN current_setting('role') = 'service_role' THEN 'Service role access'
            WHEN auth.uid() IS NULL THEN 'User not authenticated'
            WHEN EXISTS (
                SELECT 1 FROM user_group_assignments uga
                JOIN screen_permissions sp ON uga.group_id = sp.group_id
                JOIN screens s ON sp.screen_key = s.key
                WHERE uga.user_id = auth.uid()
                  AND s.key = 'especialistas'
                  AND sp.permission_level IN ('view', 'edit')
            ) THEN 'User has valid permissions'
            ELSE 'User lacks required permissions'
        END::TEXT;
END;
$$;


ALTER FUNCTION "public"."check_especialistas_view_access"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_especialistas_view_access"() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Verifica acesso do usuário às views de especialistas.';



CREATE OR REPLACE FUNCTION "public"."cleanup_old_jobs"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM job_queue 
    WHERE status = 'completed' 
      AND completed_at < (NOW() - INTERVAL '7 days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_jobs"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_jobs"() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Remove jobs antigos.';



CREATE OR REPLACE FUNCTION "public"."cleanup_realtime_old_data"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'realtime'
    AS $$
DECLARE
    deleted_count integer := 0;
    table_exists boolean;
BEGIN
    -- Verificar se a tabela realtime.messages existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'realtime' AND table_name = 'messages'
    ) INTO table_exists;

    IF table_exists THEN
        -- Deletar mensagens mais antigas que 7 dias
        DELETE FROM realtime.messages 
        WHERE inserted_at < NOW() - INTERVAL '7 days';
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        
        RAISE NOTICE '✅ Limpeza realtime concluída: % registros removidos', deleted_count;
    ELSE
        RAISE NOTICE 'ℹ️ Tabela realtime.messages não encontrada - limpeza não necessária';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Erro na limpeza do realtime: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."cleanup_realtime_old_data"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_realtime_old_data"() IS 'Função para limpeza automática de dados antigos do realtime. Remove mensagens com mais de 7 dias.';



CREATE OR REPLACE FUNCTION "public"."create_banco_horas_audit_log"("p_empresa_id" "uuid", "p_calculo_id" "uuid", "p_acao" character varying, "p_descricao" "text", "p_dados_acao" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO banco_horas_audit_log (
    empresa_id,
    calculo_id,
    acao,
    descricao,
    dados_acao,
    created_by,
    ip_address,
    user_agent
  ) VALUES (
    p_empresa_id,
    p_calculo_id,
    p_acao,
    p_descricao,
    p_dados_acao,
    (SELECT auth.uid()),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;


ALTER FUNCTION "public"."create_banco_horas_audit_log"("p_empresa_id" "uuid", "p_calculo_id" "uuid", "p_acao" character varying, "p_descricao" "text", "p_dados_acao" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_banco_horas_audit_log"("p_empresa_id" "uuid", "p_calculo_id" "uuid", "p_acao" character varying, "p_descricao" "text", "p_dados_acao" "jsonb") IS 'Função segura com search_path fixo. Cria entrada no audit log com metadados automáticos';



CREATE OR REPLACE FUNCTION "public"."create_user_group"("group_name" character varying, "group_description" "text", "created_by_uuid" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    new_group_id UUID;
BEGIN
    INSERT INTO user_groups (name, description, created_by, created_at)
    VALUES (group_name, group_description, created_by_uuid, NOW())
    RETURNING id INTO new_group_id;
    
    RETURN new_group_id;
END;
$$;


ALTER FUNCTION "public"."create_user_group"("group_name" character varying, "group_description" "text", "created_by_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."criar_log_historico_plano"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    INSERT INTO plano_acao_historico (
        plano_id, 
        acao, 
        detalhes, 
        usuario_id, 
        created_at
    ) VALUES (
        NEW.id,
        TG_OP,
        format('Status alterado de %s para %s', OLD.status, NEW.status),
        auth.uid(),
        NOW()
    );
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."criar_log_historico_plano"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."criar_log_historico_plano"() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Cria logs de histórico para planos.';



CREATE OR REPLACE FUNCTION "public"."detectar_inconsistencias"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  resultado JSONB;
  v_ano_inicio TEXT;
  v_data_limite TIMESTAMPTZ;
  v_ic999999 JSONB;
  v_sem_atualizacao JSONB;
  v_mes_diferente JSONB;
  v_tempo_excessivo JSONB;
  v_troca_codigo_resolucao JSONB;
  v_validacao_solucao JSONB;
BEGIN
  -- Aumentar timeout para operação pesada (service_role não tem limite, mas
  -- authenticated tem 8s - SET LOCAL garante execução completa em qualquer role)
  SET LOCAL statement_timeout = '60s';

  -- Configurar escopo temporal
  v_ano_inicio := (EXTRACT(YEAR FROM NOW()) - 1)::TEXT || '-01-01';
  v_data_limite := NOW() - INTERVAL '16 days';

  -- TIPO 1: IC 999999 (tickets com item_configuracao começando com 999999)
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_ic999999
  FROM (
    SELECT
      'tickets' AS origem,
      CASE
        WHEN cod_tipo = 'Solicitação' THEN 'RF ' || nro_solicitacao
        WHEN cod_tipo = 'Incidente' THEN 'IM ' || nro_solicitacao
        WHEN cod_tipo = 'Problema' THEN 'PM ' || nro_solicitacao
        ELSE nro_solicitacao
      END AS nro_chamado,
      NULL::TEXT AS nro_tarefa,
      CASE WHEN cod_tipo = 'Solicitação' THEN 'RF' WHEN cod_tipo = 'Incidente' THEN 'IM' WHEN cod_tipo = 'Problema' THEN 'PM' ELSE NULL END AS tipo_chamado,
      item_configuracao,
      'ic_999999' AS tipo_inconsistencia,
      'Item de Configuração inválido: ' || item_configuracao AS descricao_inconsistencia,
      data_abertura,
      data_abertura AS data_atividade,
      NULL::TIMESTAMPTZ AS data_sistema,
      NULL::TEXT AS tempo_gasto_horas,
      NULL::INT AS tempo_gasto_minutos,
      organizacao AS empresa,
      nome_responsavel AS analista,
      status AS status_chamado,
      cod_resolucao,
      'tickets-' ||
        CASE WHEN cod_tipo = 'Solicitação' THEN 'RF ' WHEN cod_tipo = 'Incidente' THEN 'IM ' WHEN cod_tipo = 'Problema' THEN 'PM ' ELSE '' END
        || nro_solicitacao || '-ic_999999' AS chave_unica
    FROM apontamentos_tickets_aranda
    WHERE data_abertura >= v_ano_inicio::TIMESTAMPTZ
      AND status NOT IN ('Cancelled', 'Closed')
      AND item_configuracao LIKE '999999%'
      -- Filtro de ticket elegível
      AND (item_configuracao IS NULL OR item_configuracao <> '000000 - PROJETOS APL')
      AND caso_pai = 'SIM'
      AND nome_grupo NOT IN ('AMS - FABRICA ABAP (SAP)', 'AMS - QUALIDADE E PROCESSOS', 'AMS APL - TÉCNICO', 'AMS PROJ - MP PROJETOS', 'AMS SAS - N2', 'CA SDM')
      AND nome_grupo NOT LIKE 'AMS DX %'
      AND nome_grupo NOT LIKE 'AMS PRJ %'
      AND nome_grupo NOT LIKE 'AMS SAP %'
      AND nome_grupo NOT LIKE 'BPO %'
      AND nome_grupo NOT LIKE 'PROJETOS APL %'
  ) t;

  -- TIPO 2: Sem atualização há 16+ dias
  -- Referência = última nota pública; sem nota pública, a data de abertura
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_sem_atualizacao
  FROM (
    SELECT
      'tickets' AS origem,
      CASE
        WHEN cod_tipo = 'Solicitação' THEN 'RF ' || nro_solicitacao
        WHEN cod_tipo = 'Incidente' THEN 'IM ' || nro_solicitacao
        WHEN cod_tipo = 'Problema' THEN 'PM ' || nro_solicitacao
        ELSE nro_solicitacao
      END AS nro_chamado,
      NULL::TEXT AS nro_tarefa,
      CASE WHEN cod_tipo = 'Solicitação' THEN 'RF' WHEN cod_tipo = 'Incidente' THEN 'IM' WHEN cod_tipo = 'Problema' THEN 'PM' ELSE NULL END AS tipo_chamado,
      item_configuracao,
      'sem_atualizacao' AS tipo_inconsistencia,
      CASE WHEN data_ultima_nota_publica IS NOT NULL
        THEN 'Chamado com status "' || status || '" sem nota pública há ' ||
          FLOOR(EXTRACT(EPOCH FROM (NOW() - data_ultima_nota_publica)) / 86400)::INT ||
          ' dia(s). Última nota pública: ' || to_char(data_ultima_nota_publica AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY')
        ELSE 'Chamado com status "' || status || '" aberto há ' ||
          FLOOR(EXTRACT(EPOCH FROM (NOW() - data_abertura)) / 86400)::INT ||
          ' dia(s) sem nota pública'
      END AS descricao_inconsistencia,
      data_abertura,
      data_abertura AS data_atividade,
      NULL::TIMESTAMPTZ AS data_sistema,
      NULL::TEXT AS tempo_gasto_horas,
      NULL::INT AS tempo_gasto_minutos,
      organizacao AS empresa,
      nome_responsavel AS analista,
      status AS status_chamado,
      cod_resolucao,
      'tickets-' ||
        CASE WHEN cod_tipo = 'Solicitação' THEN 'RF ' WHEN cod_tipo = 'Incidente' THEN 'IM ' WHEN cod_tipo = 'Problema' THEN 'PM ' ELSE '' END
        || nro_solicitacao || '-sem_atualizacao' AS chave_unica
    FROM apontamentos_tickets_aranda
    WHERE data_abertura >= v_ano_inicio::TIMESTAMPTZ
      AND status IN ('Open', 'Hold', 'In Progress', 'Acknowledged', 'Resolved')
      AND COALESCE(data_ultima_nota_publica, data_abertura) <= v_data_limite
      -- Filtro de ticket elegível
      AND (item_configuracao IS NULL OR item_configuracao <> '000000 - PROJETOS APL')
      AND caso_pai = 'SIM'
      AND nome_grupo NOT IN ('AMS - FABRICA ABAP (SAP)', 'AMS - QUALIDADE E PROCESSOS', 'AMS APL - TÉCNICO', 'AMS PROJ - MP PROJETOS', 'AMS SAS - N2', 'CA SDM')
      AND nome_grupo NOT LIKE 'AMS DX %'
      AND nome_grupo NOT LIKE 'AMS PRJ %'
      AND nome_grupo NOT LIKE 'AMS SAP %'
      AND nome_grupo NOT LIKE 'BPO %'
      AND nome_grupo NOT LIKE 'PROJETOS APL %'
  ) t;

  -- TIPO 3: Mês diferente (usando date_trunc em vez de EXTRACT para ~8x mais rápido)
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_mes_diferente
  FROM (
    SELECT
      'apontamentos' AS origem,
      CASE WHEN a.tipo_chamado IS NOT NULL AND a.tipo_chamado != ''
        THEN a.tipo_chamado || ' ' || a.nro_chamado
        ELSE a.nro_chamado
      END AS nro_chamado,
      a.nro_tarefa,
      a.tipo_chamado,
      a.item_configuracao,
      'mes_diferente' AS tipo_inconsistencia,
      'Data Atividade (' || to_char(a.data_atividade, 'DD/MM/YYYY') || ') e Data Sistema (' || to_char(a.data_sistema, 'DD/MM/YYYY') || ') em meses diferentes' AS descricao_inconsistencia,
      a.data_abertura,
      a.data_atividade,
      a.data_sistema,
      CASE WHEN a.tempo_gasto_minutos IS NOT NULL
        THEN LPAD(FLOOR(a.tempo_gasto_minutos / 60)::TEXT, 2, '0') || ':' || LPAD((a.tempo_gasto_minutos::INT % 60)::TEXT, 2, '0')
        ELSE NULL
      END AS tempo_gasto_horas,
      a.tempo_gasto_minutos::INT AS tempo_gasto_minutos,
      a.org_us_final AS empresa,
      a.analista_tarefa AS analista,
      NULL::TEXT AS status_chamado,
      a.cod_resolucao,
      'apontamentos-' ||
        CASE WHEN a.tipo_chamado IS NOT NULL AND a.tipo_chamado != ''
          THEN a.tipo_chamado || ' ' || a.nro_chamado
          ELSE a.nro_chamado
        END || '-mes_diferente-' || to_char(a.data_atividade, 'YYYY-MM-DD')
        || CASE WHEN a.nro_tarefa IS NOT NULL AND a.nro_tarefa != '' THEN '-' || a.nro_tarefa ELSE '' END
        AS chave_unica
    FROM apontamentos_aranda a
    WHERE a.data_atividade >= v_ano_inicio::TIMESTAMPTZ
      AND a.data_atividade IS NOT NULL
      AND a.data_sistema IS NOT NULL
      AND date_trunc('month', a.data_atividade) != date_trunc('month', a.data_sistema)
      -- Filtro de ticket elegível (via ticket do apontamento)
      AND EXISTS (
        SELECT 1
        FROM apontamentos_tickets_aranda tk
        WHERE tk.nro_solicitacao = a.nro_chamado
          AND tk.status <> 'Cancelled'
          AND (tk.item_configuracao IS NULL OR tk.item_configuracao <> '000000 - PROJETOS APL')
          AND tk.caso_pai = 'SIM'
          AND tk.nome_grupo NOT IN ('AMS - FABRICA ABAP (SAP)', 'AMS - QUALIDADE E PROCESSOS', 'AMS APL - TÉCNICO', 'AMS PROJ - MP PROJETOS', 'AMS SAS - N2', 'CA SDM')
          AND tk.nome_grupo NOT LIKE 'AMS DX %'
          AND tk.nome_grupo NOT LIKE 'AMS PRJ %'
          AND tk.nome_grupo NOT LIKE 'AMS SAP %'
          AND tk.nome_grupo NOT LIKE 'BPO %'
          AND tk.nome_grupo NOT LIKE 'PROJETOS APL %'
      )
  ) t;

  -- TIPO 4: Tempo excessivo (> 10 horas = 600 minutos)
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_tempo_excessivo
  FROM (
    SELECT
      'apontamentos' AS origem,
      CASE WHEN a.tipo_chamado IS NOT NULL AND a.tipo_chamado != ''
        THEN a.tipo_chamado || ' ' || a.nro_chamado
        ELSE a.nro_chamado
      END AS nro_chamado,
      a.nro_tarefa,
      a.tipo_chamado,
      a.item_configuracao,
      'tempo_excessivo' AS tipo_inconsistencia,
      'Tempo gasto (' || LPAD(FLOOR(a.tempo_gasto_minutos / 60)::TEXT, 2, '0') || ':' || LPAD((a.tempo_gasto_minutos::INT % 60)::TEXT, 2, '0') || ') excede o limite de 10 horas' AS descricao_inconsistencia,
      a.data_abertura,
      a.data_atividade,
      a.data_sistema,
      LPAD(FLOOR(a.tempo_gasto_minutos / 60)::TEXT, 2, '0') || ':' || LPAD((a.tempo_gasto_minutos::INT % 60)::TEXT, 2, '0') AS tempo_gasto_horas,
      a.tempo_gasto_minutos::INT AS tempo_gasto_minutos,
      a.org_us_final AS empresa,
      a.analista_tarefa AS analista,
      NULL::TEXT AS status_chamado,
      a.cod_resolucao,
      'apontamentos-' ||
        CASE WHEN a.tipo_chamado IS NOT NULL AND a.tipo_chamado != ''
          THEN a.tipo_chamado || ' ' || a.nro_chamado
          ELSE a.nro_chamado
        END || '-tempo_excessivo-' || to_char(a.data_atividade, 'YYYY-MM-DD')
        || CASE WHEN a.nro_tarefa IS NOT NULL AND a.nro_tarefa != '' THEN '-' || a.nro_tarefa ELSE '' END
        AS chave_unica
    FROM apontamentos_aranda a
    WHERE a.data_atividade >= v_ano_inicio::TIMESTAMPTZ
      AND a.tempo_gasto_minutos > 600
      -- Filtro de ticket elegível (via ticket do apontamento)
      AND EXISTS (
        SELECT 1
        FROM apontamentos_tickets_aranda tk
        WHERE tk.nro_solicitacao = a.nro_chamado
          AND tk.status <> 'Cancelled'
          AND (tk.item_configuracao IS NULL OR tk.item_configuracao <> '000000 - PROJETOS APL')
          AND tk.caso_pai = 'SIM'
          AND tk.nome_grupo NOT IN ('AMS - FABRICA ABAP (SAP)', 'AMS - QUALIDADE E PROCESSOS', 'AMS APL - TÉCNICO', 'AMS PROJ - MP PROJETOS', 'AMS SAS - N2', 'CA SDM')
          AND tk.nome_grupo NOT LIKE 'AMS DX %'
          AND tk.nome_grupo NOT LIKE 'AMS PRJ %'
          AND tk.nome_grupo NOT LIKE 'AMS SAP %'
          AND tk.nome_grupo NOT LIKE 'BPO %'
          AND tk.nome_grupo NOT LIKE 'PROJETOS APL %'
      )
  ) t;

  -- TIPO 5: Troca de código de resolução que mudou o desconto do banco de horas.
  -- Considera só a ÚLTIMA troca de cada chamado (item_id = nro_solicitacao).
  -- Entra quando o "Banco=S/N" do old_value é diferente do new_value
  -- (N→S ou S→N). Não entra quando são iguais (N→N, S→S) ou quando o old_value
  -- é NULL / não tem "Banco=". Se a última troca deixar de mudar o banco, a
  -- inconsistência some do retorno e o sync-api a marca como resolvida.
  -- A data da troca entra na chave_unica: uma nova troca gera uma nova linha e
  -- a anterior é resolvida automaticamente.
  -- Só entra quando a troca é em mês/ano diferente da abertura do chamado e
  -- quando havia horas apontadas antes dela (data_sistema < troca): essa soma
  -- é o tempo que passou a ser / deixou de ser cobrado do banco de horas.
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_troca_codigo_resolucao
  FROM (
    WITH ultima_troca AS (
      SELECT DISTINCT ON (m.item_id)
        m.item_id, m.old_value, m.new_value, m.created
      FROM codigo_resolucao_modificacoes_aranda m
      ORDER BY m.item_id, m.created DESC, m.id_externo DESC
    ),
    troca_banco AS (
      SELECT
        u.*,
        UPPER(SUBSTRING(u.old_value FROM '[Bb][Aa][Nn][Cc][Oo]\s*=\s*([SsNn])')) AS banco_anterior,
        UPPER(SUBSTRING(u.new_value FROM '[Bb][Aa][Nn][Cc][Oo]\s*=\s*([SsNn])')) AS banco_atual
      FROM ultima_troca u
    )
    SELECT
      'tickets' AS origem,
      CASE
        WHEN tk.cod_tipo = 'Solicitação' THEN 'RF ' || tk.nro_solicitacao
        WHEN tk.cod_tipo = 'Incidente' THEN 'IM ' || tk.nro_solicitacao
        WHEN tk.cod_tipo = 'Problema' THEN 'PM ' || tk.nro_solicitacao
        ELSE tk.nro_solicitacao
      END AS nro_chamado,
      NULL::TEXT AS nro_tarefa,
      CASE WHEN tk.cod_tipo = 'Solicitação' THEN 'RF' WHEN tk.cod_tipo = 'Incidente' THEN 'IM' WHEN tk.cod_tipo = 'Problema' THEN 'PM' ELSE NULL END AS tipo_chamado,
      tk.item_configuracao,
      'troca_codigo_resolucao' AS tipo_inconsistencia,
      'Código de resolução alterado de "' || tb.old_value || '" para "' || tb.new_value || '" em ' ||
        to_char(tb.created, 'DD/MM/YYYY HH24:MI') ||
        CASE WHEN tb.banco_atual = 'S'
          THEN ' (passou a descontar do banco de horas)'
          ELSE ' (deixou de descontar do banco de horas)'
        END AS descricao_inconsistencia,
      tk.data_abertura,
      tb.created AS data_atividade,
      NULL::TIMESTAMPTZ AS data_sistema,
      -- HH:MM sem truncar acima de 99 horas
      LPAD(FLOOR(ta.minutos / 60)::TEXT, GREATEST(2, LENGTH(FLOOR(ta.minutos / 60)::TEXT)), '0') || ':' || LPAD((ta.minutos % 60)::TEXT, 2, '0') AS tempo_gasto_horas,
      ta.minutos AS tempo_gasto_minutos,
      tk.organizacao AS empresa,
      tk.nome_responsavel AS analista,
      tk.status AS status_chamado,
      tb.new_value AS cod_resolucao,
      tb.old_value AS cod_resolucao_anterior,
      'tickets-' ||
        CASE WHEN tk.cod_tipo = 'Solicitação' THEN 'RF ' WHEN tk.cod_tipo = 'Incidente' THEN 'IM ' WHEN tk.cod_tipo = 'Problema' THEN 'PM ' ELSE '' END
        || tk.nro_solicitacao || '-troca_codigo_resolucao-' || to_char(tb.created, 'YYYY-MM-DD"T"HH24:MI:SS') AS chave_unica
    FROM troca_banco tb
    JOIN apontamentos_tickets_aranda tk ON tk.nro_solicitacao = tb.item_id
    CROSS JOIN LATERAL (
      SELECT COALESCE(SUM(ROUND(a.tempo_gasto_minutos)), 0)::INT AS minutos
      FROM apontamentos_aranda a
      WHERE a.nro_chamado = tb.item_id
        AND a.data_sistema < tb.created
    ) ta
    WHERE tb.banco_anterior IS NOT NULL
      AND tb.banco_atual IS NOT NULL
      AND tb.banco_anterior <> tb.banco_atual
      AND date_trunc('month', tb.created AT TIME ZONE 'America/Sao_Paulo')
          <> date_trunc('month', tk.data_abertura AT TIME ZONE 'America/Sao_Paulo')
      AND ta.minutos > 0
      AND tk.data_abertura >= v_ano_inicio::TIMESTAMPTZ
      -- Filtro de ticket elegível
      AND tk.status <> 'Cancelled'
      AND (tk.item_configuracao IS NULL OR tk.item_configuracao <> '000000 - PROJETOS APL')
      AND tk.caso_pai = 'SIM'
      AND tk.nome_grupo NOT IN ('AMS - FABRICA ABAP (SAP)', 'AMS - QUALIDADE E PROCESSOS', 'AMS APL - TÉCNICO', 'AMS PROJ - MP PROJETOS', 'AMS SAS - N2', 'CA SDM')
      AND tk.nome_grupo NOT LIKE 'AMS DX %'
      AND tk.nome_grupo NOT LIKE 'AMS PRJ %'
      AND tk.nome_grupo NOT LIKE 'AMS SAP %'
      AND tk.nome_grupo NOT LIKE 'BPO %'
      AND tk.nome_grupo NOT LIKE 'PROJETOS APL %'
  ) t;

  -- TIPO 6: Validação do campo Solução
  -- O texto da solução precisa conter CENÁRIO, CAUSA, SOLUÇÃO PALIATIVA,
  -- SOLUÇÃO DEFINITIVA e PREVENÇÃO. lower() + classes com e sem acento:
  -- não diferencia maiúsculas/minúsculas nem exige acento. "causas?\M" exige
  -- fim de palavra (não casa "causado"), mas aceita texto colado antes.
  -- Uma linha por chamado (as palavras faltantes não entram na chave_unica):
  -- quando o analista completa a solução, a inconsistência some do retorno e
  -- o sync-api a marca como resolvida; se completar só parte, a descrição é
  -- atualizada com o que ainda falta.
  -- data_solucao é gravada pelo sync-api no horário local sem fuso, por isso
  -- o corte é feito direto no valor gravado (mesmo padrão de v_ano_inicio).
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_validacao_solucao
  FROM (
    SELECT
      'tickets' AS origem,
      CASE
        WHEN tk.cod_tipo = 'Solicitação' THEN 'RF ' || tk.nro_solicitacao
        WHEN tk.cod_tipo = 'Incidente' THEN 'IM ' || tk.nro_solicitacao
        WHEN tk.cod_tipo = 'Problema' THEN 'PM ' || tk.nro_solicitacao
        ELSE tk.nro_solicitacao
      END AS nro_chamado,
      NULL::TEXT AS nro_tarefa,
      CASE WHEN tk.cod_tipo = 'Solicitação' THEN 'RF' WHEN tk.cod_tipo = 'Incidente' THEN 'IM' WHEN tk.cod_tipo = 'Problema' THEN 'PM' ELSE NULL END AS tipo_chamado,
      tk.item_configuracao,
      'validacao_solucao' AS tipo_inconsistencia,
      'Palavras faltando no campo Solução: ' || f.faltantes AS descricao_inconsistencia,
      tk.data_abertura,
      tk.data_solucao AS data_atividade,
      NULL::TIMESTAMPTZ AS data_sistema,
      NULL::TEXT AS tempo_gasto_horas,
      NULL::INT AS tempo_gasto_minutos,
      tk.organizacao AS empresa,
      tk.nome_responsavel AS analista,
      tk.status AS status_chamado,
      tk.cod_resolucao,
      'tickets-' ||
        CASE WHEN tk.cod_tipo = 'Solicitação' THEN 'RF ' WHEN tk.cod_tipo = 'Incidente' THEN 'IM ' WHEN tk.cod_tipo = 'Problema' THEN 'PM ' ELSE '' END
        || tk.nro_solicitacao || '-validacao_solucao' AS chave_unica
    FROM apontamentos_tickets_aranda tk
    CROSS JOIN LATERAL (
      SELECT array_to_string(ARRAY_REMOVE(ARRAY[
        CASE WHEN lower(tk.solucao) !~ 'cen[aá]rio' THEN 'CENÁRIO' END,
        CASE WHEN lower(tk.solucao) !~ 'causas?\M' THEN 'CAUSA' END,
        CASE WHEN lower(tk.solucao) !~ 'solu[cç][aã]o\s+paliativa' THEN 'SOLUÇÃO PALIATIVA' END,
        CASE WHEN lower(tk.solucao) !~ 'solu[cç][aã]o\s+definitiva' THEN 'SOLUÇÃO DEFINITIVA' END,
        CASE WHEN lower(tk.solucao) !~ 'preven[cç][aã]o' THEN 'PREVENÇÃO' END
      ], NULL), ', ') AS faltantes
    ) f
    WHERE tk.data_solucao >= '2026-10-13'::TIMESTAMPTZ
      AND tk.status IN ('Resolved', 'Problem-Fixed', 'Closed')
      AND tk.solucao IS NOT NULL
      AND btrim(tk.solucao) <> ''
      AND f.faltantes <> ''
      -- Filtro de ticket elegível
      AND (tk.item_configuracao IS NULL OR tk.item_configuracao <> '000000 - PROJETOS APL')
      AND tk.caso_pai = 'SIM'
      AND tk.nome_grupo NOT IN ('AMS - FABRICA ABAP (SAP)', 'AMS - QUALIDADE E PROCESSOS', 'AMS APL - TÉCNICO', 'AMS PROJ - MP PROJETOS', 'AMS SAS - N2', 'CA SDM')
      AND tk.nome_grupo NOT LIKE 'AMS DX %'
      AND tk.nome_grupo NOT LIKE 'AMS PRJ %'
      AND tk.nome_grupo NOT LIKE 'AMS SAP %'
      AND tk.nome_grupo NOT LIKE 'BPO %'
      AND tk.nome_grupo NOT LIKE 'PROJETOS APL %'
  ) t;

  -- Montar resultado
  resultado := jsonb_build_object(
    'ic_999999', v_ic999999,
    'sem_atualizacao', v_sem_atualizacao,
    'mes_diferente', v_mes_diferente,
    'tempo_excessivo', v_tempo_excessivo,
    'troca_codigo_resolucao', v_troca_codigo_resolucao,
    'validacao_solucao', v_validacao_solucao,
    'totais', jsonb_build_object(
      'ic_999999', jsonb_array_length(v_ic999999),
      'sem_atualizacao', jsonb_array_length(v_sem_atualizacao),
      'mes_diferente', jsonb_array_length(v_mes_diferente),
      'tempo_excessivo', jsonb_array_length(v_tempo_excessivo),
      'troca_codigo_resolucao', jsonb_array_length(v_troca_codigo_resolucao),
      'validacao_solucao', jsonb_array_length(v_validacao_solucao),
      'total', jsonb_array_length(v_ic999999) + jsonb_array_length(v_sem_atualizacao) + jsonb_array_length(v_mes_diferente) + jsonb_array_length(v_tempo_excessivo) + jsonb_array_length(v_troca_codigo_resolucao) + jsonb_array_length(v_validacao_solucao)
    )
  );

  RETURN resultado;
END;
$$;


ALTER FUNCTION "public"."detectar_inconsistencias"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."detectar_inconsistencias"() IS 'Detecta inconsistências em tickets e apontamentos. SET LOCAL statement_timeout=60s para garantir execução completa. Otimizado com date_trunc e índices covering.';



CREATE OR REPLACE FUNCTION "public"."encerrar_baseline_anterior"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_baseline_anterior RECORD;
BEGIN
  -- Buscar baseline anterior ativo
  SELECT * INTO v_baseline_anterior
  FROM baseline_historico
  WHERE empresa_id = NEW.empresa_id
    AND data_fim IS NULL
    AND id != NEW.id
  LIMIT 1;
  
  -- Se encontrou baseline anterior
  IF FOUND THEN
    -- Calcular data_fim como 1 dia antes da nova data_inicio
    DECLARE
      v_data_fim DATE := NEW.data_inicio - INTERVAL '1 day';
    BEGIN
      -- Validar se data_fim seria válida (>= data_inicio do baseline anterior)
      IF v_data_fim >= v_baseline_anterior.data_inicio THEN
        -- Atualizar baseline anterior com data_fim válida
        UPDATE baseline_historico
        SET 
          data_fim = v_data_fim,
          updated_at = NOW(),
          updated_by = NEW.created_by
        WHERE id = v_baseline_anterior.id;
      ELSE
        -- Se data_fim seria inválida, significa que o novo baseline tem data_inicio
        -- anterior ao baseline atual. Neste caso, não encerramos o anterior
        -- e deixamos o sistema validar a sobreposição
        RAISE EXCEPTION 'Não é possível criar baseline com data de início (%) anterior ao baseline atual (%). Encerre o baseline atual primeiro.',
          NEW.data_inicio,
          v_baseline_anterior.data_inicio;
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."encerrar_baseline_anterior"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."encerrar_baseline_anterior"() IS 'Encerra automaticamente o baseline anterior ao criar um novo, validando que data_fim >= data_inicio.
Se o novo baseline tiver data_inicio anterior ao baseline atual, retorna erro.';



CREATE OR REPLACE FUNCTION "public"."encerrar_percentual_repasse_anterior"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Encerrar vigência anterior (se houver) no dia anterior ao início da nova
  UPDATE percentual_repasse_historico
  SET 
    data_fim = NEW.data_inicio - INTERVAL '1 day',
    updated_at = NOW(),
    updated_by = NEW.created_by
  WHERE empresa_id = NEW.empresa_id
    AND data_fim IS NULL
    AND id != NEW.id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."encerrar_percentual_repasse_anterior"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."encerrar_percentual_repasse_anterior"() IS 'Trigger que encerra automaticamente a vigência anterior ao criar uma nova vigência de percentual de repasse';



CREATE OR REPLACE FUNCTION "public"."especialistas_ativos"() RETURNS TABLE("id" "uuid", "origem" "public"."origem_especialista_enum", "nome" "text", "email" "text", "telefone" "text", "cargo" "text", "departamento" "text", "empresa" "text", "especialidade" "text", "nivel" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Verificar permissão
    IF NOT has_especialistas_permission() THEN
        RAISE EXCEPTION 'Acesso negado: usuário não tem permissão para visualizar especialistas'
        USING ERRCODE = '42501'; -- insufficient_privilege
    END IF;
    
    -- Retornar dados se autorizado
    RETURN QUERY
    SELECT 
        e.id,
        e.origem,
        e.nome,
        e.email,
        e.telefone,
        e.cargo,
        e.departamento,
        e.empresa,
        e.especialidade,
        e.nivel,
        e.created_at,
        e.updated_at
    FROM especialistas e
    WHERE e.status = 'ativo'
    ORDER BY e.nome;
END;
$$;


ALTER FUNCTION "public"."especialistas_ativos"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."especialistas_ativos"() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Função segura que retorna especialistas ativos. Substitui v_especialistas_ativos com controle de acesso integrado.';



CREATE OR REPLACE FUNCTION "public"."especialistas_sql_server"() RETURNS TABLE("id" "uuid", "id_externo" "text", "nome" "text", "email" "text", "status" "public"."status_especialista_enum", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "nome_original" "text", "email_original" "text")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Verificar permissão
    IF NOT has_especialistas_permission() THEN
        RAISE EXCEPTION 'Acesso negado: usuário não tem permissão para visualizar especialistas'
        USING ERRCODE = '42501'; -- insufficient_privilege
    END IF;
    
    -- Retornar dados se autorizado
    RETURN QUERY
    SELECT 
        e.id,
        e.id_externo,
        e.nome,
        e.email,
        e.status,
        e.created_at,
        e.updated_at,
        split_part(e.id_externo, '|', 2) as nome_original,
        split_part(e.id_externo, '|', 3) as email_original
    FROM especialistas e
    WHERE e.origem = 'sql_server'
    ORDER BY e.nome;
END;
$$;


ALTER FUNCTION "public"."especialistas_sql_server"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."especialistas_sql_server"() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Função segura que retorna especialistas do SQL Server. Substitui v_especialistas_sql_server com controle de acesso integrado.';



CREATE OR REPLACE FUNCTION "public"."estatisticas_anexos_periodo"("p_data_inicio" "date", "p_data_fim" "date") RETURNS TABLE("total_anexos" integer, "anexos_processados" integer, "anexos_com_erro" integer, "anexos_pendentes" integer, "tamanho_total_mb" numeric, "empresas_com_anexos" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_anexos,
    COUNT(*) FILTER (WHERE at.status = 'processado')::INTEGER as anexos_processados,
    COUNT(*) FILTER (WHERE at.status = 'erro')::INTEGER as anexos_com_erro,
    COUNT(*) FILTER (WHERE at.status = 'pendente')::INTEGER as anexos_pendentes,
    ROUND((SUM(at.tamanho_bytes) / 1048576.0)::NUMERIC, 2) as tamanho_total_mb,
    COUNT(DISTINCT at.empresa_id)::INTEGER as empresas_com_anexos
  FROM public.anexos_temporarios at
  WHERE (at.data_upload::DATE) BETWEEN p_data_inicio AND p_data_fim;
END;
$$;


ALTER FUNCTION "public"."estatisticas_anexos_periodo"("p_data_inicio" "date", "p_data_fim" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."gerar_caminho_anexo"("nome_arquivo" "text", "empresa_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Validar parâmetros
    IF nome_arquivo IS NULL OR empresa_id IS NULL THEN
        RAISE EXCEPTION 'Parâmetros não podem ser nulos';
    END IF;
    
    -- Gerar caminho seguro
    RETURN format('anexos/%s/%s/%s', 
        empresa_id, 
        to_char(NOW(), 'YYYY/MM'), 
        nome_arquivo
    );
END;
$$;


ALTER FUNCTION "public"."gerar_caminho_anexo"("nome_arquivo" "text", "empresa_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."gerar_caminho_anexo"("nome_arquivo" "text", "empresa_id" "uuid") IS 'FORÇA BRUTA: Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Gera caminho seguro para anexos.';



CREATE OR REPLACE FUNCTION "public"."gerar_caminho_anexo"("p_empresa_id" "uuid", "p_nome_arquivo" character varying, "p_temporario" boolean DEFAULT true) RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  empresa_nome VARCHAR;
  data_atual DATE;
  bucket_path TEXT;
BEGIN
  -- Buscar nome abreviado da empresa
  SELECT nome_abreviado INTO empresa_nome
  FROM empresas_clientes
  WHERE id = p_empresa_id;
  
  -- Se não encontrar a empresa, usar o ID
  IF empresa_nome IS NULL THEN
    empresa_nome := p_empresa_id::TEXT;
  END IF;
  
  -- Limpar nome da empresa para uso em path
  empresa_nome := regexp_replace(empresa_nome, '[^a-zA-Z0-9_-]', '_', 'g');
  
  -- Data atual para organização
  data_atual := CURRENT_DATE;
  
  -- Construir caminho baseado no tipo
  IF p_temporario THEN
    bucket_path := format('%s/%s/temp/%s',
      empresa_nome,
      to_char(data_atual, 'YYYY-MM'),
      p_nome_arquivo
    );
  ELSE
    bucket_path := format('%s/%s/processed/%s',
      empresa_nome,
      to_char(data_atual, 'YYYY-MM'),
      p_nome_arquivo
    );
  END IF;
  
  RETURN bucket_path;
END;
$$;


ALTER FUNCTION "public"."gerar_caminho_anexo"("p_empresa_id" "uuid", "p_nome_arquivo" character varying, "p_temporario" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."gerar_caminho_anexo"("p_empresa_id" "uuid", "p_nome_arquivo" character varying, "p_temporario" boolean) IS 'Gera caminho organizado para arquivos no storage baseado na empresa e data';



CREATE OR REPLACE FUNCTION "public"."gerar_chave_unica_pesquisa"("p_numero_chamado" "text", "p_nome_cliente" "text", "p_nome_especialista" "text", "p_data_resposta" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ BEGIN RETURN md5(COALESCE(p_numero_chamado, '') || '|' || COALESCE(p_nome_cliente, '') || '|' || COALESCE(p_nome_especialista, '') || '|' || COALESCE(p_data_resposta, '')); END; $$;


ALTER FUNCTION "public"."gerar_chave_unica_pesquisa"("p_numero_chamado" "text", "p_nome_cliente" "text", "p_nome_especialista" "text", "p_data_resposta" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."gerar_hash_pesquisa"("dados" "jsonb") RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ BEGIN RETURN md5(dados::text); END; $$;


ALTER FUNCTION "public"."gerar_hash_pesquisa"("dados" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_baseline_horas_vigente"("p_empresa_id" "uuid", "p_data" "date" DEFAULT CURRENT_DATE) RETURNS numeric
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_baseline_horas DECIMAL(10,2);
BEGIN
  -- Buscar usando função principal
  SELECT baseline_horas INTO v_baseline_horas
  FROM get_baseline_vigente(p_empresa_id, p_data)
  LIMIT 1;
  
  RETURN COALESCE(v_baseline_horas, 0.0);
END;
$$;


ALTER FUNCTION "public"."get_baseline_horas_vigente"("p_empresa_id" "uuid", "p_data" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_baseline_horas_vigente"("p_empresa_id" "uuid", "p_data" "date") IS 'Retorna apenas o valor de baseline_horas vigente para uma empresa em uma data específica.
Wrapper simplificado da função get_baseline_vigente().';



CREATE OR REPLACE FUNCTION "public"."get_baseline_tickets_vigente"("p_empresa_id" "uuid", "p_data" "date" DEFAULT CURRENT_DATE) RETURNS integer
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_baseline_tickets INTEGER;
BEGIN
  -- Buscar usando função principal
  SELECT baseline_tickets INTO v_baseline_tickets
  FROM get_baseline_vigente(p_empresa_id, p_data)
  LIMIT 1;
  
  RETURN COALESCE(v_baseline_tickets, 0);
END;
$$;


ALTER FUNCTION "public"."get_baseline_tickets_vigente"("p_empresa_id" "uuid", "p_data" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_baseline_tickets_vigente"("p_empresa_id" "uuid", "p_data" "date") IS 'Retorna apenas o valor de baseline_tickets vigente para uma empresa em uma data específica.
Wrapper simplificado da função get_baseline_vigente().';



CREATE OR REPLACE FUNCTION "public"."get_baseline_vigente"("p_empresa_id" "uuid", "p_data" "date" DEFAULT CURRENT_DATE) RETURNS TABLE("baseline_horas" numeric, "baseline_tickets" integer, "data_inicio" "date", "data_fim" "date", "motivo" "text", "tipo_banco" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bh.baseline_horas,
    bh.baseline_tickets,
    bh.data_inicio,
    bh.data_fim,
    bh.motivo,
    bh.tipo_banco
  FROM baseline_historico bh
  WHERE bh.empresa_id = p_empresa_id
    AND bh.data_inicio <= p_data
    AND (bh.data_fim IS NULL OR bh.data_fim >= p_data)
  ORDER BY bh.data_inicio DESC
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_baseline_vigente"("p_empresa_id" "uuid", "p_data" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_baseline_vigente"("p_empresa_id" "uuid", "p_data" "date") IS 'Retorna o baseline vigente (horas, tickets e tipo_banco) para uma empresa em uma data específica. Usado para cálculos retroativos de banco de horas.';



CREATE OR REPLACE FUNCTION "public"."get_especialistas_stats"() RETURNS TABLE("total" bigint, "ativos" bigint, "inativos" bigint, "sql_server" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF NOT has_screen_permission('especialistas', 'view') THEN
        RAISE EXCEPTION 'Sem permissão para visualizar estatísticas de especialistas';
    END IF;
    
    RETURN QUERY
    SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'ativo') as ativos,
        COUNT(*) FILTER (WHERE status = 'inativo') as inativos,
        COUNT(*) FILTER (WHERE origem = 'sql_server') as sql_server
    FROM especialistas;
END;
$$;


ALTER FUNCTION "public"."get_especialistas_stats"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_especialistas_stats"() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Retorna estatísticas de especialistas.';



CREATE OR REPLACE FUNCTION "public"."get_job_statistics"() RETURNS TABLE("status" "text", "count" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.status::TEXT,
        COUNT(*) as count
    FROM job_queue j
    GROUP BY j.status
    ORDER BY j.status;
END;
$$;


ALTER FUNCTION "public"."get_job_statistics"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_job_statistics"() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Retorna estatísticas de jobs.';



CREATE OR REPLACE FUNCTION "public"."get_organizacao_por_produto"("p_produto" character varying) RETURNS TABLE("id" "uuid", "nome" "text", "cargo" "text", "departamento" "text", "email" "text", "telefone" "text", "foto_url" "text", "superior_id" "uuid", "produto" character varying, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    oe.id,
    oe.nome,
    oe.cargo,
    oe.departamento,
    oe.email,
    oe.telefone,
    oe.foto_url,
    op.superior_id,
    op.produto,
    oe.created_at,
    oe.updated_at
  FROM organizacao_estrutura oe
  INNER JOIN organizacao_produto op ON oe.id = op.pessoa_id
  WHERE op.produto = p_produto
  ORDER BY 
    CASE oe.cargo
      WHEN 'Diretor' THEN 1
      WHEN 'Gerente' THEN 2
      WHEN 'Coordenador' THEN 3
      WHEN 'Central Escalação' THEN 4
    END,
    oe.nome;
END;
$$;


ALTER FUNCTION "public"."get_organizacao_por_produto"("p_produto" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_organizacao_por_produto"("p_produto" character varying) IS 'Retorna todas as pessoas de um produto específico com seus superiores';



CREATE OR REPLACE FUNCTION "public"."get_percentual_repasse_valor"("p_empresa_id" "uuid", "p_data" "date" DEFAULT CURRENT_DATE) RETURNS numeric
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_percentual DECIMAL(5,2);
BEGIN
  SELECT percentual INTO v_percentual
  FROM percentual_repasse_historico
  WHERE empresa_id = p_empresa_id
    AND data_inicio <= p_data
    AND (data_fim IS NULL OR data_fim >= p_data)
  ORDER BY data_inicio DESC
  LIMIT 1;
  
  RETURN COALESCE(v_percentual, 0);
END;
$$;


ALTER FUNCTION "public"."get_percentual_repasse_valor"("p_empresa_id" "uuid", "p_data" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_percentual_repasse_valor"("p_empresa_id" "uuid", "p_data" "date") IS 'Retorna apenas o percentual de repasse vigente para uma empresa em uma data específica. Função de compatibilidade para código existente.';



CREATE OR REPLACE FUNCTION "public"."get_percentual_repasse_vigente"("p_empresa_id" "uuid", "p_data" "date" DEFAULT CURRENT_DATE) RETURNS TABLE("percentual" numeric, "data_inicio" "date", "data_fim" "date", "motivo" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    prh.percentual,
    prh.data_inicio,
    prh.data_fim,
    prh.motivo
  FROM percentual_repasse_historico prh
  WHERE prh.empresa_id = p_empresa_id
    AND prh.data_inicio <= p_data
    AND (prh.data_fim IS NULL OR prh.data_fim >= p_data)
  ORDER BY prh.data_inicio DESC
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_percentual_repasse_vigente"("p_empresa_id" "uuid", "p_data" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_percentual_repasse_vigente"("p_empresa_id" "uuid", "p_data" "date") IS 'Busca percentual de repasse vigente para empresa na data especificada. SECURITY DEFINER para bypass RLS.';



CREATE OR REPLACE FUNCTION "public"."get_superiores_pessoa"("p_pessoa_id" "uuid", "p_produto" character varying) RETURNS TABLE("superior_id" "uuid", "superior_nome" "text", "superior_cargo" character varying)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Buscar superior único da tabela organizacao_produto
  RETURN QUERY
  SELECT 
    oe.id,
    oe.nome,
    oe.cargo
  FROM organizacao_produto op
  INNER JOIN organizacao_estrutura oe ON oe.id = op.superior_id
  WHERE op.pessoa_id = p_pessoa_id
    AND op.produto = p_produto
    AND op.superior_id IS NOT NULL
  
  UNION
  
  -- Buscar múltiplos superiores da tabela organizacao_multiplos_superiores
  SELECT 
    oe.id,
    oe.nome,
    oe.cargo
  FROM organizacao_multiplos_superiores oms
  INNER JOIN organizacao_estrutura oe ON oe.id = oms.superior_id
  WHERE oms.pessoa_id = p_pessoa_id
    AND oms.produto = p_produto;
END;
$$;


ALTER FUNCTION "public"."get_superiores_pessoa"("p_pessoa_id" "uuid", "p_produto" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_superiores_pessoa"("p_pessoa_id" "uuid", "p_produto" character varying) IS 'Retorna todos os superiores de uma pessoa em um produto (incluindo múltiplos superiores)';



CREATE OR REPLACE FUNCTION "public"."get_user_group"("user_uuid" "uuid") RETURNS TABLE("group_id" "uuid", "group_name" character varying, "group_description" "text", "is_admin" boolean)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT ug.id, ug.name, ug.description, ug.is_default_admin
    FROM user_group_assignments uga
    JOIN user_groups ug ON uga.group_id = ug.id
    WHERE uga.user_id = user_uuid;
END;
$$;


ALTER FUNCTION "public"."get_user_group"("user_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_group"("user_uuid" "uuid") IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Retorna grupos do usuário especificado.';



CREATE OR REPLACE FUNCTION "public"."get_user_permissions"("user_uuid" "uuid") RETURNS TABLE("screen_key" character varying, "permission_level" character varying)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT sp.screen_key, sp.permission_level
    FROM user_group_assignments uga
    JOIN screen_permissions sp ON uga.group_id = sp.group_id
    WHERE uga.user_id = user_uuid;
END;
$$;


ALTER FUNCTION "public"."get_user_permissions"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Atribuir usuário ao grupo padrão se existir
    INSERT INTO user_group_assignments (user_id, group_id, assigned_at)
    SELECT NEW.id, ug.id, NOW()
    FROM user_groups ug 
    WHERE ug.is_default = true
    LIMIT 1;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_especialistas_permission"() RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Service role sempre tem acesso
    IF current_setting('role') = 'service_role' THEN
        RETURN TRUE;
    END IF;
    
    -- Verificar se usuário está autenticado
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar permissão através dos grupos
    RETURN EXISTS (
        SELECT 1 FROM user_group_assignments uga
        JOIN screen_permissions sp ON uga.group_id = sp.group_id
        JOIN screens s ON sp.screen_key = s.key
        WHERE uga.user_id = auth.uid()
          AND s.key = 'especialistas'
          AND sp.permission_level IN ('view', 'edit')
    );
END;
$$;


ALTER FUNCTION "public"."has_especialistas_permission"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_especialistas_permission"() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Verifica se o usuário atual tem permissão para acessar dados de especialistas.';



CREATE OR REPLACE FUNCTION "public"."has_screen_permission"("screen_key_param" "text", "required_level" "text" DEFAULT 'view'::"text") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    user_permission TEXT;
BEGIN
    -- Verificar se o usuário está autenticado
    IF (SELECT auth.uid()) IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Buscar o nível de permissão do usuário para a tela específica
    SELECT sp.permission_level INTO user_permission
    FROM screen_permissions sp
    JOIN user_group_assignments uga ON sp.group_id = uga.group_id
    WHERE uga.user_id = (SELECT auth.uid())
      AND sp.screen_key = screen_key_param
    ORDER BY 
      CASE sp.permission_level 
        WHEN 'edit' THEN 3
        WHEN 'view' THEN 2
        WHEN 'none' THEN 1
        ELSE 0
      END DESC
    LIMIT 1;
    
    -- Se não encontrou permissão, retornar false
    IF user_permission IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar se o nível de permissão é suficiente
    RETURN CASE 
        WHEN required_level = 'edit' THEN user_permission = 'edit'
        WHEN required_level = 'view' THEN user_permission IN ('view', 'edit')
        ELSE FALSE
    END;
END;
$$;


ALTER FUNCTION "public"."has_screen_permission"("screen_key_param" "text", "required_level" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_screen_permission"("screen_key_param" "text", "required_level" "text") IS 'Função para verificar se o usuário tem permissão para acessar uma tela específica';



CREATE OR REPLACE FUNCTION "public"."has_screen_permission"("screen_key" character varying, "permission_level" character varying DEFAULT 'view'::character varying) RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    user_permission_level TEXT;
BEGIN
    -- Validar parâmetros
    IF has_screen_permission.screen_key IS NULL OR has_screen_permission.screen_key = '' THEN
        RETURN FALSE;
    END IF;

    -- Service role sempre tem acesso
    IF current_setting('role') = 'service_role' THEN
        RETURN TRUE;
    END IF;

    -- Verificar se usuário está autenticado
    IF (SELECT auth.uid()) IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Buscar o maior nível de permissão do usuário para esta tela
    SELECT sp.permission_level INTO user_permission_level
    FROM user_group_assignments uga
    JOIN screen_permissions sp ON uga.group_id = sp.group_id
    WHERE uga.user_id = (SELECT auth.uid())
      AND sp.screen_key = has_screen_permission.screen_key
    ORDER BY 
      CASE sp.permission_level 
        WHEN 'edit' THEN 3
        WHEN 'view' THEN 2
        WHEN 'none' THEN 1
        ELSE 0
      END DESC
    LIMIT 1;

    -- Se não encontrou permissão, retornar false
    IF user_permission_level IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Verificar se o nível é suficiente
    RETURN CASE 
        WHEN has_screen_permission.permission_level = 'edit' THEN user_permission_level = 'edit'
        WHEN has_screen_permission.permission_level = 'view' THEN user_permission_level IN ('view', 'edit')
        ELSE FALSE
    END;
END;
$$;


ALTER FUNCTION "public"."has_screen_permission"("screen_key" character varying, "permission_level" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_screen_permission"("screen_key" character varying, "permission_level" character varying) IS 'FORÇA BRUTA: Função CRÍTICA corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Verifica permissões de tela.';



CREATE OR REPLACE FUNCTION "public"."has_sync_write_permission"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Permite escrita se o usuário tiver permissão 'edit' em qualquer
  -- uma das telas que disparam sincronização
  RETURN (
    has_screen_permission('pesquisas', 'edit')
    OR has_screen_permission('pesquisa_mensal_ams', 'edit')
    OR has_screen_permission('lancar_pesquisas', 'edit')
    OR has_screen_permission('banco_horas_ajustes_retroativos', 'edit')
  );
END;
$$;


ALTER FUNCTION "public"."has_sync_write_permission"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_sync_write_permission"() IS 'Verifica se o usuário tem permissão de escrita em sync_metadata. 
   Aceita usuários com edit em qualquer tela que dispara sincronização.';



CREATE OR REPLACE FUNCTION "public"."inativar_empresas_vencidas"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    empresas_inativadas INTEGER := 0;
BEGIN
    -- Atualizar status das empresas com vigência vencida
    UPDATE public.empresas_clientes
    SET
        status = 'inativo',
        data_status = NOW(),
        descricao_status = 'Inativado automaticamente por vigência vencida em ' || vigencia_final::text,
        updated_at = NOW()
    WHERE
        vigencia_final IS NOT NULL
        AND vigencia_final < CURRENT_DATE
        AND status = 'ativo';

    GET DIAGNOSTICS empresas_inativadas = ROW_COUNT;

    -- Log da operação
    INSERT INTO public.logs_sistema (
        operacao,
        detalhes,
        data_operacao
    ) VALUES (
        'inativacao_automatica_vigencia',
        'Inativadas ' || empresas_inativadas || ' empresas por vigência vencida',
        NOW()
    );

    RETURN empresas_inativadas;
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, registrar no log
        BEGIN
            INSERT INTO public.logs_sistema (
                operacao,
                detalhes,
                data_operacao
            ) VALUES (
                'erro_inativacao_vigencia',
                'Erro ao inativar empresas: ' || SQLERRM,
                NOW()
            );
        EXCEPTION
            WHEN OTHERS THEN
                NULL;
        END;
        RETURN 0;
END;
$$;


ALTER FUNCTION "public"."inativar_empresas_vencidas"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."inativar_empresas_vencidas"() IS 'Inativa automaticamente empresas com vigência vencida. 
SECURITY DEFINER para permitir execução via client autenticado sem Service Role Key.
Considera vencido apenas no dia seguinte ao vencimento (vigencia_final < CURRENT_DATE).';



CREATE OR REPLACE FUNCTION "public"."iniciar_retificacao_book"("p_book_id" "uuid", "p_usuario_id" "uuid", "p_motivo" "text") RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_book RECORD;
  v_nova_versao INTEGER;
BEGIN
  -- Validar motivo
  IF p_motivo IS NULL OR LENGTH(TRIM(p_motivo)) < 10 THEN
    RAISE EXCEPTION 'Motivo da retificação é obrigatório (mínimo 10 caracteres)';
  END IF;
  
  -- Buscar book atual
  SELECT * INTO v_book FROM books WHERE id = p_book_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Book não encontrado: %', p_book_id;
  END IF;
  
  -- Permitir retificação se:
  -- 1. Status é 'enviado' (caso normal - qualquer versão)
  -- 2. Status é 'desatualizado' (já foi retificado mas não reenviado)
  IF v_book.status NOT IN ('enviado', 'desatualizado') THEN
    RAISE EXCEPTION 'Este book não pode ser retificado. Status atual: %. Apenas books enviados podem ser retificados.', v_book.status;
  END IF;
  
  -- Calcular nova versão (baseado no máximo de versões existentes + 1)
  SELECT COALESCE(MAX(versao), 0) + 1 INTO v_nova_versao
  FROM books_versoes
  WHERE book_id = p_book_id;
  
  -- Se não tem versões ainda mas está enviado, a próxima é 2
  IF v_nova_versao <= v_book.versao_atual THEN
    v_nova_versao := v_book.versao_atual + 1;
  END IF;
  
  -- Mudar status para 'desatualizado' (indica que precisa ser regenerado e reenviado)
  UPDATE books SET
    status = 'desatualizado',
    versao_atual = v_nova_versao,
    updated_at = NOW()
  WHERE id = p_book_id;
  
  -- Registrar no histórico de geração
  INSERT INTO books_historico_geracao (book_id, usuario_id, acao, status, detalhes)
  VALUES (
    p_book_id,
    p_usuario_id,
    'atualizacao',
    'sucesso',
    jsonb_build_object(
      'tipo', 'retificacao',
      'versao_anterior', v_book.versao_atual,
      'nova_versao', v_nova_versao,
      'motivo', p_motivo,
      'status_anterior', v_book.status
    )
  );
  
  RETURN v_nova_versao;
END;
$$;


ALTER FUNCTION "public"."iniciar_retificacao_book"("p_book_id" "uuid", "p_usuario_id" "uuid", "p_motivo" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."iniciar_retificacao_book"("p_book_id" "uuid", "p_usuario_id" "uuid", "p_motivo" "text") IS 'Inicia retificação de um book enviado. Muda status para desatualizado e incrementa versão.';



CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN user_groups ug ON uga.group_id = ug.id
    WHERE uga.user_id = (SELECT auth.uid())
      AND ug.name = 'Administradores'
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_admin"() IS 'Verifica se o usuário atual é administrador';



CREATE OR REPLACE FUNCTION "public"."is_user_admin"("user_id_param" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  target_user_id UUID;
  is_admin BOOLEAN;
BEGIN
  -- Se não passar user_id, usa o usuário atual
  target_user_id := COALESCE(user_id_param, auth.uid());
  
  -- Verificar se usuário está no grupo Administradores
  -- SECURITY DEFINER bypassa RLS, então não há recursão
  SELECT EXISTS (
    SELECT 1 
    FROM user_group_assignments uga
    JOIN user_groups ug ON uga.group_id = ug.id
    WHERE uga.user_id = target_user_id
      AND ug.name = 'Administradores'
  ) INTO is_admin;
  
  RETURN COALESCE(is_admin, false);
END;
$$;


ALTER FUNCTION "public"."is_user_admin"("user_id_param" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_user_admin"("user_id_param" "uuid") IS 'Verifica se usuário é administrador. Usa SECURITY DEFINER para evitar recursão RLS.';



CREATE OR REPLACE FUNCTION "public"."limpar_anexos_expirados"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM anexos_temporarios 
    WHERE created_at < (NOW() - INTERVAL '24 hours');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."limpar_anexos_expirados"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."limpar_anexos_expirados"() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Remove anexos temporários expirados.';



CREATE OR REPLACE FUNCTION "public"."list_all_users"() RETURNS TABLE("user_id" "uuid", "user_email" "text", "user_full_name" "text", "user_active" boolean, "user_created_at" timestamp with time zone, "user_last_sign_in_at" timestamp with time zone, "group_name" "text")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Verificar se usuário atual tem permissão de admin
  IF NOT EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN screen_permissions sp ON sp.group_id = uga.group_id
    WHERE uga.user_id = (SELECT auth.uid())
      AND (
        sp.screen_key IN ('cadastro-usuarios', 'gerenciamento_usuarios', 'admin_users')
        OR sp.permission_level = 'admin'
      )
  ) AND NOT EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN user_groups ug ON ug.id = uga.group_id
    WHERE uga.user_id = (SELECT auth.uid())
      AND ug.name IN ('Administradores', 'Admin', 'Administrador')
  ) THEN
    RAISE EXCEPTION 'Usuário não tem permissão para listar usuários';
  END IF;

  -- Retornar lista usando profiles (sem JOIN auth.users)
  RETURN QUERY
  SELECT 
    p.id                    AS user_id,
    p.email                 AS user_email,
    p.full_name             AS user_full_name,
    COALESCE(p.active, true) AS user_active,
    p.created_at            AS user_created_at,
    p.last_sign_in_at       AS user_last_sign_in_at,
    ug.name::TEXT           AS group_name
  FROM profiles p
  LEFT JOIN user_group_assignments uga ON uga.user_id = p.id
  LEFT JOIN user_groups ug ON ug.id = uga.group_id
  ORDER BY p.full_name;
END;
$$;


ALTER FUNCTION "public"."list_all_users"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."list_all_users"() IS 'Lista todos os usuários com status ativo, grupo e último login. Requer permissão admin.';



CREATE OR REPLACE FUNCTION "public"."marcar_pesquisa_encaminhada"("pesquisa_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
  BEGIN
    -- Atualizar status da pesquisa para encaminhada
    UPDATE pesquisas 
    SET 
      status = 'encaminhada',
      data_encaminhamento = NOW(),
      updated_at = NOW()
    WHERE id = pesquisa_id;
    
    -- Verificar se a atualização foi bem-sucedida
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Pesquisa não encontrada: %', pesquisa_id;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Erro ao marcar pesquisa como encaminhada: %', SQLERRM;
  END;
  $$;


ALTER FUNCTION "public"."marcar_pesquisa_encaminhada"("pesquisa_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."monitor_realtime_performance"() RETURNS TABLE("metric_name" "text", "metric_value" "text", "recommendation" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'realtime', 'pg_catalog'
    AS $_$
BEGIN
    RETURN QUERY
    SELECT 
        'Configuração work_mem'::text,
        current_setting('work_mem')::text,
        CASE 
            WHEN current_setting('work_mem')::text ~ '^[0-9]+kB$' AND 
                 (current_setting('work_mem')::text)::text::integer < 8192
            THEN '⚠️ Recomenda-se aumentar para pelo menos 8MB'
            ELSE '✅ Configuração adequada'
        END::text
    
    UNION ALL
    
    SELECT 
        'Configuração shared_buffers'::text,
        current_setting('shared_buffers')::text,
        'ℹ️ Recomenda-se pelo menos 256MB para melhor performance'::text
    
    UNION ALL
    
    SELECT 
        'Configuração max_connections'::text,
        current_setting('max_connections')::text,
        CASE 
            WHEN current_setting('max_connections')::integer > 200
            THEN '⚠️ Muitas conexões podem impactar performance'
            ELSE '✅ Número adequado de conexões'
        END::text;
        
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY
        SELECT 
            'Erro no monitoramento'::text,
            SQLERRM::text,
            'Verificar permissões e configurações'::text;
END;
$_$;


ALTER FUNCTION "public"."monitor_realtime_performance"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."monitor_realtime_performance"() IS 'Função para monitorar configurações de performance relacionadas ao realtime.';



CREATE OR REPLACE FUNCTION "public"."notificacoes_abrir"("p_tipo" "text", "p_screen_key" "text", "p_titulo" "text", "p_mensagem" "text", "p_link" "text", "p_empresa_id" "uuid", "p_chave" "text", "p_referencia" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO notificacoes (tipo, screen_key, titulo, mensagem, link, empresa_id, chave, referencia)
  VALUES (p_tipo, p_screen_key, p_titulo, p_mensagem, p_link, p_empresa_id, p_chave, COALESCE(p_referencia, '{}'::jsonb))
  ON CONFLICT (chave) WHERE resolvida_em IS NULL
  DO UPDATE SET
    titulo = EXCLUDED.titulo,
    mensagem = EXCLUDED.mensagem,
    referencia = EXCLUDED.referencia,
    updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."notificacoes_abrir"("p_tipo" "text", "p_screen_key" "text", "p_titulo" "text", "p_mensagem" "text", "p_link" "text", "p_empresa_id" "uuid", "p_chave" "text", "p_referencia" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notificacoes_nome_empresa"("p_empresa_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(NULLIF(TRIM(nome_abreviado), ''), nome_completo, 'Empresa')
    FROM empresas_clientes WHERE id = p_empresa_id;
$$;


ALTER FUNCTION "public"."notificacoes_nome_empresa"("p_empresa_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notificacoes_resolver"("p_chave" "text", "p_motivo" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE notificacoes
     SET resolvida_em = NOW(), resolvida_motivo = p_motivo, updated_at = NOW()
   WHERE chave = p_chave AND resolvida_em IS NULL;
END;
$$;


ALTER FUNCTION "public"."notificacoes_resolver"("p_chave" "text", "p_motivo" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notificacoes_sync_book"("p_book_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_book RECORD;
BEGIN
  SELECT id, empresa_id, mes, ano, precisa_retificacao INTO v_book FROM books WHERE id = p_book_id;
  IF NOT FOUND OR v_book.precisa_retificacao IS NOT TRUE THEN
    RETURN;
  END IF;

  PERFORM notificacoes_abrir(
    'book_precisa_retificacao',
    'geracao_books',
    'Book precisa de retificação',
    format('O book de %s de %s/%s teve alteração após o fechamento e precisa ser retificado e reenviado.',
           notificacoes_nome_empresa(v_book.empresa_id), lpad(v_book.mes::text, 2, '0'), v_book.ano),
    '/admin/geracao-books',
    v_book.empresa_id,
    'book_retificacao:' || v_book.id,
    jsonb_build_object('book_id', v_book.id, 'mes', v_book.mes, 'ano', v_book.ano)
  );
END;
$$;


ALTER FUNCTION "public"."notificacoes_sync_book"("p_book_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notificacoes_sync_geracao_books"("p_execucao_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_exec RECORD;
  v_empresas TEXT;
  v_mensagem TEXT;
BEGIN
  SELECT id, tipo, status, resultado INTO v_exec FROM sync_execucoes WHERE id = p_execucao_id;
  IF NOT FOUND OR v_exec.tipo IS DISTINCT FROM 'books' THEN
    RETURN;
  END IF;

  IF v_exec.status = 'sucesso' THEN
    PERFORM notificacoes_resolver('geracao_books', 'Geração automática de books concluída com sucesso');
  ELSIF v_exec.status IN ('erro', 'parcial', 'interrompida') THEN
    SELECT string_agg(e ->> 'empresa', ', ')
      INTO v_empresas
      FROM jsonb_array_elements(COALESCE(v_exec.resultado -> 'gerarBooks' -> 'empresas', '[]'::jsonb)) e
     WHERE (e ->> 'sucesso')::boolean IS FALSE;

    v_mensagem := CASE
      WHEN v_empresas IS NOT NULL THEN format('A geração automática de books falhou para: %s.', v_empresas)
      WHEN v_exec.status = 'interrompida' THEN 'A geração automática de books foi interrompida.'
      ELSE 'A geração automática de books terminou com erro.'
    END;

    PERFORM notificacoes_abrir(
      'geracao_books_falha',
      'geracao_books',
      'Falha na geração automática de books',
      v_mensagem,
      '/admin/geracao-books',
      NULL,
      'geracao_books',
      jsonb_build_object('execucao_id', v_exec.id, 'status', v_exec.status)
    );
  END IF;
END;
$$;


ALTER FUNCTION "public"."notificacoes_sync_geracao_books"("p_execucao_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notificacoes_sync_retroativo"("p_empresa_id" "uuid", "p_mes" integer, "p_ano" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_chave TEXT := format('retroativo:%s:%s-%s', p_empresa_id, p_ano, lpad(p_mes::text, 2, '0'));
BEGIN
  IF EXISTS (
    SELECT 1 FROM banco_horas_ajustes_retroativos
     WHERE empresa_id = p_empresa_id
       AND mes_referencia = p_mes
       AND ano_referencia = p_ano
       AND status = 'pendente'
  ) THEN
    PERFORM notificacoes_abrir(
      'ajuste_retroativo_pendente',
      'banco_horas_ajustes_retroativos',
      'Ajuste retroativo pendente',
      format('Há ajustes retroativos de %s em %s/%s aguardando análise.',
             notificacoes_nome_empresa(p_empresa_id), lpad(p_mes::text, 2, '0'), p_ano),
      '/admin/ajustes-retroativos',
      p_empresa_id,
      v_chave,
      jsonb_build_object('mes', p_mes, 'ano', p_ano)
    );
  ELSE
    PERFORM notificacoes_resolver(v_chave, 'Ajustes retroativos analisados');
  END IF;
END;
$$;


ALTER FUNCTION "public"."notificacoes_sync_retroativo"("p_empresa_id" "uuid", "p_mes" integer, "p_ano" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notificacoes_sync_saldo_parcial"("p_execucao_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_exec RECORD;
  v_chave TEXT;
  v_motivo TEXT;
BEGIN
  SELECT id, empresa_id, status, origem INTO v_exec FROM banco_horas_envio_execucoes WHERE id = p_execucao_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_chave := 'saldo_parcial:' || v_exec.empresa_id;

  IF v_exec.status = 'sucesso' THEN
    PERFORM notificacoes_resolver(v_chave, 'Envio de Saldo Parcial concluído com sucesso');
  ELSIF v_exec.status IN ('erro', 'sem_destinatarios', 'interrompida') THEN
    v_motivo := CASE v_exec.status
      WHEN 'sem_destinatarios' THEN 'não há contatos ativos com finalidade Saldo Parcial'
      WHEN 'interrompida' THEN 'a execução foi interrompida'
      ELSE 'ocorreu um erro no envio'
    END;
    PERFORM notificacoes_abrir(
      'saldo_parcial_falha',
      'envio_saldo_parcial',
      'Falha no envio do Saldo Parcial',
      format('O Saldo Parcial de %s não foi enviado: %s. Veja o histórico de execuções.',
             notificacoes_nome_empresa(v_exec.empresa_id), v_motivo),
      '/admin/envio-saldo-parcial',
      v_exec.empresa_id,
      v_chave,
      jsonb_build_object('execucao_id', v_exec.id, 'status', v_exec.status, 'origem', v_exec.origem)
    );
  END IF;
END;
$$;


ALTER FUNCTION "public"."notificacoes_sync_saldo_parcial"("p_execucao_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notificar_ajuste_retroativo"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM notificacoes_sync_retroativo(OLD.empresa_id, OLD.mes_referencia, OLD.ano_referencia);
  ELSE
    PERFORM notificacoes_sync_retroativo(NEW.empresa_id, NEW.mes_referencia, NEW.ano_referencia);
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."notificar_ajuste_retroativo"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notificar_book_precisa_retificacao"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM notificacoes_sync_book(NEW.id);
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."notificar_book_precisa_retificacao"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notificar_geracao_books_execucao"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM notificacoes_sync_geracao_books(NEW.id);
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."notificar_geracao_books_execucao"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notificar_saldo_parcial_execucao"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM notificacoes_sync_saldo_parcial(NEW.id);
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."notificar_saldo_parcial_execucao"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."obter_ultima_sincronizacao_pesquisas"("p_tipo_sincronizacao" "text") RETURNS timestamp with time zone
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
    AS $$ DECLARE v_ultima_sincronizacao timestamp with time zone; BEGIN SELECT ultima_sincronizacao INTO v_ultima_sincronizacao FROM public.sync_control_pesquisas WHERE tipo_sincronizacao = p_tipo_sincronizacao; RETURN COALESCE(v_ultima_sincronizacao, '1970-01-01'::timestamp with time zone); END; $$;


ALTER FUNCTION "public"."obter_ultima_sincronizacao_pesquisas"("p_tipo_sincronizacao" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."preencher_data_conclusao"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF NEW.status = 'concluido' AND OLD.status != 'concluido' THEN
        NEW.data_conclusao = NOW();
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."preencher_data_conclusao"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."preencher_data_conclusao"() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Preenche data de conclusão automaticamente.';



CREATE OR REPLACE FUNCTION "public"."realtime_maintenance"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'realtime'
    AS $$
DECLARE
    result_text text := '';
    table_exists boolean;
BEGIN
    result_text := '🔧 MANUTENÇÃO REALTIME INICIADA' || chr(10);
    
    -- 1. Limpeza de dados antigos
    BEGIN
        PERFORM public.cleanup_realtime_old_data();
        result_text := result_text || '✅ Limpeza de dados antigos concluída' || chr(10);
    EXCEPTION
        WHEN OTHERS THEN
            result_text := result_text || '⚠️ Erro na limpeza: ' || SQLERRM || chr(10);
    END;
    
    -- 2. Vacuum manual se necessário
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'realtime' AND table_name = 'messages'
    ) INTO table_exists;

    IF table_exists THEN
        BEGIN
            VACUUM ANALYZE realtime.messages;
            result_text := result_text || '✅ VACUUM ANALYZE realtime.messages concluído' || chr(10);
        EXCEPTION
            WHEN OTHERS THEN
                result_text := result_text || '⚠️ Erro no VACUUM: ' || SQLERRM || chr(10);
        END;
    END IF;
    
    -- 3. Verificar estatísticas
    result_text := result_text || '📊 Manutenção concluída em: ' || NOW()::text;
    
    RETURN result_text;
END;
$$;


ALTER FUNCTION "public"."realtime_maintenance"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."realtime_maintenance"() IS 'Função para manutenção periódica do sistema realtime. Executa limpeza e otimizações.';



CREATE OR REPLACE FUNCTION "public"."registrar_envio_book"("p_book_id" "uuid", "p_usuario_id" "uuid", "p_destinatarios" "text"[]) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_book RECORD;
  v_versao_id UUID;
  v_versao_numero INTEGER;
  v_motivo_retificacao TEXT;
  v_versao_existente UUID;
BEGIN
  -- O sync-api (service role) gera os books agendados sem usuário logado
  IF (SELECT auth.role()) IS DISTINCT FROM 'service_role' THEN
    -- Validar que o usuário está autenticado
    IF (SELECT auth.uid()) IS NULL THEN
      RAISE EXCEPTION 'Usuário não autenticado';
    END IF;

    -- Validar que o usuário tem permissão de edição na tela geracao_books
    IF NOT has_screen_permission('geracao_books'::varchar, 'edit'::varchar) THEN
      RAISE EXCEPTION 'Usuário não tem permissão para registrar envio de books';
    END IF;
  END IF;

  -- Buscar book atual
  SELECT * INTO v_book FROM books WHERE id = p_book_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Book não encontrado: %', p_book_id;
  END IF;

  -- Se já está enviado, retornar a versão existente (idempotente)
  IF v_book.status = 'enviado' THEN
    SELECT id INTO v_versao_existente
    FROM books_versoes
    WHERE book_id = p_book_id
    ORDER BY versao DESC
    LIMIT 1;
    RETURN COALESCE(v_versao_existente, gen_random_uuid());
  END IF;

  -- Aceitar status 'gerado' OU 'desatualizado' para envio
  IF v_book.status NOT IN ('gerado', 'desatualizado') THEN
    RAISE EXCEPTION 'Book precisa estar com status "gerado" ou "desatualizado" para ser enviado. Status atual: %', v_book.status;
  END IF;

  -- Determinar número da versão
  v_versao_numero := COALESCE(v_book.versao_atual, 1);

  -- Verificar se esta versão já existe (caso de re-tentativa)
  SELECT id INTO v_versao_existente
  FROM books_versoes
  WHERE book_id = p_book_id AND versao = v_versao_numero;

  IF v_versao_existente IS NOT NULL THEN
    -- Versão já existe (tentativa anterior parcial) - apenas atualizar status do book
    UPDATE books SET
      status = 'enviado',
      enviado_em = NOW(),
      enviado_por = p_usuario_id,
      destinatarios_envio = p_destinatarios,
      updated_at = NOW()
    WHERE id = p_book_id;

    RETURN v_versao_existente;
  END IF;

  -- Se é retificação (versão > 1), buscar o motivo do histórico de geração
  IF v_versao_numero > 1 THEN
    SELECT (detalhes->>'motivo')::TEXT INTO v_motivo_retificacao
    FROM books_historico_geracao
    WHERE book_id = p_book_id
      AND detalhes->>'tipo' = 'retificacao'
      AND (detalhes->>'nova_versao')::INTEGER = v_versao_numero
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  -- Criar snapshot imutável na tabela de versões
  INSERT INTO books_versoes (
    book_id,
    versao,
    dados_capa,
    dados_volumetria,
    dados_sla,
    dados_backlog,
    dados_consumo,
    dados_pesquisa,
    pdf_url,
    pdf_gerado_em,
    enviado_em,
    enviado_por,
    destinatarios,
    motivo_retificacao,
    retificado_por,
    retificado_em
  ) VALUES (
    p_book_id,
    v_versao_numero,
    v_book.dados_capa,
    v_book.dados_volumetria,
    v_book.dados_sla,
    v_book.dados_backlog,
    v_book.dados_consumo,
    v_book.dados_pesquisa,
    v_book.pdf_url,
    v_book.pdf_gerado_em,
    NOW(),
    p_usuario_id,
    p_destinatarios,
    v_motivo_retificacao,
    CASE WHEN v_versao_numero > 1 THEN p_usuario_id ELSE NULL END,
    CASE WHEN v_versao_numero > 1 THEN NOW() ELSE NULL END
  )
  RETURNING id INTO v_versao_id;

  -- Atualizar status do book para 'enviado' (TRAVA)
  UPDATE books SET
    status = 'enviado',
    enviado_em = NOW(),
    enviado_por = p_usuario_id,
    destinatarios_envio = p_destinatarios,
    updated_at = NOW()
  WHERE id = p_book_id;

  RETURN v_versao_id;
END;
$$;


ALTER FUNCTION "public"."registrar_envio_book"("p_book_id" "uuid", "p_usuario_id" "uuid", "p_destinatarios" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."registrar_envio_book"("p_book_id" "uuid", "p_usuario_id" "uuid", "p_destinatarios" "text"[]) IS 'Registra o envio de um book, criando snapshot imutável em books_versoes e atualizando status. 
Usa SECURITY DEFINER para bypass de RLS nas operações internas. Valida permissão internamente.';



CREATE OR REPLACE FUNCTION "public"."registrar_sincronizacao_pesquisas"("p_tipo_sincronizacao" "text", "p_registros_processados" integer DEFAULT 0, "p_registros_novos" integer DEFAULT 0, "p_detalhes" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$ BEGIN INSERT INTO public.sync_control_pesquisas (tipo_sincronizacao, ultima_sincronizacao, registros_processados, registros_novos, detalhes) VALUES (p_tipo_sincronizacao, NOW(), p_registros_processados, p_registros_novos, p_detalhes) ON CONFLICT (tipo_sincronizacao) DO UPDATE SET ultima_sincronizacao = NOW(), registros_processados = EXCLUDED.registros_processados, registros_novos = EXCLUDED.registros_novos, detalhes = EXCLUDED.detalhes; END; $$;


ALTER FUNCTION "public"."registrar_sincronizacao_pesquisas"("p_tipo_sincronizacao" "text", "p_registros_processados" integer, "p_registros_novos" integer, "p_detalhes" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolver_book_precisa_retificacao"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_notificacao_em TIMESTAMPTZ;
BEGIN
  IF NEW.status = 'enviado'
     AND OLD.status IS DISTINCT FROM 'enviado'
     AND NEW.precisa_retificacao IS TRUE THEN

    SELECT created_at INTO v_notificacao_em
      FROM notificacoes
     WHERE chave = 'book_retificacao:' || NEW.id AND resolvida_em IS NULL;

    IF v_notificacao_em IS NULL OR COALESCE(NEW.pdf_gerado_em, NOW()) >= v_notificacao_em THEN
      PERFORM notificacoes_resolver('book_retificacao:' || NEW.id, 'Book retificado e reenviado');
      NEW.precisa_retificacao := FALSE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."resolver_book_precisa_retificacao"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."schedule_monthly_dispatch"("target_month" integer, "target_year" integer, "schedule_date" timestamp without time zone DEFAULT NULL::timestamp without time zone) RETURNS character varying
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    job_id VARCHAR(255);
    scheduled_at TIMESTAMP;
BEGIN
    -- Gerar ID único para o job
    job_id := 'job_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || substr(md5(random()::text), 1, 9);
    
    -- Usar data fornecida ou calcular próxima data de disparo
    IF schedule_date IS NOT NULL THEN
        scheduled_at := schedule_date;
    ELSE
        -- Agendar para o primeiro dia do mês às 9:00 AM
        scheduled_at := DATE_TRUNC('month', MAKE_DATE(target_year, target_month, 1)) + INTERVAL '9 hours';
    END IF;
    
    -- Inserir job na fila
    INSERT INTO jobs_queue (
        id,
        type,
        status,
        scheduled_at,
        attempts,
        max_attempts,
        payload,
        created_at,
        updated_at
    ) VALUES (
        job_id,
        'monthly_books_dispatch',
        'pending',
        scheduled_at,
        0,
        3,
        jsonb_build_object('mes', target_month, 'ano', target_year),
        NOW(),
        NOW()
    );
    
    RETURN job_id;
END;
$$;


ALTER FUNCTION "public"."schedule_monthly_dispatch"("target_month" integer, "target_year" integer, "schedule_date" timestamp without time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."schedule_monthly_dispatch"("dispatch_type" "text", "target_month" integer, "target_year" integer) RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  schedule_id uuid;
  current_user_id uuid;
BEGIN
  -- Validar parâmetros de entrada
  IF dispatch_type IS NULL OR dispatch_type = '' THEN
    RAISE EXCEPTION 'Tipo de dispatch não pode ser nulo ou vazio';
  END IF;
  
  IF dispatch_type NOT IN ('elogios', 'books', 'relatorios') THEN
    RAISE EXCEPTION 'Tipo de dispatch inválido: %. Valores permitidos: elogios, books, relatorios', dispatch_type;
  END IF;
  
  IF target_month IS NULL OR target_month < 1 OR target_month > 12 THEN
    RAISE EXCEPTION 'Mês inválido: %. Deve estar entre 1 e 12', target_month;
  END IF;
  
  IF target_year IS NULL OR target_year < 2020 OR target_year > 2050 THEN
    RAISE EXCEPTION 'Ano inválido: %. Deve estar entre 2020 e 2050', target_year;
  END IF;
  
  -- Obter usuário atual
  current_user_id := (SELECT auth.uid());
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Gerar ID único para o agendamento
  schedule_id := gen_random_uuid();
  
  -- Tentar inserir o agendamento
  BEGIN
    INSERT INTO scheduled_dispatches (
      id,
      dispatch_type,
      target_month,
      target_year,
      status,
      created_by,
      created_at,
      updated_at
    ) VALUES (
      schedule_id,
      dispatch_type,
      target_month,
      target_year,
      'scheduled',
      current_user_id,
      NOW(),
      NOW()
    );
    
    -- Log de sucesso
    RAISE NOTICE 'Dispatch agendado com sucesso: ID=%, Tipo=%, Mês=%, Ano=%', 
                 schedule_id, dispatch_type, target_month, target_year;
    
  EXCEPTION
    WHEN undefined_table THEN
      -- Se a tabela não existir, apenas retornar o ID sem erro
      RAISE NOTICE 'Tabela scheduled_dispatches não existe. Retornando ID gerado: %', schedule_id;
    WHEN unique_violation THEN
      -- Se já existe um agendamento para o mesmo período
      RAISE EXCEPTION 'Já existe um agendamento para % em %/%', dispatch_type, target_month, target_year;
    WHEN OTHERS THEN
      -- Outros erros
      RAISE EXCEPTION 'Erro ao agendar dispatch: %', SQLERRM;
  END;
  
  RETURN schedule_id;
END;
$$;


ALTER FUNCTION "public"."schedule_monthly_dispatch"("dispatch_type" "text", "target_month" integer, "target_year" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."schedule_monthly_dispatch"("dispatch_type" "text", "target_month" integer, "target_year" integer) IS 'Agenda dispatch mensal para elogios, books ou relatórios. 
Função segura com SECURITY DEFINER e SET search_path = public.
Parâmetros: dispatch_type (elogios|books|relatorios), target_month (1-12), target_year (2020-2050).
Retorna: UUID do agendamento criado.
Requer usuário autenticado.';



CREATE OR REPLACE FUNCTION "public"."set_audit_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.created_at = NOW();
        NEW.created_by = auth.uid();
        NEW.updated_at = NOW();
        NEW.updated_by = auth.uid();
    ELSIF TG_OP = 'UPDATE' THEN
        NEW.updated_at = NOW();
        NEW.updated_by = auth.uid();
        -- Preservar campos de criação
        NEW.created_at = OLD.created_at;
        NEW.created_by = OLD.created_by;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_audit_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_agendamentos_before_write"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at := NOW();

  IF TG_OP = 'INSERT' THEN
    NEW.proxima_execucao := NULL;
  ELSIF NEW.ativo IS DISTINCT FROM OLD.ativo
     OR NEW.frequencia IS DISTINCT FROM OLD.frequencia
     OR NEW.dias_semana IS DISTINCT FROM OLD.dias_semana
     OR NEW.dias_mes IS DISTINCT FROM OLD.dias_mes
     OR NEW.ultimo_dia_mes IS DISTINCT FROM OLD.ultimo_dia_mes
     OR NEW.modo_horario IS DISTINCT FROM OLD.modo_horario
     OR NEW.horarios IS DISTINCT FROM OLD.horarios
     OR NEW.intervalo_horas IS DISTINCT FROM OLD.intervalo_horas
     OR NEW.hora_inicio IS DISTINCT FROM OLD.hora_inicio
     OR NEW.hora_fim IS DISTINCT FROM OLD.hora_fim THEN
    NEW.proxima_execucao := NULL;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_agendamentos_before_write"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_anexo_status_historico"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Função simplificada que não interfere com RLS
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_anexo_status_historico"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_central_escalacao_superiores"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_produto VARCHAR(20);
  v_coordenador RECORD;
BEGIN
  -- Só processar se for Central Escalação
  IF NEW.cargo != 'Central Escalação' THEN
    RETURN NEW;
  END IF;

  -- Buscar todos os produtos da pessoa
  FOR v_produto IN 
    SELECT DISTINCT produto 
    FROM organizacao_produto 
    WHERE pessoa_id = NEW.id
  LOOP
    -- Limpar superiores antigos deste produto
    DELETE FROM organizacao_multiplos_superiores
    WHERE pessoa_id = NEW.id AND produto = v_produto;

    -- Adicionar todos os coordenadores deste produto como superiores
    FOR v_coordenador IN
      SELECT DISTINCT oe.id
      FROM organizacao_estrutura oe
      INNER JOIN organizacao_produto op ON op.pessoa_id = oe.id
      WHERE oe.cargo = 'Coordenador'
        AND op.produto = v_produto
    LOOP
      INSERT INTO organizacao_multiplos_superiores (pessoa_id, superior_id, produto)
      VALUES (NEW.id, v_coordenador.id, v_produto)
      ON CONFLICT (pessoa_id, superior_id, produto) DO NOTHING;
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_central_escalacao_superiores"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_central_escalacao_superiores"() IS 'Sincroniza automaticamente múltiplos superiores para Central Escalação';



CREATE OR REPLACE FUNCTION "public"."sync_last_sign_in"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE profiles
  SET last_sign_in_at = NEW.last_sign_in_at
  WHERE id = NEW.id
    AND (last_sign_in_at IS NULL OR last_sign_in_at < NEW.last_sign_in_at);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_last_sign_in"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_percentual_repasse_to_empresa"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_empresa_id          UUID;
  v_percentual_vigente  DECIMAL(5,2);
BEGIN
  v_empresa_id := COALESCE(NEW.empresa_id, OLD.empresa_id);

  -- Buscar o percentual da vigência atualmente ativa (data_fim IS NULL)
  -- O trigger encerrar_percentual_repasse_anterior já rodou (BEFORE INSERT),
  -- por isso após o INSERT a única linha com data_fim IS NULL é a nova vigência.
  SELECT percentual
    INTO v_percentual_vigente
    FROM percentual_repasse_historico
   WHERE empresa_id = v_empresa_id
     AND data_fim IS NULL
   ORDER BY data_inicio DESC
   LIMIT 1;

  IF v_percentual_vigente IS NOT NULL THEN
    UPDATE empresas_clientes
       SET percentual_repasse_mensal = v_percentual_vigente,
           updated_at = NOW()
     WHERE id = v_empresa_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_percentual_repasse_to_empresa"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_percentual_repasse_to_empresa"() IS 'Sincroniza empresas_clientes.percentual_repasse_mensal com a vigência ativa de percentual_repasse_historico. Garante consistência para código que lê diretamente da tabela empresas_clientes.';



CREATE OR REPLACE FUNCTION "public"."sync_percentual_repasse_to_empresa_on_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_percentual_vigente DECIMAL(5,2);
BEGIN
  -- Após delete, buscar nova vigência ativa
  SELECT percentual
    INTO v_percentual_vigente
    FROM percentual_repasse_historico
   WHERE empresa_id = OLD.empresa_id
     AND data_fim IS NULL
   ORDER BY data_inicio DESC
   LIMIT 1;

  -- Se não há vigência ativa, usar a mais recente encerrada como fallback
  IF v_percentual_vigente IS NULL THEN
    SELECT percentual
      INTO v_percentual_vigente
      FROM percentual_repasse_historico
     WHERE empresa_id = OLD.empresa_id
     ORDER BY data_inicio DESC
     LIMIT 1;
  END IF;

  IF v_percentual_vigente IS NOT NULL THEN
    UPDATE empresas_clientes
       SET percentual_repasse_mensal = v_percentual_vigente,
           updated_at = NOW()
     WHERE id = OLD.empresa_id;
  END IF;

  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."sync_percentual_repasse_to_empresa_on_delete"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_percentual_repasse_to_empresa_on_delete"() IS 'Ao deletar uma vigência de histórico, re-sincroniza empresas_clientes com a vigência ativa restante (ou a mais recente encerrada).';



CREATE OR REPLACE FUNCTION "public"."test_especialistas_security"() RETURNS TABLE("component" "text", "status" "text", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    has_perm BOOLEAN;
    ativos_count INTEGER := 0;
    sql_count INTEGER := 0;
BEGIN
    -- Testar verificação de permissão
    SELECT has_especialistas_permission() INTO has_perm;
    
    RETURN QUERY SELECT 
        'Permission Check'::TEXT,
        CASE WHEN has_perm THEN 'AUTHORIZED' ELSE 'DENIED' END::TEXT,
        CASE 
            WHEN current_setting('role') = 'service_role' THEN 'Service role access granted'
            WHEN auth.uid() IS NULL THEN 'User not authenticated'
            WHEN has_perm THEN 'User has valid permissions'
            ELSE 'User lacks required permissions'
        END::TEXT;
    
    -- Testar funções apenas se autorizado
    IF has_perm THEN
        -- Testar especialistas_ativos()
        BEGIN
            SELECT COUNT(*) INTO ativos_count FROM especialistas_ativos();
            RETURN QUERY SELECT 
                'especialistas_ativos()'::TEXT,
                'SUCCESS'::TEXT,
                format('Returned %s active specialists', ativos_count)::TEXT;
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT 
                'especialistas_ativos()'::TEXT,
                'ERROR'::TEXT,
                SQLERRM::TEXT;
        END;
        
        -- Testar especialistas_sql_server()
        BEGIN
            SELECT COUNT(*) INTO sql_count FROM especialistas_sql_server();
            RETURN QUERY SELECT 
                'especialistas_sql_server()'::TEXT,
                'SUCCESS'::TEXT,
                format('Returned %s SQL Server specialists', sql_count)::TEXT;
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT 
                'especialistas_sql_server()'::TEXT,
                'ERROR'::TEXT,
                SQLERRM::TEXT;
        END;
    ELSE
        RETURN QUERY SELECT 
            'Security Test'::TEXT,
            'BLOCKED'::TEXT,
            'Functions correctly blocked unauthorized access'::TEXT;
    END IF;
END;
$$;


ALTER FUNCTION "public"."test_especialistas_security"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."test_especialistas_security"() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Função de teste para verificar segurança das funções de especialistas.';



CREATE OR REPLACE FUNCTION "public"."trigger_validar_limite_anexos"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF NOT validar_limite_anexos_empresa(NEW.empresa_id) THEN
        RAISE EXCEPTION 'Limite de anexos por empresa excedido';
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_validar_limite_anexos"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."trigger_validar_limite_anexos"() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Trigger para validar limite de anexos.';



CREATE OR REPLACE FUNCTION "public"."update_anexos_temporarios_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_anexos_temporarios_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_apontamentos_aranda_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_apontamentos_aranda_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_apontamentos_tickets_aranda_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_apontamentos_tickets_aranda_updated_at"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_apontamentos_tickets_aranda_updated_at"() IS 'Função de trigger para atualizar updated_at. Usa search_path fixo para evitar vulnerabilidades de segurança.';



CREATE OR REPLACE FUNCTION "public"."update_banco_horas_ajustes_retroativos_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_banco_horas_ajustes_retroativos_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_banco_horas_observacoes_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_banco_horas_observacoes_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_banco_horas_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_banco_horas_updated_at"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_banco_horas_updated_at"() IS 'Função segura com search_path fixo. Atualiza campo updated_at automaticamente';



CREATE OR REPLACE FUNCTION "public"."update_baseline_historico_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_baseline_historico_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_book_gen_queue_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_book_gen_queue_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_books_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_books_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_codigo_resolucao_modificacoes_aranda_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_codigo_resolucao_modificacoes_aranda_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_de_para_categoria_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_de_para_categoria_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_email_test_data_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_email_test_data_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_empresa_anexos_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_empresa_anexos_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_especialistas_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_especialistas_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_group_permissions"("group_id" "uuid", "permissions_data" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    permission_record jsonb;
BEGIN
    -- Qualificar com nome da função para evitar ambiguidade
    DELETE FROM screen_permissions sp
    WHERE sp.group_id = update_group_permissions.group_id;

    FOR permission_record IN SELECT * FROM jsonb_array_elements(update_group_permissions.permissions_data)
    LOOP
        INSERT INTO screen_permissions (group_id, screen_key, permission_level)
        VALUES (
            update_group_permissions.group_id,
            permission_record->>'screen_key',
            permission_record->>'permission_level'
        );
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."update_group_permissions"("group_id" "uuid", "permissions_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_group_permissions"("group_uuid" "uuid", "screen_key" character varying, "permission_level" character varying) RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF update_group_permissions.group_uuid IS NULL 
       OR update_group_permissions.screen_key IS NULL 
       OR update_group_permissions.permission_level IS NULL THEN
        RAISE EXCEPTION 'Todos os parâmetros são obrigatórios';
    END IF;

    IF NOT has_screen_permission('grupos'::varchar, 'edit'::varchar) THEN
        RAISE EXCEPTION 'Sem permissão para alterar permissões de grupos';
    END IF;

    INSERT INTO screen_permissions (group_id, screen_key, permission_level)
    VALUES (
        update_group_permissions.group_uuid, 
        update_group_permissions.screen_key, 
        update_group_permissions.permission_level
    )
    ON CONFLICT (group_id, screen_key)
    DO UPDATE SET permission_level = EXCLUDED.permission_level;

    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."update_group_permissions"("group_uuid" "uuid", "screen_key" character varying, "permission_level" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_group_permissions"("group_uuid" "uuid", "screen_key" character varying, "permission_level" character varying) IS 'FORÇA BRUTA: Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Atualiza permissões de grupo.';



CREATE OR REPLACE FUNCTION "public"."update_historico_inconsistencias_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_historico_inconsistencias_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_last_sign_in"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE profiles
  SET last_sign_in_at = NOW()
  WHERE id = (SELECT auth.uid());
END;
$$;


ALTER FUNCTION "public"."update_last_sign_in"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_percentual_repasse_historico_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_percentual_repasse_historico_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_pesquisa_data_resposta"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Buscar data_resposta da pesquisa relacionada
  SELECT p.data_resposta
    INTO NEW.data_resposta
  FROM public.pesquisas_satisfacao p
  WHERE p.id = NEW.pesquisa_id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_pesquisa_data_resposta"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_pesquisa_mensal_ams_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_pesquisa_mensal_ams_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_pesquisas_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_pesquisas_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_plano_acao_contatos_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_plano_acao_contatos_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_requerimento_anexos_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_requerimento_anexos_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_sync_control_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_sync_control_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_taxas_clientes_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- ✅ CORRIGIDO: usar atualizado_em em vez de updated_at
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_taxas_clientes_updated_at"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_taxas_clientes_updated_at"() IS 'Atualiza automaticamente o campo atualizado_em nas tabelas taxas_clientes e valores_taxas_funcoes';



CREATE OR REPLACE FUNCTION "public"."update_taxas_padrao_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_taxas_padrao_updated_at"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_taxas_padrao_updated_at"() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Trigger para atualizar campo atualizado_em automaticamente.';



CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_updated_at_column"() IS 'Função padrão para atualizar campo updated_at. Usa SECURITY DEFINER e search_path fixo para segurança.';



CREATE OR REPLACE FUNCTION "public"."user_can_access_baseline_historico"() RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Permitir acesso para usuários autenticados com permissão
  RETURN EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN user_groups ug ON uga.group_id = ug.id
    JOIN screen_permissions sp ON sp.group_id = ug.id
    WHERE uga.user_id = (SELECT auth.uid())
      AND sp.screen_key IN (
        'cadastro_empresas', 
        'controle_banco_horas', 
        'admin', 
        'gerenciar_empresas',
        'visualizar_empresas',
        'dashboard'
      )
      AND sp.permission_level IN ('view', 'edit')
  );
END;
$$;


ALTER FUNCTION "public"."user_can_access_baseline_historico"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_can_access_percentual_repasse_historico"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles p
    JOIN user_group_assignments uga ON p.id = uga.user_id
    JOIN user_groups ug ON uga.group_id = ug.id
    JOIN screen_permissions sp ON sp.group_id = ug.id
    WHERE p.id = (SELECT auth.uid())
      AND sp.screen_key IN ('cadastro_empresas', 'controle_banco_horas', 'admin')
      AND sp.permission_level IN ('view', 'edit')
  );
END;
$$;


ALTER FUNCTION "public"."user_can_access_percentual_repasse_historico"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."user_can_access_percentual_repasse_historico"() IS 'Verifica se o usuário autenticado tem permissão para acessar percentual_repasse_historico. SECURITY DEFINER para consultar tabelas de permissões.';



CREATE OR REPLACE FUNCTION "public"."user_can_manage_banco_horas"() RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Verifica se usuário tem permissão para gerenciar banco de horas
  -- Usa caminho correto: profiles → user_group_assignments → screen_permissions
  -- Aceita usuários com permissão 'edit' ou 'view' na tela 'controle_banco_horas'
  RETURN EXISTS (
    SELECT 1
    FROM profiles p
    JOIN user_group_assignments uga ON p.id = uga.user_id
    JOIN screen_permissions sp ON sp.group_id = uga.group_id
    WHERE p.id = (SELECT auth.uid())
      AND sp.screen_key = 'controle_banco_horas'
      AND sp.permission_level IN ('view', 'edit')
  );
END;
$$;


ALTER FUNCTION "public"."user_can_manage_banco_horas"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."user_can_manage_banco_horas"() IS 'Verifica se usuário autenticado tem permissão para gerenciar banco de horas. 
Usa caminho correto: profiles → user_group_assignments → screen_permissions.
Usa SECURITY DEFINER e search_path fixo para segurança.';



CREATE OR REPLACE FUNCTION "public"."user_can_manage_permissions"() RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Usuários autenticados podem ler suas próprias permissões
  -- Apenas administradores podem modificar
  RETURN EXISTS (
    SELECT 1
    FROM profiles p
    JOIN user_group_assignments uga ON p.id = uga.user_id
    JOIN user_groups ug ON uga.group_id = ug.id
    WHERE p.id = (SELECT auth.uid())
      AND ug.name = 'Administradores'
  );
END;
$$;


ALTER FUNCTION "public"."user_can_manage_permissions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_banco_horas_permission"() RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN user_groups ug ON uga.group_id = ug.id
    JOIN screen_permissions sp ON sp.group_id = ug.id
    WHERE uga.user_id = current_user_id
      AND sp.screen_key IN (
        'controle_banco_horas',
        'banco_horas_alocacoes',
        'banco_horas_visao_consolidada',
        'banco_horas_visao_segmentada',
        'banco_horas_ajustes_retroativos'
      )
      AND sp.permission_level IN ('view', 'edit')
  );
END;
$$;


ALTER FUNCTION "public"."user_has_banco_horas_permission"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."user_has_banco_horas_permission"() IS 'Verifica permissão de banco de horas através de user_group_assignments - Corrigido em 2026-03-03';



CREATE OR REPLACE FUNCTION "public"."user_has_baseline_permission"() RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Verificar se usuário tem permissão para gerenciar baseline
  -- (usuários autenticados com permissão na tela de empresas)
  RETURN EXISTS (
    SELECT 1
    FROM profiles p
    JOIN user_group_assignments uga ON p.id = uga.user_id
    JOIN user_groups ug ON uga.group_id = ug.id
    JOIN screen_permissions sp ON sp.group_id = ug.id
    WHERE p.id = (SELECT auth.uid())
      AND sp.screen_key IN ('empresas_clientes', 'EMPRESAS_CLIENTES')
      AND sp.permission_level IN ('view', 'edit')
  );
END;
$$;


ALTER FUNCTION "public"."user_has_baseline_permission"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."user_has_baseline_permission"() IS 'Verifica se o usuário autenticado tem permissão para gerenciar baseline de empresas.
Usa (SELECT auth.uid()) para melhor performance.';



CREATE OR REPLACE FUNCTION "public"."user_has_books_permission"("required_level" "text" DEFAULT 'view'::"text") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Service role sempre tem acesso
  IF current_setting('role', true) = 'service_role' THEN
    RETURN true;
  END IF;

  -- Verificar se usuário tem permissão
  RETURN EXISTS (
    SELECT 1
    FROM profiles p
    JOIN user_group_assignments uga ON p.id = uga.user_id
    JOIN user_groups ug ON uga.group_id = ug.id
    JOIN screen_permissions sp ON sp.group_id = ug.id
    WHERE p.id = (SELECT auth.uid())
      AND sp.screen_key = 'geracao_books'
      AND (
        (required_level = 'view' AND sp.permission_level IN ('view', 'edit')) OR
        (required_level = 'edit' AND sp.permission_level = 'edit')
      )
  );
END;
$$;


ALTER FUNCTION "public"."user_has_books_permission"("required_level" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."user_has_books_permission"("required_level" "text") IS 'Verifica se usuário autenticado tem permissão específica na tela GERACAO_BOOKS. Usa SECURITY DEFINER e search_path fixo para segurança.';



CREATE OR REPLACE FUNCTION "public"."user_has_organograma_permission"("required_level" "text" DEFAULT 'view'::"text") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_user_id UUID;
  has_permission BOOLEAN;
BEGIN
  -- Obter ID do usuário autenticado
  current_user_id := (SELECT auth.uid());
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verificar permissão através de user_group_assignments
  SELECT EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN user_groups ug ON uga.group_id = ug.id
    JOIN screen_permissions sp ON sp.group_id = ug.id
    WHERE uga.user_id = current_user_id
      AND sp.screen_key = 'organograma'
      AND (
        (required_level = 'view' AND sp.permission_level IN ('view', 'edit')) OR
        (required_level = 'edit' AND sp.permission_level = 'edit')
      )
  ) INTO has_permission;
  
  RETURN COALESCE(has_permission, false);
END;
$$;


ALTER FUNCTION "public"."user_has_organograma_permission"("required_level" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."user_has_organograma_permission"("required_level" "text") IS 'Verifica permissão de organograma. Usa current_user_id para evitar ambiguidade.';



CREATE OR REPLACE FUNCTION "public"."user_has_permission"("user_uuid" "uuid", "screen_key" character varying, "permission_level" character varying) RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_group_assignments uga
        JOIN screen_permissions sp ON uga.group_id = sp.group_id
        WHERE uga.user_id = user_has_permission.user_uuid
          AND sp.screen_key = user_has_permission.screen_key
          AND sp.permission_level = user_has_permission.permission_level
    );
END;
$$;


ALTER FUNCTION "public"."user_has_permission"("user_uuid" "uuid", "screen_key" character varying, "permission_level" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_requerimentos_permission"("required_level" "text" DEFAULT 'view'::"text") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_permission text;
BEGIN
  -- Verificar se o usuário tem permissão para a tela de requerimentos
  -- Usando user_group_assignments para relacionar usuário com grupo
  SELECT sp.permission_level INTO user_permission
  FROM user_group_assignments uga
  JOIN user_groups ug ON uga.group_id = ug.id
  JOIN screen_permissions sp ON sp.group_id = ug.id
  WHERE uga.user_id = auth.uid()
    AND sp.screen_key = 'lancar_requerimentos'
  LIMIT 1;
  
  -- Se não encontrou permissão, retornar false
  IF user_permission IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verificar nível de permissão
  CASE required_level
    WHEN 'view' THEN RETURN user_permission IN ('view', 'edit', 'admin');
    WHEN 'edit' THEN RETURN user_permission IN ('edit', 'admin');
    WHEN 'admin' THEN RETURN user_permission = 'admin';
    ELSE RETURN false;
  END CASE;
END;
$$;


ALTER FUNCTION "public"."user_has_requerimentos_permission"("required_level" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_screen_permission"("required_screen" "text", "required_level" "text" DEFAULT 'view'::"text") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_uuid UUID;
  has_permission BOOLEAN := FALSE;
BEGIN
  -- Obter o UUID do usuário autenticado
  user_uuid := (SELECT auth.uid());
  
  -- Se não há usuário autenticado, negar acesso
  IF user_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar se o usuário tem permissão (OTIMIZADO com SELECT)
  SELECT EXISTS (
    SELECT 1 
    FROM user_group_assignments uga
    JOIN screen_permissions sp ON uga.group_id = sp.group_id
    WHERE uga.user_id = user_uuid
      AND sp.screen_key = required_screen
      AND (
        (required_level = 'view' AND sp.permission_level IN ('view', 'edit')) OR
        (required_level = 'edit' AND sp.permission_level = 'edit')
      )
  ) INTO has_permission;
  
  RETURN has_permission;
END;
$$;


ALTER FUNCTION "public"."user_has_screen_permission"("required_screen" "text", "required_level" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."user_has_screen_permission"("required_screen" "text", "required_level" "text") IS 'Função otimizada para verificar permissões de tela. Usa (SELECT auth.uid()) para performance.';



CREATE OR REPLACE FUNCTION "public"."user_is_admin"() RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_uuid UUID;
  is_admin BOOLEAN := FALSE;
BEGIN
  -- Obter o UUID do usuário autenticado
  user_uuid := (SELECT auth.uid());
  
  -- Se não há usuário autenticado, negar acesso
  IF user_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar se o usuário é administrador (OTIMIZADO)
  SELECT EXISTS (
    SELECT 1 
    FROM user_group_assignments uga
    JOIN user_groups ug ON uga.group_id = ug.id
    WHERE uga.user_id = user_uuid
      AND ug.name IN ('Administradores', 'Admin', 'Administrador')
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$$;


ALTER FUNCTION "public"."user_is_admin"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."user_is_admin"() IS 'Função otimizada para verificar se usuário é administrador. Usa (SELECT auth.uid()) para performance.';



CREATE OR REPLACE FUNCTION "public"."user_is_admin"("user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_group_assignments uga
        JOIN user_groups ug ON uga.group_id = ug.id
        WHERE uga.user_id = user_uuid AND ug.is_default_admin = true
    );
END;
$$;


ALTER FUNCTION "public"."user_is_admin"("user_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."user_is_admin"("user_uuid" "uuid") IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Verifica se usuário é administrador do sistema.';



CREATE OR REPLACE FUNCTION "public"."validar_causa_plano_acao"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Se data_conclusao estiver preenchida, causa é obrigatória
  IF NEW.data_conclusao IS NOT NULL AND (NEW.causa IS NULL OR TRIM(NEW.causa) = '') THEN
    RAISE EXCEPTION 'Campo "causa" é obrigatório quando a data de conclusão está preenchida';
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validar_causa_plano_acao"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validar_causa_plano_acao"() IS 'Valida que o campo causa seja preenchido quando data_conclusao existir';



CREATE OR REPLACE FUNCTION "public"."validar_limite_anexos_empresa"("empresa_id" "uuid", "tamanho_anexo" integer) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  DECLARE
    limite_mb integer;
    total_usado_mb numeric;
    novo_total_mb numeric;
  BEGIN
    -- Buscar limite da empresa
    SELECT COALESCE(limite_anexos_mb, 25) INTO limite_mb
    FROM empresas_clientes 
    WHERE id = empresa_id;
    
    -- Calcular total já usado (em MB)
    SELECT COALESCE(SUM(tamanho_bytes), 0) / (1024 * 1024) INTO total_usado_mb
    FROM anexos_pesquisas ap
    JOIN pesquisas p ON ap.pesquisa_id = p.id
    WHERE p.empresa_id = empresa_id;
    
    -- Calcular novo total com o anexo atual
    novo_total_mb := total_usado_mb + (tamanho_anexo / (1024 * 1024));
    
    -- Retornar se está dentro do limite
    RETURN novo_total_mb <= limite_mb;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN false;
  END;
  $$;


ALTER FUNCTION "public"."validar_limite_anexos_empresa"("empresa_id" "uuid", "tamanho_anexo" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validar_segmentacao_baseline"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  total_percentual DECIMAL(5,2);
  empresa_record JSONB;
BEGIN
  -- Se baseline_segmentado está ativo, validar configuração
  IF NEW.baseline_segmentado = TRUE THEN
    -- Verificar se segmentacao_config existe
    IF NEW.segmentacao_config IS NULL OR NEW.segmentacao_config->>'empresas' IS NULL THEN
      RAISE EXCEPTION 'Configuração de segmentação é obrigatória quando baseline_segmentado está ativo';
    END IF;

    -- Calcular soma dos percentuais
    total_percentual := 0;
    FOR empresa_record IN SELECT * FROM jsonb_array_elements(NEW.segmentacao_config->'empresas')
    LOOP
      total_percentual := total_percentual + (empresa_record->>'percentual')::DECIMAL(5,2);
    END LOOP;

    -- Validar se soma é 100%
    IF total_percentual != 100 THEN
      RAISE EXCEPTION 'A soma dos percentuais deve ser exatamente 100%%. Soma atual: %', total_percentual;
    END IF;

    -- Validar se há pelo menos 2 empresas
    IF jsonb_array_length(NEW.segmentacao_config->'empresas') < 2 THEN
      RAISE EXCEPTION 'É necessário configurar pelo menos 2 empresas para segmentação';
    END IF;

    -- Validar campos obrigatórios de cada empresa
    FOR empresa_record IN SELECT * FROM jsonb_array_elements(NEW.segmentacao_config->'empresas')
    LOOP
      IF empresa_record->>'nome' IS NULL OR empresa_record->>'nome' = '' THEN
        RAISE EXCEPTION 'Nome da empresa segmentada é obrigatório';
      END IF;
      
      IF empresa_record->>'percentual' IS NULL THEN
        RAISE EXCEPTION 'Percentual é obrigatório para cada empresa segmentada';
      END IF;
      
      IF empresa_record->>'filtro_tipo' IS NULL OR empresa_record->>'filtro_tipo' = '' THEN
        RAISE EXCEPTION 'Tipo de filtro é obrigatório para cada empresa segmentada';
      END IF;
      
      IF empresa_record->>'filtro_valor' IS NULL OR empresa_record->>'filtro_valor' = '' THEN
        RAISE EXCEPTION 'Valor do filtro é obrigatório para cada empresa segmentada';
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validar_segmentacao_baseline"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validar_vigencias"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    -- Validar se vigência inicial não é posterior à final
    IF NEW.vigencia_inicial IS NOT NULL AND NEW.vigencia_final IS NOT NULL THEN
        IF NEW.vigencia_inicial > NEW.vigencia_final THEN
            RAISE EXCEPTION 'A vigência inicial não pode ser posterior à vigência final';
        END IF;
    END IF;

    -- Se está definindo uma vigência final no passado e status é ativo, alertar
    IF NEW.vigencia_final IS NOT NULL AND NEW.vigencia_final < CURRENT_DATE AND NEW.status = 'ativo' THEN
        -- Permitir, mas registrar no log
        BEGIN
            INSERT INTO public.logs_sistema (
                operacao,
                detalhes,
                data_operacao
            ) VALUES (
                'vigencia_passado_definida',
                'Empresa ' || NEW.nome_completo || ' (ID: ' || NEW.id || ') teve vigência final definida no passado: ' || NEW.vigencia_final,
                NOW()
            );
        EXCEPTION
            WHEN OTHERS THEN
                -- Se não conseguir logar, continuar normalmente
                NULL;
        END;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validar_vigencias"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_alocacoes_percentual"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  total_percentual INTEGER;
BEGIN
  -- Calcular soma dos percentuais ativos (excluindo o registro atual se for UPDATE)
  SELECT COALESCE(SUM(percentual_baseline), 0)
  INTO total_percentual
  FROM banco_horas_alocacoes
  WHERE empresa_id = NEW.empresa_id
    AND ativo = true
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
  
  -- Validar que soma = 100%
  IF (total_percentual + NEW.percentual_baseline) != 100 THEN
    RAISE EXCEPTION 'Soma dos percentuais deve ser exatamente 100%%. Atual: %', (total_percentual + NEW.percentual_baseline);
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_alocacoes_percentual"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_alocacoes_percentual"() IS 'Função segura com search_path fixo. Valida que soma de percentuais de alocações = 100%';



CREATE OR REPLACE FUNCTION "public"."validate_empresa_segmentacao_nome"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Se empresa_segmentacao_nome foi informado, validar que não está vazio
  IF NEW.empresa_segmentacao_nome IS NOT NULL AND trim(NEW.empresa_segmentacao_nome) = '' THEN
    RAISE EXCEPTION 'Nome da empresa de segmentação não pode ser vazio';
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_empresa_segmentacao_nome"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_especialista_sql_server"("especialista_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  DECLARE
    is_valid boolean := false;
  BEGIN
    -- Verificar se especialista existe e está ativo
    SELECT EXISTS(
      SELECT 1 
      FROM especialistas_sql_server 
      WHERE nome = especialista_name 
        AND ativo = true
    ) INTO is_valid;
    
    RETURN is_valid;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Tabela especialistas_sql_server não existe: %', SQLERRM;
      RETURN false;
  END;
  $$;


ALTER FUNCTION "public"."validate_especialista_sql_server"("especialista_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_organizacao_produto_hierarchy"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_cargo TEXT;
BEGIN
  -- Se não há superior, sempre válido
  IF NEW.superior_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Buscar cargo da pessoa
  SELECT cargo INTO v_cargo
  FROM organizacao_estrutura
  WHERE id = NEW.pessoa_id;
  
  -- Diretor não pode ter superior
  IF v_cargo = 'Diretor' THEN
    RAISE EXCEPTION 'Diretor não pode ter superior em nenhum produto';
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_organizacao_produto_hierarchy"() OWNER TO "postgres";


CREATE FOREIGN DATA WRAPPER "anexos_temporarios_fdw" HANDLER "extensions"."iceberg_fdw_handler" VALIDATOR "extensions"."iceberg_fdw_validator";




CREATE SERVER "anexos_temporarios_fdw_server" FOREIGN DATA WRAPPER "anexos_temporarios_fdw" OPTIONS (
    "catalog_uri" 'https://qiahexepsdggkzgmklhq.storage.supabase.co/storage/v1/iceberg',
    "s3.endpoint" 'https://qiahexepsdggkzgmklhq.storage.supabase.co/storage/v1/s3',
    "vault_aws_access_key_id" '<id do segredo no Vault>',
    "vault_aws_secret_access_key" '<id do segredo no Vault>',
    "vault_token" '<id do segredo no Vault>',
    "warehouse" 'anexos-temporarios'
);


ALTER SERVER "anexos_temporarios_fdw_server" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "backups"."admin_notifications_backup" (
    "id" character varying(255),
    "type" character varying(50),
    "title" character varying(500),
    "message" "text",
    "severity" character varying(20),
    "source" character varying(100),
    "context" "jsonb",
    "read_at" timestamp without time zone,
    "created_at" timestamp without time zone,
    "backup_id" bigint NOT NULL
);


ALTER TABLE "backups"."admin_notifications_backup" OWNER TO "postgres";


COMMENT ON TABLE "backups"."admin_notifications_backup" IS 'Backup criado em 18/02/2026 antes da migration de timezone';



CREATE SEQUENCE IF NOT EXISTS "backups"."admin_notifications_backup_backup_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "backups"."admin_notifications_backup_backup_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "backups"."admin_notifications_backup_backup_id_seq" OWNED BY "backups"."admin_notifications_backup"."backup_id";



CREATE TABLE IF NOT EXISTS "backups"."anexos_temporarios_backup" (
    "id" "uuid",
    "empresa_id" "uuid",
    "nome_original" character varying(255),
    "nome_arquivo" character varying(255),
    "tipo_mime" character varying(100),
    "tamanho_bytes" integer,
    "url_temporaria" "text",
    "url_permanente" "text",
    "status" character varying(20),
    "token_acesso" "text",
    "data_upload" timestamp without time zone,
    "data_expiracao" timestamp without time zone,
    "data_processamento" timestamp without time zone,
    "erro_detalhes" "text",
    "created_at" timestamp without time zone,
    "updated_at" timestamp without time zone,
    "backup_id" bigint NOT NULL
);


ALTER TABLE "backups"."anexos_temporarios_backup" OWNER TO "postgres";


COMMENT ON TABLE "backups"."anexos_temporarios_backup" IS 'Backup criado em 18/02/2026 antes da migration de timezone';



CREATE SEQUENCE IF NOT EXISTS "backups"."anexos_temporarios_backup_backup_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "backups"."anexos_temporarios_backup_backup_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "backups"."anexos_temporarios_backup_backup_id_seq" OWNED BY "backups"."anexos_temporarios_backup"."backup_id";



CREATE TABLE IF NOT EXISTS "backups"."baseline_historico_backup" (
    "id" "uuid",
    "empresa_id" "uuid",
    "baseline_horas" numeric(10,2),
    "baseline_tickets" integer,
    "data_inicio" "date",
    "data_fim" "date",
    "motivo" "text",
    "observacao" "text",
    "created_at" timestamp without time zone,
    "created_by" "uuid",
    "updated_at" timestamp without time zone,
    "updated_by" "uuid",
    "backup_id" bigint NOT NULL
);


ALTER TABLE "backups"."baseline_historico_backup" OWNER TO "postgres";


COMMENT ON TABLE "backups"."baseline_historico_backup" IS 'Backup criado em 18/02/2026 antes da migration de timezone';



CREATE SEQUENCE IF NOT EXISTS "backups"."baseline_historico_backup_backup_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "backups"."baseline_historico_backup_backup_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "backups"."baseline_historico_backup_backup_id_seq" OWNED BY "backups"."baseline_historico_backup"."backup_id";



CREATE TABLE IF NOT EXISTS "backups"."clientes_backup" (
    "id" "uuid",
    "nome_completo" character varying(255),
    "email" character varying(255),
    "funcao" character varying(100),
    "empresa_id" "uuid",
    "status" character varying(20),
    "data_status" timestamp without time zone,
    "descricao_status" "text",
    "principal_contato" boolean,
    "created_at" timestamp without time zone,
    "updated_at" timestamp without time zone,
    "backup_id" bigint NOT NULL
);


ALTER TABLE "backups"."clientes_backup" OWNER TO "postgres";


COMMENT ON TABLE "backups"."clientes_backup" IS 'Backup criado em 18/02/2026 antes da migration de timezone';



CREATE SEQUENCE IF NOT EXISTS "backups"."clientes_backup_backup_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "backups"."clientes_backup_backup_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "backups"."clientes_backup_backup_id_seq" OWNED BY "backups"."clientes_backup"."backup_id";



CREATE TABLE IF NOT EXISTS "backups"."controle_mensal_backup" (
    "id" "uuid",
    "mes" integer,
    "ano" integer,
    "empresa_id" "uuid",
    "status" character varying(20),
    "data_processamento" timestamp without time zone,
    "observacoes" "text",
    "created_at" timestamp without time zone,
    "backup_id" bigint NOT NULL
);


ALTER TABLE "backups"."controle_mensal_backup" OWNER TO "postgres";


COMMENT ON TABLE "backups"."controle_mensal_backup" IS 'Backup criado em 18/02/2026 antes da migration de timezone';



CREATE SEQUENCE IF NOT EXISTS "backups"."controle_mensal_backup_backup_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "backups"."controle_mensal_backup_backup_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "backups"."controle_mensal_backup_backup_id_seq" OWNED BY "backups"."controle_mensal_backup"."backup_id";



CREATE TABLE IF NOT EXISTS "backups"."empresa_grupos_backup" (
    "id" "uuid",
    "empresa_id" "uuid",
    "grupo_id" "uuid",
    "created_at" timestamp without time zone,
    "backup_id" bigint NOT NULL
);


ALTER TABLE "backups"."empresa_grupos_backup" OWNER TO "postgres";


COMMENT ON TABLE "backups"."empresa_grupos_backup" IS 'Backup criado em 18/02/2026 antes da migration de timezone';



CREATE SEQUENCE IF NOT EXISTS "backups"."empresa_grupos_backup_backup_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "backups"."empresa_grupos_backup_backup_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "backups"."empresa_grupos_backup_backup_id_seq" OWNED BY "backups"."empresa_grupos_backup"."backup_id";



CREATE TABLE IF NOT EXISTS "backups"."empresa_produtos_backup" (
    "id" "uuid",
    "empresa_id" "uuid",
    "produto" character varying(50),
    "created_at" timestamp without time zone,
    "backup_id" bigint NOT NULL
);


ALTER TABLE "backups"."empresa_produtos_backup" OWNER TO "postgres";


COMMENT ON TABLE "backups"."empresa_produtos_backup" IS 'Backup criado em 18/02/2026 antes da migration de timezone';



CREATE SEQUENCE IF NOT EXISTS "backups"."empresa_produtos_backup_backup_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "backups"."empresa_produtos_backup_backup_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "backups"."empresa_produtos_backup_backup_id_seq" OWNED BY "backups"."empresa_produtos_backup"."backup_id";



CREATE TABLE IF NOT EXISTS "backups"."empresas_clientes_backup" (
    "id" "uuid",
    "nome_completo" character varying(255),
    "nome_abreviado" character varying(100),
    "link_sharepoint" "text",
    "template_padrao" character varying(255),
    "status" character varying(20),
    "data_status" timestamp without time zone,
    "descricao_status" "text",
    "email_gestor" character varying(255),
    "created_at" timestamp without time zone,
    "updated_at" timestamp without time zone,
    "book_personalizado" boolean,
    "anexo" boolean,
    "vigencia_inicial" "date",
    "vigencia_final" "date",
    "tem_ams" boolean,
    "tipo_book" "public"."tipo_book_enum",
    "tipo_cobranca" "public"."tipo_cobranca_enum",
    "observacao" "text",
    "em_projeto" boolean,
    "tipo_contrato" character varying(10),
    "periodo_apuracao" integer,
    "inicio_vigencia" "date",
    "baseline_horas_mensal" interval,
    "baseline_tickets_mensal" numeric(10,2),
    "possui_repasse_especial" boolean,
    "ciclos_para_zerar" integer,
    "percentual_repasse_mensal" integer,
    "ciclo_atual" integer,
    "percentual_repasse_especial" integer,
    "baseline_segmentado" boolean,
    "segmentacao_config" "jsonb",
    "meta_sla_percentual" numeric(5,2),
    "quantidade_minima_chamados_sla" integer,
    "backup_id" bigint NOT NULL
);


ALTER TABLE "backups"."empresas_clientes_backup" OWNER TO "postgres";


COMMENT ON TABLE "backups"."empresas_clientes_backup" IS 'Backup criado em 18/02/2026 antes da migration de timezone';



CREATE SEQUENCE IF NOT EXISTS "backups"."empresas_clientes_backup_backup_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "backups"."empresas_clientes_backup_backup_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "backups"."empresas_clientes_backup_backup_id_seq" OWNED BY "backups"."empresas_clientes_backup"."backup_id";



CREATE TABLE IF NOT EXISTS "backups"."grupo_emails_backup" (
    "id" "uuid",
    "grupo_id" "uuid",
    "email" character varying(255),
    "nome" character varying(255),
    "created_at" timestamp without time zone,
    "backup_id" bigint NOT NULL
);


ALTER TABLE "backups"."grupo_emails_backup" OWNER TO "postgres";


COMMENT ON TABLE "backups"."grupo_emails_backup" IS 'Backup criado em 18/02/2026 antes da migration de timezone';



CREATE SEQUENCE IF NOT EXISTS "backups"."grupo_emails_backup_backup_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "backups"."grupo_emails_backup_backup_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "backups"."grupo_emails_backup_backup_id_seq" OWNED BY "backups"."grupo_emails_backup"."backup_id";



CREATE TABLE IF NOT EXISTS "backups"."grupos_responsaveis_backup" (
    "id" "uuid",
    "nome" character varying(100),
    "descricao" "text",
    "created_at" timestamp without time zone,
    "updated_at" timestamp without time zone,
    "backup_id" bigint NOT NULL
);


ALTER TABLE "backups"."grupos_responsaveis_backup" OWNER TO "postgres";


COMMENT ON TABLE "backups"."grupos_responsaveis_backup" IS 'Backup criado em 18/02/2026 antes da migration de timezone';



CREATE SEQUENCE IF NOT EXISTS "backups"."grupos_responsaveis_backup_backup_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "backups"."grupos_responsaveis_backup_backup_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "backups"."grupos_responsaveis_backup_backup_id_seq" OWNED BY "backups"."grupos_responsaveis_backup"."backup_id";



CREATE TABLE IF NOT EXISTS "backups"."historico_disparos_backup" (
    "id" "uuid",
    "empresa_id" "uuid",
    "colaborador_id" "uuid",
    "template_id" "uuid",
    "status" character varying(20),
    "data_disparo" timestamp without time zone,
    "data_agendamento" timestamp without time zone,
    "erro_detalhes" "text",
    "assunto" character varying(500),
    "emails_cc" "text"[],
    "created_at" timestamp without time zone,
    "cliente_id" "uuid",
    "anexo_id" "uuid",
    "anexo_processado" boolean,
    "backup_id" bigint NOT NULL
);


ALTER TABLE "backups"."historico_disparos_backup" OWNER TO "postgres";


COMMENT ON TABLE "backups"."historico_disparos_backup" IS 'Backup criado em 18/02/2026 antes da migration de timezone';



CREATE SEQUENCE IF NOT EXISTS "backups"."historico_disparos_backup_backup_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "backups"."historico_disparos_backup_backup_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "backups"."historico_disparos_backup_backup_id_seq" OWNED BY "backups"."historico_disparos_backup"."backup_id";



CREATE TABLE IF NOT EXISTS "backups"."job_configurations_backup" (
    "id" integer,
    "key" character varying(100),
    "value" "jsonb",
    "description" "text",
    "created_at" timestamp without time zone,
    "updated_at" timestamp without time zone,
    "backup_id" bigint NOT NULL
);


ALTER TABLE "backups"."job_configurations_backup" OWNER TO "postgres";


COMMENT ON TABLE "backups"."job_configurations_backup" IS 'Backup criado em 18/02/2026 antes da migration de timezone';



CREATE SEQUENCE IF NOT EXISTS "backups"."job_configurations_backup_backup_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "backups"."job_configurations_backup_backup_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "backups"."job_configurations_backup_backup_id_seq" OWNED BY "backups"."job_configurations_backup"."backup_id";



CREATE TABLE IF NOT EXISTS "backups"."jobs_queue_backup" (
    "id" character varying(255),
    "type" character varying(50),
    "status" character varying(20),
    "scheduled_at" timestamp without time zone,
    "started_at" timestamp without time zone,
    "completed_at" timestamp without time zone,
    "attempts" integer,
    "max_attempts" integer,
    "last_error" "text",
    "payload" "jsonb",
    "result" "jsonb",
    "created_at" timestamp without time zone,
    "updated_at" timestamp without time zone,
    "backup_id" bigint NOT NULL
);


ALTER TABLE "backups"."jobs_queue_backup" OWNER TO "postgres";


COMMENT ON TABLE "backups"."jobs_queue_backup" IS 'Backup criado em 18/02/2026 antes da migration de timezone';



CREATE SEQUENCE IF NOT EXISTS "backups"."jobs_queue_backup_backup_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "backups"."jobs_queue_backup_backup_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "backups"."jobs_queue_backup_backup_id_seq" OWNED BY "backups"."jobs_queue_backup"."backup_id";



CREATE TABLE IF NOT EXISTS "backups"."logs_sistema_backup" (
    "id" "uuid",
    "operacao" character varying(100),
    "detalhes" "text",
    "data_operacao" timestamp without time zone,
    "backup_id" bigint NOT NULL
);


ALTER TABLE "backups"."logs_sistema_backup" OWNER TO "postgres";


COMMENT ON TABLE "backups"."logs_sistema_backup" IS 'Backup criado em 18/02/2026 antes da migration de timezone';



CREATE SEQUENCE IF NOT EXISTS "backups"."logs_sistema_backup_backup_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "backups"."logs_sistema_backup_backup_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "backups"."logs_sistema_backup_backup_id_seq" OWNED BY "backups"."logs_sistema_backup"."backup_id";



CREATE TABLE IF NOT EXISTS "backups"."pesquisas_satisfacao_backup" (
    "id" "uuid",
    "origem" "public"."origem_pesquisa_enum",
    "id_externo" "text",
    "empresa" "text",
    "categoria" "text",
    "grupo" "text",
    "cliente" "text",
    "email_cliente" "text",
    "prestador" "text",
    "nro_caso" "text",
    "tipo_caso" "text",
    "ano_abertura" integer,
    "mes_abertura" integer,
    "data_resposta" timestamp without time zone,
    "resposta" "text",
    "comentario_pesquisa" "text",
    "empresa_id" "uuid",
    "cliente_id" "uuid",
    "status" "public"."status_pesquisa_enum",
    "data_envio" timestamp without time zone,
    "autor_id" "uuid",
    "autor_nome" "text",
    "observacao" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "tem_plano_acao" boolean,
    "data_encaminhamento" timestamp without time zone,
    "solicitante" character varying(255),
    "source_updated_at" timestamp with time zone,
    "synced_at" timestamp with time zone,
    "hash_origem" "text",
    "chave_unica" "text",
    "backup_id" bigint NOT NULL
);


ALTER TABLE "backups"."pesquisas_satisfacao_backup" OWNER TO "postgres";


COMMENT ON TABLE "backups"."pesquisas_satisfacao_backup" IS 'Backup criado em 18/02/2026 antes da migration de timezone';



CREATE SEQUENCE IF NOT EXISTS "backups"."pesquisas_satisfacao_backup_backup_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "backups"."pesquisas_satisfacao_backup_backup_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "backups"."pesquisas_satisfacao_backup_backup_id_seq" OWNED BY "backups"."pesquisas_satisfacao_backup"."backup_id";



CREATE TABLE IF NOT EXISTS "backups"."plano_acao_historico_backup" (
    "id" "uuid",
    "plano_acao_id" "uuid",
    "data_atualizacao" timestamp without time zone,
    "usuario_id" "uuid",
    "usuario_nome" character varying(255),
    "descricao_atualizacao" "text",
    "tipo_atualizacao" character varying(30),
    "criado_em" timestamp without time zone,
    "backup_id" bigint NOT NULL
);


ALTER TABLE "backups"."plano_acao_historico_backup" OWNER TO "postgres";


COMMENT ON TABLE "backups"."plano_acao_historico_backup" IS 'Backup criado em 18/02/2026 antes da migration de timezone';



CREATE SEQUENCE IF NOT EXISTS "backups"."plano_acao_historico_backup_backup_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "backups"."plano_acao_historico_backup_backup_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "backups"."plano_acao_historico_backup_backup_id_seq" OWNED BY "backups"."plano_acao_historico_backup"."backup_id";



CREATE TABLE IF NOT EXISTS "backups"."planos_acao_backup" (
    "id" "uuid",
    "pesquisa_id" "uuid",
    "descricao_acao_corretiva" "text",
    "acao_preventiva" "text",
    "prioridade" character varying(20),
    "status_plano" character varying(30),
    "data_inicio" "date",
    "data_conclusao" "date",
    "data_primeiro_contato" "date",
    "meio_contato" character varying(20),
    "resumo_comunicacao" "text",
    "retorno_cliente" character varying(30),
    "status_final" character varying(30),
    "data_fechamento" timestamp without time zone,
    "criado_por" "uuid",
    "criado_em" timestamp without time zone,
    "atualizado_em" timestamp without time zone,
    "justificativa_cancelamento" "text",
    "data_resposta" "date",
    "comentario_cliente" "text",
    "chamado" "text",
    "empresa_id" "uuid",
    "backup_id" bigint NOT NULL
);


ALTER TABLE "backups"."planos_acao_backup" OWNER TO "postgres";


COMMENT ON TABLE "backups"."planos_acao_backup" IS 'Backup criado em 18/02/2026 antes da migration de timezone';



CREATE SEQUENCE IF NOT EXISTS "backups"."planos_acao_backup_backup_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "backups"."planos_acao_backup_backup_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "backups"."planos_acao_backup_backup_id_seq" OWNED BY "backups"."planos_acao_backup"."backup_id";



CREATE TABLE IF NOT EXISTS "backups"."requerimentos_backup" (
    "id" "uuid",
    "chamado" character varying(50),
    "cliente_id" "uuid",
    "modulo" character varying(50),
    "descricao" "text",
    "data_envio" "date",
    "data_aprovacao" "date",
    "horas_funcional" numeric(10,2),
    "horas_tecnico" numeric(10,2),
    "horas_total" numeric(10,2),
    "linguagem" character varying(50),
    "tipo_cobranca" character varying(50),
    "observacao" "text",
    "status" character varying(20),
    "enviado_faturamento" boolean,
    "data_envio_faturamento" timestamp without time zone,
    "created_at" timestamp without time zone,
    "updated_at" timestamp without time zone,
    "valor_hora_funcional" numeric(10,2),
    "valor_hora_tecnico" numeric(10,2),
    "valor_total_funcional" numeric(10,2),
    "valor_total_tecnico" numeric(10,2),
    "valor_total_geral" numeric(10,2),
    "mes_cobranca" character varying(7),
    "quantidade_tickets" integer,
    "autor_id" "uuid",
    "autor_nome" "text",
    "data_faturamento" timestamp with time zone,
    "tipo_hora_extra" "text",
    "empresa_segmentacao_nome" "text",
    "backup_id" bigint NOT NULL
);


ALTER TABLE "backups"."requerimentos_backup" OWNER TO "postgres";


COMMENT ON TABLE "backups"."requerimentos_backup" IS 'Backup criado em 18/02/2026 antes da migration de timezone';



CREATE SEQUENCE IF NOT EXISTS "backups"."requerimentos_backup_backup_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "backups"."requerimentos_backup_backup_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "backups"."requerimentos_backup_backup_id_seq" OWNED BY "backups"."requerimentos_backup"."backup_id";



CREATE TABLE IF NOT EXISTS "public"."admin_notifications" (
    "id" character varying(255) NOT NULL,
    "type" character varying(50) NOT NULL,
    "title" character varying(500) NOT NULL,
    "message" "text" NOT NULL,
    "severity" character varying(20) NOT NULL,
    "source" character varying(100) NOT NULL,
    "context" "jsonb",
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "admin_notifications_severity_check" CHECK ((("severity")::"text" = ANY ((ARRAY['critical'::character varying, 'error'::character varying, 'warning'::character varying, 'info'::character varying])::"text"[]))),
    CONSTRAINT "admin_notifications_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['critical_error'::character varying, 'system_failure'::character varying, 'configuration_issue'::character varying, 'performance_degradation'::character varying, 'security_alert'::character varying, 'maintenance_required'::character varying])::"text"[])))
);


ALTER TABLE "public"."admin_notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_notifications" IS 'Notificações para administradores do sistema';



COMMENT ON COLUMN "public"."admin_notifications"."type" IS 'Tipo da notificação: critical_error, system_failure, etc.';



COMMENT ON COLUMN "public"."admin_notifications"."severity" IS 'Severidade: critical, error, warning, info';



COMMENT ON COLUMN "public"."admin_notifications"."context" IS 'Contexto adicional da notificação';



COMMENT ON COLUMN "public"."admin_notifications"."read_at" IS 'Data de leitura (UTC, exibir em America/Sao_Paulo)';



COMMENT ON COLUMN "public"."admin_notifications"."created_at" IS 'Data de criação (UTC, exibir em America/Sao_Paulo)';



CREATE TABLE IF NOT EXISTS "public"."anexos_temporarios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "nome_original" character varying(255) NOT NULL,
    "nome_arquivo" character varying(255) NOT NULL,
    "tipo_mime" character varying(100) NOT NULL,
    "tamanho_bytes" integer NOT NULL,
    "url_temporaria" "text" NOT NULL,
    "url_permanente" "text",
    "status" character varying(20) DEFAULT 'pendente'::character varying,
    "token_acesso" "text" NOT NULL,
    "data_upload" timestamp with time zone DEFAULT "now"(),
    "data_expiracao" timestamp with time zone DEFAULT ("now"() + '24:00:00'::interval),
    "data_processamento" timestamp with time zone,
    "erro_detalhes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "anexos_temporarios_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'enviando'::character varying, 'processado'::character varying, 'erro'::character varying, 'expirado'::character varying])::"text"[])))
);


ALTER TABLE "public"."anexos_temporarios" OWNER TO "postgres";


COMMENT ON TABLE "public"."anexos_temporarios" IS 'Armazenamento temporário de anexos para disparos personalizados';



COMMENT ON COLUMN "public"."anexos_temporarios"."empresa_id" IS 'Referência para a empresa cliente';



COMMENT ON COLUMN "public"."anexos_temporarios"."nome_original" IS 'Nome original do arquivo enviado pelo usuário';



COMMENT ON COLUMN "public"."anexos_temporarios"."nome_arquivo" IS 'Nome do arquivo no storage (pode ser diferente do original)';



COMMENT ON COLUMN "public"."anexos_temporarios"."tipo_mime" IS 'Tipo MIME do arquivo (application/pdf, etc.)';



COMMENT ON COLUMN "public"."anexos_temporarios"."tamanho_bytes" IS 'Tamanho do arquivo em bytes';



COMMENT ON COLUMN "public"."anexos_temporarios"."url_temporaria" IS 'URL temporária para acesso ao arquivo';



COMMENT ON COLUMN "public"."anexos_temporarios"."url_permanente" IS 'URL permanente após processamento';



COMMENT ON COLUMN "public"."anexos_temporarios"."status" IS 'Status do anexo: pendente, enviando, processado, erro';



COMMENT ON COLUMN "public"."anexos_temporarios"."token_acesso" IS 'Token JWT para autenticação de download (sem limite de tamanho)';



COMMENT ON COLUMN "public"."anexos_temporarios"."data_expiracao" IS 'Data de expiração do arquivo temporário (24h)';



COMMENT ON COLUMN "public"."anexos_temporarios"."data_processamento" IS 'Data em que o anexo foi processado pelo Power Automate';



COMMENT ON COLUMN "public"."anexos_temporarios"."erro_detalhes" IS 'Detalhes do erro caso o processamento falhe';



COMMENT ON COLUMN "public"."anexos_temporarios"."created_at" IS 'Data de criação (UTC, exibir em America/Sao_Paulo)';



COMMENT ON COLUMN "public"."anexos_temporarios"."updated_at" IS 'Data de atualização (UTC, exibir em America/Sao_Paulo)';



CREATE TABLE IF NOT EXISTS "public"."apontamentos_aranda" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "origem" "text" DEFAULT 'sql_server'::"text" NOT NULL,
    "id_externo" "text" NOT NULL,
    "nro_chamado" "text",
    "tipo_chamado" "text",
    "org_us_final" "text",
    "categoria" "text",
    "causa_raiz" "text",
    "solicitante" "text",
    "us_final_afetado" "text",
    "data_abertura" timestamp with time zone,
    "data_sistema" timestamp with time zone,
    "data_atividade" timestamp with time zone,
    "data_fechamento" timestamp with time zone,
    "data_ult_modificacao" timestamp with time zone,
    "ativi_interna" "text",
    "caso_estado" "text",
    "caso_grupo" "text",
    "nro_tarefa" "text",
    "descricao_tarefa" "text",
    "tempo_gasto_segundos" double precision,
    "tempo_gasto_minutos" double precision,
    "tempo_gasto_horas" "text",
    "item_configuracao" "text",
    "analista_tarefa" "text",
    "analista_caso" "text",
    "estado_tarefa" "text",
    "resumo_tarefa" "text",
    "grupo_tarefa" "text",
    "problema" "text",
    "cod_resolucao" "text",
    "log" timestamp with time zone,
    "autor_id" "uuid",
    "autor_nome" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "source_updated_at" timestamp with time zone,
    "synced_at" timestamp with time zone,
    "data_ult_modificacao_tarefa" timestamp with time zone,
    "data_ult_modificacao_geral" timestamp with time zone,
    CONSTRAINT "apontamentos_aranda_origem_check" CHECK (("origem" = ANY (ARRAY['sql_server'::"text", 'manual'::"text"])))
);


ALTER TABLE "public"."apontamentos_aranda" OWNER TO "postgres";


COMMENT ON TABLE "public"."apontamentos_aranda" IS 'Apontamentos do sistema Aranda. Políticas RLS otimizadas para performance.';



COMMENT ON COLUMN "public"."apontamentos_aranda"."origem" IS 'Origem do registro: sql_server (sincronização automática) ou manual';



COMMENT ON COLUMN "public"."apontamentos_aranda"."id_externo" IS 'ID único gerado a partir dos campos do SQL Server para evitar duplicatas';



COMMENT ON COLUMN "public"."apontamentos_aranda"."tempo_gasto_segundos" IS 'Tempo gasto em segundos (FLOAT do SQL Server)';



COMMENT ON COLUMN "public"."apontamentos_aranda"."tempo_gasto_minutos" IS 'Tempo gasto em minutos (FLOAT do SQL Server)';



COMMENT ON COLUMN "public"."apontamentos_aranda"."tempo_gasto_horas" IS 'Tempo gasto em horas (VARCHAR do SQL Server)';



COMMENT ON COLUMN "public"."apontamentos_aranda"."source_updated_at" IS 'Data de última modificação no sistema de origem (AMSapontamento.Data_Ult_Modificacao_Geral) - usado para sincronização incremental';



COMMENT ON COLUMN "public"."apontamentos_aranda"."synced_at" IS 'Timestamp da última sincronização bem-sucedida deste registro';



COMMENT ON COLUMN "public"."apontamentos_aranda"."data_ult_modificacao_tarefa" IS 'Data de última modificação da tarefa no SQL Server (usado para detectar atualizações)';



COMMENT ON COLUMN "public"."apontamentos_aranda"."data_ult_modificacao_geral" IS 'Data de última modificação geral do registro no SQL Server (usado para detectar atualizações)';



CREATE TABLE IF NOT EXISTS "public"."apontamentos_tickets_aranda" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "nro_solicitacao" character varying(50) NOT NULL,
    "cod_tipo" character varying(50),
    "ticket_externo" character varying(100),
    "numero_pai" character varying(50),
    "caso_pai" character varying(100),
    "organizacao" character varying(100),
    "empresa" character varying(100),
    "cliente" character varying(100),
    "usuario_final" character varying(100),
    "resumo" "text",
    "descricao" "text",
    "autor" character varying(100),
    "solicitante" character varying(100),
    "nome_grupo" character varying(100),
    "nome_responsavel" character varying(100),
    "categoria" character varying(100),
    "item_configuracao" character varying(200),
    "data_abertura" timestamp with time zone,
    "data_solucao" timestamp with time zone,
    "data_fechamento" timestamp with time zone,
    "data_ultima_modificacao" timestamp with time zone,
    "ultima_modificacao" "text",
    "data_prevista_entrega" timestamp with time zone,
    "data_aprovacao" timestamp with time zone,
    "data_real_entrega" timestamp with time zone,
    "data_ultima_nota" timestamp with time zone,
    "data_ultimo_comentario" timestamp with time zone,
    "status" character varying(50),
    "prioridade" character varying(50),
    "urgencia" character varying(50),
    "impacto" character varying(50),
    "chamado_reaberto" character varying(50),
    "criado_via" character varying(50),
    "relatado" "text",
    "solucao" "text",
    "causa_raiz" "text",
    "desc_ultima_nota" "text",
    "desc_ultimo_comentario" "text",
    "log" "text",
    "tempo_gasto_dias" character varying(50),
    "tempo_gasto_horas" character varying(50),
    "tempo_gasto_minutos" numeric(15,6),
    "cod_resolucao" character varying(50),
    "violacao_sla" character varying(50),
    "tda_cumprido" character varying(50),
    "tds_cumprido" character varying(50),
    "data_prevista_tda" timestamp with time zone,
    "data_prevista_tds" timestamp with time zone,
    "tempo_restante_tda" character varying(50),
    "tempo_restante_tds" character varying(50),
    "tempo_restante_tds_em_minutos" numeric(15,2),
    "tempo_real_tda" numeric(15,6),
    "total_orcamento" numeric(15,2),
    "data_sincronizacao" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "source_updated_at" timestamp with time zone,
    "synced_at" timestamp with time zone,
    "data_ultima_nota_publica" timestamp with time zone
);


ALTER TABLE "public"."apontamentos_tickets_aranda" OWNER TO "postgres";


COMMENT ON TABLE "public"."apontamentos_tickets_aranda" IS 'Tabela para armazenar dados de tickets/apontamentos do sistema Aranda';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."nro_solicitacao" IS 'Número da solicitação/ticket';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."cod_tipo" IS 'Código do tipo de ticket';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."ticket_externo" IS 'Número do ticket externo';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."numero_pai" IS 'Número do ticket pai';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."caso_pai" IS 'Caso pai relacionado';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."organizacao" IS 'Organização responsável';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."empresa" IS 'Empresa cliente';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."cliente" IS 'Nome do cliente';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."usuario_final" IS 'Usuário final que reportou';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."resumo" IS 'Resumo do ticket';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."descricao" IS 'Descrição detalhada do ticket';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."autor" IS 'Autor do ticket';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."solicitante" IS 'Solicitante do ticket';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."nome_grupo" IS 'Grupo responsável';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."nome_responsavel" IS 'Responsável pelo atendimento';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."categoria" IS 'Categoria do ticket';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."item_configuracao" IS 'Item de configuração relacionado';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."data_abertura" IS 'Data de abertura do ticket';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."data_solucao" IS 'Data de solução do ticket';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."data_fechamento" IS 'Data de fechamento do ticket';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."data_ultima_modificacao" IS 'Data da última modificação';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."data_prevista_entrega" IS 'Data prevista para entrega';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."data_aprovacao" IS 'Data de aprovação (somente se aprovado)';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."data_real_entrega" IS 'Data real da entrega';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."data_ultima_nota" IS 'Data da última nota adicionada';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."data_ultimo_comentario" IS 'Data do último comentário';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."status" IS 'Status atual do ticket';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."prioridade" IS 'Prioridade do ticket';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."urgencia" IS 'Urgência do ticket';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."impacto" IS 'Impacto do ticket';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."chamado_reaberto" IS 'Indica se o chamado foi reaberto';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."criado_via" IS 'Canal de criação do ticket';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."relatado" IS 'Problema relatado';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."solucao" IS 'Solução aplicada';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."causa_raiz" IS 'Causa raiz identificada';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."desc_ultima_nota" IS 'Descrição da última nota';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."desc_ultimo_comentario" IS 'Descrição do último comentário';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."log" IS 'Log de atividades do ticket';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."tempo_gasto_dias" IS 'Tempo gasto em dias (formato: "0d,02:40")';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."tempo_gasto_horas" IS 'Tempo gasto em horas (formato: "22:56")';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."tempo_gasto_minutos" IS 'Tempo gasto em minutos (numeric 15,6 para suportar valores grandes)';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."cod_resolucao" IS 'Código de resolução do ticket';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."violacao_sla" IS 'Indica se houve violação de SLA';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."tda_cumprido" IS 'Indica se TDA foi cumprido';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."tds_cumprido" IS 'Indica se TDS foi cumprido';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."data_prevista_tda" IS 'Data prevista para TDA';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."data_prevista_tds" IS 'Data prevista para TDS';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."tempo_restante_tda" IS 'Tempo restante para TDA';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."tempo_restante_tds" IS 'Tempo restante para TDS';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."tempo_restante_tds_em_minutos" IS 'Tempo restante TDS em minutos (numeric 15,2 para suportar valores grandes)';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."tempo_real_tda" IS 'Tempo real TDA (numeric 15,6 para suportar valores grandes)';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."total_orcamento" IS 'Total do orçamento do ticket - DECIMAL(15,2) para suportar valores grandes';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."data_sincronizacao" IS 'Data da última sincronização com SQL Server';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."source_updated_at" IS 'Data de última modificação no sistema de origem (AMSticketsabertos.Data_Ultima_Modificacao) - usado para sincronização incremental';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."synced_at" IS 'Timestamp da última sincronização bem-sucedida deste registro';



COMMENT ON COLUMN "public"."apontamentos_tickets_aranda"."data_ultima_nota_publica" IS 'Data/hora da última nota pública do chamado (AMSticketsabertos.data_ultima_nota_publica)';



CREATE TABLE IF NOT EXISTS "public"."banco_horas_ajustes_retroativos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "fechamento_id" "uuid" NOT NULL,
    "mes_referencia" integer NOT NULL,
    "ano_referencia" integer NOT NULL,
    "tipo_dado" "text" NOT NULL,
    "valor_anterior" "text",
    "valor_novo" "text",
    "diferenca" "text",
    "diferenca_minutos" integer,
    "detalhes_mudanca" "jsonb",
    "status" "text" DEFAULT 'pendente'::"text" NOT NULL,
    "analisado_por" "uuid",
    "analisado_em" timestamp with time zone,
    "motivo_decisao" "text",
    "reajuste_gerado_id" "uuid",
    "mes_aplicacao" integer,
    "ano_aplicacao" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "sync_id" "text",
    CONSTRAINT "banco_horas_ajustes_retroativos_ano_aplicacao_check" CHECK ((("ano_aplicacao" IS NULL) OR ("ano_aplicacao" >= 2020))),
    CONSTRAINT "banco_horas_ajustes_retroativos_ano_referencia_check" CHECK (("ano_referencia" >= 2020)),
    CONSTRAINT "banco_horas_ajustes_retroativos_mes_aplicacao_check" CHECK ((("mes_aplicacao" IS NULL) OR (("mes_aplicacao" >= 1) AND ("mes_aplicacao" <= 12)))),
    CONSTRAINT "banco_horas_ajustes_retroativos_mes_referencia_check" CHECK ((("mes_referencia" >= 1) AND ("mes_referencia" <= 12))),
    CONSTRAINT "banco_horas_ajustes_retroativos_status_check" CHECK (("status" = ANY (ARRAY['pendente'::"text", 'aprovado'::"text", 'descartado'::"text"]))),
    CONSTRAINT "banco_horas_ajustes_retroativos_tipo_dado_check" CHECK (("tipo_dado" = ANY (ARRAY['apontamento_horas'::"text", 'apontamento_tickets'::"text", 'requerimento'::"text"])))
);


ALTER TABLE "public"."banco_horas_ajustes_retroativos" OWNER TO "postgres";


COMMENT ON TABLE "public"."banco_horas_ajustes_retroativos" IS 'Quarentena para atualizações retroativas do banco de horas. Apontamentos que chegam após o fechamento do período ficam aqui para análise e aprovação.';



COMMENT ON COLUMN "public"."banco_horas_ajustes_retroativos"."tipo_dado" IS 'Tipo de dado: apontamento_horas (consumo horas), apontamento_tickets (consumo tickets), requerimento';



COMMENT ON COLUMN "public"."banco_horas_ajustes_retroativos"."diferenca" IS 'Diferença entre valor anterior e novo (ex: +02:30 ou -01:00)';



COMMENT ON COLUMN "public"."banco_horas_ajustes_retroativos"."detalhes_mudanca" IS 'JSON com lista de chamados/tickets adicionados ou removidos';



COMMENT ON COLUMN "public"."banco_horas_ajustes_retroativos"."mes_aplicacao" IS 'Mês onde o ajuste aprovado será aplicado (geralmente mês atual)';



CREATE TABLE IF NOT EXISTS "public"."banco_horas_alocacoes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "nome_alocacao" character varying(255) NOT NULL,
    "percentual_baseline" integer NOT NULL,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "banco_horas_alocacoes_percentual_baseline_check" CHECK ((("percentual_baseline" > 0) AND ("percentual_baseline" <= 100)))
);


ALTER TABLE "public"."banco_horas_alocacoes" OWNER TO "postgres";


COMMENT ON TABLE "public"."banco_horas_alocacoes" IS 'Segmentação interna do baseline por percentual para visão detalhada';



COMMENT ON COLUMN "public"."banco_horas_alocacoes"."nome_alocacao" IS 'Nome da alocação (ex: Área Técnica, Suporte, Projetos)';



COMMENT ON COLUMN "public"."banco_horas_alocacoes"."percentual_baseline" IS 'Percentual do baseline alocado (soma deve ser 100%)';



CREATE TABLE IF NOT EXISTS "public"."banco_horas_audit_log" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "empresa_id" "uuid",
    "calculo_id" "uuid",
    "acao" character varying(100) NOT NULL,
    "descricao" "text",
    "dados_acao" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "ip_address" "inet",
    "user_agent" "text"
);


ALTER TABLE "public"."banco_horas_audit_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."banco_horas_audit_log" IS 'Log completo de auditoria de todas as ações no sistema de banco de horas. Registra quem fez o quê, quando e de onde, com dados detalhados da ação.';



COMMENT ON COLUMN "public"."banco_horas_audit_log"."acao" IS 'Ação realizada (ex: calculo_criado, reajuste_aplicado, recalculo_executado)';



COMMENT ON COLUMN "public"."banco_horas_audit_log"."dados_acao" IS 'Dados detalhados da ação em formato JSON';



CREATE TABLE IF NOT EXISTS "public"."banco_horas_calculos" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "mes" integer NOT NULL,
    "ano" integer NOT NULL,
    "baseline_horas" interval,
    "repasses_mes_anterior_horas" interval,
    "saldo_a_utilizar_horas" interval,
    "consumo_horas" interval,
    "requerimentos_horas" interval,
    "reajustes_horas" interval,
    "consumo_total_horas" interval,
    "saldo_horas" interval,
    "repasse_horas" interval,
    "excedentes_horas" interval,
    "valor_excedentes_horas" numeric(10,2),
    "baseline_tickets" numeric(10,2),
    "repasses_mes_anterior_tickets" numeric(10,2),
    "saldo_a_utilizar_tickets" numeric(10,2),
    "consumo_tickets" numeric(10,2),
    "requerimentos_tickets" numeric(10,2),
    "reajustes_tickets" numeric(10,2),
    "consumo_total_tickets" numeric(10,2),
    "saldo_tickets" numeric(10,2),
    "repasse_tickets" numeric(10,2),
    "excedentes_tickets" numeric(10,2),
    "valor_excedentes_tickets" numeric(10,2),
    "valor_a_faturar" numeric(10,2),
    "observacao_publica" "text",
    "is_fim_periodo" boolean DEFAULT false,
    "taxa_hora_utilizada" numeric(10,2),
    "taxa_ticket_utilizada" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "banco_horas_calculos_ano_check" CHECK (("ano" >= 2020)),
    CONSTRAINT "banco_horas_calculos_mes_check" CHECK ((("mes" >= 1) AND ("mes" <= 12)))
);


ALTER TABLE "public"."banco_horas_calculos" OWNER TO "postgres";


COMMENT ON TABLE "public"."banco_horas_calculos" IS 'Tabela de cálculos de banco de horas - RLS corrigido em 2026-02-18';



COMMENT ON COLUMN "public"."banco_horas_calculos"."observacao_publica" IS 'Observação visível para cliente e equipe (ex: descrição de faturamento)';



COMMENT ON COLUMN "public"."banco_horas_calculos"."is_fim_periodo" IS 'Indica se é o último mês do período de apuração';



CREATE TABLE IF NOT EXISTS "public"."banco_horas_calculos_segmentados" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "calculo_id" "uuid" NOT NULL,
    "alocacao_id" "uuid" NOT NULL,
    "baseline_horas" interval,
    "repasses_mes_anterior_horas" interval,
    "saldo_a_utilizar_horas" interval,
    "consumo_horas" interval,
    "requerimentos_horas" interval,
    "reajustes_horas" interval,
    "consumo_total_horas" interval,
    "saldo_horas" interval,
    "repasse_horas" interval,
    "baseline_tickets" numeric(10,2),
    "repasses_mes_anterior_tickets" numeric(10,2),
    "saldo_a_utilizar_tickets" numeric(10,2),
    "consumo_tickets" numeric(10,2),
    "requerimentos_tickets" numeric(10,2),
    "reajustes_tickets" numeric(10,2),
    "consumo_total_tickets" numeric(10,2),
    "saldo_tickets" numeric(10,2),
    "repasse_tickets" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."banco_horas_calculos_segmentados" OWNER TO "postgres";


COMMENT ON TABLE "public"."banco_horas_calculos_segmentados" IS 'Tabela de cálculos segmentados de banco de horas - RLS corrigido em 2026-02-18';



COMMENT ON COLUMN "public"."banco_horas_calculos_segmentados"."calculo_id" IS 'Referência ao cálculo consolidado';



COMMENT ON COLUMN "public"."banco_horas_calculos_segmentados"."alocacao_id" IS 'Referência à alocação';



CREATE TABLE IF NOT EXISTS "public"."banco_horas_envio_agendamento_empresas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agendamento_id" "uuid" NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."banco_horas_envio_agendamento_empresas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."banco_horas_envio_agendamentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "ativo" boolean DEFAULT true NOT NULL,
    "frequencia" "text" NOT NULL,
    "dias_semana" integer[] DEFAULT '{}'::integer[] NOT NULL,
    "dias_mes" integer[] DEFAULT '{}'::integer[] NOT NULL,
    "ultimo_dia_mes" boolean DEFAULT false NOT NULL,
    "modo_horario" "text" NOT NULL,
    "horarios" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "intervalo_horas" integer,
    "hora_inicio" time without time zone,
    "hora_fim" time without time zone,
    "emails_cc" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "proxima_execucao" timestamp with time zone,
    "ultima_execucao" timestamp with time zone,
    "ultimo_status" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "banco_horas_envio_agendamentos_frequencia_check" CHECK (("frequencia" = ANY (ARRAY['diario'::"text", 'semanal'::"text", 'mensal'::"text"]))),
    CONSTRAINT "banco_horas_envio_agendamentos_intervalo_horas_check" CHECK ((("intervalo_horas" >= 1) AND ("intervalo_horas" <= 23))),
    CONSTRAINT "banco_horas_envio_agendamentos_modo_horario_check" CHECK (("modo_horario" = ANY (ARRAY['horarios'::"text", 'intervalo'::"text"]))),
    CONSTRAINT "bh_envio_agendamentos_horarios" CHECK ((("modo_horario" <> 'horarios'::"text") OR ("cardinality"("horarios") > 0))),
    CONSTRAINT "bh_envio_agendamentos_intervalo" CHECK ((("modo_horario" <> 'intervalo'::"text") OR (("intervalo_horas" IS NOT NULL) AND ("hora_inicio" IS NOT NULL)))),
    CONSTRAINT "bh_envio_agendamentos_mensal_dias" CHECK ((("frequencia" <> 'mensal'::"text") OR ("cardinality"("dias_mes") > 0) OR "ultimo_dia_mes")),
    CONSTRAINT "bh_envio_agendamentos_semanal_dias" CHECK ((("frequencia" <> 'semanal'::"text") OR ("cardinality"("dias_semana") > 0)))
);


ALTER TABLE "public"."banco_horas_envio_agendamentos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."banco_horas_envio_execucoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agendamento_id" "uuid",
    "empresa_id" "uuid" NOT NULL,
    "origem" "text" NOT NULL,
    "disparado_por" "uuid",
    "executado_para" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'executando'::"text" NOT NULL,
    "qtd_destinatarios" integer,
    "qtd_emails" integer,
    "erro" "text",
    "iniciado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    "finalizado_em" timestamp with time zone,
    CONSTRAINT "banco_horas_envio_execucoes_origem_check" CHECK (("origem" = ANY (ARRAY['manual'::"text", 'agendado'::"text"]))),
    CONSTRAINT "banco_horas_envio_execucoes_status_check" CHECK (("status" = ANY (ARRAY['executando'::"text", 'sucesso'::"text", 'erro'::"text", 'sem_destinatarios'::"text", 'interrompida'::"text"])))
);


ALTER TABLE "public"."banco_horas_envio_execucoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."banco_horas_fechamentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "mes" integer NOT NULL,
    "ano" integer NOT NULL,
    "snapshot_consumo_horas" "text",
    "snapshot_consumo_tickets" integer,
    "snapshot_requerimentos_horas" "text",
    "snapshot_requerimentos_tickets" integer,
    "snapshot_calculo" "jsonb",
    "apontamentos_ids" "text"[],
    "tickets_ids" "text"[],
    "fechado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fechado_por" "uuid",
    "motivo" "text" DEFAULT 'Geração de Book'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "banco_horas_fechamentos_ano_check" CHECK (("ano" >= 2020)),
    CONSTRAINT "banco_horas_fechamentos_mes_check" CHECK ((("mes" >= 1) AND ("mes" <= 12)))
);


ALTER TABLE "public"."banco_horas_fechamentos" OWNER TO "postgres";


COMMENT ON TABLE "public"."banco_horas_fechamentos" IS 'Controle de períodos fechados do banco de horas. Quando um book é gerado, o período é congelado e atualizações posteriores vão para quarentena.';



COMMENT ON COLUMN "public"."banco_horas_fechamentos"."snapshot_calculo" IS 'Cópia completa do banco_horas_calculos no momento do fechamento (JSON imutável)';



COMMENT ON COLUMN "public"."banco_horas_fechamentos"."apontamentos_ids" IS 'IDs dos apontamentos (id_externo) que compuseram o cálculo - usado para detectar novos apontamentos';



COMMENT ON COLUMN "public"."banco_horas_fechamentos"."tickets_ids" IS 'IDs dos tickets (nro_solicitacao) que compuseram o cálculo - usado para detectar novos tickets';



CREATE TABLE IF NOT EXISTS "public"."banco_horas_observacoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "mes" integer NOT NULL,
    "ano" integer NOT NULL,
    "observacao" "text" NOT NULL,
    "tipo" character varying(20) DEFAULT 'manual'::character varying NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "banco_horas_observacoes_ano_check" CHECK ((("ano" >= 2020) AND ("ano" <= 2100))),
    CONSTRAINT "banco_horas_observacoes_mes_check" CHECK ((("mes" >= 1) AND ("mes" <= 12))),
    CONSTRAINT "banco_horas_observacoes_observacao_check" CHECK (("char_length"("observacao") <= 700)),
    CONSTRAINT "banco_horas_observacoes_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['manual'::character varying, 'ajuste'::character varying])::"text"[])))
);


ALTER TABLE "public"."banco_horas_observacoes" OWNER TO "postgres";


COMMENT ON TABLE "public"."banco_horas_observacoes" IS 'Observações manuais do banco de horas por empresa e período';



COMMENT ON COLUMN "public"."banco_horas_observacoes"."observacao" IS 'Texto da observação (máximo 700 caracteres)';



COMMENT ON COLUMN "public"."banco_horas_observacoes"."tipo" IS 'Tipo da observação: manual (criada pelo usuário) ou ajuste (vinda de reajuste)';



CREATE TABLE IF NOT EXISTS "public"."banco_horas_reajustes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "calculo_id" "uuid",
    "empresa_id" "uuid" NOT NULL,
    "mes" integer NOT NULL,
    "ano" integer NOT NULL,
    "valor_reajuste_horas" "text",
    "valor_reajuste_tickets" numeric(10,2),
    "tipo_reajuste" character varying(10),
    "observacao" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "ativo" boolean DEFAULT true,
    "empresa_segmentada" "text",
    CONSTRAINT "banco_horas_reajustes_ano_check" CHECK (("ano" >= 2020)),
    CONSTRAINT "banco_horas_reajustes_mes_check" CHECK ((("mes" >= 1) AND ("mes" <= 12))),
    CONSTRAINT "banco_horas_reajustes_observacao_check" CHECK ((("observacao" IS NULL) OR ("length"(TRIM(BOTH FROM "observacao")) >= 3))),
    CONSTRAINT "banco_horas_reajustes_tipo_reajuste_check" CHECK ((("tipo_reajuste")::"text" = ANY ((ARRAY['entrada'::character varying, 'saida'::character varying, 'positivo'::character varying, 'negativo'::character varying])::"text"[])))
);


ALTER TABLE "public"."banco_horas_reajustes" OWNER TO "postgres";


COMMENT ON TABLE "public"."banco_horas_reajustes" IS 'Ajustes manuais versionados com observação obrigatória';



COMMENT ON COLUMN "public"."banco_horas_reajustes"."valor_reajuste_horas" IS 'Valor do reajuste em formato HH:MM (ex: 10:30)';



COMMENT ON COLUMN "public"."banco_horas_reajustes"."tipo_reajuste" IS 'Tipo do reajuste: positivo (aumenta consumo) ou negativo (reduz consumo)';



COMMENT ON COLUMN "public"."banco_horas_reajustes"."observacao" IS 'Observação opcional (mínimo 3 caracteres se fornecida) explicando motivo do reajuste';



COMMENT ON COLUMN "public"."banco_horas_reajustes"."empresa_segmentada" IS 'Nome da empresa de segmentação (baseline) para clientes com múltiplas empresas. 
Exemplo: Cliente ANGLO pode ter "NIQUEL" ou "IOB". 
Obrigatório apenas se o cliente tiver baseline_segmentado = true.
Valores possíveis são extraídos do campo segmentacao_config do cliente.';



CREATE TABLE IF NOT EXISTS "public"."banco_horas_versoes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "calculo_id" "uuid",
    "versao_anterior" integer,
    "versao_nova" integer,
    "dados_anteriores" "jsonb",
    "dados_novos" "jsonb",
    "motivo" "text",
    "tipo_mudanca" character varying(50),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "empresa_id" "uuid",
    "mes" integer,
    "ano" integer,
    "versao" integer DEFAULT 1,
    "reajuste_id" "uuid",
    "snapshot_calculo" "jsonb",
    "observacao" "text",
    "tipo_alteracao" character varying(50),
    "baseline_tickets" numeric(10,2) DEFAULT 0,
    "repasses_mes_anterior_tickets" numeric(10,2) DEFAULT 0,
    "saldo_a_utilizar_tickets" numeric(10,2) DEFAULT 0,
    "consumo_tickets" numeric(10,2) DEFAULT 0,
    "requerimentos_tickets" numeric(10,2) DEFAULT 0,
    "reajustes_tickets" numeric(10,2) DEFAULT 0,
    "consumo_total_tickets" numeric(10,2) DEFAULT 0,
    "saldo_tickets" numeric(10,2) DEFAULT 0,
    "repasse_tickets" numeric(10,2) DEFAULT 0,
    "excedentes_tickets" numeric(10,2) DEFAULT 0,
    CONSTRAINT "banco_horas_versoes_ano_check" CHECK (("ano" >= 2020)),
    CONSTRAINT "banco_horas_versoes_mes_check" CHECK ((("mes" >= 1) AND ("mes" <= 12))),
    CONSTRAINT "banco_horas_versoes_tipo_alteracao_check" CHECK ((("tipo_alteracao")::"text" = ANY ((ARRAY['reajuste'::character varying, 'recalculo'::character varying, 'correcao'::character varying, 'inicial'::character varying])::"text"[]))),
    CONSTRAINT "banco_horas_versoes_tipo_mudanca_check" CHECK ((("tipo_mudanca")::"text" = ANY ((ARRAY['reajuste'::character varying, 'recalculo'::character varying, 'correcao'::character varying, 'inicial'::character varying])::"text"[])))
);


ALTER TABLE "public"."banco_horas_versoes" OWNER TO "postgres";


COMMENT ON TABLE "public"."banco_horas_versoes" IS 'Histórico de versões do banco de horas com snapshots para auditoria. Suporta versionamento por empresa/período e por cálculo.';



COMMENT ON COLUMN "public"."banco_horas_versoes"."dados_anteriores" IS 'Snapshot completo da versão anterior em formato JSON';



COMMENT ON COLUMN "public"."banco_horas_versoes"."dados_novos" IS 'Snapshot completo da versão nova em formato JSON';



COMMENT ON COLUMN "public"."banco_horas_versoes"."tipo_mudanca" IS 'Tipo de mudança: reajuste, recalculo, correcao ou inicial';



COMMENT ON COLUMN "public"."banco_horas_versoes"."empresa_id" IS 'ID da empresa (facilita queries por empresa)';



COMMENT ON COLUMN "public"."banco_horas_versoes"."mes" IS 'Mês do período (1-12)';



COMMENT ON COLUMN "public"."banco_horas_versoes"."ano" IS 'Ano do período';



COMMENT ON COLUMN "public"."banco_horas_versoes"."versao" IS 'Número sequencial da versão para esta empresa/período';



COMMENT ON COLUMN "public"."banco_horas_versoes"."reajuste_id" IS 'ID do reajuste que gerou esta versão (se aplicável)';



COMMENT ON COLUMN "public"."banco_horas_versoes"."snapshot_calculo" IS 'Snapshot completo do cálculo anterior em formato JSON';



COMMENT ON COLUMN "public"."banco_horas_versoes"."observacao" IS 'Observação sobre a mudança realizada';



COMMENT ON COLUMN "public"."banco_horas_versoes"."tipo_alteracao" IS 'Tipo de alteração: reajuste, recalculo, correcao ou inicial';



COMMENT ON COLUMN "public"."banco_horas_versoes"."baseline_tickets" IS 'Baseline mensal em tickets (para clientes tipo ticket)';



COMMENT ON COLUMN "public"."banco_horas_versoes"."repasses_mes_anterior_tickets" IS 'Repasses do mês anterior em tickets';



COMMENT ON COLUMN "public"."banco_horas_versoes"."saldo_a_utilizar_tickets" IS 'Saldo disponível para utilização em tickets';



COMMENT ON COLUMN "public"."banco_horas_versoes"."consumo_tickets" IS 'Consumo de chamados em tickets';



COMMENT ON COLUMN "public"."banco_horas_versoes"."requerimentos_tickets" IS 'Requerimentos aprovados em tickets';



COMMENT ON COLUMN "public"."banco_horas_versoes"."reajustes_tickets" IS 'Reajustes manuais em tickets (entradas - saídas)';



COMMENT ON COLUMN "public"."banco_horas_versoes"."consumo_total_tickets" IS 'Consumo total em tickets (consumo + requerimentos)';



COMMENT ON COLUMN "public"."banco_horas_versoes"."saldo_tickets" IS 'Saldo final em tickets';



COMMENT ON COLUMN "public"."banco_horas_versoes"."repasse_tickets" IS 'Repasse para próximo mês em tickets';



COMMENT ON COLUMN "public"."banco_horas_versoes"."excedentes_tickets" IS 'Excedentes em tickets (quando saldo negativo)';



CREATE TABLE IF NOT EXISTS "public"."baseline_historico" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "baseline_horas" numeric(10,2),
    "baseline_tickets" integer,
    "data_inicio" "date" NOT NULL,
    "data_fim" "date",
    "motivo" "text",
    "observacao" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid",
    "tipo_banco" "text" DEFAULT 'mensal'::"text" NOT NULL,
    CONSTRAINT "baseline_historico_baseline_horas_check" CHECK (("baseline_horas" >= (0)::numeric)),
    CONSTRAINT "baseline_historico_baseline_tickets_check" CHECK (("baseline_tickets" >= 0)),
    CONSTRAINT "baseline_historico_tipo_banco_check" CHECK (("tipo_banco" = ANY (ARRAY['mensal'::"text", 'anual'::"text"]))),
    CONSTRAINT "check_baseline_preenchido" CHECK ((("baseline_horas" IS NOT NULL) OR ("baseline_tickets" IS NOT NULL))),
    CONSTRAINT "check_vigencia_valida" CHECK ((("data_fim" IS NULL) OR ("data_fim" >= "data_inicio")))
);


ALTER TABLE "public"."baseline_historico" OWNER TO "postgres";


COMMENT ON TABLE "public"."baseline_historico" IS 'Histórico de vigências de baseline de horas e tickets contratados por empresa';



COMMENT ON COLUMN "public"."baseline_historico"."baseline_horas" IS 'Baseline de horas mensal (DECIMAL). Pode ser NULL se tipo_contrato for apenas "tickets".';



COMMENT ON COLUMN "public"."baseline_historico"."baseline_tickets" IS 'Baseline de tickets mensal (INTEGER). Pode ser NULL se tipo_contrato for apenas "horas".';



COMMENT ON COLUMN "public"."baseline_historico"."data_inicio" IS 'Data de início da vigência do baseline. Deve corresponder ao inicio_vigencia da empresa.';



COMMENT ON COLUMN "public"."baseline_historico"."data_fim" IS 'Data de fim da vigência (inclusive). NULL indica vigência atual/ativa';



COMMENT ON COLUMN "public"."baseline_historico"."created_at" IS 'Data de criação (UTC, exibir em America/Sao_Paulo)';



COMMENT ON COLUMN "public"."baseline_historico"."updated_at" IS 'Data de atualização (UTC, exibir em America/Sao_Paulo)';



COMMENT ON COLUMN "public"."baseline_historico"."tipo_banco" IS 'Tipo de alocação do banco: mensal (creditado todo mês) ou anual (creditado apenas no mês do data_inicio)';



COMMENT ON CONSTRAINT "check_baseline_preenchido" ON "public"."baseline_historico" IS 'Garante que pelo menos um dos campos (baseline_horas OU baseline_tickets) seja preenchido.';



CREATE TABLE IF NOT EXISTS "public"."book_generation_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "batch_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "empresa_nome" "text",
    "empresa_nome_abreviado" "text",
    "mes" integer NOT NULL,
    "ano" integer NOT NULL,
    "forcar_atualizacao" boolean DEFAULT false,
    "enviar_email" boolean DEFAULT true,
    "destinatarios_email" "text"[] DEFAULT ARRAY['willian.faria@sonda.com'::"text"],
    "status" "text" DEFAULT 'pendente'::"text" NOT NULL,
    "book_id" "uuid",
    "pdf_url" "text",
    "email_enviado" boolean DEFAULT false,
    "erro_mensagem" "text",
    "etapa_atual" "text" DEFAULT 'aguardando'::"text",
    "criado_por" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    CONSTRAINT "book_generation_queue_ano_check" CHECK ((("ano" >= 2020) AND ("ano" <= 2100))),
    CONSTRAINT "book_generation_queue_mes_check" CHECK ((("mes" >= 1) AND ("mes" <= 12))),
    CONSTRAINT "book_generation_queue_status_check" CHECK (("status" = ANY (ARRAY['pendente'::"text", 'processando'::"text", 'concluido'::"text", 'erro'::"text", 'cancelado'::"text"])))
);


ALTER TABLE "public"."book_generation_queue" OWNER TO "postgres";


COMMENT ON TABLE "public"."book_generation_queue" IS 'Fila de geração de books em background. Cada item representa uma empresa para processar.';



COMMENT ON COLUMN "public"."book_generation_queue"."batch_id" IS 'ID do lote - agrupa itens de uma mesma solicitação do usuário';



COMMENT ON COLUMN "public"."book_generation_queue"."etapa_atual" IS 'Etapa atual do processamento: aguardando, coletando_dados, gerando_book, gerando_pdf, enviando_email, finalizado';



CREATE OR REPLACE VIEW "public"."book_generation_batch_summary" WITH ("security_invoker"='true') AS
 SELECT "batch_id",
    "min"("created_at") AS "created_at",
    "max"("updated_at") AS "updated_at",
    "count"(*) AS "total",
    "count"(*) FILTER (WHERE ("status" = 'concluido'::"text")) AS "concluidos",
    "count"(*) FILTER (WHERE ("status" = 'erro'::"text")) AS "erros",
    "count"(*) FILTER (WHERE ("status" = 'processando'::"text")) AS "processando",
    "count"(*) FILTER (WHERE ("status" = 'pendente'::"text")) AS "pendentes",
    "count"(*) FILTER (WHERE ("status" = 'cancelado'::"text")) AS "cancelados",
    "count"(*) FILTER (WHERE ("email_enviado" = true)) AS "emails_enviados",
    "mes",
    "ano",
        CASE
            WHEN ("count"(*) FILTER (WHERE ("status" = ANY (ARRAY['pendente'::"text", 'processando'::"text"]))) = 0) THEN 'finalizado'::"text"
            WHEN ("count"(*) FILTER (WHERE ("status" = 'processando'::"text")) > 0) THEN 'processando'::"text"
            ELSE 'aguardando'::"text"
        END AS "batch_status"
   FROM "public"."book_generation_queue"
  GROUP BY "batch_id", "mes", "ano";


ALTER VIEW "public"."book_generation_batch_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."books" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "mes" integer NOT NULL,
    "ano" integer NOT NULL,
    "status" "text" DEFAULT 'pendente'::"text" NOT NULL,
    "dados_capa" "jsonb",
    "dados_volumetria" "jsonb",
    "dados_sla" "jsonb",
    "dados_backlog" "jsonb",
    "dados_consumo" "jsonb",
    "dados_pesquisa" "jsonb",
    "pdf_url" "text",
    "pdf_gerado_em" timestamp with time zone,
    "erro_detalhes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "versao_atual" integer DEFAULT 1,
    "enviado_em" timestamp with time zone,
    "enviado_por" "uuid",
    "destinatarios_envio" "text"[],
    "dados_consumo_segmentado" "jsonb",
    "precisa_retificacao" boolean DEFAULT false,
    "dados_requerimentos_em_desenvolvimento" "jsonb",
    CONSTRAINT "books_ano_check" CHECK ((("ano" >= 2020) AND ("ano" <= 2100))),
    CONSTRAINT "books_mes_check" CHECK ((("mes" >= 1) AND ("mes" <= 12))),
    CONSTRAINT "books_status_check" CHECK (("status" = ANY (ARRAY['pendente'::"text", 'gerando'::"text", 'gerado'::"text", 'erro'::"text", 'desatualizado'::"text", 'enviado'::"text"])))
);


ALTER TABLE "public"."books" OWNER TO "postgres";


COMMENT ON TABLE "public"."books" IS 'Armazena books gerados com dados congelados (snapshot) por período';



COMMENT ON COLUMN "public"."books"."dados_capa" IS 'Snapshot dos dados da capa (JSONB)';



COMMENT ON COLUMN "public"."books"."dados_volumetria" IS 'Snapshot dos dados de volumetria (JSONB)';



COMMENT ON COLUMN "public"."books"."dados_sla" IS 'Snapshot dos dados de SLA (JSONB)';



COMMENT ON COLUMN "public"."books"."dados_backlog" IS 'Snapshot dos dados de backlog (JSONB)';



COMMENT ON COLUMN "public"."books"."dados_consumo" IS 'Snapshot dos dados de consumo (JSONB)';



COMMENT ON COLUMN "public"."books"."dados_pesquisa" IS 'Snapshot dos dados de pesquisa (JSONB)';



COMMENT ON COLUMN "public"."books"."versao_atual" IS 'Versão atual do book (incrementa a cada retificação)';



COMMENT ON COLUMN "public"."books"."enviado_em" IS 'Data/hora em que o book foi enviado ao cliente (UTC)';



COMMENT ON COLUMN "public"."books"."enviado_por" IS 'Usuário que enviou o book ao cliente';



COMMENT ON COLUMN "public"."books"."destinatarios_envio" IS 'Lista de emails que receberam o book';



COMMENT ON COLUMN "public"."books"."dados_consumo_segmentado" IS 'Snapshot dos dados de consumo segmentado por empresa (apenas para clientes com baseline_segmentado ativo)';



COMMENT ON COLUMN "public"."books"."precisa_retificacao" IS 'Indica que o book precisa ser retificado pois um requerimento foi adicionado após o fechamento do período';



COMMENT ON COLUMN "public"."books"."dados_requerimentos_em_desenvolvimento" IS 'Snapshot de requerimentos em desenvolvimento (status lancado) para exibição no book';



CREATE TABLE IF NOT EXISTS "public"."empresas_clientes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome_completo" character varying(255) NOT NULL,
    "nome_abreviado" character varying(100) NOT NULL,
    "link_sharepoint" "text",
    "template_padrao" character varying(255) DEFAULT 'portugues'::character varying,
    "status" character varying(20) DEFAULT 'ativo'::character varying,
    "data_status" timestamp with time zone DEFAULT "now"(),
    "descricao_status" "text",
    "email_gestor" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "book_personalizado" boolean DEFAULT false,
    "anexo" boolean DEFAULT false,
    "vigencia_inicial" "date",
    "vigencia_final" "date",
    "tem_ams" boolean DEFAULT false,
    "tipo_book" "public"."tipo_book_enum" DEFAULT 'nao_tem_book'::"public"."tipo_book_enum",
    "tipo_cobranca" "public"."tipo_cobranca_enum" DEFAULT 'banco_horas'::"public"."tipo_cobranca_enum",
    "observacao" "text",
    "em_projeto" boolean DEFAULT false,
    "tipo_contrato" character varying(10),
    "periodo_apuracao" integer,
    "inicio_vigencia" "date",
    "baseline_horas_mensal" interval,
    "baseline_tickets_mensal" numeric(10,2),
    "possui_repasse_especial" boolean DEFAULT false,
    "ciclos_para_zerar" integer DEFAULT 1,
    "percentual_repasse_mensal" integer,
    "ciclo_atual" integer DEFAULT 1,
    "percentual_repasse_especial" integer,
    "baseline_segmentado" boolean DEFAULT false,
    "segmentacao_config" "jsonb",
    "meta_sla_percentual" numeric(5,2),
    "quantidade_minima_chamados_sla" integer,
    "tipo_repasse_especial" character varying(20) DEFAULT 'simples'::character varying,
    "duracao_periodo_meses" integer,
    "percentual_dentro_periodo" integer,
    "percentual_entre_periodos" integer,
    "periodos_ate_zerar" integer,
    "dia_inicio_apuracao" integer DEFAULT 1,
    "dia_fim_apuracao" integer DEFAULT 0,
    "email_comercial" character varying(255),
    "email_tm" "text",
    "empresa_consolidadora_id" "uuid",
    CONSTRAINT "check_duracao_periodo_meses" CHECK ((("duracao_periodo_meses" IS NULL) OR (("duracao_periodo_meses" >= 1) AND ("duracao_periodo_meses" <= 12)))),
    CONSTRAINT "check_observacao_length" CHECK (("length"("observacao") <= 500)),
    CONSTRAINT "check_percentual_dentro_periodo" CHECK ((("percentual_dentro_periodo" IS NULL) OR (("percentual_dentro_periodo" >= 0) AND ("percentual_dentro_periodo" <= 100)))),
    CONSTRAINT "check_percentual_entre_periodos" CHECK ((("percentual_entre_periodos" IS NULL) OR (("percentual_entre_periodos" >= 0) AND ("percentual_entre_periodos" <= 100)))),
    CONSTRAINT "check_periodos_ate_zerar" CHECK ((("periodos_ate_zerar" IS NULL) OR (("periodos_ate_zerar" >= 1) AND ("periodos_ate_zerar" <= 12)))),
    CONSTRAINT "check_tipo_repasse_especial" CHECK ((("tipo_repasse_especial")::"text" = ANY ((ARRAY['simples'::character varying, 'por_periodo'::character varying])::"text"[]))),
    CONSTRAINT "chk_dia_fim_apuracao" CHECK ((("dia_fim_apuracao" >= 0) AND ("dia_fim_apuracao" <= 28))),
    CONSTRAINT "chk_dia_inicio_apuracao" CHECK ((("dia_inicio_apuracao" >= 1) AND ("dia_inicio_apuracao" <= 28))),
    CONSTRAINT "empresas_clientes_ciclo_atual_check" CHECK (("ciclo_atual" > 0)),
    CONSTRAINT "empresas_clientes_ciclos_para_zerar_check" CHECK (("ciclos_para_zerar" > 0)),
    CONSTRAINT "empresas_clientes_meta_sla_percentual_check" CHECK ((("meta_sla_percentual" >= (0)::numeric) AND ("meta_sla_percentual" <= (100)::numeric))),
    CONSTRAINT "empresas_clientes_percentual_repasse_especial_check" CHECK ((("percentual_repasse_especial" >= 0) AND ("percentual_repasse_especial" <= 100))),
    CONSTRAINT "empresas_clientes_percentual_repasse_mensal_check" CHECK ((("percentual_repasse_mensal" >= 0) AND ("percentual_repasse_mensal" <= 100))),
    CONSTRAINT "empresas_clientes_periodo_apuracao_check" CHECK ((("periodo_apuracao" >= 1) AND ("periodo_apuracao" <= 12))),
    CONSTRAINT "empresas_clientes_quantidade_minima_chamados_sla_check" CHECK (("quantidade_minima_chamados_sla" >= 0)),
    CONSTRAINT "empresas_clientes_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['ativo'::character varying, 'inativo'::character varying, 'suspenso'::character varying])::"text"[]))),
    CONSTRAINT "empresas_clientes_tipo_contrato_check" CHECK ((("tipo_contrato")::"text" = ANY ((ARRAY['horas'::character varying, 'tickets'::character varying, 'ambos'::character varying])::"text"[])))
);


ALTER TABLE "public"."empresas_clientes" OWNER TO "postgres";


COMMENT ON TABLE "public"."empresas_clientes" IS 'Tabela de empresas clientes para o sistema de books. Inclui controle de vigência e configurações de book personalizado';



COMMENT ON COLUMN "public"."empresas_clientes"."template_padrao" IS 'Template de email para books. Pode ser "portugues", "ingles" (templates padrão) ou UUID de template personalizado da tabela email_templates';



COMMENT ON COLUMN "public"."empresas_clientes"."created_at" IS 'Data de criação (UTC, exibir em America/Sao_Paulo)';



COMMENT ON COLUMN "public"."empresas_clientes"."updated_at" IS 'Data de atualização (UTC, exibir em America/Sao_Paulo)';



COMMENT ON COLUMN "public"."empresas_clientes"."book_personalizado" IS 'Indica se a empresa usa book personalizado. Quando TRUE, não aparece no Controle de Disparos padrão, mas sim na tela Disparos Personalizados';



COMMENT ON COLUMN "public"."empresas_clientes"."anexo" IS 'Indica se a empresa permite anexos nos disparos personalizados. Quando TRUE, na tela Disparos Personalizados haverá opção para anexar arquivos';



COMMENT ON COLUMN "public"."empresas_clientes"."vigencia_inicial" IS 'Data de início da vigência do contrato da empresa';



COMMENT ON COLUMN "public"."empresas_clientes"."vigencia_final" IS 'Data de fim da vigência do contrato da empresa. Quando atingida, o status será automaticamente alterado para inativo';



COMMENT ON COLUMN "public"."empresas_clientes"."tem_ams" IS 'Indica se a empresa possui AMS ativo. Quando true, aparece na tela Controle Disparos';



COMMENT ON COLUMN "public"."empresas_clientes"."tipo_book" IS 'Tipo de book da empresa: nao_tem_book, qualidade ou outros. Qualidade aparece na tela Controle Disparos';



COMMENT ON COLUMN "public"."empresas_clientes"."tipo_cobranca" IS 'Tipo de cobrança da empresa: banco_horas ou ticket';



COMMENT ON COLUMN "public"."empresas_clientes"."observacao" IS 'Observações gerais sobre a empresa (máximo 500 caracteres)';



COMMENT ON COLUMN "public"."empresas_clientes"."em_projeto" IS 'Indica se a empresa ainda está em fase de projeto/implementação';



COMMENT ON COLUMN "public"."empresas_clientes"."tipo_contrato" IS 'Tipo de contrato: horas, tickets ou ambos';



COMMENT ON COLUMN "public"."empresas_clientes"."periodo_apuracao" IS 'Período de apuração em meses (1-12)';



COMMENT ON COLUMN "public"."empresas_clientes"."inicio_vigencia" IS 'Data de início da vigência do contrato (MM/YYYY)';



COMMENT ON COLUMN "public"."empresas_clientes"."baseline_horas_mensal" IS 'Baseline mensal de horas contratadas';



COMMENT ON COLUMN "public"."empresas_clientes"."baseline_tickets_mensal" IS 'Baseline mensal de tickets contratados';



COMMENT ON COLUMN "public"."empresas_clientes"."possui_repasse_especial" IS 'Se true, aplica lógica de ciclos para zerar saldo positivo';



COMMENT ON COLUMN "public"."empresas_clientes"."ciclos_para_zerar" IS 'Número de ciclos antes de zerar saldo positivo (se possui_repasse_especial = true)';



COMMENT ON COLUMN "public"."empresas_clientes"."percentual_repasse_mensal" IS 'Percentual de repasse mensal (0-100). Valor 0 = não repassa nada. NULL = usar fallback 100%. Sincronizado com percentual_repasse_historico.';



COMMENT ON COLUMN "public"."empresas_clientes"."ciclo_atual" IS 'Ciclo atual do contrato para controle de repasse especial';



COMMENT ON COLUMN "public"."empresas_clientes"."percentual_repasse_especial" IS 'Percentual de repasse entre vigências (0-100%). Usado quando possui_repasse_especial = true. Define quanto do saldo positivo será repassado de uma vigência para outra baseado em ciclos_para_zerar.';



COMMENT ON COLUMN "public"."empresas_clientes"."baseline_segmentado" IS 'Define se a empresa possui baseline segmentado entre múltiplas empresas';



COMMENT ON COLUMN "public"."empresas_clientes"."segmentacao_config" IS 'Configuração JSON com empresas segmentadas, percentuais e filtros. Formato: {"empresas": [{"nome": "EMPRESA1", "percentual": 60, "filtro_tipo": "contem", "filtro_valor": "PALAVRA"}]}';



COMMENT ON COLUMN "public"."empresas_clientes"."meta_sla_percentual" IS 'Porcentagem mínima de SLA a considerar para não contar como estouro do atendimento (0-100).
Exemplo: 95.00 significa que 95% dos chamados devem estar dentro do SLA.';



COMMENT ON COLUMN "public"."empresas_clientes"."quantidade_minima_chamados_sla" IS 'Quantidade mínima de chamados abertos para considerar o estouro do SLA.
Exemplo: 10 significa que só considera estouro se houver pelo menos 10 chamados.';



COMMENT ON COLUMN "public"."empresas_clientes"."tipo_repasse_especial" IS 'Tipo de repasse especial: simples (percentual fixo) ou por_periodo (percentuais diferentes dentro e entre períodos)';



COMMENT ON COLUMN "public"."empresas_clientes"."duracao_periodo_meses" IS 'Duração de cada período em meses (ex: 3 para trimestral)';



COMMENT ON COLUMN "public"."empresas_clientes"."percentual_dentro_periodo" IS 'Percentual de repasse entre meses do mesmo período';



COMMENT ON COLUMN "public"."empresas_clientes"."percentual_entre_periodos" IS 'Percentual de repasse ao mudar de período';



COMMENT ON COLUMN "public"."empresas_clientes"."periodos_ate_zerar" IS 'Quantidade de períodos até zerar o saldo';



COMMENT ON COLUMN "public"."empresas_clientes"."dia_inicio_apuracao" IS 'Dia do mês em que inicia a apuração. Default 1 = início do mês. Ex: 15 para Samarco (apuração 15 do mês anterior a 14 do mês atual)';



COMMENT ON COLUMN "public"."empresas_clientes"."dia_fim_apuracao" IS 'Dia do mês em que encerra a apuração. Default 0 = último dia do mês. Quando dia_inicio > 1, o fim é dia_inicio - 1. Ex: 14 para Samarco';



COMMENT ON COLUMN "public"."empresas_clientes"."email_comercial" IS 'Email do contato Comercial da empresa, usado para filtrar a pessoa no organograma Comercial/CS do book';



COMMENT ON COLUMN "public"."empresas_clientes"."email_tm" IS 'Email do responsável T&M vinculado à empresa (usado para filtrar no organograma)';



COMMENT ON COLUMN "public"."empresas_clientes"."empresa_consolidadora_id" IS 'Referência à empresa consolidadora. Quando preenchido, esta empresa não aparece nas telas de Disparo e Disparo Personalizado, pois seu book é enviado junto com o da empresa consolidadora.';



CREATE OR REPLACE VIEW "public"."books_com_empresa" WITH ("security_invoker"='true') AS
 SELECT "b"."id",
    "b"."empresa_id",
    "e"."nome_completo" AS "empresa_nome",
    "e"."nome_abreviado" AS "empresa_nome_abreviado",
    "b"."mes",
    "b"."ano",
    "b"."status",
    "b"."pdf_url",
    "b"."pdf_gerado_em",
    "b"."created_at",
    "b"."updated_at",
        CASE
            WHEN ("b"."dados_capa" IS NOT NULL) THEN true
            ELSE false
        END AS "tem_dados"
   FROM ("public"."books" "b"
     JOIN "public"."empresas_clientes" "e" ON (("b"."empresa_id" = "e"."id")));


ALTER VIEW "public"."books_com_empresa" OWNER TO "postgres";


COMMENT ON VIEW "public"."books_com_empresa" IS 'Books com informações básicas da empresa. Usa security_invoker para respeitar RLS.';



CREATE TABLE IF NOT EXISTS "public"."books_historico_geracao" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "book_id" "uuid",
    "usuario_id" "uuid",
    "acao" "text" NOT NULL,
    "status" "text" NOT NULL,
    "detalhes" "jsonb",
    "tempo_processamento_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "books_historico_geracao_acao_check" CHECK (("acao" = ANY (ARRAY['criacao'::"text", 'atualizacao'::"text", 'regeneracao'::"text", 'exclusao'::"text"]))),
    CONSTRAINT "books_historico_geracao_status_check" CHECK (("status" = ANY (ARRAY['sucesso'::"text", 'erro'::"text"])))
);


ALTER TABLE "public"."books_historico_geracao" OWNER TO "postgres";


COMMENT ON TABLE "public"."books_historico_geracao" IS 'Histórico de gerações e atualizações de books';



CREATE TABLE IF NOT EXISTS "public"."books_versoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "book_id" "uuid" NOT NULL,
    "versao" integer NOT NULL,
    "dados_capa" "jsonb",
    "dados_volumetria" "jsonb",
    "dados_sla" "jsonb",
    "dados_backlog" "jsonb",
    "dados_consumo" "jsonb",
    "dados_pesquisa" "jsonb",
    "pdf_url" "text",
    "pdf_gerado_em" timestamp with time zone,
    "enviado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    "enviado_por" "uuid",
    "destinatarios" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "motivo_retificacao" "text",
    "retificado_por" "uuid",
    "retificado_em" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."books_versoes" OWNER TO "postgres";


COMMENT ON TABLE "public"."books_versoes" IS 'Snapshots imutáveis de books enviados. Cada versão representa exatamente o que foi enviado ao cliente.';



COMMENT ON COLUMN "public"."books_versoes"."versao" IS 'Número sequencial da versão (1 = original, 2+ = retificações)';



COMMENT ON COLUMN "public"."books_versoes"."dados_capa" IS 'Snapshot imutável dos dados da capa no momento do envio';



COMMENT ON COLUMN "public"."books_versoes"."dados_volumetria" IS 'Snapshot imutável dos dados de volumetria no momento do envio';



COMMENT ON COLUMN "public"."books_versoes"."dados_sla" IS 'Snapshot imutável dos dados de SLA no momento do envio';



COMMENT ON COLUMN "public"."books_versoes"."dados_backlog" IS 'Snapshot imutável dos dados de backlog no momento do envio';



COMMENT ON COLUMN "public"."books_versoes"."dados_consumo" IS 'Snapshot imutável dos dados de consumo no momento do envio';



COMMENT ON COLUMN "public"."books_versoes"."dados_pesquisa" IS 'Snapshot imutável dos dados de pesquisa no momento do envio';



COMMENT ON COLUMN "public"."books_versoes"."motivo_retificacao" IS 'Motivo obrigatório para retificações (versão > 1)';



CREATE TABLE IF NOT EXISTS "public"."clientes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome_completo" character varying(255) NOT NULL,
    "email" character varying(255) NOT NULL,
    "funcao" character varying(100),
    "empresa_id" "uuid",
    "status" character varying(20) DEFAULT 'ativo'::character varying,
    "data_status" timestamp with time zone DEFAULT "now"(),
    "descricao_status" "text",
    "principal_contato" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "finalidade_envio" "text" DEFAULT 'book'::"text" NOT NULL,
    CONSTRAINT "clientes_finalidade_envio_check" CHECK (("finalidade_envio" = ANY (ARRAY['book'::"text", 'saldo_parcial'::"text", 'ambos'::"text"]))),
    CONSTRAINT "colaboradores_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['ativo'::character varying, 'inativo'::character varying])::"text"[])))
);


ALTER TABLE "public"."clientes" OWNER TO "postgres";


COMMENT ON TABLE "public"."clientes" IS 'Tabela de clientes com RLS otimizado. Políticas específicas por ação para melhor performance.';



COMMENT ON COLUMN "public"."clientes"."created_at" IS 'Data de criação (UTC, exibir em America/Sao_Paulo)';



COMMENT ON COLUMN "public"."clientes"."updated_at" IS 'Data de atualização (UTC, exibir em America/Sao_Paulo)';



COMMENT ON COLUMN "public"."clientes"."finalidade_envio" IS 'Finalidade de envio do contato: book (Book mensal), saldo_parcial (Saldo Parcial do banco de horas) ou ambos';



CREATE TABLE IF NOT EXISTS "public"."codigo_resolucao_modificacoes_aranda" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_externo" "text" NOT NULL,
    "item_id" "text" NOT NULL,
    "old_value" "text",
    "new_value" "text",
    "created" timestamp with time zone NOT NULL,
    "synced_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."codigo_resolucao_modificacoes_aranda" OWNER TO "postgres";


COMMENT ON TABLE "public"."codigo_resolucao_modificacoes_aranda" IS 'Trocas de código de resolução dos chamados (origem: AMScodigoresolucao_Modificacao no SQL Server Aranda)';



COMMENT ON COLUMN "public"."codigo_resolucao_modificacoes_aranda"."id_externo" IS 'AMScodigoresolucao_Modificacao|{item_id}|{created}';



COMMENT ON COLUMN "public"."codigo_resolucao_modificacoes_aranda"."item_id" IS 'Nº do chamado (apontamentos_tickets_aranda.nro_solicitacao)';



COMMENT ON COLUMN "public"."codigo_resolucao_modificacoes_aranda"."created" IS 'Data/hora da troca no Aranda';



CREATE TABLE IF NOT EXISTS "public"."controle_mensal" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mes" integer NOT NULL,
    "ano" integer NOT NULL,
    "empresa_id" "uuid",
    "status" character varying(20) DEFAULT 'pendente'::character varying,
    "data_processamento" timestamp with time zone,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "controle_mensal_ano_check" CHECK (("ano" >= 2020)),
    CONSTRAINT "controle_mensal_mes_check" CHECK ((("mes" >= 1) AND ("mes" <= 12))),
    CONSTRAINT "controle_mensal_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'enviado'::character varying, 'falhou'::character varying, 'agendado'::character varying])::"text"[])))
);


ALTER TABLE "public"."controle_mensal" OWNER TO "postgres";


COMMENT ON TABLE "public"."controle_mensal" IS 'Controle de status dos disparos mensais por empresa';



COMMENT ON COLUMN "public"."controle_mensal"."created_at" IS 'Data de criação (UTC, exibir em America/Sao_Paulo)';



CREATE TABLE IF NOT EXISTS "public"."de_para_categoria" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "status" "text" DEFAULT 'ativa'::"text" NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "atualizado_em" timestamp with time zone DEFAULT "now"(),
    "criado_por" "uuid",
    "grupo" "text",
    "grupo_book" "text",
    CONSTRAINT "de_para_categoria_status_check" CHECK (("status" = ANY (ARRAY['ativa'::"text", 'inativa'::"text"])))
);


ALTER TABLE "public"."de_para_categoria" OWNER TO "postgres";


COMMENT ON TABLE "public"."de_para_categoria" IS 'Tabela DE-PARA para mapeamento de Categoria e Grupo das pesquisas de satisfação';



COMMENT ON COLUMN "public"."de_para_categoria"."id" IS 'Identificador único do registro';



COMMENT ON COLUMN "public"."de_para_categoria"."status" IS 'Status do registro: ativa ou inativa';



COMMENT ON COLUMN "public"."de_para_categoria"."criado_em" IS 'Data/hora de criação do registro';



COMMENT ON COLUMN "public"."de_para_categoria"."atualizado_em" IS 'Data/hora da última atualização';



COMMENT ON COLUMN "public"."de_para_categoria"."criado_por" IS 'ID do usuário que criou o registro';



COMMENT ON COLUMN "public"."de_para_categoria"."grupo" IS 'Código de resolução / grupo de classificação';



COMMENT ON COLUMN "public"."de_para_categoria"."grupo_book" IS 'Grupo do book para mapeamento de exibição';



CREATE TABLE IF NOT EXISTS "public"."elogio_especialistas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "elogio_id" "uuid" NOT NULL,
    "especialista_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."elogio_especialistas" OWNER TO "postgres";


COMMENT ON TABLE "public"."elogio_especialistas" IS 'Relacionamento N:N entre elogios e especialistas';



CREATE TABLE IF NOT EXISTS "public"."elogios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pesquisa_id" "uuid" NOT NULL,
    "chamado" "text",
    "empresa_id" "uuid",
    "data_resposta" "date",
    "observacao" "text",
    "acao_tomada" "text",
    "compartilhado_com" "text",
    "status" "text" DEFAULT 'registrado'::"text",
    "criado_por" "uuid",
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "atualizado_em" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "elogios_status_check" CHECK (("status" = ANY (ARRAY['registrado'::"text", 'compartilhado'::"text", 'arquivado'::"text", 'enviado'::"text"])))
);


ALTER TABLE "public"."elogios" OWNER TO "postgres";


COMMENT ON TABLE "public"."elogios" IS 'Elogios de clientes. Políticas RLS baseadas em permissões de tela.';



COMMENT ON COLUMN "public"."elogios"."pesquisa_id" IS 'Referência à pesquisa de satisfação';



COMMENT ON COLUMN "public"."elogios"."chamado" IS 'Número do chamado relacionado';



COMMENT ON COLUMN "public"."elogios"."empresa_id" IS 'Empresa cliente relacionada';



COMMENT ON COLUMN "public"."elogios"."data_resposta" IS 'Data de resposta da pesquisa (copiada para facilitar filtros)';



COMMENT ON COLUMN "public"."elogios"."observacao" IS 'Observações sobre o elogio';



COMMENT ON COLUMN "public"."elogios"."acao_tomada" IS 'Ação tomada em resposta ao elogio';



COMMENT ON COLUMN "public"."elogios"."compartilhado_com" IS 'Com quem o elogio foi compartilhado';



COMMENT ON COLUMN "public"."elogios"."status" IS 'Status do elogio: registrado, compartilhado, arquivado, enviado';



CREATE TABLE IF NOT EXISTS "public"."elogios_historico" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "elogio_id" "uuid" NOT NULL,
    "data_atualizacao" timestamp with time zone DEFAULT "now"(),
    "usuario_id" "uuid",
    "usuario_nome" "text",
    "descricao_atualizacao" "text" NOT NULL,
    "tipo_atualizacao" "text",
    "criado_em" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "elogios_historico_tipo_atualizacao_check" CHECK (("tipo_atualizacao" = ANY (ARRAY['criacao'::"text", 'atualizacao'::"text", 'compartilhamento'::"text", 'arquivamento'::"text", 'envio'::"text"])))
);


ALTER TABLE "public"."elogios_historico" OWNER TO "postgres";


COMMENT ON TABLE "public"."elogios_historico" IS 'Histórico de alterações nos elogios';



COMMENT ON COLUMN "public"."elogios_historico"."elogio_id" IS 'Referência ao elogio';



COMMENT ON COLUMN "public"."elogios_historico"."tipo_atualizacao" IS 'Tipo de atualização: criacao, atualizacao, compartilhamento, arquivamento, envio';



CREATE TABLE IF NOT EXISTS "public"."email_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "destinatario" "text" NOT NULL,
    "assunto" "text" NOT NULL,
    "status" "text" DEFAULT 'pendente'::"text" NOT NULL,
    "erro" "text",
    "enviado_em" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" DEFAULT 'template_orcamento'::"text" NOT NULL,
    "assunto" "text" NOT NULL,
    "corpo" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "descricao" "text",
    "tipo" "text" DEFAULT 'book'::"text",
    "ativo" boolean DEFAULT true,
    "vinculado_formulario" boolean DEFAULT false,
    "formulario" "text",
    "modalidade" "text",
    "converter_em_imagem" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."email_templates" OWNER TO "postgres";


COMMENT ON COLUMN "public"."email_templates"."converter_em_imagem" IS 'Quando TRUE, o conteúdo do email é convertido em imagem PNG antes do envio. Padrão: FALSE (envia HTML diretamente).';



CREATE TABLE IF NOT EXISTS "public"."email_test_data" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" character varying(255) NOT NULL,
    "dados" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "email_test_data_nome_check" CHECK (("length"(("nome")::"text") > 0))
);


ALTER TABLE "public"."email_test_data" OWNER TO "postgres";


COMMENT ON TABLE "public"."email_test_data" IS 'Tabela para armazenar conjuntos de dados de teste para templates de e-mail';



COMMENT ON COLUMN "public"."email_test_data"."created_at" IS 'Data de criação (UTC, exibir em America/Sao_Paulo)';



COMMENT ON COLUMN "public"."email_test_data"."updated_at" IS 'Data de última atualização (UTC, exibir em America/Sao_Paulo)';



CREATE TABLE IF NOT EXISTS "public"."empresa_anexos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "nome_original" "text" NOT NULL,
    "nome_arquivo" "text" NOT NULL,
    "tipo_mime" "text" NOT NULL,
    "tamanho_bytes" bigint NOT NULL,
    "storage_path" "text" NOT NULL,
    "descricao" "text",
    "ordem" integer DEFAULT 0 NOT NULL,
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."empresa_anexos" OWNER TO "postgres";


COMMENT ON TABLE "public"."empresa_anexos" IS 'Anexos vinculados às empresas clientes. Máximo de 5 anexos por empresa.';



COMMENT ON COLUMN "public"."empresa_anexos"."storage_path" IS 'Caminho do arquivo no bucket anexos-permanentes (ex: empresas/{empresa_id}/{nome_arquivo})';



COMMENT ON COLUMN "public"."empresa_anexos"."ordem" IS 'Ordem de exibição do anexo (0-4)';



CREATE TABLE IF NOT EXISTS "public"."empresa_grupos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid",
    "grupo_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."empresa_grupos" OWNER TO "postgres";


COMMENT ON TABLE "public"."empresa_grupos" IS 'Relacionamento N:N entre empresas e grupos responsáveis';



COMMENT ON COLUMN "public"."empresa_grupos"."created_at" IS 'Data de criação (UTC, exibir em America/Sao_Paulo)';



CREATE TABLE IF NOT EXISTS "public"."empresa_produtos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid",
    "produto" character varying(50) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "empresa_produtos_produto_check" CHECK ((("produto")::"text" = ANY ((ARRAY['COMEX'::character varying, 'FISCAL'::character varying, 'GALLERY'::character varying])::"text"[])))
);


ALTER TABLE "public"."empresa_produtos" OWNER TO "postgres";


COMMENT ON TABLE "public"."empresa_produtos" IS 'Relacionamento N:N entre empresas e produtos contratados';



COMMENT ON COLUMN "public"."empresa_produtos"."created_at" IS 'Data de criação (UTC, exibir em America/Sao_Paulo)';



CREATE TABLE IF NOT EXISTS "public"."especialistas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "origem" "public"."origem_especialista_enum" DEFAULT 'manual'::"public"."origem_especialista_enum" NOT NULL,
    "id_externo" "text",
    "codigo" "text",
    "nome" "text" NOT NULL,
    "email" "text",
    "telefone" "text",
    "cargo" "text",
    "departamento" "text",
    "empresa" "text",
    "especialidade" "text",
    "nivel" "text",
    "observacoes" "text",
    "status" "public"."status_especialista_enum" DEFAULT 'ativo'::"public"."status_especialista_enum" NOT NULL,
    "autor_id" "uuid",
    "autor_nome" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."especialistas" OWNER TO "postgres";


COMMENT ON TABLE "public"."especialistas" IS 'Tabela de especialistas/consultores. Dados sincronizados da tabela AMSespecialistas do SQL Server.';



COMMENT ON COLUMN "public"."especialistas"."id" IS 'ID único UUID gerado pelo Supabase';



COMMENT ON COLUMN "public"."especialistas"."origem" IS 'Origem do registro: sql_server (sincronizado) ou manual (criado no sistema)';



COMMENT ON COLUMN "public"."especialistas"."id_externo" IS 'ID único gerado para registros do SQL Server (formato: AMSespecialistas|user_name|user_email)';



COMMENT ON COLUMN "public"."especialistas"."codigo" IS 'Campo legado - não usado para registros da nova estrutura (sempre NULL para sql_server)';



COMMENT ON COLUMN "public"."especialistas"."nome" IS 'Nome do especialista (mapeado de AMSespecialistas.user_name)';



COMMENT ON COLUMN "public"."especialistas"."email" IS 'Email do especialista (mapeado de AMSespecialistas.user_email)';



COMMENT ON COLUMN "public"."especialistas"."telefone" IS 'Telefone - não disponível no SQL Server (sempre NULL para sql_server)';



COMMENT ON COLUMN "public"."especialistas"."cargo" IS 'Cargo - não disponível no SQL Server (sempre NULL para sql_server)';



COMMENT ON COLUMN "public"."especialistas"."departamento" IS 'Departamento - não disponível no SQL Server (sempre NULL para sql_server)';



COMMENT ON COLUMN "public"."especialistas"."empresa" IS 'Empresa - não disponível no SQL Server (sempre NULL para sql_server)';



COMMENT ON COLUMN "public"."especialistas"."especialidade" IS 'Especialidade - não disponível no SQL Server (sempre NULL para sql_server)';



COMMENT ON COLUMN "public"."especialistas"."nivel" IS 'Nível - não disponível no SQL Server (sempre NULL para sql_server)';



COMMENT ON COLUMN "public"."especialistas"."observacoes" IS 'Observações - não disponível no SQL Server (sempre NULL para sql_server)';



COMMENT ON COLUMN "public"."especialistas"."status" IS 'Status do especialista (mapeado de AMSespecialistas.user_active: true=ativo, false=inativo)';



COMMENT ON COLUMN "public"."especialistas"."autor_id" IS 'ID do usuário que criou o registro (NULL para registros do sql_server)';



COMMENT ON COLUMN "public"."especialistas"."autor_nome" IS 'Nome do autor (sempre "SQL Server Sync" para registros do sql_server)';



CREATE TABLE IF NOT EXISTS "public"."grupo_emails" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "grupo_id" "uuid",
    "email" character varying(255) NOT NULL,
    "nome" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."grupo_emails" OWNER TO "postgres";


COMMENT ON TABLE "public"."grupo_emails" IS 'E-mails associados aos grupos de responsáveis';



COMMENT ON COLUMN "public"."grupo_emails"."created_at" IS 'Data de criação (UTC, exibir em America/Sao_Paulo)';



CREATE TABLE IF NOT EXISTS "public"."grupos_responsaveis" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" character varying(100) NOT NULL,
    "descricao" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."grupos_responsaveis" OWNER TO "postgres";


COMMENT ON TABLE "public"."grupos_responsaveis" IS 'Grupos de responsáveis para receber cópias dos e-mails';



COMMENT ON COLUMN "public"."grupos_responsaveis"."created_at" IS 'Data de criação (UTC, exibir em America/Sao_Paulo)';



COMMENT ON COLUMN "public"."grupos_responsaveis"."updated_at" IS 'Data de atualização (UTC, exibir em America/Sao_Paulo)';



CREATE TABLE IF NOT EXISTS "public"."historico_disparos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid",
    "colaborador_id" "uuid",
    "template_id" "uuid",
    "status" character varying(20) NOT NULL,
    "data_disparo" timestamp with time zone,
    "data_agendamento" timestamp with time zone,
    "erro_detalhes" "text",
    "assunto" character varying(500),
    "emails_cc" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "cliente_id" "uuid",
    "anexo_id" "uuid",
    "anexo_processado" boolean DEFAULT false,
    CONSTRAINT "historico_disparos_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['enviado'::character varying, 'falhou'::character varying, 'agendado'::character varying, 'cancelado'::character varying])::"text"[])))
);


ALTER TABLE "public"."historico_disparos" OWNER TO "postgres";


COMMENT ON TABLE "public"."historico_disparos" IS 'Histórico detalhado de todos os disparos de e-mail';



COMMENT ON COLUMN "public"."historico_disparos"."colaborador_id" IS 'ID do usuário autenticado (auth.users) que realizou o disparo. Corrigido: antes referenciava clientes erroneamente.';



COMMENT ON COLUMN "public"."historico_disparos"."created_at" IS 'Data de criação (UTC, exibir em America/Sao_Paulo)';



COMMENT ON COLUMN "public"."historico_disparos"."anexo_id" IS 'Referência para o anexo associado ao disparo (opcional)';



COMMENT ON COLUMN "public"."historico_disparos"."anexo_processado" IS 'Indica se o anexo foi processado com sucesso pelo Power Automate';



CREATE TABLE IF NOT EXISTS "public"."historico_inconsistencias_chamados" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "origem" "text" NOT NULL,
    "nro_chamado" "text" NOT NULL,
    "tipo_inconsistencia" "text" NOT NULL,
    "data_atividade" timestamp with time zone,
    "data_sistema" timestamp with time zone,
    "tempo_gasto_horas" "text",
    "tempo_gasto_minutos" double precision,
    "empresa" "text",
    "analista" "text",
    "tipo_chamado" "text",
    "descricao_inconsistencia" "text" NOT NULL,
    "data_envio" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email_analista" "text",
    "enviado_por" "uuid",
    "enviado_por_nome" "text",
    "mes_referencia" integer NOT NULL,
    "ano_referencia" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "inconsistencia_id" "uuid",
    "email_cc" "text",
    CONSTRAINT "historico_inconsistencias_chamados_ano_referencia_check" CHECK (("ano_referencia" >= 2020)),
    CONSTRAINT "historico_inconsistencias_chamados_mes_referencia_check" CHECK ((("mes_referencia" >= 1) AND ("mes_referencia" <= 12))),
    CONSTRAINT "historico_inconsistencias_chamados_origem_check" CHECK (("origem" = ANY (ARRAY['apontamentos'::"text", 'tickets'::"text"]))),
    CONSTRAINT "historico_inconsistencias_chamados_tipo_inconsistencia_check" CHECK (("tipo_inconsistencia" = ANY (ARRAY['mes_diferente'::"text", 'data_invertida'::"text", 'tempo_excessivo'::"text", 'ic_999999'::"text", 'sem_atualizacao'::"text", 'troca_codigo_resolucao'::"text", 'validacao_solucao'::"text"])))
);


ALTER TABLE "public"."historico_inconsistencias_chamados" OWNER TO "postgres";


COMMENT ON TABLE "public"."historico_inconsistencias_chamados" IS 'Histórico de inconsistências de chamados já notificadas aos analistas';



COMMENT ON COLUMN "public"."historico_inconsistencias_chamados"."origem" IS 'Origem da inconsistência: apontamentos ou tickets';



COMMENT ON COLUMN "public"."historico_inconsistencias_chamados"."tipo_inconsistencia" IS 'Tipo de inconsistência detectada';



COMMENT ON COLUMN "public"."historico_inconsistencias_chamados"."data_envio" IS 'Data e hora do envio da notificação';



COMMENT ON COLUMN "public"."historico_inconsistencias_chamados"."email_analista" IS 'Destinatários (Para) do email, separados por ", "';



COMMENT ON COLUMN "public"."historico_inconsistencias_chamados"."mes_referencia" IS 'Mês de referência da inconsistência (1-12)';



COMMENT ON COLUMN "public"."historico_inconsistencias_chamados"."ano_referencia" IS 'Ano de referência da inconsistência';



COMMENT ON COLUMN "public"."historico_inconsistencias_chamados"."inconsistencia_id" IS 'Inconsistência (inconsistencias_chamados.id) a que o envio se refere';



COMMENT ON COLUMN "public"."historico_inconsistencias_chamados"."email_cc" IS 'Destinatários em cópia (CC), separados por ", "';



CREATE TABLE IF NOT EXISTS "public"."inconsistencias_chamados" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "origem" "text" NOT NULL,
    "nro_chamado" "text" NOT NULL,
    "nro_tarefa" "text",
    "tipo_chamado" "text",
    "item_configuracao" "text",
    "chave_unica" "text" NOT NULL,
    "tipo_inconsistencia" "text" NOT NULL,
    "descricao_inconsistencia" "text" NOT NULL,
    "data_abertura" timestamp with time zone,
    "data_atividade" timestamp with time zone,
    "data_sistema" timestamp with time zone,
    "tempo_gasto_horas" "text",
    "tempo_gasto_minutos" double precision,
    "empresa" "text",
    "analista" "text",
    "status" "text" DEFAULT 'ativa'::"text" NOT NULL,
    "data_deteccao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "data_resolucao" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status_chamado" "text",
    "cod_resolucao" "text",
    "arquivado_manualmente" boolean DEFAULT false NOT NULL,
    "cod_resolucao_anterior" "text",
    CONSTRAINT "inconsistencias_chamados_origem_check" CHECK (("origem" = ANY (ARRAY['apontamentos'::"text", 'tickets'::"text"]))),
    CONSTRAINT "inconsistencias_chamados_status_check" CHECK (("status" = ANY (ARRAY['ativa'::"text", 'resolvida'::"text", 'descartada'::"text"]))),
    CONSTRAINT "inconsistencias_chamados_tipo_inconsistencia_check" CHECK (("tipo_inconsistencia" = ANY (ARRAY['mes_diferente'::"text", 'data_invertida'::"text", 'tempo_excessivo'::"text", 'ic_999999'::"text", 'sem_atualizacao'::"text", 'troca_codigo_resolucao'::"text", 'validacao_solucao'::"text"])))
);


ALTER TABLE "public"."inconsistencias_chamados" OWNER TO "postgres";


COMMENT ON TABLE "public"."inconsistencias_chamados" IS 'Inconsistências de chamados detectadas pela integração. Status ativa = pendente de correção, resolvida = corrigida pelo analista.';



COMMENT ON COLUMN "public"."inconsistencias_chamados"."chave_unica" IS 'Chave composta: origem-nro_chamado-tipo_inconsistencia-data_atividade. Evita duplicatas.';



COMMENT ON COLUMN "public"."inconsistencias_chamados"."status" IS 'Status da inconsistência: ativa (pendente) ou resolvida (analista corrigiu os dados)';



COMMENT ON COLUMN "public"."inconsistencias_chamados"."data_deteccao" IS 'Data/hora em que a inconsistência foi detectada pela primeira vez (UTC)';



COMMENT ON COLUMN "public"."inconsistencias_chamados"."data_resolucao" IS 'Data/hora em que a inconsistência foi resolvida automaticamente (dados corrigidos na origem)';



COMMENT ON COLUMN "public"."inconsistencias_chamados"."status_chamado" IS 'Status atual do chamado no sistema de origem (ex: Open, Hold, In Progress, Cancelled, etc.)';



COMMENT ON COLUMN "public"."inconsistencias_chamados"."arquivado_manualmente" IS 'Indica se a inconsistência foi arquivada manualmente pelo usuário. Quando true, a detecção automática não deve reativar este registro mesmo que o chamado ainda esteja inconsistente.';



COMMENT ON COLUMN "public"."inconsistencias_chamados"."cod_resolucao_anterior" IS 'Código de resolução antes da troca (tipo troca_codigo_resolucao)';



CREATE TABLE IF NOT EXISTS "public"."job_configurations" (
    "id" integer NOT NULL,
    "key" character varying(100) NOT NULL,
    "value" "jsonb" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_configurations" OWNER TO "postgres";


COMMENT ON TABLE "public"."job_configurations" IS 'Configurações do sistema de jobs';



COMMENT ON COLUMN "public"."job_configurations"."created_at" IS 'Data de criação (UTC, exibir em America/Sao_Paulo)';



COMMENT ON COLUMN "public"."job_configurations"."updated_at" IS 'Data de atualização (UTC, exibir em America/Sao_Paulo)';



CREATE SEQUENCE IF NOT EXISTS "public"."job_configurations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."job_configurations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."job_configurations_id_seq" OWNED BY "public"."job_configurations"."id";



CREATE TABLE IF NOT EXISTS "public"."jobs_queue" (
    "id" character varying(255) NOT NULL,
    "type" character varying(50) NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "scheduled_at" timestamp with time zone NOT NULL,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "attempts" integer DEFAULT 0 NOT NULL,
    "max_attempts" integer DEFAULT 3 NOT NULL,
    "last_error" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "result" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "jobs_queue_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'running'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::"text"[]))),
    CONSTRAINT "jobs_queue_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['monthly_books_dispatch'::character varying, 'retry_failed_dispatch'::character varying, 'cleanup_old_data'::character varying])::"text"[])))
);


ALTER TABLE "public"."jobs_queue" OWNER TO "postgres";


COMMENT ON TABLE "public"."jobs_queue" IS 'Fila de jobs para execução assíncrona de tarefas do sistema';



COMMENT ON COLUMN "public"."jobs_queue"."type" IS 'Tipo do job: monthly_books_dispatch, retry_failed_dispatch, cleanup_old_data';



COMMENT ON COLUMN "public"."jobs_queue"."status" IS 'Status do job: pending, running, completed, failed, cancelled';



COMMENT ON COLUMN "public"."jobs_queue"."payload" IS 'Dados necessários para execução do job';



COMMENT ON COLUMN "public"."jobs_queue"."result" IS 'Resultado da execução do job';



COMMENT ON COLUMN "public"."jobs_queue"."created_at" IS 'Data de criação (UTC, exibir em America/Sao_Paulo)';



COMMENT ON COLUMN "public"."jobs_queue"."updated_at" IS 'Data de atualização (UTC, exibir em America/Sao_Paulo)';



CREATE TABLE IF NOT EXISTS "public"."logs_sistema" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "operacao" character varying(100) NOT NULL,
    "detalhes" "text",
    "data_operacao" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."logs_sistema" OWNER TO "postgres";


COMMENT ON TABLE "public"."logs_sistema" IS 'Tabela para registrar logs de operações automáticas do sistema';



COMMENT ON COLUMN "public"."logs_sistema"."data_operacao" IS 'Data da operação (UTC, exibir em America/Sao_Paulo)';



CREATE TABLE IF NOT EXISTS "public"."notificacoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tipo" "text" NOT NULL,
    "screen_key" character varying NOT NULL,
    "titulo" "text" NOT NULL,
    "mensagem" "text" NOT NULL,
    "link" "text",
    "empresa_id" "uuid",
    "chave" "text" NOT NULL,
    "referencia" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "resolvida_em" timestamp with time zone,
    "resolvida_motivo" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notificacoes_tipo_check" CHECK (("tipo" = ANY (ARRAY['book_precisa_retificacao'::"text", 'ajuste_retroativo_pendente'::"text", 'saldo_parcial_falha'::"text", 'geracao_books_falha'::"text"])))
);


ALTER TABLE "public"."notificacoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notificacoes_leituras" (
    "notificacao_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lida_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notificacoes_leituras" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizacao_estrutura" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "cargo" "text" NOT NULL,
    "departamento" "text" NOT NULL,
    "email" "text" NOT NULL,
    "telefone" "text",
    "foto_url" "text",
    "superior_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ordem_exibicao" integer DEFAULT 0,
    CONSTRAINT "organizacao_estrutura_cargo_check" CHECK (("cargo" = ANY (ARRAY['Diretor'::"text", 'Gerente'::"text", 'Coordenador'::"text", 'Central Escalação'::"text", 'Customer Success'::"text", 'Comercial'::"text", 'T&M'::"text"]))),
    CONSTRAINT "valid_hierarchy_flexible" CHECK (((("cargo" = ANY (ARRAY['Diretor'::"text", 'Customer Success'::"text", 'Comercial'::"text", 'T&M'::"text"])) AND ("superior_id" IS NULL)) OR ("cargo" = ANY (ARRAY['Gerente'::"text", 'Coordenador'::"text", 'Central Escalação'::"text"]))))
);


ALTER TABLE "public"."organizacao_estrutura" OWNER TO "postgres";


COMMENT ON TABLE "public"."organizacao_estrutura" IS 'Estrutura organizacional hierárquica da empresa';



COMMENT ON COLUMN "public"."organizacao_estrutura"."cargo" IS 'Cargo da pessoa no organograma. Valores permitidos: Diretor, Gerente, Coordenador, Central Escalação, Customer Success, Comercial';



COMMENT ON COLUMN "public"."organizacao_estrutura"."superior_id" IS 'Referência ao superior hierárquico (NULL para Diretores)';



COMMENT ON COLUMN "public"."organizacao_estrutura"."created_at" IS 'Data de criação (UTC, exibir em America/Sao_Paulo)';



COMMENT ON COLUMN "public"."organizacao_estrutura"."updated_at" IS 'Data de última atualização (UTC, exibir em America/Sao_Paulo)';



COMMENT ON COLUMN "public"."organizacao_estrutura"."ordem_exibicao" IS 'Ordem de exibição no organograma (menor número aparece primeiro)';



COMMENT ON CONSTRAINT "organizacao_estrutura_cargo_check" ON "public"."organizacao_estrutura" IS 'Cargos permitidos: Diretor, Gerente, Coordenador, Central Escalação, Customer Success, Comercial, T&M';



COMMENT ON CONSTRAINT "valid_hierarchy_flexible" ON "public"."organizacao_estrutura" IS 'Hierarquia: Diretor/Customer Success/Comercial/T&M sem superior; Gerente/Coordenador/Central Escalação flexíveis';



CREATE TABLE IF NOT EXISTS "public"."organizacao_multiplos_superiores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pessoa_id" "uuid" NOT NULL,
    "superior_id" "uuid" NOT NULL,
    "produto" character varying(20) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "organizacao_multiplos_superiores_produto_check" CHECK ((("produto")::"text" = ANY ((ARRAY['COMEX'::character varying, 'FISCAL'::character varying, 'GALLERY'::character varying])::"text"[])))
);


ALTER TABLE "public"."organizacao_multiplos_superiores" OWNER TO "postgres";


COMMENT ON TABLE "public"."organizacao_multiplos_superiores" IS 'Relacionamento N:N entre pessoas e seus múltiplos superiores por produto (usado para Central Escalação)';



COMMENT ON COLUMN "public"."organizacao_multiplos_superiores"."pessoa_id" IS 'ID da pessoa subordinada (geralmente Central Escalação)';



COMMENT ON COLUMN "public"."organizacao_multiplos_superiores"."superior_id" IS 'ID do superior (geralmente Coordenador)';



COMMENT ON COLUMN "public"."organizacao_multiplos_superiores"."produto" IS 'Produto onde existe a relação hierárquica';



CREATE TABLE IF NOT EXISTS "public"."organizacao_produto" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pessoa_id" "uuid" NOT NULL,
    "produto" character varying(50) NOT NULL,
    "superior_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "organizacao_produto_produto_check" CHECK ((("produto")::"text" = ANY ((ARRAY['COMEX'::character varying, 'FISCAL'::character varying, 'GALLERY'::character varying, 'CUSTOMER_SUCCESS'::character varying, 'COMERCIAL'::character varying, 'T_M'::character varying])::"text"[])))
);


ALTER TABLE "public"."organizacao_produto" OWNER TO "postgres";


COMMENT ON TABLE "public"."organizacao_produto" IS 'Relacionamento N:N entre pessoas e produtos. Uma pessoa pode estar em múltiplos organogramas (produtos) com superiores diferentes.';



COMMENT ON COLUMN "public"."organizacao_produto"."pessoa_id" IS 'Referência à pessoa na estrutura organizacional';



COMMENT ON COLUMN "public"."organizacao_produto"."produto" IS 'Produto: COMEX, FISCAL ou GALLERY';



COMMENT ON COLUMN "public"."organizacao_produto"."superior_id" IS 'Superior hierárquico específico para este produto. Diretor não pode ter superior (validado por trigger).';



COMMENT ON COLUMN "public"."organizacao_produto"."created_at" IS 'Data de criação (UTC, exibir em America/Sao_Paulo)';



COMMENT ON COLUMN "public"."organizacao_produto"."updated_at" IS 'Data de última atualização (UTC, exibir em America/Sao_Paulo)';



CREATE TABLE IF NOT EXISTS "public"."percentual_repasse_historico" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "percentual" numeric(5,2) NOT NULL,
    "data_inicio" "date" NOT NULL,
    "data_fim" "date",
    "motivo" "text",
    "observacao" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid",
    CONSTRAINT "check_vigencia_valida" CHECK ((("data_fim" IS NULL) OR ("data_fim" >= "data_inicio"))),
    CONSTRAINT "percentual_repasse_historico_percentual_check" CHECK ((("percentual" >= (0)::numeric) AND ("percentual" <= (100)::numeric)))
);


ALTER TABLE "public"."percentual_repasse_historico" OWNER TO "postgres";


COMMENT ON TABLE "public"."percentual_repasse_historico" IS 'Histórico de vigências de percentual de repasse mensal por empresa. Permite rastreamento temporal de mudanças contratuais.';



COMMENT ON COLUMN "public"."percentual_repasse_historico"."empresa_id" IS 'Referência à empresa cliente';



COMMENT ON COLUMN "public"."percentual_repasse_historico"."percentual" IS 'Percentual de repasse mensal nesta vigência (0-100)';



COMMENT ON COLUMN "public"."percentual_repasse_historico"."data_inicio" IS 'Data de início da vigência (inclusive)';



COMMENT ON COLUMN "public"."percentual_repasse_historico"."data_fim" IS 'Data de fim da vigência (inclusive). NULL indica vigência atual/ativa';



COMMENT ON COLUMN "public"."percentual_repasse_historico"."motivo" IS 'Motivo da mudança: Renovação Contratual, Renegociação, Ajuste, Correção, etc.';



COMMENT ON COLUMN "public"."percentual_repasse_historico"."observacao" IS 'Observações adicionais sobre a mudança';



COMMENT ON COLUMN "public"."percentual_repasse_historico"."created_by" IS 'Usuário que criou o registro';



COMMENT ON COLUMN "public"."percentual_repasse_historico"."updated_by" IS 'Usuário que atualizou o registro';



CREATE TABLE IF NOT EXISTS "public"."permission_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" character varying(50) NOT NULL,
    "record_id" "uuid" NOT NULL,
    "action" character varying(20) NOT NULL,
    "old_values" "jsonb",
    "new_values" "jsonb",
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "ip_address" "inet",
    "user_agent" "text",
    CONSTRAINT "permission_audit_logs_action_check" CHECK ((("action")::"text" = ANY ((ARRAY['INSERT'::character varying, 'UPDATE'::character varying, 'DELETE'::character varying])::"text"[])))
);


ALTER TABLE "public"."permission_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pesquisa_especialistas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pesquisa_id" "uuid" NOT NULL,
    "especialista_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pesquisa_especialistas" OWNER TO "postgres";


COMMENT ON TABLE "public"."pesquisa_especialistas" IS 'Relacionamento N:N entre pesquisas e especialistas';



CREATE TABLE IF NOT EXISTS "public"."pesquisa_mensal_ams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "identificador_questionario" "text" NOT NULL,
    "nome_questionario" "text" NOT NULL,
    "mes_referencia" integer NOT NULL,
    "inicio_real_questionario" "date",
    "nome_respondente" "text",
    "email_respondente" "text",
    "cliente" "text",
    "cliente_foco" boolean DEFAULT false,
    "vertical" "text",
    "unidade_negocio" "text",
    "nota" numeric,
    "comentario" "text",
    "inicio_resposta" "date",
    "termino_resposta" "date",
    "situacao_resposta" "text",
    "incompleto" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "ano_referencia" integer,
    CONSTRAINT "pesquisa_mensal_ams_mes_referencia_check" CHECK ((("mes_referencia" >= 1) AND ("mes_referencia" <= 12)))
);


ALTER TABLE "public"."pesquisa_mensal_ams" OWNER TO "postgres";


COMMENT ON TABLE "public"."pesquisa_mensal_ams" IS 'Dados da Pesquisa Mensal AMS importados via Excel';



COMMENT ON COLUMN "public"."pesquisa_mensal_ams"."created_at" IS 'Data de criação (UTC)';



COMMENT ON COLUMN "public"."pesquisa_mensal_ams"."updated_at" IS 'Data de última atualização (UTC)';



CREATE TABLE IF NOT EXISTS "public"."pesquisas_satisfacao" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "origem" "public"."origem_pesquisa_enum" DEFAULT 'manual'::"public"."origem_pesquisa_enum" NOT NULL,
    "id_externo" "text",
    "empresa" "text" NOT NULL,
    "categoria" "text",
    "grupo" "text",
    "cliente" "text" NOT NULL,
    "email_cliente" "text",
    "prestador" "text",
    "nro_caso" "text",
    "tipo_caso" "text",
    "ano_abertura" integer,
    "mes_abertura" integer,
    "data_resposta" timestamp with time zone,
    "resposta" "text",
    "comentario_pesquisa" "text",
    "empresa_id" "uuid",
    "cliente_id" "uuid",
    "status" "public"."status_pesquisa_enum" DEFAULT 'pendente'::"public"."status_pesquisa_enum" NOT NULL,
    "data_envio" timestamp with time zone,
    "autor_id" "uuid",
    "autor_nome" "text",
    "observacao" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tem_plano_acao" boolean DEFAULT false,
    "data_encaminhamento" timestamp with time zone,
    "solicitante" character varying(255),
    "source_updated_at" timestamp with time zone,
    "synced_at" timestamp with time zone DEFAULT "now"(),
    "hash_origem" "text",
    "chave_unica" "text",
    "servico" "text",
    "nome_pesquisa" "text",
    "data_fechamento" timestamp with time zone,
    "data_ultima_modificacao" timestamp with time zone,
    "autor_notificacao" "text",
    "estado" "text",
    "descricao" "text",
    "pesquisa_recebida" "text",
    "pergunta" "text",
    "sequencia_pergunta" "text",
    "log" timestamp with time zone,
    "coordenador_id" "uuid",
    CONSTRAINT "check_ano_abertura" CHECK ((("ano_abertura" >= 2000) AND ("ano_abertura" <= 2100))),
    CONSTRAINT "check_mes_abertura" CHECK ((("mes_abertura" >= 1) AND ("mes_abertura" <= 12))),
    CONSTRAINT "check_origem_id_externo" CHECK (((("origem" = 'sql_server'::"public"."origem_pesquisa_enum") AND ("id_externo" IS NOT NULL)) OR (("origem" = 'manual'::"public"."origem_pesquisa_enum") AND ("id_externo" IS NULL))))
);


ALTER TABLE "public"."pesquisas_satisfacao" OWNER TO "postgres";


COMMENT ON TABLE "public"."pesquisas_satisfacao" IS 'Tabela de pesquisas de satisfação. 
NOTA: Trigger de hash foi removido porque referenciava campo hash_dados inexistente.
Se necessário recriar o trigger, primeiro adicione o campo hash_dados à tabela.';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."origem" IS 'Origem dos dados: sql_server (sincronizado) ou manual (inserido manualmente)';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."id_externo" IS 'ID do registro no banco SQL Server (apenas para origem sql_server)';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."empresa" IS 'Nome da empresa cliente';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."categoria" IS 'Categoria do elogio';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."grupo" IS 'Grupo responsável';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."cliente" IS 'Nome do cliente que fez o elogio';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."email_cliente" IS 'Email do cliente';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."prestador" IS 'Nome do prestador de serviço elogiado';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."nro_caso" IS 'Número do caso/chamado relacionado';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."tipo_caso" IS 'Tipo do caso';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."data_resposta" IS 'Data e hora da resposta do cliente';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."resposta" IS 'Resposta/feedback do cliente';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."comentario_pesquisa" IS 'Comentários adicionais da pesquisa';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."status" IS 'Status da pesquisa: pendente, enviado_plano_acao, enviado_elogios';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."data_envio" IS 'Data de envio (UTC, exibir em America/Sao_Paulo)';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."solicitante" IS 'Nome do solicitante da pesquisa (campo do SQL Server AMSpesquisa)';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."source_updated_at" IS 'Data/hora da última atualização no sistema de origem (SQL Server). Corresponde ao campo Data_Resposta com precisão de segundos.';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."synced_at" IS 'Data/hora da última sincronização bem-sucedida deste registro.';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."hash_origem" IS 'Hash MD5 dos campos principais para detectar mudanças no registro de origem.';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."chave_unica" IS 'Chave única composta para identificação do registro no sistema de origem. Formato: empresa|cliente|nro_caso|data_resposta';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."servico" IS 'Serviço relacionado à pesquisa (origem: AMSpesquisa.Servico)';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."nome_pesquisa" IS 'Nome da pesquisa (origem: AMSpesquisa.Nome_Pesquisa)';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."data_fechamento" IS 'Data de fechamento da pesquisa (origem: AMSpesquisa.Data_Fechamento)';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."data_ultima_modificacao" IS 'Data da última modificação (origem: AMSpesquisa.Data_Ultima_Modificacao)';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."autor_notificacao" IS 'Autor da notificação (origem: AMSpesquisa.Autor_Notificacao)';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."estado" IS 'Estado da pesquisa (origem: AMSpesquisa.Estado)';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."descricao" IS 'Descrição da pesquisa (origem: AMSpesquisa.Descricao)';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."pesquisa_recebida" IS 'Indicador se pesquisa foi recebida (origem: AMSpesquisa.Pesquisa_Recebida)';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."pergunta" IS 'Pergunta da pesquisa (origem: AMSpesquisa.Pergunta)';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."sequencia_pergunta" IS 'Sequência da pergunta (origem: AMSpesquisa.SequenciaPregunta)';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."log" IS 'Log de auditoria (origem: AMSpesquisa.LOG)';



COMMENT ON COLUMN "public"."pesquisas_satisfacao"."coordenador_id" IS 'ID do coordenador responsável (referência para organizacao_estrutura)';



CREATE TABLE IF NOT EXISTS "public"."plano_acao_contatos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plano_acao_id" "uuid" NOT NULL,
    "data_contato" "date" NOT NULL,
    "meio_contato" "text" NOT NULL,
    "resumo_comunicacao" "text" NOT NULL,
    "retorno_cliente" "text",
    "observacoes" "text",
    "criado_por" "uuid",
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "atualizado_em" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "plano_acao_contatos_meio_contato_check" CHECK (("meio_contato" = ANY (ARRAY['whatsapp'::"text", 'email'::"text", 'ligacao'::"text"]))),
    CONSTRAINT "plano_acao_contatos_retorno_cliente_check" CHECK (("retorno_cliente" = ANY (ARRAY['aguardando'::"text", 'respondeu'::"text", 'solicitou_mais_informacoes'::"text"])))
);


ALTER TABLE "public"."plano_acao_contatos" OWNER TO "postgres";


COMMENT ON TABLE "public"."plano_acao_contatos" IS 'Histórico de contatos com cliente para cada plano de ação';



COMMENT ON COLUMN "public"."plano_acao_contatos"."plano_acao_id" IS 'ID do plano de ação relacionado';



COMMENT ON COLUMN "public"."plano_acao_contatos"."data_contato" IS 'Data do contato com o cliente';



COMMENT ON COLUMN "public"."plano_acao_contatos"."meio_contato" IS 'Meio utilizado para contato (whatsapp, email, ligacao)';



COMMENT ON COLUMN "public"."plano_acao_contatos"."resumo_comunicacao" IS 'Resumo do que foi comunicado';



COMMENT ON COLUMN "public"."plano_acao_contatos"."retorno_cliente" IS 'Status do retorno do cliente';



COMMENT ON COLUMN "public"."plano_acao_contatos"."observacoes" IS 'Observações adicionais sobre o contato';



CREATE TABLE IF NOT EXISTS "public"."plano_acao_historico" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plano_acao_id" "uuid" NOT NULL,
    "data_atualizacao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "usuario_id" "uuid",
    "usuario_nome" character varying(255),
    "descricao_atualizacao" "text" NOT NULL,
    "tipo_atualizacao" character varying(30),
    "criado_em" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "plano_acao_historico_tipo_atualizacao_check" CHECK ((("tipo_atualizacao")::"text" = ANY ((ARRAY['criacao'::character varying, 'atualizacao'::character varying, 'contato'::character varying, 'conclusao'::character varying, 'reabertura'::character varying, 'cancelamento'::character varying])::"text"[])))
);


ALTER TABLE "public"."plano_acao_historico" OWNER TO "postgres";


COMMENT ON TABLE "public"."plano_acao_historico" IS 'Histórico de atualizações dos planos de ação';



COMMENT ON COLUMN "public"."plano_acao_historico"."tipo_atualizacao" IS 'Tipo de atualização: criacao, atualizacao, contato, conclusao, reabertura, cancelamento';



COMMENT ON COLUMN "public"."plano_acao_historico"."criado_em" IS 'Data de criação (UTC, exibir em America/Sao_Paulo)';



CREATE TABLE IF NOT EXISTS "public"."planos_acao" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pesquisa_id" "uuid" NOT NULL,
    "descricao_acao_corretiva" "text" NOT NULL,
    "acao_preventiva" "text",
    "prioridade" character varying(20) NOT NULL,
    "status_plano" character varying(30) DEFAULT 'aberto'::character varying NOT NULL,
    "data_inicio" "date" NOT NULL,
    "data_conclusao" "date",
    "data_primeiro_contato" "date",
    "meio_contato" character varying(20),
    "resumo_comunicacao" "text",
    "retorno_cliente" character varying(30),
    "status_final" character varying(30),
    "data_fechamento" timestamp with time zone,
    "criado_por" "uuid",
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "atualizado_em" timestamp with time zone DEFAULT "now"(),
    "justificativa_cancelamento" "text",
    "data_resposta" "date",
    "comentario_cliente" "text",
    "chamado" "text",
    "empresa_id" "uuid",
    "causa" "text",
    "tipo_acao" character varying(2),
    CONSTRAINT "planos_acao_meio_contato_check" CHECK ((("meio_contato")::"text" = ANY ((ARRAY['whatsapp'::character varying, 'email'::character varying, 'ligacao'::character varying])::"text"[]))),
    CONSTRAINT "planos_acao_prioridade_check" CHECK ((("prioridade")::"text" = ANY ((ARRAY['baixa'::character varying, 'media'::character varying, 'alta'::character varying, 'critica'::character varying])::"text"[]))),
    CONSTRAINT "planos_acao_retorno_cliente_check" CHECK ((("retorno_cliente")::"text" = ANY ((ARRAY['aguardando'::character varying, 'respondeu'::character varying, 'solicitou_mais_informacoes'::character varying])::"text"[]))),
    CONSTRAINT "planos_acao_status_final_check" CHECK ((("status_final")::"text" = ANY ((ARRAY['resolvido'::character varying, 'nao_resolvido'::character varying, 'resolvido_parcialmente'::character varying])::"text"[]))),
    CONSTRAINT "planos_acao_status_plano_check" CHECK ((("status_plano")::"text" = ANY (ARRAY['aberto'::"text", 'em_andamento'::"text", 'aguardando_retorno'::"text", 'concluido'::"text", 'cancelado'::"text", 'sem_retorno'::"text"]))),
    CONSTRAINT "planos_acao_tipo_acao_check" CHECK ((("tipo_acao")::"text" = ANY ((ARRAY['NC'::character varying, 'OM'::character varying])::"text"[])))
);


ALTER TABLE "public"."planos_acao" OWNER TO "postgres";


COMMENT ON TABLE "public"."planos_acao" IS 'Planos de ação para pesquisas de satisfação';



COMMENT ON COLUMN "public"."planos_acao"."descricao_acao_corretiva" IS 'O que será feito para resolver o problema';



COMMENT ON COLUMN "public"."planos_acao"."acao_preventiva" IS 'O que será feito para evitar recorrência';



COMMENT ON COLUMN "public"."planos_acao"."prioridade" IS 'Nível de prioridade: baixa, media, alta, critica';



COMMENT ON COLUMN "public"."planos_acao"."status_plano" IS 'Status atual do plano de ação';



COMMENT ON COLUMN "public"."planos_acao"."criado_em" IS 'Data de criação (UTC, exibir em America/Sao_Paulo)';



COMMENT ON COLUMN "public"."planos_acao"."atualizado_em" IS 'Data de atualização (UTC, exibir em America/Sao_Paulo)';



COMMENT ON COLUMN "public"."planos_acao"."justificativa_cancelamento" IS 'Justificativa obrigatória quando o plano é cancelado';



COMMENT ON COLUMN "public"."planos_acao"."data_resposta" IS 'Data de resposta da pesquisa relacionada (copiada para facilitar filtros)';



COMMENT ON COLUMN "public"."planos_acao"."comentario_cliente" IS 'Comentário ou feedback do cliente sobre o problema';



COMMENT ON COLUMN "public"."planos_acao"."chamado" IS 'Número do chamado relacionado ao plano de ação';



COMMENT ON COLUMN "public"."planos_acao"."empresa_id" IS 'ID da empresa relacionada ao plano de ação';



COMMENT ON COLUMN "public"."planos_acao"."causa" IS 'Descrição da causa raiz do problema identificado na pesquisa de satisfação. Campo obrigatório quando data_conclusao estiver preenchida.';



COMMENT ON COLUMN "public"."planos_acao"."tipo_acao" IS 'Tipo de ação: NC (Não Conformidade) ou OM (Oportunidade de Melhoria)';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "active" boolean DEFAULT true,
    "language" "text" DEFAULT 'pt-BR'::"text" NOT NULL,
    "last_sign_in_at" timestamp with time zone
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'Tabela de perfis de usuários com RLS otimizado. Usuários autenticados podem ver todos os perfis mas só podem editar o próprio.';



COMMENT ON COLUMN "public"."profiles"."language" IS 'Preferência de idioma do usuário (pt-BR, en, es). Padrão: pt-BR.';



COMMENT ON COLUMN "public"."profiles"."last_sign_in_at" IS 'Último login do usuário. Sincronizado via update_last_sign_in() chamado após login.';



CREATE TABLE IF NOT EXISTS "public"."requerimento_anexos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requerimento_id" "uuid" NOT NULL,
    "nome_original" "text" NOT NULL,
    "nome_arquivo" "text" NOT NULL,
    "tipo_mime" "text" NOT NULL,
    "tamanho_bytes" bigint NOT NULL,
    "storage_path" "text" NOT NULL,
    "descricao" "text",
    "ordem" integer DEFAULT 0 NOT NULL,
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."requerimento_anexos" OWNER TO "postgres";


COMMENT ON TABLE "public"."requerimento_anexos" IS 'Anexos vinculados aos requerimentos. Máximo de 5 anexos por requerimento.';



COMMENT ON COLUMN "public"."requerimento_anexos"."storage_path" IS 'Caminho do arquivo no bucket anexos-permanentes (ex: requerimentos/{requerimento_id}/{nome_arquivo})';



COMMENT ON COLUMN "public"."requerimento_anexos"."ordem" IS 'Ordem de exibição do anexo (0-4)';



CREATE TABLE IF NOT EXISTS "public"."requerimentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chamado" character varying(50) NOT NULL,
    "cliente_id" "uuid" NOT NULL,
    "modulo" character varying(50) NOT NULL,
    "descricao" "text" NOT NULL,
    "data_envio" "date" NOT NULL,
    "data_aprovacao" "date",
    "horas_funcional" numeric(10,2) DEFAULT 0 NOT NULL,
    "horas_tecnico" numeric(10,2) DEFAULT 0 NOT NULL,
    "horas_total" numeric(10,2) GENERATED ALWAYS AS (("horas_funcional" + "horas_tecnico")) STORED,
    "linguagem" character varying(50),
    "tipo_cobranca" character varying(50) NOT NULL,
    "observacao" "text",
    "status" character varying(20) DEFAULT 'lancado'::character varying NOT NULL,
    "enviado_faturamento" boolean DEFAULT false NOT NULL,
    "data_envio_faturamento" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "valor_hora_funcional" numeric(10,2) DEFAULT NULL::numeric,
    "valor_hora_tecnico" numeric(10,2) DEFAULT NULL::numeric,
    "valor_total_funcional" numeric(10,2) DEFAULT NULL::numeric,
    "valor_total_tecnico" numeric(10,2) DEFAULT NULL::numeric,
    "valor_total_geral" numeric(10,2) DEFAULT NULL::numeric,
    "mes_cobranca" character varying(7),
    "quantidade_tickets" integer,
    "autor_id" "uuid",
    "autor_nome" "text",
    "data_faturamento" timestamp with time zone,
    "tipo_hora_extra" "text",
    "empresa_segmentacao_nome" "text",
    "horas_gestor" numeric DEFAULT 0,
    "valor_hora_gestor" numeric,
    "valor_total_gestor" numeric,
    CONSTRAINT "check_quantidade_tickets_valid" CHECK ((("quantidade_tickets" IS NULL) OR ("quantidade_tickets" > 0))),
    CONSTRAINT "linguagem_required_with_horas_tecnico" CHECK ((("horas_tecnico" = (0)::numeric) OR ("horas_tecnico" IS NULL) OR (("horas_tecnico" > (0)::numeric) AND ("linguagem" IS NOT NULL)))),
    CONSTRAINT "mes_cobranca_format_check" CHECK ((("mes_cobranca" IS NULL) OR (("mes_cobranca")::"text" = ''::"text") OR (("mes_cobranca")::"text" ~ '^(0[1-9]|1[0-2])\/\d{4}$'::"text"))),
    CONSTRAINT "requerimentos_descricao_check" CHECK (("length"("descricao") <= 500)),
    CONSTRAINT "requerimentos_observacao_check" CHECK (("length"("observacao") <= 1000)),
    CONSTRAINT "requerimentos_tipo_hora_extra_check" CHECK (("tipo_hora_extra" = ANY (ARRAY['17h30-19h30'::"text", 'apos_19h30'::"text", 'fim_semana'::"text"]))),
    CONSTRAINT "valid_chamado" CHECK ((("chamado")::"text" ~ '^[A-Za-z0-9\-]+$'::"text")),
    CONSTRAINT "valid_cobranca" CHECK ((("tipo_cobranca")::"text" = ANY ((ARRAY['Banco de Horas'::character varying, 'Cobro Interno'::character varying, 'Contrato'::character varying, 'Faturado'::character varying, 'Hora Extra'::character varying, 'Sobreaviso'::character varying, 'Reprovado'::character varying, 'Bolsão Enel'::character varying])::"text"[]))),
    CONSTRAINT "valid_datas" CHECK (("data_aprovacao" >= "data_envio")),
    CONSTRAINT "valid_horas" CHECK ((("horas_funcional" >= (0)::numeric) AND ("horas_tecnico" >= (0)::numeric))),
    CONSTRAINT "valid_linguagem" CHECK ((("linguagem" IS NULL) OR (("linguagem")::"text" = ANY ((ARRAY['ABAP'::character varying, 'DBA'::character varying, 'Funcional'::character varying, 'PL/SQL'::character varying, 'Técnico'::character varying])::"text"[])))),
    CONSTRAINT "valid_modulo" CHECK ((("modulo")::"text" = ANY ((ARRAY['Comex'::character varying, 'Comply'::character varying, 'Comply e-DOCS'::character varying, 'Gallery'::character varying, 'pw.SATI'::character varying, 'pw.SPED'::character varying, 'pw.SATI/pw.SPED'::character varying])::"text"[]))),
    CONSTRAINT "valid_status" CHECK ((("status")::"text" = ANY ((ARRAY['lancado'::character varying, 'enviado_faturamento'::character varying, 'faturado'::character varying])::"text"[])))
);


ALTER TABLE "public"."requerimentos" OWNER TO "postgres";


COMMENT ON TABLE "public"."requerimentos" IS 'Tabela para armazenar requerimentos de especificações funcionais';



COMMENT ON COLUMN "public"."requerimentos"."chamado" IS 'Número do chamado (formato: RF-6017993)';



COMMENT ON COLUMN "public"."requerimentos"."cliente_id" IS 'Referência para empresa cliente';



COMMENT ON COLUMN "public"."requerimentos"."modulo" IS 'Módulo do sistema (Comply, pw.SATI, etc.)';



COMMENT ON COLUMN "public"."requerimentos"."descricao" IS 'Descrição do requerimento (máx. 500 caracteres)';



COMMENT ON COLUMN "public"."requerimentos"."data_aprovacao" IS 'Data de aprovação do orçamento (opcional)';



COMMENT ON COLUMN "public"."requerimentos"."horas_funcional" IS 'Horas funcionais do requerimento';



COMMENT ON COLUMN "public"."requerimentos"."horas_tecnico" IS 'Horas técnicas do requerimento';



COMMENT ON COLUMN "public"."requerimentos"."horas_total" IS 'Total de horas (calculado automaticamente)';



COMMENT ON COLUMN "public"."requerimentos"."linguagem" IS 'Linguagem/tipo técnico (ABAP, DBA, etc.) - Obrigatório apenas quando há horas técnicas';



COMMENT ON COLUMN "public"."requerimentos"."tipo_cobranca" IS 'Tipo de cobrança do requerimento';



COMMENT ON COLUMN "public"."requerimentos"."observacao" IS 'Observações adicionais (máx. 1000 caracteres)';



COMMENT ON COLUMN "public"."requerimentos"."status" IS 'Status do requerimento';



COMMENT ON COLUMN "public"."requerimentos"."enviado_faturamento" IS 'Indica se foi enviado para faturamento';



COMMENT ON COLUMN "public"."requerimentos"."data_envio_faturamento" IS 'Data/hora do envio para faturamento';



COMMENT ON COLUMN "public"."requerimentos"."created_at" IS 'Data de criação (UTC, exibir em America/Sao_Paulo)';



COMMENT ON COLUMN "public"."requerimentos"."updated_at" IS 'Data de atualização (UTC, exibir em America/Sao_Paulo)';



COMMENT ON COLUMN "public"."requerimentos"."valor_hora_funcional" IS 'Valor por hora funcional (para tipos: Faturado, Hora Extra, Sobreaviso, Bolsão Enel)';



COMMENT ON COLUMN "public"."requerimentos"."valor_hora_tecnico" IS 'Valor por hora técnico (para tipos: Faturado, Hora Extra, Sobreaviso, Bolsão Enel)';



COMMENT ON COLUMN "public"."requerimentos"."valor_total_funcional" IS 'Valor total funcional (horas_funcional * valor_hora_funcional)';



COMMENT ON COLUMN "public"."requerimentos"."valor_total_tecnico" IS 'Valor total técnico (horas_tecnico * valor_hora_tecnico)';



COMMENT ON COLUMN "public"."requerimentos"."valor_total_geral" IS 'Valor total geral (valor_total_funcional + valor_total_tecnico)';



COMMENT ON COLUMN "public"."requerimentos"."mes_cobranca" IS 'Mês e ano de cobrança no formato MM/YYYY (ex: 09/2025)';



COMMENT ON COLUMN "public"."requerimentos"."quantidade_tickets" IS 'Quantidade de tickets (apenas para Banco de Horas com tem_ticket=true)';



COMMENT ON COLUMN "public"."requerimentos"."autor_id" IS 'ID do usuário que criou o requerimento';



COMMENT ON COLUMN "public"."requerimentos"."autor_nome" IS 'Nome do usuário que criou o requerimento';



COMMENT ON COLUMN "public"."requerimentos"."data_faturamento" IS 'Data e hora em que o requerimento foi marcado como faturado';



COMMENT ON COLUMN "public"."requerimentos"."tipo_hora_extra" IS 'Tipo de hora extra: 17h30-19h30 (Seg-Sex 17h30-19h30), apos_19h30 (Seg-Sex Após 19h30), fim_semana (Sáb/Dom/Feriados). Usado apenas quando tipo_cobranca = Hora Extra';



COMMENT ON COLUMN "public"."requerimentos"."empresa_segmentacao_nome" IS 'Nome da empresa de segmentação (baseline) para clientes com múltiplas empresas. 
Exemplo: Cliente ANGLO pode ter "NIQUEL" ou "IOB". 
Obrigatório apenas se o cliente tiver baseline_segmentado = true.
Valores possíveis são extraídos do campo segmentacao_config do cliente.';



COMMENT ON COLUMN "public"."requerimentos"."horas_gestor" IS 'Horas de gestor em formato decimal (ex: 5.5 = 5h30min)';



COMMENT ON COLUMN "public"."requerimentos"."valor_hora_gestor" IS 'Valor/hora do gestor obtido da taxa vigente do cliente';



COMMENT ON COLUMN "public"."requerimentos"."valor_total_gestor" IS 'Valor total de gestor (horas_gestor * valor_hora_gestor) - calculado automaticamente pelo trigger';



CREATE TABLE IF NOT EXISTS "public"."screen_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid",
    "screen_key" character varying(50),
    "permission_level" character varying(10),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "screen_permissions_permission_level_check" CHECK ((("permission_level")::"text" = ANY ((ARRAY['none'::character varying, 'view'::character varying, 'edit'::character varying])::"text"[])))
);


ALTER TABLE "public"."screen_permissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."screen_permissions" IS 'Permissões específicas de cada grupo para cada tela';



COMMENT ON COLUMN "public"."screen_permissions"."permission_level" IS 'Nível de permissão: none (sem acesso), view (visualização), edit (edição)';



CREATE TABLE IF NOT EXISTS "public"."screens" (
    "key" character varying(50) NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "category" character varying(50),
    "route" character varying(200)
);


ALTER TABLE "public"."screens" OWNER TO "postgres";


COMMENT ON TABLE "public"."screens" IS 'Tabela de telas do sistema com controle de permissões';



COMMENT ON COLUMN "public"."screens"."key" IS 'Chave única da tela (organograma)';



CREATE TABLE IF NOT EXISTS "public"."sync_agendamentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "ativo" boolean DEFAULT true NOT NULL,
    "tabelas" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "frequencia" "text" NOT NULL,
    "dias_semana" integer[] DEFAULT '{}'::integer[] NOT NULL,
    "dias_mes" integer[] DEFAULT '{}'::integer[] NOT NULL,
    "ultimo_dia_mes" boolean DEFAULT false NOT NULL,
    "modo_horario" "text" NOT NULL,
    "horarios" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "intervalo_horas" integer,
    "hora_inicio" time without time zone,
    "hora_fim" time without time zone,
    "proxima_execucao" timestamp with time zone,
    "ultima_execucao" timestamp with time zone,
    "ultimo_status" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tipo" "text" DEFAULT 'sincronizacao'::"text" NOT NULL,
    "empresa_ids" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    CONSTRAINT "sync_agendamentos_frequencia_check" CHECK (("frequencia" = ANY (ARRAY['diario'::"text", 'semanal'::"text", 'mensal'::"text"]))),
    CONSTRAINT "sync_agendamentos_horarios" CHECK ((("modo_horario" <> 'horarios'::"text") OR ("cardinality"("horarios") > 0))),
    CONSTRAINT "sync_agendamentos_intervalo" CHECK ((("modo_horario" <> 'intervalo'::"text") OR (("intervalo_horas" IS NOT NULL) AND ("hora_inicio" IS NOT NULL)))),
    CONSTRAINT "sync_agendamentos_intervalo_horas_check" CHECK ((("intervalo_horas" >= 1) AND ("intervalo_horas" <= 23))),
    CONSTRAINT "sync_agendamentos_mensal_dias" CHECK ((("frequencia" <> 'mensal'::"text") OR ("cardinality"("dias_mes") > 0) OR "ultimo_dia_mes")),
    CONSTRAINT "sync_agendamentos_modo_horario_check" CHECK (("modo_horario" = ANY (ARRAY['horarios'::"text", 'intervalo'::"text"]))),
    CONSTRAINT "sync_agendamentos_semanal_dias" CHECK ((("frequencia" <> 'semanal'::"text") OR ("cardinality"("dias_semana") > 0))),
    CONSTRAINT "sync_agendamentos_tipo_check" CHECK (("tipo" = ANY (ARRAY['sincronizacao'::"text", 'books'::"text"])))
);


ALTER TABLE "public"."sync_agendamentos" OWNER TO "postgres";


COMMENT ON COLUMN "public"."sync_agendamentos"."tipo" IS 'sincronizacao = sync SQL Server; books = geração e envio automático de books para a Qualidade';



COMMENT ON COLUMN "public"."sync_agendamentos"."empresa_ids" IS 'Só para tipo = books: empresas a gerar (vazio = todas as liberadas e ainda não enviadas)';



CREATE TABLE IF NOT EXISTS "public"."sync_control" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" "text" NOT NULL,
    "last_sync_at" timestamp with time zone,
    "last_sync_status" "text",
    "last_sync_error" "text",
    "records_synced" integer DEFAULT 0,
    "records_inserted" integer DEFAULT 0,
    "records_updated" integer DEFAULT 0,
    "records_failed" integer DEFAULT 0,
    "sync_duration_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "sync_control_last_sync_status_check" CHECK (("last_sync_status" = ANY (ARRAY['success'::"text", 'error'::"text", 'running'::"text"])))
);


ALTER TABLE "public"."sync_control" OWNER TO "postgres";


COMMENT ON TABLE "public"."sync_control" IS 'Tabela de controle para sincronização incremental - armazena informações sobre a última sincronização de cada tabela';



COMMENT ON COLUMN "public"."sync_control"."table_name" IS 'Nome da tabela sincronizada (ex: apontamentos_aranda, apontamentos_tickets_aranda)';



COMMENT ON COLUMN "public"."sync_control"."last_sync_at" IS 'Timestamp da última sincronização bem-sucedida';



COMMENT ON COLUMN "public"."sync_control"."last_sync_status" IS 'Status da última sincronização: success, error, running';



COMMENT ON COLUMN "public"."sync_control"."last_sync_error" IS 'Mensagem de erro da última sincronização (se houver)';



COMMENT ON COLUMN "public"."sync_control"."records_synced" IS 'Total de registros sincronizados na última execução';



COMMENT ON COLUMN "public"."sync_control"."records_inserted" IS 'Total de registros inseridos na última execução';



COMMENT ON COLUMN "public"."sync_control"."records_updated" IS 'Total de registros atualizados na última execução';



COMMENT ON COLUMN "public"."sync_control"."records_failed" IS 'Total de registros que falharam na última execução';



COMMENT ON COLUMN "public"."sync_control"."sync_duration_ms" IS 'Duração da última sincronização em milissegundos';



CREATE TABLE IF NOT EXISTS "public"."sync_control_pesquisas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "last_sync_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "total_processados" integer DEFAULT 0,
    "novos" integer DEFAULT 0,
    "atualizados" integer DEFAULT 0,
    "erros" integer DEFAULT 0,
    "status" "text" DEFAULT 'success'::"text",
    "mensagem" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sync_control_pesquisas" OWNER TO "postgres";


COMMENT ON TABLE "public"."sync_control_pesquisas" IS 'Tabela de controle para rastrear sincronizações de pesquisas do SQL Server';



CREATE TABLE IF NOT EXISTS "public"."sync_execucoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agendamento_id" "uuid",
    "origem" "text" NOT NULL,
    "disparado_por" "uuid",
    "tabelas" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'executando'::"text" NOT NULL,
    "iniciado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    "finalizado_em" timestamp with time zone,
    "resultado" "jsonb",
    "logs" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "tipo" "text" DEFAULT 'sincronizacao'::"text" NOT NULL,
    CONSTRAINT "sync_execucoes_origem_check" CHECK (("origem" = ANY (ARRAY['manual'::"text", 'agendado'::"text"]))),
    CONSTRAINT "sync_execucoes_status_check" CHECK (("status" = ANY (ARRAY['executando'::"text", 'sucesso'::"text", 'parcial'::"text", 'erro'::"text", 'ignorada'::"text", 'interrompida'::"text"]))),
    CONSTRAINT "sync_execucoes_tipo_check" CHECK (("tipo" = ANY (ARRAY['sincronizacao'::"text", 'books'::"text"])))
);


ALTER TABLE "public"."sync_execucoes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."sync_execucoes"."tipo" IS 'sincronizacao = sync SQL Server; books = geração e envio automático de books para a Qualidade';



CREATE TABLE IF NOT EXISTS "public"."sync_metadata" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tabela" "text" NOT NULL,
    "ultima_execucao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resultado" "text" DEFAULT 'sucesso'::"text",
    "registros_processados" integer DEFAULT 0,
    "registros_novos" integer DEFAULT 0,
    "registros_atualizados" integer DEFAULT 0,
    "registros_erros" integer DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sync_metadata" OWNER TO "postgres";


COMMENT ON TABLE "public"."sync_metadata" IS 'Armazena metadata de sincronizações com SQL Server (última execução por tabela)';



COMMENT ON COLUMN "public"."sync_metadata"."tabela" IS 'Nome da tabela sincronizada (pesquisas, especialistas, apontamentos, tickets)';



COMMENT ON COLUMN "public"."sync_metadata"."ultima_execucao" IS 'Data/hora da última sincronização executada (UTC)';



CREATE TABLE IF NOT EXISTS "public"."taxas_clientes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cliente_id" "uuid" NOT NULL,
    "vigencia_inicio" "date" NOT NULL,
    "vigencia_fim" "date",
    "tipo_produto" "text" NOT NULL,
    "criado_por" "uuid",
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "atualizado_em" timestamp with time zone DEFAULT "now"(),
    "tipo_calculo_adicional" "text" DEFAULT 'media'::"text" NOT NULL,
    "personalizado" boolean DEFAULT false,
    "valor_ticket" numeric(10,2),
    "valor_ticket_excedente" numeric(10,2),
    "ticket_excedente_simples" numeric(10,2),
    "ticket_excedente_complexo" numeric(10,2),
    "ticket_excedente_1" numeric(10,2),
    "ticket_excedente_2" numeric(10,2),
    "ticket_excedente" numeric(10,2),
    "prazo_pagamento" integer,
    CONSTRAINT "taxas_clientes_prazo_pagamento_check" CHECK ((("prazo_pagamento" IS NULL) OR ("prazo_pagamento" = ANY (ARRAY[30, 45, 60, 90, 120])))),
    CONSTRAINT "taxas_clientes_tipo_calculo_adicional_check" CHECK (("tipo_calculo_adicional" = ANY (ARRAY['normal'::"text", 'media'::"text"]))),
    CONSTRAINT "taxas_clientes_tipo_produto_check" CHECK (("tipo_produto" = ANY (ARRAY['GALLERY'::"text", 'OUTROS'::"text"])))
);


ALTER TABLE "public"."taxas_clientes" OWNER TO "postgres";


COMMENT ON TABLE "public"."taxas_clientes" IS 'Tabela de taxas de clientes com RLS permissivo. Todos os usuários autenticados têm acesso completo.';



COMMENT ON COLUMN "public"."taxas_clientes"."vigencia_inicio" IS 'Data de início da vigência da taxa';



COMMENT ON COLUMN "public"."taxas_clientes"."vigencia_fim" IS 'Data de fim da vigência (NULL = vigência indefinida)';



COMMENT ON COLUMN "public"."taxas_clientes"."tipo_produto" IS 'Tipo de produto: GALLERY ou OUTROS (define quais funções serão usadas)';



COMMENT ON COLUMN "public"."taxas_clientes"."tipo_calculo_adicional" IS 'Tipo de cálculo para Hora Adicional: normal (valor base + 15%) ou media (média das três primeiras funções)';



COMMENT ON COLUMN "public"."taxas_clientes"."personalizado" IS 'Indica se os valores da taxa são personalizados (true) ou calculados automaticamente (false). Quando true, todos os campos das tabelas podem ser editados manualmente e o reajuste não está disponível.';



COMMENT ON COLUMN "public"."taxas_clientes"."valor_ticket" IS 'Valor do Ticket - usado por VOTORANTIM e CSN';



COMMENT ON COLUMN "public"."taxas_clientes"."valor_ticket_excedente" IS 'Valor do Ticket Excedente - usado por VOTORANTIM e CSN';



COMMENT ON COLUMN "public"."taxas_clientes"."ticket_excedente_simples" IS 'Ticket Excedente - Ticket Simples - usado por EXXONMOBIL';



COMMENT ON COLUMN "public"."taxas_clientes"."ticket_excedente_complexo" IS 'Ticket Excedente - Ticket Complexo - usado por EXXONMOBIL';



COMMENT ON COLUMN "public"."taxas_clientes"."ticket_excedente_1" IS 'Ticket Base - usado por CHIESI';



COMMENT ON COLUMN "public"."taxas_clientes"."ticket_excedente_2" IS 'Ticket Excedente - usado por CHIESI';



COMMENT ON COLUMN "public"."taxas_clientes"."ticket_excedente" IS 'Ticket Excedente - usado por NIDEC';



COMMENT ON COLUMN "public"."taxas_clientes"."prazo_pagamento" IS 'Prazo de pagamento em dias. Valores permitidos: 30, 45, 60, 90, 120';



CREATE TABLE IF NOT EXISTS "public"."taxas_padrao" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tipo_produto" "text" NOT NULL,
    "valor_remota_funcional" numeric(10,2) DEFAULT 0 NOT NULL,
    "valor_remota_tecnico" numeric(10,2) DEFAULT 0 NOT NULL,
    "valor_remota_abap" numeric(10,2) DEFAULT 0,
    "valor_remota_dba" numeric(10,2) DEFAULT 0 NOT NULL,
    "valor_remota_gestor" numeric(10,2) DEFAULT 0 NOT NULL,
    "valor_local_funcional" numeric(10,2) DEFAULT 0 NOT NULL,
    "valor_local_tecnico" numeric(10,2) DEFAULT 0 NOT NULL,
    "valor_local_abap" numeric(10,2) DEFAULT 0,
    "valor_local_dba" numeric(10,2) DEFAULT 0 NOT NULL,
    "valor_local_gestor" numeric(10,2) DEFAULT 0 NOT NULL,
    "criado_por" "uuid",
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "atualizado_em" timestamp with time zone DEFAULT "now"(),
    "tipo_calculo_adicional" "text" DEFAULT 'media'::"text" NOT NULL,
    "vigencia_inicio" "date" DEFAULT CURRENT_DATE NOT NULL,
    "vigencia_fim" "date",
    CONSTRAINT "taxas_padrao_tipo_calculo_adicional_check" CHECK (("tipo_calculo_adicional" = ANY (ARRAY['normal'::"text", 'media'::"text"]))),
    CONSTRAINT "taxas_padrao_tipo_produto_check" CHECK (("tipo_produto" = ANY (ARRAY['GALLERY'::"text", 'OUTROS'::"text"])))
);


ALTER TABLE "public"."taxas_padrao" OWNER TO "postgres";


COMMENT ON TABLE "public"."taxas_padrao" IS 'Taxas padrão aplicadas automaticamente para clientes sem AMS';



COMMENT ON COLUMN "public"."taxas_padrao"."tipo_produto" IS 'Tipo de produto: GALLERY ou OUTROS';



COMMENT ON COLUMN "public"."taxas_padrao"."valor_remota_funcional" IS 'Valor base hora remota para função Funcional';



COMMENT ON COLUMN "public"."taxas_padrao"."valor_remota_tecnico" IS 'Valor base hora remota para função Técnico';



COMMENT ON COLUMN "public"."taxas_padrao"."valor_remota_abap" IS 'Valor base hora remota para função ABAP';



COMMENT ON COLUMN "public"."taxas_padrao"."valor_remota_dba" IS 'Valor base hora remota para função DBA';



COMMENT ON COLUMN "public"."taxas_padrao"."valor_remota_gestor" IS 'Valor base hora remota para função Gestor';



COMMENT ON COLUMN "public"."taxas_padrao"."valor_local_funcional" IS 'Valor base hora local para função Funcional';



COMMENT ON COLUMN "public"."taxas_padrao"."valor_local_tecnico" IS 'Valor base hora local para função Técnico';



COMMENT ON COLUMN "public"."taxas_padrao"."valor_local_abap" IS 'Valor base hora local para função ABAP';



COMMENT ON COLUMN "public"."taxas_padrao"."valor_local_dba" IS 'Valor base hora local para função DBA';



COMMENT ON COLUMN "public"."taxas_padrao"."valor_local_gestor" IS 'Valor base hora local para função Gestor';



COMMENT ON COLUMN "public"."taxas_padrao"."tipo_calculo_adicional" IS 'Tipo de cálculo para Hora Adicional: normal (valor base + 15%) ou media (média das três primeiras funções)';



COMMENT ON COLUMN "public"."taxas_padrao"."vigencia_inicio" IS 'Data de início da vigência da taxa padrão';



COMMENT ON COLUMN "public"."taxas_padrao"."vigencia_fim" IS 'Data de fim da vigência da taxa padrão (NULL = vigência indefinida)';



CREATE TABLE IF NOT EXISTS "public"."user_group_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "group_id" "uuid",
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    "assigned_by" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "public"."user_group_assignments" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_group_assignments" IS 'Atribuições de usuários aos grupos';



COMMENT ON COLUMN "public"."user_group_assignments"."user_id" IS 'Referência ao usuário do Supabase Auth';



CREATE TABLE IF NOT EXISTS "public"."user_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "is_default_admin" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "public"."user_groups" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_groups" IS 'Grupos de usuários para controle de permissões';



COMMENT ON COLUMN "public"."user_groups"."is_default_admin" IS 'Indica se é o grupo padrão de administradores (não pode ser excluído)';



CREATE TABLE IF NOT EXISTS "public"."valores_taxas_funcoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "taxa_id" "uuid" NOT NULL,
    "funcao" "text" NOT NULL,
    "tipo_hora" "text" NOT NULL,
    "valor_base" numeric(10,2) DEFAULT 0 NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "atualizado_em" timestamp with time zone DEFAULT "now"(),
    "valor_17h30_19h30" numeric(10,2),
    "valor_apos_19h30" numeric(10,2),
    "valor_fim_semana" numeric(10,2),
    "valor_adicional" numeric(10,2),
    "valor_standby" numeric(10,2),
    CONSTRAINT "check_valor_adicional_not_zero" CHECK ((("valor_adicional" IS NULL) OR ("valor_adicional" > (0)::numeric))),
    CONSTRAINT "valores_taxas_funcoes_funcao_check" CHECK (("funcao" = ANY (ARRAY['Funcional'::"text", 'Técnico / ABAP'::"text", 'DBA / Basis'::"text", 'Gestor'::"text", 'Técnico (Instalação / Atualização)'::"text", 'ABAP - PL/SQL'::"text", 'DBA'::"text"]))),
    CONSTRAINT "valores_taxas_funcoes_tipo_hora_check" CHECK (("tipo_hora" = ANY (ARRAY['remota'::"text", 'local'::"text"])))
);


ALTER TABLE "public"."valores_taxas_funcoes" OWNER TO "postgres";


COMMENT ON TABLE "public"."valores_taxas_funcoes" IS 'Tabela de valores de taxas com RLS permissivo. Todos os usuários autenticados têm acesso completo.';



COMMENT ON COLUMN "public"."valores_taxas_funcoes"."funcao" IS 'Função do profissional (varia conforme tipo_produto)';



COMMENT ON COLUMN "public"."valores_taxas_funcoes"."tipo_hora" IS 'Tipo de hora: remota ou local';



COMMENT ON COLUMN "public"."valores_taxas_funcoes"."valor_base" IS 'Valor base da hora (Seg-Sex 08h30-17h30) - demais valores são calculados';



COMMENT ON COLUMN "public"."valores_taxas_funcoes"."valor_17h30_19h30" IS 'Valor personalizado para Seg-Sex 17h30-19h30 (para taxas personalizadas - remota e local)';



COMMENT ON COLUMN "public"."valores_taxas_funcoes"."valor_apos_19h30" IS 'Valor personalizado para Seg-Sex após 19h30 (para taxas personalizadas - remota e local)';



COMMENT ON COLUMN "public"."valores_taxas_funcoes"."valor_fim_semana" IS 'Valor personalizado para Sáb/Dom/Feriados (para taxas personalizadas - remota e local)';



COMMENT ON COLUMN "public"."valores_taxas_funcoes"."valor_adicional" IS 'Valor personalizado para Hora Adicional (apenas para taxas personalizadas remotas)';



COMMENT ON COLUMN "public"."valores_taxas_funcoes"."valor_standby" IS 'Valor personalizado para Stand By (apenas para taxas personalizadas remotas)';



CREATE TABLE IF NOT EXISTS "public"."webhook_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "webhook_url" "text" NOT NULL,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."webhook_config" OWNER TO "postgres";


ALTER TABLE ONLY "backups"."admin_notifications_backup" ALTER COLUMN "backup_id" SET DEFAULT "nextval"('"backups"."admin_notifications_backup_backup_id_seq"'::"regclass");



ALTER TABLE ONLY "backups"."anexos_temporarios_backup" ALTER COLUMN "backup_id" SET DEFAULT "nextval"('"backups"."anexos_temporarios_backup_backup_id_seq"'::"regclass");



ALTER TABLE ONLY "backups"."baseline_historico_backup" ALTER COLUMN "backup_id" SET DEFAULT "nextval"('"backups"."baseline_historico_backup_backup_id_seq"'::"regclass");



ALTER TABLE ONLY "backups"."clientes_backup" ALTER COLUMN "backup_id" SET DEFAULT "nextval"('"backups"."clientes_backup_backup_id_seq"'::"regclass");



ALTER TABLE ONLY "backups"."controle_mensal_backup" ALTER COLUMN "backup_id" SET DEFAULT "nextval"('"backups"."controle_mensal_backup_backup_id_seq"'::"regclass");



ALTER TABLE ONLY "backups"."empresa_grupos_backup" ALTER COLUMN "backup_id" SET DEFAULT "nextval"('"backups"."empresa_grupos_backup_backup_id_seq"'::"regclass");



ALTER TABLE ONLY "backups"."empresa_produtos_backup" ALTER COLUMN "backup_id" SET DEFAULT "nextval"('"backups"."empresa_produtos_backup_backup_id_seq"'::"regclass");



ALTER TABLE ONLY "backups"."empresas_clientes_backup" ALTER COLUMN "backup_id" SET DEFAULT "nextval"('"backups"."empresas_clientes_backup_backup_id_seq"'::"regclass");



ALTER TABLE ONLY "backups"."grupo_emails_backup" ALTER COLUMN "backup_id" SET DEFAULT "nextval"('"backups"."grupo_emails_backup_backup_id_seq"'::"regclass");



ALTER TABLE ONLY "backups"."grupos_responsaveis_backup" ALTER COLUMN "backup_id" SET DEFAULT "nextval"('"backups"."grupos_responsaveis_backup_backup_id_seq"'::"regclass");



ALTER TABLE ONLY "backups"."historico_disparos_backup" ALTER COLUMN "backup_id" SET DEFAULT "nextval"('"backups"."historico_disparos_backup_backup_id_seq"'::"regclass");



ALTER TABLE ONLY "backups"."job_configurations_backup" ALTER COLUMN "backup_id" SET DEFAULT "nextval"('"backups"."job_configurations_backup_backup_id_seq"'::"regclass");



ALTER TABLE ONLY "backups"."jobs_queue_backup" ALTER COLUMN "backup_id" SET DEFAULT "nextval"('"backups"."jobs_queue_backup_backup_id_seq"'::"regclass");



ALTER TABLE ONLY "backups"."logs_sistema_backup" ALTER COLUMN "backup_id" SET DEFAULT "nextval"('"backups"."logs_sistema_backup_backup_id_seq"'::"regclass");



ALTER TABLE ONLY "backups"."pesquisas_satisfacao_backup" ALTER COLUMN "backup_id" SET DEFAULT "nextval"('"backups"."pesquisas_satisfacao_backup_backup_id_seq"'::"regclass");



ALTER TABLE ONLY "backups"."plano_acao_historico_backup" ALTER COLUMN "backup_id" SET DEFAULT "nextval"('"backups"."plano_acao_historico_backup_backup_id_seq"'::"regclass");



ALTER TABLE ONLY "backups"."planos_acao_backup" ALTER COLUMN "backup_id" SET DEFAULT "nextval"('"backups"."planos_acao_backup_backup_id_seq"'::"regclass");



ALTER TABLE ONLY "backups"."requerimentos_backup" ALTER COLUMN "backup_id" SET DEFAULT "nextval"('"backups"."requerimentos_backup_backup_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."job_configurations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."job_configurations_id_seq"'::"regclass");



ALTER TABLE ONLY "backups"."admin_notifications_backup"
    ADD CONSTRAINT "admin_notifications_backup_pkey" PRIMARY KEY ("backup_id");



ALTER TABLE ONLY "backups"."anexos_temporarios_backup"
    ADD CONSTRAINT "anexos_temporarios_backup_pkey" PRIMARY KEY ("backup_id");



ALTER TABLE ONLY "backups"."baseline_historico_backup"
    ADD CONSTRAINT "baseline_historico_backup_pkey" PRIMARY KEY ("backup_id");



ALTER TABLE ONLY "backups"."clientes_backup"
    ADD CONSTRAINT "clientes_backup_pkey" PRIMARY KEY ("backup_id");



ALTER TABLE ONLY "backups"."controle_mensal_backup"
    ADD CONSTRAINT "controle_mensal_backup_pkey" PRIMARY KEY ("backup_id");



ALTER TABLE ONLY "backups"."empresa_grupos_backup"
    ADD CONSTRAINT "empresa_grupos_backup_pkey" PRIMARY KEY ("backup_id");



ALTER TABLE ONLY "backups"."empresa_produtos_backup"
    ADD CONSTRAINT "empresa_produtos_backup_pkey" PRIMARY KEY ("backup_id");



ALTER TABLE ONLY "backups"."empresas_clientes_backup"
    ADD CONSTRAINT "empresas_clientes_backup_pkey" PRIMARY KEY ("backup_id");



ALTER TABLE ONLY "backups"."grupo_emails_backup"
    ADD CONSTRAINT "grupo_emails_backup_pkey" PRIMARY KEY ("backup_id");



ALTER TABLE ONLY "backups"."grupos_responsaveis_backup"
    ADD CONSTRAINT "grupos_responsaveis_backup_pkey" PRIMARY KEY ("backup_id");



ALTER TABLE ONLY "backups"."historico_disparos_backup"
    ADD CONSTRAINT "historico_disparos_backup_pkey" PRIMARY KEY ("backup_id");



ALTER TABLE ONLY "backups"."job_configurations_backup"
    ADD CONSTRAINT "job_configurations_backup_pkey" PRIMARY KEY ("backup_id");



ALTER TABLE ONLY "backups"."jobs_queue_backup"
    ADD CONSTRAINT "jobs_queue_backup_pkey" PRIMARY KEY ("backup_id");



ALTER TABLE ONLY "backups"."logs_sistema_backup"
    ADD CONSTRAINT "logs_sistema_backup_pkey" PRIMARY KEY ("backup_id");



ALTER TABLE ONLY "backups"."pesquisas_satisfacao_backup"
    ADD CONSTRAINT "pesquisas_satisfacao_backup_pkey" PRIMARY KEY ("backup_id");



ALTER TABLE ONLY "backups"."plano_acao_historico_backup"
    ADD CONSTRAINT "plano_acao_historico_backup_pkey" PRIMARY KEY ("backup_id");



ALTER TABLE ONLY "backups"."planos_acao_backup"
    ADD CONSTRAINT "planos_acao_backup_pkey" PRIMARY KEY ("backup_id");



ALTER TABLE ONLY "backups"."requerimentos_backup"
    ADD CONSTRAINT "requerimentos_backup_pkey" PRIMARY KEY ("backup_id");



ALTER TABLE ONLY "public"."admin_notifications"
    ADD CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."anexos_temporarios"
    ADD CONSTRAINT "anexos_temporarios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."apontamentos_aranda"
    ADD CONSTRAINT "apontamentos_aranda_id_externo_key" UNIQUE ("id_externo");



ALTER TABLE ONLY "public"."apontamentos_aranda"
    ADD CONSTRAINT "apontamentos_aranda_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."apontamentos_tickets_aranda"
    ADD CONSTRAINT "apontamentos_tickets_aranda_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banco_horas_ajustes_retroativos"
    ADD CONSTRAINT "banco_horas_ajustes_retroativos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banco_horas_alocacoes"
    ADD CONSTRAINT "banco_horas_alocacoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banco_horas_audit_log"
    ADD CONSTRAINT "banco_horas_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banco_horas_calculos"
    ADD CONSTRAINT "banco_horas_calculos_empresa_mes_ano_unique" UNIQUE ("empresa_id", "mes", "ano");



ALTER TABLE ONLY "public"."banco_horas_calculos"
    ADD CONSTRAINT "banco_horas_calculos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banco_horas_calculos_segmentados"
    ADD CONSTRAINT "banco_horas_calculos_segmentados_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banco_horas_envio_agendamento_empresas"
    ADD CONSTRAINT "banco_horas_envio_agendamento_empresas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banco_horas_envio_agendamentos"
    ADD CONSTRAINT "banco_horas_envio_agendamentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banco_horas_envio_execucoes"
    ADD CONSTRAINT "banco_horas_envio_execucoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banco_horas_fechamentos"
    ADD CONSTRAINT "banco_horas_fechamentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banco_horas_fechamentos"
    ADD CONSTRAINT "banco_horas_fechamentos_unique" UNIQUE ("empresa_id", "mes", "ano");



ALTER TABLE ONLY "public"."banco_horas_reajustes"
    ADD CONSTRAINT "banco_horas_reajustes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banco_horas_versoes"
    ADD CONSTRAINT "banco_horas_versoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."baseline_historico"
    ADD CONSTRAINT "baseline_historico_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banco_horas_envio_agendamento_empresas"
    ADD CONSTRAINT "bh_envio_agendamento_empresas_empresa_unica" UNIQUE ("empresa_id");



ALTER TABLE ONLY "public"."banco_horas_envio_execucoes"
    ADD CONSTRAINT "bh_envio_execucoes_unica" UNIQUE ("empresa_id", "executado_para");



ALTER TABLE ONLY "public"."book_generation_queue"
    ADD CONSTRAINT "book_generation_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."books"
    ADD CONSTRAINT "books_empresa_id_mes_ano_key" UNIQUE ("empresa_id", "mes", "ano");



ALTER TABLE ONLY "public"."books_historico_geracao"
    ADD CONSTRAINT "books_historico_geracao_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."books"
    ADD CONSTRAINT "books_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."books_versoes"
    ADD CONSTRAINT "books_versoes_book_id_versao_key" UNIQUE ("book_id", "versao");



ALTER TABLE ONLY "public"."books_versoes"
    ADD CONSTRAINT "books_versoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."codigo_resolucao_modificacoes_aranda"
    ADD CONSTRAINT "codigo_resolucao_modificacoes_aranda_id_externo_key" UNIQUE ("id_externo");



ALTER TABLE ONLY "public"."codigo_resolucao_modificacoes_aranda"
    ADD CONSTRAINT "codigo_resolucao_modificacoes_aranda_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "colaboradores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."controle_mensal"
    ADD CONSTRAINT "controle_mensal_mes_ano_empresa_id_key" UNIQUE ("mes", "ano", "empresa_id");



ALTER TABLE ONLY "public"."controle_mensal"
    ADD CONSTRAINT "controle_mensal_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."de_para_categoria"
    ADD CONSTRAINT "de_para_categoria_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."elogio_especialistas"
    ADD CONSTRAINT "elogio_especialistas_elogio_id_especialista_id_key" UNIQUE ("elogio_id", "especialista_id");



ALTER TABLE ONLY "public"."elogio_especialistas"
    ADD CONSTRAINT "elogio_especialistas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."elogios_historico"
    ADD CONSTRAINT "elogios_historico_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pesquisas_satisfacao"
    ADD CONSTRAINT "elogios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."elogios"
    ADD CONSTRAINT "elogios_pkey1" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_test_data"
    ADD CONSTRAINT "email_test_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."empresa_anexos"
    ADD CONSTRAINT "empresa_anexos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."empresa_grupos"
    ADD CONSTRAINT "empresa_grupos_empresa_id_grupo_id_key" UNIQUE ("empresa_id", "grupo_id");



ALTER TABLE ONLY "public"."empresa_grupos"
    ADD CONSTRAINT "empresa_grupos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."empresa_produtos"
    ADD CONSTRAINT "empresa_produtos_empresa_id_produto_key" UNIQUE ("empresa_id", "produto");



ALTER TABLE ONLY "public"."empresa_produtos"
    ADD CONSTRAINT "empresa_produtos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."empresas_clientes"
    ADD CONSTRAINT "empresas_clientes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."especialistas"
    ADD CONSTRAINT "especialistas_id_externo_key" UNIQUE ("id_externo");



COMMENT ON CONSTRAINT "especialistas_id_externo_key" ON "public"."especialistas" IS 'Constraint UNIQUE necessária para upsert via onConflict no serviço de sincronização';



ALTER TABLE ONLY "public"."especialistas"
    ADD CONSTRAINT "especialistas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."grupo_emails"
    ADD CONSTRAINT "grupo_emails_grupo_id_email_key" UNIQUE ("grupo_id", "email");



ALTER TABLE ONLY "public"."grupo_emails"
    ADD CONSTRAINT "grupo_emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."grupos_responsaveis"
    ADD CONSTRAINT "grupos_responsaveis_nome_key" UNIQUE ("nome");



ALTER TABLE ONLY "public"."grupos_responsaveis"
    ADD CONSTRAINT "grupos_responsaveis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."historico_disparos"
    ADD CONSTRAINT "historico_disparos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."historico_inconsistencias_chamados"
    ADD CONSTRAINT "historico_inconsistencias_chamados_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inconsistencias_chamados"
    ADD CONSTRAINT "inconsistencias_chamados_chave_unica_unique" UNIQUE ("chave_unica");



ALTER TABLE ONLY "public"."inconsistencias_chamados"
    ADD CONSTRAINT "inconsistencias_chamados_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_configurations"
    ADD CONSTRAINT "job_configurations_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."job_configurations"
    ADD CONSTRAINT "job_configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jobs_queue"
    ADD CONSTRAINT "jobs_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."logs_sistema"
    ADD CONSTRAINT "logs_sistema_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notificacoes_leituras"
    ADD CONSTRAINT "notificacoes_leituras_pkey" PRIMARY KEY ("notificacao_id", "user_id");



ALTER TABLE ONLY "public"."notificacoes"
    ADD CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizacao_estrutura"
    ADD CONSTRAINT "organizacao_estrutura_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizacao_multiplos_superiores"
    ADD CONSTRAINT "organizacao_multiplos_superio_pessoa_id_superior_id_produto_key" UNIQUE ("pessoa_id", "superior_id", "produto");



ALTER TABLE ONLY "public"."organizacao_multiplos_superiores"
    ADD CONSTRAINT "organizacao_multiplos_superiores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizacao_produto"
    ADD CONSTRAINT "organizacao_produto_pessoa_id_produto_key" UNIQUE ("pessoa_id", "produto");



ALTER TABLE ONLY "public"."organizacao_produto"
    ADD CONSTRAINT "organizacao_produto_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."percentual_repasse_historico"
    ADD CONSTRAINT "percentual_repasse_historico_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permission_audit_logs"
    ADD CONSTRAINT "permission_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pesquisa_especialistas"
    ADD CONSTRAINT "pesquisa_especialistas_pesquisa_id_especialista_id_key" UNIQUE ("pesquisa_id", "especialista_id");



ALTER TABLE ONLY "public"."pesquisa_especialistas"
    ADD CONSTRAINT "pesquisa_especialistas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pesquisa_mensal_ams"
    ADD CONSTRAINT "pesquisa_mensal_ams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plano_acao_contatos"
    ADD CONSTRAINT "plano_acao_contatos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plano_acao_historico"
    ADD CONSTRAINT "plano_acao_historico_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."planos_acao"
    ADD CONSTRAINT "plano_acao_pesquisa_unique" UNIQUE ("pesquisa_id");



ALTER TABLE ONLY "public"."planos_acao"
    ADD CONSTRAINT "planos_acao_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."requerimento_anexos"
    ADD CONSTRAINT "requerimento_anexos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."requerimentos"
    ADD CONSTRAINT "requerimentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."screen_permissions"
    ADD CONSTRAINT "screen_permissions_group_id_screen_key_key" UNIQUE ("group_id", "screen_key");



ALTER TABLE ONLY "public"."screen_permissions"
    ADD CONSTRAINT "screen_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."screens"
    ADD CONSTRAINT "screens_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."sync_agendamentos"
    ADD CONSTRAINT "sync_agendamentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sync_control_pesquisas"
    ADD CONSTRAINT "sync_control_pesquisas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sync_control"
    ADD CONSTRAINT "sync_control_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sync_control"
    ADD CONSTRAINT "sync_control_table_name_key" UNIQUE ("table_name");



ALTER TABLE ONLY "public"."sync_execucoes"
    ADD CONSTRAINT "sync_execucoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sync_metadata"
    ADD CONSTRAINT "sync_metadata_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sync_metadata"
    ADD CONSTRAINT "sync_metadata_tabela_key" UNIQUE ("tabela");



ALTER TABLE ONLY "public"."taxas_clientes"
    ADD CONSTRAINT "taxas_clientes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."taxas_padrao"
    ADD CONSTRAINT "taxas_padrao_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banco_horas_alocacoes"
    ADD CONSTRAINT "unique_alocacao_empresa" UNIQUE ("empresa_id", "nome_alocacao");



ALTER TABLE ONLY "public"."banco_horas_calculos_segmentados"
    ADD CONSTRAINT "unique_calculo_alocacao" UNIQUE ("calculo_id", "alocacao_id");



ALTER TABLE ONLY "public"."elogios"
    ADD CONSTRAINT "unique_elogio_por_pesquisa" UNIQUE ("pesquisa_id");



ALTER TABLE ONLY "public"."banco_horas_observacoes"
    ADD CONSTRAINT "unique_observacao_empresa_periodo" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."apontamentos_tickets_aranda"
    ADD CONSTRAINT "unique_ticket_nro_solicitacao" UNIQUE ("nro_solicitacao");



ALTER TABLE ONLY "public"."user_group_assignments"
    ADD CONSTRAINT "user_group_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_group_assignments"
    ADD CONSTRAINT "user_group_assignments_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_groups"
    ADD CONSTRAINT "user_groups_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."user_groups"
    ADD CONSTRAINT "user_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."valores_taxas_funcoes"
    ADD CONSTRAINT "valores_taxas_funcoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."valores_taxas_funcoes"
    ADD CONSTRAINT "valores_taxas_funcoes_taxa_id_funcao_tipo_hora_key" UNIQUE ("taxa_id", "funcao", "tipo_hora");



ALTER TABLE ONLY "public"."webhook_config"
    ADD CONSTRAINT "webhook_config_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_admin_notifications_created" ON "public"."admin_notifications" USING "btree" ("created_at");



CREATE INDEX "idx_admin_notifications_read" ON "public"."admin_notifications" USING "btree" ("read_at");



CREATE INDEX "idx_admin_notifications_severity" ON "public"."admin_notifications" USING "btree" ("severity");



CREATE INDEX "idx_alocacoes_ativo" ON "public"."banco_horas_alocacoes" USING "btree" ("ativo");



CREATE INDEX "idx_alocacoes_empresa" ON "public"."banco_horas_alocacoes" USING "btree" ("empresa_id") WHERE ("ativo" = true);



CREATE INDEX "idx_anexos_temporarios_data_upload" ON "public"."anexos_temporarios" USING "btree" ("data_upload");



CREATE INDEX "idx_anexos_temporarios_empresa_id" ON "public"."anexos_temporarios" USING "btree" ("empresa_id");



CREATE INDEX "idx_anexos_temporarios_empresa_status" ON "public"."anexos_temporarios" USING "btree" ("empresa_id", "status");



CREATE INDEX "idx_anexos_temporarios_expiracao" ON "public"."anexos_temporarios" USING "btree" ("data_expiracao");



CREATE INDEX "idx_anexos_temporarios_status" ON "public"."anexos_temporarios" USING "btree" ("status");



CREATE INDEX "idx_anexos_temporarios_token" ON "public"."anexos_temporarios" USING "btree" ("token_acesso");



CREATE INDEX "idx_apontamentos_aranda_analista_tarefa" ON "public"."apontamentos_aranda" USING "btree" ("analista_tarefa");



CREATE INDEX "idx_apontamentos_aranda_autor_id" ON "public"."apontamentos_aranda" USING "btree" ("autor_id");



CREATE INDEX "idx_apontamentos_aranda_caso_grupo" ON "public"."apontamentos_aranda" USING "btree" ("caso_grupo");



CREATE INDEX "idx_apontamentos_aranda_created_at" ON "public"."apontamentos_aranda" USING "btree" ("created_at");



COMMENT ON INDEX "public"."idx_apontamentos_aranda_created_at" IS 'Índice para otimizar busca de registros mais recentes (ORDER BY created_at DESC LIMIT 1)';



CREATE INDEX "idx_apontamentos_aranda_data_abertura" ON "public"."apontamentos_aranda" USING "btree" ("data_abertura");



CREATE INDEX "idx_apontamentos_aranda_data_atividade" ON "public"."apontamentos_aranda" USING "btree" ("data_atividade");



CREATE INDEX "idx_apontamentos_aranda_data_fechamento" ON "public"."apontamentos_aranda" USING "btree" ("data_fechamento");



CREATE INDEX "idx_apontamentos_aranda_data_ult_modificacao_geral" ON "public"."apontamentos_aranda" USING "btree" ("data_ult_modificacao_geral" DESC);



CREATE INDEX "idx_apontamentos_aranda_data_ult_modificacao_tarefa" ON "public"."apontamentos_aranda" USING "btree" ("data_ult_modificacao_tarefa");



CREATE INDEX "idx_apontamentos_aranda_id_externo" ON "public"."apontamentos_aranda" USING "btree" ("id_externo");



CREATE INDEX "idx_apontamentos_aranda_nro_chamado" ON "public"."apontamentos_aranda" USING "btree" ("nro_chamado");



CREATE INDEX "idx_apontamentos_aranda_nro_chamado_data_sistema" ON "public"."apontamentos_aranda" USING "btree" ("nro_chamado", "data_sistema");



CREATE INDEX "idx_apontamentos_aranda_origem" ON "public"."apontamentos_aranda" USING "btree" ("origem");



CREATE INDEX "idx_apontamentos_aranda_source_updated_at" ON "public"."apontamentos_aranda" USING "btree" ("source_updated_at" DESC);



CREATE INDEX "idx_apontamentos_aranda_synced_at" ON "public"."apontamentos_aranda" USING "btree" ("synced_at" DESC);



CREATE INDEX "idx_apontamentos_aranda_updated_at" ON "public"."apontamentos_aranda" USING "btree" ("updated_at" DESC NULLS LAST);



COMMENT ON INDEX "public"."idx_apontamentos_aranda_updated_at" IS 'Índice para otimizar busca de última sincronização (ORDER BY updated_at DESC LIMIT 1)';



CREATE INDEX "idx_apontamentos_cod_resolucao" ON "public"."apontamentos_aranda" USING "btree" ("cod_resolucao");



COMMENT ON INDEX "public"."idx_apontamentos_cod_resolucao" IS 'Índice para filtro de códigos de resolução válidos (IN clause).';



CREATE INDEX "idx_apontamentos_consumo_principal" ON "public"."apontamentos_aranda" USING "btree" ("data_atividade", "ativi_interna", "tipo_chamado", "item_configuracao");



COMMENT ON INDEX "public"."idx_apontamentos_consumo_principal" IS 'Índice composto para otimizar queries de consumo de banco de horas. Cobre filtros de data_atividade, ativi_interna, tipo_chamado e item_configuracao.';



CREATE INDEX "idx_apontamentos_data_sistema" ON "public"."apontamentos_aranda" USING "btree" ("data_sistema");



COMMENT ON INDEX "public"."idx_apontamentos_data_sistema" IS 'Índice para validação de mesmo mês entre data_atividade e data_sistema.';



CREATE INDEX "idx_apontamentos_mes_diferente_cover_v2" ON "public"."apontamentos_aranda" USING "btree" ("data_atividade", "data_sistema") INCLUDE ("nro_chamado", "nro_tarefa", "tipo_chamado", "item_configuracao", "data_abertura", "tempo_gasto_minutos", "org_us_final", "analista_tarefa", "cod_resolucao") WHERE (("data_atividade" IS NOT NULL) AND ("data_sistema" IS NOT NULL));



CREATE INDEX "idx_apontamentos_org_us_final_gin" ON "public"."apontamentos_aranda" USING "gin" ("org_us_final" "extensions"."gin_trgm_ops");



COMMENT ON INDEX "public"."idx_apontamentos_org_us_final_gin" IS 'Índice GIN para busca por similaridade em org_us_final usando pg_trgm (schema extensions)';



CREATE INDEX "idx_apontamentos_tempo_excessivo" ON "public"."apontamentos_aranda" USING "btree" ("data_atividade") WHERE ("tempo_gasto_minutos" > (600)::double precision);



CREATE INDEX "idx_audit_acao" ON "public"."banco_horas_audit_log" USING "btree" ("acao", "created_at" DESC);



CREATE INDEX "idx_audit_calculo" ON "public"."banco_horas_audit_log" USING "btree" ("calculo_id", "created_at" DESC);



CREATE INDEX "idx_audit_data" ON "public"."banco_horas_audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_empresa" ON "public"."banco_horas_audit_log" USING "btree" ("empresa_id", "created_at" DESC);



CREATE INDEX "idx_audit_usuario" ON "public"."banco_horas_audit_log" USING "btree" ("created_by", "created_at" DESC);



CREATE INDEX "idx_banco_horas_ajustes_retro_analisado_por" ON "public"."banco_horas_ajustes_retroativos" USING "btree" ("analisado_por");



CREATE INDEX "idx_banco_horas_ajustes_retro_created_by" ON "public"."banco_horas_ajustes_retroativos" USING "btree" ("created_by");



CREATE INDEX "idx_banco_horas_ajustes_retro_empresa_id" ON "public"."banco_horas_ajustes_retroativos" USING "btree" ("empresa_id");



CREATE INDEX "idx_banco_horas_ajustes_retro_fechamento" ON "public"."banco_horas_ajustes_retroativos" USING "btree" ("fechamento_id");



CREATE INDEX "idx_banco_horas_ajustes_retro_pendentes" ON "public"."banco_horas_ajustes_retroativos" USING "btree" ("status") WHERE ("status" = 'pendente'::"text");



CREATE INDEX "idx_banco_horas_ajustes_retro_periodo" ON "public"."banco_horas_ajustes_retroativos" USING "btree" ("mes_referencia", "ano_referencia");



CREATE INDEX "idx_banco_horas_ajustes_retro_reajuste_id" ON "public"."banco_horas_ajustes_retroativos" USING "btree" ("reajuste_gerado_id");



CREATE INDEX "idx_banco_horas_ajustes_retro_status" ON "public"."banco_horas_ajustes_retroativos" USING "btree" ("status");



CREATE INDEX "idx_banco_horas_alocacoes_created_by" ON "public"."banco_horas_alocacoes" USING "btree" ("created_by");



CREATE INDEX "idx_banco_horas_alocacoes_updated_by" ON "public"."banco_horas_alocacoes" USING "btree" ("updated_by");



CREATE INDEX "idx_banco_horas_calculos_created_by" ON "public"."banco_horas_calculos" USING "btree" ("created_by");



CREATE INDEX "idx_banco_horas_calculos_empresa_mes_ano" ON "public"."banco_horas_calculos" USING "btree" ("empresa_id", "mes", "ano");



CREATE INDEX "idx_banco_horas_calculos_updated_by" ON "public"."banco_horas_calculos" USING "btree" ("updated_by");



CREATE INDEX "idx_banco_horas_fechamentos_empresa_id" ON "public"."banco_horas_fechamentos" USING "btree" ("empresa_id");



CREATE INDEX "idx_banco_horas_fechamentos_empresa_periodo" ON "public"."banco_horas_fechamentos" USING "btree" ("empresa_id", "mes", "ano");



CREATE INDEX "idx_banco_horas_fechamentos_fechado_por" ON "public"."banco_horas_fechamentos" USING "btree" ("fechado_por");



CREATE INDEX "idx_banco_horas_fechamentos_periodo" ON "public"."banco_horas_fechamentos" USING "btree" ("mes", "ano");



CREATE INDEX "idx_banco_horas_observacoes_created_at" ON "public"."banco_horas_observacoes" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_banco_horas_observacoes_created_by" ON "public"."banco_horas_observacoes" USING "btree" ("created_by");



CREATE INDEX "idx_banco_horas_observacoes_empresa" ON "public"."banco_horas_observacoes" USING "btree" ("empresa_id");



CREATE INDEX "idx_banco_horas_observacoes_periodo" ON "public"."banco_horas_observacoes" USING "btree" ("mes", "ano");



CREATE INDEX "idx_banco_horas_reajustes_created_by" ON "public"."banco_horas_reajustes" USING "btree" ("created_by");



CREATE INDEX "idx_banco_horas_versoes_created_by" ON "public"."banco_horas_versoes" USING "btree" ("created_by");



CREATE INDEX "idx_baseline_historico_created_by" ON "public"."baseline_historico" USING "btree" ("created_by");



CREATE INDEX "idx_baseline_historico_empresa" ON "public"."baseline_historico" USING "btree" ("empresa_id");



CREATE INDEX "idx_baseline_historico_empresa_vigencia" ON "public"."baseline_historico" USING "btree" ("empresa_id", "data_inicio", "data_fim");



CREATE INDEX "idx_baseline_historico_updated_by" ON "public"."baseline_historico" USING "btree" ("updated_by");



CREATE INDEX "idx_baseline_historico_vigencia" ON "public"."baseline_historico" USING "btree" ("data_inicio", "data_fim");



CREATE UNIQUE INDEX "idx_baseline_historico_vigencia_ativa" ON "public"."baseline_historico" USING "btree" ("empresa_id") WHERE ("data_fim" IS NULL);



CREATE INDEX "idx_baseline_historico_vigencia_lookup" ON "public"."baseline_historico" USING "btree" ("empresa_id", "data_inicio" DESC, "data_fim");



COMMENT ON INDEX "public"."idx_baseline_historico_vigencia_lookup" IS 'Índice otimizado para busca de baseline vigente.
Cobre queries de get_baseline_vigente() com filtro de vigência.';



CREATE INDEX "idx_baseline_historico_vigencias_ativas" ON "public"."baseline_historico" USING "btree" ("empresa_id", "data_inicio" DESC) WHERE ("data_fim" IS NULL);



COMMENT ON INDEX "public"."idx_baseline_historico_vigencias_ativas" IS 'Índice parcial para vigências ativas (sem data_fim).
Otimiza busca de baseline atual sem especificar data.';



CREATE INDEX "idx_bh_envio_agendamento_empresas_agendamento" ON "public"."banco_horas_envio_agendamento_empresas" USING "btree" ("agendamento_id");



CREATE INDEX "idx_bh_envio_agendamentos_proxima" ON "public"."banco_horas_envio_agendamentos" USING "btree" ("proxima_execucao") WHERE "ativo";



CREATE INDEX "idx_bh_envio_execucoes_agendamento" ON "public"."banco_horas_envio_execucoes" USING "btree" ("agendamento_id");



CREATE INDEX "idx_bh_envio_execucoes_iniciado_em" ON "public"."banco_horas_envio_execucoes" USING "btree" ("iniciado_em" DESC);



CREATE INDEX "idx_book_gen_queue_batch_id" ON "public"."book_generation_queue" USING "btree" ("batch_id");



CREATE INDEX "idx_book_gen_queue_created_at" ON "public"."book_generation_queue" USING "btree" ("created_at");



CREATE INDEX "idx_book_gen_queue_empresa_periodo" ON "public"."book_generation_queue" USING "btree" ("empresa_id", "mes", "ano");



CREATE INDEX "idx_book_gen_queue_status" ON "public"."book_generation_queue" USING "btree" ("status");



CREATE INDEX "idx_book_generation_queue_criado_por" ON "public"."book_generation_queue" USING "btree" ("criado_por");



CREATE INDEX "idx_books_created_at" ON "public"."books" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_books_empresa_id" ON "public"."books" USING "btree" ("empresa_id");



CREATE INDEX "idx_books_enviado_em" ON "public"."books" USING "btree" ("enviado_em");



CREATE INDEX "idx_books_enviado_por" ON "public"."books" USING "btree" ("enviado_por");



CREATE INDEX "idx_books_historico_book_id" ON "public"."books_historico_geracao" USING "btree" ("book_id");



CREATE INDEX "idx_books_historico_created_at" ON "public"."books_historico_geracao" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_books_historico_usuario_id" ON "public"."books_historico_geracao" USING "btree" ("usuario_id");



CREATE INDEX "idx_books_periodo" ON "public"."books" USING "btree" ("mes", "ano");



CREATE INDEX "idx_books_precisa_retificacao" ON "public"."books" USING "btree" ("precisa_retificacao") WHERE ("precisa_retificacao" = true);



CREATE INDEX "idx_books_status" ON "public"."books" USING "btree" ("status");



CREATE INDEX "idx_books_versoes_book_id" ON "public"."books_versoes" USING "btree" ("book_id");



CREATE INDEX "idx_books_versoes_book_versao" ON "public"."books_versoes" USING "btree" ("book_id", "versao" DESC);



CREATE INDEX "idx_books_versoes_enviado_em" ON "public"."books_versoes" USING "btree" ("enviado_em");



CREATE INDEX "idx_books_versoes_enviado_por" ON "public"."books_versoes" USING "btree" ("enviado_por");



CREATE INDEX "idx_books_versoes_retificado_por" ON "public"."books_versoes" USING "btree" ("retificado_por");



CREATE INDEX "idx_calculos_created_at" ON "public"."banco_horas_calculos" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_calculos_empresa_periodo" ON "public"."banco_horas_calculos" USING "btree" ("empresa_id", "ano", "mes");



CREATE INDEX "idx_calculos_fim_periodo" ON "public"."banco_horas_calculos" USING "btree" ("is_fim_periodo") WHERE ("is_fim_periodo" = true);



CREATE INDEX "idx_calculos_seg_alocacao" ON "public"."banco_horas_calculos_segmentados" USING "btree" ("alocacao_id");



CREATE INDEX "idx_calculos_seg_calculo" ON "public"."banco_horas_calculos_segmentados" USING "btree" ("calculo_id");



CREATE INDEX "idx_clientes_empresa_finalidade_envio" ON "public"."clientes" USING "btree" ("empresa_id", "finalidade_envio");



CREATE INDEX "idx_cod_resolucao_modificacoes_created" ON "public"."codigo_resolucao_modificacoes_aranda" USING "btree" ("created" DESC);



CREATE INDEX "idx_cod_resolucao_modificacoes_item_created" ON "public"."codigo_resolucao_modificacoes_aranda" USING "btree" ("item_id", "created" DESC);



CREATE INDEX "idx_colaboradores_email" ON "public"."clientes" USING "btree" ("email");



CREATE INDEX "idx_colaboradores_empresa" ON "public"."clientes" USING "btree" ("empresa_id");



CREATE INDEX "idx_colaboradores_status" ON "public"."clientes" USING "btree" ("status");



CREATE INDEX "idx_controle_mensal_empresa_id" ON "public"."controle_mensal" USING "btree" ("empresa_id");



CREATE INDEX "idx_controle_mensal_periodo" ON "public"."controle_mensal" USING "btree" ("ano", "mes");



CREATE INDEX "idx_de_para_categoria_criado_por" ON "public"."de_para_categoria" USING "btree" ("criado_por");



CREATE INDEX "idx_de_para_categoria_status" ON "public"."de_para_categoria" USING "btree" ("status");



CREATE INDEX "idx_elogio_especialistas_elogio_id" ON "public"."elogio_especialistas" USING "btree" ("elogio_id");



CREATE INDEX "idx_elogio_especialistas_especialista_id" ON "public"."elogio_especialistas" USING "btree" ("especialista_id");



CREATE INDEX "idx_elogios_criado_em" ON "public"."elogios" USING "btree" ("criado_em" DESC);



CREATE INDEX "idx_elogios_criado_por" ON "public"."elogios" USING "btree" ("criado_por");



CREATE INDEX "idx_elogios_data_resposta" ON "public"."elogios" USING "btree" ("data_resposta");



CREATE INDEX "idx_elogios_data_status" ON "public"."elogios" USING "btree" ("data_resposta", "status");



CREATE INDEX "idx_elogios_empresa_id" ON "public"."elogios" USING "btree" ("empresa_id");



CREATE INDEX "idx_elogios_historico_data" ON "public"."elogios_historico" USING "btree" ("data_atualizacao" DESC);



CREATE INDEX "idx_elogios_historico_elogio_id" ON "public"."elogios_historico" USING "btree" ("elogio_id");



CREATE INDEX "idx_elogios_historico_usuario_id" ON "public"."elogios_historico" USING "btree" ("usuario_id");



CREATE INDEX "idx_elogios_pesquisa_id" ON "public"."elogios" USING "btree" ("pesquisa_id");



CREATE INDEX "idx_elogios_status" ON "public"."elogios" USING "btree" ("status");



CREATE INDEX "idx_email_logs_enviado_em" ON "public"."email_logs" USING "btree" ("enviado_em");



CREATE INDEX "idx_email_logs_status" ON "public"."email_logs" USING "btree" ("status");



CREATE INDEX "idx_email_templates_ativo" ON "public"."email_templates" USING "btree" ("ativo");



CREATE INDEX "idx_email_templates_formulario" ON "public"."email_templates" USING "btree" ("formulario");



CREATE INDEX "idx_email_templates_modalidade" ON "public"."email_templates" USING "btree" ("modalidade");



CREATE INDEX "idx_email_templates_tipo" ON "public"."email_templates" USING "btree" ("tipo");



CREATE INDEX "idx_email_templates_vinculado" ON "public"."email_templates" USING "btree" ("vinculado_formulario");



CREATE INDEX "idx_email_test_data_created_at" ON "public"."email_test_data" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_email_test_data_created_by" ON "public"."email_test_data" USING "btree" ("created_by");



CREATE INDEX "idx_email_test_data_nome" ON "public"."email_test_data" USING "btree" ("nome");



CREATE INDEX "idx_empresa_anexos_created_at" ON "public"."empresa_anexos" USING "btree" ("created_at");



CREATE INDEX "idx_empresa_anexos_empresa_id" ON "public"."empresa_anexos" USING "btree" ("empresa_id");



CREATE INDEX "idx_empresa_grupos_grupo_id" ON "public"."empresa_grupos" USING "btree" ("grupo_id");



CREATE INDEX "idx_empresas_clientes_book_personalizado" ON "public"."empresas_clientes" USING "btree" ("book_personalizado");



CREATE INDEX "idx_empresas_clientes_consolidadora" ON "public"."empresas_clientes" USING "btree" ("empresa_consolidadora_id") WHERE ("empresa_consolidadora_id" IS NOT NULL);



CREATE INDEX "idx_empresas_clientes_em_projeto" ON "public"."empresas_clientes" USING "btree" ("em_projeto");



CREATE INDEX "idx_empresas_clientes_nome" ON "public"."empresas_clientes" USING "btree" ("nome_completo");



CREATE INDEX "idx_empresas_clientes_sla" ON "public"."empresas_clientes" USING "btree" ("meta_sla_percentual", "quantidade_minima_chamados_sla") WHERE ("meta_sla_percentual" IS NOT NULL);



COMMENT ON INDEX "public"."idx_empresas_clientes_sla" IS 'Índice para otimizar consultas de empresas com metas de SLA configuradas.';



CREATE INDEX "idx_empresas_clientes_status" ON "public"."empresas_clientes" USING "btree" ("status");



CREATE INDEX "idx_empresas_clientes_tem_ams" ON "public"."empresas_clientes" USING "btree" ("tem_ams") WHERE ("tem_ams" = true);



CREATE INDEX "idx_empresas_clientes_template_padrao" ON "public"."empresas_clientes" USING "btree" ("template_padrao");



CREATE INDEX "idx_empresas_clientes_tipo_book" ON "public"."empresas_clientes" USING "btree" ("tipo_book") WHERE ("tipo_book" = 'qualidade'::"public"."tipo_book_enum");



CREATE INDEX "idx_empresas_clientes_tipo_cobranca" ON "public"."empresas_clientes" USING "btree" ("tipo_cobranca");



CREATE INDEX "idx_empresas_clientes_vigencia" ON "public"."empresas_clientes" USING "btree" ("vigencia_final") WHERE ("vigencia_final" IS NOT NULL);



CREATE INDEX "idx_empresas_segmentacao_config" ON "public"."empresas_clientes" USING "gin" ("segmentacao_config");



CREATE INDEX "idx_especialistas_autor_id" ON "public"."especialistas" USING "btree" ("autor_id");



CREATE INDEX "idx_especialistas_codigo" ON "public"."especialistas" USING "btree" ("codigo") WHERE ("codigo" IS NOT NULL);



CREATE INDEX "idx_especialistas_created_at" ON "public"."especialistas" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_especialistas_email" ON "public"."especialistas" USING "btree" ("email");



CREATE INDEX "idx_especialistas_email_lower" ON "public"."especialistas" USING "btree" ("lower"("email")) WHERE (("status" = 'ativo'::"public"."status_especialista_enum") AND ("email" IS NOT NULL));



CREATE INDEX "idx_especialistas_nome" ON "public"."especialistas" USING "btree" ("nome");



CREATE INDEX "idx_especialistas_nome_lower" ON "public"."especialistas" USING "btree" ("lower"("nome")) WHERE ("status" = 'ativo'::"public"."status_especialista_enum");



CREATE INDEX "idx_especialistas_origem" ON "public"."especialistas" USING "btree" ("origem");



CREATE INDEX "idx_especialistas_origem_status" ON "public"."especialistas" USING "btree" ("origem", "status");



CREATE INDEX "idx_especialistas_status" ON "public"."especialistas" USING "btree" ("status");



CREATE INDEX "idx_especialistas_status_nome" ON "public"."especialistas" USING "btree" ("status", "nome") WHERE ("status" = 'ativo'::"public"."status_especialista_enum");



CREATE INDEX "idx_historico_disparos_anexo_id" ON "public"."historico_disparos" USING "btree" ("anexo_id");



CREATE INDEX "idx_historico_disparos_anexo_processado" ON "public"."historico_disparos" USING "btree" ("anexo_processado");



CREATE INDEX "idx_historico_disparos_cliente_id" ON "public"."historico_disparos" USING "btree" ("cliente_id");



CREATE INDEX "idx_historico_disparos_colaborador_id" ON "public"."historico_disparos" USING "btree" ("colaborador_id");



CREATE INDEX "idx_historico_disparos_data" ON "public"."historico_disparos" USING "btree" ("data_disparo");



CREATE INDEX "idx_historico_disparos_data_disparo" ON "public"."historico_disparos" USING "btree" ("data_disparo" DESC);



CREATE INDEX "idx_historico_disparos_empresa_anexo" ON "public"."historico_disparos" USING "btree" ("empresa_id", "anexo_processado") WHERE ("anexo_id" IS NOT NULL);



CREATE INDEX "idx_historico_disparos_empresa_id" ON "public"."historico_disparos" USING "btree" ("empresa_id");



CREATE INDEX "idx_historico_disparos_status" ON "public"."historico_disparos" USING "btree" ("status");



CREATE INDEX "idx_historico_inconsistencias_analista" ON "public"."historico_inconsistencias_chamados" USING "btree" ("analista");



CREATE INDEX "idx_historico_inconsistencias_data_envio" ON "public"."historico_inconsistencias_chamados" USING "btree" ("data_envio");



CREATE INDEX "idx_historico_inconsistencias_enviado_por" ON "public"."historico_inconsistencias_chamados" USING "btree" ("enviado_por");



CREATE INDEX "idx_historico_inconsistencias_inconsistencia_id" ON "public"."historico_inconsistencias_chamados" USING "btree" ("inconsistencia_id");



CREATE INDEX "idx_historico_inconsistencias_nro_chamado" ON "public"."historico_inconsistencias_chamados" USING "btree" ("nro_chamado");



CREATE INDEX "idx_historico_inconsistencias_origem" ON "public"."historico_inconsistencias_chamados" USING "btree" ("origem");



CREATE INDEX "idx_historico_inconsistencias_periodo" ON "public"."historico_inconsistencias_chamados" USING "btree" ("mes_referencia", "ano_referencia");



CREATE INDEX "idx_historico_inconsistencias_tipo" ON "public"."historico_inconsistencias_chamados" USING "btree" ("tipo_inconsistencia");



CREATE INDEX "idx_inconsistencias_arquivado_manualmente" ON "public"."inconsistencias_chamados" USING "btree" ("arquivado_manualmente") WHERE ("arquivado_manualmente" = true);



CREATE INDEX "idx_inconsistencias_chamados_analista" ON "public"."inconsistencias_chamados" USING "btree" ("analista");



CREATE INDEX "idx_inconsistencias_chamados_data_atividade" ON "public"."inconsistencias_chamados" USING "btree" ("data_atividade");



CREATE INDEX "idx_inconsistencias_chamados_data_deteccao" ON "public"."inconsistencias_chamados" USING "btree" ("data_deteccao");



CREATE INDEX "idx_inconsistencias_chamados_data_resolucao" ON "public"."inconsistencias_chamados" USING "btree" ("data_resolucao") WHERE ("data_resolucao" IS NOT NULL);



CREATE INDEX "idx_inconsistencias_chamados_empresa" ON "public"."inconsistencias_chamados" USING "btree" ("empresa");



CREATE INDEX "idx_inconsistencias_chamados_status" ON "public"."inconsistencias_chamados" USING "btree" ("status");



CREATE INDEX "idx_inconsistencias_chamados_tipo" ON "public"."inconsistencias_chamados" USING "btree" ("tipo_inconsistencia");



CREATE INDEX "idx_inconsistencias_status_chamado" ON "public"."inconsistencias_chamados" USING "btree" ("status_chamado") WHERE ("status_chamado" IS NOT NULL);



CREATE INDEX "idx_jobs_queue_created_at" ON "public"."jobs_queue" USING "btree" ("created_at");



CREATE INDEX "idx_jobs_queue_status_scheduled" ON "public"."jobs_queue" USING "btree" ("status", "scheduled_at");



CREATE INDEX "idx_jobs_queue_type" ON "public"."jobs_queue" USING "btree" ("type");



CREATE INDEX "idx_logs_sistema_data" ON "public"."logs_sistema" USING "btree" ("data_operacao");



CREATE INDEX "idx_logs_sistema_operacao" ON "public"."logs_sistema" USING "btree" ("operacao");



CREATE INDEX "idx_multiplos_superiores_pessoa" ON "public"."organizacao_multiplos_superiores" USING "btree" ("pessoa_id");



CREATE INDEX "idx_multiplos_superiores_produto" ON "public"."organizacao_multiplos_superiores" USING "btree" ("produto");



CREATE INDEX "idx_multiplos_superiores_superior" ON "public"."organizacao_multiplos_superiores" USING "btree" ("superior_id");



CREATE INDEX "idx_organizacao_estrutura_cargo" ON "public"."organizacao_estrutura" USING "btree" ("cargo");



CREATE INDEX "idx_organizacao_estrutura_departamento" ON "public"."organizacao_estrutura" USING "btree" ("departamento");



CREATE INDEX "idx_organizacao_estrutura_ordem" ON "public"."organizacao_estrutura" USING "btree" ("superior_id", "ordem_exibicao");



CREATE INDEX "idx_organizacao_estrutura_superior_id" ON "public"."organizacao_estrutura" USING "btree" ("superior_id");



CREATE INDEX "idx_organizacao_produto_pessoa_id" ON "public"."organizacao_produto" USING "btree" ("pessoa_id");



CREATE INDEX "idx_organizacao_produto_produto" ON "public"."organizacao_produto" USING "btree" ("produto");



CREATE INDEX "idx_organizacao_produto_superior_id" ON "public"."organizacao_produto" USING "btree" ("superior_id");



CREATE INDEX "idx_percentual_repasse_hist_created_by" ON "public"."percentual_repasse_historico" USING "btree" ("created_by");



CREATE INDEX "idx_percentual_repasse_hist_updated_by" ON "public"."percentual_repasse_historico" USING "btree" ("updated_by");



CREATE INDEX "idx_percentual_repasse_historico_empresa" ON "public"."percentual_repasse_historico" USING "btree" ("empresa_id");



CREATE INDEX "idx_percentual_repasse_historico_empresa_vigencia" ON "public"."percentual_repasse_historico" USING "btree" ("empresa_id", "data_inicio", "data_fim");



CREATE INDEX "idx_percentual_repasse_historico_vigencia" ON "public"."percentual_repasse_historico" USING "btree" ("data_inicio", "data_fim");



CREATE UNIQUE INDEX "idx_percentual_repasse_historico_vigencia_ativa" ON "public"."percentual_repasse_historico" USING "btree" ("empresa_id") WHERE ("data_fim" IS NULL);



CREATE INDEX "idx_permission_audit_logs_changed_at" ON "public"."permission_audit_logs" USING "btree" ("changed_at");



CREATE INDEX "idx_permission_audit_logs_changed_by" ON "public"."permission_audit_logs" USING "btree" ("changed_by");



CREATE INDEX "idx_permission_audit_logs_table_record" ON "public"."permission_audit_logs" USING "btree" ("table_name", "record_id");



CREATE INDEX "idx_pesquisa_especialistas_especialista_id" ON "public"."pesquisa_especialistas" USING "btree" ("especialista_id");



CREATE INDEX "idx_pesquisa_especialistas_pesquisa_id" ON "public"."pesquisa_especialistas" USING "btree" ("pesquisa_id");



CREATE INDEX "idx_pesquisa_mensal_ams_ano_referencia" ON "public"."pesquisa_mensal_ams" USING "btree" ("ano_referencia");



CREATE INDEX "idx_pesquisa_mensal_ams_cliente" ON "public"."pesquisa_mensal_ams" USING "btree" ("cliente");



CREATE INDEX "idx_pesquisa_mensal_ams_created_at" ON "public"."pesquisa_mensal_ams" USING "btree" ("created_at");



CREATE INDEX "idx_pesquisa_mensal_ams_created_by" ON "public"."pesquisa_mensal_ams" USING "btree" ("created_by");



CREATE INDEX "idx_pesquisa_mensal_ams_identificador" ON "public"."pesquisa_mensal_ams" USING "btree" ("identificador_questionario");



CREATE INDEX "idx_pesquisa_mensal_ams_mes_referencia" ON "public"."pesquisa_mensal_ams" USING "btree" ("mes_referencia");



CREATE INDEX "idx_pesquisas_ano_mes" ON "public"."pesquisas_satisfacao" USING "btree" ("ano_abertura", "mes_abertura");



CREATE INDEX "idx_pesquisas_chave_unica" ON "public"."pesquisas_satisfacao" USING "btree" ("chave_unica") WHERE ("origem" = 'sql_server'::"public"."origem_pesquisa_enum");



CREATE UNIQUE INDEX "idx_pesquisas_chave_unica_unique" ON "public"."pesquisas_satisfacao" USING "btree" ("chave_unica") WHERE (("origem" = 'sql_server'::"public"."origem_pesquisa_enum") AND ("chave_unica" IS NOT NULL));



CREATE INDEX "idx_pesquisas_cliente" ON "public"."pesquisas_satisfacao" USING "btree" ("cliente");



CREATE INDEX "idx_pesquisas_cliente_id" ON "public"."pesquisas_satisfacao" USING "btree" ("cliente_id") WHERE ("cliente_id" IS NOT NULL);



CREATE INDEX "idx_pesquisas_created_at" ON "public"."pesquisas_satisfacao" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_pesquisas_data_fechamento" ON "public"."pesquisas_satisfacao" USING "btree" ("data_fechamento") WHERE ("data_fechamento" IS NOT NULL);



CREATE INDEX "idx_pesquisas_data_resposta" ON "public"."pesquisas_satisfacao" USING "btree" ("data_resposta");



CREATE INDEX "idx_pesquisas_data_ultima_modificacao" ON "public"."pesquisas_satisfacao" USING "btree" ("data_ultima_modificacao") WHERE ("data_ultima_modificacao" IS NOT NULL);



CREATE INDEX "idx_pesquisas_empresa" ON "public"."pesquisas_satisfacao" USING "btree" ("empresa");



CREATE INDEX "idx_pesquisas_empresa_id" ON "public"."pesquisas_satisfacao" USING "btree" ("empresa_id") WHERE ("empresa_id" IS NOT NULL);



CREATE INDEX "idx_pesquisas_estado" ON "public"."pesquisas_satisfacao" USING "btree" ("estado") WHERE ("estado" IS NOT NULL);



CREATE INDEX "idx_pesquisas_hash_origem" ON "public"."pesquisas_satisfacao" USING "btree" ("hash_origem") WHERE ("origem" = 'sql_server'::"public"."origem_pesquisa_enum");



CREATE INDEX "idx_pesquisas_id_externo" ON "public"."pesquisas_satisfacao" USING "btree" ("id_externo") WHERE ("id_externo" IS NOT NULL);



CREATE INDEX "idx_pesquisas_origem" ON "public"."pesquisas_satisfacao" USING "btree" ("origem");



CREATE INDEX "idx_pesquisas_satisfacao_autor_id" ON "public"."pesquisas_satisfacao" USING "btree" ("autor_id");



CREATE INDEX "idx_pesquisas_satisfacao_coordenador_id" ON "public"."pesquisas_satisfacao" USING "btree" ("coordenador_id");



CREATE INDEX "idx_pesquisas_source_updated_at" ON "public"."pesquisas_satisfacao" USING "btree" ("source_updated_at") WHERE ("origem" = 'sql_server'::"public"."origem_pesquisa_enum");



CREATE INDEX "idx_pesquisas_status" ON "public"."pesquisas_satisfacao" USING "btree" ("status");



CREATE INDEX "idx_pesquisas_status_origem" ON "public"."pesquisas_satisfacao" USING "btree" ("status", "origem");



CREATE INDEX "idx_pesquisas_tem_plano" ON "public"."pesquisas_satisfacao" USING "btree" ("tem_plano_acao");



CREATE UNIQUE INDEX "idx_pesquisas_unique_empresa_caso_sqlserver" ON "public"."pesquisas_satisfacao" USING "btree" ("empresa", "nro_caso") WHERE (("origem" = 'sql_server'::"public"."origem_pesquisa_enum") AND ("nro_caso" IS NOT NULL) AND ("nro_caso" <> ''::"text"));



COMMENT ON INDEX "public"."idx_pesquisas_unique_empresa_caso_sqlserver" IS 'Garante unicidade: apenas UMA pesquisa por empresa+nro_caso para registros sincronizados do SQL Server.
Pesquisas com origem manual não são afetadas e podem ter múltiplas por chamado.
Criado em 2026-06-09.';



CREATE INDEX "idx_plano_acao_contatos_criado_por" ON "public"."plano_acao_contatos" USING "btree" ("criado_por");



CREATE INDEX "idx_plano_acao_contatos_data" ON "public"."plano_acao_contatos" USING "btree" ("data_contato" DESC);



CREATE INDEX "idx_plano_acao_contatos_plano_id" ON "public"."plano_acao_contatos" USING "btree" ("plano_acao_id");



CREATE INDEX "idx_plano_historico_data" ON "public"."plano_acao_historico" USING "btree" ("data_atualizacao");



CREATE INDEX "idx_plano_historico_plano" ON "public"."plano_acao_historico" USING "btree" ("plano_acao_id");



CREATE INDEX "idx_plano_historico_usuario" ON "public"."plano_acao_historico" USING "btree" ("usuario_id");



CREATE INDEX "idx_planos_acao_criado_em" ON "public"."planos_acao" USING "btree" ("criado_em");



CREATE INDEX "idx_planos_acao_criado_por" ON "public"."planos_acao" USING "btree" ("criado_por");



CREATE INDEX "idx_planos_acao_data_resposta" ON "public"."planos_acao" USING "btree" ("data_resposta");



CREATE INDEX "idx_planos_acao_data_resposta_status" ON "public"."planos_acao" USING "btree" ("data_resposta", "status_plano");



CREATE INDEX "idx_planos_acao_pesquisa" ON "public"."planos_acao" USING "btree" ("pesquisa_id");



CREATE INDEX "idx_planos_acao_prioridade" ON "public"."planos_acao" USING "btree" ("prioridade");



CREATE INDEX "idx_planos_acao_status" ON "public"."planos_acao" USING "btree" ("status_plano");



CREATE INDEX "idx_planos_acao_tipo_acao" ON "public"."planos_acao" USING "btree" ("tipo_acao");



CREATE INDEX "idx_profiles_active" ON "public"."profiles" USING "btree" ("active");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_language" ON "public"."profiles" USING "btree" ("language");



CREATE INDEX "idx_profiles_last_sign_in_at" ON "public"."profiles" USING "btree" ("last_sign_in_at");



CREATE INDEX "idx_reajustes_ativo" ON "public"."banco_horas_reajustes" USING "btree" ("ativo");



CREATE INDEX "idx_reajustes_calculo" ON "public"."banco_horas_reajustes" USING "btree" ("calculo_id");



CREATE INDEX "idx_reajustes_created_at" ON "public"."banco_horas_reajustes" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_reajustes_empresa_periodo" ON "public"."banco_horas_reajustes" USING "btree" ("empresa_id", "ano", "mes");



CREATE INDEX "idx_reajustes_empresa_segmentada" ON "public"."banco_horas_reajustes" USING "btree" ("empresa_segmentada") WHERE ("empresa_segmentada" IS NOT NULL);



CREATE INDEX "idx_requerimento_anexos_created_at" ON "public"."requerimento_anexos" USING "btree" ("created_at");



CREATE INDEX "idx_requerimento_anexos_requerimento_id" ON "public"."requerimento_anexos" USING "btree" ("requerimento_id");



CREATE INDEX "idx_requerimentos_autor_id" ON "public"."requerimentos" USING "btree" ("autor_id");



CREATE INDEX "idx_requerimentos_cliente_id" ON "public"."requerimentos" USING "btree" ("cliente_id");



CREATE INDEX "idx_requerimentos_created_at" ON "public"."requerimentos" USING "btree" ("created_at");



CREATE INDEX "idx_requerimentos_data_envio_faturamento" ON "public"."requerimentos" USING "btree" ("data_envio_faturamento");



CREATE INDEX "idx_requerimentos_data_faturamento" ON "public"."requerimentos" USING "btree" ("data_faturamento") WHERE ("data_faturamento" IS NOT NULL);



CREATE INDEX "idx_requerimentos_empresa_segmentacao_nome" ON "public"."requerimentos" USING "btree" ("empresa_segmentacao_nome");



CREATE INDEX "idx_requerimentos_enviado_faturamento" ON "public"."requerimentos" USING "btree" ("enviado_faturamento");



CREATE INDEX "idx_requerimentos_mes_cobranca" ON "public"."requerimentos" USING "btree" ("mes_cobranca");



CREATE INDEX "idx_requerimentos_quantidade_tickets" ON "public"."requerimentos" USING "btree" ("quantidade_tickets") WHERE ("quantidade_tickets" IS NOT NULL);



CREATE INDEX "idx_requerimentos_status" ON "public"."requerimentos" USING "btree" ("status");



CREATE INDEX "idx_requerimentos_tipo_cobranca" ON "public"."requerimentos" USING "btree" ("tipo_cobranca");



CREATE INDEX "idx_requerimentos_tipo_cobranca_valores" ON "public"."requerimentos" USING "btree" ("tipo_cobranca") WHERE ("valor_total_geral" IS NOT NULL);



CREATE INDEX "idx_requerimentos_tipo_hora_extra" ON "public"."requerimentos" USING "btree" ("tipo_hora_extra") WHERE ("tipo_hora_extra" IS NOT NULL);



CREATE INDEX "idx_requerimentos_valor_total_geral" ON "public"."requerimentos" USING "btree" ("valor_total_geral") WHERE ("valor_total_geral" IS NOT NULL);



CREATE INDEX "idx_screen_permissions_created_by" ON "public"."screen_permissions" USING "btree" ("created_by");



CREATE INDEX "idx_screen_permissions_group_id" ON "public"."screen_permissions" USING "btree" ("group_id");



CREATE INDEX "idx_screen_permissions_screen_key" ON "public"."screen_permissions" USING "btree" ("screen_key");



CREATE INDEX "idx_screen_permissions_updated_by" ON "public"."screen_permissions" USING "btree" ("updated_by");



CREATE INDEX "idx_sync_agendamentos_proxima" ON "public"."sync_agendamentos" USING "btree" ("proxima_execucao") WHERE "ativo";



CREATE INDEX "idx_sync_control_last_sync" ON "public"."sync_control_pesquisas" USING "btree" ("last_sync_at" DESC);



CREATE INDEX "idx_sync_control_last_sync_at" ON "public"."sync_control" USING "btree" ("last_sync_at" DESC);



COMMENT ON INDEX "public"."idx_sync_control_last_sync_at" IS 'Índice para ordenação por data de última sincronização (mais recentes primeiro)';



CREATE INDEX "idx_sync_control_last_sync_status" ON "public"."sync_control" USING "btree" ("last_sync_status");



COMMENT ON INDEX "public"."idx_sync_control_last_sync_status" IS 'Índice para filtro por status de sincronização';



CREATE INDEX "idx_sync_control_table_name" ON "public"."sync_control" USING "btree" ("table_name");



COMMENT ON INDEX "public"."idx_sync_control_table_name" IS 'Índice para busca rápida por nome de tabela';



CREATE INDEX "idx_sync_execucoes_iniciado_em" ON "public"."sync_execucoes" USING "btree" ("iniciado_em" DESC);



CREATE INDEX "idx_sync_execucoes_status" ON "public"."sync_execucoes" USING "btree" ("status") WHERE ("status" = 'executando'::"text");



CREATE INDEX "idx_sync_metadata_tabela" ON "public"."sync_metadata" USING "btree" ("tabela");



CREATE INDEX "idx_taxas_clientes_cliente_id" ON "public"."taxas_clientes" USING "btree" ("cliente_id");



CREATE INDEX "idx_taxas_clientes_criado_por" ON "public"."taxas_clientes" USING "btree" ("criado_por");



CREATE INDEX "idx_taxas_clientes_prazo_pagamento" ON "public"."taxas_clientes" USING "btree" ("prazo_pagamento") WHERE ("prazo_pagamento" IS NOT NULL);



COMMENT ON INDEX "public"."idx_taxas_clientes_prazo_pagamento" IS 'Índice para consultas por prazo de pagamento';



CREATE INDEX "idx_taxas_clientes_vigencia" ON "public"."taxas_clientes" USING "btree" ("vigencia_inicio", "vigencia_fim");



CREATE INDEX "idx_taxas_padrao_criado_por" ON "public"."taxas_padrao" USING "btree" ("criado_por");



CREATE INDEX "idx_taxas_padrao_tipo_produto" ON "public"."taxas_padrao" USING "btree" ("tipo_produto");



CREATE INDEX "idx_taxas_padrao_vigencia" ON "public"."taxas_padrao" USING "btree" ("tipo_produto", "vigencia_inicio", "vigencia_fim");



CREATE INDEX "idx_taxas_padrao_vigencia_fim" ON "public"."taxas_padrao" USING "btree" ("vigencia_fim");



CREATE INDEX "idx_taxas_padrao_vigencia_inicio" ON "public"."taxas_padrao" USING "btree" ("vigencia_inicio");



CREATE INDEX "idx_tickets_aranda_cod_resolucao" ON "public"."apontamentos_tickets_aranda" USING "btree" ("cod_resolucao");



CREATE INDEX "idx_tickets_aranda_data_abertura" ON "public"."apontamentos_tickets_aranda" USING "btree" ("data_abertura" DESC);



CREATE INDEX "idx_tickets_aranda_data_sincronizacao" ON "public"."apontamentos_tickets_aranda" USING "btree" ("data_sincronizacao" DESC);



CREATE INDEX "idx_tickets_aranda_deteccao_partial" ON "public"."apontamentos_tickets_aranda" USING "btree" ("data_abertura", "id") WHERE ((("status")::"text" <> ALL ((ARRAY['Cancelled'::character varying, 'Closed'::character varying, 'Resolved'::character varying])::"text"[])) AND (("nome_grupo")::"text" <> 'CA SDM'::"text"));



COMMENT ON INDEX "public"."idx_tickets_aranda_deteccao_partial" IS 'Índice parcial para query de detecção de inconsistências. Filtra tickets ativos (excluindo Cancelled/Closed/Resolved e grupo CA SDM). Inclui id para ORDER BY eficiente.';



CREATE INDEX "idx_tickets_aranda_empresa" ON "public"."apontamentos_tickets_aranda" USING "btree" ("empresa");



CREATE INDEX "idx_tickets_aranda_empresa_periodo" ON "public"."apontamentos_tickets_aranda" USING "btree" ("empresa", "data_abertura" DESC);



CREATE INDEX "idx_tickets_aranda_grupo" ON "public"."apontamentos_tickets_aranda" USING "btree" ("nome_grupo");



CREATE INDEX "idx_tickets_aranda_ic999999" ON "public"."apontamentos_tickets_aranda" USING "btree" ("data_abertura") WHERE ((("item_configuracao")::"text" ~~ '999999%'::"text") AND (("nome_grupo")::"text" <> 'CA SDM'::"text") AND (("status")::"text" <> ALL ((ARRAY['Cancelled'::character varying, 'Closed'::character varying])::"text"[])));



CREATE INDEX "idx_tickets_aranda_nro_solicitacao" ON "public"."apontamentos_tickets_aranda" USING "btree" ("nro_solicitacao");



CREATE INDEX "idx_tickets_aranda_responsavel" ON "public"."apontamentos_tickets_aranda" USING "btree" ("nome_responsavel");



CREATE INDEX "idx_tickets_aranda_sem_atualizacao" ON "public"."apontamentos_tickets_aranda" USING "btree" ("data_ultimo_comentario", "data_abertura") INCLUDE ("cod_tipo", "nro_solicitacao", "item_configuracao", "organizacao", "nome_responsavel", "status", "cod_resolucao") WHERE ((("status")::"text" = ANY ((ARRAY['Open'::character varying, 'Hold'::character varying, 'In Progress'::character varying, 'Acknowledged'::character varying, 'Resolved'::character varying])::"text"[])) AND (("nome_grupo")::"text" <> 'CA SDM'::"text") AND ("data_ultimo_comentario" IS NOT NULL));



CREATE INDEX "idx_tickets_aranda_source_updated_at" ON "public"."apontamentos_tickets_aranda" USING "btree" ("source_updated_at" DESC);



CREATE INDEX "idx_tickets_aranda_status" ON "public"."apontamentos_tickets_aranda" USING "btree" ("status");



CREATE INDEX "idx_tickets_aranda_synced_at" ON "public"."apontamentos_tickets_aranda" USING "btree" ("synced_at" DESC);



CREATE INDEX "idx_tickets_consumo_principal" ON "public"."apontamentos_tickets_aranda" USING "btree" ("data_fechamento", "status");



COMMENT ON INDEX "public"."idx_tickets_consumo_principal" IS 'Índice composto para otimizar queries de consumo de tickets. Cobre filtros de data_fechamento e status.';



CREATE INDEX "idx_tickets_organizacao_gin" ON "public"."apontamentos_tickets_aranda" USING "gin" ("organizacao" "extensions"."gin_trgm_ops");



COMMENT ON INDEX "public"."idx_tickets_organizacao_gin" IS 'Índice GIN para busca por similaridade em organizacao usando pg_trgm (schema extensions)';



CREATE INDEX "idx_user_group_assignments_assigned_by" ON "public"."user_group_assignments" USING "btree" ("assigned_by");



CREATE INDEX "idx_user_group_assignments_group_id" ON "public"."user_group_assignments" USING "btree" ("group_id");



CREATE INDEX "idx_user_group_assignments_updated_by" ON "public"."user_group_assignments" USING "btree" ("updated_by");



CREATE INDEX "idx_user_group_assignments_user_id" ON "public"."user_group_assignments" USING "btree" ("user_id");



CREATE INDEX "idx_user_groups_created_by" ON "public"."user_groups" USING "btree" ("created_by");



CREATE INDEX "idx_user_groups_updated_by" ON "public"."user_groups" USING "btree" ("updated_by");



CREATE INDEX "idx_valores_taxas_taxa_id" ON "public"."valores_taxas_funcoes" USING "btree" ("taxa_id");



CREATE INDEX "idx_versoes_calculo" ON "public"."banco_horas_versoes" USING "btree" ("calculo_id", "versao_nova" DESC);



CREATE INDEX "idx_versoes_data" ON "public"."banco_horas_versoes" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_versoes_empresa_periodo" ON "public"."banco_horas_versoes" USING "btree" ("empresa_id", "ano", "mes", "versao" DESC);



CREATE INDEX "idx_versoes_reajuste" ON "public"."banco_horas_versoes" USING "btree" ("reajuste_id");



CREATE INDEX "idx_versoes_tipo" ON "public"."banco_horas_versoes" USING "btree" ("tipo_mudanca");



CREATE INDEX "idx_versoes_tipo_alteracao" ON "public"."banco_horas_versoes" USING "btree" ("tipo_alteracao");



CREATE INDEX "notificacoes_abertas_idx" ON "public"."notificacoes" USING "btree" ("screen_key", "created_at" DESC) WHERE ("resolvida_em" IS NULL);



CREATE UNIQUE INDEX "notificacoes_chave_aberta_uq" ON "public"."notificacoes" USING "btree" ("chave") WHERE ("resolvida_em" IS NULL);



CREATE INDEX "notificacoes_empresa_idx" ON "public"."notificacoes" USING "btree" ("empresa_id");



CREATE INDEX "notificacoes_leituras_user_idx" ON "public"."notificacoes_leituras" USING "btree" ("user_id");



CREATE UNIQUE INDEX "unique_especialistas_id_externo" ON "public"."especialistas" USING "btree" ("id_externo") WHERE ("id_externo" IS NOT NULL);



CREATE OR REPLACE TRIGGER "check_alocacoes_percentual" BEFORE INSERT OR UPDATE ON "public"."banco_horas_alocacoes" FOR EACH ROW WHEN (("new"."ativo" = true)) EXECUTE FUNCTION "public"."validate_alocacoes_percentual"();



CREATE OR REPLACE TRIGGER "email_test_data_updated_at_trigger" BEFORE UPDATE ON "public"."email_test_data" FOR EACH ROW EXECUTE FUNCTION "public"."update_email_test_data_updated_at"();



CREATE OR REPLACE TRIGGER "trg_bh_envio_agendamentos_before_write" BEFORE INSERT OR UPDATE ON "public"."banco_horas_envio_agendamentos" FOR EACH ROW EXECUTE FUNCTION "public"."banco_horas_envio_agendamentos_before_write"();



CREATE OR REPLACE TRIGGER "trg_bloquear_atualizacao_book_enviado" BEFORE UPDATE ON "public"."books" FOR EACH ROW EXECUTE FUNCTION "public"."bloquear_atualizacao_book_enviado"();



CREATE OR REPLACE TRIGGER "trg_bloquear_modificacao_versao_book" BEFORE UPDATE ON "public"."books_versoes" FOR EACH ROW EXECUTE FUNCTION "public"."bloquear_modificacao_versao_book"();



CREATE OR REPLACE TRIGGER "trg_notificar_ajuste_retroativo" AFTER INSERT OR DELETE OR UPDATE OF "status" ON "public"."banco_horas_ajustes_retroativos" FOR EACH ROW EXECUTE FUNCTION "public"."notificar_ajuste_retroativo"();



CREATE OR REPLACE TRIGGER "trg_notificar_book_precisa_retificacao" AFTER INSERT OR UPDATE OF "precisa_retificacao" ON "public"."books" FOR EACH ROW WHEN (("new"."precisa_retificacao" IS TRUE)) EXECUTE FUNCTION "public"."notificar_book_precisa_retificacao"();



CREATE OR REPLACE TRIGGER "trg_notificar_geracao_books_execucao" AFTER INSERT OR UPDATE OF "status" ON "public"."sync_execucoes" FOR EACH ROW WHEN (("new"."tipo" = 'books'::"text")) EXECUTE FUNCTION "public"."notificar_geracao_books_execucao"();



CREATE OR REPLACE TRIGGER "trg_notificar_saldo_parcial_execucao" AFTER INSERT OR UPDATE OF "status" ON "public"."banco_horas_envio_execucoes" FOR EACH ROW EXECUTE FUNCTION "public"."notificar_saldo_parcial_execucao"();



CREATE OR REPLACE TRIGGER "trg_resolver_book_precisa_retificacao" BEFORE UPDATE OF "status" ON "public"."books" FOR EACH ROW EXECUTE FUNCTION "public"."resolver_book_precisa_retificacao"();



CREATE OR REPLACE TRIGGER "trg_sync_agendamentos_before_write" BEFORE INSERT OR UPDATE ON "public"."sync_agendamentos" FOR EACH ROW EXECUTE FUNCTION "public"."sync_agendamentos_before_write"();



CREATE OR REPLACE TRIGGER "trigger_atualizar_data_resposta_elogio" BEFORE INSERT OR UPDATE OF "pesquisa_id" ON "public"."elogios" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_data_resposta_elogio"();



CREATE OR REPLACE TRIGGER "trigger_calcular_valores_requerimento" BEFORE INSERT OR UPDATE ON "public"."requerimentos" FOR EACH ROW EXECUTE FUNCTION "public"."calcular_valores_requerimento"();



CREATE OR REPLACE TRIGGER "trigger_encerrar_baseline_anterior" BEFORE INSERT ON "public"."baseline_historico" FOR EACH ROW EXECUTE FUNCTION "public"."encerrar_baseline_anterior"();



CREATE OR REPLACE TRIGGER "trigger_encerrar_percentual_repasse_anterior" BEFORE INSERT ON "public"."percentual_repasse_historico" FOR EACH ROW EXECUTE FUNCTION "public"."encerrar_percentual_repasse_anterior"();



CREATE OR REPLACE TRIGGER "trigger_sync_anexo_status_historico" AFTER UPDATE ON "public"."historico_disparos" FOR EACH ROW EXECUTE FUNCTION "public"."sync_anexo_status_historico"();



CREATE OR REPLACE TRIGGER "trigger_sync_central_escalacao" AFTER INSERT OR UPDATE OF "cargo" ON "public"."organizacao_estrutura" FOR EACH ROW EXECUTE FUNCTION "public"."sync_central_escalacao_superiores"();



CREATE OR REPLACE TRIGGER "trigger_sync_percentual_repasse_after_delete" AFTER DELETE ON "public"."percentual_repasse_historico" FOR EACH ROW EXECUTE FUNCTION "public"."sync_percentual_repasse_to_empresa_on_delete"();



CREATE OR REPLACE TRIGGER "trigger_sync_percentual_repasse_after_insert" AFTER INSERT ON "public"."percentual_repasse_historico" FOR EACH ROW EXECUTE FUNCTION "public"."sync_percentual_repasse_to_empresa"();



CREATE OR REPLACE TRIGGER "trigger_sync_percentual_repasse_after_update" AFTER UPDATE ON "public"."percentual_repasse_historico" FOR EACH ROW WHEN ((("old"."percentual" IS DISTINCT FROM "new"."percentual") OR ("old"."data_fim" IS DISTINCT FROM "new"."data_fim"))) EXECUTE FUNCTION "public"."sync_percentual_repasse_to_empresa"();



CREATE OR REPLACE TRIGGER "trigger_update_alocacoes_updated_at" BEFORE UPDATE ON "public"."banco_horas_alocacoes" FOR EACH ROW EXECUTE FUNCTION "public"."update_banco_horas_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_apontamentos_aranda_updated_at" BEFORE UPDATE ON "public"."apontamentos_aranda" FOR EACH ROW EXECUTE FUNCTION "public"."update_apontamentos_aranda_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_apontamentos_tickets_aranda_updated_at" BEFORE UPDATE ON "public"."apontamentos_tickets_aranda" FOR EACH ROW EXECUTE FUNCTION "public"."update_apontamentos_tickets_aranda_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_banco_horas_observacoes_updated_at" BEFORE UPDATE ON "public"."banco_horas_observacoes" FOR EACH ROW EXECUTE FUNCTION "public"."update_banco_horas_observacoes_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_baseline_historico_timestamp" BEFORE UPDATE ON "public"."baseline_historico" FOR EACH ROW EXECUTE FUNCTION "public"."update_baseline_historico_timestamp"();



CREATE OR REPLACE TRIGGER "trigger_update_books_updated_at" BEFORE UPDATE ON "public"."books" FOR EACH ROW EXECUTE FUNCTION "public"."update_books_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_calculos_updated_at" BEFORE UPDATE ON "public"."banco_horas_calculos" FOR EACH ROW EXECUTE FUNCTION "public"."update_banco_horas_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_codigo_resolucao_modificacoes_aranda_updated_at" BEFORE UPDATE ON "public"."codigo_resolucao_modificacoes_aranda" FOR EACH ROW EXECUTE FUNCTION "public"."update_codigo_resolucao_modificacoes_aranda_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_de_para_categoria_updated_at" BEFORE UPDATE ON "public"."de_para_categoria" FOR EACH ROW EXECUTE FUNCTION "public"."update_de_para_categoria_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_historico_inconsistencias_updated_at" BEFORE UPDATE ON "public"."historico_inconsistencias_chamados" FOR EACH ROW EXECUTE FUNCTION "public"."update_historico_inconsistencias_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_percentual_repasse_historico_timestamp" BEFORE UPDATE ON "public"."percentual_repasse_historico" FOR EACH ROW EXECUTE FUNCTION "public"."update_percentual_repasse_historico_timestamp"();



CREATE OR REPLACE TRIGGER "trigger_update_sync_control_updated_at" BEFORE UPDATE ON "public"."sync_control" FOR EACH ROW EXECUTE FUNCTION "public"."update_sync_control_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_taxas_clientes_updated_at" BEFORE UPDATE ON "public"."taxas_clientes" FOR EACH ROW EXECUTE FUNCTION "public"."update_taxas_clientes_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_taxas_padrao_updated_at" BEFORE UPDATE ON "public"."taxas_padrao" FOR EACH ROW EXECUTE FUNCTION "public"."update_taxas_padrao_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_valores_taxas_updated_at" BEFORE UPDATE ON "public"."valores_taxas_funcoes" FOR EACH ROW EXECUTE FUNCTION "public"."update_taxas_clientes_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_validar_causa_plano_acao" BEFORE INSERT OR UPDATE ON "public"."planos_acao" FOR EACH ROW EXECUTE FUNCTION "public"."validar_causa_plano_acao"();



COMMENT ON TRIGGER "trigger_validar_causa_plano_acao" ON "public"."planos_acao" IS 'Trigger que valida o preenchimento do campo causa quando data_conclusao existir';



CREATE OR REPLACE TRIGGER "trigger_validar_segmentacao_baseline" BEFORE INSERT OR UPDATE ON "public"."empresas_clientes" FOR EACH ROW EXECUTE FUNCTION "public"."validar_segmentacao_baseline"();



CREATE OR REPLACE TRIGGER "trigger_validar_vigencias" BEFORE INSERT OR UPDATE ON "public"."empresas_clientes" FOR EACH ROW EXECUTE FUNCTION "public"."validar_vigencias"();



CREATE OR REPLACE TRIGGER "update_anexos_temporarios_updated_at" BEFORE UPDATE ON "public"."anexos_temporarios" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_banco_horas_ajustes_retroativos_updated_at" BEFORE UPDATE ON "public"."banco_horas_ajustes_retroativos" FOR EACH ROW EXECUTE FUNCTION "public"."update_banco_horas_ajustes_retroativos_updated_at"();



CREATE OR REPLACE TRIGGER "update_baseline_historico_updated_at" BEFORE UPDATE ON "public"."baseline_historico" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_book_generation_queue_updated_at" BEFORE UPDATE ON "public"."book_generation_queue" FOR EACH ROW EXECUTE FUNCTION "public"."update_book_gen_queue_updated_at"();



CREATE OR REPLACE TRIGGER "update_clientes_updated_at" BEFORE UPDATE ON "public"."clientes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_empresa_anexos_updated_at" BEFORE UPDATE ON "public"."empresa_anexos" FOR EACH ROW EXECUTE FUNCTION "public"."update_empresa_anexos_updated_at"();



CREATE OR REPLACE TRIGGER "update_empresas_clientes_updated_at" BEFORE UPDATE ON "public"."empresas_clientes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_grupos_responsaveis_updated_at" BEFORE UPDATE ON "public"."grupos_responsaveis" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_inconsistencias_chamados_updated_at" BEFORE UPDATE ON "public"."inconsistencias_chamados" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_job_configurations_updated_at" BEFORE UPDATE ON "public"."job_configurations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_jobs_queue_updated_at" BEFORE UPDATE ON "public"."jobs_queue" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_multiplos_superiores_updated_at" BEFORE UPDATE ON "public"."organizacao_multiplos_superiores" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organizacao_estrutura_updated_at" BEFORE UPDATE ON "public"."organizacao_estrutura" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organizacao_produto_updated_at" BEFORE UPDATE ON "public"."organizacao_produto" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_pesquisa_mensal_ams_updated_at" BEFORE UPDATE ON "public"."pesquisa_mensal_ams" FOR EACH ROW EXECUTE FUNCTION "public"."update_pesquisa_mensal_ams_updated_at"();



CREATE OR REPLACE TRIGGER "update_requerimento_anexos_updated_at" BEFORE UPDATE ON "public"."requerimento_anexos" FOR EACH ROW EXECUTE FUNCTION "public"."update_requerimento_anexos_updated_at"();



CREATE OR REPLACE TRIGGER "update_requerimentos_updated_at" BEFORE UPDATE ON "public"."requerimentos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "validate_empresa_segmentacao_nome_trigger" BEFORE INSERT OR UPDATE ON "public"."requerimentos" FOR EACH ROW EXECUTE FUNCTION "public"."validate_empresa_segmentacao_nome"();



CREATE OR REPLACE TRIGGER "validate_organizacao_produto_hierarchy_trigger" BEFORE INSERT OR UPDATE ON "public"."organizacao_produto" FOR EACH ROW EXECUTE FUNCTION "public"."validate_organizacao_produto_hierarchy"();



ALTER TABLE ONLY "public"."anexos_temporarios"
    ADD CONSTRAINT "anexos_temporarios_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas_clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."apontamentos_aranda"
    ADD CONSTRAINT "apontamentos_aranda_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."banco_horas_ajustes_retroativos"
    ADD CONSTRAINT "banco_horas_ajustes_retroativos_analisado_por_fkey" FOREIGN KEY ("analisado_por") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."banco_horas_ajustes_retroativos"
    ADD CONSTRAINT "banco_horas_ajustes_retroativos_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."banco_horas_ajustes_retroativos"
    ADD CONSTRAINT "banco_horas_ajustes_retroativos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas_clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."banco_horas_ajustes_retroativos"
    ADD CONSTRAINT "banco_horas_ajustes_retroativos_fechamento_id_fkey" FOREIGN KEY ("fechamento_id") REFERENCES "public"."banco_horas_fechamentos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."banco_horas_ajustes_retroativos"
    ADD CONSTRAINT "banco_horas_ajustes_retroativos_reajuste_gerado_id_fkey" FOREIGN KEY ("reajuste_gerado_id") REFERENCES "public"."banco_horas_reajustes"("id");



ALTER TABLE ONLY "public"."banco_horas_alocacoes"
    ADD CONSTRAINT "banco_horas_alocacoes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."banco_horas_alocacoes"
    ADD CONSTRAINT "banco_horas_alocacoes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas_clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."banco_horas_alocacoes"
    ADD CONSTRAINT "banco_horas_alocacoes_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."banco_horas_audit_log"
    ADD CONSTRAINT "banco_horas_audit_log_calculo_id_fkey" FOREIGN KEY ("calculo_id") REFERENCES "public"."banco_horas_calculos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."banco_horas_audit_log"
    ADD CONSTRAINT "banco_horas_audit_log_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."banco_horas_audit_log"
    ADD CONSTRAINT "banco_horas_audit_log_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas_clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."banco_horas_calculos"
    ADD CONSTRAINT "banco_horas_calculos_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."banco_horas_calculos"
    ADD CONSTRAINT "banco_horas_calculos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas_clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."banco_horas_calculos_segmentados"
    ADD CONSTRAINT "banco_horas_calculos_segmentados_alocacao_id_fkey" FOREIGN KEY ("alocacao_id") REFERENCES "public"."banco_horas_alocacoes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."banco_horas_calculos_segmentados"
    ADD CONSTRAINT "banco_horas_calculos_segmentados_calculo_id_fkey" FOREIGN KEY ("calculo_id") REFERENCES "public"."banco_horas_calculos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."banco_horas_calculos"
    ADD CONSTRAINT "banco_horas_calculos_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."banco_horas_envio_agendamento_empresas"
    ADD CONSTRAINT "banco_horas_envio_agendamento_empresas_agendamento_id_fkey" FOREIGN KEY ("agendamento_id") REFERENCES "public"."banco_horas_envio_agendamentos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."banco_horas_envio_agendamento_empresas"
    ADD CONSTRAINT "banco_horas_envio_agendamento_empresas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas_clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."banco_horas_envio_agendamentos"
    ADD CONSTRAINT "banco_horas_envio_agendamentos_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."banco_horas_envio_execucoes"
    ADD CONSTRAINT "banco_horas_envio_execucoes_agendamento_id_fkey" FOREIGN KEY ("agendamento_id") REFERENCES "public"."banco_horas_envio_agendamentos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."banco_horas_envio_execucoes"
    ADD CONSTRAINT "banco_horas_envio_execucoes_disparado_por_fkey" FOREIGN KEY ("disparado_por") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."banco_horas_envio_execucoes"
    ADD CONSTRAINT "banco_horas_envio_execucoes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas_clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."banco_horas_fechamentos"
    ADD CONSTRAINT "banco_horas_fechamentos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas_clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."banco_horas_fechamentos"
    ADD CONSTRAINT "banco_horas_fechamentos_fechado_por_fkey" FOREIGN KEY ("fechado_por") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."banco_horas_observacoes"
    ADD CONSTRAINT "banco_horas_observacoes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."banco_horas_observacoes"
    ADD CONSTRAINT "banco_horas_observacoes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas_clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."banco_horas_reajustes"
    ADD CONSTRAINT "banco_horas_reajustes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."banco_horas_reajustes"
    ADD CONSTRAINT "banco_horas_reajustes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas_clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."banco_horas_versoes"
    ADD CONSTRAINT "banco_horas_versoes_calculo_id_fkey" FOREIGN KEY ("calculo_id") REFERENCES "public"."banco_horas_calculos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."banco_horas_versoes"
    ADD CONSTRAINT "banco_horas_versoes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."banco_horas_versoes"
    ADD CONSTRAINT "banco_horas_versoes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas_clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."banco_horas_versoes"
    ADD CONSTRAINT "banco_horas_versoes_reajuste_id_fkey" FOREIGN KEY ("reajuste_id") REFERENCES "public"."banco_horas_reajustes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."baseline_historico"
    ADD CONSTRAINT "baseline_historico_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."baseline_historico"
    ADD CONSTRAINT "baseline_historico_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas_clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."baseline_historico"
    ADD CONSTRAINT "baseline_historico_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."book_generation_queue"
    ADD CONSTRAINT "book_generation_queue_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."book_generation_queue"
    ADD CONSTRAINT "book_generation_queue_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas_clientes"("id");



ALTER TABLE ONLY "public"."books"
    ADD CONSTRAINT "books_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas_clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."books"
    ADD CONSTRAINT "books_enviado_por_fkey" FOREIGN KEY ("enviado_por") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."books_historico_geracao"
    ADD CONSTRAINT "books_historico_geracao_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."books_historico_geracao"
    ADD CONSTRAINT "books_historico_geracao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."books_versoes"
    ADD CONSTRAINT "books_versoes_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."books_versoes"
    ADD CONSTRAINT "books_versoes_enviado_por_fkey" FOREIGN KEY ("enviado_por") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."books_versoes"
    ADD CONSTRAINT "books_versoes_retificado_por_fkey" FOREIGN KEY ("retificado_por") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "colaboradores_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas_clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."controle_mensal"
    ADD CONSTRAINT "controle_mensal_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas_clientes"("id");



ALTER TABLE ONLY "public"."de_para_categoria"
    ADD CONSTRAINT "de_para_categoria_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."elogio_especialistas"
    ADD CONSTRAINT "elogio_especialistas_elogio_id_fkey" FOREIGN KEY ("elogio_id") REFERENCES "public"."elogios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."elogio_especialistas"
    ADD CONSTRAINT "elogio_especialistas_especialista_id_fkey" FOREIGN KEY ("especialista_id") REFERENCES "public"."especialistas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pesquisas_satisfacao"
    ADD CONSTRAINT "elogios_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pesquisas_satisfacao"
    ADD CONSTRAINT "elogios_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."elogios"
    ADD CONSTRAINT "elogios_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pesquisas_satisfacao"
    ADD CONSTRAINT "elogios_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas_clientes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."elogios"
    ADD CONSTRAINT "elogios_empresa_id_fkey1" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas_clientes"("id");



ALTER TABLE ONLY "public"."elogios_historico"
    ADD CONSTRAINT "elogios_historico_elogio_id_fkey" FOREIGN KEY ("elogio_id") REFERENCES "public"."elogios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."elogios_historico"
    ADD CONSTRAINT "elogios_historico_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."elogios"
    ADD CONSTRAINT "elogios_pesquisa_id_fkey" FOREIGN KEY ("pesquisa_id") REFERENCES "public"."pesquisas_satisfacao"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_test_data"
    ADD CONSTRAINT "email_test_data_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."empresa_anexos"
    ADD CONSTRAINT "empresa_anexos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas_clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."empresa_anexos"
    ADD CONSTRAINT "empresa_anexos_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."empresa_grupos"
    ADD CONSTRAINT "empresa_grupos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas_clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."empresa_grupos"
    ADD CONSTRAINT "empresa_grupos_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos_responsaveis"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."empresa_produtos"
    ADD CONSTRAINT "empresa_produtos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas_clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."empresas_clientes"
    ADD CONSTRAINT "empresas_clientes_empresa_consolidadora_id_fkey" FOREIGN KEY ("empresa_consolidadora_id") REFERENCES "public"."empresas_clientes"("id");



ALTER TABLE ONLY "public"."especialistas"
    ADD CONSTRAINT "especialistas_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."grupo_emails"
    ADD CONSTRAINT "grupo_emails_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos_responsaveis"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."historico_disparos"
    ADD CONSTRAINT "historico_disparos_anexo_id_fkey" FOREIGN KEY ("anexo_id") REFERENCES "public"."anexos_temporarios"("id");



ALTER TABLE ONLY "public"."historico_disparos"
    ADD CONSTRAINT "historico_disparos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id");



ALTER TABLE ONLY "public"."historico_disparos"
    ADD CONSTRAINT "historico_disparos_colaborador_id_fkey" FOREIGN KEY ("colaborador_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."historico_disparos"
    ADD CONSTRAINT "historico_disparos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas_clientes"("id");



ALTER TABLE ONLY "public"."historico_inconsistencias_chamados"
    ADD CONSTRAINT "historico_inconsistencias_chamados_enviado_por_fkey" FOREIGN KEY ("enviado_por") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."historico_inconsistencias_chamados"
    ADD CONSTRAINT "historico_inconsistencias_chamados_inconsistencia_id_fkey" FOREIGN KEY ("inconsistencia_id") REFERENCES "public"."inconsistencias_chamados"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notificacoes"
    ADD CONSTRAINT "notificacoes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas_clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notificacoes_leituras"
    ADD CONSTRAINT "notificacoes_leituras_notificacao_id_fkey" FOREIGN KEY ("notificacao_id") REFERENCES "public"."notificacoes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notificacoes_leituras"
    ADD CONSTRAINT "notificacoes_leituras_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notificacoes"
    ADD CONSTRAINT "notificacoes_screen_key_fkey" FOREIGN KEY ("screen_key") REFERENCES "public"."screens"("key") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."organizacao_estrutura"
    ADD CONSTRAINT "organizacao_estrutura_superior_id_fkey" FOREIGN KEY ("superior_id") REFERENCES "public"."organizacao_estrutura"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organizacao_multiplos_superiores"
    ADD CONSTRAINT "organizacao_multiplos_superiores_pessoa_id_fkey" FOREIGN KEY ("pessoa_id") REFERENCES "public"."organizacao_estrutura"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizacao_multiplos_superiores"
    ADD CONSTRAINT "organizacao_multiplos_superiores_superior_id_fkey" FOREIGN KEY ("superior_id") REFERENCES "public"."organizacao_estrutura"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizacao_produto"
    ADD CONSTRAINT "organizacao_produto_pessoa_id_fkey" FOREIGN KEY ("pessoa_id") REFERENCES "public"."organizacao_estrutura"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizacao_produto"
    ADD CONSTRAINT "organizacao_produto_superior_id_fkey" FOREIGN KEY ("superior_id") REFERENCES "public"."organizacao_estrutura"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."percentual_repasse_historico"
    ADD CONSTRAINT "percentual_repasse_historico_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."percentual_repasse_historico"
    ADD CONSTRAINT "percentual_repasse_historico_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas_clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."percentual_repasse_historico"
    ADD CONSTRAINT "percentual_repasse_historico_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."permission_audit_logs"
    ADD CONSTRAINT "permission_audit_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pesquisa_especialistas"
    ADD CONSTRAINT "pesquisa_especialistas_especialista_id_fkey" FOREIGN KEY ("especialista_id") REFERENCES "public"."especialistas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pesquisa_especialistas"
    ADD CONSTRAINT "pesquisa_especialistas_pesquisa_id_fkey" FOREIGN KEY ("pesquisa_id") REFERENCES "public"."pesquisas_satisfacao"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pesquisa_mensal_ams"
    ADD CONSTRAINT "pesquisa_mensal_ams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pesquisas_satisfacao"
    ADD CONSTRAINT "pesquisas_satisfacao_coordenador_id_fkey" FOREIGN KEY ("coordenador_id") REFERENCES "public"."organizacao_estrutura"("id");



ALTER TABLE ONLY "public"."plano_acao_contatos"
    ADD CONSTRAINT "plano_acao_contatos_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."plano_acao_contatos"
    ADD CONSTRAINT "plano_acao_contatos_plano_acao_id_fkey" FOREIGN KEY ("plano_acao_id") REFERENCES "public"."planos_acao"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plano_acao_historico"
    ADD CONSTRAINT "plano_acao_historico_plano_acao_id_fkey" FOREIGN KEY ("plano_acao_id") REFERENCES "public"."planos_acao"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plano_acao_historico"
    ADD CONSTRAINT "plano_acao_historico_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."planos_acao"
    ADD CONSTRAINT "planos_acao_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."planos_acao"
    ADD CONSTRAINT "planos_acao_pesquisa_id_fkey" FOREIGN KEY ("pesquisa_id") REFERENCES "public"."pesquisas_satisfacao"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."requerimento_anexos"
    ADD CONSTRAINT "requerimento_anexos_requerimento_id_fkey" FOREIGN KEY ("requerimento_id") REFERENCES "public"."requerimentos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."requerimento_anexos"
    ADD CONSTRAINT "requerimento_anexos_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."requerimentos"
    ADD CONSTRAINT "requerimentos_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."requerimentos"
    ADD CONSTRAINT "requerimentos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."empresas_clientes"("id");



ALTER TABLE ONLY "public"."screen_permissions"
    ADD CONSTRAINT "screen_permissions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."screen_permissions"
    ADD CONSTRAINT "screen_permissions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."user_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."screen_permissions"
    ADD CONSTRAINT "screen_permissions_screen_key_fkey" FOREIGN KEY ("screen_key") REFERENCES "public"."screens"("key") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."screen_permissions"
    ADD CONSTRAINT "screen_permissions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sync_agendamentos"
    ADD CONSTRAINT "sync_agendamentos_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sync_execucoes"
    ADD CONSTRAINT "sync_execucoes_agendamento_id_fkey" FOREIGN KEY ("agendamento_id") REFERENCES "public"."sync_agendamentos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sync_execucoes"
    ADD CONSTRAINT "sync_execucoes_disparado_por_fkey" FOREIGN KEY ("disparado_por") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."taxas_clientes"
    ADD CONSTRAINT "taxas_clientes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."empresas_clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."taxas_clientes"
    ADD CONSTRAINT "taxas_clientes_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."taxas_padrao"
    ADD CONSTRAINT "taxas_padrao_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_group_assignments"
    ADD CONSTRAINT "user_group_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_group_assignments"
    ADD CONSTRAINT "user_group_assignments_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."user_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_group_assignments"
    ADD CONSTRAINT "user_group_assignments_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_group_assignments"
    ADD CONSTRAINT "user_group_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_groups"
    ADD CONSTRAINT "user_groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_groups"
    ADD CONSTRAINT "user_groups_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."valores_taxas_funcoes"
    ADD CONSTRAINT "valores_taxas_funcoes_taxa_id_fkey" FOREIGN KEY ("taxa_id") REFERENCES "public"."taxas_clientes"("id") ON DELETE CASCADE;



CREATE POLICY "Admins podem atualizar categorias" ON "public"."de_para_categoria" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."user_group_assignments" "uga"
     JOIN "public"."user_groups" "ug" ON (("uga"."group_id" = "ug"."id")))
  WHERE (("uga"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("ug"."name")::"text" = 'Administradores'::"text")))));



CREATE POLICY "Admins podem excluir categorias" ON "public"."de_para_categoria" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."user_group_assignments" "uga"
     JOIN "public"."user_groups" "ug" ON (("uga"."group_id" = "ug"."id")))
  WHERE (("uga"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("ug"."name")::"text" = 'Administradores'::"text")))));



CREATE POLICY "Admins podem inserir categorias" ON "public"."de_para_categoria" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."user_group_assignments" "uga"
     JOIN "public"."user_groups" "ug" ON (("uga"."group_id" = "ug"."id")))
  WHERE (("uga"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("ug"."name")::"text" = 'Administradores'::"text")))));



CREATE POLICY "Authenticated users can create email templates" ON "public"."email_templates" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Authenticated users can delete email templates" ON "public"."email_templates" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Authenticated users can update email templates" ON "public"."email_templates" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Authenticated users can view all email templates" ON "public"."email_templates" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Authenticated users can view sync control" ON "public"."sync_control_pesquisas" FOR SELECT USING ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Permitir leitura de categorias ativas" ON "public"."de_para_categoria" FOR SELECT USING (("status" = 'ativa'::"text"));



CREATE POLICY "Service role can delete historico" ON "public"."historico_inconsistencias_chamados" FOR DELETE USING (((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'service_role'::"text"));



COMMENT ON POLICY "Service role can delete historico" ON "public"."historico_inconsistencias_chamados" IS 'Política otimizada: usa (SELECT auth.jwt()) para melhor performance';



CREATE POLICY "Service role can delete sync control" ON "public"."sync_control_pesquisas" FOR DELETE USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "Service role can insert sync control" ON "public"."sync_control_pesquisas" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "Service role can update historico" ON "public"."historico_inconsistencias_chamados" FOR UPDATE USING (((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'service_role'::"text"));



COMMENT ON POLICY "Service role can update historico" ON "public"."historico_inconsistencias_chamados" IS 'Política otimizada: usa (SELECT auth.jwt()) para melhor performance';



CREATE POLICY "Service role can update sync control" ON "public"."sync_control_pesquisas" FOR UPDATE USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "Service role full access inconsistencias" ON "public"."inconsistencias_chamados" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access valores" ON "public"."valores_taxas_funcoes" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Users can delete alocacoes" ON "public"."banco_horas_alocacoes" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Users can insert alocacoes" ON "public"."banco_horas_alocacoes" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Users can insert audit_log" ON "public"."banco_horas_audit_log" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Users can insert historico" ON "public"."historico_inconsistencias_chamados" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Users can insert inconsistencias" ON "public"."inconsistencias_chamados" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Users can insert reajustes" ON "public"."banco_horas_reajustes" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Users can update alocacoes" ON "public"."banco_horas_alocacoes" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Users can update inconsistencias" ON "public"."inconsistencias_chamados" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Users can update reajustes" ON "public"."banco_horas_reajustes" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Users can view alocacoes" ON "public"."banco_horas_alocacoes" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Users can view audit_log" ON "public"."banco_horas_audit_log" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Users can view historico" ON "public"."historico_inconsistencias_chamados" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Users can view inconsistencias" ON "public"."inconsistencias_chamados" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Users can view reajustes" ON "public"."banco_horas_reajustes" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Usuários autenticados podem atualizar pesquisas_satisfacao" ON "public"."pesquisas_satisfacao" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL)) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Usuários autenticados podem atualizar user_groups" ON "public"."user_groups" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL)) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Usuários autenticados podem deletar pesquisas_satisfacao" ON "public"."pesquisas_satisfacao" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Usuários autenticados podem deletar user_groups" ON "public"."user_groups" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Usuários autenticados podem inserir logs de auditoria" ON "public"."permission_audit_logs" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Usuários autenticados podem inserir logs de email" ON "public"."email_logs" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Usuários autenticados podem inserir user_groups" ON "public"."user_groups" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Usuários autenticados podem ver pesquisas_satisfacao" ON "public"."pesquisas_satisfacao" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Usuários autenticados podem ver screens" ON "public"."screens" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Usuários autenticados podem ver taxas_padrao" ON "public"."taxas_padrao" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Usuários autenticados podem visualizar tickets" ON "public"."apontamentos_tickets_aranda" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Usuários podem atualizar clientes se têm permissão de ediç" ON "public"."clientes" FOR UPDATE USING ("public"."has_screen_permission"('clientes'::"text", 'edit'::"text")) WITH CHECK ("public"."has_screen_permission"('clientes'::"text", 'edit'::"text"));



CREATE POLICY "Usuários podem atualizar contatos com permissão" ON "public"."plano_acao_contatos" FOR UPDATE USING ("public"."has_screen_permission"('plano_acao'::"text", 'edit'::"text")) WITH CHECK ("public"."has_screen_permission"('plano_acao'::"text", 'edit'::"text"));



COMMENT ON POLICY "Usuários podem atualizar contatos com permissão" ON "public"."plano_acao_contatos" IS 'Política corrigida: usuários com permissão edit podem atualizar contatos';



CREATE POLICY "Usuários podem atualizar planos com permissão" ON "public"."planos_acao" FOR UPDATE USING ("public"."has_screen_permission"('plano_acao'::"text", 'edit'::"text")) WITH CHECK ("public"."has_screen_permission"('plano_acao'::"text", 'edit'::"text"));



COMMENT ON POLICY "Usuários podem atualizar planos com permissão" ON "public"."planos_acao" IS 'Política corrigida: usuários com permissão edit podem atualizar planos de ação';



CREATE POLICY "Usuários podem atualizar taxas padrão com permissão" ON "public"."taxas_padrao" FOR UPDATE USING ("public"."has_screen_permission"('taxas'::"text", 'edit'::"text"));



CREATE POLICY "Usuários podem deletar clientes se têm permissão de edição" ON "public"."clientes" FOR DELETE USING ("public"."has_screen_permission"('clientes'::"text", 'edit'::"text"));



CREATE POLICY "Usuários podem excluir contatos com permissão" ON "public"."plano_acao_contatos" FOR DELETE TO "authenticated" USING ("public"."has_screen_permission"('plano_acao'::"text", 'edit'::"text"));



CREATE POLICY "Usuários podem excluir planos com permissão" ON "public"."planos_acao" FOR DELETE USING ("public"."has_screen_permission"('plano_acao'::"text", 'delete'::"text"));



COMMENT ON POLICY "Usuários podem excluir planos com permissão" ON "public"."planos_acao" IS 'Política restritiva: apenas usuários com permissão delete podem excluir planos de ação';



CREATE POLICY "Usuários podem excluir taxas padrão com permissão" ON "public"."taxas_padrao" FOR DELETE USING ("public"."has_screen_permission"('taxas'::"text", 'delete'::"text"));



CREATE POLICY "Usuários podem inserir clientes se têm permissão de edição" ON "public"."clientes" FOR INSERT WITH CHECK ("public"."has_screen_permission"('clientes'::"text", 'edit'::"text"));



CREATE POLICY "Usuários podem inserir contatos com permissão" ON "public"."plano_acao_contatos" FOR INSERT WITH CHECK ("public"."has_screen_permission"('plano_acao'::"text", 'edit'::"text"));



COMMENT ON POLICY "Usuários podem inserir contatos com permissão" ON "public"."plano_acao_contatos" IS 'Política corrigida: usuários com permissão edit podem criar contatos';



CREATE POLICY "Usuários podem inserir planos com permissão" ON "public"."planos_acao" FOR INSERT WITH CHECK ("public"."has_screen_permission"('plano_acao'::"text", 'edit'::"text"));



COMMENT ON POLICY "Usuários podem inserir planos com permissão" ON "public"."planos_acao" IS 'Política corrigida: usuários com permissão edit podem criar planos de ação';



CREATE POLICY "Usuários podem inserir taxas padrão com permissão" ON "public"."taxas_padrao" FOR INSERT WITH CHECK ("public"."has_screen_permission"('taxas'::"text", 'create'::"text"));



CREATE POLICY "Usuários podem ver contatos com permissão" ON "public"."plano_acao_contatos" FOR SELECT USING (("public"."has_screen_permission"('plano_acao'::"text", 'view'::"text") OR "public"."has_screen_permission"('plano_acao'::"text", 'edit'::"text") OR "public"."has_screen_permission"('plano_acao'::"text", 'delete'::"text")));



COMMENT ON POLICY "Usuários podem ver contatos com permissão" ON "public"."plano_acao_contatos" IS 'Política flexível: usuários com permissão view, edit ou delete podem visualizar contatos';



CREATE POLICY "Usuários podem ver planos com permissão" ON "public"."planos_acao" FOR SELECT USING (("public"."has_screen_permission"('plano_acao'::"text", 'view'::"text") OR "public"."has_screen_permission"('plano_acao'::"text", 'edit'::"text") OR "public"."has_screen_permission"('plano_acao'::"text", 'delete'::"text")));



COMMENT ON POLICY "Usuários podem ver planos com permissão" ON "public"."planos_acao" IS 'Política flexível: usuários com permissão view, edit ou delete podem visualizar planos de ação';



CREATE POLICY "Usuários podem visualizar clientes se têm permissão" ON "public"."clientes" FOR SELECT USING ("public"."has_screen_permission"('clientes'::"text", 'view'::"text"));



ALTER TABLE "public"."admin_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."anexos_temporarios" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "anexos_temporarios_unified_access" ON "public"."anexos_temporarios" USING (((( SELECT "current_setting"('role'::"text") AS "current_setting") = 'service_role'::"text") OR (( SELECT "auth"."uid"() AS "uid") IS NOT NULL))) WITH CHECK (((( SELECT "current_setting"('role'::"text") AS "current_setting") = 'service_role'::"text") OR (( SELECT "auth"."uid"() AS "uid") IS NOT NULL)));



CREATE POLICY "anon_select_organizacao_estrutura" ON "public"."organizacao_estrutura" FOR SELECT TO "anon" USING (true);



COMMENT ON POLICY "anon_select_organizacao_estrutura" ON "public"."organizacao_estrutura" IS 'Leitura pública para anon (chave publishable). Necessário para geração de PDFs.';



CREATE POLICY "anon_select_organizacao_produto" ON "public"."organizacao_produto" FOR SELECT TO "anon" USING (true);



COMMENT ON POLICY "anon_select_organizacao_produto" ON "public"."organizacao_produto" IS 'Leitura pública para anon (chave publishable). Necessário para geração de PDFs.';



ALTER TABLE "public"."apontamentos_aranda" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."apontamentos_tickets_aranda" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "authenticated_delete_admin_notifications" ON "public"."admin_notifications" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "authenticated_delete_banco_horas_ajustes_retroativos" ON "public"."banco_horas_ajustes_retroativos" FOR DELETE TO "authenticated" USING ("public"."user_has_banco_horas_permission"());



CREATE POLICY "authenticated_delete_banco_horas_calculos" ON "public"."banco_horas_calculos" FOR DELETE TO "authenticated" USING ("public"."user_has_banco_horas_permission"());



CREATE POLICY "authenticated_delete_banco_horas_fechamentos" ON "public"."banco_horas_fechamentos" FOR DELETE TO "authenticated" USING ("public"."user_has_banco_horas_permission"());



CREATE POLICY "authenticated_delete_banco_horas_observacoes" ON "public"."banco_horas_observacoes" FOR DELETE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "created_by") AND "public"."has_screen_permission"('controle_banco_horas'::character varying, 'edit'::character varying)));



CREATE POLICY "authenticated_delete_banco_horas_segmentados" ON "public"."banco_horas_calculos_segmentados" FOR DELETE TO "authenticated" USING ("public"."user_has_banco_horas_permission"());



CREATE POLICY "authenticated_delete_banco_horas_versoes" ON "public"."banco_horas_versoes" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."profiles" "p"
     JOIN "public"."user_group_assignments" "uga" ON (("p"."id" = "uga"."user_id")))
     JOIN "public"."screen_permissions" "sp" ON (("sp"."group_id" = "uga"."group_id")))
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("sp"."screen_key")::"text" = ANY ((ARRAY['controle_banco_horas'::character varying, 'geracao_books'::character varying])::"text"[])) AND (("sp"."permission_level")::"text" = 'edit'::"text")))));



CREATE POLICY "authenticated_delete_baseline_historico" ON "public"."baseline_historico" FOR DELETE TO "authenticated" USING ("public"."user_has_baseline_permission"());



COMMENT ON POLICY "authenticated_delete_baseline_historico" ON "public"."baseline_historico" IS 'Permite exclusão de histórico de baseline para usuários com permissão.
Otimizado com função que usa (SELECT auth.uid()).';



CREATE POLICY "authenticated_delete_email_test_data" ON "public"."email_test_data" FOR DELETE TO "authenticated" USING ("public"."has_screen_permission"('email_config'::character varying, 'edit'::character varying));



CREATE POLICY "authenticated_delete_multiplos_superiores" ON "public"."organizacao_multiplos_superiores" FOR DELETE TO "authenticated" USING ("public"."user_has_organograma_permission"());



CREATE POLICY "authenticated_delete_organizacao" ON "public"."organizacao_estrutura" FOR DELETE TO "authenticated" USING ("public"."user_has_organograma_permission"('edit'::"text"));



CREATE POLICY "authenticated_delete_organizacao_produto" ON "public"."organizacao_produto" FOR DELETE TO "authenticated" USING ("public"."user_has_organograma_permission"('edit'::"text"));



CREATE POLICY "authenticated_delete_percentual_repasse_historico" ON "public"."percentual_repasse_historico" FOR DELETE TO "authenticated" USING ("public"."user_can_access_percentual_repasse_historico"());



CREATE POLICY "authenticated_delete_pesquisa_mensal_ams" ON "public"."pesquisa_mensal_ams" FOR DELETE TO "authenticated" USING ("public"."has_screen_permission"('pesquisas'::character varying, 'edit'::character varying));



CREATE POLICY "authenticated_delete_requerimentos" ON "public"."requerimentos" FOR DELETE TO "authenticated" USING ("public"."user_has_requerimentos_permission"('edit'::"text"));



CREATE POLICY "authenticated_delete_screen_permissions" ON "public"."screen_permissions" FOR DELETE TO "authenticated" USING ("public"."user_can_manage_permissions"());



CREATE POLICY "authenticated_insert_admin_notifications" ON "public"."admin_notifications" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "authenticated_insert_banco_horas_ajustes_retroativos" ON "public"."banco_horas_ajustes_retroativos" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_has_banco_horas_permission"());



CREATE POLICY "authenticated_insert_banco_horas_calculos" ON "public"."banco_horas_calculos" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_has_banco_horas_permission"());



CREATE POLICY "authenticated_insert_banco_horas_fechamentos" ON "public"."banco_horas_fechamentos" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_has_banco_horas_permission"());



CREATE POLICY "authenticated_insert_banco_horas_observacoes" ON "public"."banco_horas_observacoes" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_screen_permission"('controle_banco_horas'::character varying, 'edit'::character varying));



CREATE POLICY "authenticated_insert_banco_horas_segmentados" ON "public"."banco_horas_calculos_segmentados" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_has_banco_horas_permission"());



CREATE POLICY "authenticated_insert_baseline_historico" ON "public"."baseline_historico" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_has_baseline_permission"());



COMMENT ON POLICY "authenticated_insert_baseline_historico" ON "public"."baseline_historico" IS 'Permite inserção de histórico de baseline para usuários com permissão.
Otimizado com função que usa (SELECT auth.uid()).';



CREATE POLICY "authenticated_insert_book_gen_queue" ON "public"."book_generation_queue" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_screen_permission"('geracao_books'::character varying, 'edit'::character varying));



CREATE POLICY "authenticated_insert_books_historico_geracao" ON "public"."books_historico_geracao" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_screen_permission"('geracao_books'::character varying, 'edit'::character varying));



CREATE POLICY "authenticated_insert_email_test_data" ON "public"."email_test_data" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_screen_permission"('email_config'::character varying, 'edit'::character varying));



CREATE POLICY "authenticated_insert_job_configurations" ON "public"."job_configurations" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_screen_permission"('gerenciar_permissoes'::character varying, 'edit'::character varying));



CREATE POLICY "authenticated_insert_jobs_queue" ON "public"."jobs_queue" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "authenticated_insert_logs_sistema" ON "public"."logs_sistema" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "authenticated_insert_multiplos_superiores" ON "public"."organizacao_multiplos_superiores" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_has_organograma_permission"());



CREATE POLICY "authenticated_insert_organizacao" ON "public"."organizacao_estrutura" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_has_organograma_permission"('edit'::"text"));



CREATE POLICY "authenticated_insert_organizacao_produto" ON "public"."organizacao_produto" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_has_organograma_permission"('edit'::"text"));



CREATE POLICY "authenticated_insert_percentual_repasse_historico" ON "public"."percentual_repasse_historico" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_can_access_percentual_repasse_historico"());



CREATE POLICY "authenticated_insert_pesquisa_mensal_ams" ON "public"."pesquisa_mensal_ams" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_screen_permission"('pesquisas'::character varying, 'edit'::character varying));



CREATE POLICY "authenticated_insert_profiles" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "authenticated_insert_requerimentos" ON "public"."requerimentos" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_has_requerimentos_permission"('edit'::"text"));



CREATE POLICY "authenticated_insert_screen_permissions" ON "public"."screen_permissions" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_can_manage_permissions"());



CREATE POLICY "authenticated_insert_sync_metadata" ON "public"."sync_metadata" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."has_sync_write_permission"() AS "has_sync_write_permission"));



CREATE POLICY "authenticated_insert_versoes" ON "public"."banco_horas_versoes" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_can_manage_banco_horas"());



CREATE POLICY "authenticated_select_admin_notifications" ON "public"."admin_notifications" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "authenticated_select_apontamentos_aranda" ON "public"."apontamentos_aranda" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select_banco_horas_ajustes_retroativos" ON "public"."banco_horas_ajustes_retroativos" FOR SELECT TO "authenticated" USING ("public"."user_has_banco_horas_permission"());



CREATE POLICY "authenticated_select_banco_horas_calculos" ON "public"."banco_horas_calculos" FOR SELECT TO "authenticated" USING ("public"."user_has_banco_horas_permission"());



CREATE POLICY "authenticated_select_banco_horas_fechamentos" ON "public"."banco_horas_fechamentos" FOR SELECT TO "authenticated" USING ("public"."user_has_banco_horas_permission"());



CREATE POLICY "authenticated_select_banco_horas_observacoes" ON "public"."banco_horas_observacoes" FOR SELECT TO "authenticated" USING ("public"."has_screen_permission"('controle_banco_horas'::character varying, 'view'::character varying));



CREATE POLICY "authenticated_select_banco_horas_segmentados" ON "public"."banco_horas_calculos_segmentados" FOR SELECT TO "authenticated" USING ("public"."user_has_banco_horas_permission"());



CREATE POLICY "authenticated_select_baseline_historico" ON "public"."baseline_historico" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select_book_gen_queue" ON "public"."book_generation_queue" FOR SELECT TO "authenticated" USING ("public"."has_screen_permission"('geracao_books'::character varying, 'view'::character varying));



CREATE POLICY "authenticated_select_books_historico_geracao" ON "public"."books_historico_geracao" FOR SELECT TO "authenticated" USING ("public"."has_screen_permission"('geracao_books'::character varying, 'view'::character varying));



CREATE POLICY "authenticated_select_email_test_data" ON "public"."email_test_data" FOR SELECT TO "authenticated" USING ("public"."has_screen_permission"('email_config'::character varying, 'view'::character varying));



CREATE POLICY "authenticated_select_job_configurations" ON "public"."job_configurations" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "authenticated_select_jobs_queue" ON "public"."jobs_queue" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "authenticated_select_logs_sistema" ON "public"."logs_sistema" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "authenticated_select_multiplos_superiores" ON "public"."organizacao_multiplos_superiores" FOR SELECT TO "authenticated" USING ("public"."user_has_organograma_permission"());



CREATE POLICY "authenticated_select_organizacao" ON "public"."organizacao_estrutura" FOR SELECT TO "authenticated" USING ("public"."user_has_organograma_permission"('view'::"text"));



CREATE POLICY "authenticated_select_organizacao_produto" ON "public"."organizacao_produto" FOR SELECT TO "authenticated" USING ("public"."user_has_organograma_permission"('view'::"text"));



CREATE POLICY "authenticated_select_percentual_repasse_historico" ON "public"."percentual_repasse_historico" FOR SELECT TO "authenticated" USING ("public"."user_can_access_percentual_repasse_historico"());



CREATE POLICY "authenticated_select_pesquisa_mensal_ams" ON "public"."pesquisa_mensal_ams" FOR SELECT TO "authenticated" USING ("public"."has_screen_permission"('pesquisas'::character varying, 'view'::character varying));



CREATE POLICY "authenticated_select_profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "authenticated_select_requerimentos" ON "public"."requerimentos" FOR SELECT TO "authenticated" USING ("public"."user_has_requerimentos_permission"('view'::"text"));



CREATE POLICY "authenticated_select_screen_permissions" ON "public"."screen_permissions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select_sync_control" ON "public"."sync_control" FOR SELECT TO "authenticated" USING (true);



COMMENT ON POLICY "authenticated_select_sync_control" ON "public"."sync_control" IS 'Usuários autenticados podem visualizar todos os registros de sincronização';



CREATE POLICY "authenticated_select_sync_metadata" ON "public"."sync_metadata" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "authenticated_select_versoes" ON "public"."banco_horas_versoes" FOR SELECT TO "authenticated" USING ("public"."user_can_manage_banco_horas"());



CREATE POLICY "authenticated_update_admin_notifications" ON "public"."admin_notifications" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "authenticated_update_banco_horas_ajustes_retroativos" ON "public"."banco_horas_ajustes_retroativos" FOR UPDATE TO "authenticated" USING ("public"."user_has_banco_horas_permission"());



CREATE POLICY "authenticated_update_banco_horas_calculos" ON "public"."banco_horas_calculos" FOR UPDATE TO "authenticated" USING ("public"."user_has_banco_horas_permission"()) WITH CHECK ("public"."user_has_banco_horas_permission"());



CREATE POLICY "authenticated_update_banco_horas_fechamentos" ON "public"."banco_horas_fechamentos" FOR UPDATE TO "authenticated" USING ("public"."user_has_banco_horas_permission"());



CREATE POLICY "authenticated_update_banco_horas_observacoes" ON "public"."banco_horas_observacoes" FOR UPDATE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "created_by") AND "public"."has_screen_permission"('controle_banco_horas'::character varying, 'edit'::character varying)));



CREATE POLICY "authenticated_update_banco_horas_segmentados" ON "public"."banco_horas_calculos_segmentados" FOR UPDATE TO "authenticated" USING ("public"."user_has_banco_horas_permission"()) WITH CHECK ("public"."user_has_banco_horas_permission"());



CREATE POLICY "authenticated_update_baseline_historico" ON "public"."baseline_historico" FOR UPDATE TO "authenticated" USING ("public"."user_has_baseline_permission"()) WITH CHECK ("public"."user_has_baseline_permission"());



COMMENT ON POLICY "authenticated_update_baseline_historico" ON "public"."baseline_historico" IS 'Permite atualização de histórico de baseline para usuários com permissão.
Otimizado com função que usa (SELECT auth.uid()).';



CREATE POLICY "authenticated_update_book_gen_queue" ON "public"."book_generation_queue" FOR UPDATE TO "authenticated" USING ("public"."has_screen_permission"('geracao_books'::character varying, 'edit'::character varying));



CREATE POLICY "authenticated_update_email_test_data" ON "public"."email_test_data" FOR UPDATE TO "authenticated" USING ("public"."has_screen_permission"('email_config'::character varying, 'edit'::character varying));



CREATE POLICY "authenticated_update_job_configurations" ON "public"."job_configurations" FOR UPDATE TO "authenticated" USING ("public"."has_screen_permission"('gerenciar_permissoes'::character varying, 'edit'::character varying));



CREATE POLICY "authenticated_update_jobs_queue" ON "public"."jobs_queue" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "authenticated_update_multiplos_superiores" ON "public"."organizacao_multiplos_superiores" FOR UPDATE TO "authenticated" USING ("public"."user_has_organograma_permission"());



CREATE POLICY "authenticated_update_organizacao" ON "public"."organizacao_estrutura" FOR UPDATE TO "authenticated" USING ("public"."user_has_organograma_permission"('edit'::"text"));



CREATE POLICY "authenticated_update_organizacao_produto" ON "public"."organizacao_produto" FOR UPDATE TO "authenticated" USING ("public"."user_has_organograma_permission"('edit'::"text"));



CREATE POLICY "authenticated_update_percentual_repasse_historico" ON "public"."percentual_repasse_historico" FOR UPDATE TO "authenticated" USING ("public"."user_can_access_percentual_repasse_historico"());



CREATE POLICY "authenticated_update_pesquisa_mensal_ams" ON "public"."pesquisa_mensal_ams" FOR UPDATE TO "authenticated" USING ("public"."has_screen_permission"('pesquisas'::character varying, 'edit'::character varying));



CREATE POLICY "authenticated_update_profiles" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "id") OR "public"."is_admin"())) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "id") OR "public"."is_admin"()));



CREATE POLICY "authenticated_update_requerimentos" ON "public"."requerimentos" FOR UPDATE TO "authenticated" USING ("public"."user_has_requerimentos_permission"('edit'::"text")) WITH CHECK ("public"."user_has_requerimentos_permission"('edit'::"text"));



CREATE POLICY "authenticated_update_screen_permissions" ON "public"."screen_permissions" FOR UPDATE TO "authenticated" USING ("public"."user_can_manage_permissions"());



CREATE POLICY "authenticated_update_sync_metadata" ON "public"."sync_metadata" FOR UPDATE TO "authenticated" USING (( SELECT "public"."has_sync_write_permission"() AS "has_sync_write_permission"));



ALTER TABLE "public"."banco_horas_ajustes_retroativos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."banco_horas_alocacoes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."banco_horas_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."banco_horas_calculos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."banco_horas_calculos_segmentados" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."banco_horas_envio_agendamento_empresas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."banco_horas_envio_agendamentos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."banco_horas_envio_execucoes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."banco_horas_fechamentos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."banco_horas_observacoes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."banco_horas_reajustes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."banco_horas_versoes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."baseline_historico" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bh_envio_agendamento_empresas_delete" ON "public"."banco_horas_envio_agendamento_empresas" FOR DELETE TO "authenticated" USING (( SELECT "public"."has_screen_permission"('envio_saldo_parcial'::"text", 'edit'::"text") AS "has_screen_permission"));



CREATE POLICY "bh_envio_agendamento_empresas_insert" ON "public"."banco_horas_envio_agendamento_empresas" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."has_screen_permission"('envio_saldo_parcial'::"text", 'edit'::"text") AS "has_screen_permission"));



CREATE POLICY "bh_envio_agendamento_empresas_select" ON "public"."banco_horas_envio_agendamento_empresas" FOR SELECT TO "authenticated" USING (( SELECT "public"."has_screen_permission"('envio_saldo_parcial'::"text", 'view'::"text") AS "has_screen_permission"));



CREATE POLICY "bh_envio_agendamento_empresas_update" ON "public"."banco_horas_envio_agendamento_empresas" FOR UPDATE TO "authenticated" USING (( SELECT "public"."has_screen_permission"('envio_saldo_parcial'::"text", 'edit'::"text") AS "has_screen_permission")) WITH CHECK (( SELECT "public"."has_screen_permission"('envio_saldo_parcial'::"text", 'edit'::"text") AS "has_screen_permission"));



CREATE POLICY "bh_envio_agendamentos_delete" ON "public"."banco_horas_envio_agendamentos" FOR DELETE TO "authenticated" USING (( SELECT "public"."has_screen_permission"('envio_saldo_parcial'::"text", 'edit'::"text") AS "has_screen_permission"));



CREATE POLICY "bh_envio_agendamentos_insert" ON "public"."banco_horas_envio_agendamentos" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."has_screen_permission"('envio_saldo_parcial'::"text", 'edit'::"text") AS "has_screen_permission"));



CREATE POLICY "bh_envio_agendamentos_select" ON "public"."banco_horas_envio_agendamentos" FOR SELECT TO "authenticated" USING (( SELECT "public"."has_screen_permission"('envio_saldo_parcial'::"text", 'view'::"text") AS "has_screen_permission"));



CREATE POLICY "bh_envio_agendamentos_update" ON "public"."banco_horas_envio_agendamentos" FOR UPDATE TO "authenticated" USING (( SELECT "public"."has_screen_permission"('envio_saldo_parcial'::"text", 'edit'::"text") AS "has_screen_permission")) WITH CHECK (( SELECT "public"."has_screen_permission"('envio_saldo_parcial'::"text", 'edit'::"text") AS "has_screen_permission"));



CREATE POLICY "bh_envio_execucoes_delete" ON "public"."banco_horas_envio_execucoes" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "bh_envio_execucoes_insert" ON "public"."banco_horas_envio_execucoes" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "bh_envio_execucoes_select" ON "public"."banco_horas_envio_execucoes" FOR SELECT TO "authenticated" USING (( SELECT "public"."has_screen_permission"('envio_saldo_parcial'::"text", 'view'::"text") AS "has_screen_permission"));



CREATE POLICY "bh_envio_execucoes_update" ON "public"."banco_horas_envio_execucoes" FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);



ALTER TABLE "public"."book_generation_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."books" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "books_delete_authenticated" ON "public"."books" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



ALTER TABLE "public"."books_historico_geracao" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "books_insert_authenticated" ON "public"."books" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "books_select_public" ON "public"."books" FOR SELECT TO "authenticated", "anon" USING (true);



COMMENT ON POLICY "books_select_public" ON "public"."books" IS 'Leitura pública de books. Performance otimizada.';



CREATE POLICY "books_update_authenticated" ON "public"."books" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



ALTER TABLE "public"."books_versoes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "books_versoes_delete_service_role" ON "public"."books_versoes" FOR DELETE TO "service_role" USING (true);



CREATE POLICY "books_versoes_insert_authenticated" ON "public"."books_versoes" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_screen_permission"('geracao_books'::character varying, 'edit'::character varying));



CREATE POLICY "books_versoes_select_authenticated" ON "public"."books_versoes" FOR SELECT TO "authenticated" USING ("public"."has_screen_permission"('geracao_books'::character varying, 'view'::character varying));



CREATE POLICY "books_versoes_update_service_role" ON "public"."books_versoes" FOR UPDATE TO "service_role" USING (true);



ALTER TABLE "public"."clientes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cod_resolucao_modificacoes_select_authenticated" ON "public"."codigo_resolucao_modificacoes_aranda" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "cod_resolucao_modificacoes_service_role_all" ON "public"."codigo_resolucao_modificacoes_aranda" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."codigo_resolucao_modificacoes_aranda" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."controle_mensal" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "controle_mensal_delete_policy" ON "public"."controle_mensal" FOR DELETE TO "authenticated" USING (("public"."has_screen_permission"('controle_disparos'::"text", 'edit'::"text") OR "public"."has_screen_permission"('geracao_books'::"text", 'edit'::"text")));



COMMENT ON POLICY "controle_mensal_delete_policy" ON "public"."controle_mensal" IS 'Permite exclusão para usuários com permissão de edição em controle_disparos ou geracao_books';



CREATE POLICY "controle_mensal_insert_policy" ON "public"."controle_mensal" FOR INSERT TO "authenticated" WITH CHECK (("public"."has_screen_permission"('controle_disparos'::"text", 'edit'::"text") OR "public"."has_screen_permission"('geracao_books'::"text", 'edit'::"text")));



COMMENT ON POLICY "controle_mensal_insert_policy" ON "public"."controle_mensal" IS 'Permite inserção para usuários com permissão de edição em controle_disparos ou geracao_books';



CREATE POLICY "controle_mensal_select_policy" ON "public"."controle_mensal" FOR SELECT TO "authenticated" USING (true);



COMMENT ON POLICY "controle_mensal_select_policy" ON "public"."controle_mensal" IS 'Permite que todos os usuários autenticados visualizem o controle mensal (read-only)';



CREATE POLICY "controle_mensal_update_policy" ON "public"."controle_mensal" FOR UPDATE TO "authenticated" USING (("public"."has_screen_permission"('controle_disparos'::"text", 'edit'::"text") OR "public"."has_screen_permission"('geracao_books'::"text", 'edit'::"text")));



COMMENT ON POLICY "controle_mensal_update_policy" ON "public"."controle_mensal" IS 'Permite atualização para usuários com permissão de edição em controle_disparos ou geracao_books';



ALTER TABLE "public"."de_para_categoria" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."elogio_especialistas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "elogio_especialistas_delete" ON "public"."elogio_especialistas" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "elogio_especialistas_insert" ON "public"."elogio_especialistas" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "elogio_especialistas_select" ON "public"."elogio_especialistas" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



COMMENT ON POLICY "elogio_especialistas_select" ON "public"."elogio_especialistas" IS 'Política única e segura para visualização de elogio_especialistas';



CREATE POLICY "elogio_especialistas_update" ON "public"."elogio_especialistas" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL)) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



ALTER TABLE "public"."elogios" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "elogios_delete_with_permission" ON "public"."elogios" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."screen_permissions" "sp"
     JOIN "public"."user_groups" "ug" ON (("sp"."group_id" = "ug"."id")))
     JOIN "public"."user_group_assignments" "uga" ON (("ug"."id" = "uga"."group_id")))
  WHERE (("uga"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("sp"."screen_key")::"text" = 'lancar_elogios'::"text") AND (("sp"."permission_level")::"text" = ANY ((ARRAY['edit'::character varying, 'admin'::character varying])::"text"[]))))));



ALTER TABLE "public"."elogios_historico" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "elogios_historico_delete_policy" ON "public"."elogios_historico" FOR DELETE USING ("public"."user_is_admin"());



CREATE POLICY "elogios_historico_insert_policy" ON "public"."elogios_historico" FOR INSERT WITH CHECK (("public"."user_has_screen_permission"('enviar_elogios'::"text", 'edit'::"text") OR "public"."user_is_admin"()));



CREATE POLICY "elogios_historico_select_policy" ON "public"."elogios_historico" FOR SELECT USING (("public"."user_has_screen_permission"('enviar_elogios'::"text", 'view'::"text") OR "public"."user_has_screen_permission"('historico_elogios'::"text", 'view'::"text") OR "public"."user_is_admin"()));



CREATE POLICY "elogios_historico_update_policy" ON "public"."elogios_historico" FOR UPDATE USING ("public"."user_is_admin"()) WITH CHECK ("public"."user_is_admin"());



CREATE POLICY "elogios_insert_with_permission" ON "public"."elogios" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."screen_permissions" "sp"
     JOIN "public"."user_groups" "ug" ON (("sp"."group_id" = "ug"."id")))
     JOIN "public"."user_group_assignments" "uga" ON (("ug"."id" = "uga"."group_id")))
  WHERE (("uga"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("sp"."screen_key")::"text" = 'lancar_elogios'::"text") AND (("sp"."permission_level")::"text" = ANY ((ARRAY['edit'::character varying, 'admin'::character varying])::"text"[]))))));



CREATE POLICY "elogios_select_authenticated" ON "public"."elogios" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "elogios_update_with_permission" ON "public"."elogios" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."screen_permissions" "sp"
     JOIN "public"."user_groups" "ug" ON (("sp"."group_id" = "ug"."id")))
     JOIN "public"."user_group_assignments" "uga" ON (("ug"."id" = "uga"."group_id")))
  WHERE (("uga"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("sp"."screen_key")::"text" = 'lancar_elogios'::"text") AND (("sp"."permission_level")::"text" = ANY ((ARRAY['edit'::character varying, 'admin'::character varying])::"text"[]))))));



ALTER TABLE "public"."email_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "email_logs_select" ON "public"."email_logs" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



COMMENT ON POLICY "email_logs_select" ON "public"."email_logs" IS 'Política única e segura para visualização de logs de email';



ALTER TABLE "public"."email_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_test_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."empresa_anexos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "empresa_anexos_delete_policy" ON "public"."empresa_anexos" FOR DELETE TO "authenticated" USING ("public"."has_screen_permission"('empresas_clientes'::character varying, 'edit'::character varying));



CREATE POLICY "empresa_anexos_insert_policy" ON "public"."empresa_anexos" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_screen_permission"('empresas_clientes'::character varying, 'edit'::character varying));



CREATE POLICY "empresa_anexos_select_policy" ON "public"."empresa_anexos" FOR SELECT TO "authenticated" USING ("public"."has_screen_permission"('empresas_clientes'::character varying, 'view'::character varying));



CREATE POLICY "empresa_anexos_update_policy" ON "public"."empresa_anexos" FOR UPDATE TO "authenticated" USING ("public"."has_screen_permission"('empresas_clientes'::character varying, 'edit'::character varying));



ALTER TABLE "public"."empresa_grupos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "empresa_grupos_unified_access" ON "public"."empresa_grupos" USING (((( SELECT "current_setting"('role'::"text") AS "current_setting") = 'service_role'::"text") OR (( SELECT "auth"."uid"() AS "uid") IS NOT NULL))) WITH CHECK (((( SELECT "current_setting"('role'::"text") AS "current_setting") = 'service_role'::"text") OR (( SELECT "auth"."uid"() AS "uid") IS NOT NULL)));



ALTER TABLE "public"."empresa_produtos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "empresa_produtos_delete_authenticated" ON "public"."empresa_produtos" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "empresa_produtos_insert_authenticated" ON "public"."empresa_produtos" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "empresa_produtos_select_public" ON "public"."empresa_produtos" FOR SELECT TO "authenticated", "anon" USING (true);



COMMENT ON POLICY "empresa_produtos_select_public" ON "public"."empresa_produtos" IS 'Leitura pública de produtos. Performance otimizada.';



CREATE POLICY "empresa_produtos_update_authenticated" ON "public"."empresa_produtos" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



ALTER TABLE "public"."empresas_clientes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "empresas_clientes_delete_authenticated" ON "public"."empresas_clientes" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "empresas_clientes_insert_authenticated" ON "public"."empresas_clientes" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "empresas_clientes_select_public" ON "public"."empresas_clientes" FOR SELECT TO "authenticated", "anon" USING (true);



COMMENT ON POLICY "empresas_clientes_select_public" ON "public"."empresas_clientes" IS 'Leitura pública de empresas. Performance otimizada.';



CREATE POLICY "empresas_clientes_update_authenticated" ON "public"."empresas_clientes" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



ALTER TABLE "public"."especialistas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "especialistas_delete" ON "public"."especialistas" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "especialistas_insert" ON "public"."especialistas" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "especialistas_select" ON "public"."especialistas" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



COMMENT ON POLICY "especialistas_select" ON "public"."especialistas" IS 'Política única e segura para visualização de especialistas';



CREATE POLICY "especialistas_update" ON "public"."especialistas" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL)) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



ALTER TABLE "public"."grupo_emails" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "grupo_emails_unified_access" ON "public"."grupo_emails" USING (((( SELECT "current_setting"('role'::"text") AS "current_setting") = 'service_role'::"text") OR (( SELECT "auth"."uid"() AS "uid") IS NOT NULL))) WITH CHECK (((( SELECT "current_setting"('role'::"text") AS "current_setting") = 'service_role'::"text") OR (( SELECT "auth"."uid"() AS "uid") IS NOT NULL)));



ALTER TABLE "public"."grupos_responsaveis" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "grupos_responsaveis_unified_access" ON "public"."grupos_responsaveis" USING (((( SELECT "current_setting"('role'::"text") AS "current_setting") = 'service_role'::"text") OR (( SELECT "auth"."uid"() AS "uid") IS NOT NULL))) WITH CHECK (((( SELECT "current_setting"('role'::"text") AS "current_setting") = 'service_role'::"text") OR (( SELECT "auth"."uid"() AS "uid") IS NOT NULL)));



ALTER TABLE "public"."historico_disparos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "historico_disparos_delete_policy" ON "public"."historico_disparos" FOR DELETE USING ("public"."user_is_admin"());



CREATE POLICY "historico_disparos_insert_policy" ON "public"."historico_disparos" FOR INSERT WITH CHECK (("public"."user_has_screen_permission"('lancar_books'::"text", 'edit'::"text") OR "public"."user_has_screen_permission"('enviar_books'::"text", 'edit'::"text") OR "public"."user_is_admin"()));



CREATE POLICY "historico_disparos_select_policy" ON "public"."historico_disparos" FOR SELECT USING (("public"."user_has_screen_permission"('historico_books'::"text", 'view'::"text") OR "public"."user_has_screen_permission"('lancar_books'::"text", 'view'::"text") OR "public"."user_has_screen_permission"('enviar_books'::"text", 'view'::"text") OR "public"."user_is_admin"()));



CREATE POLICY "historico_disparos_update_policy" ON "public"."historico_disparos" FOR UPDATE USING ("public"."user_is_admin"()) WITH CHECK ("public"."user_is_admin"());



ALTER TABLE "public"."historico_inconsistencias_chamados" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "historico_insert" ON "public"."plano_acao_historico" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



COMMENT ON POLICY "historico_insert" ON "public"."plano_acao_historico" IS 'Triggers do sistema podem inserir histórico para usuários autenticados';



CREATE POLICY "historico_select" ON "public"."plano_acao_historico" FOR SELECT USING (("public"."has_screen_permission"('plano_acao'::"text", 'view'::"text") OR "public"."has_screen_permission"('plano_acao'::"text", 'edit'::"text") OR "public"."has_screen_permission"('plano_acao'::"text", 'delete'::"text")));



COMMENT ON POLICY "historico_select" ON "public"."plano_acao_historico" IS 'Usuários com permissão view, edit ou delete podem visualizar histórico';



ALTER TABLE "public"."inconsistencias_chamados" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_configurations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."jobs_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."logs_sistema" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notificacoes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notificacoes_leituras" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notificacoes_leituras_delete_proprias" ON "public"."notificacoes_leituras" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "notificacoes_leituras_insert_proprias" ON "public"."notificacoes_leituras" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."notificacoes" "n"
  WHERE ("n"."id" = "notificacoes_leituras"."notificacao_id")))));



CREATE POLICY "notificacoes_leituras_select_proprias" ON "public"."notificacoes_leituras" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "notificacoes_leituras_update_proprias" ON "public"."notificacoes_leituras" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "notificacoes_select_edicao_tela" ON "public"."notificacoes" FOR SELECT TO "authenticated" USING ("public"."has_screen_permission"(("screen_key")::"text", 'edit'::"text"));



ALTER TABLE "public"."organizacao_estrutura" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizacao_multiplos_superiores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizacao_produto" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."percentual_repasse_historico" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permission_audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "permission_audit_logs_select" ON "public"."permission_audit_logs" FOR SELECT USING (("changed_by" = ( SELECT "auth"."uid"() AS "uid")));



COMMENT ON POLICY "permission_audit_logs_select" ON "public"."permission_audit_logs" IS 'Política única e segura - usuários veem apenas próprios logs de auditoria';



ALTER TABLE "public"."pesquisa_especialistas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pesquisa_especialistas_delete" ON "public"."pesquisa_especialistas" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "pesquisa_especialistas_insert" ON "public"."pesquisa_especialistas" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "pesquisa_especialistas_select" ON "public"."pesquisa_especialistas" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "pesquisa_especialistas_update" ON "public"."pesquisa_especialistas" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL)) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



ALTER TABLE "public"."pesquisa_mensal_ams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pesquisas_satisfacao" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pesquisas_satisfacao_insert" ON "public"."pesquisas_satisfacao" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



ALTER TABLE "public"."plano_acao_contatos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plano_acao_historico" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."planos_acao" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."requerimento_anexos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "requerimento_anexos_delete_policy" ON "public"."requerimento_anexos" FOR DELETE TO "authenticated" USING ("public"."has_screen_permission"('lancar_requerimentos'::character varying, 'edit'::character varying));



CREATE POLICY "requerimento_anexos_insert_policy" ON "public"."requerimento_anexos" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_screen_permission"('lancar_requerimentos'::character varying, 'edit'::character varying));



CREATE POLICY "requerimento_anexos_select_policy" ON "public"."requerimento_anexos" FOR SELECT TO "authenticated" USING ("public"."has_screen_permission"('lancar_requerimentos'::character varying, 'view'::character varying));



CREATE POLICY "requerimento_anexos_update_policy" ON "public"."requerimento_anexos" FOR UPDATE TO "authenticated" USING ("public"."has_screen_permission"('lancar_requerimentos'::character varying, 'edit'::character varying));



ALTER TABLE "public"."requerimentos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."screen_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."screens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_role_all_admin_notifications" ON "public"."admin_notifications" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_apontamentos_aranda" ON "public"."apontamentos_aranda" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_banco_horas_ajustes_retroativos" ON "public"."banco_horas_ajustes_retroativos" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_banco_horas_calculos" ON "public"."banco_horas_calculos" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_banco_horas_fechamentos" ON "public"."banco_horas_fechamentos" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_baseline" ON "public"."baseline_historico" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_book_gen_queue" ON "public"."book_generation_queue" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_books_historico_geracao" ON "public"."books_historico_geracao" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_job_configurations" ON "public"."job_configurations" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_jobs_queue" ON "public"."jobs_queue" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_logs_sistema" ON "public"."logs_sistema" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_profiles" ON "public"."profiles" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_sync_control" ON "public"."sync_control" TO "service_role" USING (true) WITH CHECK (true);



COMMENT ON POLICY "service_role_all_sync_control" ON "public"."sync_control" IS 'Service role tem acesso total à tabela sync_control para gerenciar sincronizações';



CREATE POLICY "service_role_full_access_pesquisas" ON "public"."pesquisas_satisfacao" TO "service_role" USING (true) WITH CHECK (true);



COMMENT ON POLICY "service_role_full_access_pesquisas" ON "public"."pesquisas_satisfacao" IS 'Service role tem acesso total para sincronização - sem restrições';



CREATE POLICY "service_role_full_access_tickets" ON "public"."apontamentos_tickets_aranda" TO "service_role" USING (true) WITH CHECK (true);



COMMENT ON POLICY "service_role_full_access_tickets" ON "public"."apontamentos_tickets_aranda" IS 'Service role tem acesso total para sincronização - sem restrições';



ALTER TABLE "public"."sync_agendamentos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sync_agendamentos_delete" ON "public"."sync_agendamentos" FOR DELETE TO "authenticated" USING (( SELECT "public"."has_screen_permission"('sincronizacao_sql_server'::"text", 'edit'::"text") AS "has_screen_permission"));



CREATE POLICY "sync_agendamentos_insert" ON "public"."sync_agendamentos" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."has_screen_permission"('sincronizacao_sql_server'::"text", 'edit'::"text") AS "has_screen_permission"));



CREATE POLICY "sync_agendamentos_select" ON "public"."sync_agendamentos" FOR SELECT TO "authenticated" USING (( SELECT "public"."has_screen_permission"('sincronizacao_sql_server'::"text", 'view'::"text") AS "has_screen_permission"));



CREATE POLICY "sync_agendamentos_update" ON "public"."sync_agendamentos" FOR UPDATE TO "authenticated" USING (( SELECT "public"."has_screen_permission"('sincronizacao_sql_server'::"text", 'edit'::"text") AS "has_screen_permission")) WITH CHECK (( SELECT "public"."has_screen_permission"('sincronizacao_sql_server'::"text", 'edit'::"text") AS "has_screen_permission"));



ALTER TABLE "public"."sync_control" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sync_control_pesquisas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sync_execucoes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sync_execucoes_delete" ON "public"."sync_execucoes" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "sync_execucoes_insert" ON "public"."sync_execucoes" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "sync_execucoes_select" ON "public"."sync_execucoes" FOR SELECT TO "authenticated" USING (( SELECT "public"."has_screen_permission"('sincronizacao_sql_server'::"text", 'view'::"text") AS "has_screen_permission"));



CREATE POLICY "sync_execucoes_update" ON "public"."sync_execucoes" FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);



ALTER TABLE "public"."sync_metadata" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."taxas_clientes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "taxas_delete_with_permission" ON "public"."taxas_clientes" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."user_group_assignments" "uga"
     JOIN "public"."user_groups" "ug" ON (("uga"."group_id" = "ug"."id")))
     JOIN "public"."screen_permissions" "sp" ON (("sp"."group_id" = "ug"."id")))
  WHERE (("uga"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("sp"."screen_key")::"text" = 'cadastro_taxas_clientes'::"text") AND (("sp"."permission_level")::"text" = ANY ((ARRAY['edit'::character varying, 'admin'::character varying])::"text"[]))))));



CREATE POLICY "taxas_insert_with_permission" ON "public"."taxas_clientes" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."user_group_assignments" "uga"
     JOIN "public"."user_groups" "ug" ON (("uga"."group_id" = "ug"."id")))
     JOIN "public"."screen_permissions" "sp" ON (("sp"."group_id" = "ug"."id")))
  WHERE (("uga"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("sp"."screen_key")::"text" = 'cadastro_taxas_clientes'::"text") AND (("sp"."permission_level")::"text" = ANY ((ARRAY['edit'::character varying, 'admin'::character varying])::"text"[]))))));



ALTER TABLE "public"."taxas_padrao" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "taxas_select_authenticated" ON "public"."taxas_clientes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "taxas_service_role_all" ON "public"."taxas_clientes" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "taxas_update_with_permission" ON "public"."taxas_clientes" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."user_group_assignments" "uga"
     JOIN "public"."user_groups" "ug" ON (("uga"."group_id" = "ug"."id")))
     JOIN "public"."screen_permissions" "sp" ON (("sp"."group_id" = "ug"."id")))
  WHERE (("uga"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("sp"."screen_key")::"text" = 'cadastro_taxas_clientes'::"text") AND (("sp"."permission_level")::"text" = ANY ((ARRAY['edit'::character varying, 'admin'::character varying])::"text"[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."user_group_assignments" "uga"
     JOIN "public"."user_groups" "ug" ON (("uga"."group_id" = "ug"."id")))
     JOIN "public"."screen_permissions" "sp" ON (("sp"."group_id" = "ug"."id")))
  WHERE (("uga"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("sp"."screen_key")::"text" = 'cadastro_taxas_clientes'::"text") AND (("sp"."permission_level")::"text" = ANY ((ARRAY['edit'::character varying, 'admin'::character varying])::"text"[]))))));



ALTER TABLE "public"."user_group_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_group_assignments_delete_admin" ON "public"."user_group_assignments" FOR DELETE TO "authenticated" USING ("public"."has_screen_permission"('usuarios-grupos'::character varying, 'edit'::character varying));



CREATE POLICY "user_group_assignments_insert_admin" ON "public"."user_group_assignments" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_screen_permission"('usuarios-grupos'::character varying, 'edit'::character varying));



CREATE POLICY "user_group_assignments_select_authenticated" ON "public"."user_group_assignments" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "user_group_assignments_service_role" ON "public"."user_group_assignments" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "user_group_assignments_update_admin" ON "public"."user_group_assignments" FOR UPDATE TO "authenticated" USING ("public"."has_screen_permission"('usuarios-grupos'::character varying, 'edit'::character varying));



ALTER TABLE "public"."user_groups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_groups_select" ON "public"."user_groups" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "valores_taxas_delete_with_permission" ON "public"."valores_taxas_funcoes" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."screen_permissions" "sp"
     JOIN "public"."user_groups" "ug" ON (("sp"."group_id" = "ug"."id")))
     JOIN "public"."user_group_assignments" "uga" ON (("ug"."id" = "uga"."group_id")))
  WHERE (("uga"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("sp"."screen_key")::"text" = 'cadastro_taxas_clientes'::"text") AND (("sp"."permission_level")::"text" = ANY ((ARRAY['edit'::character varying, 'admin'::character varying])::"text"[]))))));



COMMENT ON POLICY "valores_taxas_delete_with_permission" ON "public"."valores_taxas_funcoes" IS 'Permite que usuários com permissão edit ou admin possam deletar valores de taxas';



ALTER TABLE "public"."valores_taxas_funcoes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "valores_taxas_insert_with_permission" ON "public"."valores_taxas_funcoes" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."screen_permissions" "sp"
     JOIN "public"."user_groups" "ug" ON (("sp"."group_id" = "ug"."id")))
     JOIN "public"."user_group_assignments" "uga" ON (("ug"."id" = "uga"."group_id")))
  WHERE (("uga"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("sp"."screen_key")::"text" = 'cadastro_taxas_clientes'::"text") AND (("sp"."permission_level")::"text" = ANY ((ARRAY['edit'::character varying, 'admin'::character varying])::"text"[]))))));



CREATE POLICY "valores_taxas_select_authenticated" ON "public"."valores_taxas_funcoes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "valores_taxas_update_with_permission" ON "public"."valores_taxas_funcoes" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."screen_permissions" "sp"
     JOIN "public"."user_groups" "ug" ON (("sp"."group_id" = "ug"."id")))
     JOIN "public"."user_group_assignments" "uga" ON (("ug"."id" = "uga"."group_id")))
  WHERE (("uga"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("sp"."screen_key")::"text" = 'cadastro_taxas_clientes'::"text") AND (("sp"."permission_level")::"text" = ANY ((ARRAY['edit'::character varying, 'admin'::character varying])::"text"[]))))));



ALTER TABLE "public"."webhook_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "webhook_config_delete_editores_email_config" ON "public"."webhook_config" FOR DELETE TO "authenticated" USING ("public"."has_screen_permission"('email-config'::"text", 'edit'::"text"));



CREATE POLICY "webhook_config_insert_editores_email_config" ON "public"."webhook_config" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_screen_permission"('email-config'::"text", 'edit'::"text"));



CREATE POLICY "webhook_config_select_editores_email_config" ON "public"."webhook_config" FOR SELECT TO "authenticated" USING ("public"."has_screen_permission"('email-config'::"text", 'edit'::"text"));



CREATE POLICY "webhook_config_update_editores_email_config" ON "public"."webhook_config" FOR UPDATE TO "authenticated" USING ("public"."has_screen_permission"('email-config'::"text", 'edit'::"text")) WITH CHECK ("public"."has_screen_permission"('email-config'::"text", 'edit'::"text"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."book_generation_queue";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notificacoes";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";















































































































































































































































































































































































































REVOKE ALL ON FUNCTION "public"."admin_create_user"("p_email" "text", "p_password" "text", "p_full_name" "text", "p_group_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_create_user"("p_email" "text", "p_password" "text", "p_full_name" "text", "p_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_create_user"("p_email" "text", "p_password" "text", "p_full_name" "text", "p_group_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_delete_user"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_delete_user"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_delete_user"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_reset_user_password"("p_user_id" "uuid", "p_new_password" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_reset_user_password"("p_user_id" "uuid", "p_new_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_reset_user_password"("p_user_id" "uuid", "p_new_password" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_update_user"("p_user_id" "uuid", "p_email" "text", "p_full_name" "text", "p_group_id" "uuid", "p_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_update_user"("p_user_id" "uuid", "p_email" "text", "p_full_name" "text", "p_group_id" "uuid", "p_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_user"("p_user_id" "uuid", "p_email" "text", "p_full_name" "text", "p_group_id" "uuid", "p_active" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."assign_user_to_group"("user_uuid" "uuid", "group_uuid" "uuid", "assigned_by_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."assign_user_to_group"("user_uuid" "uuid", "group_uuid" "uuid", "assigned_by_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_user_to_group"("user_uuid" "uuid", "group_uuid" "uuid", "assigned_by_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."atualizar_data_resposta_elogio"() TO "anon";
GRANT ALL ON FUNCTION "public"."atualizar_data_resposta_elogio"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."atualizar_data_resposta_elogio"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."atualizar_data_resposta_plano_acao"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."atualizar_data_resposta_plano_acao"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."atualizar_elogios_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."atualizar_elogios_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."atualizar_timestamp_plano_acao"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."atualizar_timestamp_plano_acao"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."audit_taxas_trigger_function"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."audit_taxas_trigger_function"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."audit_trigger_function"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."audit_trigger_function"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."banco_horas_envio_agendamentos_before_write"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."banco_horas_envio_agendamentos_before_write"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."bloquear_atualizacao_book_enviado"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."bloquear_atualizacao_book_enviado"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."bloquear_modificacao_versao_book"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."bloquear_modificacao_versao_book"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."buscar_books_por_periodo"("p_mes" integer, "p_ano" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."buscar_books_por_periodo"("p_mes" integer, "p_ano" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."buscar_books_por_periodo"("p_mes" integer, "p_ano" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."buscar_historico_com_anexos"("item_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."buscar_historico_com_anexos"("item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."buscar_historico_com_anexos"("item_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."buscar_historico_com_anexos"("p_empresa_id" "uuid", "p_mes_referencia" "date", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."buscar_historico_com_anexos"("p_empresa_id" "uuid", "p_mes_referencia" "date", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."buscar_historico_com_anexos"("p_empresa_id" "uuid", "p_mes_referencia" "date", "p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."calcular_valores_requerimento"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."calcular_valores_requerimento"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_delete_group"("group_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_delete_group"("group_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_delete_group"("group_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_edit_pesquisas"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_edit_pesquisas"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_edit_pesquisas"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_especialistas_view_access"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_especialistas_view_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_especialistas_view_access"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_old_jobs"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_old_jobs"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_realtime_old_data"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_realtime_old_data"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_banco_horas_audit_log"("p_empresa_id" "uuid", "p_calculo_id" "uuid", "p_acao" character varying, "p_descricao" "text", "p_dados_acao" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_banco_horas_audit_log"("p_empresa_id" "uuid", "p_calculo_id" "uuid", "p_acao" character varying, "p_descricao" "text", "p_dados_acao" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_banco_horas_audit_log"("p_empresa_id" "uuid", "p_calculo_id" "uuid", "p_acao" character varying, "p_descricao" "text", "p_dados_acao" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_user_group"("group_name" character varying, "group_description" "text", "created_by_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_user_group"("group_name" character varying, "group_description" "text", "created_by_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_group"("group_name" character varying, "group_description" "text", "created_by_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."criar_log_historico_plano"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."criar_log_historico_plano"() TO "service_role";



GRANT ALL ON FUNCTION "public"."detectar_inconsistencias"() TO "anon";
GRANT ALL ON FUNCTION "public"."detectar_inconsistencias"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."detectar_inconsistencias"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."encerrar_baseline_anterior"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."encerrar_baseline_anterior"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."encerrar_percentual_repasse_anterior"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."encerrar_percentual_repasse_anterior"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."especialistas_ativos"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."especialistas_ativos"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."especialistas_ativos"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."especialistas_sql_server"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."especialistas_sql_server"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."especialistas_sql_server"() TO "service_role";



GRANT ALL ON FUNCTION "public"."estatisticas_anexos_periodo"("p_data_inicio" "date", "p_data_fim" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."estatisticas_anexos_periodo"("p_data_inicio" "date", "p_data_fim" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."estatisticas_anexos_periodo"("p_data_inicio" "date", "p_data_fim" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."gerar_caminho_anexo"("nome_arquivo" "text", "empresa_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."gerar_caminho_anexo"("nome_arquivo" "text", "empresa_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."gerar_caminho_anexo"("p_empresa_id" "uuid", "p_nome_arquivo" character varying, "p_temporario" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."gerar_caminho_anexo"("p_empresa_id" "uuid", "p_nome_arquivo" character varying, "p_temporario" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."gerar_caminho_anexo"("p_empresa_id" "uuid", "p_nome_arquivo" character varying, "p_temporario" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."gerar_chave_unica_pesquisa"("p_numero_chamado" "text", "p_nome_cliente" "text", "p_nome_especialista" "text", "p_data_resposta" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."gerar_chave_unica_pesquisa"("p_numero_chamado" "text", "p_nome_cliente" "text", "p_nome_especialista" "text", "p_data_resposta" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."gerar_hash_pesquisa"("dados" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."gerar_hash_pesquisa"("dados" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_baseline_horas_vigente"("p_empresa_id" "uuid", "p_data" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_baseline_horas_vigente"("p_empresa_id" "uuid", "p_data" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_baseline_horas_vigente"("p_empresa_id" "uuid", "p_data" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_baseline_tickets_vigente"("p_empresa_id" "uuid", "p_data" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_baseline_tickets_vigente"("p_empresa_id" "uuid", "p_data" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_baseline_tickets_vigente"("p_empresa_id" "uuid", "p_data" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_baseline_vigente"("p_empresa_id" "uuid", "p_data" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_baseline_vigente"("p_empresa_id" "uuid", "p_data" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_baseline_vigente"("p_empresa_id" "uuid", "p_data" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_especialistas_stats"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_especialistas_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_especialistas_stats"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_job_statistics"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_job_statistics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_job_statistics"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_organizacao_por_produto"("p_produto" character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_organizacao_por_produto"("p_produto" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organizacao_por_produto"("p_produto" character varying) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_percentual_repasse_valor"("p_empresa_id" "uuid", "p_data" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_percentual_repasse_valor"("p_empresa_id" "uuid", "p_data" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_percentual_repasse_valor"("p_empresa_id" "uuid", "p_data" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_percentual_repasse_vigente"("p_empresa_id" "uuid", "p_data" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_percentual_repasse_vigente"("p_empresa_id" "uuid", "p_data" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_percentual_repasse_vigente"("p_empresa_id" "uuid", "p_data" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_superiores_pessoa"("p_pessoa_id" "uuid", "p_produto" character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_superiores_pessoa"("p_pessoa_id" "uuid", "p_produto" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_superiores_pessoa"("p_pessoa_id" "uuid", "p_produto" character varying) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_group"("user_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_group"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_group"("user_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_permissions"("user_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_permissions"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_permissions"("user_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_especialistas_permission"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_especialistas_permission"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_especialistas_permission"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_screen_permission"("screen_key_param" "text", "required_level" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_screen_permission"("screen_key_param" "text", "required_level" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_screen_permission"("screen_key_param" "text", "required_level" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_screen_permission"("screen_key" character varying, "permission_level" character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_screen_permission"("screen_key" character varying, "permission_level" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_screen_permission"("screen_key" character varying, "permission_level" character varying) TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_sync_write_permission"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_sync_write_permission"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_sync_write_permission"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."inativar_empresas_vencidas"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."inativar_empresas_vencidas"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."inativar_empresas_vencidas"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."iniciar_retificacao_book"("p_book_id" "uuid", "p_usuario_id" "uuid", "p_motivo" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."iniciar_retificacao_book"("p_book_id" "uuid", "p_usuario_id" "uuid", "p_motivo" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."iniciar_retificacao_book"("p_book_id" "uuid", "p_usuario_id" "uuid", "p_motivo" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_user_admin"("user_id_param" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_user_admin"("user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_admin"("user_id_param" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."limpar_anexos_expirados"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."limpar_anexos_expirados"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_all_users"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_all_users"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_all_users"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."marcar_pesquisa_encaminhada"("pesquisa_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."marcar_pesquisa_encaminhada"("pesquisa_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."marcar_pesquisa_encaminhada"("pesquisa_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."monitor_realtime_performance"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."monitor_realtime_performance"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."notificacoes_abrir"("p_tipo" "text", "p_screen_key" "text", "p_titulo" "text", "p_mensagem" "text", "p_link" "text", "p_empresa_id" "uuid", "p_chave" "text", "p_referencia" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notificacoes_abrir"("p_tipo" "text", "p_screen_key" "text", "p_titulo" "text", "p_mensagem" "text", "p_link" "text", "p_empresa_id" "uuid", "p_chave" "text", "p_referencia" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."notificacoes_nome_empresa"("p_empresa_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notificacoes_nome_empresa"("p_empresa_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."notificacoes_resolver"("p_chave" "text", "p_motivo" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notificacoes_resolver"("p_chave" "text", "p_motivo" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."notificacoes_sync_book"("p_book_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notificacoes_sync_book"("p_book_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."notificacoes_sync_geracao_books"("p_execucao_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notificacoes_sync_geracao_books"("p_execucao_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."notificacoes_sync_retroativo"("p_empresa_id" "uuid", "p_mes" integer, "p_ano" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notificacoes_sync_retroativo"("p_empresa_id" "uuid", "p_mes" integer, "p_ano" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."notificacoes_sync_saldo_parcial"("p_execucao_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notificacoes_sync_saldo_parcial"("p_execucao_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."notificar_ajuste_retroativo"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notificar_ajuste_retroativo"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."notificar_book_precisa_retificacao"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notificar_book_precisa_retificacao"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."notificar_geracao_books_execucao"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notificar_geracao_books_execucao"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."notificar_saldo_parcial_execucao"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notificar_saldo_parcial_execucao"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."obter_ultima_sincronizacao_pesquisas"("p_tipo_sincronizacao" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."obter_ultima_sincronizacao_pesquisas"("p_tipo_sincronizacao" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."obter_ultima_sincronizacao_pesquisas"("p_tipo_sincronizacao" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."preencher_data_conclusao"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."preencher_data_conclusao"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."realtime_maintenance"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."realtime_maintenance"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."registrar_envio_book"("p_book_id" "uuid", "p_usuario_id" "uuid", "p_destinatarios" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."registrar_envio_book"("p_book_id" "uuid", "p_usuario_id" "uuid", "p_destinatarios" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."registrar_envio_book"("p_book_id" "uuid", "p_usuario_id" "uuid", "p_destinatarios" "text"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."registrar_sincronizacao_pesquisas"("p_tipo_sincronizacao" "text", "p_registros_processados" integer, "p_registros_novos" integer, "p_detalhes" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."registrar_sincronizacao_pesquisas"("p_tipo_sincronizacao" "text", "p_registros_processados" integer, "p_registros_novos" integer, "p_detalhes" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."registrar_sincronizacao_pesquisas"("p_tipo_sincronizacao" "text", "p_registros_processados" integer, "p_registros_novos" integer, "p_detalhes" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."resolver_book_precisa_retificacao"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."resolver_book_precisa_retificacao"() TO "service_role";



GRANT ALL ON FUNCTION "public"."schedule_monthly_dispatch"("target_month" integer, "target_year" integer, "schedule_date" timestamp without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."schedule_monthly_dispatch"("target_month" integer, "target_year" integer, "schedule_date" timestamp without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."schedule_monthly_dispatch"("target_month" integer, "target_year" integer, "schedule_date" timestamp without time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."schedule_monthly_dispatch"("dispatch_type" "text", "target_month" integer, "target_year" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."schedule_monthly_dispatch"("dispatch_type" "text", "target_month" integer, "target_year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."schedule_monthly_dispatch"("dispatch_type" "text", "target_month" integer, "target_year" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_audit_fields"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_audit_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_agendamentos_before_write"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_agendamentos_before_write"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_agendamentos_before_write"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_anexo_status_historico"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_anexo_status_historico"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_central_escalacao_superiores"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_central_escalacao_superiores"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_last_sign_in"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_last_sign_in"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_percentual_repasse_to_empresa"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_percentual_repasse_to_empresa"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_percentual_repasse_to_empresa"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_percentual_repasse_to_empresa_on_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_percentual_repasse_to_empresa_on_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_percentual_repasse_to_empresa_on_delete"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."test_especialistas_security"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."test_especialistas_security"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."trigger_validar_limite_anexos"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."trigger_validar_limite_anexos"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_anexos_temporarios_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_anexos_temporarios_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_apontamentos_aranda_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_apontamentos_aranda_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_apontamentos_tickets_aranda_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_apontamentos_tickets_aranda_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_banco_horas_ajustes_retroativos_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_banco_horas_ajustes_retroativos_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_banco_horas_observacoes_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_banco_horas_observacoes_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_banco_horas_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_banco_horas_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_baseline_historico_timestamp"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_baseline_historico_timestamp"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_book_gen_queue_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_book_gen_queue_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_books_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_books_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_codigo_resolucao_modificacoes_aranda_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_codigo_resolucao_modificacoes_aranda_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_codigo_resolucao_modificacoes_aranda_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_de_para_categoria_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_de_para_categoria_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_email_test_data_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_email_test_data_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_empresa_anexos_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_empresa_anexos_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_especialistas_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_especialistas_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_group_permissions"("group_id" "uuid", "permissions_data" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_group_permissions"("group_id" "uuid", "permissions_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_group_permissions"("group_id" "uuid", "permissions_data" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_group_permissions"("group_uuid" "uuid", "screen_key" character varying, "permission_level" character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_group_permissions"("group_uuid" "uuid", "screen_key" character varying, "permission_level" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_group_permissions"("group_uuid" "uuid", "screen_key" character varying, "permission_level" character varying) TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_historico_inconsistencias_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_historico_inconsistencias_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_last_sign_in"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_last_sign_in"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_last_sign_in"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_percentual_repasse_historico_timestamp"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_percentual_repasse_historico_timestamp"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_pesquisa_data_resposta"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_pesquisa_data_resposta"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_pesquisa_mensal_ams_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_pesquisa_mensal_ams_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_pesquisas_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_pesquisas_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_plano_acao_contatos_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_plano_acao_contatos_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_requerimento_anexos_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_requerimento_anexos_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_sync_control_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_sync_control_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_taxas_clientes_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_taxas_clientes_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_taxas_padrao_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_taxas_padrao_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_updated_at_column"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_can_access_baseline_historico"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_can_access_baseline_historico"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_access_baseline_historico"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_can_access_percentual_repasse_historico"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_can_access_percentual_repasse_historico"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_access_percentual_repasse_historico"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_can_manage_banco_horas"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_can_manage_banco_horas"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_manage_banco_horas"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_can_manage_permissions"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_can_manage_permissions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_manage_permissions"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_has_banco_horas_permission"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_has_banco_horas_permission"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_banco_horas_permission"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_has_baseline_permission"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_has_baseline_permission"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_baseline_permission"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_has_books_permission"("required_level" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_has_books_permission"("required_level" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_books_permission"("required_level" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_has_organograma_permission"("required_level" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_has_organograma_permission"("required_level" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_organograma_permission"("required_level" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_has_permission"("user_uuid" "uuid", "screen_key" character varying, "permission_level" character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_has_permission"("user_uuid" "uuid", "screen_key" character varying, "permission_level" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_permission"("user_uuid" "uuid", "screen_key" character varying, "permission_level" character varying) TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_has_requerimentos_permission"("required_level" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_has_requerimentos_permission"("required_level" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_requerimentos_permission"("required_level" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_has_screen_permission"("required_screen" "text", "required_level" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_has_screen_permission"("required_screen" "text", "required_level" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_screen_permission"("required_screen" "text", "required_level" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_is_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_is_admin"("user_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_is_admin"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_is_admin"("user_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."validar_causa_plano_acao"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validar_causa_plano_acao"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."validar_limite_anexos_empresa"("empresa_id" "uuid", "tamanho_anexo" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validar_limite_anexos_empresa"("empresa_id" "uuid", "tamanho_anexo" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."validar_segmentacao_baseline"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validar_segmentacao_baseline"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validar_vigencias"() TO "anon";
GRANT ALL ON FUNCTION "public"."validar_vigencias"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validar_vigencias"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."validate_alocacoes_percentual"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_alocacoes_percentual"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."validate_empresa_segmentacao_nome"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_empresa_segmentacao_nome"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."validate_especialista_sql_server"("especialista_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_especialista_sql_server"("especialista_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."validate_organizacao_produto_hierarchy"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_organizacao_produto_hierarchy"() TO "service_role";



























GRANT ALL ON TABLE "public"."admin_notifications" TO "anon";
GRANT ALL ON TABLE "public"."admin_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."anexos_temporarios" TO "anon";
GRANT ALL ON TABLE "public"."anexos_temporarios" TO "authenticated";
GRANT ALL ON TABLE "public"."anexos_temporarios" TO "service_role";



GRANT ALL ON TABLE "public"."apontamentos_aranda" TO "anon";
GRANT ALL ON TABLE "public"."apontamentos_aranda" TO "authenticated";
GRANT ALL ON TABLE "public"."apontamentos_aranda" TO "service_role";



GRANT ALL ON TABLE "public"."apontamentos_tickets_aranda" TO "anon";
GRANT ALL ON TABLE "public"."apontamentos_tickets_aranda" TO "authenticated";
GRANT ALL ON TABLE "public"."apontamentos_tickets_aranda" TO "service_role";



GRANT ALL ON TABLE "public"."banco_horas_ajustes_retroativos" TO "anon";
GRANT ALL ON TABLE "public"."banco_horas_ajustes_retroativos" TO "authenticated";
GRANT ALL ON TABLE "public"."banco_horas_ajustes_retroativos" TO "service_role";



GRANT ALL ON TABLE "public"."banco_horas_alocacoes" TO "anon";
GRANT ALL ON TABLE "public"."banco_horas_alocacoes" TO "authenticated";
GRANT ALL ON TABLE "public"."banco_horas_alocacoes" TO "service_role";



GRANT ALL ON TABLE "public"."banco_horas_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."banco_horas_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."banco_horas_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."banco_horas_calculos" TO "anon";
GRANT ALL ON TABLE "public"."banco_horas_calculos" TO "authenticated";
GRANT ALL ON TABLE "public"."banco_horas_calculos" TO "service_role";



GRANT ALL ON TABLE "public"."banco_horas_calculos_segmentados" TO "anon";
GRANT ALL ON TABLE "public"."banco_horas_calculos_segmentados" TO "authenticated";
GRANT ALL ON TABLE "public"."banco_horas_calculos_segmentados" TO "service_role";



GRANT ALL ON TABLE "public"."banco_horas_envio_agendamento_empresas" TO "anon";
GRANT ALL ON TABLE "public"."banco_horas_envio_agendamento_empresas" TO "authenticated";
GRANT ALL ON TABLE "public"."banco_horas_envio_agendamento_empresas" TO "service_role";



GRANT ALL ON TABLE "public"."banco_horas_envio_agendamentos" TO "anon";
GRANT ALL ON TABLE "public"."banco_horas_envio_agendamentos" TO "authenticated";
GRANT ALL ON TABLE "public"."banco_horas_envio_agendamentos" TO "service_role";



GRANT ALL ON TABLE "public"."banco_horas_envio_execucoes" TO "anon";
GRANT ALL ON TABLE "public"."banco_horas_envio_execucoes" TO "authenticated";
GRANT ALL ON TABLE "public"."banco_horas_envio_execucoes" TO "service_role";



GRANT ALL ON TABLE "public"."banco_horas_fechamentos" TO "anon";
GRANT ALL ON TABLE "public"."banco_horas_fechamentos" TO "authenticated";
GRANT ALL ON TABLE "public"."banco_horas_fechamentos" TO "service_role";



GRANT ALL ON TABLE "public"."banco_horas_observacoes" TO "anon";
GRANT ALL ON TABLE "public"."banco_horas_observacoes" TO "authenticated";
GRANT ALL ON TABLE "public"."banco_horas_observacoes" TO "service_role";



GRANT ALL ON TABLE "public"."banco_horas_reajustes" TO "anon";
GRANT ALL ON TABLE "public"."banco_horas_reajustes" TO "authenticated";
GRANT ALL ON TABLE "public"."banco_horas_reajustes" TO "service_role";



GRANT ALL ON TABLE "public"."banco_horas_versoes" TO "anon";
GRANT ALL ON TABLE "public"."banco_horas_versoes" TO "authenticated";
GRANT ALL ON TABLE "public"."banco_horas_versoes" TO "service_role";



GRANT ALL ON TABLE "public"."baseline_historico" TO "anon";
GRANT ALL ON TABLE "public"."baseline_historico" TO "authenticated";
GRANT ALL ON TABLE "public"."baseline_historico" TO "service_role";



GRANT ALL ON TABLE "public"."book_generation_queue" TO "anon";
GRANT ALL ON TABLE "public"."book_generation_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."book_generation_queue" TO "service_role";



GRANT ALL ON TABLE "public"."book_generation_batch_summary" TO "anon";
GRANT ALL ON TABLE "public"."book_generation_batch_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."book_generation_batch_summary" TO "service_role";



GRANT ALL ON TABLE "public"."books" TO "anon";
GRANT ALL ON TABLE "public"."books" TO "authenticated";
GRANT ALL ON TABLE "public"."books" TO "service_role";



GRANT ALL ON TABLE "public"."empresas_clientes" TO "anon";
GRANT ALL ON TABLE "public"."empresas_clientes" TO "authenticated";
GRANT ALL ON TABLE "public"."empresas_clientes" TO "service_role";



GRANT ALL ON TABLE "public"."books_com_empresa" TO "anon";
GRANT ALL ON TABLE "public"."books_com_empresa" TO "authenticated";
GRANT ALL ON TABLE "public"."books_com_empresa" TO "service_role";



GRANT ALL ON TABLE "public"."books_historico_geracao" TO "anon";
GRANT ALL ON TABLE "public"."books_historico_geracao" TO "authenticated";
GRANT ALL ON TABLE "public"."books_historico_geracao" TO "service_role";



GRANT ALL ON TABLE "public"."books_versoes" TO "anon";
GRANT ALL ON TABLE "public"."books_versoes" TO "authenticated";
GRANT ALL ON TABLE "public"."books_versoes" TO "service_role";



GRANT ALL ON TABLE "public"."clientes" TO "anon";
GRANT ALL ON TABLE "public"."clientes" TO "authenticated";
GRANT ALL ON TABLE "public"."clientes" TO "service_role";



GRANT ALL ON TABLE "public"."codigo_resolucao_modificacoes_aranda" TO "anon";
GRANT ALL ON TABLE "public"."codigo_resolucao_modificacoes_aranda" TO "authenticated";
GRANT ALL ON TABLE "public"."codigo_resolucao_modificacoes_aranda" TO "service_role";



GRANT ALL ON TABLE "public"."controle_mensal" TO "anon";
GRANT ALL ON TABLE "public"."controle_mensal" TO "authenticated";
GRANT ALL ON TABLE "public"."controle_mensal" TO "service_role";



GRANT ALL ON TABLE "public"."de_para_categoria" TO "anon";
GRANT ALL ON TABLE "public"."de_para_categoria" TO "authenticated";
GRANT ALL ON TABLE "public"."de_para_categoria" TO "service_role";



GRANT ALL ON TABLE "public"."elogio_especialistas" TO "anon";
GRANT ALL ON TABLE "public"."elogio_especialistas" TO "authenticated";
GRANT ALL ON TABLE "public"."elogio_especialistas" TO "service_role";



GRANT ALL ON TABLE "public"."elogios" TO "anon";
GRANT ALL ON TABLE "public"."elogios" TO "authenticated";
GRANT ALL ON TABLE "public"."elogios" TO "service_role";



GRANT ALL ON TABLE "public"."elogios_historico" TO "anon";
GRANT ALL ON TABLE "public"."elogios_historico" TO "authenticated";
GRANT ALL ON TABLE "public"."elogios_historico" TO "service_role";



GRANT ALL ON TABLE "public"."email_logs" TO "anon";
GRANT ALL ON TABLE "public"."email_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."email_logs" TO "service_role";



GRANT ALL ON TABLE "public"."email_templates" TO "anon";
GRANT ALL ON TABLE "public"."email_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."email_templates" TO "service_role";



GRANT ALL ON TABLE "public"."email_test_data" TO "anon";
GRANT ALL ON TABLE "public"."email_test_data" TO "authenticated";
GRANT ALL ON TABLE "public"."email_test_data" TO "service_role";



GRANT ALL ON TABLE "public"."empresa_anexos" TO "anon";
GRANT ALL ON TABLE "public"."empresa_anexos" TO "authenticated";
GRANT ALL ON TABLE "public"."empresa_anexos" TO "service_role";



GRANT ALL ON TABLE "public"."empresa_grupos" TO "anon";
GRANT ALL ON TABLE "public"."empresa_grupos" TO "authenticated";
GRANT ALL ON TABLE "public"."empresa_grupos" TO "service_role";



GRANT ALL ON TABLE "public"."empresa_produtos" TO "anon";
GRANT ALL ON TABLE "public"."empresa_produtos" TO "authenticated";
GRANT ALL ON TABLE "public"."empresa_produtos" TO "service_role";



GRANT ALL ON TABLE "public"."especialistas" TO "anon";
GRANT ALL ON TABLE "public"."especialistas" TO "authenticated";
GRANT ALL ON TABLE "public"."especialistas" TO "service_role";



GRANT ALL ON TABLE "public"."grupo_emails" TO "anon";
GRANT ALL ON TABLE "public"."grupo_emails" TO "authenticated";
GRANT ALL ON TABLE "public"."grupo_emails" TO "service_role";



GRANT ALL ON TABLE "public"."grupos_responsaveis" TO "anon";
GRANT ALL ON TABLE "public"."grupos_responsaveis" TO "authenticated";
GRANT ALL ON TABLE "public"."grupos_responsaveis" TO "service_role";



GRANT ALL ON TABLE "public"."historico_disparos" TO "anon";
GRANT ALL ON TABLE "public"."historico_disparos" TO "authenticated";
GRANT ALL ON TABLE "public"."historico_disparos" TO "service_role";



GRANT ALL ON TABLE "public"."historico_inconsistencias_chamados" TO "anon";
GRANT ALL ON TABLE "public"."historico_inconsistencias_chamados" TO "authenticated";
GRANT ALL ON TABLE "public"."historico_inconsistencias_chamados" TO "service_role";



GRANT ALL ON TABLE "public"."inconsistencias_chamados" TO "anon";
GRANT ALL ON TABLE "public"."inconsistencias_chamados" TO "authenticated";
GRANT ALL ON TABLE "public"."inconsistencias_chamados" TO "service_role";



GRANT ALL ON TABLE "public"."job_configurations" TO "anon";
GRANT ALL ON TABLE "public"."job_configurations" TO "authenticated";
GRANT ALL ON TABLE "public"."job_configurations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."job_configurations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."job_configurations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."job_configurations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."jobs_queue" TO "anon";
GRANT ALL ON TABLE "public"."jobs_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs_queue" TO "service_role";



GRANT ALL ON TABLE "public"."logs_sistema" TO "anon";
GRANT ALL ON TABLE "public"."logs_sistema" TO "authenticated";
GRANT ALL ON TABLE "public"."logs_sistema" TO "service_role";



GRANT ALL ON TABLE "public"."notificacoes" TO "anon";
GRANT ALL ON TABLE "public"."notificacoes" TO "authenticated";
GRANT ALL ON TABLE "public"."notificacoes" TO "service_role";



GRANT ALL ON TABLE "public"."notificacoes_leituras" TO "anon";
GRANT ALL ON TABLE "public"."notificacoes_leituras" TO "authenticated";
GRANT ALL ON TABLE "public"."notificacoes_leituras" TO "service_role";



GRANT ALL ON TABLE "public"."organizacao_estrutura" TO "anon";
GRANT ALL ON TABLE "public"."organizacao_estrutura" TO "authenticated";
GRANT ALL ON TABLE "public"."organizacao_estrutura" TO "service_role";



GRANT ALL ON TABLE "public"."organizacao_multiplos_superiores" TO "anon";
GRANT ALL ON TABLE "public"."organizacao_multiplos_superiores" TO "authenticated";
GRANT ALL ON TABLE "public"."organizacao_multiplos_superiores" TO "service_role";



GRANT ALL ON TABLE "public"."organizacao_produto" TO "anon";
GRANT ALL ON TABLE "public"."organizacao_produto" TO "authenticated";
GRANT ALL ON TABLE "public"."organizacao_produto" TO "service_role";



GRANT ALL ON TABLE "public"."percentual_repasse_historico" TO "anon";
GRANT ALL ON TABLE "public"."percentual_repasse_historico" TO "authenticated";
GRANT ALL ON TABLE "public"."percentual_repasse_historico" TO "service_role";



GRANT ALL ON TABLE "public"."permission_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."permission_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."permission_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."pesquisa_especialistas" TO "anon";
GRANT ALL ON TABLE "public"."pesquisa_especialistas" TO "authenticated";
GRANT ALL ON TABLE "public"."pesquisa_especialistas" TO "service_role";



GRANT ALL ON TABLE "public"."pesquisa_mensal_ams" TO "anon";
GRANT ALL ON TABLE "public"."pesquisa_mensal_ams" TO "authenticated";
GRANT ALL ON TABLE "public"."pesquisa_mensal_ams" TO "service_role";



GRANT ALL ON TABLE "public"."pesquisas_satisfacao" TO "anon";
GRANT ALL ON TABLE "public"."pesquisas_satisfacao" TO "authenticated";
GRANT ALL ON TABLE "public"."pesquisas_satisfacao" TO "service_role";



GRANT ALL ON TABLE "public"."plano_acao_contatos" TO "anon";
GRANT ALL ON TABLE "public"."plano_acao_contatos" TO "authenticated";
GRANT ALL ON TABLE "public"."plano_acao_contatos" TO "service_role";



GRANT ALL ON TABLE "public"."plano_acao_historico" TO "anon";
GRANT ALL ON TABLE "public"."plano_acao_historico" TO "authenticated";
GRANT ALL ON TABLE "public"."plano_acao_historico" TO "service_role";



GRANT ALL ON TABLE "public"."planos_acao" TO "anon";
GRANT ALL ON TABLE "public"."planos_acao" TO "authenticated";
GRANT ALL ON TABLE "public"."planos_acao" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."requerimento_anexos" TO "anon";
GRANT ALL ON TABLE "public"."requerimento_anexos" TO "authenticated";
GRANT ALL ON TABLE "public"."requerimento_anexos" TO "service_role";



GRANT ALL ON TABLE "public"."requerimentos" TO "anon";
GRANT ALL ON TABLE "public"."requerimentos" TO "authenticated";
GRANT ALL ON TABLE "public"."requerimentos" TO "service_role";



GRANT ALL ON TABLE "public"."screen_permissions" TO "anon";
GRANT ALL ON TABLE "public"."screen_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."screen_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."screens" TO "anon";
GRANT ALL ON TABLE "public"."screens" TO "authenticated";
GRANT ALL ON TABLE "public"."screens" TO "service_role";



GRANT ALL ON TABLE "public"."sync_agendamentos" TO "anon";
GRANT ALL ON TABLE "public"."sync_agendamentos" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_agendamentos" TO "service_role";



GRANT ALL ON TABLE "public"."sync_control" TO "anon";
GRANT ALL ON TABLE "public"."sync_control" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_control" TO "service_role";



GRANT ALL ON TABLE "public"."sync_control_pesquisas" TO "anon";
GRANT ALL ON TABLE "public"."sync_control_pesquisas" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_control_pesquisas" TO "service_role";



GRANT ALL ON TABLE "public"."sync_execucoes" TO "anon";
GRANT ALL ON TABLE "public"."sync_execucoes" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_execucoes" TO "service_role";



GRANT ALL ON TABLE "public"."sync_metadata" TO "anon";
GRANT ALL ON TABLE "public"."sync_metadata" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_metadata" TO "service_role";



GRANT ALL ON TABLE "public"."taxas_clientes" TO "anon";
GRANT ALL ON TABLE "public"."taxas_clientes" TO "authenticated";
GRANT ALL ON TABLE "public"."taxas_clientes" TO "service_role";



GRANT ALL ON TABLE "public"."taxas_padrao" TO "anon";
GRANT ALL ON TABLE "public"."taxas_padrao" TO "authenticated";
GRANT ALL ON TABLE "public"."taxas_padrao" TO "service_role";



GRANT ALL ON TABLE "public"."user_group_assignments" TO "anon";
GRANT ALL ON TABLE "public"."user_group_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."user_group_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."user_groups" TO "anon";
GRANT ALL ON TABLE "public"."user_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."user_groups" TO "service_role";



GRANT ALL ON TABLE "public"."valores_taxas_funcoes" TO "anon";
GRANT ALL ON TABLE "public"."valores_taxas_funcoes" TO "authenticated";
GRANT ALL ON TABLE "public"."valores_taxas_funcoes" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_config" TO "anon";
GRANT ALL ON TABLE "public"."webhook_config" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_config" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































