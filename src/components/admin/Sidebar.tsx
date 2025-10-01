import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Home,
  Mail,
  User,
  LogOut,
  Users,
  UserCheck,
  UserPlus,
  History,
  Building2,
  Contact,
  Send,
  UsersRound,
  BarChart3,
  Award,
  MessageSquare,
  Settings,
  Shield,
  FileText,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

interface MenuItem {
  icon: React.ComponentType<any>;
  label: string;
  path?: string;
  screenKey?: string;
  children?: MenuItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();

  // Função para determinar qual seção deve estar expandida baseada na rota atual
  const getCurrentSection = () => {
    const path = location.pathname;
    if (path.includes('/requerimentos')) {
      return 'requerimentos';
    }
    if (path.includes('/controle-disparos') || path.includes('/historico-books')) {
      return 'comunicacao';
    }
    if (path.includes('/empresas-clientes') || path.includes('/clientes')) {
      return 'clientes';
    }
    if (path.includes('/grupos-responsaveis') || path.includes('/email-config')) {
      return 'configuracoes';
    }
    if (path.includes('/grupos') || path.includes('/usuarios') || path.includes('/audit-logs') || path.includes('/monitoramento-vigencias')) {
      return 'administracao';
    }
    return null;
  };

  // Estado para controlar quais seções estão expandidas
  const [expandedSections, setExpandedSections] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sidebar-expanded-sections');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Erro ao carregar estado da sidebar:', error);
    }

    // Estado padrão: todas as seções expandidas
    return ['requerimentos', 'comunicacao', 'clientes', 'configuracoes', 'administracao'];
  });

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

  const toggleSection = (sectionKey: string) => {
    if (isCollapsed) return; // Não permitir toggle quando colapsado

    setExpandedSections(prev => {
      const newState = prev.includes(sectionKey)
        ? prev.filter(key => key !== sectionKey)
        : [...prev, sectionKey];

      // Salvar no localStorage
      try {
        localStorage.setItem('sidebar-expanded-sections', JSON.stringify(newState));
      } catch (error) {
        console.warn('Erro ao salvar estado da sidebar:', error);
      }

      return newState;
    });
  };

  // Função para navegar e garantir que a seção correta esteja expandida
  const handleNavigation = (path: string) => {
    // Determinar qual seção deve estar expandida para esta rota
    const targetSection = getCurrentSectionForPath(path);

    if (targetSection) {
      setExpandedSections(prev => {
        const newState = prev.includes(targetSection) ? prev : [...prev, targetSection];

        // Salvar no localStorage
        try {
          localStorage.setItem('sidebar-expanded-sections', JSON.stringify(newState));
        } catch (error) {
          console.warn('Erro ao salvar estado da sidebar:', error);
        }

        return newState;
      });
    }

    // Navegar após garantir que a seção esteja expandida
    navigate(path);
  };

  // Função auxiliar para determinar a seção baseada no path
  const getCurrentSectionForPath = (path: string) => {
    if (path.includes('/requerimentos')) {
      return 'requerimentos';
    }
    if (path.includes('/controle-disparos') || path.includes('/historico-books')) {
      return 'comunicacao';
    }
    if (path.includes('/empresas-clientes') || path.includes('/clientes')) {
      return 'clientes';
    }
    if (path.includes('/grupos-responsaveis') || path.includes('/email-config')) {
      return 'configuracoes';
    }
    if (path.includes('/grupos') || path.includes('/usuarios') || path.includes('/audit-logs') || path.includes('/monitoramento-vigencias')) {
      return 'administracao';
    }
    return null;
  };

  const menuStructure: MenuItem[] = [
    {
      icon: Home,
      label: 'Dashboard',
      path: '/admin/dashboard',
      screenKey: 'dashboard'
    },
    {
      icon: Award,
      label: 'Qualidade',
      children: []
    },
    {
      icon: FileText,
      label: 'Requerimentos',
      children: [
        {
          icon: FileText,
          label: 'Lançar Requerimentos',
          path: '/admin/lancar-requerimentos',
          screenKey: 'lancar_requerimentos'
        },
        {
          icon: DollarSign,
          label: 'Faturar Requerimentos',
          path: '/admin/faturar-requerimentos',
          screenKey: 'faturar_requerimentos'
        }
      ]
    },
    {
      icon: MessageSquare,
      label: 'Comunicação',
      children: [
        {
          icon: Send,
          label: 'Disparos',
          path: '/admin/controle-disparos',
          screenKey: 'controle_disparos'
        },
        {
          icon: Send,
          label: 'Disparos Personalizados',
          path: '/admin/disparos-personalizados',
          screenKey: 'controle_disparos'
        },
        {
          icon: BarChart3,
          label: 'Histórico de Books',
          path: '/admin/historico-books',
          screenKey: 'historico_books'
        }
      ]
    },
    {
      icon: Building2,
      label: 'Clientes',
      children: [
        {
          icon: Building2,
          label: 'Cadastro de Empresas',
          path: '/admin/empresas-clientes',
          screenKey: 'empresas_clientes'
        },
        {
          icon: Contact,
          label: 'Cadastro E-mails Clientes',
          path: '/admin/clientes',
          screenKey: 'clientes'
        }
      ]
    },
    {
      icon: Settings,
      label: 'Configurações',
      children: [
        {
          icon: UsersRound,
          label: 'Grupos Responsáveis',
          path: '/admin/grupos-responsaveis',
          screenKey: 'grupos_responsaveis'
        },
        {
          icon: Mail,
          label: 'Template E-mails',
          path: '/admin/email-config',
          screenKey: 'email-config'
        }
      ]
    },
    {
      icon: Shield,
      label: 'Administração',
      children: [
        {
          icon: Users,
          label: 'Grupos de Usuários',
          path: '/admin/grupos',
          screenKey: 'grupos'
        },
        {
          icon: UserPlus,
          label: 'Gerenciar Usuários',
          path: '/admin/cadastro-usuarios',
          screenKey: 'cadastro-usuarios'
        },
        {
          icon: UserCheck,
          label: 'Atribuir Usuários',
          path: '/admin/usuarios-grupos',
          screenKey: 'usuarios-grupos'
        },
        {
          icon: History,
          label: 'Logs de Auditoria',
          path: '/admin/audit-logs',
          screenKey: 'audit-logs'
        },
        {
          icon: BarChart3,
          label: 'Monitoramento Vigências',
          path: '/admin/monitoramento-vigencias',
          screenKey: 'monitoramento_vigencias'
        }
      ]
    }
  ];

  // Filtrar itens baseado nas permissões
  const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
    return items.filter(item => {
      // Se tem screenKey, verificar permissão
      if (item.screenKey) {
        return hasPermission(item.screenKey, 'view');
      }

      // Se tem filhos, filtrar os filhos
      if (item.children) {
        const filteredChildren = filterMenuItems(item.children);
        // Só mostrar a seção se tiver pelo menos um filho com permissão
        if (filteredChildren.length > 0) {
          item.children = filteredChildren;
          return true;
        }
        return false;
      }

      // Itens sem screenKey nem filhos (como separadores)
      return true;
    });
  };

  const menuItems = filterMenuItems(menuStructure);

  // Effect para garantir que a seção correta esteja expandida quando a rota mudar
  useEffect(() => {
    const currentSection = getCurrentSection();
    if (currentSection) {
      setExpandedSections(prev => {
        if (!prev.includes(currentSection)) {
          const newState = [...prev, currentSection];

          // Salvar no localStorage
          try {
            localStorage.setItem('sidebar-expanded-sections', JSON.stringify(newState));
          } catch (error) {
            console.warn('Erro ao salvar estado da sidebar:', error);
          }

          return newState;
        }
        return prev;
      });
    }
  }, [location.pathname]);

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
          className="h-6 w-6 absolute -right-3 top-1/2 transform -translate-y-1/2 text-white hover:bg-blue-700 bg-blue-600 z-50 shadow-lg border border-blue-500"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden sidebar-scroll">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const sectionKey = item.label.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/\s+/g, '-');
          const isExpanded = expandedSections.includes(sectionKey);

          // Se é um item simples (sem filhos)
          if (!item.children || item.children.length === 0) {
            const isActive = item.path && location.pathname === item.path;

            const buttonContent = (
              <Button
                key={item.path || index}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full text-white hover:bg-blue-700 min-w-0 flex-shrink-0",
                  isCollapsed ? "justify-center px-2" : "justify-start px-3",
                  isActive && "bg-blue-800 text-white"
                )}
                onClick={() => item.path && handleNavigation(item.path)}
              >
                <Icon className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Button>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.path || index}>
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
          }

          // Se é uma seção com filhos
          return (
            <div key={sectionKey} className="space-y-1 sidebar-item">
              {/* Cabeçalho da seção */}
              <Button
                variant="ghost"
                className={cn(
                  "w-full text-white hover:bg-blue-700 font-medium min-w-0 flex-shrink-0",
                  isCollapsed ? "justify-center px-4" : "justify-between px-3"
                )}
                onClick={() => toggleSection(sectionKey)}
              >
                <div className="flex items-center min-w-0 flex-1">
                  <Icon className={cn("h-4 w-4 flex-shrink-0", !isCollapsed && "mr-3")} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!isCollapsed && item.children.length > 0 && (
                  isExpanded ? (
                    <ChevronUp className="h-3 w-3 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-3 w-3 flex-shrink-0" />
                  )
                )}
              </Button>

              {/* Itens filhos */}
              {!isCollapsed && isExpanded && item.children.map((child, childIndex) => {
                const ChildIcon = child.icon;
                const isChildActive = child.path && location.pathname === child.path;

                return (
                  <Button
                    key={child.path || childIndex}
                    variant={isChildActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full text-white hover:bg-blue-700 ml-4 min-w-0 flex-shrink-0",
                      "justify-start px-3 text-sm",
                      isChildActive && "bg-blue-800 text-white"
                    )}
                    onClick={() => child.path && handleNavigation(child.path)}
                  >
                    <ChildIcon className="h-3 w-3 mr-3 flex-shrink-0" />
                    <span className="truncate">{child.label}</span>
                  </Button>
                );
              })}

              {/* Separador visual entre seções */}
              {index < menuItems.length - 1 && !isCollapsed && (
                <div className="h-px bg-blue-700 mx-2 my-2" />
              )}
            </div>
          );
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
                    onClick={() => handleNavigation('/admin/user-config')}
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
                className="w-full justify-start px-3 text-white hover:bg-blue-700 min-w-0 flex-shrink-0"
                onClick={() => handleNavigation('/admin/user-config')}
              >
                <User className="h-4 w-4 mr-3 flex-shrink-0" />
                <span className="truncate">Configurações</span>
              </Button>
            )}

            <Button
              variant="ghost"
              className="w-full justify-start px-3 text-red-300 hover:text-red-200 hover:bg-blue-700 min-w-0 flex-shrink-0"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-3 flex-shrink-0" />
              <span className="truncate">Sair</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;