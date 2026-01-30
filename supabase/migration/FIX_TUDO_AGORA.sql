-- =====================================================
-- FIX TUDO - Correção Completa em Uma Execução
-- Este script resolve:
-- 1. Funções duplicadas
-- 2. Funções com search_path vulnerável
-- 3. Políticas RLS com performance ruim
-- =====================================================

-- ═════════════════════════════════════════════════════
-- PARTE 1: REMOVER E RECRIAR FUNÇÕES (SEM DUPLICATAS)
-- ═════════════════════════════════════════════════════

-- Remover TODAS as versões das funções
DROP FUNCTION IF EXISTS public.gerar_hash_pesquisa CASCADE;
DROP FUNCTION IF EXISTS public.gerar_chave_unica_pesquisa CASCADE;
DROP FUNCTION IF EXISTS public.atualizar_hash_pesquisa CASCADE;
DROP FUNCTION IF EXISTS public.registrar_sincronizacao_pesquisas CASCADE;
DROP FUNCTION IF EXISTS public.obter_ultima_sincronizacao_pesquisas CASCADE;

-- Recriar funções seguras
CREATE FUNCTION public.gerar_hash_pesquisa(dados jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE
AS $$ BEGIN RETURN md5(dados::text); END; $$;

CREATE FUNCTION public.gerar_chave_unica_pesquisa(p_numero_chamado text, p_nome_cliente text, p_nome_especialista text, p_data_resposta text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public IMMUTABLE
AS $$ BEGIN RETURN md5(COALESCE(p_numero_chamado, '') || '|' || COALESCE(p_nome_cliente, '') || '|' || COALESCE(p_nome_especialista, '') || '|' || COALESCE(p_data_resposta, '')); END; $$;

CREATE FUNCTION public.atualizar_hash_pesquisa()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN NEW.hash_dados := public.gerar_hash_pesquisa(jsonb_build_object('numero_chamado', NEW.numero_chamado, 'nome_cliente', NEW.nome_cliente, 'nome_especialista', NEW.nome_especialista, 'data_resposta', NEW.data_resposta)); NEW.chave_unica := public.gerar_chave_unica_pesquisa(NEW.numero_chamado, NEW.nome_cliente, NEW.nome_especialista, NEW.data_resposta); RETURN NEW; END; $$;

CREATE FUNCTION public.registrar_sincronizacao_pesquisas(p_tipo_sincronizacao text, p_registros_processados integer DEFAULT 0, p_registros_novos integer DEFAULT 0, p_detalhes jsonb DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN INSERT INTO public.sync_control_pesquisas (tipo_sincronizacao, ultima_sincronizacao, registros_processados, registros_novos, detalhes) VALUES (p_tipo_sincronizacao, NOW(), p_registros_processados, p_registros_novos, p_detalhes) ON CONFLICT (tipo_sincronizacao) DO UPDATE SET ultima_sincronizacao = NOW(), registros_processados = EXCLUDED.registros_processados, registros_novos = EXCLUDED.registros_novos, detalhes = EXCLUDED.detalhes; END; $$;

CREATE FUNCTION public.obter_ultima_sincronizacao_pesquisas(p_tipo_sincronizacao text)
RETURNS timestamp with time zone LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE
AS $$ DECLARE v_ultima_sincronizacao timestamp with time zone; BEGIN SELECT ultima_sincronizacao INTO v_ultima_sincronizacao FROM public.sync_control_pesquisas WHERE tipo_sincronizacao = p_tipo_sincronizacao; RETURN COALESCE(v_ultima_sincronizacao, '1970-01-01'::timestamp with time zone); END; $$;

-- Recriar trigger
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pesquisas_satisfacao') THEN DROP TRIGGER IF EXISTS trigger_atualizar_hash_pesquisa ON public.pesquisas_satisfacao; CREATE TRIGGER trigger_atualizar_hash_pesquisa BEFORE INSERT OR UPDATE ON public.pesquisas_satisfacao FOR EACH ROW EXECUTE FUNCTION public.atualizar_hash_pesquisa(); END IF; END $$;

-- ═════════════════════════════════════════════════════
-- PARTE 2: OTIMIZAR POLÍTICAS RLS
-- ═════════════════════════════════════════════════════

-- Remover políticas antigas
DROP POLICY IF EXISTS "Authenticated users can view sync control" ON public.sync_control_pesquisas;
DROP POLICY IF EXISTS "Service role can insert sync control" ON public.sync_control_pesquisas;
DROP POLICY IF EXISTS "Service role can update sync control" ON public.sync_control_pesquisas;
DROP POLICY IF EXISTS "Service role can delete sync control" ON public.sync_control_pesquisas;

-- Criar políticas otimizadas (com SELECT para performance)
CREATE POLICY "Authenticated users can view sync control" ON public.sync_control_pesquisas FOR SELECT USING ((SELECT auth.role()) = 'authenticated');
CREATE POLICY "Service role can insert sync control" ON public.sync_control_pesquisas FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY "Service role can update sync control" ON public.sync_control_pesquisas FOR UPDATE USING ((SELECT auth.role()) = 'service_role');
CREATE POLICY "Service role can delete sync control" ON public.sync_control_pesquisas FOR DELETE USING ((SELECT auth.role()) = 'service_role');

-- ═════════════════════════════════════════════════════
-- PARTE 3: VALIDAÇÃO COMPLETA
-- ═════════════════════════════════════════════════════

-- Validar funções
SELECT 
  '✅ FUNÇÕES' as categoria,
  p.proname as "Função",
  CASE 
    WHEN 'search_path=public' = ANY(p.proconfig) THEN '✅ SEGURA'
    ELSE '❌ VULNERÁVEL'
  END as "Status",
  COUNT(*) OVER (PARTITION BY p.proname) as "Versões"
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('gerar_hash_pesquisa', 'gerar_chave_unica_pesquisa', 'atualizar_hash_pesquisa', 'registrar_sincronizacao_pesquisas', 'obter_ultima_sincronizacao_pesquisas')
ORDER BY p.proname;

-- Validar políticas RLS
SELECT 
  '✅ POLÍTICAS RLS' as categoria,
  policyname as "Política",
  cmd as "Comando",
  CASE 
    WHEN qual LIKE '%(SELECT auth.%' OR qual LIKE '%(select auth.%' THEN '✅ OTIMIZADA'
    WHEN qual LIKE '%auth.%' THEN '⚠️ NÃO OTIMIZADA'
    ELSE '✅ OK'
  END as "Performance"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'sync_control_pesquisas'
ORDER BY cmd;

-- Resumo final
SELECT 
  '📊 RESUMO FINAL' as titulo,
  (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname IN ('gerar_hash_pesquisa', 'gerar_chave_unica_pesquisa', 'atualizar_hash_pesquisa', 'registrar_sincronizacao_pesquisas', 'obter_ultima_sincronizacao_pesquisas')) as "Total Funções",
  (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname IN ('gerar_hash_pesquisa', 'gerar_chave_unica_pesquisa', 'atualizar_hash_pesquisa', 'registrar_sincronizacao_pesquisas', 'obter_ultima_sincronizacao_pesquisas') AND 'search_path=public' = ANY(p.proconfig)) as "Funções Seguras",
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sync_control_pesquisas') as "Políticas RLS",
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname IN ('gerar_hash_pesquisa', 'gerar_chave_unica_pesquisa', 'atualizar_hash_pesquisa', 'registrar_sincronizacao_pesquisas', 'obter_ultima_sincronizacao_pesquisas') AND 'search_path=public' = ANY(p.proconfig)) = 5
    AND (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sync_control_pesquisas') = 4
    THEN '🎉 TUDO CORRIGIDO!'
    ELSE '⚠️ VERIFICAR RESULTADOS'
  END as "Status Geral";
