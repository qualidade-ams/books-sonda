import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import OrganizarMenu from '../OrganizarMenu';
import { APARENCIA_PADRAO } from '@/config/aparenciaPadrao';
import type { ItemMenuSalvo, NoMenu } from '@/types/menuOrganizado';

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

const APARENCIA = APARENCIA_PADRAO;
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
  enviarLogo: vi.fn(async () => 'claro/aberto-1.png'),
  isSalvando: false,
};
vi.mock('@/hooks/useMenuOrganizado', () => ({
  useMenuOrganizado: () => estado,
  useLogoMenu: (caminho: string | null) => (caminho ? `https://storage/${caminho}` : null),
}));
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

  describe('aba Cores', () => {
    const abrirCores = () => {
      renderizar();
      fireEvent.click(screen.getByRole('tab', { name: 'organizarMenu.abas.cores' }));
    };
    const codigo = (parte: string, parteDaCor: 'fundo' | 'texto') =>
      screen.getByRole('textbox', {
        name: new RegExp(
          `organizarMenu.cores.codigo.*organizarMenu.cores.${parteDaCor}.*organizarMenu.cores.partes.${parte}`
        ),
      });

    beforeEach(() => {
      document.documentElement.classList.remove('dark');
      localStorage.clear();
    });

    it('muda a cor do selecionado, mostra a prévia e salva com a ordem como está', async () => {
      abrirCores();
      expect(
        screen.getByRole('complementary', { name: 'organizarMenu.cores.previa' })
      ).toBeInTheDocument();

      fireEvent.change(codigo('selecionado', 'fundo'), { target: { value: '#ff0000' } });
      expect(screen.getByText(/organizarMenu.mudancasCores.cores.claro/)).toBeInTheDocument();
      expect(screen.getByText('organizarMenu.cores.alterada')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'organizarMenu.salvar' }));
      fireEvent.click(
        within(screen.getByRole('alertdialog')).getByRole('button', {
          name: 'organizarMenu.salvar',
        })
      );
      await waitFor(() => expect(estado.salvar).toHaveBeenCalled());
      const { arvore, aparenciaAtual, aparenciaNova } = (
        estado.salvar.mock.calls[0] as unknown as [
          {
            arvore: NoMenu[];
            aparenciaAtual: typeof APARENCIA;
            aparenciaNova: typeof APARENCIA;
          },
        ]
      )[0];
      expect(arvore[0].chave).toBe('administracao');
      expect(aparenciaAtual).toBe(APARENCIA);
      expect(aparenciaNova.claro.selecionadoFundo).toBe('#FF0000');
      expect(aparenciaNova.escuro).toEqual(APARENCIA.escuro);
    });

    it('avisa quando o texto tem pouco contraste com o fundo', () => {
      abrirCores();
      fireEvent.change(codigo('item', 'texto'), { target: { value: '#EEEEEE' } });
      expect(screen.getByText(/organizarMenu.cores.contraste/)).toBeInTheDocument();
    });

    it('a aba de tema troca o tema da página', async () => {
      abrirCores();
      fireEvent.click(screen.getByRole('tab', { name: 'organizarMenu.cores.temas.escuro' }));
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      await waitFor(() => expect(codigo('menu', 'fundo')).toHaveValue('#1C1C1C'));
    });

    it('envia o logo e usa o caminho na aparência; usar o padrão volta ao da Sonda', async () => {
      abrirCores();
      const arquivo = new File(['x'], 'logo.png', { type: 'image/png' });
      fireEvent.change(
        screen.getByLabelText(/organizarMenu.cores.enviarLogo.*organizarMenu.cores.logoAberto/),
        { target: { files: [arquivo] } }
      );
      await waitFor(() =>
        expect(estado.enviarLogo).toHaveBeenCalledWith({ tema: 'claro', tipo: 'aberto', arquivo })
      );
      expect(await screen.findByText(/organizarMenu.mudancasCores.logo.claro/)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'organizarMenu.cores.usarPadrao' }));
      expect(screen.queryByText(/organizarMenu.mudancasCores.logo/)).not.toBeInTheDocument();
    });

    it('arquivo grande demais não é enviado', () => {
      abrirCores();
      const grande = new File([new Uint8Array(600 * 1024)], 'logo.png', { type: 'image/png' });
      fireEvent.change(
        screen.getByLabelText(/organizarMenu.cores.enviarLogo.*organizarMenu.cores.logoAberto/),
        { target: { files: [grande] } }
      );
      expect(screen.getByText('organizarMenu.cores.erroTamanho')).toBeInTheDocument();
      expect(estado.enviarLogo).not.toHaveBeenCalled();
    });

    it('cores padrão volta às da carga no tema em uso', () => {
      estado.menu = {
        itens: SALVOS,
        aparencia: { ...APARENCIA, claro: { ...APARENCIA.claro, menuFundo: '#000000' } },
      };
      abrirCores();
      expect(codigo('menu', 'fundo')).toHaveValue('#000000');
      fireEvent.click(screen.getByRole('button', { name: /organizarMenu.cores.padrao/ }));
      expect(codigo('menu', 'fundo')).toHaveValue('#FAFBFC');
    });
  });
});
