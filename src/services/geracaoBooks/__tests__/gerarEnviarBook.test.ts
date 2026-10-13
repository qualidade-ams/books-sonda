import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  gerarEEnviarBook,
  ErroEnvioEmailBook,
  DESTINATARIOS_BOOK_QUALIDADE,
  type DependenciasGerarEnviarBook
} from '../gerarEnviarBook';
import { booksService } from '@/services/booksService';
import { booksVersioningService } from '@/services/booksVersioningService';
import { gerarExcelDetalhadoBook } from '@/utils/gerarExcelDetalhadoBook';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: vi.fn() } }
}));
vi.mock('@/services/booksService', () => ({
  booksService: { gerarBooksLote: vi.fn() }
}));
vi.mock('@/services/booksVersioningService', () => ({
  booksVersioningService: { registrarEnvio: vi.fn() }
}));
vi.mock('@/utils/gerarExcelDetalhadoBook', () => ({
  gerarExcelDetalhadoBook: vi.fn()
}));

const book = {
  empresa_id: 'emp-1',
  empresa_nome: 'Empresa Ação Ltda',
  empresa_nome_abreviado: 'AÇÃO SA',
  dia_inicio_apuracao: 1,
  dia_fim_apuracao: 0
};

let uploads: Array<{ bucket: string; caminho: string }>;

function deps(sobrescritas: Partial<DependenciasGerarEnviarBook> = {}): DependenciasGerarEnviarBook {
  return {
    gerarPdf: vi.fn().mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' })),
    enviarEmail: vi.fn().mockResolvedValue(undefined),
    ...sobrescritas
  };
}

