import { render, screen, within, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataTable, type ColunaTabela } from '@/components/ds/DataTable';
import { useMediaQuery } from '@/hooks/useMediaQuery';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: vi.fn() }));
const mockedMedia = vi.mocked(useMediaQuery);

interface Linha {
  id: string;
  empresa: string;
  diferenca: string;
}

const colunas: ColunaTabela<Linha>[] = [
  { id: 'empresa', cabecalho: 'Empresa', celula: (l) => l.empresa, mobile: 'titulo' },
  { id: 'diferenca', cabecalho: 'Diferença', celula: (l) => l.diferenca, alinhar: 'direita' },
  {
    id: 'acoes',
    cabecalho: 'Ação',
    celula: (l) => <button type="button">Liberar {l.empresa}</button>,
    mobile: 'acoes',
  },
];
const linhas: Linha[] = [
  { id: '1', empresa: 'Empresa Alfa', diferenca: '00:00' },
  { id: '2', empresa: 'Empresa Beta', diferenca: '-01:30' },
];

describe('DataTable', () => {
  beforeEach(() => mockedMedia.mockReset());

  describe('a partir de 768 px', () => {
    beforeEach(() => mockedMedia.mockReturnValue(true));

    it('renderiza uma tabela com cabeçalhos e linhas', () => {
      render(
        <DataTable rotulo="Comparação" colunas={colunas} linhas={linhas} chaveLinha={(l) => l.id} />
      );
      expect(mockedMedia).toHaveBeenCalledWith('(min-width: 768px)');
      const tabela = screen.getByRole('table', { name: 'Comparação' });
      expect(
        within(tabela)
          .getAllByRole('columnheader')
          .map((c) => c.textContent)
      ).toEqual(['Empresa', 'Diferença', 'Ação']);
      expect(within(tabela).getAllByRole('row')).toHaveLength(3);
    });

    it('marca a linha selecionada', () => {
      render(
        <DataTable
          rotulo="Comparação"
          colunas={colunas}
          linhas={linhas}
          chaveLinha={(l) => l.id}
          linhaSelecionada="2"
        />
      );
      const linha = screen.getByText('Empresa Beta').closest('tr');
      expect(linha).toHaveAttribute('aria-selected', 'true');
    });

    it('chama onLinhaClick com a linha clicada', () => {
      const onLinhaClick = vi.fn();
      render(
        <DataTable
          rotulo="Comparação"
          colunas={colunas}
          linhas={linhas}
          chaveLinha={(l) => l.id}
          onLinhaClick={onLinhaClick}
        />
      );
      fireEvent.click(screen.getByText('Empresa Alfa'));
      expect(onLinhaClick).toHaveBeenCalledWith(linhas[0]);
    });
  });

  describe('abaixo de 768 px', () => {
    beforeEach(() => mockedMedia.mockReturnValue(false));

    it('renderiza cartões em lista, com rótulo em cada campo de detalhe', () => {
      render(
        <DataTable rotulo="Comparação" colunas={colunas} linhas={linhas} chaveLinha={(l) => l.id} />
      );
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      const lista = screen.getByRole('list', { name: 'Comparação' });
      const cartoes = within(lista).getAllByRole('listitem');
      expect(cartoes).toHaveLength(2);
      expect(within(cartoes[1]).getByText('Empresa Beta')).toBeInTheDocument();
      expect(within(cartoes[1]).getByText('Diferença')).toBeInTheDocument();
      expect(within(cartoes[1]).getByText('-01:30')).toBeInTheDocument();
      expect(
        within(cartoes[1]).getByRole('button', { name: 'Liberar Empresa Beta' })
      ).toBeInTheDocument();
    });
  });

  it('mostra o estado vazio quando não há linhas', () => {
    mockedMedia.mockReturnValue(true);
    render(
      <DataTable
        rotulo="Comparação"
        colunas={colunas}
        linhas={[]}
        chaveLinha={(l) => l.id}
        vazio={<p>Nenhuma empresa</p>}
      />
    );
    expect(screen.getByText('Nenhuma empresa')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('indica carregamento sem mostrar linhas', () => {
    mockedMedia.mockReturnValue(true);
    render(
      <DataTable
        rotulo="Comparação"
        colunas={colunas}
        linhas={linhas}
        chaveLinha={(l) => l.id}
        carregando
      />
    );
    expect(screen.getByRole('status', { name: 'ds.loading' })).toBeInTheDocument();
    expect(screen.queryByText('Empresa Alfa')).not.toBeInTheDocument();
  });
});
