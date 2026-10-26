import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import OrganizarMenu from '../OrganizarMenu';
import type { ItemMenuSalvo } from '@/types/menuOrganizado';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));
vi.mock('@/components/admin/LayoutAdmin', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const permissao = { edicao: true };
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ hasPermission: () => permissao.edicao }),
}));

const APARENCIA = { claro: { menuFundo: '#FAFBFC' }, escuro: { menuFundo: '#1C1C1C' } };
// Administração no topo; o resto como no código
const SALVOS: ItemMenuSalvo[] = [
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
];
const estado = {
  menu: { itens: SALVOS, aparencia: APARENCIA } as unknown,
  isLoading: false,
  error: null as Error | null,
  recarregar: vi.fn(),
  salvar: vi.fn(async () => undefined),
  isSalvando: false,
};
vi.mock('@/hooks/useMenuOrganizado', () => ({ useMenuOrganizado: () => estado }));
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

const renderizar = () =>
  render(
    <MemoryRouter>
      <TooltipProvider>
        <OrganizarMenu />
      </TooltipProvider>
    </MemoryRouter>
  );
const lista = () => screen.getByRole('list', { name: 'organizarMenu.ordem.lista' });
const primeiro = () => within(lista()).getAllByRole('listitem')[0];

describe('OrganizarMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissao.edicao = true;
    estado.menu = { itens: SALVOS, aparencia: APARENCIA };
    estado.isLoading = false;
    estado.error = null;
  });

  it('mostra a ordem salva com todas as telas do código, inclusive a própria Organizar Menu', () => {
    renderizar();
    expect(primeiro()).toHaveTextContent('nav.administration');
    expect(within(lista()).getByText('nav.organizeMenu')).toBeInTheDocument();
    expect(within(lista()).getByText('nav.dashboard')).toBeInTheDocument();
    expect(
      within(lista()).getByRole('button', { name: /organizarMenu.ordem.reordenar.*nav.groups/ })
    ).toBeInTheDocument();
  });

  it('ordem padrão: mostra o resumo; salvar volta ao menu do código para todos', async () => {
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: /organizarMenu.ordem.padrao/ }));
    expect(primeiro()).toHaveTextContent('nav.dashboard');
    expect(screen.getByText(/organizarMenu.mudancas.ordemDosMenus/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'organizarMenu.salvar' }));
    const dialogo = screen.getByRole('alertdialog');
    expect(within(dialogo).getByText('organizarMenu.confirmar.todos')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'organizarMenu.salvar' }));

    await waitFor(() =>
      expect(estado.salvar).toHaveBeenCalledWith({
        arvore: null,
        aparenciaAtual: APARENCIA,
        aparenciaNova: APARENCIA,
      })
    );
  });

  it('descartar volta à ordem salva', () => {
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: /organizarMenu.ordem.padrao/ }));
    fireEvent.click(screen.getByRole('button', { name: 'organizarMenu.descartar' }));
    expect(primeiro()).toHaveTextContent('nav.administration');
    expect(screen.queryByRole('button', { name: 'organizarMenu.salvar' })).not.toBeInTheDocument();
  });

  it('sem nada salvo, a ordem padrão já está em uso', () => {
    estado.menu = { itens: [], aparencia: APARENCIA };
    renderizar();
    expect(primeiro()).toHaveTextContent('nav.dashboard');
    expect(screen.getByRole('button', { name: /organizarMenu.ordem.padrao/ })).toBeDisabled();
  });

  it('só quem edita arrasta e restaura', () => {
    permissao.edicao = false;
    renderizar();
    expect(
      within(lista()).queryByRole('button', { name: /organizarMenu.ordem.reordenar/ })
    ).toBeNull();
    expect(screen.queryByRole('button', { name: /organizarMenu.ordem.padrao/ })).toBeNull();
  });

  it('erro ao carregar: tenta de novo', () => {
    estado.menu = null;
    estado.error = new Error('sem rede');
    renderizar();
    expect(screen.getByText('organizarMenu.erro')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.tentarNovamente' }));
    expect(estado.recarregar).toHaveBeenCalled();
  });
});
