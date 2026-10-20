/**
 * Teste de caracterização do e-mail de Saldo Parcial.
 *
 * Congela o assunto e o HTML que o envio manual gera hoje, com data e dados fixos.
 * Qualquer refatoração (remoção do Saldo do Mês, extração para módulo compartilhado)
 * precisa manter esta saída idêntica.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { BotaoEnviarEmailBancoHoras } from '../BotaoEnviarEmailBancoHoras';
import { emailService } from '@/services/emailService';
import { supabase } from '@/integrations/supabase/client';
import { calculosFixture, requerimentosFixture, observacoesFixture } from './fixturesSaldoParcial';

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
  useEmailsClientesPorFinalidade: () => ({ emails: [], isLoading: false })
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** Abre o modal do Saldo Parcial (botão direto ou, na versão antiga, via dropdown) */
async function abrirSaldoParcial(user: ReturnType<typeof userEvent.setup>) {
  const botaoDireto = screen.queryByRole('button', { name: /bankHours\.sendPartialBalance/ });
  if (botaoDireto) {
    await user.click(botaoDireto);
    return;
  }
  await user.click(screen.getByRole('button', { name: /bankHours\.sendEmail/ }));
  await user.click(await screen.findByText('bankHours.partialBalance'));
}

async function enviarECapturar(isEnglish: boolean) {
  const user = userEvent.setup();
  render(
    <BotaoEnviarEmailBancoHoras
      calculos={calculosFixture}
      empresaId="empresa-1"
      empresaNome="EMPRESA TESTE"
      tipoCobranca="horas"
      mesAno={{ mes: 10, ano: 2026 }}
      percentualRepasse={50}
      nomePeriodo="4º Trimestre"
      requerimentos={requerimentosFixture}
      requerimentosEmDesenvolvimento={[]}
      observacoes={observacoesFixture}
      diaInicioApuracao={1}
      diaFimApuracao={0}
      isEnglish={isEnglish}
    />,
    { wrapper }
  );

  await abrirSaldoParcial(user);

  const assunto = (await screen.findByDisplayValue(/Saldo Parcial/)) as HTMLInputElement;
  const destinatarios = screen.getByPlaceholderText('bankHours.recipientsPlaceholder');
  await user.clear(destinatarios);
  await user.type(destinatarios, 'contato@cliente.com');

  const botaoEnviar = screen.getByRole('button', { name: /common\.send/ });
  await waitFor(() => expect(botaoEnviar).not.toBeDisabled());
  await user.click(botaoEnviar);
  await user.click(await screen.findByRole('button', { name: /bankHours\.confirmSend/ }));

  await waitFor(() => expect(emailService.sendEmail).toHaveBeenCalled());
  const enviado = (emailService.sendEmail as any).mock.calls[0][0];
  return { assunto: assunto.value, enviado };
}

describe('BotaoEnviarEmailBancoHoras - caracterização do Saldo Parcial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 2, 10, 0, 0));
    // Sem renderização de imagem: o envio usa o HTML (fallback já existente)
    global.fetch = vi.fn().mockRejectedValue(new Error('sem render-image no teste')) as any;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('gera o mesmo assunto e HTML em português', async () => {
    const { assunto, enviado } = await enviarECapturar(false);

    expect(assunto).toBe('EMPRESA TESTE - Saldo Parcial 01.10');
    expect(enviado.subject).toBe('EMPRESA TESTE - Saldo Parcial 01.10');
    expect(enviado.to).toEqual(['contato@cliente.com']);
    expect(enviado.cc).toBeUndefined();
    expect(enviado.html).toMatchSnapshot();
  });

  it('gera o mesmo HTML em inglês', async () => {
    const { enviado } = await enviarECapturar(true);

    expect(enviado.html).toMatchSnapshot();
  });

  describe('com as tabelas renderizadas como imagem', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, image: 'iVBORw0KGgo=' })
      }) as any;
      (supabase.storage.from as any).mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://exemplo.test/tabelas.png' } })
      });
    });

    it('envia o mesmo HTML para renderizar e o mesmo e-mail com a imagem (português)', async () => {
      const { enviado } = await enviarECapturar(false);

      const corpoRender = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(corpoRender.width).toBe(1200);
      expect(corpoRender.html).toMatchSnapshot();
      expect(enviado.html).toContain('https://exemplo.test/tabelas.png');
      expect(enviado.html).toMatchSnapshot();
    });

    it('gera o mesmo e-mail com a imagem (inglês)', async () => {
      const { enviado } = await enviarECapturar(true);

      expect(enviado.html).toMatchSnapshot();
    });
  });
});