describe('gerarEEnviarBook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    uploads = [];
    (booksService.gerarBooksLote as any).mockResolvedValue({
      total: 1,
      sucesso: 1,
      falhas: 0,
      resultados: [{ sucesso: true, book_id: 'book-1', empresa_id: 'emp-1', empresa_nome: 'Empresa' }]
    });
    (booksVersioningService.registrarEnvio as any).mockResolvedValue({ success: true, versaoId: 'v1' });
    (gerarExcelDetalhadoBook as any).mockResolvedValue(
      new File(['excel'], 'Detalhado AÇÃO.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    );
    (supabase.storage.from as any).mockImplementation((bucket: string) => ({
      upload: vi.fn(async (caminho: string) => {
        uploads.push({ bucket, caminho });
        return { error: null };
      }),
      getPublicUrl: (caminho: string) => ({ data: { publicUrl: `https://storage/${bucket}/${caminho}` } })
    }));
  });

  it('gera o book do período, sobe PDF e Excel, envia para a Qualidade e registra o envio', async () => {
    const d = deps();
    const resultado = await gerarEEnviarBook(book, 9, 2026, d);

    expect(resultado).toEqual({ bookId: 'book-1' });
    expect(booksService.gerarBooksLote).toHaveBeenCalledWith({
      empresa_ids: ['emp-1'],
      mes: 9,
      ano: 2026,
      gerar_pdf: true,
      forcar_atualizacao: true
    });
    expect(d.gerarPdf).toHaveBeenCalledWith('book-1');
    expect(gerarExcelDetalhadoBook).toHaveBeenCalledWith({
      empresaId: 'emp-1',
      empresaNome: 'AÇÃO SA',
      mes: 9,
      ano: 2026,
      diaInicioApuracao: 1,
      diaFimApuracao: 0
    });

    // nomes sem acento/espaço no storage
    expect(uploads).toEqual([
      { bucket: 'anexos-temporarios', caminho: 'books-temp/2026/09/Book_ACAO_SA_Setembro_2026.pdf' },
      { bucket: 'anexos-temporarios', caminho: 'books-temp/2026/09/Detalhado_ACAO.xlsx' }
    ]);

    const payload = (d.enviarEmail as any).mock.calls[0][0];
    expect(payload).toMatchObject({
      nome: 'BOOK: AÇÃO_SA_2026_09. Setembro',
      email: DESTINATARIOS_BOOK_QUALIDADE,
      email_cc: [],
      email_bcc: []
    });
    expect(payload.mensagem).toContain('AÇÃO SA');
    expect(payload.mensagem).toContain('Setembro/2026');
    expect(payload.anexos.totalArquivos).toBe(2);
    expect(payload.anexos.arquivos[0]).toMatchObject({
      nome: 'Book_AÇÃO_SA_Setembro_2026.pdf',
      tipo: 'application/pdf',
      url: 'https://storage/anexos-temporarios/books-temp/2026/09/Book_ACAO_SA_Setembro_2026.pdf'
    });

    expect(booksVersioningService.registrarEnvio).toHaveBeenCalledWith('book-1', DESTINATARIOS_BOOK_QUALIDADE, undefined);
  });

  it('no servidor registra o envio em nome do responsável informado', async () => {
    await gerarEEnviarBook(book, 9, 2026, deps({ responsavelId: 'criador' }));
    expect(booksVersioningService.registrarEnvio).toHaveBeenCalledWith('book-1', DESTINATARIOS_BOOK_QUALIDADE, {
      usuarioId: 'criador'
    });

    vi.clearAllMocks();
    (booksService.gerarBooksLote as any).mockResolvedValue({
      resultados: [{ sucesso: true, book_id: 'book-1' }]
    });
    (booksVersioningService.registrarEnvio as any).mockResolvedValue({ success: true });
    await gerarEEnviarBook(book, 9, 2026, deps({ responsavelId: null }));
    expect(booksVersioningService.registrarEnvio).toHaveBeenCalledWith('book-1', DESTINATARIOS_BOOK_QUALIDADE, {
      usuarioId: null
    });
  });

  it('usa o nome completo quando não há nome abreviado', async () => {
    const d = deps();
    await gerarEEnviarBook({ ...book, empresa_nome_abreviado: undefined }, 9, 2026, d);
    expect((d.enviarEmail as any).mock.calls[0][0].nome).toBe('BOOK: EMPRESA_AÇÃO_LTDA_2026_09. Setembro');
  });

  it('falha na geração interrompe antes do PDF', async () => {
    (booksService.gerarBooksLote as any).mockResolvedValue({
      resultados: [{ sucesso: false, empresa_id: 'emp-1', erro: 'sem dados' }]
    });
    const d = deps();

    await expect(gerarEEnviarBook(book, 9, 2026, d)).rejects.toThrow('Falha ao gerar book: sem dados');
    expect(d.gerarPdf).not.toHaveBeenCalled();
    expect(d.enviarEmail).not.toHaveBeenCalled();
  });

  it('falha no upload do PDF não envia e-mail', async () => {
    (supabase.storage.from as any).mockImplementation(() => ({
      upload: vi.fn(async () => ({ error: { message: 'bucket cheio' } })),
      getPublicUrl: () => ({ data: { publicUrl: '' } })
    }));
    const d = deps();

    await expect(gerarEEnviarBook(book, 9, 2026, d)).rejects.toThrow('Erro no upload do PDF: bucket cheio');
    expect(d.enviarEmail).not.toHaveBeenCalled();
  });

  it('Excel com erro não bloqueia: envia só o PDF', async () => {
    (gerarExcelDetalhadoBook as any).mockRejectedValue(new Error('xlsx quebrou'));
    const d = deps();

    await gerarEEnviarBook(book, 9, 2026, d);
    const payload = (d.enviarEmail as any).mock.calls[0][0];
    expect(payload.anexos.totalArquivos).toBe(1);
    expect(booksVersioningService.registrarEnvio).toHaveBeenCalled();
  });

  it('falha no e-mail lança ErroEnvioEmailBook e não registra o envio', async () => {
    const d = deps({ enviarEmail: vi.fn().mockRejectedValue(new Error('HTTP 429')) });

    const erro = await gerarEEnviarBook(book, 9, 2026, d).catch((e) => e);
    expect(erro).toBeInstanceOf(ErroEnvioEmailBook);
    expect(erro.message).toMatch(/HTTP 429/);
    expect(booksVersioningService.registrarEnvio).not.toHaveBeenCalled();
  });

  it('falha ao registrar o envio é reportada (o book ficaria sem a marca de enviado)', async () => {
    (booksVersioningService.registrarEnvio as any).mockResolvedValue({ success: false, error: 'sem permissão' });

    await expect(gerarEEnviarBook(book, 9, 2026, deps())).rejects.toThrow(/registrar o envio.*sem permissão/);
  });
});
