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
- **Triggers sem `SECURITY DEFINER` e `SET search_path`**
- Tabelas sem RLS habilitado
- Políticas RLS incompletas
- **PERFORMANCE**: `auth.uid()` direto em políticas RLS
- **PERFORMANCE**: `current_setting()` sem subquery
- Alterações diretas no Dashboard em produção

### ✅ SEMPRE FAÇA:
- Use o template de migration segura
- **FUNÇÕES E TRIGGERS**: Sempre adicionar `SECURITY DEFINER` e `SET search_path = public`
- **PERFORMANCE**: Use `(SELECT auth.uid())` em políticas RLS
- Execute validações após cada migration
- Documente decisões de segurança
- Teste políticas RLS com diferentes usuários

### 📝 TEMPLATE PARA FUNÇÕES E TRIGGERS SEGUROS:

```sql
-- ✅ CORRETO: Função com SECURITY DEFINER e SET search_path
CREATE OR REPLACE FUNCTION public.nome_da_funcao()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Lógica da função
  RETURN NEW;
END;
$$;

-- ❌ ERRADO: Função sem SECURITY DEFINER e SET search_path
CREATE OR REPLACE FUNCTION public.nome_da_funcao()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  -- Lógica da função
  RETURN NEW;
END;
$$;
```

**Por que é importante:**
- `SECURITY DEFINER`: Define que a função executa com privilégios do criador
- `SET search_path = public`: Previne ataques de injeção via search_path mutável
- Sem essas configurações, o Supabase emite alerta: "Function has a role mutable search_path"

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

---

## Padrão de Timezone - Horário de Brasília (UTC-3)

### 🌍 REGRA CRÍTICA: Todos os campos TIMESTAMPTZ devem usar UTC

**⚠️ IMPORTANTE**: O PostgreSQL/Supabase armazena TIMESTAMPTZ sempre em UTC internamente. O horário de Brasília (UTC-3) é aplicado apenas na EXIBIÇÃO, não no armazenamento.

### ✅ Padrão Correto para Criação de Campos

```sql
-- ✅ CORRETO: Usar TIMESTAMP WITH TIME ZONE (armazena em UTC)
CREATE TABLE exemplo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_evento TIMESTAMP WITH TIME ZONE,
  data_modificacao TIMESTAMP WITH TIME ZONE
);

-- ✅ CORRETO: Criar índices para performance
CREATE INDEX idx_exemplo_created_at ON exemplo(created_at);
CREATE INDEX idx_exemplo_updated_at ON exemplo(updated_at);

-- ✅ CORRETO: Trigger para atualizar updated_at automaticamente
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

CREATE TRIGGER update_exemplo_updated_at
  BEFORE UPDATE ON exemplo
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 📝 Conversão de Timezone em Queries

```sql
-- ✅ CORRETO: Converter para horário de Brasília na query
SELECT 
  id,
  created_at AT TIME ZONE 'America/Sao_Paulo' as created_at_brasilia,
  updated_at AT TIME ZONE 'America/Sao_Paulo' as updated_at_brasilia
FROM exemplo;

-- ✅ CORRETO: Filtrar por data no horário de Brasília
SELECT *
FROM exemplo
WHERE created_at AT TIME ZONE 'America/Sao_Paulo' >= '2024-01-01 00:00:00'
  AND created_at AT TIME ZONE 'America/Sao_Paulo' < '2024-02-01 00:00:00';

-- ✅ CORRETO: Inserir data específica do horário de Brasília
INSERT INTO exemplo (data_evento)
VALUES ('2024-01-15 14:30:00-03:00'::TIMESTAMPTZ);

-- ❌ ERRADO: Usar TIMESTAMP sem timezone
CREATE TABLE exemplo_errado (
  created_at TIMESTAMP DEFAULT NOW()  -- ❌ Não usa timezone!
);
```

### 🔧 Migração de Campos Existentes

```sql
-- Se você tem campos TIMESTAMP sem timezone, converta para TIMESTAMPTZ:

-- PASSO 1: Adicionar nova coluna com timezone
ALTER TABLE tabela_existente 
ADD COLUMN created_at_new TIMESTAMP WITH TIME ZONE;

-- PASSO 2: Copiar dados assumindo que estão em horário de Brasília
UPDATE tabela_existente
SET created_at_new = created_at AT TIME ZONE 'America/Sao_Paulo';

-- PASSO 3: Remover coluna antiga e renomear nova
ALTER TABLE tabela_existente DROP COLUMN created_at;
ALTER TABLE tabela_existente RENAME COLUMN created_at_new TO created_at;

-- PASSO 4: Adicionar default e índice
ALTER TABLE tabela_existente 
ALTER COLUMN created_at SET DEFAULT NOW();

