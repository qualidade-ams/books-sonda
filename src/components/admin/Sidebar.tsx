import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Smartphone,
  Mail,
  Calculator,
  User,
  LogOut,
  CheckCircle,
  FileText,
  Users,
  UserCheck,
  UserPlus,
  History,
  Building2,
  Contact,
  Send,
  UsersRound,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      console.log('Sidebar: Iniciando logout...');
      await signOut();
      
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
      
      // Aguardar um pouco para garantir que o estado seja atualizado
      setTimeout(() => {
        console.log('Sidebar: Redirecionando para /login');
        // Usar window.location para forçar o redirecionamento
        window.location.href = '/';
      }, 500);
      
    } catch (error) {
      console.error('Sidebar: Erro no logout:', error);
      toast({
        title: "Erro no logout",
        description: "Ocorreu um erro ao fazer logout.",
        variant: "destructive",
      });
    }
  };

  const allMenuItems = [
    {
      icon: Home,
      label: 'Dashboard',
      path: '/admin/dashboard',
      screenKey: 'dashboard'
    },
    {
      icon: FileText,
      label: 'Histórico de Orçamentos',
      path: '/admin/historico-orcamentos',
      screenKey: 'historico-orcamentos'
    },
    {
      icon: CheckCircle,
      label: 'Aprovações',
      path: '/admin/aprovacoes',
      screenKey: 'aprovacoes'
    },
    {
      icon: CheckCircle,
      label: 'Aprovações CRM',
      path: '/admin/aprovacoes-crm',
      screenKey: 'aprovacoes-crm'
    },
    {
      icon: Calculator,
      label: 'Precificação',
      path: '/admin/precificacao',
      screenKey: 'precificacao'
    },
    {
      icon: Smartphone,
      label: 'Aplicativos',
      path: '/admin/aplicativos',
      screenKey: 'aplicativos'
    },
    // Seção: Gerenciamento de Clientes e Books
    {
      icon: Building2,
      label: 'Empresas Clientes',
      path: '/admin/empresas-clientes',
      screenKey: 'empresas_clientes'
    },
    {
      icon: Contact,
      label: 'Cadastro E-mails Clientes',
      path: '/admin/colaboradores',
      screenKey: 'colaboradores'
    },
    {
      icon: UsersRound,
      label: 'Grupos Responsáveis',
      path: '/admin/grupos-responsaveis',
      screenKey: 'grupos_responsaveis'
    },
    {
      icon: Send,
      label: 'Controle de Disparos',
      path: '/admin/controle-disparos',
      screenKey: 'controle_disparos'
    },
    {
      icon: BarChart3,
      label: 'Histórico de Books',
      path: '/admin/historico-books',
      screenKey: 'historico_books'
    },
    // Seção: Gerenciamento de Usuários
    {
      icon: Users,
      label: 'Grupos de Usuários',
      path: '/admin/grupos',
      screenKey: 'grupos'
    },
    {
      icon: UserCheck,
      label: 'Atribuir Usuários',
      path: '/admin/usuarios-grupos',
      screenKey: 'usuarios-grupos'
    },
    {
      icon: UserPlus,
      label: 'Gerenciar Usuários',
      path: '/admin/cadastro-usuarios',
      screenKey: 'cadastro-usuarios'
    },
    // Seção: Auditoria
    {
      icon: History,
      label: 'Logs de Auditoria',
      path: '/admin/audit-logs',
      screenKey: 'audit-logs'
    },
    {
      icon: Mail,
      label: 'Template E-mails',
      path: '/admin/email-config',
      screenKey: 'email-config'
    }
  ];

  // Filter menu items based on user permissions
  const menuItems = allMenuItems.filter(item => hasPermission(item.screenKey, 'view'));

  return (
    <div className={cn(
      "bg-blue-600 flex flex-col transition-all duration-300 ease-in-out h-screen fixed left-0 top-0 z-10",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header com Logo */}
      <div className="p-4 border-b border-blue-700 relative">
        <div className="flex items-center justify-center">
          {!isCollapsed && (
            <img
              src="/images/logo-sonda.png"
              alt="Sonda Logo"
              className="h-12 w-auto"
            />
          )}
          {isCollapsed && (
            <img
              src="/images/logo-sonda-16x16.png"
              alt="Sonda Logo"
              className="h-6 w-6 bg-white rounded p-1"
            />
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="h-6 w-6 absolute -right-3 top-1/2 transform -translate-y-1/2 text-white hover:bg-blue-700 bg-blue-600"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          const buttonContent = (
            <Button
              key={item.path}
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full text-white hover:bg-blue-700",
                isCollapsed ? "justify-center px-2" : "justify-start px-3",
                isActive && "bg-blue-800 text-white"
              )}
              onClick={() => navigate(item.path)}
            >
              <Icon className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
              {!isCollapsed && <span>{item.label}</span>}
            </Button>
          );

          if (isCollapsed) {
            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  {buttonContent}
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return buttonContent;
        })}
      </nav>

      {/* User Actions */}
      <div className="p-2 border-t border-blue-700 space-y-1">
        {isCollapsed ? (
          <>
            {hasPermission('user-config', 'view') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-center px-2 text-white hover:bg-blue-700"
                    onClick={() => navigate('/admin/user-config')}
                  >
                    <User className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Configurações</p>
                </TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-center px-2 text-red-300 hover:text-red-200 hover:bg-blue-700"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Sair</p>
              </TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            {hasPermission('user-config', 'view') && (
              <Button
                variant="ghost"
                className="w-full justify-start px-3 text-white hover:bg-blue-700"
                onClick={() => navigate('/admin/user-config')}
              >
                <User className="h-4 w-4 mr-3" />
                <span>Configurações</span>
              </Button>
            )}

            <Button
              variant="ghost"
              className="w-full justify-start px-3 text-red-300 hover:text-red-200 hover:bg-blue-700"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-3" />
              <span>Sair</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;