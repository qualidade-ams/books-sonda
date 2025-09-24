import { describe, it, expect, vi, beforeEach } from 'vitest';
import { booksDisparoService } from '../booksDisparoService';
import { anexoService } from '../anexoService';
import { emailService } from '../emailService';
import { clientBooksTemplateService } from '../clientBooksTemplateService';

// Mock dos serviços
vi.mock('../anexoService');
vi.mock('../emailService');
vi.mock('../clientBooksTemplateService');
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn().mockResolvedValue({ data: null, error: null })
  }
}));

describe('BooksDisparoService - Anexos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buscarAnexosEmpresa', () => {
    it('deve buscar anexos pendentes e gerar tokens', async () => {
      // Mock dos dados de anexos
      const anexosMock = [
        {
          id: 'anexo-1',
          nome: 'documento.pdf',
          tipo: 'application/pdf',
          tamanho: 1024,
          url: 'https://storage.supabase.co/anexos/documento.pdf',
          status: 'pendente',
          empresaId: 'empresa-1'
        },
        {
          id: 'anexo-2',
          nome: 'planilha.xlsx',
          tipo: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          tamanho: 2048,
          url: 'https://storage.supabase.co/anexos/planilha.xlsx',
          status: 'pendente',
          empresaId: 'empresa-1'
        }
      ];

      // Mock das funções do anexoService
      vi.mocked(anexoService.obterAnexosEmpresa).mockResolvedValue(anexosMock);
      vi.mocked(anexoService.atualizarStatusAnexo).mockResolvedValue();
      vi.mocked(anexoService.gerarTokenAcessoPublico).mockResolvedValue('mock-token-jwt');

      // Chamar método privado através de reflexão
      const resultado = await (booksDisparoService as any).buscarAnexosEmpresa('empresa-1');

      // Verificações
      expect(anexoService.obterAnexosEmpresa).toHaveBeenCalledWith('empresa-1');
      expect(anexoService.atualizarStatusAnexo).toHaveBeenCalledTimes(2);
      expect(anexoService.gerarTokenAcessoPublico).toHaveBeenCalledTimes(2);
      
      expect(resultado).toHaveLength(2);
      expect(resultado[0]).toEqual({
        url: 'https://storage.supabase.co/anexos/documento.pdf',
        nome: 'documento.pdf',
        tipo: 'application/pdf',
        tamanho: 1024,
        token: 'mock-token-jwt'
      });
    });

    it('deve retornar array vazio quando não há anexos pendentes', async () => {
      vi.mocked(anexoService.obterAnexosEmpresa).mockResolvedValue([]);

      const resultado = await (booksDisparoService as any).buscarAnexosEmpresa('empresa-1');

      expect(resultado).toEqual([]);
    });

    it('deve marcar anexo como erro quando falha ao gerar token', async () => {
      const anexosMock = [
        {
          id: 'anexo-1',
          nome: 'documento.pdf',
          tipo: 'application/pdf',
          tamanho: 1024,
          url: 'https://storage.supabase.co/anexos/documento.pdf',
          status: 'pendente',
          empresaId: 'empresa-1'
        }
      ];

      vi.mocked(anexoService.obterAnexosEmpresa).mockResolvedValue(anexosMock);
      vi.mocked(anexoService.atualizarStatusAnexo).mockResolvedValue();
      vi.mocked(anexoService.gerarTokenAcessoPublico).mockRejectedValue(new Error('Erro ao gerar token'));

      const resultado = await (booksDisparoService as any).buscarAnexosEmpresa('empresa-1');

      expect(anexoService.atualizarStatusAnexo).toHaveBeenCalledWith('anexo-1', 'erro');
      expect(resultado).toEqual([]);
    });
  });

  describe('prepararDadosAnexosWebhook', () => {
    it('deve preparar dados de anexos para webhook', () => {
      const anexosMock = [
        {
          url: 'https://storage.supabase.co/anexos/documento.pdf',
          nome: 'documento.pdf',
          tipo: 'application/pdf',
          tamanho: 1024,
          token: 'token-1'
        },
        {
          url: 'https://storage.supabase.co/anexos/planilha.xlsx',
          nome: 'planilha.xlsx',
          tipo: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          tamanho: 2048,
          token: 'token-2'
        }
      ];

      const resultado = (booksDisparoService as any).prepararDadosAnexosWebhook(anexosMock);

      expect(resultado).toEqual({
        totalArquivos: 2,
        tamanhoTotal: 3072,
        arquivos: anexosMock
      });
    });

    it('deve retornar undefined quando não há anexos', () => {
      const resultado = (booksDisparoService as any).prepararDadosAnexosWebhook([]);
      expect(resultado).toBeUndefined();
    });
  });

  describe('processarConfirmacaoAnexo', () => {

    it('deve processar confirmação de sucesso corretamente', async () => {
      vi.mocked(anexoService.atualizarStatusAnexo).mockResolvedValue();
      vi.mocked(anexoService.moverParaPermanente).mockResolvedValue();

      await booksDisparoService.processarConfirmacaoAnexo(
        'empresa-1',
        ['anexo-1', 'anexo-2'],
        true
      );

      expect(anexoService.atualizarStatusAnexo).toHaveBeenCalledTimes(2);
      expect(anexoService.moverParaPermanente).toHaveBeenCalledWith(['anexo-1', 'anexo-2']);
    });

    it('deve processar confirmação de erro corretamente', async () => {
      vi.mocked(anexoService.atualizarStatusAnexo).mockResolvedValue();

      await booksDisparoService.processarConfirmacaoAnexo(
        'empresa-1',
        ['anexo-1'],
        false,
        'Erro no Power Automate'
      );

      expect(anexoService.atualizarStatusAnexo).toHaveBeenCalledTimes(1);
      expect(anexoService.moverParaPermanente).not.toHaveBeenCalled();
    });
  });

  describe('obterStatusAnexosEmpresa', () => {
    it('deve retornar status detalhado dos anexos', async () => {
      const anexosMock = [
        {
          id: 'anexo-1',
          nome: 'documento.pdf',
          status: 'processado',
          dataUpload: '2024-01-01T10:00:00Z',
          dataExpiracao: '2024-01-02T10:00:00Z'
        },
        {
          id: 'anexo-2',
          nome: 'planilha.xlsx',
          status: 'erro',
          dataUpload: '2024-01-01T11:00:00Z',
          dataExpiracao: '2024-01-02T11:00:00Z'
        }
      ];

      vi.mocked(anexoService.obterAnexosEmpresa).mockResolvedValue(anexosMock as any);

      const resultado = await booksDisparoService.obterStatusAnexosEmpresa('empresa-1');

      expect(resultado).toEqual({
        total: 2,
        pendentes: 0,
        enviando: 0,
        processados: 1,
        comErro: 1,
        detalhes: [
          {
            id: 'anexo-1',
            nome: 'documento.pdf',
            status: 'processado',
            dataUpload: '2024-01-01T10:00:00Z',
            dataProcessamento: '2024-01-02T10:00:00Z',
            erroDetalhes: undefined
          },
          {
            id: 'anexo-2',
            nome: 'planilha.xlsx',
            status: 'erro',
            dataUpload: '2024-01-01T11:00:00Z',
            dataProcessamento: '2024-01-02T11:00:00Z',
            erroDetalhes: undefined
          }
        ]
      });
    });
  });
});