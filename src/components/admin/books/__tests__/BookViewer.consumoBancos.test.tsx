/**
 * Visualizador do Book: abas de consumo por banco da empresa liberada (Fase 5).
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// refetch estável: o visualizador volta para a Capa sempre que ele muda
const estado = vi.hoisted(() => ({ consumoBancos: [] as any[], refetch: () => undefined }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, padrao?: string) => (typeof padrao === 'string' ? padrao : chave),
    i18n: { language: 'pt-BR', changeLanguage: vi.fn() },
  }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useBooks', () => ({
  useBookData: () => ({
    bookData: {
      id: 'b1',
      empresa_id: 'e1',
      empresa_nome: 'EMPRESA ALFA LTDA',
      mes: 9,
      ano: 2026,
      capa: { empresa_nome_abreviado: 'EMPRESA ALFA' },
      volumetria: {},
      sla: {},
      backlog: {},
      consumo: {},
      pesquisa: {},
    },
    isLoading: false,
    refetch: estado.refetch,
  }),
}));
vi.mock('@/hooks/useEmpresaProdutos', () => ({
  useEmpresaProdutos: () => ({ data: [], isLoading: false }),
}));
vi.mock('@/hooks/useEmpresaSegmentacao', () => ({
  useEmpresaSegmentacao: () => ({ baselineSegmentado: false, paginasSegmentos: [] }),
}));
vi.mock('@/hooks/useRequerimentosEmDesenvolvimentoBook', () => ({
  useRequerimentosEmDesenvolvimentoBook: () => ({ requerimentosEmDesenvolvimento: [] }),
}));
vi.mock('@/hooks/useRequerimentosFaturadosBook', () => ({
  useRequerimentosFaturadosBook: () => ({ requerimentosFaturados: [] }),
}));
vi.mock('@/hooks/useConsumoBancosDoBook', () => ({
  useConsumoBancosDoBook: () => ({ bancos: estado.consumoBancos, carregado: true, erro: null }),
}));
vi.mock('@/services/booksPDFServiceV2', () => ({ booksPDFServiceV2: {} }));
vi.mock('@/services/booksService', () => ({ booksService: {} }));
vi.mock('@/utils/gerarExcelDetalhadoBook', () => ({ gerarExcelDetalhadoBook: vi.fn() }));

const { stub } = vi.hoisted(() => ({
  stub: (nome: string) => ({ default: () => <div>{nome}</div> }),
}));
vi.mock('../BookCapa', () => stub('BookCapa'));
vi.mock('../BookVolumetria', () => stub('BookVolumetria'));
vi.mock('../BookSLA', () => stub('BookSLA'));
vi.mock('../BookBacklog', () => stub('BookBacklog'));
vi.mock('../BookConsumo', () => stub('BookConsumo'));
vi.mock('../BookPesquisa', () => stub('BookPesquisa'));
vi.mock('../BookOrganograma', () => stub('BookOrganograma'));
vi.mock('../BookOrganogramaComercialCS', () => stub('BookOrganogramaComercialCS'));
vi.mock('../BookPortfolio', () => stub('BookPortfolio'));
vi.mock('../BookContraCapa', () => stub('BookContraCapa'));
vi.mock('../BookConsumoSegmentado', () => stub('BookConsumoSegmentado'));
vi.mock('../BookRequerimentos', () => stub('BookRequerimentos'));
vi.mock('../BookConsumoBancos', () => ({
  default: ({ banco }: any) => <div data-testid="consumo-banco">{banco.nome_banco}</div>,
}));

import BookViewer from '../BookViewer';

function renderizar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BookViewer
        book={{ id: 'b1', empresa_id: 'e1', mes: 9, ano: 2026 } as any}
        open
        onOpenChange={vi.fn()}
      />
    </QueryClientProvider>
  );
}

describe('BookViewer — consumo por banco (Fase 5)', () => {
  beforeEach(() => {
    estado.consumoBancos = [];
  });

  it('empresa liberada: uma aba de consumo por banco, no lugar da aba de consumo atual', () => {
    estado.consumoBancos = [
      { ordem: 1, banco_id: 'b1', nome_banco: 'Banco COMEX' },
      { ordem: 2, banco_id: 'b2', nome_banco: 'Banco FISCAL' },
    ];
    renderizar();

    expect(screen.getByRole('tab', { name: 'books.tabs.consumo Banco COMEX' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'books.tabs.consumo' })).not.toBeInTheDocument();

    // O Radix ativa a aba no mousedown (o clique simulado não chega a ele no jsdom)
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'books.tabs.consumo Banco FISCAL' }), {
      button: 0,
    });
    expect(screen.getByRole('tab', { name: 'books.tabs.consumo Banco FISCAL' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByTestId('consumo-banco')).toHaveTextContent('Banco FISCAL');
  });

  it('Book sem consumo por banco: a aba de consumo atual', () => {
    renderizar();
    expect(screen.getByRole('tab', { name: 'books.tabs.consumo' })).toBeInTheDocument();
  });
});
