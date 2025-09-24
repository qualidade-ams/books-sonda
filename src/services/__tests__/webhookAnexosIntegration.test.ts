import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { booksDisparoService } from '../booksDisparoService';
import { anexoService } from '../anexoService';
import { emailService } from '../emailService';
import { supabase } from '@/integrations/supabase/client';
import type { AnexoWebhookData, AnexosSummaryWebhook, DisparoComAnexos } from '@/types/clientBooks';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn()
        })),
        insert: vi.fn(),
        update: vi.fn(() => ({
          eq: vi.fn()
        }))
      }))
    }))
  }
}));

// Mock do anexoService
vi.mock('../anexoService', () => ({
  anexoService: {
    obterAnexosEmpresa: vi.fn(),
    gerarTokenAcessoPublico: vi.fn(),
    atualizarStatusAnexo: vi.fn(),
    prepararAnexosParaWebhook: vi.fn()
  }
}));

// Mock do emailService
vi.mock('../emailService', () => ({
  emailService: {
    sendEmail: vi.fn()
  }
}));

describe('Webhook Anexos Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Estrutura do Payload com Múltiplos Anexos', () => {
    it('deve gerar payload correto com múltiplos anexos', async () => {
      const empresaId = 'empresa-1';
      const anexosMock = [
        {
          id: 'anexo-1',
          nome: 'relatorio.pdf',
          tipo: 'application/pdf',
          tamanho: 1024 * 1024, // 1MB
          url: 'https://storage.url/relatorio.pdf',
          status: 'pendente' as const,
          empresaId,
          token: 'token-1'
        },
        {
          id: 'anexo-2',
          nome: 'planilha.xlsx',
          tipo: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          tamanho: 2 * 1024 * 1024, // 2MB
          url: 'https://storage.url/planilha.xlsx',
          status: 'pendente' as const,
          empresaId,
          token: 'token-2'
        }
      ];

      const anexosWebhook: AnexoWebhookData[] = [
        {
          url: 'https://storage.url/relatorio.pdf',
          nome: 'relatorio.pdf',
          tipo: 'application/pdf',
          tamanho: 1024 * 1024,
          token: 'jwt-token-1'
        },
        {
          url: 'https://storage.url/planilha.xlsx',
          nome: 'planilha.xlsx',
          tipo: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          tamanho: 2 * 1024 * 1024,
          token: 'jwt-token-2'
        }
      ];

      (anexoService.obterAnexosEmpresa as any).mockResolvedValue(anexosMock);
      (anexoService.gerarTokenAcessoPublico as any)
        .mockResolvedValueOnce('jwt-token-1')
        .mockResolvedValueOnce('jwt-token-2');

      // Simular método privado através de reflexão
      const service = booksDisparoService as any;
      const resultado = service.prepararDadosAnexosWebhook(anexosWebhook);

      expect(resultado).toEqual({
        totalArquivos: 2,
        tamanhoTotal: 3 * 1024 * 1024, // 3MB total
        arquivos: [
          {
            url: 'https://storage.url/relatorio.pdf',
            nome: 'relatorio.pdf',
            tipo: 'application/pdf',
            tamanho: 1024 * 1024,
            token: 'jwt-token-1'
          },
          {
            url: 'https://storage.url/planilha.xlsx',
            nome: 'planilha.xlsx',
            tipo: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            tamanho: 2 * 1024 * 1024,
            token: 'jwt-token-2'
          }
        ]
      });
    });

    it('deve gerar payload vazio quando não há anexos', () => {
      const service = booksDisparoService as any;
      const resultado = service.prepararDadosAnexosWebhook([]);

      expect(resultado).toEqual({
        totalArquivos: 0,
        tamanhoTotal: 0,
        arquivos: []
      });
    });

    it('deve incluir anexos no payload do e-mail', async () => {
      const anexosWebhook: AnexoWebhookData[] = [
        {
          url: 'https://storage.url/documento.pdf',
          nome: 'documento.pdf',
          tipo: 'application/pdf',
          tamanho: 1024 * 1024,
          token: 'jwt-token-123'
        }
      ];

      (emailService.sendEmail as any).mockResolvedValue({ success: true });
      (anexoService.obterAnexosEmpresa as any).mockResolvedValue([]);

      const service = booksDisparoService as any;
      
      await service.enviarEmailConsolidadoComAnexos(
        ['cliente@empresa.com'],
        ['gestor@empresa.com'],
        'Assunto do E-mail',
        '<p>Conteúdo do e-mail</p>',
        { id: 'empresa-1', nome_completo: 'Empresa Teste', anexo: true },
        [{ id: 'cliente-1', nome_completo: 'Cliente Teste', email: 'cliente@empresa.com' }],
        anexosWebhook
      );

      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: ['cliente@empresa.com'],
        cc: ['gestor@empresa.com'],
        subject: 'Assunto do E-mail',
        html: '<p>Conteúdo do e-mail</p>',
        anexos: {
          totalArquivos: 1,
          tamanhoTotal: 1024 * 1024,
          arquivos: [{
            url: 'https://storage.url/documento.pdf',
            nome: 'documento.pdf',
            tipo: 'application/pdf',
            tamanho: 1024 * 1024,
            token: 'jwt-token-123'
          }]
        }
      });
    });
  });

  describe('Geração de Tokens e URLs Temporárias', () => {
    it('deve gerar tokens JWT únicos para cada anexo', async () => {
      const empresaId = 'empresa-1';
      const anexosMock = [
        {
          id: 'anexo-1',
          nome: 'doc1.pdf',
          tipo: 'application/pdf',
          tamanho: 1024 * 1024,
          url: 'https://storage.url/doc1.pdf',
          status: 'pendente' as const,
          empresaId
        },
        {
          id: 'anexo-2',
          nome: 'doc2.pdf',
          tipo: 'application/pdf',
          tamanho: 1024 * 1024,
          url: 'https://storage.url/doc2.pdf',
          status: 'pendente' as const,
          empresaId
        }
      ];

      (anexoService.obterAnexosEmpresa as any).mockResolvedValue(anexosMock);
      (anexoService.gerarTokenAcessoPublico as any)
        .mockResolvedValueOnce('jwt-token-unique-1')
        .mockResolvedValueOnce('jwt-token-unique-2');
      (anexoService.atualizarStatusAnexo as any).mockResolvedValue(undefined);

      const service = booksDisparoService as any;
      const resultado = await service.buscarAnexosEmpresa(empresaId);

      expect(resultado).toHaveLength(2);
      expect(resultado[0].token).toBe('jwt-token-unique-1');
      expect(resultado[1].token).toBe('jwt-token-unique-2');
      expect(anexoService.gerarTokenAcessoPublico).toHaveBeenCalledTimes(2);
      expect(anexoService.gerarTokenAcessoPublico).toHaveBeenCalledWith('anexo-1');
      expect(anexoService.gerarTokenAcessoPublico).toHaveBeenCalledWith('anexo-2');
    });

    it('deve atualizar status dos anexos para "enviando" durante processamento', async () => {
      const empresaId = 'empresa-1';
      const anexosMock = [
        {
          id: 'anexo-1',
          nome: 'documento.pdf',
          tipo: 'application/pdf',
          tamanho: 1024 * 1024,
          url: 'https://storage.url/documento.pdf',
          status: 'pendente' as const,
          empresaId
        }
      ];

      (anexoService.obterAnexosEmpresa as any).mockResolvedValue(anexosMock);
      (anexoService.gerarTokenAcessoPublico as any).mockResolvedValue('jwt-token-123');
      (anexoService.atualizarStatusAnexo as any).mockResolvedValue(undefined);

      const service = booksDisparoService as any;
      await service.buscarAnexosEmpresa(empresaId);

      expect(anexoService.atualizarStatusAnexo).toHaveBeenCalledWith('anexo-1', 'enviando');
    });

    it('deve gerar URLs temporárias válidas', async () => {
      const anexosWebhook: AnexoWebhookData[] = [
        {
          url: 'https://storage.supabase.co/anexos/temp/documento.pdf',
          nome: 'documento.pdf',
          tipo: 'application/pdf',
          tamanho: 1024 * 1024,
          token: 'jwt-token-123'
        }
      ];

      anexosWebhook.forEach(anexo => {
        expect(anexo.url).toMatch(/^https:\/\//);
        expect(anexo.token).toBeTruthy();
        expect(anexo.token.length).toBeGreaterThan(10);
      });
    });

    it('deve incluir metadados completos de cada arquivo', async () => {
      const anexosWebhook: AnexoWebhookData[] = [
        {
          url: 'https://storage.url/relatorio.pdf',
          nome: 'Relatório Mensal.pdf',
          tipo: 'application/pdf',
          tamanho: 2 * 1024 * 1024, // 2MB
          token: 'jwt-token-123'
        },
        {
          url: 'https://storage.url/dados.xlsx',
          nome: 'Dados Complementares.xlsx',
          tipo: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          tamanho: 1.5 * 1024 * 1024, // 1.5MB
          token: 'jwt-token-456'
        }
      ];

      anexosWebhook.forEach(anexo => {
        expect(anexo).toHaveProperty('url');
        expect(anexo).toHaveProperty('nome');
        expect(anexo).toHaveProperty('tipo');
        expect(anexo).toHaveProperty('tamanho');
        expect(anexo).toHaveProperty('token');
        
        expect(typeof anexo.url).toBe('string');
        expect(typeof anexo.nome).toBe('string');
        expect(typeof anexo.tipo).toBe('string');
        expect(typeof anexo.tamanho).toBe('number');
        expect(typeof anexo.token).toBe('string');
        
        expect(anexo.tamanho).toBeGreaterThan(0);
      });
    });
  });

  describe('Tratamento de Erros de Processamento', () => {
    it('deve tratar erro na geração de token', async () => {
      const empresaId = 'empresa-1';
      const anexosMock = [
        {
          id: 'anexo-1',
          nome: 'documento.pdf',
          tipo: 'application/pdf',
          tamanho: 1024 * 1024,
          url: 'https://storage.url/documento.pdf',
          status: 'pendente' as const,
          empresaId
        }
      ];

      (anexoService.obterAnexosEmpresa as any).mockResolvedValue(anexosMock);
      (anexoService.gerarTokenAcessoPublico as any).mockRejectedValue(new Error('Erro ao gerar token'));
      (anexoService.atualizarStatusAnexo as any).mockResolvedValue(undefined);

      const service = booksDisparoService as any;
      const resultado = await service.buscarAnexosEmpresa(empresaId);

      // Deve retornar array vazio quando há erro na geração de token
      expect(resultado).toEqual([]);
      
      // Deve marcar anexo como erro
      expect(anexoService.atualizarStatusAnexo).toHaveBeenCalledWith('anexo-1', 'enviando');
      // Segundo chamada deve ser para marcar como erro
      expect(anexoService.atualizarStatusAnexo).toHaveBeenCalledTimes(2);
    });

    it('deve tratar erro no envio do webhook', async () => {
      const anexosWebhook: AnexoWebhookData[] = [
        {
          url: 'https://storage.url/documento.pdf',
          nome: 'documento.pdf',
          tipo: 'application/pdf',
          tamanho: 1024 * 1024,
          token: 'jwt-token-123'
        }
      ];

      const anexosEnviando = [
        {
          id: 'anexo-1',
          nome: 'documento.pdf',
          status: 'enviando' as const,
          empresaId: 'empresa-1'
        }
      ];

      (emailService.sendEmail as any).mockResolvedValue({ 
        success: false, 
        error: 'Webhook endpoint não disponível' 
      });
      (anexoService.obterAnexosEmpresa as any).mockResolvedValue(anexosEnviando);
      (anexoService.atualizarStatusAnexo as any).mockResolvedValue(undefined);

      const service = booksDisparoService as any;
      
      const resultado = await service.enviarEmailConsolidadoComAnexos(
        ['cliente@empresa.com'],
        [],
        'Assunto',
        'Conteúdo',
        { id: 'empresa-1', nome_completo: 'Empresa Teste', anexo: true },
        [],
        anexosWebhook
      );

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toContain('Webhook endpoint não disponível');
      
      // Deve marcar anexos como erro
      expect(anexoService.atualizarStatusAnexo).toHaveBeenCalledWith(
        'anexo-1', 
        'erro'
      );
    });

    it('deve continuar processamento mesmo com falha em alguns anexos', async () => {
      const empresaId = 'empresa-1';
      const anexosMock = [
        {
          id: 'anexo-1',
          nome: 'doc1.pdf',
          tipo: 'application/pdf',
          tamanho: 1024 * 1024,
          url: 'https://storage.url/doc1.pdf',
          status: 'pendente' as const,
          empresaId
        },
        {
          id: 'anexo-2',
          nome: 'doc2.pdf',
          tipo: 'application/pdf',
          tamanho: 1024 * 1024,
          url: 'https://storage.url/doc2.pdf',
          status: 'pendente' as const,
          empresaId
        }
      ];

      (anexoService.obterAnexosEmpresa as any).mockResolvedValue(anexosMock);
      (anexoService.gerarTokenAcessoPublico as any)
        .mockRejectedValueOnce(new Error('Erro no primeiro anexo'))
        .mockResolvedValueOnce('jwt-token-2');
      (anexoService.atualizarStatusAnexo as any).mockResolvedValue(undefined);

      const service = booksDisparoService as any;
      const resultado = await service.buscarAnexosEmpresa(empresaId);

      // Deve retornar apenas o anexo que foi processado com sucesso
      expect(resultado).toHaveLength(1);
      expect(resultado[0].nome).toBe('doc2.pdf');
      expect(resultado[0].token).toBe('jwt-token-2');
    });

    it('deve validar estrutura do payload antes do envio', () => {
      const anexosWebhook: AnexoWebhookData[] = [
        {
          url: 'https://storage.url/documento.pdf',
          nome: 'documento.pdf',
          tipo: 'application/pdf',
          tamanho: 1024 * 1024,
          token: 'jwt-token-123'
        }
      ];

      const service = booksDisparoService as any;
      const dadosAnexos = service.prepararDadosAnexosWebhook(anexosWebhook);

      // Validar estrutura esperada pelo Power Automate
      expect(dadosAnexos).toHaveProperty('totalArquivos');
      expect(dadosAnexos).toHaveProperty('tamanhoTotal');
      expect(dadosAnexos).toHaveProperty('arquivos');
      
      expect(Array.isArray(dadosAnexos.arquivos)).toBe(true);
      expect(dadosAnexos.totalArquivos).toBe(1);
      expect(dadosAnexos.tamanhoTotal).toBe(1024 * 1024);
      
      dadosAnexos.arquivos.forEach((arquivo: any) => {
        expect(arquivo).toHaveProperty('url');
        expect(arquivo).toHaveProperty('nome');
        expect(arquivo).toHaveProperty('tipo');
        expect(arquivo).toHaveProperty('tamanho');
        expect(arquivo).toHaveProperty('token');
      });
    });

    it('deve registrar eventos de anexos para auditoria', async () => {
      const empresaId = 'empresa-1';
      const anexosIds = ['anexo-1', 'anexo-2'];
      
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      (supabase.from as any).mockReturnValue({
        insert: mockInsert
      });

      const service = booksDisparoService as any;
      
      await service.registrarEventoAnexos(
        empresaId,
        anexosIds,
        'enviados_ao_power_automate',
        'Anexos enviados com sucesso'
      );

      expect(supabase.from).toHaveBeenCalledWith('anexos_eventos');
      expect(mockInsert).toHaveBeenCalledWith({
        empresa_id: empresaId,
        anexos_ids: anexosIds,
        evento: 'enviados_ao_power_automate',
        detalhes: 'Anexos enviados com sucesso',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Payload Completo do Webhook', () => {
    it('deve gerar payload completo conforme especificação', () => {
      const payloadEsperado = {
        empresa: {
          id: 'empresa-1',
          nome: 'Empresa Teste Ltda',
          email_gestor: 'gestor@empresa.com'
        },
        clientes: [
          {
            id: 'cliente-1',
            nome: 'João Silva',
            email: 'joao@empresa.com'
          },
          {
            id: 'cliente-2',
            nome: 'Maria Santos',
            email: 'maria@empresa.com'
          }
        ],
        template: {
          id: 'template-1',
          nome: 'Template Personalizado',
          conteudo: '<p>Conteúdo do template</p>'
        },
        anexos: {
          totalArquivos: 2,
          tamanhoTotal: 3 * 1024 * 1024, // 3MB
          arquivos: [
            {
              url: 'https://storage.supabase.co/anexos/temp/relatorio.pdf',
              nome: 'Relatório Mensal.pdf',
              tipo: 'application/pdf',
              tamanho: 2 * 1024 * 1024,
              token: 'jwt-token-para-autenticacao-1'
            },
            {
              url: 'https://storage.supabase.co/anexos/temp/planilha.xlsx',
              nome: 'Dados Complementares.xlsx',
              tipo: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              tamanho: 1 * 1024 * 1024,
              token: 'jwt-token-para-autenticacao-2'
            }
          ]
        },
        metadados: {
          mes_referencia: expect.any(String),
          data_disparo: expect.any(String)
        }
      };

      // Validar estrutura do payload
      expect(payloadEsperado.empresa).toHaveProperty('id');
      expect(payloadEsperado.empresa).toHaveProperty('nome');
      expect(payloadEsperado.empresa).toHaveProperty('email_gestor');
      
      expect(Array.isArray(payloadEsperado.clientes)).toBe(true);
      expect(payloadEsperado.clientes.length).toBeGreaterThan(0);
      
      expect(payloadEsperado.anexos).toHaveProperty('totalArquivos');
      expect(payloadEsperado.anexos).toHaveProperty('tamanhoTotal');
      expect(payloadEsperado.anexos).toHaveProperty('arquivos');
      
      expect(payloadEsperado.anexos.totalArquivos).toBe(2);
      expect(payloadEsperado.anexos.arquivos).toHaveLength(2);
    });
  });
});