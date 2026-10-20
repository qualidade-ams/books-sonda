import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dependenciasGerarEnviarBookNavegador } from '../dependenciasNavegador';
import { emailService } from '@/services/emailService';
import { booksPDFServiceV2 } from '@/services/booksPDFServiceV2';

vi.mock('@/services/emailService', () => ({
  emailService: { sendEmail: vi.fn() }
}));
vi.mock('@/services/booksPDFServiceV2', () => ({
  booksPDFServiceV2: { gerarPDF: vi.fn() }
}));

const payload = {
  nome: 'BOOK: ABC_2026_09. Setembro',
  email: ['qualidadeams@sonda.com'],
  email_cc: [],
  email_bcc: [],
  mensagem: '<p>Segue</p>',
  anexos: { totalArquivos: 1, tamanhoTotal: 3, arquivos: [{ url: 'u', nome: 'b.pdf', tipo: 'application/pdf', tamanho: 3, token: '' }] }
};

describe('dependenciasGerarEnviarBookNavegador', () => {
  beforeEach(() => vi.clearAllMocks());

  it('gera o PDF pelo serviço V2 (Puppeteer na Vercel)', async () => {
    const blob = new Blob(['pdf']);
    (booksPDFServiceV2.gerarPDF as any).mockResolvedValue(blob);

    await expect(dependenciasGerarEnviarBookNavegador.gerarPdf('book-1')).resolves.toBe(blob);
    expect(booksPDFServiceV2.gerarPDF).toHaveBeenCalledWith('book-1');
  });

  it('envia o payload pelo emailService', async () => {
    (emailService.sendEmail as any).mockResolvedValue({ success: true });

    await dependenciasGerarEnviarBookNavegador.enviarEmail(payload);

    expect(emailService.sendEmail).toHaveBeenCalledWith({
      to: payload.email,
      cc: [],
      bcc: [],
      subject: payload.nome,
      html: payload.mensagem,
      anexos: payload.anexos
    });
  });

  it('lança erro quando o emailService não envia', async () => {
    (emailService.sendEmail as any).mockResolvedValue({ success: false, error: 'HTTP 500' });

    await expect(dependenciasGerarEnviarBookNavegador.enviarEmail(payload)).rejects.toThrow('HTTP 500');
  });

  it('usa o usuário logado para registrar o envio', () => {
    expect('responsavelId' in dependenciasGerarEnviarBookNavegador).toBe(false);
  });
});
