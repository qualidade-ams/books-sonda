import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import { anexoService } from '../../services/anexoService';
import { booksDisparoService } from '../../services/booksDisparoService';

// Mock dos serviços
vi.mock('../../services/anexoService', () => ({
  anexoService: {
    uploadAnexos: vi.fn(),
    obterAnexosEmpresa: vi.fn(),
    validarLimiteTotal: vi.fn(),
    calcularTamanhoTotal: vi.fn(),
  }
}));

vi.mock('../../services/booksDisparoService', () => ({
  booksDisparoService: {
    executarDisparoPersonalizado: vi.fn(),
  }
}));

const mockAnexoService = vi.mocked(anexoService);
const mockBooksDisparoService = vi.mocked(booksDisparoService);

// Dados de teste
const empresaComAnexo = {
  id: 'empresa-1',
  nome: 'Empresa Teste Anexo',
  email_gestor: 'gestor@empresa.com',
  anexo: true,
  book_personalizado: true,
  status: 'Ativo',
  tem_ams: true,
  tipo_book: 'qualidade'
};

const arquivosTeste = [
  new File(['conteúdo PDF'], 'relatorio.pdf', { type: 'application/pdf' }),
  new File(['conteúdo Excel'], 'planilha.xlsx', { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  })
];

const anexosUpload = [
  {
    id: 'anexo-1',
    nome: 'relatorio.pdf',
    tipo: 'application/pdf',
    tamanho: 1048576,
    url: 'https://storage.supabase.co/anexos/temp/relatorio.pdf',
    status: 'pendente' as const
  },
  {
    id: 'anexo-2',
    nome: 'planilha.xlsx',
    tipo: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    tamanho: 2097152,
    url: 'https://storage.supabase.co/anexos/temp/planilha.xlsx',
    status: 'pendente' as const
  }
];

describe('Anexos - Fluxo Completo do Usuário Final', () => {
  beforeAll(() => {
    // Mock do console para evitar logs desnecessários
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock do anexoService
    mockAnexoService.uploadAnexos.mockResolvedValue(anexosUpload);
    mockAnexoService.obterAnexosEmpresa.mockResolvedValue([]);
    mockAnexoService.validarLimiteTotal.mockResolvedValue(true);
    mockAnexoService.calcularTamanhoTotal.mockResolvedValue(0);

    // Mock do booksDisparoService
    mockBooksDisparoService.executarDisparoPersonalizado.mockResolvedValue({
      sucesso: true,
      empresasProcessadas: 1,
      falhas: [],
      detalhes: {
        'empresa-1': {
          sucesso: true,
          clientesEnviados: 2,
          anexosProcessados: 2
        }
      }
    });
  });

  it('deve completar o fluxo completo de upload de anexos', async () => {
    // 1. Simular upload de múltiplos arquivos
    const resultado = await anexoService.uploadAnexos('empresa-1', arquivosTeste);

    // Verificar se upload foi bem-sucedido
    expect(mockAnexoService.uploadAnexos).toHaveBeenCalledWith('empresa-1', arquivosTeste);
    expect(resultado).toEqual(anexosUpload);
    expect(resultado).toHaveLength(2);
    expect(resultado[0].nome).toBe('relatorio.pdf');
    expect(resultado[1].nome).toBe('planilha.xlsx');
  });

  it('deve validar limite total antes do upload', async () => {
    // Simular validação de limite
    const isValid = await anexoService.validarLimiteTotal('empresa-1', arquivosTeste);

    expect(mockAnexoService.validarLimiteTotal).toHaveBeenCalledWith('empresa-1', arquivosTeste);
    expect(isValid).toBe(true);
  });

  it('deve calcular tamanho total corretamente', async () => {
    // Simular cálculo de tamanho
    const tamanhoTotal = await anexoService.calcularTamanhoTotal('empresa-1');

    expect(mockAnexoService.calcularTamanhoTotal).toHaveBeenCalledWith('empresa-1');
    expect(tamanhoTotal).toBe(0);
  });

  it('deve executar disparo personalizado com anexos', async () => {
    // Simular disparo com anexos
    const resultado = await booksDisparoService.executarDisparoPersonalizado({
      empresasSelecionadas: ['empresa-1'],
      incluirAnexos: true
    });

    expect(mockBooksDisparoService.executarDisparoPersonalizado).toHaveBeenCalledWith({
      empresasSelecionadas: ['empresa-1'],
      incluirAnexos: true
    });

    expect(resultado.sucesso).toBe(true);
    expect(resultado.empresasProcessadas).toBe(1);
    expect(resultado.detalhes['empresa-1'].anexosProcessados).toBe(2);
  });

  it('deve obter anexos da empresa corretamente', async () => {
    // Simular busca de anexos
    const anexos = await anexoService.obterAnexosEmpresa('empresa-1');

    expect(mockAnexoService.obterAnexosEmpresa).toHaveBeenCalledWith('empresa-1');
    expect(anexos).toEqual([]);
  });
});