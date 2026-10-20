/**
 * Página de impressão do book (PDF): abas de requerimentos.
 */

import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const estado = vi.hoisted(() => ({
  emDesenvolvimento: [] as any[],
  faturados: [] as any[],
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string) => chave,
    i18n: { language: 'pt-BR', changeLanguage: vi.fn() },
  }),
}));

vi.mock('@/hooks/useBooks', () => ({
  useBookData: () => ({
    bookData: {
      id: 'b1',
      empresa_id: 'e1',
      empresa_nome: 'ABBOTT LABORATÓRIOS',
      mes: 9,
      ano: 2026,
      capa: { empresa_nome_abreviado: 'ABBOTT' },
      volumetria: {},
      sla: {},
      backlog: {},
      consumo: {},
      pesquisa: {},
      requerimentos_em_desenvolvimento: [],
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/hooks/useEmpresaProdutos', () => ({
  useEmpresaProdutos: () => ({ data: [], isLoading: false }),
}));
vi.mock('@/hooks/useEmpresaSegmentacao', () => ({
  useEmpresaSegmentacao: () => ({ baselineSegmentado: false, paginasSegmentos: [] }),
}));
vi.mock('@/hooks/useRequerimentosEmDesenvolvimentoBook', () => ({
  useRequerimentosEmDesenvolvimentoBook: () => ({
    requerimentosEmDesenvolvimento: estado.emDesenvolvimento,
    isLoading: false,
  }),
}));
vi.mock('@/hooks/useRequerimentosFaturadosBook', () => ({
  useRequerimentosFaturadosBook: () => ({
    requerimentosFaturados: estado.faturados,
    isLoading: false,
  }),
}));

const { stub } = vi.hoisted(() => ({
  stub: (nome: string) => ({ default: () => nome }),
}));
vi.mock('@/components/admin/books/BookCapa', () => stub('BookCapa'));
vi.mock('@/components/admin/books/BookVolumetria', () => stub('BookVolumetria'));
vi.mock('@/components/admin/books/BookSLA', () => stub('BookSLA'));
vi.mock('@/components/admin/books/BookBacklog', () => stub('BookBacklog'));
vi.mock('@/components/admin/books/BookConsumo', () => stub('BookConsumo'));
vi.mock('@/components/admin/books/BookPesquisa', () => stub('BookPesquisa'));
vi.mock('@/components/admin/books/BookPortfolio', () => stub('BookPortfolio'));
vi.mock('@/components/admin/books/BookOrganograma', () => stub('BookOrganograma'));
vi.mock('@/components/admin/books/BookOrganogramaComercialCS', () =>
  stub('BookOrganogramaComercialCS')
);
vi.mock('@/components/admin/books/BookContraCapa', () => stub('BookContraCapa'));
vi.mock('@/components/admin/books/BookConsumoSegmentado', () => stub('BookConsumoSegmentado'));
vi.mock('@/components/admin/books/BookRequerimentos', () => ({
  default: ({ data, allData, variante = 'desenvolvimento' }: any) => (
    <div data-testid={`requerimentos-${variante}`}>
      {data.length} de {allData.length}
    </div>
  ),
}));

import BookPrintView from '../BookPrintView';

const linhas = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `r${i}` }));

function renderizar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/pdf/book/b1']}>
        <Routes>
          <Route path="/pdf/book/:id" element={<BookPrintView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const secoes = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-section]')].map((el) => el.getAttribute('data-section'));

describe('BookPrintView — abas de requerimentos no PDF', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    estado.emDesenvolvimento = [];
    estado.faturados = [];
  });

  it('inclui as páginas de requerimentos em andamento e compensados entre Consumo e Pesquisa', () => {
    estado.emDesenvolvimento = linhas(12);
    estado.faturados = linhas(2);

    const { container } = renderizar();

    const ordem = secoes(container);
    expect(ordem.slice(ordem.indexOf('consumo'), ordem.indexOf('pesquisa') + 1)).toEqual([
      'consumo',
      'requerimentos-em-andamento-0',
      'requerimentos-em-andamento-1',
      'requerimentos-compensados-0',
      'pesquisa',
    ]);
    expect(
      screen.getAllByTestId('requerimentos-desenvolvimento').map((el) => el.textContent)
    ).toEqual(['11 de 12', '1 de 12']);
    expect(screen.getByTestId('requerimentos-faturado')).toHaveTextContent('2 de 2');
  });

  it('não inclui as páginas quando não há requerimentos', () => {
    const { container } = renderizar();

    expect(secoes(container).some((s) => s.startsWith('requerimentos'))).toBe(false);
  });
});
