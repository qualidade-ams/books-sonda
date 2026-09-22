-- ============================================
-- Migration: Restaurar os triggers de auditoria
-- Data: 22/09/2026
-- Descrição: Em 90 dias a permission_audit_logs só recebeu registros de
--            'historico_disparos'/INSERT (480), que vêm do frontend
--            (booksDisparoService). Nenhuma das 10 tabelas auditadas gerou log
--            via trigger — nem UPDATE de historico_disparos, nem requerimentos,
--            empresas_clientes ou clientes, todas em uso diário. Ou seja: os
--            triggers de auditoria estão ausentes ou desabilitados.
--
--            Histórico relevante: os triggers de 'profiles' já foram desligados
--            uma vez (EXECUTAR_ESTE_SQL_UNICO.sql) porque uma falha na gravação
--            do log abortava a criação de usuário. Por isso a função agora
--            envolve o INSERT em um bloco de exceção: falha de auditoria vira
--            WARNING e NUNCA derruba a operação de negócio.
--
--            Não mexe em nenhuma política RLS.
-- ============================================

-- 1. Recriar a função com search_path fixo e à prova de falha
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  registro_id UUID;
BEGIN
  BEGIN
    current_user_id := (SELECT auth.uid());
  EXCEPTION WHEN OTHERS THEN
    current_user_id := NULL;
  END;

  BEGIN
    IF (TG_OP = 'DELETE') THEN
      registro_id := (to_jsonb(OLD) ->> 'id')::UUID;
      INSERT INTO public.permission_audit_logs
        (table_name, record_id, action, old_values, changed_by)
      VALUES
        (TG_TABLE_NAME, registro_id, 'DELETE', to_jsonb(OLD), current_user_id);
    ELSIF (TG_OP = 'UPDATE') THEN
      registro_id := (to_jsonb(NEW) ->> 'id')::UUID;
      INSERT INTO public.permission_audit_logs
        (table_name, record_id, action, old_values, new_values, changed_by)
      VALUES
        (TG_TABLE_NAME, registro_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), current_user_id);
    ELSIF (TG_OP = 'INSERT') THEN
      registro_id := (to_jsonb(NEW) ->> 'id')::UUID;
      INSERT INTO public.permission_audit_logs
        (table_name, record_id, action, new_values, changed_by)
      VALUES
        (TG_TABLE_NAME, registro_id, 'INSERT', to_jsonb(NEW), current_user_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Auditoria nunca pode abortar a operação de negócio (ver histórico acima)
    RAISE WARNING 'Falha ao gravar log de auditoria de %.% : %', TG_TABLE_NAME, TG_OP, SQLERRM;
  END;

  RETURN NULL;
END;
$$;

-- 2. (Re)criar os triggers nas tabelas auditadas
DO $$
DECLARE
  tabela TEXT;
  tabelas TEXT[] := ARRAY[
    'user_groups',
    'screen_permissions',
    'user_group_assignments',
    'profiles',
    'empresas_clientes',
    'clientes',
    'grupos_responsaveis',
    'email_templates',
    'historico_disparos',
    'requerimentos'
  ];
BEGIN
  FOREACH tabela IN ARRAY tabelas LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tabela
    ) THEN
      RAISE WARNING 'Tabela % não existe, trigger ignorado', tabela;
      CONTINUE;
    END IF;

    EXECUTE format('DROP TRIGGER IF EXISTS audit_%s_trigger ON public.%I', tabela, tabela);
    EXECUTE format(
      'CREATE TRIGGER audit_%s_trigger
         AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function()',
      tabela, tabela
    );
    RAISE NOTICE 'Trigger de auditoria criado em %', tabela;
  END LOOP;
END $$;

-- 3. Verificação: todos os triggers precisam existir e estar habilitados ('O')
DO $$
DECLARE
  ativos INTEGER;
  desabilitados INTEGER;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE t.tgenabled = 'O'),
    COUNT(*) FILTER (WHERE t.tgenabled <> 'O')
  INTO ativos, desabilitados
  FROM pg_trigger t
  JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE p.proname = 'audit_trigger_function';

  RAISE NOTICE 'Triggers de auditoria ativos: % | desabilitados: %', ativos, desabilitados;

  IF desabilitados > 0 THEN
    RAISE EXCEPTION 'Há % trigger(s) de auditoria desabilitado(s)', desabilitados;
  END IF;

  IF ativos = 0 THEN
    RAISE EXCEPTION 'Nenhum trigger de auditoria foi criado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'audit_trigger_function'
      AND 'search_path=public' = ANY(proconfig)
  ) THEN
    RAISE EXCEPTION 'audit_trigger_function está sem SET search_path = public';
  END IF;
END $$;
