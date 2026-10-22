import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FilterBar } from '@/components/ds/FilterBar';
import { useMediaQuery } from '@/hooks/useMediaQuery';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key} ${JSON.stringify(opts)}` : key,
  }),
}));
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: vi.fn() }));
const mockedMedia = vi.mocked(useMediaQuery);

function renderBarra(props: Partial<React.ComponentProps<typeof FilterBar>> = {}) {
  return render(
    <FilterBar
      busca={{ valor: '', onChange: vi.fn(), placeholder: 'Buscar empresa…' }}
      filtrosAtivos={0}
      onLimpar={vi.fn()}
      {...props}
    >
      <label>
        Situação
        <select aria-label="Situação">
          <option>Todas</option>
        </select>
      </label>
    </FilterBar>
  );
}

describe('FilterBar', () => {
  beforeEach(() => mockedMedia.mockReset());

  it('repassa o texto digitado na busca', () => {
    mockedMedia.mockReturnValue(true);
    const onChange = vi.fn();
    renderBarra({ busca: { valor: '', onChange, placeholder: 'Buscar empresa…' } });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar empresa…' }), {
      target: { value: 'alfa' },
    });
    expect(onChange).toHaveBeenCalledWith('alfa');
  });

  describe('a partir de 768 px', () => {
    beforeEach(() => mockedMedia.mockReturnValue(true));

    it('mostra os filtros na própria barra', () => {
      renderBarra();
      expect(screen.getByRole('combobox', { name: 'Situação' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /ds.filters/ })).not.toBeInTheDocument();
    });

    it('mostra "Limpar filtros" só quando há filtro ativo', () => {
      const { rerender } = renderBarra();
      expect(screen.queryByRole('button', { name: 'ds.clearFilters' })).not.toBeInTheDocument();
      const onLimpar = vi.fn();
      rerender(
        <FilterBar
          busca={{ valor: 'x', onChange: vi.fn(), placeholder: 'Buscar empresa…' }}
          filtrosAtivos={2}
          onLimpar={onLimpar}
        >
          <select aria-label="Situação" />
        </FilterBar>
      );
      fireEvent.click(screen.getByRole('button', { name: 'ds.clearFilters' }));
      expect(onLimpar).toHaveBeenCalled();
    });
  });

  describe('abaixo de 768 px', () => {
    beforeEach(() => mockedMedia.mockReturnValue(false));

    it('esconde os filtros atrás de um botão com a contagem de ativos', () => {
      renderBarra({ filtrosAtivos: 2 });
      expect(screen.queryByRole('combobox', { name: 'Situação' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ds.filters/ })).toHaveTextContent('2');
    });

    it('abre os filtros numa gaveta', () => {
      renderBarra({ filtrosAtivos: 1 });
      fireEvent.click(screen.getByRole('button', { name: /ds.filters/ }));
      const gaveta = screen.getByRole('dialog');
      expect(within(gaveta).getByRole('combobox', { name: 'Situação' })).toBeInTheDocument();
      expect(within(gaveta).getByRole('button', { name: 'ds.clearFilters' })).toBeInTheDocument();
    });
  });
});
