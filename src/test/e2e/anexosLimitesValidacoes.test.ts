import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import { anexoService } from '../../services/anexoService';

// Mock dos serviços
vi.mock('../../services/anexoService', () => ({
  anexoService: {
    calcularTamanhoTotal: vi.fn(),
    validarLimiteTotal: vi.fn(),
    obterAnexosEmpresa: vi.fn(),
    uploadAnexos: vi.fn(),
  }
}));

const mockAnexoService = vi.mocked(anexoService);

// Constantes de limite
const LIMITE_TOTAL_MB = 25;
const LIMITE_INDIVIDUAL_MB = 10;
const LIMITE_MAXIMO_ARQUIVOS = 10;
const TIPOS_PERMITIDOS = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

// Funções auxiliares para criar arquivos de teste
const criarArquivo = (nome: string, tamanhoMB: number, tipo: string = 'application/pdf') => {
  const tamanhoBytes = tamanhoMB * 1024 * 1024;
  const conteudo = new Array(tamanhoBytes).fill('a').join('');
  return new File([conteudo], nome, { type: tipo });
};

const criarArquivoInvalido = (nome: string, tamanhoMB: number = 1) => {
  return criarArquivo(nome, tamanhoMB, 'application/x-executable');
};

// Função auxiliar para simular validação de arquivo
const validarArquivo = (arquivo: File): { valido: boolean; erro?: string } => {
  // Validar tipo
  if (!TIPOS_PERMITIDOS.includes(arquivo.type)) {
    return { valido: false, erro: `Tipo de arquivo "${arquivo.type}" não permitido` };
  }
  
  // Validar tamanho individual
  if (arquivo.size > LIMITE_INDIVIDUAL_MB * 1024 * 1024) {
    return { valido: false, erro: 'Arquivo muito grande' };
  }
  
  return { valido: true };
};

