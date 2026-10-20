import { describe, it, expect, vi, beforeEach } from 'vitest';
import { emailService } from '../emailService';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: vi.fn() },
    from: vi.fn(() => ({ insert: vi.fn().mockResolvedValue({ error: null }) })),
    storage: { from: vi.fn() }
  }
}));

const MB = 1024 * 1024;

/** Base64 de um arquivo com `bytes` bytes (cada 3 bytes viram 4 caracteres) */
const base64DeTamanho = (bytes: number) => 'A'.repeat(Math.ceil(bytes / 3) * 4);

let uploads: Array<{ bucket: string; caminho: string; tamanho: number }>;

const payloadEnviado = () => JSON.parse((global.fetch as any).mock.calls[0][1].body);

describe('emailService - e-mails com anexos grandes (limite de 4,5 MB da Vercel)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploads = [];
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: { access_token: 'token' } }, error: null });
    (supabase.storage.from as any).mockImplementation((bucket: string) => ({
      upload: vi.fn(async (caminho: string, arquivo: Blob) => {
        uploads.push({ bucket, caminho, tamanho: arquivo.size });
        return { error: null };
      }),
      getPublicUrl: (caminho: string) => ({ data: { publicUrl: `https://storage.test/${bucket}/${caminho}` } })
    }));
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 202, statusText: 'Accepted', text: async () => '' }) as any;
  });

  it('e-mail pequeno segue com os anexos embutidos, sem passar pelo Storage', async () => {
    await emailService.sendEmail({
      to: 'a@cliente.com',
      subject: 'Elogio',
      html: '<p>x</p>',
      attachments: [{ filename: 'pequeno.xlsx', content: base64DeTamanho(100_000), contentType: 'application/xlsx' }]
    });

    expect(uploads).toHaveLength(0);
    expect(payloadEnviado().attachments).toHaveLength(1);
  });

  it('e-mail acima do limite sobe os anexos para anexos-temporarios/emails e envia só os links', async () => {
    const resultado = await emailService.sendEmail({
      to: 'a@cliente.com',
      subject: 'Elogios',
      html: '<p>x</p>',
      attachments: [
        { filename: 'grande.xlsx', content: base64DeTamanho(4 * MB), contentType: 'application/xlsx' },
        { filename: 'outro.pdf', content: base64DeTamanho(1 * MB), contentType: 'application/pdf' }
      ]
    });

    expect(resultado.success).toBe(true);
    expect(uploads.map(u => u.bucket)).toEqual(['anexos-temporarios', 'anexos-temporarios']);
    expect(uploads.every(u => u.caminho.startsWith('emails/'))).toBe(true);

    const payload = payloadEnviado();
    expect(payload.attachments).toBeUndefined();
    expect(payload.anexos.totalArquivos).toBe(2);
    expect(payload.anexos.arquivos.map((a: any) => a.nome)).toEqual(['grande.xlsx', 'outro.pdf']);
    expect(payload.anexos.arquivos[0].url).toContain('https://storage.test/anexos-temporarios/emails/');
    expect(new TextEncoder().encode(JSON.stringify(payload)).length).toBeLessThan(4 * MB);
  });

  it('mantém os anexos por link que o e-mail já tinha', async () => {
    await emailService.sendEmail({
      to: 'a@cliente.com',
      subject: 'Book',
      html: '<p>x</p>',
      attachments: [{ filename: 'grande.xlsx', content: base64DeTamanho(5 * MB), contentType: 'application/xlsx' }],
      anexos: {
        totalArquivos: 1,
        tamanhoTotal: 1000,
        arquivos: [{ url: 'https://storage.test/ja-existente.pdf', nome: 'existente.pdf', tipo: 'application/pdf', tamanho: 1000, token: 't' }]
      }
    });

    const anexos = payloadEnviado().anexos;
    expect(anexos.totalArquivos).toBe(2);
    expect(anexos.arquivos.map((a: any) => a.nome)).toEqual(['existente.pdf', 'grande.xlsx']);
  });

  it('recusa anexos acima de 25 MB no total, sem enviar', async () => {
    const resultado = await emailService.sendEmail({
      to: 'a@cliente.com',
      subject: 'Muito grande',
      html: '<p>x</p>',
      attachments: [{ filename: 'enorme.zip', content: base64DeTamanho(26 * MB), contentType: 'application/zip' }]
    });

    expect(resultado.success).toBe(false);
    expect(resultado.error).toMatch(/25 MB/);
    expect(uploads).toHaveLength(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('recusa com mensagem clara quando o próprio conteúdo do e-mail passa do limite', async () => {
    const resultado = await emailService.sendEmail({
      to: 'a@cliente.com',
      subject: 'HTML enorme',
      html: `<img src="data:image/png;base64,${base64DeTamanho(5 * MB)}" />`
    });

    expect(resultado.success).toBe(false);
    expect(resultado.error).toMatch(/conteúdo do e-mail/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
