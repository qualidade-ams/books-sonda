-- =====================================================
-- REMOVER DUPLICATAS - EXECUÇÃO IMEDIATA
-- Este script remove TODAS as versões e recria apenas as seguras
-- =====================================================

-- PASSO 1: Remover TODAS as versões (seguras e vulneráveis)
DROP FUNCTION IF EXISTS public.gerar_hash_pesquisa CASCADE;
DROP FUNCTION IF EXISTS public.gerar_chave_unica_pesquisa CASCADE;
DROP FUNCTION IF EXISTS public.atualizar_hash_pesquisa CASCADE;
DROP FUNCTION IF EXISTS public.registrar_sincronizacao_pesquisas CASCADE;
DROP FUNCTION IF EXISTS public.obter_ultima_sincronizacao_pesquisas CASCADE;

-- PASSO 2: Recriar APENAS as versões seguras

-- Função 1: gerar_hash_pesquisa
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

-- Função 2: gerar_chave_unica_pesquisa
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

-- Função 3: atualizar_hash_pesquisa
CREATE FUNCTION public.atualizar_hash_pesquisa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Função 4: registrar_sincronizacao_pesquisas
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

-- Função 5: obter_ultima_sincronizacao_pesquisas
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

-- PASSO 3: Recriar trigger (se a tabela existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'pesquisas_satisfacao'
  ) THEN
    DROP TRIGGER IF EXISTS trigger_atualizar_hash_pesquisa ON public.pesquisas_satisfacao;
    
    CREATE TRIGGER trigger_atualizar_hash_pesquisa
      BEFORE INSERT OR UPDATE ON public.pesquisas_satisfacao
      FOR EACH ROW
      EXECUTE FUNCTION public.atualizar_hash_pesquisa();
  END IF;
END $$;

-- PASSO 4: Validação final
SELECT 
  '✅ VALIDAÇÃO FINAL' as titulo,
  p.proname as "Função",
  pg_get_function_identity_arguments(p.oid) as "Argumentos",
  CASE 
    WHEN 'search_path=public' = ANY(p.proconfig) 
    THEN '✅ SEGURA'
    ELSE '❌ VULNERÁVEL'
  END as "Status"
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
ORDER BY p.proname;

-- Resumo
SELECT 
  '📊 RESUMO' as titulo,
  COUNT(*) as "Total de Funções",
  COUNT(*) FILTER (WHERE 'search_path=public' = ANY(proconfig)) as "Funções Seguras",
  COUNT(*) FILTER (WHERE proconfig IS NULL OR NOT ('search_path=public' = ANY(proconfig))) as "Funções Vulneráveis",
  CASE 
    WHEN COUNT(*) FILTER (WHERE proconfig IS NULL OR NOT ('search_path=public' = ANY(proconfig))) = 0
    THEN '🎉 TODAS SEGURAS!'
    ELSE '⚠️ AINDA HÁ VULNERABILIDADES'
  END as "Status Geral"
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'gerar_hash_pesquisa',
    'gerar_chave_unica_pesquisa',
    'atualizar_hash_pesquisa',
    'registrar_sincronizacao_pesquisas',
    'obter_ultima_sincronizacao_pesquisas'
  );
