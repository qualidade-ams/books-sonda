import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { criarEnviadorWebhook } from '../webhookEmailService';
import { criarRenderizadorImagem } from '../renderImagemService';
import { criarSupabaseFake } from '../../__tests__/helpers/supabaseFake';

const URL_WEBHOOK = 'https://webhook.exemplo.test/fluxo?sig=segredo';

const payload = {
  nome: 'EMPRESA - Saldo Parcial 14.10',
  email: ['a@cliente.com'],
  email_cc: [],
  email_bcc: [],
  mensagem: '<p>x</p>',
  anexos: { totalArquivos: 0, tamanhoTotal: 0, arquivos: [] }
};

const resposta = (status: number, corpo = '') => ({ ok: status >= 200 && status < 300, status, text: async () => corpo });

describe('webhookEmailService', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  const supabaseComUrl = (url: string | null) =>
    criarSupabaseFake(tabela => (tabela === 'webhook_config' ? { data: url ? { webhook_url: url } : null, error: null } : null));

  it('lê a URL do webhook ativo e envia o payload', async () => {
    const fake = supabaseComUrl(URL_WEBHOOK);
    const fetch = vi.fn().mockResolvedValue(resposta(202));

    await criarEnviadorWebhook({ supabase: fake.cliente, fetch, esperar: async () => {} }).enviarEmail(payload);

    expect(fetch).toHaveBeenCalledWith(URL_WEBHOOK, expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) }));
    const consulta = fake.consultas.find(c => c.tabela === 'webhook_config')!;
    expect(consulta.chamadas).toContainEqual(['eq', ['ativo', true]]);
  });

  it('falha quando não há webhook ativo', async () => {
    const enviador = criarEnviadorWebhook({ supabase: supabaseComUrl(null).cliente, fetch: vi.fn(), esperar: async () => {} });

    await expect(enviador.enviarEmail(payload)).rejects.toThrow(/webhook de e-mail ativo/);
  });

  it('tenta de novo com espera crescente quando recebe 429', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(resposta(429))
      .mockResolvedValueOnce(resposta(429))
      .mockResolvedValueOnce(resposta(202));
    const esperar = vi.fn(async () => {});

    await criarEnviadorWebhook({ supabase: supabaseComUrl(URL_WEBHOOK).cliente, fetch, esperar }).enviarEmail(payload);

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(esperar.mock.calls.map(c => c[0])).toEqual([60_000, 120_000]);
  });

  it('desiste após o limite de tentativas de 429', async () => {
    const fetch = vi.fn().mockResolvedValue(resposta(429));

    await expect(
      criarEnviadorWebhook({ supabase: supabaseComUrl(URL_WEBHOOK).cliente, fetch, esperar: async () => {} }).enviarEmail(payload)
    ).rejects.toThrow(/429/);
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('erro HTTP não expõe a URL assinada', async () => {
    const fetch = vi.fn().mockResolvedValue(resposta(500, 'falha interna'));

    const erro = await criarEnviadorWebhook({ supabase: supabaseComUrl(URL_WEBHOOK).cliente, fetch, esperar: async () => {} })
      .enviarEmail(payload)
      .catch(e => e as Error);

    expect(erro).toBeInstanceOf(Error);
    expect(erro.message).toContain('500');
    expect(erro.message).not.toContain('segredo');
  });
});

describe('renderImagemService', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  const semEspera = async () => {};

  it('envia o HTML ao render-image e devolve o PNG em base64', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true, image: 'iVBOR' }) });

    const imagem = await criarRenderizadorImagem({ url: 'https://app.test/api/email/render-image', fetch, esperar: semEspera })
      .renderizar('<html/>');

    expect(imagem).toBe('iVBOR');
    expect(fetch).toHaveBeenCalledWith(
      'https://app.test/api/email/render-image',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ html: '<html/>', width: 1200 }) })
    );
  });

  it('sem RENDER_IMAGE_URL falha na hora com o motivo, sem chamar nada', async () => {
    const fetch = vi.fn();

    await expect(criarRenderizadorImagem({ url: '', fetch, esperar: semEspera }).renderizar('<html/>')).rejects.toThrow(
      /RENDER_IMAGE_URL não configurada/
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('tenta de novo em falha passageira', async () => {
    const fetch = vi.fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce({ ok: false, status: 504, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ success: true, image: 'iVBOR' }) });

    const imagem = await criarRenderizadorImagem({ url: 'https://app.test/x', fetch, esperar: semEspera }).renderizar('<html/>');

    expect(imagem).toBe('iVBOR');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('após 3 tentativas falha com o último motivo (ex.: HTTP 401 de URL protegida)', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });

    await expect(criarRenderizadorImagem({ url: 'https://app.test/x', fetch, esperar: semEspera }).renderizar('<html/>'))
      .rejects.toThrow(/HTTP 401/);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('resposta sem imagem também conta como falha', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: false }) });

    await expect(criarRenderizadorImagem({ url: 'https://app.test/x', fetch, esperar: semEspera }).renderizar('<html/>'))
      .rejects.toThrow(/sem imagem/);
  });
});
