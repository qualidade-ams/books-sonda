import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmailEnviadoIndicador } from '../EmailEnviadoIndicador';
import { formatarDataHoraEnvio } from '@/utils/formatarDataHoraEnvio';

describe('formatarDataHoraEnvio', () => {
  it('formata data e hora no fuso de Brasília', () => {
    expect(formatarDataHoraEnvio('2026-09-15T13:30:00Z')).toBe('15/09/2026 10:30');
  });

  it('retorna "-" para data inválida', () => {
    expect(formatarDataHoraEnvio('invalida')).toBe('-');
  });
});

describe('EmailEnviadoIndicador', () => {
  it('não renderiza nada quando não há envios', () => {
    const { container } = render(<EmailEnviadoIndicador envios={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('não renderiza nada quando envios é undefined', () => {
    const { container } = render(<EmailEnviadoIndicador envios={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza a bolinha verde quando há envio', () => {
    render(
      <EmailEnviadoIndicador
        envios={[{ email_para: 'a@x.com', email_cc: null, data_envio: '2026-09-15T13:30:00Z' }]}
      />
    );
    expect(screen.getByRole('button', { name: /email enviado/i })).toBeInTheDocument();
  });

  it('exibe todos os envios com destinatário, CC e data/hora ao passar o mouse', async () => {
    const user = userEvent.setup();
    render(
      <EmailEnviadoIndicador
        envios={[
          { email_para: 'a@x.com, b@x.com', email_cc: 'c@x.com', data_envio: '2026-09-15T13:30:00Z' },
          { email_para: 'a@x.com', email_cc: null, data_envio: '2026-09-10T20:05:00Z' },
        ]}
      />
    );

    await user.hover(screen.getByRole('button', { name: /email enviado/i }));

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('a@x.com, b@x.com');
    expect(tooltip).toHaveTextContent('c@x.com');
    expect(tooltip).toHaveTextContent('15/09/2026 10:30');
    expect(tooltip).toHaveTextContent('10/09/2026 17:05');
  });
});
