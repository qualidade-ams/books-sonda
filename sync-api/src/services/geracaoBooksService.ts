/**
 * Liga o pacote da geração automática de books (vendor/geracaoBooks.cjs, gerado a
 * partir do front) às dependências do servidor: client service role, PDF pelo
 * mesmo /api/pdf/generate da Vercel e webhook de e-mail.
 */

import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PayloadEmail } from './webhookEmailService';
import type { ContextoGeracaoBooks, ResumoGeracaoBooks } from '../scheduler/orquestradorSync';

interface DependenciasPacote {
  gerarPdf(bookId: string): Promise<Blob>;
  enviarEmail(payload: PayloadEmail): Promise<void>;
  responsavelId: string | null;
  empresaIds: string[];
  log: ContextoGeracaoBooks['log'];
}

export interface PacoteGeracaoBooks {
  definirClienteSupabase(cliente: SupabaseClient | null): void;
  executarGeracaoAutomaticaBooks(deps: DependenciasPacote): Promise<ResumoGeracaoBooks>;
}

/** vendor/ fica na raiz do sync-api: ../../vendor a partir de src/services e de dist/services */
export function carregarPacoteGeracaoBooks(): PacoteGeracaoBooks {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(path.resolve(__dirname, '..', '..', 'vendor', 'geracaoBooks.cjs'));
}

const TIMEOUT_PDF_MS = 90_000;

/**
 * PDF do book pela rota de impressão /pdf/book/:id, renderizada pelo Puppeteer
 * do front (/api/pdf/generate). `appUrl` é a URL de PRODUÇÃO do front (APP_URL):
 * preview da Vercel com proteção responde 401.
 */
export function criarGeradorPdfBook(deps: { appUrl: string; fetch: typeof fetch; timeoutMs?: number }) {
  const base = (deps.appUrl || '').replace(/\/+$/, '');

  return async (bookId: string): Promise<Blob> => {
    if (!base) throw new Error('APP_URL não configurada no .env do sync-api (URL de produção do front)');

    const controle = new AbortController();
    const timer = setTimeout(() => controle.abort(), deps.timeoutMs ?? TIMEOUT_PDF_MS);
    try {
      const resposta = await deps.fetch(`${base}/api/pdf/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `${base}/pdf/book/${encodeURIComponent(bookId)}?lang=pt-BR`,
          filename: `book_${bookId}.pdf`,
          // Mesmas opções do booksPDFServiceV2 (geração pela tela)
          options: {
            format: 'A4',
            orientation: 'landscape',
            printBackground: true,
            margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
          },
        }),
        signal: controle.signal,
      });

      if (!resposta.ok) {
        const corpo = await resposta.text().catch(() => '');
        throw new Error(`Geração do PDF respondeu HTTP ${resposta.status}${corpo ? `: ${corpo.slice(0, 300)}` : ''}`);
      }
      return await resposta.blob();
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') throw new Error('Geração do PDF excedeu o tempo limite');
      throw e;
    } finally {
      clearTimeout(timer);
    }
  };
}

export function criarExecutorGeracaoBooks({
  supabase,
  geradorPdf,
  enviador,
  pacote = carregarPacoteGeracaoBooks(),
}: {
  supabase: SupabaseClient;
  geradorPdf: (bookId: string) => Promise<Blob>;
  enviador: { enviarEmail(payload: PayloadEmail): Promise<void> };
  pacote?: PacoteGeracaoBooks;
}) {
  pacote.definirClienteSupabase(supabase);

  return (contexto: ContextoGeracaoBooks) =>
    pacote.executarGeracaoAutomaticaBooks({
      gerarPdf: (bookId) => geradorPdf(bookId),
      enviarEmail: (payload) => enviador.enviarEmail(payload),
      responsavelId: contexto.responsavelId,
      empresaIds: contexto.empresaIds,
      log: contexto.log,
    });
}
