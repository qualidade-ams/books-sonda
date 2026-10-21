import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MatrixTable, type LinhaMatriz } from '@/components/ds/MatrixTable';
import { useMediaQuery } from '@/hooks/useMediaQuery';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key} ${JSON.stringify(opts)}` : key,
  }),
}));
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: vi.fn() }));
const mockedMedia = vi.mocked(useMediaQuery);

const colunas = [
  { id: 'out', rotulo: 'Out/2026' },
  { id: 'nov', rotulo: 'Nov/2026' },
  { id: 'dez', rotulo: 'Dez/2026 (fechamento)' },
];
const linhas: LinhaMatriz[] = [
  { id: 'baseline', rotulo: 'Baseline', valores: { out: '40:00', nov: '40:00', dez: '40:00' } },
  {
    id: 'saldo',
    rotulo: 'Saldo do banco',
    valores: { out: '-01:30', nov: '-02:30', dez: '-06:30' },
    enfase: 'total',
  },
  {
    id: 'consumido',
    rotulo: 'Consumido de outros bancos',
    valores: { out: '—', nov: '—', dez: '+06:30' },
    enfase: 'info',
    selo: 'novo',
  },
];

describe('MatrixTable', () => {
  beforeEach(() => mockedMedia.mockReset());

  it('no desktop mostra todos os meses como colunas', () => {
    mockedMedia.mockReturnValue(true);
    render(
      <MatrixTable
        rotulo="Quadro mensal"
        rotuloIndicador="Indicador"
        colunas={colunas}
        linhas={linhas}
      />
    );
    const tabela = screen.getByRole('table', { name: 'Quadro mensal' });
    expect(
      within(tabela)
        .getAllByRole('columnheader')
        .map((c) => c.textContent)
    ).toEqual(['Indicador', 'Out/2026', 'Nov/2026', 'Dez/2026 (fechamento)']);
    expect(
      within(tabela).getByRole('rowheader', { name: /Consumido de outros bancos/ })
    ).toHaveTextContent('novo');
  });

  it('marca a ênfase da linha para o estilo', () => {
    mockedMedia.mockReturnValue(true);
    render(
      <MatrixTable
        rotulo="Quadro mensal"
        rotuloIndicador="Indicador"
        colunas={colunas}
        linhas={linhas}
      />
    );
    expect(screen.getByRole('rowheader', { name: 'Saldo do banco' }).closest('tr')).toHaveAttribute(
      'data-enfase',
      'total'
    );
  });

  it('marca a coluna do mês corrente, para leitor de tela e para o destaque em ciano', () => {
    mockedMedia.mockReturnValue(true);
    const comAtual = colunas.map((c) => (c.id === 'dez' ? { ...c, atual: true } : c));
    render(
      <MatrixTable
        rotulo="Quadro mensal"
        rotuloIndicador="Indicador"
        colunas={comAtual}
        linhas={linhas}
      />
    );
    expect(screen.getByRole('columnheader', { name: /^Dez/ })).toHaveAttribute(
      'aria-current',
      'date'
    );
    expect(screen.getByRole('columnheader', { name: 'Nov/2026' })).not.toHaveAttribute(
      'aria-current'
    );
  });

  describe('alinhamento das colunas dos meses', () => {
    beforeEach(() => mockedMedia.mockReturnValue(true));

    it('alinha à direita por padrão', () => {
      render(
        <MatrixTable
          rotulo="Quadro mensal"
          rotuloIndicador="Indicador"
          colunas={colunas}
          linhas={linhas}
        />
      );
      expect(screen.getByRole('columnheader', { name: 'Nov/2026' })).toHaveClass('text-right');
      expect(screen.getAllByRole('cell')[0]).toHaveClass('text-right');
    });

    it('centraliza cabeçalho e valores com alinhamento="centro" (ex.: botões de reajuste)', () => {
      render(
        <MatrixTable
          rotulo="Quadro mensal"
          rotuloIndicador="Indicador"
          colunas={colunas}
          linhas={linhas}
          alinhamento="centro"
        />
      );
      expect(screen.getByRole('columnheader', { name: 'Nov/2026' })).toHaveClass('text-center');
      expect(screen.getByRole('columnheader', { name: 'Nov/2026' })).not.toHaveClass('text-right');
      screen.getAllByRole('cell').forEach((c) => expect(c).toHaveClass('text-center'));
      // A coluna dos indicadores continua à esquerda
      expect(screen.getByRole('columnheader', { name: 'Indicador' })).toHaveClass('text-left');
    });
  });

  describe('no celular, modo mês a mês', () => {
    beforeEach(() => mockedMedia.mockReturnValue(false));

    it('mostra um mês por vez, começando pela coluna inicial', () => {
      render(
        <MatrixTable
          rotulo="Quadro mensal"
          rotuloIndicador="Indicador"
          colunas={colunas}
          linhas={linhas}
          modoMobile="mes-a-mes"
          colunaInicial="dez"
        />
      );
      const tabela = screen.getByRole('table', { name: 'Quadro mensal' });
      expect(
        within(tabela)
          .getAllByRole('columnheader')
          .map((c) => c.textContent)
      ).toEqual(['Indicador', 'Dez/2026 (fechamento)']);
      expect(screen.getByRole('button', { name: 'ds.next' })).toBeDisabled();
    });

    it('troca de mês com os botões anterior e próximo', () => {
      render(
        <MatrixTable
          rotulo="Quadro mensal"
          rotuloIndicador="Indicador"
          colunas={colunas}
          linhas={linhas}
          modoMobile="mes-a-mes"
        />
      );
      expect(screen.getByRole('button', { name: 'ds.previous' })).toBeDisabled();
      fireEvent.click(screen.getByRole('button', { name: 'ds.next' }));
      const tabela = screen.getByRole('table', { name: 'Quadro mensal' });
      expect(within(tabela).getAllByRole('columnheader')[1]).toHaveTextContent('Nov/2026');
      expect(screen.getByText(/ds.positionOf/)).toHaveTextContent('"atual":2');
    });
  });

  it('no celular, modo rolagem mantém todas as colunas', () => {
    mockedMedia.mockReturnValue(false);
    render(
      <MatrixTable
        rotulo="Quadro mensal"
        rotuloIndicador="Indicador"
        colunas={colunas}
        linhas={linhas}
        modoMobile="rolagem"
      />
    );
    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    expect(screen.queryByRole('button', { name: 'ds.next' })).not.toBeInTheDocument();
  });
});
