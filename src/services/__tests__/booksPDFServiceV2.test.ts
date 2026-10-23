/**
 * Geração do PDF do book pela rota /pdf/book/:id (Puppeteer, sem login).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  ordem: [] as string[],
  garantirSnapshot: vi.fn(),
  gerarPDFDeURL: vi.fn(),
}));

vi.mock('../requerimentosBookService', () => ({
  garantirSnapshotRequerimentosBook: mocks.garantirSnapshot,
}));

vi.mock('../puppeteerPDFService', () => ({
  puppeteerPDFService: { gerarPDFDeURL: mocks.gerarPDFDeURL },
}));

import { booksPDFServiceV2 } from '../booksPDFServiceV2';

describe('booksPDFServiceV2.gerarPDF', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.ordem = [];
    mocks.garantirSnapshot.mockReset().mockImplementation(async () => {
      mocks.ordem.push('snapshot');
    });
    mocks.gerarPDFDeURL.mockReset().mockImplementation(async () => {
      mocks.ordem.push('pdf');
      return new Blob(['pdf']);
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('grava o snapshot das abas de requerimentos antes de abrir a rota do PDF', async () => {
    await booksPDFServiceV2.gerarPDF('book-1');

    expect(mocks.garantirSnapshot).toHaveBeenCalledWith('book-1');
    expect(mocks.ordem).toEqual(['snapshot', 'pdf']);
  });

  it('gera o PDF mesmo se gravar o snapshot falhar', async () => {
    mocks.garantirSnapshot.mockRejectedValue(new Error('falhou'));

    const blob = await booksPDFServiceV2.gerarPDF('book-1');

    expect(blob).toBeInstanceOf(Blob);
    expect(mocks.gerarPDFDeURL).toHaveBeenCalledTimes(1);
  });
});