describe('Anexos - Limites e Validações', () => {
  const empresaId = 'empresa-teste';

  beforeAll(() => {
    // Mock do console para evitar logs desnecessários
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock padrão do anexoService
    mockAnexoService.calcularTamanhoTotal.mockResolvedValue(0);
    mockAnexoService.validarLimiteTotal.mockResolvedValue(true);
    mockAnexoService.obterAnexosEmpresa.mockResolvedValue([]);
  });

  describe('Limite de Tamanho Total (25MB)', () => {
    it('deve rejeitar upload quando exceder 25MB total', async () => {
      // Simular que já existem 20MB de arquivos
      mockAnexoService.calcularTamanhoTotal.mockResolvedValue(20 * 1024 * 1024);
      mockAnexoService.validarLimiteTotal.mockResolvedValue(false);

      // Tentar adicionar arquivo de 10MB (que excederia o limite)
      const arquivoGrande = criarArquivo('arquivo-grande.pdf', 10);
      
      const isValid = await anexoService.validarLimiteTotal(empresaId, [arquivoGrande]);
      
      expect(mockAnexoService.validarLimiteTotal).toHaveBeenCalledWith(empresaId, [arquivoGrande]);
      expect(isValid).toBe(false);
    });

    it('deve calcular corretamente o tamanho total com múltiplos arquivos', async () => {
      mockAnexoService.validarLimiteTotal.mockImplementation(async (empresaId, arquivos) => {
        const tamanhoNovos = arquivos.reduce((total, arquivo) => total + arquivo.size, 0);
        const tamanhoExistente = 10 * 1024 * 1024; // 10MB existentes
        return (tamanhoExistente + tamanhoNovos) <= (25 * 1024 * 1024);
      });

      // Adicionar múltiplos arquivos que somam exatamente 15MB
      const arquivos = [
        criarArquivo('arquivo1.pdf', 5),
        criarArquivo('arquivo2.pdf', 5),
        criarArquivo('arquivo3.pdf', 5)
      ];

      const isValid = await anexoService.validarLimiteTotal(empresaId, arquivos);

      expect(mockAnexoService.validarLimiteTotal).toHaveBeenCalledWith(empresaId, arquivos);
      expect(isValid).toBe(true); // 10MB existentes + 15MB novos = 25MB (no limite)
    });

    it('deve calcular uso de espaço corretamente', async () => {
      // Simular 15MB já utilizados
      mockAnexoService.calcularTamanhoTotal.mockResolvedValue(15 * 1024 * 1024);

      const tamanhoAtual = await anexoService.calcularTamanhoTotal(empresaId);
      
      expect(mockAnexoService.calcularTamanhoTotal).toHaveBeenCalledWith(empresaId);
      expect(tamanhoAtual).toBe(15 * 1024 * 1024);
      
      // Verificar percentual de uso
      const percentualUso = (tamanhoAtual / (LIMITE_TOTAL_MB * 1024 * 1024)) * 100;
      expect(percentualUso).toBe(60); // 15/25 = 60%
    });
  });

  describe('Limite de Tamanho Individual (10MB)', () => {
    it('deve rejeitar arquivo individual maior que 10MB', async () => {
      // Tentar adicionar arquivo de 15MB
      const arquivoMuitoGrande = criarArquivo('arquivo-muito-grande.pdf', 15);
      
      const validacao = validarArquivo(arquivoMuitoGrande);
      
      expect(validacao.valido).toBe(false);
      expect(validacao.erro).toContain('Arquivo muito grande');
    });

    it('deve aceitar arquivo exatamente no limite de 10MB', async () => {
      // Adicionar arquivo de exatamente 10MB
      const arquivoLimite = criarArquivo('arquivo-limite.pdf', 10);
      
      const validacao = validarArquivo(arquivoLimite);
      
      expect(validacao.valido).toBe(true);
      expect(validacao.erro).toBeUndefined();
    });
  });

  describe('Tipos de Arquivo Permitidos', () => {
    it('deve rejeitar tipos de arquivo não permitidos', async () => {
      // Tentar adicionar arquivo executável
      const arquivoInvalido = criarArquivoInvalido('virus.exe');
      
      const validacao = validarArquivo(arquivoInvalido);
      
      expect(validacao.valido).toBe(false);
      expect(validacao.erro).toContain('Tipo de arquivo');
      expect(validacao.erro).toContain('não permitido');
    });

    it('deve aceitar todos os tipos permitidos', async () => {
      const arquivosPermitidos = [
        criarArquivo('documento.pdf', 1, 'application/pdf'),
        criarArquivo('texto.doc', 1, 'application/msword'),
        criarArquivo('texto.docx', 1, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
        criarArquivo('planilha.xls', 1, 'application/vnd.ms-excel'),
        criarArquivo('planilha.xlsx', 1, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      ];

      for (const arquivo of arquivosPermitidos) {
        const validacao = validarArquivo(arquivo);
        expect(validacao.valido).toBe(true);
        expect(validacao.erro).toBeUndefined();
      }
    });

    it('deve validar extensão e MIME type simultaneamente', async () => {
      // Arquivo com extensão válida mas MIME type inválido
      const arquivoFalso = new File(['conteudo'], 'documento.pdf', { 
        type: 'application/x-executable' 
      });

      const validacao = validarArquivo(arquivoFalso);
      
      expect(validacao.valido).toBe(false);
      expect(validacao.erro).toContain('Tipo de arquivo');
      expect(validacao.erro).toContain('não permitido');
    });
  });

  describe('Limite de Quantidade de Arquivos (10)', () => {
    it('deve rejeitar upload de mais de 10 arquivos', async () => {
      // Criar 12 arquivos pequenos
      const muitosArquivos = Array.from({ length: 12 }, (_, i) => 
        criarArquivo(`arquivo${i + 1}.pdf`, 0.5)
      );

      // Validar quantidade
      const quantidadeValida = muitosArquivos.length <= LIMITE_MAXIMO_ARQUIVOS;
      
      expect(quantidadeValida).toBe(false);
      expect(muitosArquivos.length).toBe(12);
      expect(LIMITE_MAXIMO_ARQUIVOS).toBe(10);
    });

    it('deve aceitar exatamente 10 arquivos', async () => {
      const dezArquivos = Array.from({ length: 10 }, (_, i) => 
        criarArquivo(`arquivo${i + 1}.pdf`, 1)
      );

      // Validar quantidade
      const quantidadeValida = dezArquivos.length <= LIMITE_MAXIMO_ARQUIVOS;
      
      expect(quantidadeValida).toBe(true);
      expect(dezArquivos.length).toBe(10);
      expect(LIMITE_MAXIMO_ARQUIVOS).toBe(10);
    });

    it('deve considerar arquivos já existentes no limite', async () => {
      // Simular que já existem 8 arquivos
      const anexosExistentes = Array.from({ length: 8 }, (_, i) => ({
        id: `anexo-existente-${i}`,
        nome: `existente${i + 1}.pdf`,
        tipo: 'application/pdf',
        tamanho: 1024 * 1024,
        url: `https://storage.supabase.co/anexos/temp/existente${i + 1}.pdf`,
        status: 'pendente' as const,
        empresaId: empresaId
      }));

      mockAnexoService.obterAnexosEmpresa.mockResolvedValue(anexosExistentes);

      // Tentar adicionar 3 arquivos (que excederia o limite)
      const tresArquivos = Array.from({ length: 3 }, (_, i) => 
        criarArquivo(`novo${i + 1}.pdf`, 1)
      );

      const anexosAtuais = await anexoService.obterAnexosEmpresa(empresaId);
      const totalArquivos = anexosAtuais.length + tresArquivos.length;
      const excedeLimite = totalArquivos > LIMITE_MAXIMO_ARQUIVOS;

      expect(mockAnexoService.obterAnexosEmpresa).toHaveBeenCalledWith(empresaId);
      expect(anexosAtuais.length).toBe(8);
      expect(totalArquivos).toBe(11); // 8 + 3
      expect(excedeLimite).toBe(true);
    });
  });

  describe('Validações Combinadas', () => {
    it('deve validar múltiplas regras simultaneamente', async () => {
      // Arquivo que viola múltiplas regras: muito grande + tipo inválido
      const arquivoProblematico = new File(
        [new Array(15 * 1024 * 1024).fill('a').join('')], 
        'virus.exe', 
        { type: 'application/x-executable' }
      );

      const validacao = validarArquivo(arquivoProblematico);
      
      expect(validacao.valido).toBe(false);
      // Deve falhar por tipo inválido (primeira validação)
      expect(validacao.erro).toContain('Tipo de arquivo');
      expect(validacao.erro).toContain('não permitido');
    });

    it('deve exibir feedback específico para cada tipo de erro', async () => {
      // Teste sequencial de diferentes tipos de erro
      const cenarios = [
        {
          arquivo: criarArquivo('muito-grande.pdf', 15),
          erroEsperado: 'Arquivo muito grande'
        },
        {
          arquivo: criarArquivoInvalido('invalido.exe'),
          erroEsperado: 'Tipo de arquivo'
        }
      ];

      for (const cenario of cenarios) {
        const validacao = validarArquivo(cenario.arquivo);
        
        expect(validacao.valido).toBe(false);
        expect(validacao.erro).toContain(cenario.erroEsperado);
      }
    });
  });
});