import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SegmentedTabs } from '@/components/ds/SegmentedTabs';
import { useMediaQuery } from '@/hooks/useMediaQuery';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: vi.fn() }));
const mockedMedia = vi.mocked(useMediaQuery);

const tres = [
  { valor: 'comex', rotulo: 'Banco COMEX' },
  { valor: 'edocs', rotulo: 'FISCAL – e-DOCS', contador: 4 },
  { valor: 'fiscal', rotulo: 'Banco FISCAL', selo: 'padrão' },
];

describe('SegmentedTabs', () => {
  beforeEach(() => mockedMedia.mockReset().mockReturnValue(true));

  it('marca a aba selecionada', () => {
    render(<SegmentedTabs rotulo="Bancos" itens={tres} valor="edocs" onChange={vi.fn()} />);
    expect(screen.getByRole('tablist', { name: 'Bancos' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /FISCAL – e-DOCS/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('tab', { name: /Banco COMEX/ })).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });

  it('mostra contador e selo junto do rótulo', () => {
    render(<SegmentedTabs rotulo="Bancos" itens={tres} valor="comex" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: /FISCAL – e-DOCS/ })).toHaveTextContent('4');
    expect(screen.getByRole('tab', { name: /Banco FISCAL/ })).toHaveTextContent('padrão');
  });

  it('chama onChange ao clicar', () => {
    const onChange = vi.fn();
    render(<SegmentedTabs rotulo="Bancos" itens={tres} valor="comex" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: /Banco FISCAL/ }));
    expect(onChange).toHaveBeenCalledWith('fiscal');
  });

  it('navega com as setas do teclado', () => {
    const onChange = vi.fn();
    render(<SegmentedTabs rotulo="Bancos" itens={tres} valor="edocs" onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: /FISCAL – e-DOCS/ }), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('fiscal');
    fireEvent.keyDown(screen.getByRole('tab', { name: /FISCAL – e-DOCS/ }), { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith('comex');
  });

  it('na variante sublinhado mantém o mesmo comportamento de abas', () => {
    const onChange = vi.fn();
    render(
      <SegmentedTabs
        rotulo="Seções"
        variante="sublinhado"
        itens={tres}
        valor="comex"
        onChange={onChange}
      />
    );
    const lista = screen.getByRole('tablist', { name: 'Seções' });
    expect(lista).toHaveAttribute('data-variante', 'sublinhado');
    fireEvent.click(screen.getByRole('tab', { name: /Banco FISCAL/ }));
    expect(onChange).toHaveBeenCalledWith('fiscal');
  });

  it('vira uma lista de seleção no celular quando há mais de 4 opções', () => {
    mockedMedia.mockReturnValue(false);
    const cinco = [...tres, { valor: 'a', rotulo: 'Banco A' }, { valor: 'b', rotulo: 'Banco B' }];
    const onChange = vi.fn();
    render(<SegmentedTabs rotulo="Bancos" itens={cinco} valor="comex" onChange={onChange} />);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    const select = screen.getByRole('combobox', { name: 'Bancos' });
    fireEvent.change(select, { target: { value: 'b' } });
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
