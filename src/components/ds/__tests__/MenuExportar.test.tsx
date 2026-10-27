import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MenuExportar } from '@/components/ds/MenuExportar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
  }),
}));
const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

const abrir = () => userEvent.click(screen.getByRole('button', { name: 'ds.exportar.botao' }));

describe('MenuExportar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra o que será exportado e exporta no formato escolhido', async () => {
    const onExportar = vi.fn();
    render(
      <MenuExportar descricao="Exporta 3 ramos, com os filtros aplicados" onExportar={onExportar} />
    );
    await abrir();
    expect(screen.getByText('Exporta 3 ramos, com os filtros aplicados')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('menuitem', { name: 'ds.exportar.excel' }));
    expect(onExportar).toHaveBeenCalledWith('xlsx');

    await abrir();
    await userEvent.click(screen.getByRole('menuitem', { name: 'ds.exportar.pdf' }));
    expect(onExportar).toHaveBeenLastCalledWith('pdf');
  });

  it('erro ao exportar aparece no aviso', async () => {
    const onExportar = vi.fn().mockRejectedValue(new Error('sem memória'));
    render(<MenuExportar descricao="Exporta" onExportar={onExportar} />);
    await abrir();
    await userEvent.click(screen.getByRole('menuitem', { name: 'ds.exportar.excel' }));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith({
        title: 'ds.exportar.erro',
        description: 'sem memória',
        variant: 'destructive',
      })
    );
  });
});
