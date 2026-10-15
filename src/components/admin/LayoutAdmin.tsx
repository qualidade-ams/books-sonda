import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar } from '@/hooks/useSidebar';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { useSessionPersistence } from '@/hooks/useSessionPersistence';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar';
import Breadcrumb from './Breadcrumb';
import ThemeToggle from './ThemeToggle';
import SessionTimeoutModal from '../auth/SessionTimeoutModal';
import { RealTimeNotifications } from '@/components/notifications';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Menu, User } from 'lucide-react';

// A partir desta largura a sidebar é fixa; abaixo dela, vira gaveta
const DESKTOP_QUERY = '(min-width: 1024px)';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { isCollapsed, toggle } = useSidebar();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Header compacto só quando a sidebar fixa está recolhida
  const isCompactHeader = isDesktop && isCollapsed;

  // Sistema de timeout de sessão (configuração automática baseada no ambiente)
  const { showWarning, formatTime, extendSession, handleLogout } = useSessionTimeout();

  // Sistema de persistência de sessão
  useSessionPersistence();

  // Fecha a gaveta ao trocar de tela
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-sonda-black flex transition-colors">
      {/* Sidebar fixa (desktop) */}
      {isDesktop && <Sidebar isCollapsed={isCollapsed} onToggle={toggle} />}

      {/* Sidebar em gaveta (tablet e celular) */}
      {!isDesktop && (
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetContent
            side="left"
            data-ds="v2"
            aria-describedby={undefined}
            className="w-72 max-w-[85vw] p-0 bg-ds-shell-bg border-ds-shell-border [&>button]:text-ds-shell-fg"
          >
            <SheetTitle className="sr-only">{t('layout.mainMenu')}</SheetTitle>
            <Sidebar
              variant="drawer"
              isCollapsed={false}
              onToggle={toggle}
              onNavigate={() => setIsMenuOpen(false)}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Main Content */}
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-all duration-300',
          isDesktop && (isCollapsed ? 'ml-16' : 'ml-64')
        )}
      >
        {/* Top Header */}
        <header
          data-ds="v2"
          className="bg-ds-bg-surface border-b border-ds-border px-4 lg:px-6 py-4 font-ds-sans transition-colors"
        >
          <div
            className={cn(
              'flex justify-between items-center gap-3 transition-all duration-300',
              isCompactHeader ? 'h-6' : 'h-12'
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              {!isDesktop && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMenuOpen(true)}
                  aria-label={t('layout.openMenu')}
                  className="h-11 w-11 shrink-0 text-ds-fg hover:bg-ds-bg-subtle hover:text-ds-fg focus-visible:ring-ds-focus"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              )}
              <div className="flex flex-col justify-center min-w-0">
                <h1
                  className={cn(
                    'font-medium text-ds-fg leading-tight truncate',
                    isCompactHeader ? 'text-lg' : 'text-xl'
                  )}
                >
                  {t('layout.adminPanel')}
                </h1>
                {!isCompactHeader && (
                  <p className="hidden sm:block text-sm text-ds-fg-secondary leading-tight truncate">
                    {t('layout.manageApp')}
                  </p>
                )}
              </div>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-2 lg:gap-4 shrink-0">
              <ThemeToggle />
              <RealTimeNotifications />

              <button
                type="button"
                className="flex items-center gap-3 rounded-lg p-1 md:px-4 md:py-2 bg-ds-bg-subtle hover:bg-ds-shell-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus focus-visible:ring-offset-2"
                onClick={() => navigate('/admin/user-config')}
              >
                <div className="flex items-center justify-center w-8 h-8 bg-ds-accent-subtle rounded-full">
                  <User className="h-4 w-4 text-ds-fg-accent" />
                </div>
                <div className="hidden md:block text-sm text-left">
                  <p className="font-medium text-ds-fg">
                    {user?.user_metadata?.name ||
                      user?.user_metadata?.display_name ||
                      user?.user_metadata?.full_name ||
                      user?.email?.split('@')[0].replace(/[._]/g, ' ') ||
                      'Usuário'}
                  </p>
                  <p className="text-ds-fg-muted">{user?.email}</p>
                </div>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 bg-gray-50 dark:bg-sonda-black">
          <div className="p-4 lg:p-6 min-h-screen">
            <Breadcrumb />
            <div className="pt-4 lg:p-6">{children}</div>
          </div>
        </main>
      </div>

      {/* Modal de aviso de timeout de sessão */}
      <SessionTimeoutModal
        isOpen={showWarning}
        remainingTime={formatTime}
        onExtendSession={extendSession}
        onLogout={handleLogout}
      />
    </div>
  );
};

export default AdminLayout;
