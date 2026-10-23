import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BotaoFiltros, FiltroAlternar, FiltroMultiplo } from '@/components/ds/Filtros';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
  }),
}));

const opcoes: { valor: 'ativo' | 'inativo'; rotulo: string }[] = [
  { valor: 'ativo', rotulo: 'Ativas' },
  { valor: 'inativo', rotulo: 'Inativas' },
];

describe('FiltroMultiplo', () => {
  it('marca e desmarca opções', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <FiltroMultiplo rotulo="Status" opcoes={opcoes} selecionados={[]} onChange={onChange} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Status' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ativas' }));
    expect(onChange).toHaveBeenLastCalledWith(['ativo']);

    rerender(
      <FiltroMultiplo
        rotulo="Status"
        opcoes={opcoes}
        selecionados={['ativo']}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ativas' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('com uma opção marcada mostra o nome dela; limpar tira todas', () => {
    const onChange = vi.fn();
    render(
      <FiltroMultiplo
        rotulo="Status"
        opcoes={opcoes}
        selecionados={['inativo']}
        onChange={onChange}
      />
    );
    const gatilho = screen.getByRole('button', { name: /Status/ });
    expect(gatilho).toHaveTextContent('Inativas');
    fireEvent.click(gatilho);
    fireEvent.click(screen.getByRole('button', { name: 'ds.filtros.limparSelecao' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });
});

describe('BotaoFiltros e FiltroAlternar', () => {
  it('o botão diz quantos filtros estão ativos', () => {
    render(<BotaoFiltros abertos={false} ativos={2} controla="f" onClick={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: 'ds.filtros.ativos {"quantidade":2}' })
    ).toBeInTheDocument();
  });

  it('o filtro liga/desliga alterna', () => {
    const onChange = vi.fn();
    render(<FiltroAlternar rotulo="Só pendentes" ativo={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Só pendentes' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
