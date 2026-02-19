-- ============================================
-- FIX TRIGGERS - Padronizar Triggers de updated_at
-- ============================================
-- 
-- Este script padroniza todos os triggers de updated_at
-- para usar a função update_updated_at_column()
--
-- Data: 18/02/2026
-- Autor: Sistema Books SND
-- ============================================

-- Criar função padrão se não existir
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at_column() IS 
'Função padrão para atualizar campo updated_at. Usa SECURITY DEFINER e search_path fixo para segurança.';

-- ============================================
-- PADRONIZAR TRIGGERS EXISTENTES
-- ============================================

-- Nota: Os triggers existentes usam funções específicas por tabela
-- Vamos mantê-los, mas garantir que seguem o padrão de segurança

-- 1. apontamentos_aranda
CREATE OR REPLACE FUNCTION public.update_apontamentos_aranda_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 2. apontamentos_tickets_aranda
CREATE OR REPLACE FUNCTION public.update_apontamentos_tickets_aranda_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 3. banco_horas (alocacoes e calculos)
CREATE OR REPLACE FUNCTION public.update_banco_horas_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 4. banco_horas_observacoes
CREATE OR REPLACE FUNCTION public.update_banco_horas_observacoes_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 5. books
CREATE OR REPLACE FUNCTION public.update_books_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 6. de_para_categoria
CREATE OR REPLACE FUNCTION public.update_de_para_categoria_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 7. email_test_data
CREATE OR REPLACE FUNCTION public.update_email_test_data_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 8. historico_inconsistencias_chamados
CREATE OR REPLACE FUNCTION public.update_historico_inconsistencias_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 9. sync_control
CREATE OR REPLACE FUNCTION public.update_sync_control_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 10. taxas_clientes
CREATE OR REPLACE FUNCTION public.update_taxas_clientes_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 11. taxas_padrao
CREATE OR REPLACE FUNCTION public.update_taxas_padrao_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================
-- CRIAR TRIGGERS FALTANTES
-- ============================================

-- Tabelas que precisam de trigger de updated_at

-- 1. anexos_temporarios
DROP TRIGGER IF EXISTS update_anexos_temporarios_updated_at ON anexos_temporarios;
CREATE TRIGGER update_anexos_temporarios_updated_at
  BEFORE UPDATE ON anexos_temporarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 2. baseline_historico
DROP TRIGGER IF EXISTS update_baseline_historico_updated_at ON baseline_historico;
CREATE TRIGGER update_baseline_historico_updated_at
  BEFORE UPDATE ON baseline_historico
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3. clientes
DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;
CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. empresas_clientes
DROP TRIGGER IF EXISTS update_empresas_clientes_updated_at ON empresas_clientes;
CREATE TRIGGER update_empresas_clientes_updated_at
  BEFORE UPDATE ON empresas_clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. grupos_responsaveis
DROP TRIGGER IF EXISTS update_grupos_responsaveis_updated_at ON grupos_responsaveis;
CREATE TRIGGER update_grupos_responsaveis_updated_at
  BEFORE UPDATE ON grupos_responsaveis
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. job_configurations
DROP TRIGGER IF EXISTS update_job_configurations_updated_at ON job_configurations;
CREATE TRIGGER update_job_configurations_updated_at
  BEFORE UPDATE ON job_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. jobs_queue
DROP TRIGGER IF EXISTS update_jobs_queue_updated_at ON jobs_queue;
CREATE TRIGGER update_jobs_queue_updated_at
  BEFORE UPDATE ON jobs_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. requerimentos
DROP TRIGGER IF EXISTS update_requerimentos_updated_at ON requerimentos;
CREATE TRIGGER update_requerimentos_updated_at
  BEFORE UPDATE ON requerimentos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICAÇÃO DOS TRIGGERS
-- ============================================

-- Listar todos os triggers de updated_at
SELECT 
  t.trigger_name,
  t.event_object_table as table_name,
  t.action_statement,
  '✅ CONFIGURADO' as status
FROM information_schema.triggers t
WHERE t.trigger_schema = 'public'
  AND t.trigger_name LIKE '%updated_at%'
ORDER BY t.event_object_table;

-- Verificar tabelas com updated_at mas SEM trigger
SELECT DISTINCT
  c.table_name,
  '❌ SEM TRIGGER' as status,
  'CREATE TRIGGER update_' || c.table_name || '_updated_at BEFORE UPDATE ON ' || 
  c.table_name || ' FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();' as comando_criar
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.column_name = 'updated_at'
  AND NOT EXISTS (
    SELECT 1 
    FROM information_schema.triggers t
    WHERE t.trigger_schema = 'public'
      AND t.event_object_table = c.table_name
      AND t.trigger_name LIKE '%updated_at%'
  )
ORDER BY c.table_name;

-- Verificar se funções têm SECURITY DEFINER
SELECT 
  routine_name,
  security_type,
  CASE 
    WHEN security_type = 'DEFINER' THEN '✅ SECURITY DEFINER'
    ELSE '❌ SEM SECURITY DEFINER'
  END as security_status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%updated_at%'
ORDER BY routine_name;

-- Registrar no log
INSERT INTO logs_sistema (
  operacao,
  detalhes,
  data_operacao
) VALUES (
  'FIX_TRIGGERS',
  'Triggers de updated_at padronizados e corrigidos',
  NOW()
);

-- Mensagem final
DO $$
DECLARE
  tabelas_sem_trigger INTEGER;
  funcoes_sem_security INTEGER;
BEGIN
  -- Contar tabelas sem trigger
  SELECT COUNT(DISTINCT c.table_name) INTO tabelas_sem_trigger
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.column_name = 'updated_at'
    AND NOT EXISTS (
      SELECT 1 
      FROM information_schema.triggers t
      WHERE t.trigger_schema = 'public'
        AND t.event_object_table = c.table_name
        AND t.trigger_name LIKE '%updated_at%'
    );
  
  -- Contar funções sem SECURITY DEFINER
  SELECT COUNT(*) INTO funcoes_sem_security
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name LIKE '%updated_at%'
    AND security_type != 'DEFINER';
  
  IF tabelas_sem_trigger > 0 THEN
    RAISE WARNING '⚠️ ATENÇÃO: % tabelas ainda sem trigger de updated_at', tabelas_sem_trigger;
  END IF;
  
  IF funcoes_sem_security > 0 THEN
    RAISE WARNING '⚠️ ATENÇÃO: % funções sem SECURITY DEFINER', funcoes_sem_security;
  END IF;
  
  IF tabelas_sem_trigger = 0 AND funcoes_sem_security = 0 THEN
    RAISE NOTICE '✅ Triggers corrigidos com sucesso!';
    RAISE NOTICE 'Todas as funções têm SECURITY DEFINER';
    RAISE NOTICE 'Todas as tabelas com updated_at têm trigger';
    RAISE NOTICE 'Próximo passo: Executar 004_rollback_timezone_migration.sql (se necessário)';
  END IF;
END $$;
