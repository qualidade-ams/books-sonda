import { lazy, Suspense } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { PermissionsProvider } from '@/contexts/PermissionsContext';
import { BooksProcessingProvider } from '@/contexts/BooksProcessingContext';
import GlobalErrorBoundary from '@/components/errors/GlobalErrorBoundary';
import PermissionErrorBoundary from '@/components/errors/PermissionErrorBoundary';
import { AutoSchedulerInitializer } from '@/components/admin/AutoSchedulerInitializer';
import { CacheInitializer } from '@/components/admin/CacheInitializer';
import { BooksProcessingIndicator } from '@/components/admin/BooksProcessingIndicator';
import Login from './pages/Login';
import { RedirecionarPreservandoBusca } from './components/admin/RedirecionarPreservandoBusca';

import BookPrintView from './pages/pdf/BookPrintView';
import NotFound from './pages/NotFound';
import AccessDenied from './pages/AccessDenied';
import SystemError from './pages/SystemError';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingFallback from '@/components/errors/LoadingFallback';
import { telaSobDemanda } from '@/utils/carregarTela';

// Telas carregadas só quando abertas (o app não baixa todas na primeira abertura).
// Login, páginas de erro e a página do PDF do Book (Puppeteer) ficam no pacote principal.
const Dashboard = telaSobDemanda(() => import('./pages/admin/Dashboard'));
const EmailConfig = telaSobDemanda(() => import('./pages/admin/EmailConfig'));
const GroupManagement = telaSobDemanda(() => import('./pages/admin/GroupManagement'));
const UserGroupAssignment = telaSobDemanda(() => import('./pages/admin/UserGroupAssignment'));
const UserConfig = telaSobDemanda(() => import('./pages/admin/UserConfig'));
const UserManagement = telaSobDemanda(() => import('./pages/admin/UserManagement'));
const EmpresasClientes = telaSobDemanda(() => import('./pages/admin/EmpresasClientes'));
const Clientes = telaSobDemanda(() => import('./pages/admin/Clientes'));
const GruposResponsaveis = telaSobDemanda(() => import('./pages/admin/GruposResponsaveis'));
const ControleDisparos = telaSobDemanda(() => import('./pages/admin/ControleDisparos'));
const ControleDisparosPersonalizados = telaSobDemanda(
  () => import('./pages/admin/ControleDisparosPersonalizados')
);
const HistoricoBooks = telaSobDemanda(() => import('./pages/admin/HistoricoBooks'));
const GeracaoBooks = telaSobDemanda(() => import('./pages/admin/GeracaoBooks'));
const ControleBancoHoras = telaSobDemanda(() => import('./pages/admin/ControleBancoHoras'));
const AuditoriaBancoHoras = telaSobDemanda(() => import('./pages/admin/AuditoriaBancoHoras'));
const ProdutosModulos = telaSobDemanda(() => import('./pages/admin/ProdutosModulos'));
const DeParaGrupos = telaSobDemanda(() => import('./pages/admin/DeParaGrupos'));
const RamosAtividade = telaSobDemanda(() => import('./pages/admin/RamosAtividade'));
const RegrasContagem = telaSobDemanda(() => import('./pages/admin/RegrasContagem'));
const Empresas = telaSobDemanda(() => import('./pages/admin/Empresas'));
const EmpresaDetalhe = telaSobDemanda(() => import('./pages/admin/EmpresaDetalhe'));
const ControleBancosHoras = telaSobDemanda(() => import('./pages/admin/ControleBancosHoras'));
const ApontamentosRetroativos = telaSobDemanda(
  () => import('./pages/admin/ApontamentosRetroativos')
);
const AuditoriaBancosHoras = telaSobDemanda(() => import('./pages/admin/AuditoriaBancosHoras'));
const OrganizarMenu = telaSobDemanda(() => import('./pages/admin/OrganizarMenu'));
const AjustesRetroativos = telaSobDemanda(() => import('./pages/admin/AjustesRetroativos'));
const ConfigurarPermissoesClientBooks = telaSobDemanda(
  () => import('./pages/admin/ConfigurarPermissoesClientBooks')
);
const ConfigurarPermissoesVigencias = telaSobDemanda(
  () => import('./pages/admin/ConfigurarPermissoesVigencias')
);
const AuditLogs = telaSobDemanda(() => import('./pages/admin/AuditLogs'));
const MonitoramentoVigencias = telaSobDemanda(() => import('./pages/admin/MonitoramentoVigencias'));
const ConsultoresCoordenadores = telaSobDemanda(
  () => import('./pages/admin/ConsultoresCoordenadores')
);
const SincronizacaoSqlServer = telaSobDemanda(() => import('./pages/admin/SincronizacaoSqlServer'));
const LancarRequerimentos = telaSobDemanda(() => import('./pages/admin/LancarRequerimentos'));
const FaturarRequerimentos = telaSobDemanda(() => import('./pages/admin/FaturarRequerimentos'));
const LancarPesquisas = telaSobDemanda(() => import('./pages/admin/LancarPesquisas'));
const VisualizarPesquisas = telaSobDemanda(() => import('./pages/admin/VisualizarPesquisas'));
const PesquisaMensalAMS = telaSobDemanda(() => import('./pages/admin/PesquisaMensalAMS'));
const LancarElogios = telaSobDemanda(() => import('./pages/admin/LancarElogios'));
const EnviarElogios = telaSobDemanda(() => import('./pages/admin/EnviarElogios'));
const Organograma = telaSobDemanda(() => import('./pages/admin/Organograma'));
const PlanoAcao = telaSobDemanda(() => import('./pages/admin/PlanoAcao'));
const CadastroTaxasClientes = telaSobDemanda(() => import('./pages/admin/CadastroTaxasClientes'));
const DesignSystem = telaSobDemanda(() => import('./pages/admin/DesignSystem'));
const InconsistenciaChamados = telaSobDemanda(
  () => import('./pages/admin/auditoria/InconsistenciaChamados')
);
const MonitoramentoChamados = telaSobDemanda(
  () => import('./pages/admin/auditoria/MonitoramentoChamados')
);
const FixPermissions = telaSobDemanda(() => import('./pages/FixPermissions'));

