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
| **Envio Automático de Saldo Parcial** (agendamentos por cliente, envio imediato, histórico — roda no `sync-api/`; e-mail montado em `services/saldoParcial/`, compartilhado com o botão manual) | `envioSaldoParcial.ts` | `envioSaldoParcialService`, `saldoParcial/{emailSaldoParcial,periodoSaldoParcial,coletorSaldoParcial,executarSaldoParcial,storageSaldoParcial}`, `bancoHorasObservacoesService` | `useEnvioSaldoParcial`, `useEmailsClientesPorFinalidade` | `EnvioSaldoParcial` | `banco-horas/AgendamentoSaldoParcialFormModal`, `agendamentos/CamposRegraRecorrencia` |
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
| Envio de Saldo Parcial (via `sync-api/`) | `banco_horas_envio_agendamentos`, `banco_horas_envio_agendamento_empresas`, `banco_horas_envio_execucoes`; destinatários em `clientes.finalidade_envio` (`book` / `saldo_parcial` / `ambos`) |
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
| Envio de e-mail (proxy autenticado do webhook Power Automate; a URL assinada fica em `webhook_config`, lida no servidor) | `api/email/send.ts` |
| Criação de usuário | `api/users/create.ts` |
| Edge Functions (Deno) | `supabase/functions/{admin-reset-password,create-user,sync-elogios-sql-server}` |
| Sync SQL Server externo | `sync-api/` (Node, serviço Windows no servidor interno, exposto via Cloudflare Tunnel em `https://sync-api.sondalyze.com.br`) |

## Armadilhas conhecidas

- **4 services de PDF** coexistem (`booksPDFService`, `booksPDFServiceV2`, `booksPDFServicePuppeteer`, `puppeteerPDFService`). Confirme qual está em uso antes de estender.
- **E-mail sai sempre pelo proxy** `/api/email/send` (via `emailService`); nunca chame o webhook do Power Automate direto do navegador nem coloque a URL no código. Em dev local, enviar e-mail exige `npm run dev:vercel`. A Vercel recusa corpo acima de 4,5 MB: acima de ~4 MB o `emailService` sobe os anexos base64 para `anexos-temporarios/emails` e envia por link (limite de 25 MB por e-mail); HTML muito grande (imagem base64 embutida) não tem essa saída.
- **Destinatários por finalidade**: Book usa contatos `book`/`ambos` (`FINALIDADES_BOOK`), Saldo Parcial usa `saldo_parcial`/`ambos` (`FINALIDADES_SALDO_PARCIAL`), em `types/clientBooksTypes.ts`.
- **`sync-api/vendor/saldoParcial.cjs` é gerado** (`cd sync-api && npm run build:saldo-parcial`) a partir de `src/services/saldoParcial` e dos services de banco de horas. Mudou algum deles? Regere e versione o pacote — o teste `pacoteSaldoParcial.test.ts` falha se ficar desatualizado.
- Arquivos muito grandes (2.000–6.600 linhas): `Dashboard.tsx`, `booksDataCollectorService.ts`, `booksDisparoService.ts`. Extraia lógica nova em vez de engordá-los.
