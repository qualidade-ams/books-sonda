-- ============================================================================
-- Script de Debug - Taxas Clientes
-- Verificar se as taxas existem e se as políticas RLS estão corretas
-- ============================================================================

-- 1. Verificar se a tabela existe e tem dados
SELECT '📊 VERIFICAÇÃO DE DADOS NA TABELA' as titulo;

SELECT 
  COUNT(*) as "Total de Taxas",
  COUNT(CASE WHEN vigencia_fim IS NULL OR vigencia_fim >= CURRENT_DATE THEN 1 END) as "Taxas Vigentes",
  COUNT(CASE WHEN vigencia_fim < CURRENT_DATE THEN 1 END) as "Taxas Expiradas"
FROM taxas_clientes;

-- 2. Listar todas as taxas cadastradas
SELECT '📋 TAXAS CADASTRADAS' as titulo;

SELECT 
  tc.id,
  ec.nome_abreviado as cliente,
  tc.tipo_produto,
  tc.vigencia_inicio,
  tc.vigencia_fim,
  CASE 
    WHEN tc.vigencia_fim IS NULL OR tc.vigencia_fim >= CURRENT_DATE THEN 'Vigente'
    ELSE 'Expirada'
  END as status,
  tc.personalizado,
  tc.created_at
FROM taxas_clientes tc
LEFT JOIN empresas_clientes ec ON tc.cliente_id = ec.id
ORDER BY tc.created_at DESC
LIMIT 20;

-- 3. Verificar políticas RLS da tabela taxas_clientes
SELECT '🔒 POLÍTICAS RLS - taxas_clientes' as titulo;

SELECT 
  policyname as "Nome da Política",
  cmd as "Comando",
  roles::text as "Roles",
  permissive as "Permissiva",
  CASE 
    WHEN cmd = 'ALL' THEN '⚠️ FOR ALL - Pode causar duplicatas'
    WHEN qual = 'true' THEN '⚠️ USING (true) - Muito permissivo'
    WHEN with_check = 'true' THEN '⚠️ WITH CHECK (true) - Muito permissivo'
    ELSE '✅ OK'
  END as "Status",
  left(qual, 80) as "USING (resumo)",
  left(with_check, 80) as "WITH CHECK (resumo)"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'taxas_clientes'
ORDER BY 
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    WHEN 'ALL' THEN 5
  END,
  roles::text;

-- 4. Verificar se RLS está habilitado
SELECT '🔐 STATUS DO RLS' as titulo;

SELECT 
  schemaname as "Schema",
  tablename as "Tabela",
  rowsecurity as "RLS Habilitado",
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS Ativo'
    ELSE '❌ RLS DESABILITADO - VULNERABILIDADE CRÍTICA'
  END as "Status"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'taxas_clientes';

-- 5. Verificar valores das taxas
SELECT '💰 VALORES DAS TAXAS' as titulo;

SELECT 
  tc.id as taxa_id,
  ec.nome_abreviado as cliente,
  vtf.funcao,
  vtf.tipo_hora,
  vtf.valor_base,
  vtf.valor_17h30_19h30,
  vtf.valor_apos_19h30,
  vtf.valor_fim_semana
FROM taxas_clientes tc
LEFT JOIN empresas_clientes ec ON tc.cliente_id = ec.id
LEFT JOIN valores_taxas_funcoes vtf ON vtf.taxa_id = tc.id
WHERE tc.vigencia_fim IS NULL OR tc.vigencia_fim >= CURRENT_DATE
ORDER BY ec.nome_abreviado, vtf.funcao, vtf.tipo_hora
LIMIT 50;

-- 6. Verificar se há problemas de permissão
SELECT '🔍 TESTE DE PERMISSÃO (como authenticated)' as titulo;

-- Simular query como usuário authenticated
SET ROLE authenticated;

SELECT 
  COUNT(*) as "Taxas Visíveis (authenticated)"
FROM taxas_clientes;

-- Voltar para role padrão
RESET ROLE;

-- 7. Verificar políticas duplicadas
SELECT '⚠️ VERIFICAÇÃO DE DUPLICATAS' as titulo;

SELECT 
  tablename as "Tabela",
  cmd as "Comando",
  roles::text as "Roles",
  COUNT(*) as "Quantidade",
  CASE 
    WHEN COUNT(*) > 1 THEN '⚠️ DUPLICATA DETECTADA'
    ELSE '✅ OK'
  END as "Status"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'taxas_clientes'
  AND permissive = 'PERMISSIVE'
GROUP BY tablename, cmd, roles::text
HAVING COUNT(*) > 1;

-- 8. Resumo final
SELECT '📈 RESUMO FINAL' as titulo;

WITH stats AS (
  SELECT 
    COUNT(*) as total_taxas,
    COUNT(CASE WHEN vigencia_fim IS NULL OR vigencia_fim >= CURRENT_DATE THEN 1 END) as vigentes,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'taxas_clientes') as total_policies,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'taxas_clientes' AND cmd = 'ALL') as all_policies,
    (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'taxas_clientes') as rls_enabled
  FROM taxas_clientes
)
SELECT 
  total_taxas as "Total de Taxas",
  vigentes as "Taxas Vigentes",
  total_policies as "Total de Políticas RLS",
  all_policies as "Políticas FOR ALL",
  CASE 
    WHEN rls_enabled THEN '✅ Habilitado'
    ELSE '❌ DESABILITADO'
  END as "RLS Status",
  CASE 
    WHEN total_taxas > 0 AND vigentes > 0 AND rls_enabled AND all_policies = 0
    THEN '✅ TUDO OK - Taxas existem e RLS está correto'
    WHEN total_taxas = 0
    THEN '⚠️ NENHUMA TAXA CADASTRADA'
    WHEN NOT rls_enabled
    THEN '❌ RLS DESABILITADO - VULNERABILIDADE CRÍTICA'
    WHEN all_policies > 0
    THEN '⚠️ POLÍTICAS FOR ALL DETECTADAS - Pode causar problemas'
    ELSE '⚠️ VERIFICAR CONFIGURAÇÃO'
  END as "Diagnóstico"
FROM stats;
