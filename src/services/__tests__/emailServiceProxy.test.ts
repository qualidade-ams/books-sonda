import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { emailService } from '../emailService';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: vi.fn() },
    from: vi.fn(() => ({ insert: vi.fn().mockResolvedValue({ error: null }) }))
  }
}));

const respostaOk = { ok: true, status: 202, statusText: 'Accepted', text: () => Promise.resolve('') };

function chamadasFetch() {
  return (global.fetch as any).mock.calls as Array<[string, RequestInit]>;
}

describe('emailService - envio pelo proxy /api/email/send', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { access_token: 'token-da-sessao' } },
      error: null
    });
    global.fetch = vi.fn().mockResolvedValue(respostaOk) as any;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sendEmail envia ao proxy com o token da sessão e o mesmo payload de antes', async () => {
    const resultado = await emailService.sendEmail({
      to: ['a@cliente.com'],
      cc: 'cc@sonda.com',
      subject: 'Assunto',
      html: '<p>Corpo</p>'
    });

    expect(resultado.success).toBe(true);
    const [url, init] = chamadasFetch()[0];
    expect(url).toBe('/api/email/send');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-da-sessao');
    expect(JSON.parse(init.body as string)).toEqual({
      nome: 'Assunto',
      email: ['a@cliente.com'],
      email_cc: ['cc@sonda.com'],
      email_bcc: [],
      mensagem: '<p>Corpo</p>',
      anexos: { totalArquivos: 0, tamanhoTotal: 0, arquivos: [] }
    });
  });

  it('não consulta mais a URL do webhook no navegador', async () => {
    await emailService.sendEmail({ to: 'a@cliente.com', subject: 'Assunto', html: '<p>x</p>' });

    expect(supabase.from).not.toHaveBeenCalledWith('webhook_config');
    expect(chamadasFetch().every(([url]) => url === '/api/email/send')).toBe(true);
  });

  it('mantém o retry com backoff quando o proxy devolve 429', async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 429, statusText: 'Too Many Requests', text: () => Promise.resolve('') })
      .mockResolvedValueOnce(respostaOk) as any;

    const envio = emailService.sendEmail({ to: 'a@cliente.com', subject: 'Assunto', html: '<p>x</p>' });
    await vi.runAllTimersAsync();
    const resultado = await envio;

    expect(resultado.success).toBe(true);
    expect(chamadasFetch()).toHaveLength(2);
  });

  it('falha com mensagem clara quando não há sessão, sem chamar o proxy', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: null });

    const resultado = await emailService.sendEmail({ to: 'a@cliente.com', subject: 'Assunto', html: '<p>x</p>' });

    expect(resultado.success).toBe(false);
    expect(resultado.error).toMatch(/sessão/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('sendTestEmail também usa o proxy', async () => {
    const resultado = await emailService.sendTestEmail('teste@sonda.com', { assunto: 'Teste', corpo: '<p>t</p>' });

    expect(resultado.success).toBe(true);
    const [url, init] = chamadasFetch()[0];
    expect(url).toBe('/api/email/send');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-da-sessao');
  });
});

describe('Credencial do webhook fora do código do front', () => {
  it('nenhum arquivo de src/ contém URL assinada do Power Automate / Logic Apps', () => {
    const raiz = resolve(__dirname, '../..');
    const arquivos: string[] = [];
    const varrer = (dir: string) => {
      for (const nome of readdirSync(dir)) {
        const caminho = join(dir, nome);
        if (statSync(caminho).isDirectory()) varrer(caminho);
        else if (/\.(ts|tsx)$/.test(nome)) arquivos.push(caminho);
      }
    };
    varrer(raiz);

    const padrao = /(powerplatform\.com|logic\.azure\.com)[^'"`\s]*sig=/;
    const comCredencial = arquivos.filter(arquivo => padrao.test(readFileSync(arquivo, 'utf8')));
    expect(comCredencial).toEqual([]);
  });
});
