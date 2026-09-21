# Books SND

Plataforma administrativa web interna da **Sonda** para gestão operacional de serviços de TI: books mensais, banco de horas, elogios de clientes, pesquisas de satisfação, requerimentos/faturamento, organograma e plano de ação.

Este arquivo tem só as regras gerais e permanentes. Detalhe por assunto vive nas skills em `.claude/skills/` e é carregado sob demanda — não leia nada preventivamente.

## Stack

React 18 + TypeScript + Vite · TanStack Query · React Hook Form + Zod · shadcn/ui (Radix) + Tailwind · React Router DOM · Supabase (Postgres + Auth PKCE + Storage + Realtime + RLS) · Vercel Functions com Puppeteer (`api/`) + Supabase Edge Functions em Deno (`supabase/functions/`) · `sync-api/` (Node no Render, sincroniza com SQL Server externo) · Vitest + Testing Library + jsdom.

TypeScript é **propositalmente relaxado** (`strict: false`, `noImplicitAny: false`, `strictNullChecks: false` em [tsconfig.app.json](tsconfig.app.json)). Não assuma inferência estrita e não "corrija" isso em massa sem alinhar antes.

## Comandos

```bash
npm run dev          # Vite dev server, porta 8080
npm run dev:vercel   # Vercel dev (inclui as serverless functions em /api)
npm run build        # Build de produção
npm run test         # Vitest watch
npm run test:run     # Vitest single run  ← precisa passar antes de concluir qualquer tarefa
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint (flat config); lint:fix para corrigir
npm run format       # Prettier; format:check para verificar
```

Pre-commit (Husky + lint-staged) roda `eslint --fix` + `prettier --write` nos arquivos staged. CI (`.github/workflows/ci.yml`) roda lint + typecheck + test + build em todo push/PR para `main`.

## Arquitetura: fluxo em camadas

```
Page (src/pages) → Hook (src/hooks, TanStack Query) → Service (src/services) → Supabase
```

- **Nunca** chamar o Supabase direto de componente ou página — sempre via `hooks/` → `services/`.
- Cada domínio tem seus próprios `types/`, service, hook, page e, se preciso, `components/admin/<dominio>/`.
- Autorização em duas camadas: frontend (`ProtectedRoute` por `screenKey`, `ProtectedAction` para ação pontual) **e** RLS no Postgres. RLS é a barreira real; o frontend é UX.
- Hierarquia de permissão: `edit > view > none`.

Estrutura de `src/`:

```
components/{admin/<dominio>, auth, ui, errors, notifications}
config/  contexts/  errors/  hooks/  integrations/supabase/
lib/  pages/{admin}  schemas/  services/  styles/  test/  types/  utils/
```

Nomes: componentes `PascalCase.tsx`, services/hooks/utils `camelCase.ts` (hooks com prefixo `use`), tipos em `src/types/<dominio>.ts`. Alias `@/` → `src/`.

## TDD obrigatório

**Toda implementação é test-first, sem exceção** — feature nova, bugfix e refactor que muda comportamento. Escrever o código e completar a cobertura depois **não** conta como TDD.

Ciclo por camada testável (services → hooks → componentes com lógica relevante):

1. **Red** — escreva o teste do comportamento esperado (em bugfix, um teste que reproduz o bug). Rode e confirme que falha.
2. **Green** — o mínimo de implementação para o teste passar.
3. **Refactor** — limpe mantendo verde.

Padrões de teste: skill `testes`.

## Regras obrigatórias

1. **Nunca logar dados pessoais** (nome, email, ID de usuário, payload de `profiles`/`users`) em `console.log/warn/info`. `console.error` só com `error.message`/`error.code`. É regra de segurança (LGPD), não estilo — o console é visível a qualquer usuário com DevTools. → skill `seguranca`
2. **Toda tabela nova tem RLS habilitado** com políticas para SELECT/INSERT/UPDATE/DELETE usando `(SELECT auth.uid())` (nunca `auth.uid()` direto). Funções e triggers sempre `SECURITY DEFINER SET search_path = public`. Antes de alterar política existente, liste as atuais e faça `DROP POLICY IF EXISTS` de todas antes de recriar — política duplicada é erro recorrente aqui. → skill `criar-migration`
3. **Timestamps sempre `TIMESTAMPTZ DEFAULT NOW()`**. Armazena em UTC; converte para `America/Sao_Paulo` só na exibição/query.
4. **Cache novo precisa ser registrado** em `src/services/clearAllAppCache.ts`. sessionStorage e TanStack Query já são limpos no logout. → skill `padroes-codigo`, `references/cache.md`
5. **`SUPABASE_SERVICE_ROLE_KEY` nunca no frontend** — só em Edge Function/backend. Variáveis `VITE_*` são públicas por definição.
6. **Tela administrativa nova precisa ser registrada** na tabela `screens` e ter permissão em `screen_permissions`, senão fica invisível mesmo com a rota funcionando. → skill `autenticacao`
7. **Layout de página**: `<AdminLayout>` → `<div className="min-h-screen bg-bg-secondary">` → `<div className="px-6 py-6 space-y-8">`. Nunca `container mx-auto px-4`. → skill `design-system`

