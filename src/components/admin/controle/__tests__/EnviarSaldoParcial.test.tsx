import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { EnviarSaldoParcial } from '../EnviarSaldoParcial';
import type { SaldoParcialBanco } from '@/services/controleSaldoParcialService';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

const tEmail = (chave: string, valores?: Record<string, unknown>) =>
  valores ? `email:${chave} ${JSON.stringify(valores)}` : `email:${chave}`;

const BANCOS = [
  {
    bancoId: 'b1',
    nome: 'BANCO COMEX',
    tipoContrato: 'horas',
    consomeOutrosBancos: false,
    meses: [
      { mes: { ano: 2026, mes: 10 }, chave: '2026-10', situacao: 'aberto', resultado: undefined },
    ],
    requerimentos: [],
    reajustes: [],
    observacoes: [],
  },
] as SaldoParcialBanco[];

const props = {
  empresaNome: 'ALFA',
  bancos: BANCOS,
  idioma: 'en' as const,
  tEmail,
  carregando: false,
  erro: null,
  destinatariosPadrao: ['a@cliente.com', 'b@cliente.com'],
  onTentarNovamente: vi.fn(),
  onFechar: vi.fn(),
  onEnviar: vi.fn(async () => undefined),
};
const renderizar = (ui: React.ReactElement) => render(<TooltipProvider>{ui}</TooltipProvider>);
const enviar = () => screen.getByRole('button', { name: 'controleBancoHoras.enviarSaldo.enviar' });

describe('EnviarSaldoParcial', () => {
  it('abre com os contatos do Saldo Parcial, o assunto e o texto no idioma do e-mail e a prévia', () => {
    renderizar(<EnviarSaldoParcial {...props} />);
    expect(screen.getByText('a@cliente.com')).toBeInTheDocument();
    expect(screen.getByText('b@cliente.com')).toBeInTheDocument();
    const valor = (rotulo: RegExp) => (screen.getByLabelText(rotulo) as HTMLInputElement).value;
    expect(valor(/controleBancoHoras.enviarSaldo.assunto/)).toMatch(
      /^ALFA - Saldo Parcial \d\d\.\d\d$/
    );
    // Texto padrão do Saldo Parcial em inglês (o do template da empresa)
    expect(valor(/controleBancoHoras.enviarSaldo.texto/)).toContain(
      'Below is the partial forecast'
    );
    expect(
      screen.getByText(
        /controleBancoHoras.enviarSaldo.idioma .*controleBancoHoras.enviarSaldo.idiomas.en/
      )
    ).toBeInTheDocument();
    const previa = screen.getByTitle('controleBancoHoras.enviarSaldo.previa');
    expect(previa.getAttribute('srcdoc')).toContain('BANCO COMEX');
    expect(previa.getAttribute('sandbox')).toBe('');
  });

  it('remove e adiciona destinatários; e-mail inválido não entra', () => {
    renderizar(<EnviarSaldoParcial {...props} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'ds.formulario.remover {"item":"a@cliente.com"}' })
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'ds.formulario.remover {"item":"b@cliente.com"}' })
    );
    expect(screen.getByText('controleBancoHoras.enviarSaldo.semDestinatario')).toBeInTheDocument();
    expect(enviar()).toBeDisabled();

    const novo = screen.getByLabelText(/controleBancoHoras.enviarSaldo.novoDestinatario/);
    fireEvent.change(novo, { target: { value: 'sem-arroba' } });
    fireEvent.click(
      screen.getByRole('button', { name: 'controleBancoHoras.enviarSaldo.adicionar' })
    );
    expect(screen.getByText('controleBancoHoras.enviarSaldo.emailInvalido')).toBeInTheDocument();

    fireEvent.change(novo, { target: { value: ' c@cliente.com ' } });
    fireEvent.keyDown(novo, { key: 'Enter' });
    expect(screen.getByText('c@cliente.com')).toBeInTheDocument();
    expect(enviar()).toBeEnabled();
  });

  it('confirma com a quantidade de destinatários e envia', async () => {
    const onEnviar = vi.fn(async () => undefined);
    const onFechar = vi.fn();
    renderizar(<EnviarSaldoParcial {...props} onEnviar={onEnviar} onFechar={onFechar} />);
    fireEvent.change(screen.getByLabelText(/controleBancoHoras.enviarSaldo.copia/), {
      target: { value: 'gestor@sonda.com; ' },
    });
    fireEvent.click(enviar());
    const dialogo = within(screen.getByRole('alertdialog'));
    expect(
      dialogo.getByText('controleBancoHoras.enviarSaldo.confirmarDestinatarios.varios {"n":3}')
    ).toBeInTheDocument();
    fireEvent.click(dialogo.getByRole('button', { name: 'controleBancoHoras.enviarSaldo.enviar' }));
    await waitFor(() =>
      expect(onEnviar).toHaveBeenCalledWith({
        destinatarios: ['a@cliente.com', 'b@cliente.com'],
        copia: ['gestor@sonda.com'],
        assunto: expect.stringMatching(/^ALFA - Saldo Parcial/),
        texto: expect.stringContaining('Below is the partial forecast'),
      })
    );
    await waitFor(() => expect(onFechar).toHaveBeenCalled());
  });

  it('cópia com e-mail inválido não envia', () => {
    renderizar(<EnviarSaldoParcial {...props} />);
    fireEvent.change(screen.getByLabelText(/controleBancoHoras.enviarSaldo.copia/), {
      target: { value: 'gestor@sonda.com; errado' },
    });
    expect(screen.getByText('controleBancoHoras.enviarSaldo.emailInvalido')).toBeInTheDocument();
    expect(enviar()).toBeDisabled();
  });

  it('sem banco visível ao cliente, não há o que enviar', () => {
    renderizar(<EnviarSaldoParcial {...props} bancos={[]} />);
    expect(screen.getByText('controleBancoHoras.enviarSaldo.semBancos')).toBeInTheDocument();
    expect(enviar()).toBeDisabled();
  });
});
