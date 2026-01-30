-- =====================================================
-- CORREÇÃO VIA ALTER FUNCTION
-- Este script usa ALTER em vez de DROP/CREATE
-- Mais seguro e preserva dependências
-- =====================================================

-- IMPORTANTE: Execute este script no Supabase SQL Editor

-- 1. Alterar função: gerar_hash_pesquisa
DO $$
BEGIN
  -- Tentar alterar a função existente
  ALTER FUNCTION public.gerar_hash_pesquisa(jsonb) SET search_path = public;
  RAISE NOTICE '✅ gerar_hash_pesquisa: search_path definido';
EXCEPTION
  WHEN undefined_function THEN
    -- Se não existir, criar
    CREATE FUNCTION public.gerar_hash_pesquisa(dados jsonb)
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    STABLE
    AS $func$
    BEGIN
      RETURN md5(dados::text);
    END;
    $func$;
    RAISE NOTICE '✅ gerar_hash_pesquisa: função criada';
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ gerar_hash_pesquisa: erro - %', SQLERRM;
END $$;

-- 2. Alterar função: gerar_chave_unica_pesquisa
DO $$
BEGIN
  ALTER FUNCTION public.gerar_chave_unica_pesquisa(text, text, text, text) SET search_path = public;
  RAISE NOTICE '✅ gerar_chave_unica_pesquisa: search_path definido';
EXCEPTION
  WHEN undefined_function THEN
    CREATE FUNCTION public.gerar_chave_unica_pesquisa(
      p_numero_chamado text,
      p_nome_cliente text,
      p_nome_especialista text,
      p_data_resposta text
    )
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    IMMUTABLE
    AS $func$
    BEGIN
      RETURN md5(
        COALESCE(p_numero_chamado, '') || '|' ||
        COALESCE(p_nome_cliente, '') || '|' ||
        COALESCE(p_nome_especialista, '') || '|' ||
        COALESCE(p_data_resposta, '')
      );
    END;
    $func$;
    RAISE NOTICE '✅ gerar_chave_unica_pesquisa: função criada';
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ gerar_chave_unica_pesquisa: erro - %', SQLERRM;
END $$;

-- 3. Alterar função: atualizar_hash_pesquisa
DO $$
BEGIN
  ALTER FUNCTION public.atualizar_hash_pesquisa() SET search_path = public;
  RAISE NOTICE '✅ atualizar_hash_pesquisa: search_path definido';
EXCEPTION
  WHEN undefined_function THEN
    CREATE FUNCTION public.atualizar_hash_pesquisa()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    BEGIN
      NEW.hash_dados := public.gerar_hash_pesquisa(
        jsonb_build_object(
          'numero_chamado', NEW.numero_chamado,
          'nome_cliente', NEW.nome_cliente,
          'nome_especialista', NEW.nome_especialista,
          'data_resposta', NEW.data_resposta
        )
      );
      NEW.chave_unica := public.gerar_chave_unica_pesquisa(
        NEW.numero_chamado,
        NEW.nome_cliente,
        NEW.nome_especialista,
        NEW.data_resposta
      );
      RETURN NEW;
    END;
    $func$;
    RAISE NOTICE '✅ atualizar_hash_pesquisa: função criada';
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ atualizar_hash_pesquisa: erro - %', SQLERRM;
END $$;

-- 4. Alterar função: registrar_sincronizacao_pesquisas
DO $$
BEGIN
  ALTER FUNCTION public.registrar_sincronizacao_pesquisas(text, integer, integer, jsonb) SET search_path = public;
  RAISE NOTICE '✅ registrar_sincronizacao_pesquisas: search_path definido';
EXCEPTION
  WHEN undefined_function THEN
    CREATE FUNCTION public.registrar_sincronizacao_pesquisas(
      p_tipo_sincronizacao text,
      p_registros_processados integer DEFAULT 0,
      p_registros_novos integer DEFAULT 0,
      p_detalhes jsonb DEFAULT NULL
    )
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    BEGIN
      INSERT INTO public.sync_control_pesquisas (
        tipo_sincronizacao,
        ultima_sincronizacao,
        registros_processados,
        registros_novos,
        detalhes
      ) VALUES (
        p_tipo_sincronizacao,
        NOW(),
        p_registros_processados,
        p_registros_novos,
        p_detalhes
      )
      ON CONFLICT (tipo_sincronizacao) 
      DO UPDATE SET
        ultima_sincronizacao = NOW(),
        registros_processados = EXCLUDED.registros_processados,
        registros_novos = EXCLUDED.registros_novos,
        detalhes = EXCLUDED.detalhes;
    END;
    $func$;
    RAISE NOTICE '✅ registrar_sincronizacao_pesquisas: função criada';
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ registrar_sincronizacao_pesquisas: erro - %', SQLERRM;
END $$;

-- 5. Alterar função: obter_ultima_sincronizacao_pesquisas
DO $$
BEGIN
  ALTER FUNCTION public.obter_ultima_sincronizacao_pesquisas(text) SET search_path = public;
  RAISE NOTICE '✅ obter_ultima_sincronizacao_pesquisas: search_path definido';
EXCEPTION
  WHEN undefined_function THEN
    CREATE FUNCTION public.obter_ultima_sincronizacao_pesquisas(
      p_tipo_sincronizacao text
    )
    RETURNS timestamp with time zone
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    STABLE
    AS $func$
    DECLARE
      v_ultima_sincronizacao timestamp with time zone;
    BEGIN
      SELECT ultima_sincronizacao
      INTO v_ultima_sincronizacao
      FROM public.sync_control_pesquisas
      WHERE tipo_sincronizacao = p_tipo_sincronizacao;
      
      RETURN COALESCE(v_ultima_sincronizacao, '1970-01-01'::timestamp with time zone);
    END;
    $func$;
    RAISE NOTICE '✅ obter_ultima_sincronizacao_pesquisas: função criada';
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ obter_ultima_sincronizacao_pesquisas: erro - %', SQLERRM;
END $$;

-- 6. VALIDAÇÃO FINAL
DO $$
DECLARE
  v_function record;
  v_total integer := 0;
  v_secure integer := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '📊 VALIDAÇÃO FINAL';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
  FOR v_function IN
    SELECT 
      p.proname,
      CASE 
        WHEN 'search_path=public' = ANY(p.proconfig) 
        THEN true
        ELSE false
      END as is_secure
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'gerar_hash_pesquisa',
        'gerar_chave_unica_pesquisa',
        'atualizar_hash_pesquisa',
        'registrar_sincronizacao_pesquisas',
        'obter_ultima_sincronizacao_pesquisas'
      )
  LOOP
    v_total := v_total + 1;
    IF v_function.is_secure THEN
      v_secure := v_secure + 1;
      RAISE NOTICE '✅ % - SEGURA', v_function.proname;
    ELSE
      RAISE NOTICE '❌ % - AINDA VULNERÁVEL', v_function.proname;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  IF v_secure = v_total AND v_total = 5 THEN
    RAISE NOTICE '🎉 SUCESSO! Todas as % funções estão seguras!', v_total;
  ELSIF v_total < 5 THEN
    RAISE NOTICE '⚠️ Apenas % de 5 funções encontradas', v_total;
  ELSE
    RAISE NOTICE '❌ Apenas % de % funções estão seguras', v_secure, v_total;
    RAISE NOTICE '   Execute o script novamente ou use DROP CASCADE';
  END IF;
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;
