# Políticas RLS

Este projeto tem histórico recorrente de **políticas duplicadas**. Os passos abaixo não são opcionais.

## Regras de ouro

1. Remover **todas** as políticas antigas antes de criar novas.
2. Nunca `USING (true)` ou `WITH CHECK (true)` para `authenticated` (só para `service_role`).
3. Usar função de verificação de permissão em vez de repetir a lógica em cada política.
4. Verificar duplicatas depois de criar.
5. Toda função/trigger com `SECURITY DEFINER SET search_path = public`.
6. Sempre `(SELECT auth.uid())`, nunca `auth.uid()` direto.

## Por que `(SELECT auth.uid())`

```sql
-- ❌ LENTO: reavalia a função para cada linha
auth.uid() = user_id
current_setting('app.user_id') = user_id

-- ✅ RÁPIDO: avalia uma vez por query
(SELECT auth.uid()) = user_id
(SELECT current_setting('app.user_id')) = user_id
```

## Passo 1 — listar o que existe

```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'tabela_alvo';
```

## Passo 2 — dropar TODAS as listadas

```sql
DROP POLICY IF EXISTS "politica_1" ON tabela_alvo;
DROP POLICY IF EXISTS "politica_2" ON tabela_alvo;
-- ... uma linha para cada política retornada no passo 1
```

## Passo 3 — habilitar RLS e criar as novas

```sql
ALTER TABLE tabela_alvo ENABLE ROW LEVEL SECURITY;
```

### Políticas por dono do registro

```sql
CREATE POLICY "Users can view own data" ON tabela_alvo
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own data" ON tabela_alvo
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own data" ON tabela_alvo
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own data" ON tabela_alvo
  FOR DELETE USING ((SELECT auth.uid()) = user_id);
```

### Políticas por permissão de tela (padrão RBAC do projeto)

```sql
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

CREATE POLICY "authenticated_select_tabela"
  ON tabela_alvo FOR SELECT
  TO authenticated
  USING (user_has_permission());
```

## Passo 4 — verificar duplicatas (deve retornar 0 linhas)

```sql
SELECT tablename, cmd, array_agg(policyname) AS duplicadas, COUNT(*)
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'tabela_alvo'
GROUP BY tablename, cmd
HAVING COUNT(*) > 1;
```

Para falhar a própria migration se houver duplicata:

```sql
DO $$
DECLARE duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count FROM (
    SELECT tablename, cmd FROM pg_policies
    WHERE tablename = 'tabela_alvo'
    GROUP BY tablename, cmd HAVING COUNT(*) > 1
  ) d;

  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Políticas duplicadas em tabela_alvo';
  END IF;
END $$;
```

## Funções e triggers seguros

```sql
-- ✅
CREATE OR REPLACE FUNCTION public.nome_da_funcao()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN NEW;
END;
$$;
```

Sem `SET search_path = public` o Supabase emite o alerta "Function has a role mutable search_path" — é vetor de injeção via `search_path` mutável.

## Auditoria do schema inteiro

```sql
-- Tabelas sem RLS
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false
  AND tablename NOT LIKE 'pg_%' AND tablename NOT LIKE 'sql_%';

-- Funções sem search_path fixo
SELECT proname, prosecdef, proconfig
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND prokind = 'f'
  AND (proconfig IS NULL OR NOT ('search_path=public' = ANY(proconfig)));

-- Políticas não otimizadas (auth.uid() sem SELECT)
SELECT tablename, policyname, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND qual LIKE '%auth.uid()%'
  AND qual NOT LIKE '%(SELECT auth.uid())%';
```

## Nunca faça

- Tabela sem RLS habilitado
- Conjunto incompleto de políticas (falta INSERT, UPDATE ou DELETE)
- `auth.uid()` direto em política
- Alteração direta pelo Dashboard em produção
