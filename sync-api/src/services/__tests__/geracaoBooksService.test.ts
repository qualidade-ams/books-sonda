import { describe, it, expect, vi } from 'vitest';
import { criarGeradorPdfBook, criarExecutorGeracaoBooks } from '../geracaoBooksService';

const respostaPdf = (ok = true, status = 200, corpo: any = 'pdf') => ({
  ok,
  status,
  blob: async () => new Blob([corpo], { type: 'application/pdf' }),
  text: async () => String(corpo),
});

describe('criarGeradorPdfBook', () => {
  it('pede ao /api/pdf/generate do front o PDF da rota de impressão do book', async () => {
    const fetch = vi.fn(async () => respostaPdf()) as any;
    const gerar = criarGeradorPdfBook({ appUrl: 'https://app.vercel.app/', fetch });

    const pdf = await gerar('book-1');

    expect(pdf.size).toBe(3);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://app.vercel.app/api/pdf/generate');
    expect(init.method).toBe('POST');
    const corpo = JSON.parse(init.body);
    expect(corpo.url).toBe('https://app.vercel.app/pdf/book/book-1?lang=pt-BR');
    expect(corpo.options).toMatchObject({ format: 'A4', orientation: 'landscape', printBackground: true });
  });

  it('erro HTTP vira exceção com o status e o motivo', async () => {
    const fetch = vi.fn(async () => respostaPdf(false, 500, 'Chromium caiu')) as any;
    const gerar = criarGeradorPdfBook({ appUrl: 'https://app.vercel.app', fetch });

    await expect(gerar('book-1')).rejects.toThrow(/HTTP 500.*Chromium caiu/);
  });

  it('sem APP_URL configurada, explica o que falta', async () => {
    const gerar = criarGeradorPdfBook({ appUrl: '', fetch: vi.fn() as any });
    await expect(gerar('book-1')).rejects.toThrow(/APP_URL/);
  });
});

describe('criarExecutorGeracaoBooks', () => {
  it('injeta o client do Supabase no pacote e encaminha PDF, e-mail, responsável e log', async () => {
    const supabase = { from: vi.fn() } as any;
    const pacote = {
      definirClienteSupabase: vi.fn(),
      executarGeracaoAutomaticaBooks: vi.fn(async (deps: any) => {
        await deps.gerarPdf('book-1');
        await deps.enviarEmail({ nome: 'x' });
        deps.log('andamento');
        return { mes: 9, ano: 2026, total: 1, gerados: 1, erros: 0, pulados: 0, empresas: [] };
      }),
    };
    const geradorPdf = vi.fn(async () => new Blob(['pdf']));
    const enviador = { enviarEmail: vi.fn(async () => undefined) };
    const log = vi.fn();

    const executar = criarExecutorGeracaoBooks({ supabase, geradorPdf, enviador, pacote });
    const resumo = await executar({ responsavelId: 'criador', log });

    expect(pacote.definirClienteSupabase).toHaveBeenCalledWith(supabase);
    expect(pacote.executarGeracaoAutomaticaBooks).toHaveBeenCalledWith(
      expect.objectContaining({ responsavelId: 'criador', log })
    );
    expect(geradorPdf).toHaveBeenCalledWith('book-1');
    expect(enviador.enviarEmail).toHaveBeenCalledWith({ nome: 'x' });
    expect(log).toHaveBeenCalledWith('andamento');
    expect(resumo.gerados).toBe(1);
  });

  it('carrega o pacote vendor por padrão', () => {
    const executar = criarExecutorGeracaoBooks({
      supabase: {} as any,
      geradorPdf: async () => new Blob([]),
      enviador: { enviarEmail: async () => undefined },
    });
    expect(typeof executar).toBe('function');
  });
});
