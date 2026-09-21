# Timestamps e timezone

O Postgres armazena `TIMESTAMPTZ` sempre em **UTC**. O horário de Brasília (`America/Sao_Paulo`, UTC-3) é aplicado só na **exibição/consulta**, nunca no armazenamento.

## Regras

1. Sempre `TIMESTAMP WITH TIME ZONE` (`TIMESTAMPTZ`), nunca `TIMESTAMP` puro.
2. `created_at`/`updated_at` com `DEFAULT NOW()` (já retorna UTC).
3. Converter na query com `AT TIME ZONE 'America/Sao_Paulo'`, não na gravação.
4. Índice em campo de data usado para filtro.
5. Trigger para manter `updated_at`.

## Template de tabela

```sql
CREATE TABLE nome_da_tabela (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  nome TEXT NOT NULL,
  descricao TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,          -- soft delete

  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_nome_da_tabela_created_at ON nome_da_tabela(created_at);
CREATE INDEX idx_nome_da_tabela_deleted_at ON nome_da_tabela(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER update_nome_da_tabela_updated_at
  BEFORE UPDATE ON nome_da_tabela
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON COLUMN nome_da_tabela.created_at IS 'UTC; exibir em America/Sao_Paulo';
```

Função do trigger (criar uma vez no schema, se ainda não existir):

```sql
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
```

## Consultas

```sql
-- Exibir em Brasília
SELECT id, created_at AT TIME ZONE 'America/Sao_Paulo' AS created_at_brasilia
FROM exemplo;

-- Filtrar por data em Brasília
SELECT * FROM exemplo
WHERE created_at AT TIME ZONE 'America/Sao_Paulo' >= '2026-01-01 00:00:00'
  AND created_at AT TIME ZONE 'America/Sao_Paulo' <  '2026-02-01 00:00:00';

-- Inserir instante específico de Brasília
INSERT INTO exemplo (data_evento) VALUES ('2026-01-15 14:30:00-03:00'::TIMESTAMPTZ);
```

## Erros comuns

```sql
-- ❌ sem timezone
created_at TIMESTAMP DEFAULT NOW()
-- ✅
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

-- ❌ converter no armazenamento
created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo')
-- ✅ armazenar UTC, converter na query
created_at TIMESTAMPTZ DEFAULT NOW()

-- ❌ comparar sem timezone
WHERE created_at >= '2026-01-01'
-- ✅
WHERE created_at >= '2026-01-01 00:00:00-03:00'::TIMESTAMPTZ
```

## Converter coluna existente

```sql
ALTER TABLE tabela_existente ADD COLUMN created_at_new TIMESTAMP WITH TIME ZONE;

UPDATE tabela_existente
SET created_at_new = created_at AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE tabela_existente DROP COLUMN created_at;
ALTER TABLE tabela_existente RENAME COLUMN created_at_new TO created_at;
ALTER TABLE tabela_existente ALTER COLUMN created_at SET DEFAULT NOW();

CREATE INDEX idx_tabela_created_at ON tabela_existente(created_at);
```

## Auditar o schema

```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type = 'timestamp without time zone'
ORDER BY table_name, column_name;
-- Qualquer linha retornada precisa ser corrigida.
```
