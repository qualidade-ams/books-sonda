---
name: sync-api
description: Serviço Node separado (sync-api/) que sincroniza o SQL Server Aranda com o Supabase — pesquisas, especialistas, apontamentos e tickets. Use ao mexer em sincronização, quando dados do Aranda não aparecem no sistema, ao adicionar ou depurar um endpoint de sync, ou ao mexer em deploy/variáveis do serviço (servidor Windows + Cloudflare Tunnel).
---

# sync-api — sincronização SQL Server → Supabase

## Objetivo

Trazer dados do SQL Server **Aranda** (rede privada da Sonda) para tabelas do Supabase, de forma incremental.

## Quando utilizar

Pesquisa/apontamento/ticket que não apareceu no sistema, endpoint de sync novo, ajuste em mapeamento de campo, deploy ou variável do serviço no servidor Windows.

Isto é um projeto Node **separado** do frontend: `package.json`, `tsconfig` e deploy próprios. Não é build pelo Vite e não passa pelo ESLint da raiz (`eslint.config.js` ignora `sync-api/**`). Os testes ficam em `sync-api/src/**/__tests__/` e rodam pelo **Vitest da raiz** (`npm run test:run` ou `npx vitest run sync-api`); o `tsconfig` do sync-api exclui `__tests__` do build. Código novo aqui também é test-first. Para mockar o Supabase use `src/__tests__/helpers/supabaseFake.ts`; para testar lógica que depende do `server.ts`, receba as dependências por parâmetro (o `server.ts` exige variáveis de ambiente e sobe o servidor ao ser importado).

## Regras essenciais

- **Requer VPN.** O SQL Server está em rede privada (`172.26.2.136`). Sem VPN ativa, toda chamada falha por timeout de conexão — antes de investigar qualquer bug de sync, confirme a VPN (`ping 172.26.2.136`).
- **Nunca hardcode credencial.** Toda configuração vem de `process.env`, sem valor de fallback literal no código. Existe dívida histórica exatamente disso neste diretório — não a replique.
- Nenhum arquivo `.env` novo versionado. O `.gitignore` já cobre `sync-api/**/.env*`; a única exceção legítima é `.env.example`, com valores de placeholder.
- Sync é **incremental por padrão**: só traz registros novos/alterados. Os endpoints `-full` reprocessam tudo e são caros — use só quando a base estiver inconsistente.
- O serviço usa a **service key** do Supabase (escreve ignorando RLS). Toda escrita nova precisa ser conferida à mão: aqui não há rede de proteção do banco.

## Estrutura

```
sync-api/
├── src/
│   ├── server.ts          # Express, ~4.000 linhas, todas as rotas
│   ├── routes/
│   └── services/
│       ├── incrementalSyncPesquisasService.ts
│       ├── incrementalSyncApontamentosService.ts
│       ├── incrementalSyncTicketsService.ts
│       ├── inconsistenciasDeteccaoService.ts
│       └── fixNullFieldsService.ts
├── scripts/               # validação e diagnóstico pontual
├── migrations/            # SQL aplicado ao Supabase por este serviço
└── deployment/            # serviço Windows, teste da instalação, guia de deploy (DEPLOY_SONDALYZE.md)
```

`server.ts` tem ~4.000 linhas e concentra todas as rotas. Lógica nova vai para `src/services/`, não para o final do `server.ts`.

## Agendamento (tela "Sincronização SQL Server")

Execução manual e agendada passam pela **mesma** sequência, em `src/scheduler/`:

| Arquivo | Papel |
|---|---|
| `orquestradorSync.ts` | Roda as etapas (pesquisas → especialistas → apontamentos → tickets → código de resolução → validação → inconsistências → ajustes retroativos), grava `sync_execucoes` (status + logs) e `sync_metadata`. Uma execução por vez: manual concorrente → 409; agendada concorrente → espera o próximo ciclo. |
| `agendador.ts` | Ciclo de 60s: lê `sync_agendamentos` ativos, calcula `proxima_execucao` quando está nula (o trigger do banco zera ao mudar a regra) e dispara o vencido mais antigo. Execução perdida roda uma vez ao voltar. Na subida marca `executando` órfãs como `interrompida`. |
| `recorrencia.ts` | Cálculo puro da próxima execução (diário/semanal/mensal × horários fixos ou "a cada X h"), fuso `America/Sao_Paulo`. |
| `autenticacao.ts` | Middleware que valida o JWT do Supabase e o nível na tela `sincronizacao_sql_server`. |
| `rotas.ts` | `POST /api/sync-jobs/executar` (edit), `POST /api/sync-jobs/proximas-execucoes` (view), `GET /api/sync-jobs/status` (view). |

