---
name: criar-migration
description: Safe step-by-step workflow for creating and applying a PostgreSQL/Supabase migration in Books SND, with mandatory RLS-policy-duplication checks. Use whenever the user asks to add/alter a table, column, RLS policy, function or trigger in the database.
---

# Criar Migration

## Objetivo

Aplicar mudança de schema sem duplicar política RLS, sem função insegura e sem quebrar dado existente.

## Quando utilizar

Qualquer alteração em tabela, coluna, índice, política RLS, função ou trigger. Migrations ficam em `supabase/migrations/`. Projeto Supabase: `qiahexepsdggkzgmklhq`.

Para migration complexa ou uma segunda verificação focada só em segurança do banco, delegue ao agente `database-engineer`.

**Antes de criar tabela nova**: confira em `.claude/references/dominios.md` se o domínio já tem tabela que atende — não crie estrutura paralela.

**TDD aplicado a schema**: tenha em mãos a query de verificação (passo 5) antes de escrever a migration e confirme que ela falharia no estado atual. Se a migration tem contraparte em `src/services/`, o teste Vitest do service vem antes do código do service (skill `testes`).

## Regras essenciais

- Toda tabela: `ENABLE ROW LEVEL SECURITY` + políticas para SELECT/INSERT/UPDATE/DELETE
- Toda política: `(SELECT auth.uid())`, nunca `auth.uid()` direto
- Toda função/trigger: `SECURITY DEFINER SET search_path = public`
- Todo timestamp: `TIMESTAMPTZ DEFAULT NOW()`
- Ao mexer em RLS: `DROP POLICY IF EXISTS` de **todas** as políticas antes de recriar
- Nenhuma política `USING (true)` para `authenticated`

## Fluxo de execução

### 1. Verificar estado atual

```sql
-- Políticas existentes na tabela alvo
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'tabela_alvo';

-- Colunas existentes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tabela_alvo' AND table_schema = 'public';

-- RLS habilitado?
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'tabela_alvo';
```

### 2. Escrever a migration nesta ordem

1. `DROP POLICY IF EXISTS` de todas as políticas existentes (se mexer em RLS)
2. `ALTER` / `CREATE TABLE` (estrutura)
3. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
4. `CREATE POLICY` (novas políticas)
5. `CREATE INDEX` (campos de busca/filtro)
6. `CREATE TRIGGER` (ex.: `updated_at`)

Templates: `references/rls.md` (políticas, funções de permissão, verificação de duplicatas) e `references/timezone.md` (tabela com timestamps, trigger de `updated_at`, conversão de coluna).

### 3. Aplicar

Se houver MCP do Supabase conectado nesta sessão, use `apply_migration` com `project_id: "qiahexepsdggkzgmklhq"` e nome descritivo em snake_case. Caso contrário, aplique via Supabase CLI (`supabase db push`) ou SQL Editor e salve o arquivo em `supabase/migrations/`.

### 4. Verificar segurança pós-migration

Rode as queries de auditoria de `references/rls.md` (duplicatas, funções sem `search_path`, tabelas sem RLS). A de duplicatas deve retornar 0 linhas.

### 5. Rodar os Security Advisors do Supabase

Se o MCP estiver disponível, rode a checagem de advisors do tipo "security" e corrija qualquer vulnerabilidade nova.

### 6. Atualizar types

Se o schema mudou, regenere `src/integrations/supabase/types.ts` via MCP/CLI do Supabase.

## Resultado esperado

Migration aplicada, sem duplicata de política, sem alerta de segurança novo, types atualizados, dados existentes preservados.

## Referências relacionadas

- `references/rls.md` — políticas, funções de permissão, queries de auditoria
- `references/timezone.md` — `TIMESTAMPTZ`, trigger de `updated_at`, template de tabela
- Skill `seguranca` — as duas camadas de autorização
- Skill `autenticacao` — registrar tela em `screens`/`screen_permissions`
