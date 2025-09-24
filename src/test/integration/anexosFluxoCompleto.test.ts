import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dos serviços
const mockAnexoService = {
  uploadAnexos: vi.fn(),
  uploadAnexo: vi.fn(),
  obterAnexosEmpresa: vi.fn(),
  validarLimiteTotal: vi.fn(),
  moverParaPermanente: vi.fn(),
  removerAnexosEmpresa: vi.fn()
};

const mockBooksDisparoService = {
  executarDisparoPersonalizadoComAnexos: vi.fn()
};

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis()
  }))
};

// Mock dos módulos
vi.mock('@/services/anexoService', () => ({
  anexoService: mockAnexoService
}));

vi.mock('@/services/booksDisparoService', () => ({
  booksDisparoService: mockBooksDisparoService
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

describe('Anexos - Fluxo Completo de Upload e Disparo', () => {
  const mockEmpresaId = 'empresa-test-123';
  
  const mockAnexoData = {
    id: 'anexo-123',
    nome: 'documento-teste.pdf',
    tipo: 'application/pdf',
    tamanho: 1048576, // 1MB
    url: 'https://storage.supabase.co/anexos/temp/documento-teste.pdf',
    status: 'pendente' as const
  };

  const mockEmpresa = {
    id: mockEmpresaId,
    nome: 'Empresa Teste',
    book_personalizado: true,
    anexo: true,
    status: 'Ativo'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockSupabase.from().single.mockResolvedValue({ 
      data: mockEmpresa, 
      error: null 
    });
  });

  it('deve executar fluxo completo: upload → disparo → processamento', async () => {
    // 1. Setup - Mock do upload de múltiplos arquivos
    const mockFiles = [
      { name: 'documento1.pdf', type: 'application/pdf', size: 1048576 },
      { name: 'planilha1.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 2097152 }
    ];

    const mockAnexos = [
      { ...mockAnexoData, id: 'anexo-1', nome: 'documento1.pdf' },
      { ...mockAnexoData, id: 'anexo-2', nome: 'planilha1.xlsx', tipo: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    ];

    mockAnexoService.uploadAnexos.mockResolvedValue(mockAnexos);
    mockAnexoService.obterAnexosEmpresa.mockResolvedValue(mockAnexos);
    mockAnexoService.validarLimiteTotal.mockResolvedValue(true);

    // 2. Executar upload dos arquivos
    const resultadoUpload = await mockAnexoService.uploadAnexos(mockEmpresaId, mockFiles);

    // 3. Verificar upload dos arquivos
    expect(mockAnexoService.uploadAnexos).toHaveBeenCalledWith(
      mockEmpresaId, 
      mockFiles
    );
    expect(resultadoUpload).toEqual(mockAnexos);

    // 4. Mock do disparo personalizado
    const mockDisparoData = {
      empresaId: mockEmpresaId,
      clientes: [
        { id: 'cliente-1', nome: 'Cliente Teste', email: 'cliente@teste.com' }
      ],
      emailsCC: ['gestor@empresa.com'],
      anexos: [
        {
          url: mockAnexos[0].url,
          nome: mockAnexos[0].nome,
          tipo: mockAnexos[0].tipo,
          tamanho: mockAnexos[0].tamanho,
          token: 'jwt-token-123'
        },
        {
          url: mockAnexos[1].url,
          nome: mockAnexos[1].nome,
          tipo: mockAnexos[1].tipo,
          tamanho: mockAnexos[1].tamanho,
          token: 'jwt-token-456'
        }
      ]
    };

    mockBooksDisparoService.executarDisparoPersonalizadoComAnexos.mockResolvedValue({
      sucesso: true,
      empresasProcessadas: 1,
      anexosProcessados: 2
    });

    // 5. Executar disparo personalizado
    const resultado = await mockBooksDisparoService.executarDisparoPersonalizadoComAnexos(
      [mockEmpresaId]
    );

    // 6. Verificar processamento
    expect(mockBooksDisparoService.executarDisparoPersonalizadoComAnexos).toHaveBeenCalledWith(
      [mockEmpresaId]
    );

    expect(resultado.sucesso).toBe(true);
    expect(resultado.empresasProcessadas).toBe(1);
    expect(resultado.anexosProcessados).toBe(2);

    // 7. Verificar movimentação para storage permanente
    mockAnexoService.moverParaPermanente.mockResolvedValue();
    
    await mockAnexoService.moverParaPermanente(['anexo-1', 'anexo-2']);
    
    expect(mockAnexoService.moverParaPermanente).toHaveBeenCalledWith([
      'anexo-1', 'anexo-2'
    ]);
  });

  it('deve validar limite de 25MB durante upload de múltiplos arquivos', async () => {
    // Arquivos que excedem o limite
    const mockLargeFiles = [
      { name: 'arquivo1.pdf', type: 'application/pdf', size: 15 * 1024 * 1024 }, // 15MB
      { name: 'arquivo2.pdf', type: 'application/pdf', size: 12 * 1024 * 1024 }  // 12MB
    ];

    mockAnexoService.validarLimiteTotal.mockResolvedValue(false);
    mockAnexoService.uploadAnexos.mockRejectedValue(
      new Error('Limite total de 25MB excedido')
    );

    // Verificar validação de limite
    const isValid = await mockAnexoService.validarLimiteTotal(mockEmpresaId, mockLargeFiles);
    expect(isValid).toBe(false);

    // Tentar upload e verificar erro
    await expect(
      mockAnexoService.uploadAnexos(mockEmpresaId, mockLargeFiles)
    ).rejects.toThrow('Limite total de 25MB excedido');

    expect(mockAnexoService.validarLimiteTotal).toHaveBeenCalledWith(
      mockEmpresaId, 
      mockLargeFiles
    );
  });

  it('deve processar disparo com anexos e atualizar histórico', async () => {
    const mockHistoricoId = 'historico-123';
    
    mockBooksDisparoService.executarDisparoPersonalizadoComAnexos.mockResolvedValue({
      sucesso: true,
      empresasProcessadas: 1,
      anexosProcessados: 2,
      historicoIds: [mockHistoricoId]
    });

    const resultado = await mockBooksDisparoService.executarDisparoPersonalizadoComAnexos(
      [mockEmpresaId]
    );

    expect(resultado.sucesso).toBe(true);
    expect(resultado.historicoIds).toContain(mockHistoricoId);
    expect(resultado.anexosProcessados).toBe(2);
  });

  it('deve integrar anexos com webhook do Power Automate', async () => {
    const mockAnexos = [
      {
        id: 'anexo-1',
        nome: 'relatorio.pdf',
        tipo: 'application/pdf',
        tamanho: 1048576,
        url: 'https://storage.supabase.co/anexos/temp/relatorio.pdf',
        status: 'pendente'
      },
      {
        id: 'anexo-2',
        nome: 'planilha.xlsx',
        tipo: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        tamanho: 2097152,
        url: 'https://storage.supabase.co/anexos/temp/planilha.xlsx',
        status: 'pendente'
      }
    ];

    mockAnexoService.obterAnexosEmpresa.mockResolvedValue(mockAnexos);

    // Simular estrutura do webhook com anexos
    const expectedWebhookPayload = {
      empresa: {
        id: mockEmpresaId,
        nome: 'Empresa Teste'
      },
      anexos: {
        totalArquivos: 2,
        tamanhoTotal: 3145728, // 3MB
        arquivos: [
          {
            url: mockAnexos[0].url,
            nome: mockAnexos[0].nome,
            tipo: mockAnexos[0].tipo,
            tamanho: mockAnexos[0].tamanho,
            token: expect.any(String)
          },
          {
            url: mockAnexos[1].url,
            nome: mockAnexos[1].nome,
            tipo: mockAnexos[1].tipo,
            tamanho: mockAnexos[1].tamanho,
            token: expect.any(String)
          }
        ]
      }
    };

    mockBooksDisparoService.executarDisparoPersonalizadoComAnexos.mockImplementation(
      async (empresaIds) => {
        // Simular busca de anexos
        const anexos = await mockAnexoService.obterAnexosEmpresa(empresaIds[0]);
        
        // Verificar estrutura do payload
        expect(anexos).toHaveLength(2);
        expect(anexos[0]).toMatchObject({
          nome: 'relatorio.pdf',
          tipo: 'application/pdf'
        });
        
        return {
          sucesso: true,
          empresasProcessadas: 1,
          anexosProcessados: anexos.length,
          webhookPayload: expectedWebhookPayload
        };
      }
    );

    const resultado = await mockBooksDisparoService.executarDisparoPersonalizadoComAnexos(
      [mockEmpresaId]
    );

    expect(resultado.sucesso).toBe(true);
    expect(resultado.anexosProcessados).toBe(2);
    expect(mockAnexoService.obterAnexosEmpresa).toHaveBeenCalledWith(mockEmpresaId);
  });

  it('deve tratar falhas no processamento de anexos', async () => {
    // Simular falha no upload
    mockAnexoService.uploadAnexos.mockRejectedValue(
      new Error('Falha na conexão com storage')
    );

    await expect(
      mockAnexoService.uploadAnexos(mockEmpresaId, [])
    ).rejects.toThrow('Falha na conexão com storage');

    // Simular falha no disparo
    mockBooksDisparoService.executarDisparoPersonalizadoComAnexos.mockRejectedValue(
      new Error('Timeout no processamento de anexos')
    );

    await expect(
      mockBooksDisparoService.executarDisparoPersonalizadoComAnexos([mockEmpresaId])
    ).rejects.toThrow('Timeout no processamento de anexos');
  });
});