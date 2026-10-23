import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Paginacao, paginasVisiveis } from '@/components/ds/Paginacao';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
  }),
}));

describe('paginasVisiveis', () => {
  it('mostra todas até 7 páginas', () => {
    expect(paginasVisiveis(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('com mais, a primeira, a última e as vizinhas da atual, com reticências', () => {
    expect(paginasVisiveis(2, 20)).toEqual([1, 2, 3, 4, 5, '…', 20]);
    expect(paginasVisiveis(10, 20)).toEqual([1, '…', 9, 10, 11, '…', 20]);
    expect(paginasVisiveis(19, 20)).toEqual([1, '…', 16, 17, 18, 19, 20]);
  });
});

describe('Paginacao', () => {
  const props = { total: 120, pagina: 1, porPagina: 50, onPagina: vi.fn(), onPorPagina: vi.fn() };

  it('mostra o intervalo e desabilita Anterior na primeira página', () => {
    render(<Paginacao {...props} />);
    expect(
      screen.getByText('ds.paginacao.intervalo {"inicio":1,"fim":50,"total":120}')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ds.previous/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /ds.paginacao.proxima/ })).toBeEnabled();
  });

  it('vai para a página clicada e desabilita Próxima na última', () => {
    const onPagina = vi.fn();
    const { rerender } = render(<Paginacao {...props} onPagina={onPagina} />);
    fireEvent.click(screen.getByRole('button', { name: 'ds.paginacao.pagina {"pagina":3}' }));
    expect(onPagina).toHaveBeenCalledWith(3);

    rerender(<Paginacao {...props} pagina={3} onPagina={onPagina} />);
    expect(
      screen.getByText('ds.paginacao.intervalo {"inicio":101,"fim":120,"total":120}')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ds.paginacao.proxima/ })).toBeDisabled();
  });

  it('trocar a quantidade por página volta para a primeira', () => {
    const onPagina = vi.fn();
    const onPorPagina = vi.fn();
    render(<Paginacao {...props} pagina={2} onPagina={onPagina} onPorPagina={onPorPagina} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'ds.paginacao.itensPorPagina {"quantidade":50}' })
    );
    fireEvent.click(screen.getByRole('button', { name: '100' }));
    expect(onPorPagina).toHaveBeenCalledWith(100);
    expect(onPagina).toHaveBeenCalledWith(1);
  });
});
