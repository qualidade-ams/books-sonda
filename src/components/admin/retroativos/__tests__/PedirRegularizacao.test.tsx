import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PedirRegularizacao } from '../PedirRegularizacao';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

const sel = (id: string, consultor: string | null, chamado = `CH-${id}`) => ({
  id,
  retroativoId: 'r1',
  itemId: `ap-${id}`,
  empresa: 'ALFA',
  chamado,
  tarefa: `T-${id}`,
  consultor,
  minutos: 60,
  mes: { ano: 2026, mes: 9 },
});
const ITENS = [sel('1', 'Ana Souza'), sel('2', 'Ana Souza'), sel('3', 'Bruno Lima')];
const EMAILS = { 'Ana Souza': 'ana@sonda.com', 'Bruno Lima': null };

const props = {
  itens: ITENS,
  emails: EMAILS,
  carregandoEmails: false,
  onFechar: vi.fn(),
  onEnviar: vi.fn(async () => undefined),
};
const renderizar = (ui: React.ReactElement) => render(<TooltipProvider>{ui}</TooltipProvider>);
const r = 'apontamentosRetroativos.regularizacao';

describe('PedirRegularizacao', () => {
  it('um envelope por consultor, com o e-mail e a mensagem; quem não tem e-mail é avisado', () => {
    renderizar(<PedirRegularizacao {...props} />);
    expect(screen.getByText('ana@sonda.com')).toBeInTheDocument();
    expect(screen.getByText(`${r}.semEmail`)).toBeInTheDocument();
    expect(screen.getByText(`${r}.semEmailTitulo.um {"n":1}`)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${r}.semEmailTexto .*Bruno Lima`))).toBeInTheDocument();
    expect(screen.getByText(/Prezado\(a\) Ana,/)).toBeInTheDocument();
    expect(screen.getAllByText(/CH-1/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ajuste de Apontamento - Banco de Horas').length).toBeGreaterThan(0);
  });

  it('confirma com os e-mails que vão sair e envia os envelopes com a cópia', async () => {
    const onEnviar = vi.fn(async () => undefined);
    const onFechar = vi.fn();
    renderizar(<PedirRegularizacao {...props} onEnviar={onEnviar} onFechar={onFechar} />);
    fireEvent.change(screen.getByLabelText(new RegExp(`${r}.copia`)), {
      target: { value: 'qualidade@sonda.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: `${r}.emails.um {"n":1}` }));
    const dialogo = within(screen.getByRole('alertdialog'));
    expect(dialogo.getByText(`${r}.confirmarTitulo.um {"n":1}`)).toBeInTheDocument();
    fireEvent.click(dialogo.getByRole('button', { name: `${r}.enviar` }));
    await waitFor(() =>
      expect(onEnviar).toHaveBeenCalledWith({
        envelopes: [
          expect.objectContaining({ consultor: 'Ana Souza', email: 'ana@sonda.com' }),
          expect.objectContaining({ consultor: 'Bruno Lima', email: null }),
        ],
        copia: ['qualidade@sonda.com'],
      })
    );
    await waitFor(() => expect(onFechar).toHaveBeenCalled());
  });

  it('sem nenhum e-mail, ou com cópia inválida, não envia', () => {
    const { unmount } = renderizar(
      <PedirRegularizacao {...props} emails={{ 'Ana Souza': null, 'Bruno Lima': null }} />
    );
    expect(screen.getByRole('button', { name: `${r}.emails.varios {"n":0}` })).toBeDisabled();
    unmount();

    renderizar(<PedirRegularizacao {...props} />);
    fireEvent.change(screen.getByLabelText(new RegExp(`${r}.copia`)), {
      target: { value: 'sem-arroba' },
    });
    expect(screen.getByText(`${r}.emailInvalido`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `${r}.emails.um {"n":1}` })).toBeDisabled();
  });

  it('enquanto busca os e-mails, não envia', () => {
    renderizar(<PedirRegularizacao {...props} emails={{}} carregandoEmails />);
    expect(screen.getByRole('status', { name: `${r}.carregandoEmails` })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `${r}.emails.varios {"n":0}` })).toBeDisabled();
  });
});