CREATE INDEX idx_tabela_created_at ON tabela_existente(created_at);
```

### 📊 Verificação de Campos com Timezone

```sql
-- Verificar quais tabelas têm campos sem timezone
SELECT 
  table_name,
  column_name,
  data_type,
  CASE 
    WHEN data_type = 'timestamp without time zone' 
    THEN '❌ SEM TIMEZONE - CORRIGIR'
    WHEN data_type = 'timestamp with time zone' 
    THEN '✅ COM TIMEZONE'
    ELSE data_type
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type LIKE '%timestamp%'
ORDER BY table_name, column_name;
```

### 🎯 Boas Práticas de Timezone

1. **SEMPRE use `TIMESTAMP WITH TIME ZONE`** (ou `TIMESTAMPTZ`)
2. **NUNCA use `TIMESTAMP` sem timezone** para dados que precisam de contexto temporal
3. **Armazene em UTC** (automático com TIMESTAMPTZ)
4. **Converta para timezone local** apenas na exibição (queries ou frontend)
5. **Use `NOW()`** para timestamp atual (já retorna em UTC)
6. **Use `AT TIME ZONE 'America/Sao_Paulo'`** para converter para horário de Brasília
7. **Crie índices** em campos de data/hora para performance
8. **Use triggers** para atualizar `updated_at` automaticamente

### 📋 Template Completo de Tabela com Timestamps

```sql
-- Template padrão para novas tabelas
CREATE TABLE nome_da_tabela (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Campos de negócio
  nome TEXT NOT NULL,
  descricao TEXT,
  
  -- Campos de auditoria (SEMPRE incluir)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,  -- Para soft delete
  
  -- Campos de rastreamento
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX idx_nome_da_tabela_created_at ON nome_da_tabela(created_at);
CREATE INDEX idx_nome_da_tabela_updated_at ON nome_da_tabela(updated_at);
CREATE INDEX idx_nome_da_tabela_deleted_at ON nome_da_tabela(deleted_at) WHERE deleted_at IS NULL;

-- Trigger para updated_at
CREATE TRIGGER update_nome_da_tabela_updated_at
  BEFORE UPDATE ON nome_da_tabela
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE nome_da_tabela IS 'Descrição da tabela';
COMMENT ON COLUMN nome_da_tabela.created_at IS 'Data de criação (UTC, exibir em America/Sao_Paulo)';
COMMENT ON COLUMN nome_da_tabela.updated_at IS 'Data de última atualização (UTC, exibir em America/Sao_Paulo)';
COMMENT ON COLUMN nome_da_tabela.deleted_at IS 'Data de exclusão lógica (UTC, exibir em America/Sao_Paulo)';
```

### 🚨 Checklist de Validação de Timezone

Antes de aplicar migration com campos de data/hora:

- [ ] Todos os campos de timestamp usam `TIMESTAMP WITH TIME ZONE`
- [ ] Campos `created_at` e `updated_at` têm `DEFAULT NOW()`
- [ ] Trigger de `updated_at` está configurado
- [ ] Índices criados em campos de data/hora
- [ ] Comentários documentam que timestamps estão em UTC
- [ ] Queries de exibição usam `AT TIME ZONE 'America/Sao_Paulo'` quando necessário
- [ ] Testes validam conversão de timezone corretamente

### ⚠️ Erros Comuns a Evitar

```sql
-- ❌ ERRADO: TIMESTAMP sem timezone
created_at TIMESTAMP DEFAULT NOW()

-- ✅ CORRETO: TIMESTAMPTZ com timezone
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

-- ❌ ERRADO: Converter timezone no armazenamento
created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo')

-- ✅ CORRETO: Armazenar em UTC, converter na query
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- E na query: SELECT created_at AT TIME ZONE 'America/Sao_Paulo' FROM tabela

-- ❌ ERRADO: Comparar datas sem considerar timezone
WHERE created_at >= '2024-01-01'

-- ✅ CORRETO: Especificar timezone na comparação
WHERE created_at >= '2024-01-01 00:00:00-03:00'::TIMESTAMPTZ
-- Ou: WHERE created_at AT TIME ZONE 'America/Sao_Paulo' >= '2024-01-01 00:00:00'
```

### 📚 Referências

- **Timezone do Brasil**: `America/Sao_Paulo` (UTC-3 ou UTC-2 no horário de verão)
- **Função NOW()**: Retorna timestamp atual em UTC
- **Operador AT TIME ZONE**: Converte entre timezones
- **Tipo TIMESTAMPTZ**: Alias para `TIMESTAMP WITH TIME ZONE`

---
