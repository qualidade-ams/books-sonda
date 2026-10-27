import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PeriodPicker } from '@/components/ds/PeriodPicker';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('PeriodPicker', () => {
  it('mostra o período e navega para o anterior e o próximo', () => {
    const onAnterior = vi.fn();
    const onProximo = vi.fn();
    render(
      <PeriodPicker rotulo="Jul/2026 – Set/2026" onAnterior={onAnterior} onProximo={onProximo} />
    );
    expect(screen.getByText('Jul/2026 – Set/2026')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ds.previousPeriod' }));
    fireEvent.click(screen.getByRole('button', { name: 'ds.nextPeriod' }));
    expect(onAnterior).toHaveBeenCalled();
    expect(onProximo).toHaveBeenCalled();
  });

  it('desabilita a navegação fora dos limites', () => {
    render(
      <PeriodPicker
        rotulo="Jan/2026 – Mar/2026"
        onAnterior={vi.fn()}
        onProximo={vi.fn()}
        podeAnterior={false}
        podeProximo={false}
      />
    );
    expect(screen.getByRole('button', { name: 'ds.previousPeriod' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'ds.nextPeriod' })).toBeDisabled();
  });
});