## Regras de desenvolvimento

- **Não duplicar.** Antes de criar service, hook, componente, tela ou tabela, verifique em `.claude/references/dominios.md` se já existe algo que atenda, e estenda em vez de criar paralelo.
- **Não inventar.** Nenhuma tabela, coluna, endpoint, campo ou API que não exista no código. Na dúvida sobre regra de negócio, procure primeiro no código e nas specs (`.kiro/specs/`), não suponha.
- **Escopo mínimo.** Não alterar funcionalidade fora do pedido, não refatorar de passagem, não tocar arquivo que a tarefa não exige.
- **Solução simples primeiro.** Reutilize o que existe antes de abstrair.
- **Verifique dependências antes de alterar estrutura** — mexer em Permissões, Auth ou Empresas tem raio de impacto amplo (ver mapa de dependências em `.claude/references/dominios.md`).
- **Nunca expor secret, token ou credencial**, nem em comentário, exemplo ou teste.
- Ao terminar, relate objetivamente o que mudou: arquivos tocados e por quê.

## Roteamento: tarefa → skill

Carregue **só** a skill da tarefa em questão; cada uma indica qual referência abrir.

| Tarefa | Skill |
|---|---|
| Feature nova atravessando várias camadas | `criar-feature` |
| Tela/página administrativa nova | `criar-tela` |
| Migration, tabela, coluna, RLS, trigger | `criar-migration` |
| Endpoint serverless (Vercel ou Edge Function) | `criar-api` |
| Sincronização com o SQL Server Aranda, dado que não chegou | `sync-api` |
| Classes Tailwind, layout, filtro, tabela, modal, formulário | `design-system` |
| Escrever service, hook, tratamento de erro, Zod, cache | `padroes-codigo` |
| Log, PII, secret, autorização | `seguranca` |
| Permissão de tela, ProtectedRoute/Action, acesso negado | `autenticacao` |
| Bug reportado | `corrigir-bug` |
| Escrever/rodar teste | `testes` |
| Revisar diff ou PR | `code-review` |
| Publicar, migrar ou reverter | `deploy` |

Referências de projeto (fora de skill): `.claude/references/dominios.md` (mapa domínio → arquivos) e `.claude/references/estrutura.md` (árvore de diretórios e convenções de nome).

`.claude/agents/` tem 9 subagentes por papel. Delegue quando a tarefa é grande a ponto de valer isolar contexto (auditoria em vários arquivos, feature em camadas paralelas) ou quando o usuário pede segunda opinião especializada. Para mudança pequena e local, edite direto.

## Fluxo de trabalho esperado

1. Entender a solicitação.
2. Identificar a skill relevante e carregar só ela.
3. Localizar o código existente (`.claude/references/dominios.md`).
4. Reutilizar estrutura existente; evitar alteração desnecessária.
5. Escrever o teste (Red), implementar (Green), limpar (Refactor).
6. Rodar `npm run test:run`, `npm run typecheck`, `npm run build`.
7. Corrigir o que falhar.
8. Relatar objetivamente o que mudou.

## Avisos deste repositório

- **Toast**: duas convenções coexistem — `sonner` (~54 arquivos) e o hook `useToast` (~59 arquivos), este pensado para substituir o primeiro, migração inacabada. Ao editar arquivo existente siga o padrão *daquele arquivo*; em código novo prefira `useToast`.
- **Lint**: `npm run lint` funciona, mas o baseline tem ~11 erros e ~890 warnings preexistentes. Confira que sua mudança não aumentou a contagem; "lint passou" sozinho não é sinal de qualidade.
- **Credenciais versionadas**: `sync-api/.env.temp` e `sync-api/deployment/.env.production.sondalyze` estão no git com exceção explícita no `.gitignore` — vazamento real (senha de SQL Server, IP interno) ainda não remediado. Ao mexer em `sync-api/`, não replique esse padrão.
- **Arquivos gigantes**: `Dashboard.tsx`, `booksDataCollectorService.ts`, `booksDisparoService.ts` e outros têm 2.000–6.600 linhas. Extraia lógica nova em vez de engordá-los.
- **4 services de PDF** coexistem (`booksPDFService`, `booksPDFServiceV2`, `booksPDFServicePuppeteer`, `puppeteerPDFService`) — confirme qual está em uso antes de estender.
- **`.kiro/`** é legado da ferramenta Kiro, hoje reduzido a `.kiro/specs/` (specs de features já entregues — ainda úteis como referência de regra de negócio). `steering/`, `workflows/` e `skills/` foram removidos: o conteúdo vive em `.claude/`. **`.claude/` é a fonte de verdade do contexto.**
