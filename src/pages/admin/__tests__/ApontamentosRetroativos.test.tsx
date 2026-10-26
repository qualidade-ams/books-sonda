import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import ApontamentosRetroativos from '../ApontamentosRetroativos';
import type { Retroativo } from '@/types/retroativos';

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

const retroativo = (id: string, extra: Partial<Retroativo> = {}): Retroativo => ({
  id,
  empresaId: 'e1',
  empresa: 'ALFA',
  bancoId: 'b1',
  banco: 'BANCO COMEX',
  mes: { ano: 2026, mes: 9 },
  consumoAntesMinutos: 600,
  consumoDepoisMinutos: 660,
  consumoAntesTickets: 0,
  consumoDepoisTickets: 0,
  detectadoEm: '2026-10-05T12:00:00Z',
  atualizadoEm: '2026-10-05T12:00:00Z',
  situacao: 'pendente',
  decisao: null,
  retificacao: null,
  itens: [],
  ...extra,
});

const estado = {
  retroativos: [
    retroativo('r1'),
    retroativo('r2', { empresaId: 'e2', empresa: 'BETA', banco: 'Banco padrão' }),
    retroativo('r3', { empresa: 'GAMA', situacao: 'aprovado' }),
  ],
  contagem: { pendente: 2, aprovado: 1, aplicado: 0, descartado: 0 },
  isLoading: false,
  error: null as Error | null,
  recarregar: vi.fn(),
  decidir: vi.fn(async () => undefined),
  registrarAviso: vi.fn(async () => undefined),
  emailsDosConsultores: vi.fn(async () => ({})),
  isSalvando: false,
};
vi.mock('@/hooks/useRetroativos', () => ({ useRetroativos: () => estado }));
let permissoes: string[] = [];
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: (tela: string, nivel: string) => permissoes.includes(`${tela}:${nivel}`),
  }),
}));

beforeEach(() => {
  permissoes = ['bancos_horas_retroativos:edit'];
  estado.error = null;
  estado.decidir.mockClear();
  estado.recarregar.mockClear();
});

const renderizar = () =>
  render(
    <MemoryRouter>
      <TooltipProvider>
        <ApontamentosRetroativos />
      </TooltipProvider>
    </MemoryRouter>
  );
const lista = () => within(screen.getByRole('list', { name: 'apontamentosRetroativos.lista' }));

describe('ApontamentosRetroativos', () => {
  it('abre nos pendentes; a aba muda a situação', () => {
    renderizar();
    expect(lista().getByText('ALFA')).toBeInTheDocument();
    expect(lista().getByText('BETA')).toBeInTheDocument();
    expect(lista().queryByText('GAMA')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /apontamentosRetroativos.abas.aprovado/ }));
    expect(lista().getByText('GAMA')).toBeInTheDocument();
    expect(lista().queryByText('ALFA')).not.toBeInTheDocument();
  });

  it('busca filtra e, sem resultado, oferece limpar', () => {
    renderizar();
    fireEvent.change(screen.getByRole('searchbox', { name: 'apontamentosRetroativos.buscar' }), {
      target: { value: 'padrão' },
    });
    expect(lista().getByText('BETA')).toBeInTheDocument();
    expect(lista().queryByText('ALFA')).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: 'apontamentosRetroativos.buscar' }), {
      target: { value: 'nada disso' },
    });
    expect(screen.getByText('apontamentosRetroativos.vazio.filtro')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'fase3Comum.limparFiltros' })[0]);
    expect(lista().getByText('ALFA')).toBeInTheDocument();
  });

  it('aprovar pede a justificativa e decide', async () => {
    renderizar();
    fireEvent.click(
      lista().getAllByRole('button', { name: /apontamentosRetroativos.cartao.aprovar/ })[0]
    );
    const dialogo = within(screen.getByRole('alertdialog'));
    expect(
      dialogo.getByText(
        'apontamentosRetroativos.decidir.aprovarTitulo {"empresa":"ALFA","banco":"BANCO COMEX"}'
      )
    ).toBeInTheDocument();
    fireEvent.change(dialogo.getByLabelText(/apontamentosRetroativos.decidir.justificativa/), {
      target: { value: 'Confirmado com o cliente' },
    });
    fireEvent.click(
      dialogo.getByRole('button', { name: 'apontamentosRetroativos.cartao.aprovar' })
    );
    await waitFor(() =>
      expect(estado.decidir).toHaveBeenCalledWith({
        retroativoId: 'r1',
        decisao: 'aprovar',
        justificativa: 'Confirmado com o cliente',
      })
    );
  });

  it('quem só vê não decide', () => {
    permissoes = ['bancos_horas_retroativos:view'];
    renderizar();
    expect(
      screen.queryByRole('button', { name: /apontamentosRetroativos.cartao.aprovar/ })
    ).not.toBeInTheDocument();
  });

  it('erro ao carregar: tentar de novo', () => {
    estado.error = new Error('sem rede');
    renderizar();
    expect(screen.getByText('apontamentosRetroativos.erro')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.tentarNovamente' }));
    expect(estado.recarregar).toHaveBeenCalled();
  });
});
