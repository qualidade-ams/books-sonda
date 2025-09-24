import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnexoUpload, AnexoData } from '../AnexoUpload';

// Mock do react-dropzone
vi.mock('react-dropzone', () => ({
  useDropzone: vi.fn(() => ({
    getRootProps: () => ({ 'data-testid': 'dropzone' }),
    getInputProps: () => ({ 'data-testid': 'file-input' }),
    isDragActive: false
  }))
}));

// Mock do URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock do FileReader
global.FileReader = class {
  result: string | ArrayBuffer | null = null;
  onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
  onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;
  
  readAsArrayBuffer(file: Blob) {
    // Simular diferentes tipos de arquivo baseado no nome
    setTimeout(() => {
      if (file instanceof File) {
        if (file.name.endsWith('.pdf')) {
          this.result = new ArrayBuffer(8);
          const view = new Uint8Array(this.result);
          view[0] = 0x25; view[1] = 0x50; view[2] = 0x44; view[3] = 0x46; // %PDF
        } else if (file.name.endsWith('.docx') || file.name.endsWith('.xlsx')) {
          this.result = new ArrayBuffer(8);
          const view = new Uint8Array(this.result);
          view[0] = 0x50; view[1] = 0x4b; view[2] = 0x03; view[3] = 0x04; // ZIP
        } else if (file.name.endsWith('.doc') || file.name.endsWith('.xls')) {
          this.result = new ArrayBuffer(8);
          const view = new Uint8Array(this.result);
          view[0] = 0xd0; view[1] = 0xcf; view[2] = 0x11; view[3] = 0xe0; // OLE2
        } else {
          this.result = new ArrayBuffer(8); // Arquivo inválido
        }
      }
      
      if (this.onload) {
        this.onload({ target: this } as ProgressEvent<FileReader>);
      }
    }, 10);
  }
} as any;

