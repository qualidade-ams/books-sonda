# Troubleshooting: Nomes de Usuários não Aparecem

## Guia Rápido de Diagnóstico

Se os nomes dos usuários não estão aparecendo na tela de Lançar Requerimentos, siga este guia passo a passo.

---

## Passo 1: Verificar Console do Navegador

Abra o **Console do Navegador** (F12) e procure pelos logs:

### ✅ Logs de Sucesso (Tudo OK)

```
🔍 resolverNomesUsuarios - Iniciando busca para IDs: ['b83ca9e0...']
📊 resolverNomesUsuarios - Resultado da busca profiles: { encontrados: 1, erro: null }
✅ Profile encontrado: b83ca9e0... -> "Giselle Silva Lobo"
📋 Mapa final de usuários: ['b83ca9e0... -> "Giselle Silva Lobo"']
```

**Se você vê isso**: O sistema está funcionando corretamente! ✅

---

### ❌ Problema 1: Nenhum Profile Encontrado (RLS)

```
🔍 resolverNomesUsuarios - Iniciando busca para IDs: ['b83ca9e0...']
📊 resolverNomesUsuarios - Resultado da busca profiles: { encontrados: 0, erro: null }
⚠️ Nenhum profile encontrado na busca inicial
```

**Causa**: Políticas RLS bloqueando leitura de profiles de outros usuários

**Solução**: Execute a migration de correção de RLS

```sql
-- No Supabase SQL Editor, execute:
-- supabase/migration/fix_profiles_rls_policies.sql
```

---

### ❌ Problema 2: Erro ao Buscar Profiles

```
🔍 resolverNomesUsuarios - Iniciando busca para IDs: ['b83ca9e0...']
❌ Erro ao buscar profiles: { code: 'PGRST...' }
```

**Causa**: Problema de permissão ou conexão com Supabase

**Solução**: 
1. Verificar se o usuário está autenticado
2. Verificar conexão com Supabase
3. Verificar se a tabela `profiles` existe

---

### ❌ Problema 3: Profile Encontrado mas Nome Vazio

```
✅ Profile encontrado: b83ca9e0... -> ""
```

**Causa**: Campo `full_name` está vazio no banco

**Solução**: Execute a migration de sincronização

```sql
-- No Supabase SQL Editor, execute:
-- supabase/migration/fix_user_names_display.sql
```

---

## Passo 2: Verificar Políticas RLS no Supabase

Execute no **Supabase SQL Editor**:

```sql
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;
```

### ✅ Resultado Esperado (Correto)

| policyname | roles | cmd | qual |
|------------|-------|-----|------|
| authenticated_users_can_read_all_profiles | {authenticated} | SELECT | true |
| users_can_update_own_profile | {authenticated} | UPDATE | (auth.uid() = id) |

**Se você vê isso**: Políticas RLS estão corretas! ✅

---

### ❌ Resultado Incorreto (Problema)

Se você vê políticas como:
- "Users can read own profile" com `qual = (auth.uid() = id)`
- Múltiplas políticas conflitantes

**Solução**: Execute a migration de correção de RLS

```sql
-- supabase/migration/fix_profiles_rls_policies.sql
```

---

## Passo 3: Verificar Dados na Tabela Profiles

Execute no **Supabase SQL Editor**:

```sql
SELECT 
  id,
  email,
  full_name,
  CASE 
    WHEN full_name IS NULL OR full_name = '' THEN '❌ SEM NOME'
    ELSE '✅ OK'
  END as status
FROM profiles
ORDER BY email;
```

### ✅ Resultado Esperado (Correto)

| id | email | full_name | status |
|----|-------|-----------|--------|
| b83ca9e0... | giselle.lobo@sonda.com | Giselle Silva Lobo | ✅ OK |
| 970b91ed... | maria.naime@sonda.com | Maria Luiza Saliba Silva Naime | ✅ OK |

**Se você vê isso**: Dados estão corretos! ✅

---

### ❌ Resultado Incorreto (Problema)

Se você vê:
- Usuários com `full_name` vazio ou NULL
- Usuários faltando na tabela

**Solução**: Execute a migration de sincronização

```sql
-- supabase/migration/fix_user_names_display.sql
```

---

## Passo 4: Testar Busca Manual

Execute no **Supabase SQL Editor** (substitua o ID pelo ID do usuário problemático):

