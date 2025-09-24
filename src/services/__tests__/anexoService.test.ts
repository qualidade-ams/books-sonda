import { describe, it, expect, vi, beforeEach } from 'vitest';
import { anexoService } from '../anexoService';

// Mock básico do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        }))
      }))
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test' }, error: null })
      }))
    }
  }
}));

// Mock dos serviços
vi.mock('../anexoTokenService', () => ({
  anexoTokenService: {
    generateToken: vi.fn().mockReturnValue('test-token'),
    validateAnexoAccess: vi.fn().mockResolvedValue(true)
  }
}));

vi.mock('../anexoAuditService', () => ({
  anexoAuditService: {
    logValidacaoTipo: vi.fn(),
    logValidacaoTamanho: vi.fn(),
    logUploadIniciado: vi.fn(),
    logUploadConcluido: vi.fn(),
    logUploadFalhou: vi.fn()
  }
}));

describe('AnexoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve existir e ter métodos principais', () => {
    expect(anexoService).toBeDefined();
    expect(typeof anexoService.uploadAnexo).toBe('function');
    expect(typeof anexoService.validarLimiteTotal).toBe('function');
    expect(typeof anexoService.gerarTokenAcessoPublico).toBe('function');
    expect(typeof anexoService.validarTokenDownload).toBe('function');
  });

  it('deve rejeitar arquivo com tipo não permitido', async () => {
    const empresaId = 'empresa-1';
    const arquivoInvalido = new File(['conteudo'], 'arquivo.txt', { 
      type: 'text/plain' 
    });

    await expect(anexoService.uploadAnexo(empresaId, arquivoInvalido))
      .rejects
      .toThrow('Tipo de arquivo "text/plain" não permitido');
  });

  it('deve rejeitar arquivo muito grande', async () => {
    const empresaId = 'empresa-1';
    const arquivoGrande = new File(['conteudo'], 'documento.pdf', { 
      type: 'application/pdf' 
    });
    Object.defineProperty(arquivoGrande, 'size', { value: 15 * 1024 * 1024 }); // 15MB

    await expect(anexoService.uploadAnexo(empresaId, arquivoGrande))
      .rejects
      .toThrow('Arquivo "documento.pdf" excede o tamanho máximo de 10MB');
  });
});