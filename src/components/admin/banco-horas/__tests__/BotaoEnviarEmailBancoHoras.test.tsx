import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { BotaoEnviarEmailBancoHoras } from '../BotaoEnviarEmailBancoHoras';
import { useEmailsClientesPorFinalidade } from '@/hooks/useClientes';
import { calculosFixture } from './fixturesSaldoParcial';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (chave: string) => chave, i18n: { language: 'pt-BR' } })
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() })
}));

vi.mock('@/services/emailService', () => ({
  emailService: { sendEmail: vi.fn().mockResolvedValue({ success: true }) }
}));

vi.mock('@/utils/gerarExcelConsumoHoras', () => ({
  gerarExcelConsumoHoras: vi.fn().mockResolvedValue(null)
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), storage: { from: vi.fn() } }
}));

vi.mock('@/hooks/useClientes', () => ({
  useEmailsClientesPorFinalidade: vi.fn()
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderizar() {
  return render(
    <BotaoEnviarEmailBancoHoras
      calculos={calculosFixture}
      empresaId="empresa-1"
      empresaNome="EMPRESA TESTE"
      tipoCobranca="horas"
      mesAno={{ mes: 10, ano: 2026 }}
    />,
    { wrapper }
  );
}

describe('BotaoEnviarEmailBancoHoras', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockRejectedValue(new Error('sem render-image no teste')) as any;
    (useEmailsClientesPorFinalidade as any).mockReturnValue({
      emails: ['contato1@cliente.com', 'contato2@cliente.com'],
      isLoading: false
    });
  });

  it('oferece apenas o envio de Saldo Parcial, sem a opção Saldo do Mês', async () => {
    const user = userEvent.setup();
    renderizar();

    expect(screen.queryByRole('button', { name: /bankHours\.sendEmail/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /bankHours\.sendPartialBalance/ }));

    expect(await screen.findByDisplayValue(/Saldo Parcial/)).toBeInTheDocument();
    expect(screen.queryByText('bankHours.monthBalance')).not.toBeInTheDocument();
    expect(screen.queryByText('bankHours.closing')).not.toBeInTheDocument();
  });

  it('busca os contatos de Saldo Parcial/Ambos da empresa', () => {
    renderizar();

    expect(useEmailsClientesPorFinalidade).toHaveBeenCalledWith('empresa-1', ['saldo_parcial', 'ambos']);
  });

  it('abre o modal com os destinatários pré-preenchidos e o CC vazio', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: /bankHours\.sendPartialBalance/ }));

    const destinatarios = (await screen.findByPlaceholderText('bankHours.recipientsPlaceholder')) as HTMLTextAreaElement;
    const cc = screen.getByPlaceholderText('bankHours.ccPlaceholder') as HTMLTextAreaElement;
    expect(destinatarios.value).toBe('contato1@cliente.com; contato2@cliente.com');
    expect(cc.value).toBe('');
  });

  it('abre o modal com destinatários vazios quando a empresa não tem contatos de Saldo Parcial', async () => {
    (useEmailsClientesPorFinalidade as any).mockReturnValue({ emails: [], isLoading: false });
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: /bankHours\.sendPartialBalance/ }));

    const destinatarios = (await screen.findByPlaceholderText('bankHours.recipientsPlaceholder')) as HTMLTextAreaElement;
    expect(destinatarios.value).toBe('');
  });
});
