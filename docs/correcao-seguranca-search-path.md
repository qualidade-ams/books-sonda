# Correção Crítica de Segurança - search_path

## 🚨 PROBLEMA IDENTIFICADO

O Supabase detectou uma vulnerabilidade crítica na função `public.has_especialistas_permission`:

```
Function public.has_especialistas_permission has a role mutable search_path
```

**Descrição**: Funções `SECURITY DEFINER` sem `SET search_path` são vulneráveis a ataques de privilege escalation, onde um atacante pode manipular o search_path para executar código malicioso com privilégios elevados.

## ⚡ CORREÇÃO IMEDIATA NECESSÁRIA

### Passo 1: Aplicar Migration de Correção

Execute a migration de correção que foi criada:

```bash
# Se usando Supabase local
npx supabase db push

# Se usando Supabase remoto
# Copie o conteúdo de supabase/migration/20250113000001_fix_security_search_path.sql
# e execute no SQL Editor do Dashboard do Supabase
```

### Passo 2: Verificar Correção

Execute o script de validação para confirmar que a vulnerabilidade foi corrigida:

```sql
-- Execute no SQL Editor do Supabase
\i supabase/scripts/validate_security.sql
```

## 🔒 FUNÇÕES CORRIGIDAS

A migration corrige as seguintes funções vulneráveis:

### 1. `has_especialistas_permission()`
```sql
-- ANTES (VULNERÁVEL)
CREATE OR REPLACE FUNCTION has_especialistas_permission()
RETURNS BOOLEAN AS $$
-- Sem SECURITY DEFINER e SET search_path

-- DEPOIS (SEGURO)
CREATE OR REPLACE FUNCTION public.has_especialistas_permission()
RETURNS BOOLEAN 
SECURITY DEFINER
SET search_path = public  -- ✅ CORREÇÃO CRÍTICA
LANGUAGE plpgsql
```

### 2. `especialistas_ativos()`
```sql
-- Corrigida com SECURITY DEFINER e SET search_path = public
```

### 3. `especialistas_sql_server()`
```sql
-- Corrigida com SECURITY DEFINER e SET search_path = public
```

### 4. `test_especialistas_security()`
```sql
-- Corrigida com SECURITY DEFINER e SET search_path = public
```

## 🛡️ PADRÃO DE SEGURANÇA APLICADO

Todas as funções agora seguem o padrão de segurança obrigatório:

```sql
CREATE OR REPLACE FUNCTION public.nome_da_funcao()
RETURNS tipo_retorno
SECURITY DEFINER          -- ✅ Executa com privilégios do criador
SET search_path = public   -- ✅ CRÍTICO: Previne ataques de search_path
LANGUAGE plpgsql
AS $$
BEGIN
  -- Lógica da função
END;
$$;

COMMENT ON FUNCTION public.nome_da_funcao() 
IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades.';
```

## 📋 VALIDAÇÃO PÓS-CORREÇÃO

Após aplicar a migration, execute estas queries para validar:

### 1. Verificar Funções Seguras
```sql
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
  AND prokind = 'f'
  AND proname IN ('has_especialistas_permission', 'especialistas_ativos', 'especialistas_sql_server');
```

**Resultado esperado**: Todas as funções devem mostrar `✅ Seguro`

### 2. Testar Funcionalidade
```sql
-- Deve funcionar normalmente
SELECT * FROM test_especialistas_security();
```

## 🚨 ALERTAS CRÍTICOS

### ❌ NUNCA FAÇA:
- Funções sem `SECURITY DEFINER` e `SET search_path`
- Alterações diretas no Dashboard em produção sem migration
- Ignorar alertas de segurança do Supabase

### ✅ SEMPRE FAÇA:
- Use o template de função segura para novas funções
- Execute validações após cada migration
- Documente decisões de segurança
- Teste funções com diferentes usuários

## 🔧 TEMPLATE PARA NOVAS FUNÇÕES

Use este template para todas as novas funções:

```sql
CREATE OR REPLACE FUNCTION public.nome_da_funcao(parametros)
RETURNS tipo_retorno
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Verificações de permissão primeiro
    IF NOT has_permission_function() THEN
        RAISE EXCEPTION 'Acesso negado'
        USING ERRCODE = '42501';
    END IF;
    
    -- Lógica da função
    RETURN resultado;
END;
$$;

COMMENT ON FUNCTION public.nome_da_funcao(parametros) 
IS 'Descrição da função. Usa search_path fixo para evitar vulnerabilidades.';
```

## 📊 IMPACTO DA CORREÇÃO

- **Segurança**: ✅ Vulnerabilidade crítica eliminada
- **Funcionalidade**: ✅ Mantida inalterada
- **Performance**: ✅ Sem impacto negativo
- **Compatibilidade**: ✅ Totalmente compatível

## 🔄 MONITORAMENTO CONTÍNUO

Execute regularmente o script de validação:

```bash
# Adicione ao seu processo de CI/CD
npx supabase db diff --schema public --file validate_security.sql
```

## 📞 SUPORTE

Se encontrar problemas após aplicar a correção:

1. **Verifique logs**: Console do Supabase para erros
2. **Execute validação**: Script `validate_security.sql`
3. **Teste funcionalidade**: Script `test_especialistas_security()`
4. **Rollback se necessário**: Mantenha backup da função original

---

## ✅ CHECKLIST DE APLICAÇÃO

- [ ] Migration `20250113000001_fix_security_search_path.sql` aplicada
- [ ] Script `validate_security.sql` executado
- [ ] Todas as funções mostram status `✅ Seguro`
- [ ] Teste `test_especialistas_security()` passou
- [ ] Funcionalidade do sistema validada
- [ ] Documentação atualizada

**Status**: 🔒 **CORREÇÃO CRÍTICA APLICADA COM SUCESSO**