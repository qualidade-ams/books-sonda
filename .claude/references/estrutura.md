# Estrutura de diretórios

Consulte quando precisar localizar onde um tipo de arquivo mora, ou decidir onde colocar um arquivo novo.

## Raiz

| Diretório | Conteúdo |
|---|---|
| `src/` | Aplicação React (ver abaixo) |
| `api/` | Vercel Serverless Functions (`pdf/generate.ts`, `email/render-image.ts`, `users/create.ts`) |
| `supabase/migrations/` | Migrations SQL versionadas |
| `supabase/functions/` | Edge Functions Deno |
| `sync-api/` | Serviço Node separado (serviço Windows + Cloudflare Tunnel) que sincroniza com SQL Server externo |
| `scripts/` | Scripts utilitários de manutenção |
| `.claude/` | **Fonte de verdade** do contexto: `skills/`, `agents/`, `references/` |
| `.kiro/` | Legado da ferramenta Kiro: `steering/` (docs longas), `specs/` (specs de features já entregues), `workflows/` e `skills/` (duplicatas do `.claude/`) |

## `src/`

```
src/
├── components/
│   ├── admin/            # Componentes de domínio, um subdiretório por domínio
│   │   ├── LayoutAdmin.tsx   # <AdminLayout> — wrapper de toda página administrativa
│   │   ├── Sidebar.tsx       # Menu lateral (registrar tela nova aqui)
│   │   └── <dominio>/        # books, banco-horas, elogios, requerimentos, ...
│   ├── auth/             # ProtectedRoute, ProtectedAction
│   ├── errors/           # Error boundaries
│   ├── notifications/
│   └── ui/               # shadcn/ui — base de toda UI, não reinventar
├── config/               # Configuração estática
├── contexts/             # PermissionsContext e afins
├── errors/               # Classes de erro do domínio
├── hooks/                # TanStack Query; um hook por domínio (use<Dominio>.ts)
├── integrations/supabase/   # client.ts e types.ts (gerado)
├── lib/                  # utilitários de biblioteca (cn, etc.)
├── pages/
│   ├── admin/            # Telas administrativas (uma por rota)
│   └── pdf/              # Views usadas na geração de PDF
├── schemas/              # Schemas Zod compartilhados
├── services/             # Acesso ao Supabase; singletons
├── styles/
├── test/                 # setup.ts, integration/, e2e/
├── types/                # <dominio>.ts
└── utils/                # formatters, helpers puros
```

Testes moram em `__tests__/` dentro da camada testada: `services/__tests__/`, `hooks/__tests__/`, `utils/__tests__/`, `schemas/__tests__/`.

## Convenções de nome

| Item | Convenção | Exemplo |
|---|---|---|
| Componente | PascalCase.tsx | `BookPrintView.tsx` |
| Página | PascalCase.tsx | `GeracaoBooks.tsx` |
| Service | camelCase.ts, sufixo `Service` | `booksService.ts` |
| Hook | camelCase.ts, prefixo `use` | `useBooks.ts` |
| Tipos | camelCase.ts por domínio | `types/permissions.ts` |
| Utils | camelCase.ts | `formatters.ts` |
| Interface | PascalCase descritivo | `BookData`, `UserPermissions` |
| Type (union) | PascalCase | `PermissionLevel` |
| Constante | SCREAMING_SNAKE_CASE | `MAX_RETRIES` |
| Migration | `<timestamp>_<snake_case>.sql` | `20260115_add_rls_books.sql` |

Alias de import: `@/` → `src/`.
