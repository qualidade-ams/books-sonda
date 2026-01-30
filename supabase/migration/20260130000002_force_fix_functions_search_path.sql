-- =====================================================
-- Migration: FORCE FIX - Functions search_path
-- Data: 2026-01-30
-- Descrição: Correção forçada de search_path em funções
--            Usa DROP CASCADE para garantir recriação
-- =====================================================

-- IMPORTANTE: Esta migration usa DROP CASCADE para garantir
-- que as funções sejam completamente recriadas com search_path fixo

-- 1. REMOVER FUNÇÕES ANTIGAS (CASCADE)
-- =====================================================
DROP FUNCTION IF EXISTS public.gerar_hash_pesquisa(jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.gerar_chave_unica_pesquisa(text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.atualizar_hash_pesquisa() CASCADE;
DROP FUNCTION IF EXISTS public.registrar_sincronizacao_pesquisas(text, integer, integer, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.obter_ultima_sincronizacao_pesquisas(text) CASCADE;

-- 2. RECRIAR FUNÇÃO: gerar_hash_pesquisa
-- =====================================================
CREATE FUNCTION public.gerar_hash_pesquisa(dados jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN md5(dados::text);
END;
$$;

ALTER FUNCTION public.gerar_hash_pesquisa(jsonb) OWNER TO postgres;

COMMENT ON FUNCTION public.gerar_hash_pesquisa(jsonb) IS 
'Gera hash MD5 dos dados da pesquisa para detecção de duplicatas. SECURITY DEFINER com search_path fixo.';

-- 3. RECRIAR FUNÇÃO: gerar_chave_unica_pesquisa
-- =====================================================
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
AS $$
BEGIN
  RETURN md5(
    COALESCE(p_numero_chamado, '') || '|' ||
    COALESCE(p_nome_cliente, '') || '|' ||
    COALESCE(p_nome_especialista, '') || '|' ||
    COALESCE(p_data_resposta, '')
  );
END;
$$;

ALTER FUNCTION public.gerar_chave_unica_pesquisa(text, text, text, text) OWNER TO postgres;

COMMENT ON FUNCTION public.gerar_chave_unica_pesquisa(text, text, text, text) IS 
'Gera chave única para pesquisa baseada em campos principais. SECURITY DEFINER com search_path fixo.';

-- 4. RECRIAR FUNÇÃO: atualizar_hash_pesquisa
-- =====================================================
CREATE FUNCTION public.atualizar_hash_pesquisa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualiza hash automaticamente
  NEW.hash_dados := public.gerar_hash_pesquisa(
    jsonb_build_object(
      'numero_chamado', NEW.numero_chamado,
      'nome_cliente', NEW.nome_cliente,
      'nome_especialista', NEW.nome_especialista,
      'data_resposta', NEW.data_resposta
    )
  );
  
  -- Atualiza chave única
  NEW.chave_unica := public.gerar_chave_unica_pesquisa(
    NEW.numero_chamado,
    NEW.nome_cliente,
    NEW.nome_especialista,
    NEW.data_resposta
  );
  
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.atualizar_hash_pesquisa() OWNER TO postgres;

COMMENT ON FUNCTION public.atualizar_hash_pesquisa() IS 
'Trigger para atualizar hash e chave única automaticamente. SECURITY DEFINER com search_path fixo.';

-- 5. RECRIAR FUNÇÃO: registrar_sincronizacao_pesquisas
-- =====================================================
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
AS $$
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
$$;

ALTER FUNCTION public.registrar_sincronizacao_pesquisas(text, integer, integer, jsonb) OWNER TO postgres;

COMMENT ON FUNCTION public.registrar_sincronizacao_pesquisas(text, integer, integer, jsonb) IS 
'Registra informações de sincronização de pesquisas. SECURITY DEFINER com search_path fixo.';

-- 6. RECRIAR FUNÇÃO: obter_ultima_sincronizacao_pesquisas
-- =====================================================
CREATE FUNCTION public.obter_ultima_sincronizacao_pesquisas(
  p_tipo_sincronizacao text
)
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_ultima_sincronizacao timestamp with time zone;
BEGIN
  SELECT ultima_sincronizacao
  INTO v_ultima_sincronizacao
  FROM public.sync_control_pesquisas
  WHERE tipo_sincronizacao = p_tipo_sincronizacao;
  
  RETURN COALESCE(v_ultima_sincronizacao, '1970-01-01'::timestamp with time zone);
END;
$$;

ALTER FUNCTION public.obter_ultima_sincronizacao_pesquisas(text) OWNER TO postgres;

COMMENT ON FUNCTION public.obter_ultima_sincronizacao_pesquisas(text) IS 
'Retorna timestamp da última sincronização. SECURITY DEFINER com search_path fixo.';

-- 7. RECRIAR TRIGGER (se a tabela existir)
-- =====================================================
DO $$
BEGIN
  -- Verificar se a tabela pesquisas_satisfacao existe
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'pesquisas_satisfacao'
  ) THEN
    -- Remover trigger antigo
    DROP TRIGGER IF EXISTS trigger_atualizar_hash_pesquisa ON public.pesquisas_satisfacao;
    
    -- Criar novo trigger
    CREATE TRIGGER trigger_atualizar_hash_pesquisa
      BEFORE INSERT OR UPDATE ON public.pesquisas_satisfacao
      FOR EACH ROW
      EXECUTE FUNCTION public.atualizar_hash_pesquisa();
      
    RAISE NOTICE '✅ Trigger recriado em pesquisas_satisfacao';
  ELSE
    RAISE NOTICE '⚠️ Tabela pesquisas_satisfacao não existe';
  END IF;
END $$;

-- 8. VALIDAÇÃO FINAL COM DETALHES
-- =====================================================
DO $$
DECLARE
  v_function record;
  v_total_functions integer := 0;
  v_secure_functions integer := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 VALIDAÇÃO DE FUNÇÕES';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
  FOR v_function IN
    SELECT 
      p.proname as function_name,
      p.prosecdef as is_security_definer,
      p.proconfig as config_settings,
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
    ORDER BY p.proname
  LOOP
    v_total_functions := v_total_functions + 1;
    
    IF v_function.is_secure THEN
      v_secure_functions := v_secure_functions + 1;
      RAISE NOTICE '✅ % - SEGURA (search_path fixo)', v_function.function_name;
    ELSE
      RAISE NOTICE '❌ % - VULNERÁVEL (search_path mutável)', v_function.function_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 RESUMO:';
  RAISE NOTICE '   Total de funções: %', v_total_functions;
  RAISE NOTICE '   Funções seguras: %', v_secure_functions;
  RAISE NOTICE '   Funções vulneráveis: %', v_total_functions - v_secure_functions;
  
  IF v_secure_functions = v_total_functions AND v_total_functions = 5 THEN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 SUCESSO! Todas as 5 funções estão seguras!';
  ELSIF v_total_functions < 5 THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ ATENÇÃO: Apenas % de 5 funções foram encontradas', v_total_functions;
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '❌ ERRO: Ainda há funções vulneráveis!';
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- 9. GRANT PERMISSIONS (se necessário)
-- =====================================================
GRANT EXECUTE ON FUNCTION public.gerar_hash_pesquisa(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gerar_chave_unica_pesquisa(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_sincronizacao_pesquisas(text, integer, integer, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.obter_ultima_sincronizacao_pesquisas(text) TO authenticated;

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
