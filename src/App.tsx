
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
import GlobalErrorBoundary from "@/components/errors/GlobalErrorBoundary";
import PermissionErrorBoundary from "@/components/errors/PermissionErrorBoundary";
import Login from "./pages/Login";
import Dashboard from "./pages/admin/Dashboard";
import EmailConfig from "./pages/admin/EmailConfig";
import GroupManagement from "./pages/admin/GroupManagement";
import UserGroupAssignment from "./pages/admin/UserGroupAssignment";
import UserConfig from "./pages/admin/UserConfig";
import UserManagement from "./pages/admin/UserManagement";
import EmpresasClientes from "./pages/admin/EmpresasClientes";
import Clientes from "./pages/admin/Clientes";
import GruposResponsaveis from "./pages/admin/GruposResponsaveis";
import ControleDisparos from "./pages/admin/ControleDisparos";
import HistoricoBooks from "./pages/admin/HistoricoBooks";
import ConfigurarPermissoesClientBooks from "./pages/admin/ConfigurarPermissoesClientBooks";
import AuditLogs from "./pages/admin/AuditLogs";
import NotFound from "./pages/NotFound";
import AccessDenied from "./pages/AccessDenied";
import SystemError from "./pages/SystemError";
import FixPermissions from "./pages/FixPermissions";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <GlobalErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PermissionsProvider>
          <PermissionErrorBoundary>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Login />} />

                  {/* Rotas administrativas protegidas */}
                  <Route path="/admin/dashboard" element={<ProtectedRoute screenKey="dashboard"><Dashboard /></ProtectedRoute>} />
                  <Route path="/admin/email-config" element={<ProtectedRoute screenKey="email-config"><EmailConfig /></ProtectedRoute>} />
                  <Route path="/admin/grupos" element={<ProtectedRoute screenKey="grupos"><GroupManagement /></ProtectedRoute>} />
                  <Route path="/admin/usuarios-grupos" element={<ProtectedRoute screenKey="usuarios-grupos"><UserGroupAssignment /></ProtectedRoute>} />
                  <Route path="/admin/user-config" element={<ProtectedRoute screenKey="user-config"><UserConfig /></ProtectedRoute>} />
                  <Route path="/admin/cadastro-usuarios" element={<ProtectedRoute screenKey="cadastro-usuarios"><UserManagement /></ProtectedRoute>} />
                  <Route path="/admin/empresas-clientes" element={<ProtectedRoute screenKey="empresas_clientes"><EmpresasClientes /></ProtectedRoute>} />
                  <Route path="/admin/clientes" element={<ProtectedRoute screenKey="clientes"><Clientes /></ProtectedRoute>} />
                  <Route path="/admin/grupos-responsaveis" element={<ProtectedRoute screenKey="grupos_responsaveis"><GruposResponsaveis /></ProtectedRoute>} />
                  <Route path="/admin/controle-disparos" element={<ProtectedRoute screenKey="controle_disparos"><ControleDisparos /></ProtectedRoute>} />
                  <Route path="/admin/historico-books" element={<ProtectedRoute screenKey="historico_books"><HistoricoBooks /></ProtectedRoute>} />
                  <Route path="/admin/configurar-permissoes-client-books" element={<ProtectedRoute screenKey="dashboard" requiredLevel="edit"><ConfigurarPermissoesClientBooks /></ProtectedRoute>} />
                  <Route path="/admin/audit-logs" element={<ProtectedRoute screenKey="audit-logs"><AuditLogs /></ProtectedRoute>} />

                  {/* Redirecionamento para dashboard se já autenticado */}
                  <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

                  {/* Páginas de erro */}
                  <Route path="/access-denied" element={<AccessDenied />} />
                  <Route path="/system-error" element={<SystemError />} />

                  {/* Página temporária para configurar permissões */}
                  <Route path="/fix-permissions" element={<FixPermissions />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </PermissionErrorBoundary>
        </PermissionsProvider>
      </AuthProvider>
    </QueryClientProvider>
  </GlobalErrorBoundary>
);

export default App;
