# Migrations legadas (arquivo morto)

Em 14/10/2026 a estrutura real do banco foi versionada num baseline:

- `supabase/migrations/20261014140000_baseline_schema.sql`: schema completo, gerado com `supabase db dump`
- `supabase/migrations/20261014140001_baseline_storage_cron.sql`: buckets e políticas do Storage e jobs do pg_cron

Tudo o que estava aqui já está contido no baseline. As pastas foram mantidas só como histórico e **não devem ser aplicadas**:

| Pasta | Origem | Arquivos |
|---|---|---|
| `migration/` | antiga `supabase/migration/`, sem ordem definida (muitos arquivos sem data) | 317 |
| `migrations/` | antiga `supabase/migrations/` até 05/10/2026 | 41 |

Motivos (Inventário de Regras e Funcionalidades Atuais, seção 4): havia três pastas de migrations sem ordem definida, e várias tabelas, colunas e funções existiam só no banco. Com isso não dava para recriar o ambiente a partir do código.

## A partir de agora

- Uma única pasta: `supabase/migrations/`, só com migrations **posteriores** ao baseline, sempre com data no nome (`AAAAMMDDHHMMSS_descricao.sql`).
- Migration criada antes do baseline e aplicada depois dele, como a `20261014000001_create_notificacoes.sql` da branch `feat/notificacoes-sino`, já está no baseline. No merge, ela vem para esta pasta (`_legado/migrations/`).
- `sync-api/migrations/` continua onde está: são scripts do serviço de sincronização e também estão refletidos no baseline.

## Pendência conhecida

O histórico do Supabase (`supabase_migrations.schema_migrations`) tem cerca de 140 versões aplicadas pelo MCP, com nomes que não correspondem a arquivos do repositório, e não registra as migrations aplicadas pelo SQL Editor. Antes de usar `supabase db push`, é preciso alinhar esse histórico com `supabase migration repair`, marcando o baseline como aplicado.
