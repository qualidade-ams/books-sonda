import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, User, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { useLogoMenu, useMenuOrganizado } from '@/hooks/useMenuOrganizado';
import { useTemaDoDocumento } from '@/hooks/useTemaDoDocumento';
import { MENU_PADRAO } from '@/config/menuPadrao';
import { aplicarOrdemSalva } from '@/services/menuOrganizadoService';
import { menuDaRota, menuVisivel } from '@/utils/menuLateral';
import { logoClaroSobre } from '@/utils/aparenciaMenu';
import { iconeDoMenu } from './iconesMenu';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  /** fixed: coluna fixa do desktop. drawer: conteúdo da gaveta abaixo de 1024 px, sempre expandido. */
  variant?: 'fixed' | 'drawer';
  /** Chamado depois de navegar (a gaveta usa para fechar). */
  onNavigate?: () => void;
}

// Classes do Design System v2 (tokens em src/styles/ds-v2.css). As cores de item, subitem, hover e
// selecionado vêm de Organizar Menu; sem nada salvo, seguem o shell do tema.
const hoverClasses =
  'hover:bg-ds-shell-hover hover:text-[var(--ds-shell-hover-fg)] focus-visible:ring-ds-focus';
const itemClasses = cn('bg-[var(--ds-menu-item-bg)] text-[var(--ds-menu-item-fg)]', hoverClasses);
const subitemClasses = cn(
  'bg-[var(--ds-menu-subitem-bg)] text-[var(--ds-menu-subitem-fg)]',
  hoverClasses
);
const activeItemClasses =
  'bg-[var(--ds-menu-selecionado-bg)] text-[var(--ds-menu-selecionado-fg)] shadow-[inset_2px_0_0_var(--ds-menu-selecionado-fg)] hover:bg-[var(--ds-menu-selecionado-bg)] hover:text-[var(--ds-menu-selecionado-fg)]';