```sql
-- Buscar profile específico
SELECT * FROM profiles 
WHERE id = 'b83ca9e0-5012-4baf-adf9-2ee78...';

-- Buscar no auth.users
SELECT 
  id,
  email,
  raw_user_meta_data->>'full_name' as full_name_meta,
  raw_user_meta_data->>'name' as name_meta
FROM auth.users 
WHERE id = 'b83ca9e0-5012-4baf-adf9-2ee78...';
```

**Compare os resultados**:
- Se `profiles` retorna vazio mas `auth.users` tem dados → Execute migration de sincronização
- Se ambos retornam vazio → Usuário não existe ou foi deletado
- Se `profiles` tem dados mas `full_name` está vazio → Execute migration de sincronização

---

## Passo 5: Verificar Função RPC (Fallback)

Execute no **Supabase SQL Editor**:

```sql
-- Testar função RPC
SELECT * FROM get_users_by_ids(ARRAY['b83ca9e0-5012-4baf-adf9-2ee78...']::UUID[]);
```

### ✅ Resultado Esperado (Correto)

```
id                                   | email                    | raw_user_meta_data
-------------------------------------|--------------------------|-------------------
b83ca9e0-5012-4baf-adf9-2ee78...    | giselle.lobo@sonda.com  | {"full_name": "Giselle Silva Lobo"}
```

**Se você vê isso**: Função RPC está funcionando! ✅

---

### ❌ Resultado Incorreto (Problema)

Se você vê erro:
```
ERROR: function get_users_by_ids(uuid[]) does not exist
```

**Solução**: Execute a migration que cria a função RPC

```sql
-- supabase/migration/fix_user_names_display.sql
```

---

## Checklist de Correção Completa

Execute as migrations na ordem:

### 1️⃣ Corrigir Políticas RLS (CRÍTICO)

```sql
-- supabase/migration/fix_profiles_rls_policies.sql
```

**Verifica**:
- ✅ Remove políticas conflitantes
- ✅ Cria política para ler todos os profiles
- ✅ Mantém segurança (só pode editar próprio perfil)

### 2️⃣ Sincronizar Dados e Criar Função RPC

```sql
-- supabase/migration/fix_user_names_display.sql
```

**Verifica**:
- ✅ Cria função RPC `get_users_by_ids`
- ✅ Sincroniza `auth.users` → `profiles`
- ✅ Preenche `full_name` vazios

### 3️⃣ Verificar Resultados

```sql
-- Ver políticas ativas
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'profiles';

-- Ver dados sincronizados
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN full_name IS NOT NULL AND full_name != '' THEN 1 END) as com_nome,
  COUNT(CASE WHEN full_name IS NULL OR full_name = '' THEN 1 END) as sem_nome
FROM profiles;
```

**Resultado esperado**:
- 4 políticas ativas (read all, update own, service_role insert, service_role full)
- `sem_nome = 0` (todos os usuários têm nome)

---

## Teste Final no Frontend

1. **Limpar cache do navegador** (Ctrl+Shift+R ou Cmd+Shift+R)
2. **Recarregar a página** de Lançar Requerimentos
3. **Abrir Console** (F12) e verificar logs
4. **Verificar tabela**: Nomes devem aparecer abaixo dos badges de módulo

### ✅ Sucesso

Você deve ver:
- Nomes completos nos logs do console
- Primeiro e último nome na tabela (ex: "Giselle Lobo")
- Tooltip com nome completo ao passar o mouse

---

## Ainda Não Funciona?

Se após seguir todos os passos o problema persistir:

### 1. Verificar Autenticação

```typescript
// No console do navegador
console.log('Usuário autenticado:', await supabase.auth.getUser());
```

### 2. Verificar Conexão Supabase

```typescript
// No console do navegador
const { data, error } = await supabase.from('profiles').select('*').limit(1);
console.log('Teste conexão:', { data, error });
```

### 3. Verificar Versão do Supabase Client

```typescript
// No console do navegador
console.log('Supabase version:', supabase.version);
```

### 4. Logs Detalhados

Ative logs detalhados no Supabase:

```typescript
// Em src/integrations/supabase/client.ts
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'x-my-custom-header': 'debug-mode'
    }
  },
  // Ativar logs
  realtime: {
    log_level: 'debug'
  }
});
```

---

## Contato para Suporte

Se o problema persistir após seguir este guia:

1. **Copie os logs do console** (todos os logs com 🔍 📊 ✅ ⚠️ ❌)
2. **Tire screenshot** da tabela profiles no Supabase
3. **Tire screenshot** das políticas RLS
4. **Documente** os passos que já tentou

Isso ajudará a identificar o problema específico do seu ambiente.
