import { describe, it, expect, vi, beforeEach } from 'vitest';
import { encaminharEmail, type DependenciasEncaminhamento } from '../_lib/encaminharEmail';

const URL_WEBHOOK = 'https://webhook.exemplo.test/fluxo';

const payloadValido = {
  nome: 'Assunto do e-mail',
  email: ['destino@cliente.com'],
  email_cc: [],
  email_bcc: [],
  mensagem: '<p>Olá</p>',
  anexos: { totalArquivos: 0, tamanhoTotal: 0, arquivos: [] }
};

function criarDeps(sobrescritas: Partial<DependenciasEncaminhamento> = {}): DependenciasEncaminhamento {
  return {
    validarToken: vi.fn().mockResolvedValue(true),
    buscarWebhookUrl: vi.fn().mockResolvedValue(URL_WEBHOOK),
    fetch: vi.fn().mockResolvedValue({ ok: true, status: 202, text: () => Promise.resolve('') }) as any,
    ...sobrescritas
  };
}

describe('encaminharEmail (proxy do webhook de e-mail)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recusa requisição sem token (401) e não chama o webhook', async () => {
    const deps = criarDeps();

    const resposta = await encaminharEmail(undefined, payloadValido, deps);

    expect(resposta.status).toBe(401);
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  it('recusa token inválido (401)', async () => {
    const deps = criarDeps({ validarToken: vi.fn().mockResolvedValue(false) });

    const resposta = await encaminharEmail('Bearer token-invalido', payloadValido, deps);

    expect(resposta.status).toBe(401);
    expect(deps.validarToken).toHaveBeenCalledWith('token-invalido');
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  it('recusa payload sem destinatário, assunto ou mensagem (400)', async () => {
    const deps = criarDeps();

    for (const invalido of [
      null,
      { ...payloadValido, email: [] },
      { ...payloadValido, email: 'nao-e-lista' },
      { ...payloadValido, nome: '' },
      { ...payloadValido, mensagem: undefined }
    ]) {
      const resposta = await encaminharEmail('Bearer ok', invalido, deps);
      expect(resposta.status).toBe(400);
    }
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  it('responde 503 quando não há webhook ativo configurado', async () => {
    const deps = criarDeps({ buscarWebhookUrl: vi.fn().mockResolvedValue(null) });

    const resposta = await encaminharEmail('Bearer ok', payloadValido, deps);

    expect(resposta.status).toBe(503);
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  it('encaminha o payload sem alterações para o webhook configurado', async () => {
    const deps = criarDeps();

    const resposta = await encaminharEmail('Bearer ok', payloadValido, deps);

    expect(resposta.status).toBe(202);
    expect(deps.fetch).toHaveBeenCalledWith(
      URL_WEBHOOK,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadValido)
      })
    );
  });

  it('repassa status e corpo de erro do webhook (ex.: 429), preservando o retry do front', async () => {
    const deps = criarDeps({
      fetch: vi.fn().mockResolvedValue({ ok: false, status: 429, text: () => Promise.resolve('Too Many Requests') }) as any
    });

    const resposta = await encaminharEmail('Bearer ok', payloadValido, deps);

    expect(resposta.status).toBe(429);
    expect(resposta.corpo).toBe('Too Many Requests');
  });

  it('nunca devolve a URL do webhook na resposta', async () => {
    const deps = criarDeps({
      fetch: vi.fn().mockRejectedValue(new Error(`falha ao conectar em ${URL_WEBHOOK}`)) as any
    });

    const resposta = await encaminharEmail('Bearer ok', payloadValido, deps);

    expect(resposta.status).toBe(502);
    expect(resposta.corpo).not.toContain(URL_WEBHOOK);
  });

  it('responde 504 quando o webhook excede o tempo limite', async () => {
    const deps = criarDeps({
      timeoutMs: 10,
      fetch: vi.fn().mockImplementation((_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => {
            const erro = new Error('aborted');
            erro.name = 'AbortError';
            reject(erro);
          });
        })
      ) as any
    });

    const resposta = await encaminharEmail('Bearer ok', payloadValido, deps);

    expect(resposta.status).toBe(504);
  });
});
