# Mapa de domínios → arquivos

Consulte **antes de criar qualquer arquivo novo**: se o domínio já existe, estenda o service/hook existente em vez de criar um paralelo.

Caminhos relativos a `src/`. Um domínio sempre segue `types/ → services/ → hooks/ → pages/admin/ → components/admin/<dominio>/`.

| Domínio | Types | Services | Hooks | Pages (`pages/admin/`) | Components (`components/admin/`) |
|---|---|---|---|---|---|
| **Books** (geração/envio de books mensais) | `books.ts`, `clientBooks.ts` | `booksService`, `booksDataCollectorService`, `booksPDFService`, `booksDisparoService` | `useBooks`, `useBooksStats` | `GeracaoBooks`, `HistoricoBooks`, `ControleDisparos`, `ControleDisparosPersonalizados` | `books/`, `client-books/`, `disparos/` |
| **Banco de Horas** | `bancoHoras.ts` | `bancoHorasService`, `bancoHorasAlocacoesService`, `bancoHorasExcedentesService`, `bancoHorasReajustesService`, `bancoHorasRepasseService` | `useBancoHoras`, `useBancoHorasReajustes`, `useBancoHorasVersoes` | `ControleBancoHoras`, `AuditoriaBancoHoras`, `AjustesRetroativos` | `banco-horas/` |
| **Elogios** | `elogios.ts` | `elogiosService`, `elogiosTemplateService` | `useElogios`, `useElogiosTemplates` | `LancarElogios`, `EnviarElogios` | `elogios/` |
| **Pesquisas de Satisfação (AMS)** | `pesquisasSatisfacao.ts`, `pesquisaMensalAMS.ts` | `pesquisasSatisfacaoService` | `usePesquisasSatisfacao`, `usePesquisaMensalAMS` | `LancarPesquisas`, `VisualizarPesquisas`, `PesquisaMensalAMS` | `pesquisas-satisfacao/` |
| **Requerimentos / Faturamento** | `requerimentos.ts` | `requerimentosService`, `faturamentoService` | `useRequerimentos`, `useFaturamento` | `LancarRequerimentos`, `FaturarRequerimentos` | `requerimentos/` |
| **Permissões (RBAC)** | `permissions.ts` | `permissionsService`, `screenService` | `usePermissions` | `GroupManagement`, `UserGroupAssignment`, `UserManagement` | `groups/`, `grupos/` |
| **Organograma** | `organograma.ts` | — | `useOrganograma` | `Organograma` | `organograma/` |
| **Plano de Ação** | `planoAcao.ts`, `planoAcaoContatos.ts` | `planoAcaoService`, `planoAcaoContatosService` | `usePlanosAcao`, `usePlanoAcaoContatos` | `PlanoAcao` | `plano-acao/` |
| **Email / Templates** | — | `emailService`, `clientBooksTemplateService` | `useEmailTemplates`, `useBookTemplates` | `EmailConfig` | `email/`, `templates/` |
| **Auditoria / Monitoramento** | `audit.ts` | `auditService`, `auditLogger` | `useEmailLogs`, `useVigenciaMonitor` | `AuditLogs`, `MonitoramentoVigencias` | `auditoria/` |
| **Clientes / Empresas / Taxas** | `clientBooks.ts` | — | — | `Clientes`, `EmpresasClientes`, `CadastroTaxasClientes` | `taxas/` |
| **Sincronização SQL Server** (agendamentos, execução manual, histórico — roda no `sync-api/`) | `syncAgendamentos.ts` | `syncAgendamentosService`, `sqlServerSyncPesquisasService` (só consultas de última sincronização) | `useSyncAgendamentos`, `usePesquisasSqlServer` | `SincronizacaoSqlServer` | `sincronizacao/`, `pesquisas-satisfacao/SyncSelectionModal` |

**Contexto cross-domain** (não pertencem a um domínio só): `contexts/PermissionsContext.tsx`, `hooks/useAuth.tsx`, `components/auth/ProtectedRoute.tsx`, `components/auth/ProtectedAction.tsx`, `services/clearAllAppCache.ts`, `components/admin/LayoutAdmin.tsx`, `components/admin/Sidebar.tsx`.

## Tabelas principais por domínio

Confira aqui antes de criar tabela nova — o domínio provavelmente já tem onde guardar o dado.

| Domínio | Tabelas |
|---|---|
| Books | `books`, `empresas`, `disparos` |
| Banco de Horas | `banco_horas`, `alocacoes`, `banco_horas_calculos`, `banco_horas_segmentados` |
| Elogios | `elogios` |
| Pesquisas | `pesquisas_satisfacao` |
| Requerimentos | `requerimentos`, `faturamento` |
| Permissões | `user_groups`, `screens`, `screen_permissions`, `profiles` |
| Plano de Ação | `planos_acao` |
| Templates | `email_templates` |
| Auditoria | `audit_logs`, `admin_notifications` |
| Sincronização (via `sync-api/`) | `especialistas`, `apontamentos_aranda`, `apontamentos_tickets_aranda`, `sync_metadata`, `sync_agendamentos`, `sync_execucoes` |

## Dependências entre domínios

```
Permissões ← todos (ProtectedRoute/ProtectedAction)
Auth       ← todos (useAuth)
Empresas   ← Books, Elogios, Pesquisas, Banco de Horas, Requerimentos
Templates  ← Books (PDF), Elogios (email), Pesquisas (email)
Auditoria  ← todos (audit_logs)
```

Mexer em Permissões, Auth ou Empresas tem raio de impacto amplo — verifique os consumidores antes de alterar assinatura.

## Serverless e integrações

| O quê | Onde |
|---|---|
| PDF (Puppeteer) | `api/pdf/generate.ts` |
| Renderização de imagem de email | `api/email/render-image.ts` |
| Criação de usuário | `api/users/create.ts` |
| Edge Functions (Deno) | `supabase/functions/{admin-reset-password,create-user,sync-elogios-sql-server}` |
| Sync SQL Server externo | `sync-api/` (Node, serviço Windows no servidor interno, exposto via Cloudflare Tunnel em `https://sync-api.sondalyze.com.br`) |

## Armadilhas conhecidas

- **4 services de PDF** coexistem (`booksPDFService`, `booksPDFServiceV2`, `booksPDFServicePuppeteer`, `puppeteerPDFService`). Confirme qual está em uso antes de estender.
- Arquivos muito grandes (2.000–6.600 linhas): `Dashboard.tsx`, `booksDataCollectorService.ts`, `booksDisparoService.ts`. Extraia lógica nova em vez de engordá-los.
