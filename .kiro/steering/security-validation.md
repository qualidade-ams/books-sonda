---
inclusion: always
---

# Validação Automática de Segurança - Supabase

## Hook de Validação de Migrations

Sempre que uma migration for criada ou modificada, execute estas verificações:

### 1. Verificação de Funções Inseguras
```sql
-- Executar após cada migration para detectar funções inseguras
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  proconfig as config_settings,
  CASE 
    WHEN proconfig IS NULL OR NOT ('search_path=public' = ANY(proconfig)) 
    THEN '⚠️ VULNERABILIDADE: search_path não definido'
    ELSE '✅ Seguro'
  END as security_status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND prokind = 'f';
```

### 2. Verificação de RLS
```sql
-- Verificar se todas as tabelas têm RLS habilitado
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS Habilitado'
    ELSE '⚠️ RLS DESABILITADO - VULNERABILIDADE CRÍTICA'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE 'sql_%';
```

### 3. Verificação de Políticas RLS e Performance
```sql
-- Verificar se tabelas têm políticas RLS adequadas e otimizadas
WITH table_policies AS (
  SELECT 
    schemaname,
    tablename,
    COUNT(*) as policy_count,
    array_agg(cmd) as commands,
    array_agg(qual) as policy_expressions
  FROM pg_policies 
  WHERE schemaname = 'public'
  GROUP BY schemaname, tablename
)
SELECT 
  t.tablename,
  COALESCE(tp.policy_count, 0) as policies,
  CASE 
    WHEN tp.policy_count >= 4 AND 
         'SELECT' = ANY(tp.commands) AND
         'INSERT' = ANY(tp.commands) AND
         'UPDATE' = ANY(tp.commands) AND
         'DELETE' = ANY(tp.commands)
    THEN '✅ Políticas Completas'
    WHEN tp.policy_count > 0 
    THEN '⚠️ Políticas Incompletas'
    ELSE '❌ SEM POLÍTICAS - VULNERABILIDADE CRÍTICA'
  END as policy_status,
  CASE 
    WHEN tp.policy_expressions IS NOT NULL AND 
         EXISTS (
           SELECT 1 FROM unnest(tp.policy_expressions) AS expr 
           WHERE expr LIKE '%auth.uid()%' AND expr NOT LIKE '%(SELECT auth.uid())%'
         )
    THEN '⚠️ PERFORMANCE: Políticas não otimizadas (auth.uid() sem SELECT)'
    ELSE '✅ Performance Otimizada'
  END as performance_status
FROM pg_tables t
LEFT JOIN table_policies tp ON t.tablename = tp.tablename
WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE 'pg_%'
  AND t.tablename NOT LIKE 'sql_%';
```

## Comandos de Correção Automática

### Corrigir Função Insegura
```sql
-- Template para corrigir função insegura detectada
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
```

### Habilitar RLS em Tabela
```sql
-- Para tabela sem RLS
ALTER TABLE nome_da_tabela ENABLE ROW LEVEL SECURITY;
```

### Criar Políticas RLS Padrão (Otimizadas)
```sql
-- Políticas padrão para tabela com user_id - OTIMIZADAS PARA PERFORMANCE
CREATE POLICY "Users can view own data" ON nome_da_tabela
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own data" ON nome_da_tabela
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own data" ON nome_da_tabela
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own data" ON nome_da_tabela
  FOR DELETE USING ((SELECT auth.uid()) = user_id);
```

### Otimizar Políticas Existentes
```sql
-- Para corrigir políticas com performance ruim
DROP POLICY IF EXISTS "nome_da_politica" ON nome_da_tabela;

CREATE POLICY "nome_da_politica" ON nome_da_tabela
  FOR SELECT USING ((SELECT auth.uid()) = user_id);
```

## Processo de Validação Obrigatório

1. **Antes de aplicar migration**: Revisar código SQL
2. **Após aplicar migration**: Executar queries de verificação
3. **Se vulnerabilidades detectadas**: Aplicar correções imediatamente
4. **Documentar**: Adicionar comentários explicando decisões de segurança

## Alertas Críticos

### 🚨 NUNCA FAÇA:
- Funções sem `SECURITY DEFINER` e `SET search_path`
- Tabelas sem RLS habilitado
- Políticas RLS incompletas
- **PERFORMANCE**: `auth.uid()` direto em políticas RLS
- **PERFORMANCE**: `current_setting()` sem subquery
- Alterações diretas no Dashboard em produção

### ✅ SEMPRE FAÇA:
- Use o template de migration segura
- **PERFORMANCE**: Use `(SELECT auth.uid())` em políticas RLS
- Execute validações após cada migration
- Documente decisões de segurança
- Teste políticas RLS com diferentes usuários

### 🚀 OTIMIZAÇÕES DE PERFORMANCE:
```sql
-- ❌ LENTO (re-avalia para cada linha)
auth.uid() = user_id
current_setting('app.user_id') = user_id

-- ✅ RÁPIDO (avalia uma vez por query)
(SELECT auth.uid()) = user_id
(SELECT current_setting('app.user_id')) = user_id
```