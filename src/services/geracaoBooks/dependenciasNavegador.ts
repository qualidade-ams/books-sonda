/**
 * Dependências do ciclo gerarEEnviarBook quando roda no navegador (tela Geração
 * de Books): PDF pelo Puppeteer da Vercel e e-mail pelo emailService (proxy com
 * retry em 429). O envio é registrado em nome do usuário logado.
 *
 * Fica fora de gerarEnviarBook.ts para não entrar no pacote do sync-api.
 */

import { booksPDFServiceV2 } from '@/services/booksPDFServiceV2';
import { emailService } from '@/services/emailService';
import type { DependenciasGerarEnviarBook } from './gerarEnviarBook';

export const dependenciasGerarEnviarBookNavegador: DependenciasGerarEnviarBook = {
  gerarPdf: (bookId) => booksPDFServiceV2.gerarPDF(bookId),

  async enviarEmail(payload) {
    const resultado = await emailService.sendEmail({
      to: payload.email,
      cc: payload.email_cc,
      bcc: payload.email_bcc,
      subject: payload.nome,
      html: payload.mensagem,
      anexos: payload.anexos
    });
    if (!resultado.success) {
      throw new Error(resultado.error || resultado.message || 'Erro no envio do e-mail');
    }
  }
};
