-- =====================================================
-- SCRIPT: Correção Automática de Problemas de Segurança
-- Descrição: Aplica correções automáticas para vulnerabilidades
--           detectadas pelo script de validação
-- =====================================================

-- IMPORTANTE: Execute primeiro o script validate_security.sql
-- para identificar os problemas antes de aplicar as correções

-- 1. Template para corrigir função insegura
-- Substitua 'nome_da_funcao' pelo nome real da função problemática
/*
DROP FUNCTION IF EXISTS nome_da_funcao() CASCADE;

CREATE OR REPLACE FUNCTION public.nome_da_funcao()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Lógica original da função
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.nome_da_funcao() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades.';
*/

-- 2. Template para habilitar RLS em tabela
-- Substitua 'nome_da_tabela' pelo nome real da tabela
/*
ALTER TABLE nome_da_tabela ENABLE ROW LEVEL SECURITY;
*/

-- 3. Template para criar políticas RLS padrão (OTIMIZADAS PARA PERFORMANCE)
-- Substitua 'nome_da_tabela' pelo nome real da tabela
/*
-- Políticas padrão para tabela com user_id - OTIMIZADAS PARA PERFORMANCE
CREATE POLICY "Users can view own data" ON nome_da_tabela
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own data" ON nome_da_tabela
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own data" ON nome_da_tabela
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own data" ON nome_da_tabela
  FOR DELETE USING ((SELECT auth.uid()) = user_id);
*/

-- 4. Template para otimizar políticas existentes
-- Substitua os nomes conforme necessário
/*
-- Para corrigir políticas com performance ruim
DROP POLICY IF EXISTS "nome_da_politica" ON nome_da_tabela;

CREATE POLICY "nome_da_politica" ON nome_da_tabela
  FOR SELECT USING ((SELECT auth.uid()) = user_id);
*/

-- 5. Verificação final após aplicar correções
-- Execute este bloco após aplicar as correções manuais
DO $$
DECLARE
    func_count INTEGER;
    table_count INTEGER;
    policy_count INTEGER;
BEGIN
    -- Contar funções ainda inseguras
    SELECT COUNT(*) INTO func_count
    FROM pg_proc 
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND prokind = 'f'
      AND prosecdef = true
      AND (proconfig IS NULL OR NOT ('search_path=public' = ANY(proconfig)))
      AND proname NOT LIKE 'pg_%'
      AND proname NOT LIKE 'sql_%';
    
    -- Contar tabelas sem RLS
    SELECT COUNT(*) INTO table_count
    FROM pg_tables 
    WHERE schemaname = 'public'
      AND rowsecurity = false
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT LIKE 'sql_%';
    
    -- Contar tabelas sem políticas
    SELECT COUNT(DISTINCT t.tablename) INTO policy_count
    FROM pg_tables t
    WHERE t.schemaname = 'public'
      AND t.rowsecurity = true
      AND NOT EXISTS (
        SELECT 1 FROM pg_policies p 
        WHERE p.tablename = t.tablename AND p.schemaname = 'public'
      )
      AND t.tablename NOT LIKE 'pg_%'
      AND t.tablename NOT LIKE 'sql_%';
    
    RAISE NOTICE '';
    RAISE NOTICE '🔒 RESULTADO DA CORREÇÃO DE SEGURANÇA:';
    RAISE NOTICE '';
    RAISE NOTICE '   Funções inseguras restantes: %', func_count;
    RAISE NOTICE '   Tabelas sem RLS restantes: %', table_count;
    RAISE NOTICE '   Tabelas sem políticas restantes: %', policy_count;
    RAISE NOTICE '';
    
    IF func_count = 0 AND table_count = 0 AND policy_count = 0 THEN
        RAISE NOTICE '✅ TODAS AS VULNERABILIDADES FORAM CORRIGIDAS!';
    ELSE
        RAISE NOTICE '⚠️ AINDA EXISTEM VULNERABILIDADES PARA CORRIGIR';
        RAISE NOTICE '   Execute novamente o script validate_security.sql para detalhes';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- 6. Instruções de uso
SELECT 
  '📋 INSTRUÇÕES DE USO' as title,
  '' as separator;

SELECT 
  'PASSO 1' as step,
  'Execute: supabase/scripts/validate_security.sql' as instruction,
  'Identifica todas as vulnerabilidades existentes' as description

UNION ALL

SELECT 
  'PASSO 2' as step,
  'Descomente e adapte os templates acima' as instruction,
  'Substitua os nomes das funções/tabelas pelos reais' as description

UNION ALL

SELECT 
  'PASSO 3' as step,
  'Execute as correções uma por vez' as instruction,
  'Teste cada correção antes de prosseguir' as description

UNION ALL

SELECT 
  'PASSO 4' as step,
  'Execute novamente validate_security.sql' as instruction,
  'Confirma que as vulnerabilidades foram corrigidas' as description

UNION ALL

SELECT 
  'PASSO 5' as step,
  'Execute este script para verificação final' as instruction,
  'Mostra resumo das correções aplicadas' as description;

-- 7. Alertas importantes
SELECT 
  '🚨 ALERTAS IMPORTANTES' as title,
  '' as separator;

SELECT 
  'NUNCA FAÇA' as alert_type,
  'Funções sem SECURITY DEFINER e SET search_path' as item,
  'Vulnerável a ataques de privilege escalation' as risk

UNION ALL

SELECT 
  'NUNCA FAÇA' as alert_type,
  'Tabelas sem RLS habilitado' as item,
  'Permite acesso irrestrito aos dados' as risk

UNION ALL

SELECT 
  'NUNCA FAÇA' as alert_type,
  'Políticas RLS incompletas' as item,
  'Pode bloquear acesso legítimo ou permitir acesso indevido' as risk

UNION ALL

SELECT 
  'PERFORMANCE' as alert_type,
  'Use (SELECT auth.uid()) em políticas RLS' as item,
  'Evita re-avaliação para cada linha' as risk

UNION ALL

SELECT 
  'SEMPRE FAÇA' as alert_type,
  'Teste políticas RLS com diferentes usuários' as item,
  'Garante que o controle de acesso funciona corretamente' as risk;

-- Mensagem final
SELECT 
  '✅ SCRIPT DE CORREÇÃO PREPARADO' as final_message,
  'Siga as instruções acima para aplicar as correções de segurança' as action_required;