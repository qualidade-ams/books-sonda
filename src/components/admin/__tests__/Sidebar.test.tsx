import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import Sidebar from '../Sidebar';
import type { ItemMenuSalvo } from '@/types/menuOrganizado';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (chave: string) => chave }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ signOut: vi.fn() }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const permitidas = { telas: [] as string[] };
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ hasPermission: (k: string) => permitidas.telas.includes(k) }),
}));

const salvo = { itens: [] as ItemMenuSalvo[], aparencia: null as Record<string, unknown> | null };
vi.mock('@/hooks/useMenuOrganizado', () => ({
  useMenuOrganizado: () => ({
    menu:
      salvo.itens.length || salvo.aparencia
        ? { itens: salvo.itens, aparencia: salvo.aparencia ?? {} }
        : null,
  }),
  useLogoMenu: (caminho: string | null) => (caminho ? `https://storage/${caminho}` : null),
}));

function Rota() {
  return <p data-testid="rota">{useLocation().pathname}</p>;
}

const renderizar = (props: Partial<Parameters<typeof Sidebar>[0]> = {}) =>
  render(
    <MemoryRouter initialEntries={['/admin/dashboard']}>
      <TooltipProvider>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} {...props} />
        <Routes>
          <Route path="*" element={<Rota />} />
        </Routes>
      </TooltipProvider>
    </MemoryRouter>
  );

const nav = () => screen.getByRole('navigation');
const rotulosDoTopo = () =>
  within(nav())
    .getAllByRole('button')
    .map((b) => b.textContent);

describe('Sidebar', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    salvo.itens = [];
    salvo.aparencia = null;
    permitidas.telas = ['dashboard', 'empresas', 'clientes', 'grupos'];
  });

  it('mostra o menu do código só com as telas permitidas; menu sem tela visível some', () => {
    renderizar();
    expect(rotulosDoTopo()).toEqual(['nav.dashboard', 'nav.clients', 'nav.administration']);
  });

  it('abre o menu e navega para a tela', () => {
    renderizar();
    fireEvent.click(within(nav()).getByRole('button', { name: 'nav.clients' }));
    expect(rotulosDoTopo()).toEqual([
      'nav.dashboard',
      'nav.clients',
      'nav.companiesNew',
      'nav.clientEmails',
      'nav.administration',
    ]);

    fireEvent.click(within(nav()).getByRole('button', { name: 'nav.clientEmails' }));
    expect(screen.getByTestId('rota')).toHaveTextContent('/admin/clientes');
  });

  it('segue a ordem salva em Organizar Menu', () => {
    salvo.itens = [
      {
        chave: 'administracao',
        tipo: 'menu',
        pai: null,
        posicao: 0,
        rotuloI18n: 'nav.administration',
        icone: 'Shield',
      },
      {
        chave: '/admin/grupos',
        tipo: 'tela',
        pai: 'administracao',
        posicao: 0,
        rotuloI18n: 'nav.groups',
        icone: 'Users',
      },
      // Empresas solta no primeiro nível
      {
        chave: '/admin/empresas',
        tipo: 'tela',
        pai: null,
        posicao: 1,
        rotuloI18n: 'nav.companiesNew',
        icone: 'Building2',
      },
      {
        chave: '/admin/dashboard',
        tipo: 'tela',
        pai: null,
        posicao: 2,
        rotuloI18n: 'nav.dashboard',
        icone: 'Home',
      },
    ];
    renderizar();
    // Clientes, que a ordem salva não conhece, entra no fim com o que sobrou
    expect(rotulosDoTopo()).toEqual([
      'nav.administration',
      'nav.companiesNew',
      'nav.dashboard',
      'nav.clients',
    ]);
  });

  it('recolhido, mostra as telas do menu ao passar o mouse', () => {
    renderizar({ isCollapsed: true });
    const botoes = within(nav()).getAllByRole('button');
    // Dashboard, Clientes, Administração
    fireEvent.mouseEnter(botoes[1]);
    expect(screen.getByRole('button', { name: 'nav.companiesNew' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'nav.groups' })).not.toBeInTheDocument();
  });

  it('logo próprio do tema em uso; sem ele, o da Sonda', () => {
    const tema = (logoPath: string | null, logoRecolhidoPath: string | null) => ({
      menuFundo: '#1C1C1C',
      logoPath,
      logoRecolhidoPath,
    });
    salvo.aparencia = {
      claro: tema('claro/aberto.png', 'claro/recolhido.png'),
      escuro: tema(null, null),
    };

    const { unmount } = renderizar();
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://storage/claro/aberto.png');
    unmount();

    renderizar({ isCollapsed: true });
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://storage/claro/recolhido.png');
  });

  it('sem logo próprio, o da Sonda; claro sobre o fundo escuro do menu', () => {
    salvo.aparencia = {
      claro: { menuFundo: '#1C1C1C', logoPath: null, logoRecolhidoPath: null },
      escuro: { menuFundo: '#1C1C1C', logoPath: null, logoRecolhidoPath: null },
    };
    renderizar();
    const logo = screen.getByRole('img');
    expect(logo).toHaveAttribute('src', '/images/logo-sonda.png');
    expect(logo.className).not.toContain('brightness-0');
  });
});
