/**
 * Testes para o sistema de compressão automática de anexos
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  comprimirArquivo, 
  comprimirArquivos, 
  deveComprimir,
  formatarEstatisticasCompressao
} from '../anexoCompression';

// Mock do toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}));

// Mock do FileReader
global.FileReader = class {
  result: any = null;
  onload: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  
  readAsArrayBuffer(file: Blob) {
    // Simular leitura de arquivo PDF
    const mockArrayBuffer = new ArrayBuffer(8);
    const view = new Uint8Array(mockArrayBuffer);
    view[0] = 0x25; // %
    view[1] = 0x50; // P
    view[2] = 0x44; // D
    view[3] = 0x46; // F
    
    this.result = mockArrayBuffer;
    setTimeout(() => {
      if (this.onload) {
        this.onload({ target: { result: mockArrayBuffer } });
      }
    }, 10);
  }
};

// Mock do canvas
global.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  drawImage: vi.fn(),
}));

global.HTMLCanvasElement.prototype.toBlob = vi.fn((callback, type, quality) => {
  const mockBlob = new Blob(['mock compressed data'], { type });
  setTimeout(() => callback(mockBlob), 10);
});

// Mock do Image
global.Image = class {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 1920;
  height = 1080;
  
  set src(value: string) {
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 10);
  }
} as any;

// Mock do URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');

describe('Sistema de Compressão de Anexos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('deveComprimir', () => {
    it('deve retornar true para arquivos PDF grandes', () => {
      const arquivo = new File(['content'], 'test.pdf', { 
        type: 'application/pdf' 
      });
      
      // Mock do tamanho do arquivo
      Object.defineProperty(arquivo, 'size', { value: 6 * 1024 * 1024 }); // 6MB
      
      expect(deveComprimir(arquivo)).toBe(true);
    });

    it('deve retornar false para arquivos pequenos', () => {
      const arquivo = new File(['content'], 'test.pdf', { 
        type: 'application/pdf' 
      });
      
      Object.defineProperty(arquivo, 'size', { value: 1 * 1024 * 1024 }); // 1MB
      
      expect(deveComprimir(arquivo)).toBe(false);
    });

    it('deve retornar false para tipos não suportados', () => {
      const arquivo = new File(['content'], 'test.txt', { 
        type: 'text/plain' 
      });
      
      Object.defineProperty(arquivo, 'size', { value: 6 * 1024 * 1024 }); // 6MB
      
      expect(deveComprimir(arquivo)).toBe(false);
    });

    it('deve forçar compressão quando solicitado', () => {
      const arquivo = new File(['content'], 'test.pdf', { 
        type: 'application/pdf' 
      });
      
      Object.defineProperty(arquivo, 'size', { value: 1 * 1024 * 1024 }); // 1MB
      
      expect(deveComprimir(arquivo, { forcarCompressao: true })).toBe(true);
    });
  });

  describe('comprimirArquivo', () => {
    it('deve comprimir arquivo PDF grande', async () => {
      const arquivo = new File(['content'.repeat(1000)], 'test.pdf', { 
        type: 'application/pdf' 
      });
      
      Object.defineProperty(arquivo, 'size', { value: 6 * 1024 * 1024 }); // 6MB
      
      const resultado = await comprimirArquivo(arquivo);
      
      expect(resultado.foiComprimido).toBe(true);
      expect(resultado.tamanhoOriginal).toBe(6 * 1024 * 1024);
      expect(resultado.tamanhoComprimido).toBeLessThan(resultado.tamanhoOriginal);
      expect(resultado.percentualReducao).toBeGreaterThan(0);
    });

    it('deve retornar arquivo original se não precisar comprimir', async () => {
      const arquivo = new File(['content'], 'test.pdf', { 
        type: 'application/pdf' 
      });
      
      Object.defineProperty(arquivo, 'size', { value: 1 * 1024 * 1024 }); // 1MB
      
      const resultado = await comprimirArquivo(arquivo);
      
      expect(resultado.foiComprimido).toBe(false);
      expect(resultado.tamanhoOriginal).toBe(resultado.tamanhoComprimido);
      expect(resultado.percentualReducao).toBe(0);
    });

    it('deve lidar com erros de compressão graciosamente', async () => {
      // Mock erro no FileReader
      global.FileReader = class {
        onerror: ((event: any) => void) | null = null;
        
        readAsArrayBuffer() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Error('Erro de leitura'));
            }
          }, 10);
        }
      } as any;

      const arquivo = new File(['content'], 'test.pdf', { 
        type: 'application/pdf' 
      });
      
      Object.defineProperty(arquivo, 'size', { value: 6 * 1024 * 1024 }); // 6MB
      
      const resultado = await comprimirArquivo(arquivo);
      
      // Deve retornar arquivo original em caso de erro
      expect(resultado.foiComprimido).toBe(false);
      expect(resultado.arquivo).toBe(arquivo);
    });
  });

  describe('comprimirArquivos', () => {
    it('deve comprimir múltiplos arquivos em paralelo', async () => {
      const arquivos = [
        new File(['content1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['content2'], 'test2.pdf', { type: 'application/pdf' }),
        new File(['content3'], 'test3.pdf', { type: 'application/pdf' })
      ];
      
      // Mock tamanhos grandes
      arquivos.forEach(arquivo => {
        Object.defineProperty(arquivo, 'size', { value: 6 * 1024 * 1024 }); // 6MB
      });
      
      const resultados = await comprimirArquivos(arquivos);
      
      expect(resultados).toHaveLength(3);
      expect(resultados.every(r => r.foiComprimido)).toBe(true);
    });

    it('deve processar arquivos em lotes para controlar concorrência', async () => {
      const arquivos = Array.from({ length: 10 }, (_, i) => 
        new File([`content${i}`], `test${i}.pdf`, { type: 'application/pdf' })
      );
      
      // Mock tamanhos grandes
      arquivos.forEach(arquivo => {
        Object.defineProperty(arquivo, 'size', { value: 6 * 1024 * 1024 }); // 6MB
      });
      
      const resultados = await comprimirArquivos(arquivos);
      
      expect(resultados).toHaveLength(10);
    });

    it('deve retornar arquivos originais em caso de erro geral', async () => {
      // Mock erro global
      const originalComprimirArquivo = comprimirArquivo;
      vi.mocked(comprimirArquivo).mockRejectedValue(new Error('Erro geral'));
      
      const arquivos = [
        new File(['content'], 'test.pdf', { type: 'application/pdf' })
      ];
      
      const resultados = await comprimirArquivos(arquivos);
      
      expect(resultados).toHaveLength(1);
      expect(resultados[0].foiComprimido).toBe(false);
      expect(resultados[0].arquivo).toBe(arquivos[0]);
    });
  });

  describe('formatarEstatisticasCompressao', () => {
    it('deve formatar estatísticas corretamente', () => {
      const resultados = [
        {
          arquivo: new File([''], 'test1.pdf'),
          tamanhoOriginal: 1000000,
          tamanhoComprimido: 800000,
          percentualReducao: 20,
          foiComprimido: true,
          tempoCompressao: 500
        },
        {
          arquivo: new File([''], 'test2.pdf'),
          tamanhoOriginal: 2000000,
          tamanhoComprimido: 1600000,
          percentualReducao: 20,
          foiComprimido: true,
          tempoCompressao: 700
        }
      ];
      
      const estatisticas = formatarEstatisticasCompressao(resultados);
      
      expect(estatisticas).toContain('2/2 arquivos comprimidos');
      expect(estatisticas).toContain('20.0% menor');
      expect(estatisticas).toContain('1200ms');
    });

    it('deve lidar com nenhum arquivo comprimido', () => {
      const resultados = [
        {
          arquivo: new File([''], 'test.pdf'),
          tamanhoOriginal: 1000000,
          tamanhoComprimido: 1000000,
          percentualReducao: 0,
          foiComprimido: false,
          tempoCompressao: 100
        }
      ];
      
      const estatisticas = formatarEstatisticasCompressao(resultados);
      
      expect(estatisticas).toBe('Nenhum arquivo foi comprimido');
    });
  });
});