const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed: isCollapsedProp,
  onToggle,
  variant = 'fixed',
  onNavigate,
}) => {
  // Na gaveta o menu fica sempre expandido
  const isCollapsed = variant === 'fixed' && isCollapsedProp;
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { menu } = useMenuOrganizado();
  // Logo próprio do tema em uso; sem ele, o da Sonda
  const tema = useTemaDoDocumento();
  const aparencia = menu?.aparencia?.[tema];
  const logo = useLogoMenu(aparencia?.logoPath ?? null);
  const logoRecolhido = useLogoMenu(aparencia?.logoRecolhidoPath ?? null);

  // Referência para preservar scroll
  const navRef = useRef<HTMLElement>(null);
  const preventScrollRef = useRef<boolean>(false);

  // Estado para controlar o submenu flutuante quando minimizado
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [submenuPosition, setSubmenuPosition] = useState<{ top: number; left: number } | null>(
    null
  );
  const submenuRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Estado para controlar quais seções estão expandidas (pela chave do menu)
  const [expandedSections, setExpandedSections] = useState<string[]>(() => {
    // Verificar se é uma nova sessão (sem estado salvo de seções expandidas)
    const hasSessionState = sessionStorage.getItem('sidebar-session-initialized');

    if (!hasSessionState) {
      // Primeira vez na sessão - iniciar com menus fechados
      sessionStorage.setItem('sidebar-session-initialized', 'true');
      return [];
    }

    // Sessão já inicializada - usar estado salvo do localStorage
    try {
      const saved = localStorage.getItem('sidebar-expanded-sections');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Erro ao carregar estado da sidebar:', error);
    }

    // Estado padrão: todas as seções fechadas
    return [];
  });

  // O menu do código com a ordem salva em Organizar Menu, só com as telas que o usuário vê
  const menuItems = menuVisivel(aplicarOrdemSalva(MENU_PADRAO, menu?.itens ?? []), (screenKey) =>
    hasPermission(screenKey, 'view')
  );

  const handleLogout = async () => {
    try {
      console.log('Sidebar: Iniciando logout...');
      await signOut();

      toast({
        title: t('toast.successTitle'),
        description: t('auth.logout'),
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
        title: t('toast.errorTitle'),
        description: t('toast.operationError'),
        variant: 'destructive',
      });
    }
  };

  const toggleSection = (sectionKey: string) => {
    if (isCollapsed) return; // Não permitir toggle quando colapsado

    setExpandedSections((prev) => {
      const newState = prev.includes(sectionKey)
        ? prev.filter((key) => key !== sectionKey)
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

  // Função para navegar sem resetar scroll
  const handleNavigation = (path: string) => {
    // Ativar prevenção de scroll
    preventScrollRef.current = true;

    // Salvar posição atual do scroll no sessionStorage
    if (navRef.current) {
      sessionStorage.setItem('sidebar-scroll-position', navRef.current.scrollTop.toString());
    }

    // O menu da tela de destino fica expandido
    const targetSection = menuDaRota(menuItems, path);

    if (targetSection) {
      setExpandedSections((prev) => {
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

    // Navegar
    navigate(path);
    onNavigate?.();

    // Desativar prevenção após um tempo
    setTimeout(() => {
      preventScrollRef.current = false;
    }, 500);
  };

  // Effect para restaurar posição de scroll
  useLayoutEffect(() => {
    const restoreScrollPosition = () => {
      const savedPosition = sessionStorage.getItem('sidebar-scroll-position');
      if (savedPosition && navRef.current) {
        const position = parseInt(savedPosition, 10);
        navRef.current.scrollTop = position;
      }
    };

    // Restaurar posição após mudança de rota
    restoreScrollPosition();
  }, [location.pathname]);

  // Effect para salvar posição de scroll continuamente
  useEffect(() => {
    const handleScroll = (e: Event) => {
      // Se estamos prevenindo scroll, restaurar posição
      if (preventScrollRef.current && navRef.current) {
        const savedPosition = sessionStorage.getItem('sidebar-scroll-position');
        if (savedPosition) {
          e.preventDefault();
          navRef.current.scrollTop = parseInt(savedPosition, 10);
          return;
        }
      }

      // Salvar posição normal
      if (navRef.current) {
        sessionStorage.setItem('sidebar-scroll-position', navRef.current.scrollTop.toString());
      }
    };

    const navElement = navRef.current;
    if (navElement) {
      navElement.addEventListener('scroll', handleScroll);
      return () => navElement.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Effect para garantir que a seção correta esteja expandida quando a rota mudar
  // (removido para evitar scroll automático)

  // Funções para controlar o submenu flutuante
  const handleMouseEnterSection = (
    sectionKey: string,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (!isCollapsed) return;

    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const rect = event.currentTarget.getBoundingClientRect();
    setSubmenuPosition({
      top: rect.top,
      left: rect.right + 8, // 8px de espaçamento
    });
    setHoveredSection(sectionKey);
  };

  const handleMouseLeaveSection = () => {
    if (!isCollapsed) return;

    // Delay para permitir que o usuário mova o mouse para o submenu
    timeoutRef.current = setTimeout(() => {
      setHoveredSection(null);
      setSubmenuPosition(null);
    }, 300);
  };

  const handleMouseEnterSubmenu = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleMouseLeaveSubmenu = () => {
    setHoveredSection(null);
    setSubmenuPosition(null);
  };

  // Limpar timeout ao desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <aside
      data-ds="v2"
      aria-label={t('layout.mainMenu')}
      className={cn(
        'bg-ds-shell-bg text-ds-shell-fg font-ds-sans flex flex-col',
        variant === 'fixed'
          ? cn(
              'transition-all duration-300 ease-in-out h-screen fixed left-0 top-0 z-10 border-r border-ds-shell-border',
              isCollapsed ? 'w-16' : 'w-64'
            )
          : 'h-full w-full'
      )}
    >
      {/* Header com Logo */}
      <div className="p-4 border-b border-ds-shell-border relative">
        <div className="flex items-center justify-center">
          {!isCollapsed &&
            (logo ? (
              <img src={logo} alt="Logo" className="h-12 w-auto max-w-full object-contain" />
            ) : (
              /* Logo branco: sobre fundo claro vira preto (brightness-0). Sem cor salva, pelo tema */
              <img
                src="/images/logo-sonda.png"
                alt="Sonda Logo"
                className={cn(
                  'h-12 w-auto',
                  aparencia?.menuFundo
                    ? !logoClaroSobre(aparencia.menuFundo) && 'brightness-0'
                    : 'brightness-0 dark:brightness-100'
                )}
              />
            ))}
          {isCollapsed &&
            (logoRecolhido ? (
              <img src={logoRecolhido} alt="Logo" className="h-6 w-6 object-contain" />
            ) : (
              <img
                src="/images/logo-sonda-16x16.png"
                alt="Sonda Logo"
                className="h-6 w-6 bg-white rounded p-1"
              />
            ))}
        </div>
        {variant === 'fixed' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            aria-label={isCollapsed ? t('layout.expandMenu') : t('layout.collapseMenu')}
            className="h-6 w-6 absolute -right-3 top-1/2 transform -translate-y-1/2 z-50 shadow-lg border border-ds-shell-border bg-ds-shell-bg text-ds-shell-fg hover:bg-ds-shell-hover hover:text-ds-shell-fg focus-visible:ring-ds-focus"
          >
            {isCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>

      {/* Menu Items */}
      <nav
        ref={navRef}
        className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden sidebar-scroll"
        style={{
          scrollBehavior: 'auto',
          overscrollBehavior: 'contain',
        }}
      >
        {menuItems.map((item, index) => {
          const Icon = iconeDoMenu(item.icone);
          const label = t(item.rotuloI18n);
          const sectionKey = item.chave;
          const isExpanded = expandedSections.includes(sectionKey);

          // Tela solta no primeiro nível (sem filhos)
          if (item.tipo === 'tela') {
            const isActive = location.pathname === item.chave;

            const buttonContent = (
              <Button
                key={item.chave}
                variant="ghost"
                className={cn(
                  'w-full min-w-0 flex-shrink-0',
                  itemClasses,
                  isCollapsed ? 'justify-center px-2' : 'justify-start px-3',
                  isActive && activeItemClasses
                )}
                onClick={() => handleNavigation(item.chave)}
              >
                <Icon className={cn('h-4 w-4', !isCollapsed && 'mr-3')} />
                {!isCollapsed && <span className="truncate">{label}</span>}
              </Button>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.chave}>
                  <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return buttonContent;
          }

          const filhos = item.filhos ?? [];
          // Se é uma seção com filhos
          const sectionButton = (
            <Button
              variant="ghost"
              className={cn(
                'w-full font-medium min-w-0 flex-shrink-0 gap-3',
                itemClasses,
                isCollapsed ? 'justify-center px-4' : 'justify-start px-3 pr-2'
              )}
              onClick={() => toggleSection(sectionKey)}
              onMouseEnter={(e) => handleMouseEnterSection(sectionKey, e)}
              onMouseLeave={handleMouseLeaveSection}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!isCollapsed && <span className="truncate flex-shrink">{label}</span>}
              {!isCollapsed &&
                filhos.length > 0 &&
                (isExpanded ? (
                  <ChevronUp className="h-3 w-3 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-3 w-3 flex-shrink-0" />
                ))}
            </Button>
          );

          return (
            <div key={sectionKey} className="space-y-1 sidebar-item">
              {/* Cabeçalho da seção */}
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>{sectionButton}</TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{label}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                sectionButton
              )}

              {/* Itens filhos (quando não está colapsado) */}
              {!isCollapsed &&
                isExpanded &&
                filhos.map((child) => {
                  const ChildIcon = iconeDoMenu(child.icone);
                  const isChildActive = location.pathname === child.chave;

                  return (
                    <Button
                      key={child.chave}
                      variant="ghost"
                      className={cn(
                        'w-full ml-4 min-w-0 flex-shrink-0',
                        subitemClasses,
                        'justify-start px-3 text-sm',
                        isChildActive && activeItemClasses
                      )}
                      onClick={() => handleNavigation(child.chave)}
                    >
                      <ChildIcon className="h-3 w-3 mr-3 flex-shrink-0" />
                      <span className="truncate">{t(child.rotuloI18n)}</span>
                    </Button>
                  );
                })}

              {/* Separador visual entre seções */}
              {index < menuItems.length - 1 && !isCollapsed && (
                <div className="h-px bg-ds-shell-border mx-2 my-2" />
              )}
            </div>
          );
        })}
      </nav>

      {/* User Actions */}
      <div className="p-2 border-t border-ds-shell-border space-y-1">
        {isCollapsed ? (
          <>
            {hasPermission('user-config', 'view') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn('w-full justify-center px-2', itemClasses)}
                    onClick={() => handleNavigation('/admin/user-config')}
                  >
                    <User className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{t('nav.userConfig')}</p>
                </TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-center px-2 text-ds-danger-fg hover:text-ds-danger-fg hover:bg-ds-shell-hover focus-visible:ring-ds-focus"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{t('auth.logout')}</p>
              </TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            {hasPermission('user-config', 'view') && (
              <Button
                variant="ghost"
                className={cn('w-full justify-start px-3 min-w-0 flex-shrink-0', itemClasses)}
                onClick={() => handleNavigation('/admin/user-config')}
              >
                <User className="h-4 w-4 mr-3 flex-shrink-0" />
                <span className="truncate">{t('nav.userConfig')}</span>
              </Button>
            )}

            <Button
              variant="ghost"
              className="w-full justify-start px-3 min-w-0 flex-shrink-0 text-ds-danger-fg hover:text-ds-danger-fg hover:bg-ds-shell-hover focus-visible:ring-ds-focus"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-3 flex-shrink-0" />
              <span className="truncate">{t('auth.logout')}</span>
            </Button>
          </>
        )}
      </div>

      {/* Submenu flutuante quando minimizado */}
      {isCollapsed && hoveredSection && submenuPosition && (
        <div
          ref={submenuRef}
          className="fixed bg-ds-shell-bg border border-ds-shell-border rounded-md shadow-2xl py-1 min-w-[200px] max-w-[240px] z-[9999]"
          style={{
            top: `${submenuPosition.top}px`,
            left: `${submenuPosition.left}px`,
          }}
          onMouseEnter={handleMouseEnterSubmenu}
          onMouseLeave={handleMouseLeaveSubmenu}
        >
          {menuItems.map((item) => {
            if (item.chave === hoveredSection && item.filhos && item.filhos.length > 0) {
              return (
                <div key={item.chave} className="space-y-0.5">
                  {/* Título da seção */}
                  <div className="px-2 py-1.5 text-ds-shell-fg font-semibold text-sm border-b border-ds-shell-border mb-1">
                    {t(item.rotuloI18n)}
                  </div>

                  {/* Itens do submenu */}
                  {item.filhos.map((child) => {
                    const ChildIcon = iconeDoMenu(child.icone);
                    const isChildActive = location.pathname === child.chave;

                    return (
                      <Button
                        key={child.chave}
                        variant="ghost"
                        className={cn(
                          'w-full justify-start px-2 py-1.5 h-8 text-sm gap-2',
                          subitemClasses,
                          isChildActive && activeItemClasses
                        )}
                        onClick={() => {
                          handleNavigation(child.chave);
                          setHoveredSection(null);
                          setSubmenuPosition(null);
                        }}
                      >
                        <ChildIcon className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{t(child.rotuloI18n)}</span>
                      </Button>
                    );
                  })}
                </div>
              );
            }
            return null;
          })}
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
