# Ambientes, variáveis e observabilidade

## Ambientes

| Ambiente | URL | Branch |
|---|---|---|
| Development | `localhost:8080` | `feature/*` |
| Preview | `*.vercel.app` | branch de PR (deploy automático) |
| Production | `books-sonda.vercel.app` | `main` (deploy automático no merge) |

| Plataforma | Papel |
|---|---|
| Vercel | frontend + serverless em `/api`; build `npm run build`, output `dist/` |
| Supabase | banco, auth, storage, Edge Functions — projeto `qiahexepsdggkzgmklhq` |
| Render | `sync-api` — `https://sync-api-p3jr.onrender.com` |

## Variáveis de ambiente

**Frontend (Vite)** — tudo com prefixo `VITE_` vai para o bundle e é público:

```env
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_[key]
VITE_SYNC_API_URL=https://sync-api-p3jr.onrender.com
```

A anon key é publicável por design — quem protege o dado é a RLS.

**Serverless (`api/`)**: `BROWSER_PATH` (caminho do Chrome/Edge no dev local, para geração de PDF).

**Edge Functions**: `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são injetados automaticamente pelo Supabase. Segredos próprios entram via `supabase secrets set`.

**sync-api (Render)**: credenciais de SQL Server e Supabase — ver skill `sync-api`.

## Serverless Functions (Vercel)

| Endpoint | Runtime | Observação |
|---|---|---|
| `POST /api/pdf/generate` | Node + Puppeteer | `@sparticuz/chromium` em produção, browser local em dev. Timeout 45s (Pro: 300s), 1024 MB recomendado. Entra HTML ou URL, sai PDF binário |
| `POST /api/email/render-image` | Node + Puppeteer | renderiza HTML de elogio como PNG base64 |
| `POST /api/users/create` | Node | criação de usuário |

## Observabilidade

| Fonte | Onde olhar |
|---|---|
| Frontend | console do browser (logs com prefixo emoji 🚀 ✅ ❌ ⚠️) |
| Serverless | logs da função no Vercel |
| Supabase | Dashboard ou MCP `get_logs` |
| Ações de usuário | tabela `audit_logs` |
| Alertas internos | tabela `admin_notifications` (realtime via WebSocket) |
| Performance / Web Vitals | Vercel Analytics |
| Segurança e performance do banco | Supabase Advisors (via MCP) |

## Backup e recuperação

- **Banco**: backup automático diário do Supabase (retenção conforme o plano).
- **Storage**: arquivos no Supabase Storage.
- **Migrations**: versionadas em `supabase/migrations/`, rastreáveis via `list_migrations`.
- **Código**: git/GitHub.

## Segurança de infraestrutura

1. `SUPABASE_SERVICE_ROLE_KEY` nunca no frontend — só Edge Function/backend.
2. `VITE_*` só para dado público.
3. Auth com PKCE flow.
4. Tokens em `sessionStorage` (expiram ao fechar o navegador).

## Performance

Build: Vite com tree-shaking, code splitting por rota, SWC para transforms, chunk splitting vendor/app.
Runtime: TanStack Query com `staleTime`, `React.lazy()` em páginas pesadas, debounce em filtro de busca.