// Protótipos visuais (skill `prototipo`): só existem em dev, ficam fora do bundle de produção.
const Prototipos = import.meta.env.DEV ? lazy(() => import('./pages/Prototipos')) : null;

const queryClient = new QueryClient();

const App = () => (
  <GlobalErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PermissionsProvider>
          <PermissionErrorBoundary>
            <TooltipProvider>
              <BooksProcessingProvider>
                <CacheInitializer />
                <AutoSchedulerInitializer />
                <BooksProcessingIndicator />
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Suspense fallback={<LoadingFallback type="page" fullScreen />}>
                    <Routes>
                      <Route path="/" element={<Login />} />

                      {/* Rotas administrativas protegidas */}
                      <Route
                        path="/admin/dashboard"
                        element={
                          <ProtectedRoute screenKey="dashboard">
                            <Dashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/email-config"
                        element={
                          <ProtectedRoute screenKey="email-config">
                            <EmailConfig />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/grupos"
                        element={
                          <ProtectedRoute screenKey="grupos">
                            <GroupManagement />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/usuarios-grupos"
                        element={
                          <ProtectedRoute screenKey="usuarios-grupos">
                            <UserGroupAssignment />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/user-config"
                        element={
                          <ProtectedRoute screenKey="user-config">
                            <UserConfig />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/cadastro-usuarios"
                        element={
                          <ProtectedRoute screenKey="cadastro-usuarios">
                            <UserManagement />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/empresas-clientes"
                        element={
                          <ProtectedRoute screenKey="empresas_clientes">
                            <EmpresasClientes />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/clientes"
                        element={
                          <ProtectedRoute screenKey="clientes">
                            <Clientes />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/grupos-responsaveis"
                        element={
                          <ProtectedRoute screenKey="grupos_responsaveis">
                            <GruposResponsaveis />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/controle-disparos"
                        element={
                          <ProtectedRoute screenKey="controle_disparos">
                            <ControleDisparos />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/disparos-personalizados"
                        element={
                          <ProtectedRoute screenKey="controle_disparos">
                            <ControleDisparosPersonalizados />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/historico-books"
                        element={
                          <ProtectedRoute screenKey="historico_books">
                            <HistoricoBooks />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/geracao-books"
                        element={
                          <ProtectedRoute screenKey="geracao_books">
                            <GeracaoBooks />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/controle-banco-horas"
                        element={
                          <ProtectedRoute screenKey="controle_banco_horas">
                            <ControleBancoHoras />
                          </ProtectedRoute>
                        }
                      />
                      {/* Tela antiga, hoje aba de Rotinas Automáticas (links de notificação já gravados) */}
                      <Route
                        path="/admin/envio-saldo-parcial"
                        element={
                          <Navigate to="/admin/rotinas-automaticas?aba=saldo-parcial" replace />
                        }
                      />
                      <Route
                        path="/admin/produtos-modulos"
                        element={
                          <ProtectedRoute screenKey="produtos_modulos">
                            <ProdutosModulos />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/de-para-grupos"
                        element={
                          <ProtectedRoute screenKey="de_para_grupos">
                            <DeParaGrupos />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/ramos-atividade"
                        element={
                          <ProtectedRoute screenKey="ramos_atividade">
                            <RamosAtividade />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/regras-contagem"
                        element={
                          <ProtectedRoute screenKey="regras_contagem">
                            <RegrasContagem />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/empresas"
                        element={
                          <ProtectedRoute screenKey="empresas">
                            <Empresas />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/empresas/:empresaId"
                        element={
                          <ProtectedRoute screenKey="empresas">
                            <EmpresaDetalhe />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/apontamentos-retroativos"
                        element={
                          <ProtectedRoute screenKey="bancos_horas_retroativos">
                            <ApontamentosRetroativos />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/auditoria-bancos-horas"
                        element={
                          <ProtectedRoute screenKey="bancos_horas_auditoria">
                            <AuditoriaBancosHoras />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/organizar-menu"
                        element={
                          <ProtectedRoute screenKey="organizar_menu">
                            <OrganizarMenu />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/bancos-horas"
                        element={
                          <ProtectedRoute screenKey="bancos_horas_controle">
                            <ControleBancosHoras />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/auditoria-banco-horas"
                        element={
                          <ProtectedRoute screenKey="auditoria_banco_horas">
                            <AuditoriaBancoHoras />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/ajustes-retroativos"
                        element={
                          <ProtectedRoute screenKey="banco_horas_ajustes_retroativos">
                            <AjustesRetroativos />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/configurar-permissoes-client-books"
                        element={
                          <ProtectedRoute screenKey="dashboard" requiredLevel="edit">
                            <ConfigurarPermissoesClientBooks />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/configurar-permissoes-vigencias"
                        element={
                          <ProtectedRoute screenKey="dashboard" requiredLevel="edit">
                            <ConfigurarPermissoesVigencias />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/audit-logs"
                        element={
                          <ProtectedRoute screenKey="audit-logs">
                            <AuditLogs />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/monitoramento-vigencias"
                        element={
                          <ProtectedRoute screenKey="monitoramento_vigencias">
                            <MonitoramentoVigencias />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/consultores-coordenadores"
                        element={
                          <ProtectedRoute screenKey="consultores_coordenadores">
                            <ConsultoresCoordenadores />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/rotinas-automaticas"
                        element={
                          <ProtectedRoute screenKey="sincronizacao_sql_server">
                            <SincronizacaoSqlServer />
                          </ProtectedRoute>
                        }
                      />
                      {/* Endereço antigo (antes de Rotinas Automáticas), mantendo ?aba= */}
                      <Route
                        path="/admin/sincronizacao-sql-server"
                        element={<RedirecionarPreservandoBusca para="/admin/rotinas-automaticas" />}
                      />
                      <Route
                        path="/admin/lancar-requerimentos"
                        element={
                          <ProtectedRoute screenKey="lancar_requerimentos">
                            <LancarRequerimentos />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/faturar-requerimentos"
                        element={
                          <ProtectedRoute screenKey="faturar_requerimentos">
                            <FaturarRequerimentos />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/lancar-pesquisas"
                        element={
                          <ProtectedRoute screenKey="lancar_pesquisas">
                            <LancarPesquisas />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/visualizar-pesquisas"
                        element={
                          <ProtectedRoute screenKey="visualizar_pesquisas">
                            <VisualizarPesquisas />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/pesquisa-mensal-ams"
                        element={
                          <ProtectedRoute screenKey="pesquisa_mensal_ams">
                            <PesquisaMensalAMS />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/lancar-elogios"
                        element={
                          <ProtectedRoute screenKey="lancar_elogios">
                            <LancarElogios />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/enviar-elogios"
                        element={
                          <ProtectedRoute screenKey="lancar_elogios">
                            <EnviarElogios />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/organograma"
                        element={
                          <ProtectedRoute screenKey="organograma">
                            <Organograma />
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="/admin/plano-acao"
                        element={
                          <ProtectedRoute screenKey="plano_acao">
                            <PlanoAcao />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/cadastro-taxas-clientes"
                        element={
                          <ProtectedRoute screenKey="cadastro_taxas_clientes">
                            <CadastroTaxasClientes />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/design-system"
                        element={
                          <ProtectedRoute screenKey="design_system">
                            <DesignSystem />
                          </ProtectedRoute>
                        }
                      />
                      {Prototipos && (
                        <Route
                          path="/prototipos/:slug?"
                          element={
                            <ProtectedRoute screenKey="design_system">
                              <Suspense fallback={null}>
                                <Prototipos />
                              </Suspense>
                            </ProtectedRoute>
                          }
                        />
                      )}
                      <Route
                        path="/admin/auditoria/inconsistencia-chamados"
                        element={
                          <ProtectedRoute screenKey="inconsistencia_chamados">
                            <InconsistenciaChamados />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/auditoria/monitoramento-chamados"
                        element={
                          <ProtectedRoute screenKey="troca_codigo_resolucao">
                            <MonitoramentoChamados />
                          </ProtectedRoute>
                        }
                      />

                      {/* Rota dedicada para impressão/PDF - SEM MODAL */}
                      <Route path="/pdf/book/:id" element={<BookPrintView />} />

                      {/* Redirecionamento para dashboard se já autenticado */}
                      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

                      {/* Páginas de erro */}
                      <Route path="/access-denied" element={<AccessDenied />} />
                      <Route path="/system-error" element={<SystemError />} />

                      {/* Página temporária para configurar permissões */}
                      <Route path="/fix-permissions" element={<FixPermissions />} />

                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
              </BooksProcessingProvider>
            </TooltipProvider>
          </PermissionErrorBoundary>
        </PermissionsProvider>
      </AuthProvider>
    </QueryClientProvider>
  </GlobalErrorBoundary>
);

export default App;