- O agendador **só liga com `SCHEDULER_ENABLED=true`** — deixe `false` em dev local para não disparar jobs contra o Supabase de produção.
- A detecção de ajustes retroativos é um port de `src/services/bancoHorasQuarentenaService.ts` (frontend) em `src/services/deteccaoAjustesRetroativosService.ts`. Ao mudar a regra num lado, mude no outro.
- Para uma etapa nova: função que recebe `pool` (sem abrir/fechar o pool global) e registro em `etapas` no `server.ts`.

## Tabelas sincronizadas

| SQL Server (Aranda) | Supabase | Observação |
|---|---|---|
| `AMSpesquisa` | `pesquisas_satisfacao` | pesquisas de satisfação |
| `AMSespecialistas` | `especialistas` | especialistas/analistas |
| `AMSapontamento` | `apontamentos_aranda` | desde 01/01/2026 |
| `AMSticketsabertos` | `apontamentos_tickets_aranda` | desde 01/01/2026 |

## Endpoints principais

Por domínio, o padrão se repete: `test-connection*`, `table-structure*`, `sync-*`, `sync-*-full`, `sync-*-incremental`.

| Rota | Uso |
|---|---|
| `GET /health` | liveness |
| `GET /api/test-connection` | valida VPN + credenciais do SQL Server — **primeiro passo de qualquer diagnóstico** |
| `GET /api/table-structure` | colunas da tabela de origem (útil quando o Aranda muda schema) |
| `POST /api/sync-pesquisas` / `-full` / `-por-chamados` | sync de pesquisas |
| `POST /api/sync-especialistas` | sync de especialistas |
| `POST /api/sync-apontamentos` / `-full` / `-incremental` / `-por-chamados` | sync de apontamentos |
| `POST /api/sync-tickets` | sync de tickets |
| `GET /api/validate-sync` | compara origem e destino |
| `GET /api/stats`, `/api/stats-pesquisas` | contagens |
| `POST /api/fix-null-fields-apontamentos` | corrige campos nulos após sync parcial |

## Fluxo de diagnóstico

1. VPN ativa? `ping 172.26.2.136`.
2. `GET /api/test-connection` — isola problema de rede/credencial de problema de dados.
3. `GET /api/table-structure` — confirma que a coluna esperada ainda existe na origem.
4. `GET /api/validate-sync` — quantifica a divergência antes de decidir por incremental ou `-full`.
5. Só então leia o service do domínio em `src/services/`.
6. Logs do serviço no servidor: `C:\apps\books-sonda-sync-api\logs\service.log`; túnel: Visualizador de Eventos (origem `Cloudflared`).

## Ambiente

```bash
cd sync-api
npm install
cp .env.example .env   # preencher com credenciais reais, nunca commitar
npm run dev            # ts-node src/server.ts
npm run build && npm start
```

Variáveis: `SQL_SERVER`, `SQL_PORT`, `SQL_DATABASE`, `SQL_USER`, `SQL_PASSWORD`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `PORT`, `HOST` (padrão `127.0.0.1`), `NODE_ENV`, `SCHEDULER_ENABLED`.

Produção: serviço Windows no servidor interno (mesmo do SQL Server), exposto só pelo **Cloudflare Tunnel** em `https://sync-api.sondalyze.com.br`. O frontend chega nele por `VITE_SYNC_API_URL`. Não há nginx nem certificado próprio: a Cloudflare entrega o HTTPS.

- A API escuta só em `127.0.0.1` (`HOST`); o Public Hostname do túnel precisa apontar para `http://127.0.0.1:3001` — com `localhost` o Windows pode resolver para `::1` e o túnel devolve 502.
- A Cloudflare corta requisições com mais de **100s** (erro 524). Endpoint novo que demora deve responder na hora e rodar em background, como `/api/sync-jobs/executar`.
- Guia completo: `deployment/DEPLOY_SONDALYZE.md`; teste da instalação: `deployment/test-installation.bat`.

## Referências relacionadas

Skill `seguranca` (secrets) · skill `deploy`, `references/infra.md` (ambientes e variáveis) · `.claude/references/dominios.md` (domínios que consomem esses dados: Pesquisas, Banco de Horas, Requerimentos).
