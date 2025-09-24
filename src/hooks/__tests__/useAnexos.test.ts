import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAnexos } from '../useAnexos';
import { anexoService } from '@/services/anexoService';
import { toast } from 'sonner';

// Mock do anexoService
vi.mock('@/services/anexoService', () => ({
  anexoService: {
    uploadAnexo: vi.fn(),
    removerAnexo: vi.fn(),
    removerAnexosEmpresa: vi.fn(),
  }
}));

// Mock do toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

describe('useAnexos', () => {
  const mockAnexoService = anexoService as any;
  const mockToast = toast as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve inicializar com estado padrão', () => {
    const { result } = renderHook(() => useAnexos());

    expect(result.current.isUploading).toBe(false);
    expect(result.current.uploadProgress).toEqual({});
    expect(result.current.anexosPorEmpresa).toEqual({});
    expect(result.current.error).toBe(null);
  });

  it('deve validar arquivo corretamente', () => {
    const { result } = renderHook(() => useAnexos());

    // Arquivo válido
    const arquivoValido = new File(['conteudo'], 'teste.pdf', { type: 'application/pdf' });
    Object.defineProperty(arquivoValido, 'size', { value: 1024 * 1024 }); // 1MB

    const validacaoValida = result.current.validarArquivo(arquivoValido);
    expect(validacaoValida.valido).toBe(true);
    expect(validacaoValida.erro).toBeUndefined();

    // Arquivo com tipo inválido
    const arquivoTipoInvalido = new File(['conteudo'], 'teste.txt', { type: 'text/plain' });
    const validacaoTipoInvalido = result.current.validarArquivo(arquivoTipoInvalido);
    expect(validacaoTipoInvalido.valido).toBe(false);
    expect(validacaoTipoInvalido.erro).toContain('Tipo de arquivo não permitido');

    // Arquivo muito grande
    const arquivoGrande = new File(['conteudo'], 'teste.pdf', { type: 'application/pdf' });
    Object.defineProperty(arquivoGrande, 'size', { value: 15 * 1024 * 1024 }); // 15MB

    const validacaoGrande = result.current.validarArquivo(arquivoGrande);
    expect(validacaoGrande.valido).toBe(false);
    expect(validacaoGrande.erro).toContain('Arquivo muito grande');
  });

  it('deve calcular tamanho atual corretamente', () => {
    const { result } = renderHook(() => useAnexos());

    // Simular anexos existentes
    act(() => {
      result.current.anexosPorEmpresa['empresa1'] = [
        {
          id: '1',
          nome: 'arquivo1.pdf',
          tipo: 'application/pdf',
          tamanho: 1024 * 1024, // 1MB
          url: 'url1',
          status: 'pendente'
        },
        {
          id: '2',
          nome: 'arquivo2.pdf',
          tipo: 'application/pdf',
          tamanho: 2 * 1024 * 1024, // 2MB
          url: 'url2',
          status: 'pendente'
        }
      ];
    });

    const tamanhoTotal = result.current.calcularTamanhoAtual('empresa1');
    expect(tamanhoTotal).toBe(3 * 1024 * 1024); // 3MB total
  });

  it('deve obter summary corretamente', () => {
    const { result } = renderHook(() => useAnexos());

    // Simular anexos existentes
    act(() => {
      result.current.anexosPorEmpresa['empresa1'] = [
        {
          id: '1',
          nome: 'arquivo1.pdf',
          tipo: 'application/pdf',
          tamanho: 1024 * 1024, // 1MB
          url: 'url1',
          status: 'pendente'
        }
      ];
    });

    const summary = result.current.obterSummary('empresa1');
    expect(summary.totalArquivos).toBe(1);
    expect(summary.tamanhoTotal).toBe(1024 * 1024);
    expect(summary.tamanhoLimite).toBe(25 * 1024 * 1024);
    expect(summary.podeAdicionar).toBe(true);
  });

  it('deve fazer upload de anexo com sucesso', async () => {
    const { result } = renderHook(() => useAnexos());

    const mockAnexo = {
      id: '1',
      nome: 'teste.pdf',
      tipo: 'application/pdf',
      tamanho: 1024 * 1024,
      url: 'url-teste',
      status: 'pendente' as const
    };

    mockAnexoService.uploadAnexo.mockResolvedValue(mockAnexo);

    const arquivo = new File(['conteudo'], 'teste.pdf', { type: 'application/pdf' });
    Object.defineProperty(arquivo, 'size', { value: 1024 * 1024 });

    await act(async () => {
      const resultado = await result.current.uploadAnexo('empresa1', arquivo);
      expect(resultado).toEqual(mockAnexo);
    });

    expect(mockAnexoService.uploadAnexo).toHaveBeenCalledWith('empresa1', arquivo);
    expect(mockToast.success).toHaveBeenCalledWith('1 arquivo(s) enviado(s) com sucesso');
  });

  it('deve validar limite total antes do upload', async () => {
    const { result } = renderHook(() => useAnexos());

    // Simular empresa já com 20MB de anexos
    act(() => {
      result.current.anexosPorEmpresa['empresa1'] = [
        {
          id: '1',
          nome: 'arquivo-grande.pdf',
          tipo: 'application/pdf',
          tamanho: 20 * 1024 * 1024, // 20MB
          url: 'url1',
          status: 'pendente'
        }
      ];
    });

    // Tentar adicionar arquivo de 10MB (excederia limite de 25MB)
    const arquivo = new File(['conteudo'], 'teste.pdf', { type: 'application/pdf' });
    Object.defineProperty(arquivo, 'size', { value: 10 * 1024 * 1024 });

    const podeAdicionar = await result.current.validarLimiteTotal('empresa1', [arquivo]);
    expect(podeAdicionar).toBe(false);
    expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('Limite de 25MB excedido'));
  });

  it('deve remover anexo com sucesso', async () => {
    const { result } = renderHook(() => useAnexos());

    // Simular anexo existente
    act(() => {
      result.current.anexosPorEmpresa['empresa1'] = [
        {
          id: '1',
          nome: 'arquivo1.pdf',
          tipo: 'application/pdf',
          tamanho: 1024 * 1024,
          url: 'url1',
          status: 'pendente'
        }
      ];
    });

    mockAnexoService.removerAnexo.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.removerAnexo('1');
    });

    expect(mockAnexoService.removerAnexo).toHaveBeenCalledWith('1');
    expect(mockToast.success).toHaveBeenCalledWith('Anexo removido com sucesso');
    
    // Verificar se foi removido do cache local
    const anexosRestantes = result.current.obterAnexosPorEmpresa('empresa1');
    expect(anexosRestantes).toHaveLength(0);
  });

  it('deve remover todos os anexos de uma empresa', async () => {
    const { result } = renderHook(() => useAnexos());

    // Simular múltiplos anexos
    act(() => {
      result.current.anexosPorEmpresa['empresa1'] = [
        {
          id: '1',
          nome: 'arquivo1.pdf',
          tipo: 'application/pdf',
          tamanho: 1024 * 1024,
          url: 'url1',
          status: 'pendente'
        },
        {
          id: '2',
          nome: 'arquivo2.pdf',
          tipo: 'application/pdf',
          tamanho: 1024 * 1024,
          url: 'url2',
          status: 'pendente'
        }
      ];
    });

    mockAnexoService.removerAnexosEmpresa.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.removerTodosAnexos('empresa1');
    });

    expect(mockAnexoService.removerAnexosEmpresa).toHaveBeenCalledWith('empresa1');
    expect(mockToast.success).toHaveBeenCalledWith('Todos os anexos removidos com sucesso');
    
    // Verificar se todos foram removidos do cache local
    const anexosRestantes = result.current.obterAnexosPorEmpresa('empresa1');
    expect(anexosRestantes).toHaveLength(0);
  });

  it('deve tratar erros durante upload', async () => {
    const { result } = renderHook(() => useAnexos());

    const erro = new Error('Erro de upload');
    mockAnexoService.uploadAnexo.mockRejectedValue(erro);

    const arquivo = new File(['conteudo'], 'teste.pdf', { type: 'application/pdf' });
    Object.defineProperty(arquivo, 'size', { value: 1024 * 1024 });

    await act(async () => {
      try {
        await result.current.uploadAnexo('empresa1', arquivo);
      } catch (e) {
        expect(e).toBe(erro);
      }
    });

    expect(result.current.error).toBe(erro);
    expect(mockToast.error).toHaveBeenCalledWith('Erro no upload: Erro de upload');
  });

  it('deve controlar progresso de upload', async () => {
    const { result } = renderHook(() => useAnexos());

    const mockAnexo = {
      id: '1',
      nome: 'teste.pdf',
      tipo: 'application/pdf',
      tamanho: 1024 * 1024,
      url: 'url-teste',
      status: 'pendente' as const
    };

    mockAnexoService.uploadAnexo.mockResolvedValue(mockAnexo);

    const arquivo = new File(['conteudo'], 'teste.pdf', { type: 'application/pdf' });
    Object.defineProperty(arquivo, 'size', { value: 1024 * 1024 });

    await act(async () => {
      await result.current.uploadAnexo('empresa1', arquivo);
    });

    // Verificar que o upload terminou corretamente
    expect(result.current.isUploading).toBe(false);
    
    // Verificar que o anexo foi adicionado ao cache
    const anexos = result.current.obterAnexosPorEmpresa('empresa1');
    expect(anexos).toHaveLength(1);
    expect(anexos[0]).toEqual(mockAnexo);
  });
});