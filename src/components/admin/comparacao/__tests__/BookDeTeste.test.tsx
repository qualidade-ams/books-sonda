import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookDeTeste } from '../BookDeTeste';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

vi.mock('@/components/admin/books/BookConsumoBancos', () => ({
  default: ({ banco, empresaDoBook }: { banco: { nome_banco: string }; empresaDoBook: string }) => (
    <div data-testid="bloco">
      {banco.nome_banco} / {empresaDoBook}
    </div>
  ),
}));

const estado = {
  bancos: [] as unknown[],
  isLoading: false,
  error: null as Error | null,
  recarregar: vi.fn(),
};
const pedidos: unknown[][] = [];
vi.mock('@/hooks/useComparacao', () => ({
  useBookDeTeste: (...args: unknown[]) => {
    pedidos.push(args);
    return estado;
  },
}));

const SET = { mes: 9, ano: 2026 };
const renderizar = (onFechar = vi.fn()) =>
  render(<BookDeTeste empresaId="e2" empresa="EMPRESA BETA" mes={SET} onFechar={onFechar} />);

beforeEach(() => {
  estado.bancos = [];
  estado.isLoading = false;
  estado.error = null;
  estado.recarregar.mockClear();
  pedidos.length = 0;
});

describe('BookDeTeste', () => {
  it('um bloco por banco do mês, calculado agora, avisando que nada é gravado nem enviado', () => {
    estado.bancos = [
      { banco_id: 'b1', nome_banco: 'Banco COMEX' },
      { banco_id: 'b2', nome_banco: 'Banco FISCAL' },
    ];
    renderizar();
    expect(pedidos[0]).toEqual(['e2', SET]);
    expect(screen.getByRole('heading', { name: 'EMPRESA BETA' })).toBeInTheDocument();
    expect(screen.getByText(/comparacaoBancosHoras.bookTeste.aviso/)).toBeInTheDocument();
    expect(screen.getAllByTestId('bloco').map((b) => b.textContent)).toEqual([
      'Banco COMEX / e2',
      'Banco FISCAL / e2',
    ]);
  });

  it('erro: tentar de novo', () => {
    estado.error = new Error('x');
    renderizar();
    expect(screen.getByText('comparacaoBancosHoras.bookTeste.erro')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.tentarNovamente' }));
    expect(estado.recarregar).toHaveBeenCalled();
  });

  it('sem banco que o cliente vê: explica', () => {
    renderizar();
    expect(screen.getByText('comparacaoBancosHoras.bookTeste.vazio')).toBeInTheDocument();
  });

  it('voltar fecha', () => {
    const onFechar = vi.fn();
    renderizar(onFechar);
    fireEvent.click(screen.getByRole('button', { name: /comparacaoBancosHoras.bookTeste.voltar/ }));
    expect(onFechar).toHaveBeenCalled();
  });
});
