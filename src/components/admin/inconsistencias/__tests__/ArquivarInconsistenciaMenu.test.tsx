import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArquivarInconsistenciaMenu } from '../ArquivarInconsistenciaMenu';

function renderizar(props: Partial<React.ComponentProps<typeof ArquivarInconsistenciaMenu>> = {}) {
  const onArquivar = vi.fn();
  const onDescartar = vi.fn();
  render(<ArquivarInconsistenciaMenu onArquivar={onArquivar} onDescartar={onDescartar} {...props} />);
  return { onArquivar, onDescartar, user: userEvent.setup() };
}

describe('ArquivarInconsistenciaMenu', () => {
  it('abre o menu com as opções arquivar e descartar', async () => {
    const { user } = renderizar();

    await user.click(screen.getByRole('button', { name: 'Arquivar' }));

    expect(await screen.findByRole('menuitem', { name: /Arquivar inconsistência/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Descartar/ })).toBeInTheDocument();
  });

  it('arquivar chama a ação direto, sem confirmação', async () => {
    const { user, onArquivar, onDescartar } = renderizar();

    await user.click(screen.getByRole('button', { name: 'Arquivar' }));
    await user.click(await screen.findByRole('menuitem', { name: /Arquivar inconsistência/ }));

    expect(onArquivar).toHaveBeenCalledTimes(1);
    expect(onDescartar).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('descartar pede confirmação e só descarta ao confirmar', async () => {
    const { user, onDescartar } = renderizar();

    await user.click(screen.getByRole('button', { name: 'Arquivar' }));
    await user.click(await screen.findByRole('menuitem', { name: /Descartar/ }));

    const dialogo = await screen.findByRole('alertdialog');
    expect(dialogo).toHaveTextContent('não vai para o Histórico');
    expect(onDescartar).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Descartar' }));

    expect(onDescartar).toHaveBeenCalledTimes(1);
  });

  it('cancelar a confirmação não descarta', async () => {
    const { user, onDescartar } = renderizar();

    await user.click(screen.getByRole('button', { name: 'Arquivar' }));
    await user.click(await screen.findByRole('menuitem', { name: /Descartar/ }));
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));

    expect(onDescartar).not.toHaveBeenCalled();
  });

  it('com quantidade, mostra o botão com rótulo e a confirmação no plural', async () => {
    const { user } = renderizar({ quantidade: 3 });

    await user.click(screen.getByRole('button', { name: 'Arquivar (3)' }));
    await user.click(await screen.findByRole('menuitem', { name: /Descartar/ }));

    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Descartar 3 inconsistências?');
  });

  it('desabilitado não abre o menu', async () => {
    const { user } = renderizar({ disabled: true });

    await user.click(screen.getByRole('button', { name: 'Arquivar' }));

    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
  });
});
