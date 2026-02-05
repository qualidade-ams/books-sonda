---
inclusion: always
---

# Validação Automática de Segurança - Supabase

## Hook de Validação de Migrations

Sempre que uma migration for criada ou modificada, execute estas verificações:

### 0. Verificação de Políticas Duplicadas (CRÍTICO)
```sql
-- SEMPRE EXECUTAR ANTES DE CRIAR NOVAS POLÍTICAS
-- Verificar se há políticas duplicadas para a mesma tabela e ação
SELECT 
  tablename,
  cmd as acao,
  array_agg(policyname) as politicas_duplicadas,
  COUNT(*) as total
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename = 'sua_tabela_aqui' -- SUBSTITUIR pelo nome da tabela
GROUP BY tablename, cmd
HAVING COUNT(*) > 1;

-- Se retornar resultados, há políticas duplicadas!
-- REMOVER TODAS as políticas antigas ANTES de criar novas:
DROP POLICY IF EXISTS "nome_politica_antiga_1" ON sua_tabela;
DROP POLICY IF EXISTS "nome_politica_antiga_2" ON sua_tabela;
-- ... remover TODAS as políticas listadas
```

**⚠️ REGRA CRÍTICA: SEMPRE REMOVER POLÍTICAS ANTIGAS ANTES DE CRIAR NOVAS**

Quando criar migrations que modificam políticas RLS:

1. **LISTAR todas as políticas existentes**:
```sql
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'sua_tabela';
```

2. **ADICIONAR DROP para TODAS as políticas listadas**:
```sql
-- Template de DROP completo
DROP POLICY IF EXISTS "politica_1" ON tabela;
DROP POLICY IF EXISTS "politica_2" ON tabela;
DROP POLICY IF EXISTS "politica_3" ON tabela;
-- ... adicionar TODAS as políticas encontradas
```

3. **CRIAR as novas políticas** (somente após remover todas as antigas)

4. **VERIFICAR se não há duplicatas**:
```sql
-- Deve retornar 0 linhas (sem duplicatas)
SELECT tablename, cmd, COUNT(*) 
FROM pg_policies 
WHERE tablename = 'sua_tabela'
GROUP BY tablename, cmd
HAVING COUNT(*) > 1;
```

**Exemplo de Migration Correta**:
```sql
-- ✅ BOM: Remove TODAS as políticas antigas primeiro
DROP POLICY IF EXISTS "old_policy_1" ON tabela;
DROP POLICY IF EXISTS "old_policy_2" ON tabela;
DROP POLICY IF EXISTS "old_policy_3" ON tabela;

-- Depois cria as novas
CREATE POLICY "new_policy" ON tabela ...;

-- ❌ RUIM: Não remove políticas antigas
CREATE POLICY "new_policy" ON tabela ...; -- Vai duplicar!
```

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


## Checklist de Migration de Políticas RLS

⚠️ **CRÍTICO**: Sempre que mexer em políticas RLS, elas podem duplicar. Siga este checklist rigorosamente:

### Passo a Passo Obrigatório

- [ ] **1. Listar políticas existentes**
  ```sql
  SELECT policyname FROM pg_policies WHERE tablename = 'sua_tabela';
  ```

- [ ] **2. Adicionar DROP para TODAS as políticas listadas**
  ```sql
  DROP POLICY IF EXISTS "politica_1" ON tabela;
  DROP POLICY IF EXISTS "politica_2" ON tabela;
  -- ... TODAS as políticas encontradas no passo 1
  ```

- [ ] **3. Criar as novas políticas**
  ```sql
  CREATE POLICY "nova_politica" ON tabela ...;
  ```

- [ ] **4. Verificar se não há duplicatas**
  ```sql
  SELECT tablename, cmd, array_agg(policyname) as duplicadas, COUNT(*) 
  FROM pg_policies 
  WHERE tablename = 'sua_tabela'
  GROUP BY tablename, cmd
  HAVING COUNT(*) > 1;
  -- Deve retornar 0 linhas
  ```

- [ ] **5. Testar acesso com usuário autenticado**

- [ ] **6. Verificar alertas do Supabase Dashboard**
  - Sem alertas de políticas permissivas
  - Sem alertas de políticas duplicadas

### Exemplo Completo de Migration Segura

```sql
-- Migration: Fix RLS policies for tabela_exemplo
-- SEMPRE seguir este padrão para evitar duplicação

-- PASSO 1: Remover TODAS as políticas antigas
DROP POLICY IF EXISTS "old_policy_select" ON tabela_exemplo;
DROP POLICY IF EXISTS "old_policy_insert" ON tabela_exemplo;
DROP POLICY IF EXISTS "Users can view" ON tabela_exemplo;
DROP POLICY IF EXISTS "Users can insert" ON tabela_exemplo;
DROP POLICY IF EXISTS "authenticated_select" ON tabela_exemplo;
-- ... adicionar TODAS as variações possíveis

-- PASSO 2: Garantir RLS habilitado
ALTER TABLE tabela_exemplo ENABLE ROW LEVEL SECURITY;

-- PASSO 3: Criar função de verificação (se necessário)
CREATE OR REPLACE FUNCTION public.user_has_permission()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles p
    JOIN user_groups ug ON p.group_id = ug.id
    JOIN screen_permissions sp ON sp.group_id = ug.id
    WHERE p.id = (SELECT auth.uid())
      AND sp.screen_key = 'tela_exemplo'
      AND sp.permission_level IN ('view', 'edit')
  );
END;
$$;

-- PASSO 4: Criar novas políticas
CREATE POLICY "authenticated_select_tabela"
  ON tabela_exemplo FOR SELECT
  TO authenticated
  USING (user_has_permission());

-- PASSO 5: Verificar duplicatas
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT tablename, cmd, COUNT(*) as total
    FROM pg_policies 
    WHERE tablename = 'tabela_exemplo'
    GROUP BY tablename, cmd
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION '❌ ERRO: Políticas duplicadas!';
  END IF;
  
  RAISE NOTICE '✅ Sem duplicatas';
END $$;
```

### Regras de Ouro para Políticas RLS

1. **SEMPRE remover políticas antigas ANTES de criar novas**
2. **NUNCA usar `USING (true)` ou `WITH CHECK (true)` para authenticated** (exceto service_role)
3. **SEMPRE usar funções de verificação de permissões**
4. **SEMPRE verificar duplicatas após criar políticas**
5. **SEMPRE usar `SECURITY DEFINER` e `SET search_path = public` em funções**
6. **SEMPRE usar `(SELECT auth.uid())` em vez de `auth.uid()` para performance**
