import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { useMediaQuery } from '@/hooks/useMediaQuery';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { email: 'usuario@exemplo.com', user_metadata: {} }, signOut: vi.fn() }),
}));
vi.mock('@/hooks/useSessionTimeout', () => ({
  useSessionTimeout: () => ({
    showWarning: false,
    formatTime: '',
    extendSession: vi.fn(),
    handleLogout: vi.fn(),
  }),
}));
vi.mock('@/hooks/useSessionPersistence', () => ({ useSessionPersistence: vi.fn() }));
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ resolvedTheme: 'light', toggleTheme: vi.fn() }),
}));
vi.mock('@/components/notifications', () => ({ NotificacoesSino: () => null }));
vi.mock('@/components/admin/Breadcrumb', () => ({ default: () => null }));
vi.mock('@/components/auth/SessionTimeoutModal', () => ({ default: () => null }));

const mockedUseMediaQuery = vi.mocked(useMediaQuery);

function renderLayout(path = '/admin/clientes') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="*"
          element={
            <AdminLayout>
              <p>conteúdo da página</p>
            </AdminLayout>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('AdminLayout', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mockedUseMediaQuery.mockReset();
  });

  describe('a partir de 1024 px (desktop)', () => {
    beforeEach(() => mockedUseMediaQuery.mockReturnValue(true));

    it('mostra a sidebar fixa e não mostra o botão de menu', () => {
      renderLayout();
      expect(mockedUseMediaQuery).toHaveBeenCalledWith('(min-width: 1024px)');
      expect(screen.getByRole('complementary', { name: 'layout.mainMenu' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'layout.openMenu' })).not.toBeInTheDocument();
    });

    it('renderiza o conteúdo da página', () => {
      renderLayout();
      expect(screen.getByText('conteúdo da página')).toBeInTheDocument();
    });
  });

  describe('abaixo de 1024 px (tablet e celular)', () => {
    beforeEach(() => mockedUseMediaQuery.mockReturnValue(false));

    it('esconde a sidebar e mostra o botão de menu no header', () => {
      renderLayout();
      expect(
        screen.queryByRole('complementary', { name: 'layout.mainMenu' })
      ).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'layout.openMenu' })).toBeInTheDocument();
      expect(screen.getByText('conteúdo da página')).toBeInTheDocument();
    });

    it('abre o menu em uma gaveta ao tocar no botão', () => {
      renderLayout();
      fireEvent.click(screen.getByRole('button', { name: 'layout.openMenu' }));

      const gaveta = screen.getByRole('dialog');
      expect(
        within(gaveta).getByRole('complementary', { name: 'layout.mainMenu' })
      ).toBeInTheDocument();
      expect(within(gaveta).getByRole('button', { name: 'nav.dashboard' })).toBeInTheDocument();
    });

    it('fecha a gaveta ao navegar para outra tela', async () => {
      renderLayout('/admin/clientes');
      fireEvent.click(screen.getByRole('button', { name: 'layout.openMenu' }));
      fireEvent.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'nav.dashboard' })
      );

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('mostra a gaveta sempre expandida, sem o botão de recolher', () => {
      localStorage.setItem('admin-sidebar-collapsed', 'true');
      renderLayout();
      fireEvent.click(screen.getByRole('button', { name: 'layout.openMenu' }));

      const gaveta = screen.getByRole('dialog');
      expect(within(gaveta).getByText('nav.dashboard')).toBeInTheDocument();
      expect(
        within(gaveta).queryByRole('button', { name: 'layout.collapseMenu' })
      ).not.toBeInTheDocument();
    });
  });

  it('marca o shell com o escopo do design system v2', () => {
    mockedUseMediaQuery.mockReturnValue(true);
    renderLayout();
    expect(screen.getByRole('banner')).toHaveAttribute('data-ds', 'v2');
    expect(screen.getByRole('complementary', { name: 'layout.mainMenu' })).toHaveAttribute(
      'data-ds',
      'v2'
    );
  });
});
