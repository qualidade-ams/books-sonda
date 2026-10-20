import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PendentesMesesAnterioresIndicador } from '../PendentesMesesAnterioresIndicador';

const MENSAGEM = 'Existem requerimentos pendentes de envio nos meses anteriores';

describe('PendentesMesesAnterioresIndicador', () => {
  it('não renderiza nada quando não há meses pendentes', () => {
    const { container } = render(<PendentesMesesAnterioresIndicador mensagem={MENSAGEM} meses={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('não renderiza nada quando meses é undefined', () => {
    const { container } = render(<PendentesMesesAnterioresIndicador mensagem={MENSAGEM} meses={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza a bolinha com o total de requerimentos pendentes', () => {
    render(
      <PendentesMesesAnterioresIndicador
        mensagem={MENSAGEM}
        meses={[
          { rotulo: 'Agosto/2026: 1 requerimento', quantidade: 1 },
          { rotulo: 'Setembro/2026: 3 requerimentos', quantidade: 3 }
        ]}
      />
    );
    const bolinha = screen.getByRole('button', { name: new RegExp(MENSAGEM) });
    expect(bolinha).toHaveTextContent('4');
  });

  it('exibe a mensagem e a quantidade por mês ao passar o mouse', async () => {
    const user = userEvent.setup();
    render(
      <PendentesMesesAnterioresIndicador
        mensagem={MENSAGEM}
        meses={[
          { rotulo: 'Agosto/2026: 1 requerimento', quantidade: 1 },
          { rotulo: 'Setembro/2026: 3 requerimentos', quantidade: 3 }
        ]}
      />
    );

    await user.hover(screen.getByRole('button', { name: new RegExp(MENSAGEM) }));

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent(MENSAGEM);
    expect(tooltip).toHaveTextContent('Agosto/2026: 1 requerimento');
    expect(tooltip).toHaveTextContent('Setembro/2026: 3 requerimentos');
  });

  it('limita o número exibido na bolinha a 99+', () => {
    render(
      <PendentesMesesAnterioresIndicador
        mensagem={MENSAGEM}
        meses={[{ rotulo: 'Setembro/2026: 120 requerimentos', quantidade: 120 }]}
      />
    );
    expect(screen.getByRole('button', { name: new RegExp(MENSAGEM) })).toHaveTextContent('99+');
  });
});