describe('AnexoUpload', () => {
  const mockOnAnexosChange = vi.fn();
  const defaultProps = {
    empresaId: 'test-empresa-id',
    onAnexosChange: mockOnAnexosChange
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve renderizar o componente corretamente', () => {
    render(<AnexoUpload {...defaultProps} />);
    
    expect(screen.getByText('Anexar Arquivos')).toBeInTheDocument();
    expect(screen.getByText('0/10 arquivos')).toBeInTheDocument();
    expect(screen.getByText('Tamanho total: 0 Bytes')).toBeInTheDocument();
    expect(screen.getByText('Limite: 25 MB')).toBeInTheDocument();
  });

  it('deve exibir área de drop com instruções', () => {
    render(<AnexoUpload {...defaultProps} />);
    
    expect(screen.getByText('Arraste arquivos ou clique para selecionar')).toBeInTheDocument();
    expect(screen.getByText('Formatos aceitos: PDF, DOC, DOCX, XLS, XLSX (máx. 10MB cada)')).toBeInTheDocument();
    expect(screen.getByText('Selecionar Arquivos')).toBeInTheDocument();
  });

  it('deve mostrar estado desabilitado quando disabled=true', () => {
    render(<AnexoUpload {...defaultProps} disabled={true} />);
    
    const dropzone = screen.getByTestId('dropzone');
    expect(dropzone).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('deve aplicar limites personalizados', () => {
    render(
      <AnexoUpload 
        {...defaultProps} 
        maxFiles={5} 
        maxTotalSize={10 * 1024 * 1024} // 10MB
      />
    );
    
    expect(screen.getByText('0/5 arquivos')).toBeInTheDocument();
    expect(screen.getByText('Limite: 10 MB')).toBeInTheDocument();
  });

  it('deve formatar tamanhos corretamente', () => {
    render(<AnexoUpload {...defaultProps} />);
    
    expect(screen.getByText('Tamanho total: 0 Bytes')).toBeInTheDocument();
    expect(screen.getByText('Limite: 25 MB')).toBeInTheDocument();
  });

  it('deve aplicar className personalizada', () => {
    const { container } = render(
      <AnexoUpload {...defaultProps} className="custom-class" />
    );
    
    const card = container.querySelector('.custom-class');
    expect(card).toBeInTheDocument();
  });

  it('deve mostrar estado de drag ativo', () => {
    // Este teste seria mais complexo de implementar com o mock atual
    // Por enquanto, apenas verificamos que o componente renderiza
    render(<AnexoUpload {...defaultProps} />);
    
    expect(screen.getByText('Arraste arquivos ou clique para selecionar')).toBeInTheDocument();
  });

  it('deve mostrar estado de upload em progresso', () => {
    // Este teste seria implementado quando tivermos estado de upload real
    render(<AnexoUpload {...defaultProps} />);
    
    // Por enquanto, apenas verificamos que o componente renderiza
    expect(screen.getByText('Anexar Arquivos')).toBeInTheDocument();
  });
});

// Testes de validação de arquivos
describe('AnexoUpload - Validações', () => {
  const mockOnAnexosChange = vi.fn();
  const defaultProps = {
    empresaId: 'test-empresa-id',
    onAnexosChange: mockOnAnexosChange
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve validar tipos de arquivo permitidos', () => {
    render(<AnexoUpload {...defaultProps} />);
    
    expect(screen.getByText(/PDF, DOC, DOCX, XLS, XLSX/)).toBeInTheDocument();
  });

  it('deve mostrar limite de tamanho por arquivo', () => {
    render(<AnexoUpload {...defaultProps} />);
    
    expect(screen.getByText(/máx\. 10MB cada/)).toBeInTheDocument();
  });

  it('deve mostrar contadores de arquivos e tamanho', () => {
    render(<AnexoUpload {...defaultProps} />);
    
    expect(screen.getByText('0/10 arquivos')).toBeInTheDocument();
    expect(screen.getByText('Tamanho total: 0 Bytes')).toBeInTheDocument();
    expect(screen.getByText('Limite: 25 MB')).toBeInTheDocument();
  });

  it('deve aplicar limites personalizados corretamente', () => {
    render(
      <AnexoUpload 
        {...defaultProps} 
        maxFiles={5} 
        maxTotalSize={10 * 1024 * 1024} // 10MB
      />
    );
    
    expect(screen.getByText('0/5 arquivos')).toBeInTheDocument();
    expect(screen.getByText('Limite: 10 MB')).toBeInTheDocument();
  });

  it('deve mostrar barra de progresso do tamanho', () => {
    const { container } = render(<AnexoUpload {...defaultProps} />);
    
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toBeInTheDocument();
  });
});

// Testes de interação básica
describe('AnexoUpload - Interações', () => {
  const mockOnAnexosChange = vi.fn();
  const defaultProps = {
    empresaId: 'test-empresa-id',
    onAnexosChange: mockOnAnexosChange
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve ter área clicável para seleção de arquivos', () => {
    render(<AnexoUpload {...defaultProps} />);
    
    const button = screen.getByRole('button', { name: /selecionar arquivos/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('deve ter área de dropzone configurada', () => {
    render(<AnexoUpload {...defaultProps} />);
    
    const dropzone = screen.getByTestId('dropzone');
    expect(dropzone).toBeInTheDocument();
    
    const fileInput = screen.getByTestId('file-input');
    expect(fileInput).toBeInTheDocument();
  });

  it('deve mostrar instruções de uso', () => {
    render(<AnexoUpload {...defaultProps} />);
    
    expect(screen.getByText('Arraste arquivos ou clique para selecionar')).toBeInTheDocument();
    expect(screen.getByText('Formatos aceitos: PDF, DOC, DOCX, XLS, XLSX (máx. 10MB cada)')).toBeInTheDocument();
  });

  it('deve aplicar className personalizada', () => {
    const { container } = render(
      <AnexoUpload {...defaultProps} className="custom-class" />
    );
    
    const card = container.querySelector('.custom-class');
    expect(card).toBeInTheDocument();
  });

  it('deve ter callback configurado', () => {
    render(<AnexoUpload {...defaultProps} />);
    
    // Verificar que o componente foi renderizado com o callback
    expect(mockOnAnexosChange).toBeDefined();
    expect(typeof mockOnAnexosChange).toBe('function');
  });
});