-- =====================================================
-- Migration: Fix Security Issues - sync_control_pesquisas
-- Data: 2026-01-30
-- Descrição: Corrige vulnerabilidades de segurança na tabela
--            sync_control_pesquisas e funções relacionadas
-- =====================================================

-- 1. HABILITAR RLS na tabela sync_control_pesquisas
-- =====================================================
ALTER TABLE public.sync_control_pesquisas ENABLE ROW LEVEL SECURITY;

-- 2. CRIAR POLÍTICAS RLS para sync_control_pesquisas
-- =====================================================

-- Política para SELECT: Apenas usuários autenticados podem visualizar
DROP POLICY IF EXISTS "Authenticated users can view sync control" ON public.sync_control_pesquisas;
CREATE POLICY "Authenticated users can view sync control" 
  ON public.sync_control_pesquisas
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Política para INSERT: Apenas service_role pode inserir
DROP POLICY IF EXISTS "Service role can insert sync control" ON public.sync_control_pesquisas;
CREATE POLICY "Service role can insert sync control" 
  ON public.sync_control_pesquisas
  FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

-- Política para UPDATE: Apenas service_role pode atualizar
DROP POLICY IF EXISTS "Service role can update sync control" ON public.sync_control_pesquisas;
CREATE POLICY "Service role can update sync control" 
  ON public.sync_control_pesquisas
  FOR UPDATE 
  USING (auth.role() = 'service_role');

-- Política para DELETE: Apenas service_role pode deletar
DROP POLICY IF EXISTS "Service role can delete sync control" ON public.sync_control_pesquisas;
CREATE POLICY "Service role can delete sync control" 
  ON public.sync_control_pesquisas
  FOR DELETE 
  USING (auth.role() = 'service_role');

-- 3. CORRIGIR FUNÇÕES COM search_path VULNERÁVEL
-- =====================================================

-- Função: gerar_hash_pesquisa
DROP FUNCTION IF EXISTS public.gerar_hash_pesquisa(jsonb) CASCADE;
CREATE OR REPLACE FUNCTION public.gerar_hash_pesquisa(dados jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Gera hash MD5 dos dados da pesquisa para detecção de duplicatas
  RETURN md5(dados::text);
END;
$$;

COMMENT ON FUNCTION public.gerar_hash_pesquisa(jsonb) IS 
'Gera hash MD5 dos dados da pesquisa. Usa search_path fixo para segurança.';

-- Função: gerar_chave_unica_pesquisa
DROP FUNCTION IF EXISTS public.gerar_chave_unica_pesquisa(text, text, text, text) CASCADE;
CREATE OR REPLACE FUNCTION public.gerar_chave_unica_pesquisa(
  p_numero_chamado text,
  p_nome_cliente text,
  p_nome_especialista text,
  p_data_resposta text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Gera chave única concatenando campos principais
  RETURN md5(
    COALESCE(p_numero_chamado, '') || '|' ||
    COALESCE(p_nome_cliente, '') || '|' ||
    COALESCE(p_nome_especialista, '') || '|' ||
    COALESCE(p_data_resposta, '')
  );
END;
$$;

COMMENT ON FUNCTION public.gerar_chave_unica_pesquisa(text, text, text, text) IS 
'Gera chave única para pesquisa baseada em campos principais. Usa search_path fixo para segurança.';

-- Função: atualizar_hash_pesquisa
DROP FUNCTION IF EXISTS public.atualizar_hash_pesquisa() CASCADE;
CREATE OR REPLACE FUNCTION public.atualizar_hash_pesquisa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualiza hash automaticamente ao inserir ou atualizar
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

COMMENT ON FUNCTION public.atualizar_hash_pesquisa() IS 
'Trigger para atualizar hash e chave única automaticamente. Usa search_path fixo para segurança.';

-- Função: registrar_sincronizacao_pesquisas
DROP FUNCTION IF EXISTS public.registrar_sincronizacao_pesquisas(text, integer, integer, jsonb) CASCADE;
CREATE OR REPLACE FUNCTION public.registrar_sincronizacao_pesquisas(
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
    registros_processados = p_registros_processados,
    registros_novos = p_registros_novos,
    detalhes = p_detalhes;
END;
$$;

COMMENT ON FUNCTION public.registrar_sincronizacao_pesquisas(text, integer, integer, jsonb) IS 
'Registra informações de sincronização de pesquisas. Usa search_path fixo para segurança.';

-- Função: obter_ultima_sincronizacao_pesquisas
DROP FUNCTION IF EXISTS public.obter_ultima_sincronizacao_pesquisas(text) CASCADE;
CREATE OR REPLACE FUNCTION public.obter_ultima_sincronizacao_pesquisas(
  p_tipo_sincronizacao text
)
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

COMMENT ON FUNCTION public.obter_ultima_sincronizacao_pesquisas(text) IS 
'Retorna timestamp da última sincronização. Usa search_path fixo para segurança.';

-- 4. RECRIAR TRIGGERS (se existirem)
-- =====================================================

-- Verificar se existe trigger na tabela pesquisas_satisfacao
DO $$
BEGIN
  -- Remover trigger antigo se existir
  DROP TRIGGER IF EXISTS trigger_atualizar_hash_pesquisa ON public.pesquisas_satisfacao;
  
  -- Criar novo trigger
  CREATE TRIGGER trigger_atualizar_hash_pesquisa
    BEFORE INSERT OR UPDATE ON public.pesquisas_satisfacao
    FOR EACH ROW
    EXECUTE FUNCTION public.atualizar_hash_pesquisa();
    
  RAISE NOTICE '✅ Trigger atualizar_hash_pesquisa recriado com sucesso';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE '⚠️ Tabela pesquisas_satisfacao não existe, trigger não criado';
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Erro ao criar trigger: %', SQLERRM;
END $$;

-- 5. VALIDAÇÃO FINAL
-- =====================================================

-- Verificar se RLS está habilitado
DO $$
DECLARE
  v_rls_enabled boolean;
BEGIN
  SELECT relrowsecurity INTO v_rls_enabled
  FROM pg_class
  WHERE relname = 'sync_control_pesquisas'
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  IF v_rls_enabled THEN
    RAISE NOTICE '✅ RLS habilitado em sync_control_pesquisas';
  ELSE
    RAISE EXCEPTION '❌ ERRO: RLS não foi habilitado em sync_control_pesquisas';
  END IF;
END $$;

-- Verificar se funções têm search_path fixo
DO $$
DECLARE
  v_function_count integer;
BEGIN
  SELECT COUNT(*) INTO v_function_count
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
    AND p.prosecdef = true
    AND 'search_path=public' = ANY(p.proconfig);
  
  IF v_function_count = 5 THEN
    RAISE NOTICE '✅ Todas as 5 funções têm search_path fixo';
  ELSE
    RAISE WARNING '⚠️ Apenas % de 5 funções têm search_path fixo', v_function_count;
  END IF;
END $$;

-- Verificar políticas RLS
DO $$
DECLARE
  v_policy_count integer;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'sync_control_pesquisas';
  
  IF v_policy_count >= 4 THEN
    RAISE NOTICE '✅ Políticas RLS criadas: % políticas', v_policy_count;
  ELSE
    RAISE WARNING '⚠️ Apenas % políticas RLS encontradas (esperado: 4)', v_policy_count;
  END IF;
END $$;

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
