-- Script de Diagnóstico - Segmentação de Baseline
-- Execute este script no Supabase SQL Editor para diagnosticar o problema

-- ========================================
-- 1. VERIFICAR SE COLUNAS EXISTEM
-- ========================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'empresas_clientes' 
  AND column_name IN ('baseline_segmentado', 'segmentacao_config')
ORDER BY column_name;

-- Resultado esperado: 2 linhas
-- baseline_segmentado | boolean | YES | false
-- segmentacao_config  | jsonb   | YES | NULL

-- ========================================
-- 2. VERIFICAR SE TRIGGER EXISTE
-- ========================================
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_validar_segmentacao_baseline';

-- Resultado esperado: 1 linha com o trigger

-- ========================================
-- 3. VERIFICAR SE FUNÇÃO EXISTE
-- ========================================
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  proconfig as config_settings
FROM pg_proc 
WHERE proname = 'validar_segmentacao_baseline';

-- Resultado esperado: 1 linha com a função

-- ========================================
-- 4. VERIFICAR DADOS EXISTENTES
-- ========================================
SELECT 
  id,
  nome_abreviado,
  baseline_segmentado,
  segmentacao_config::text as config_json,
  created_at,
  updated_at
FROM empresas_clientes
WHERE baseline_segmentado = TRUE
ORDER BY updated_at DESC
LIMIT 10;

-- Se não retornar nada, nenhuma empresa tem baseline segmentado configurado

-- ========================================
-- 5. VERIFICAR ÚLTIMAS EMPRESAS CRIADAS/EDITADAS
-- ========================================
SELECT 
  id,
  nome_abreviado,
  baseline_segmentado,
  CASE 
    WHEN segmentacao_config IS NULL THEN 'NULL'
    ELSE segmentacao_config::text
  END as config_json,
  created_at,
  updated_at
FROM empresas_clientes
ORDER BY updated_at DESC
LIMIT 5;

-- ========================================
-- 6. TESTE DE INSERT MANUAL
-- ========================================
-- ATENÇÃO: Este teste cria uma empresa de teste
-- Comente esta seção se não quiser criar dados de teste

/*
-- Criar empresa de teste com baseline segmentado
INSERT INTO empresas_clientes (
  nome_completo,
  nome_abreviado,
  email_gestor,
  status,
  baseline_segmentado,
  segmentacao_config
) VALUES (
  'EMPRESA TESTE SEGMENTACAO',
  'TESTE_SEG',
  'teste@sonda.com',
  'ativo',
  TRUE,
  '{"empresas": [{"nome": "NIQUEL", "percentual": 60, "filtro_tipo": "contem", "filtro_valor": "NIQUEL", "ordem": 1}, {"nome": "IOB", "percentual": 40, "filtro_tipo": "nao_contem", "filtro_valor": "NIQUEL", "ordem": 2}]}'::jsonb
) RETURNING id, nome_abreviado, baseline_segmentado, segmentacao_config;

-- Se o INSERT funcionar, o problema está no código TypeScript
-- Se o INSERT falhar, o problema está no banco de dados (trigger/validação)
*/

-- ========================================
-- 7. VERIFICAR LOGS DE ERRO (se disponível)
-- ========================================
-- Esta query pode não funcionar dependendo das permissões
-- SELECT * FROM pg_stat_activity WHERE state = 'active';

-- ========================================
-- INSTRUÇÕES
-- ========================================
-- 1. Execute cada seção separadamente
-- 2. Copie os resultados de cada query
-- 3. Se a seção 1 não retornar 2 linhas, execute a migration primeiro
-- 4. Se a seção 6 (teste manual) funcionar, o problema está no código TypeScript
-- 5. Se a seção 6 falhar, o problema está no banco (trigger/validação)

