import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { excelImportService } from '@/services/excelImportService';
import { empresasClientesService } from '@/services/empresasClientesService';
import { colaboradoresService } from '@/services/colaboradoresService';
import { supabase } from '@/integrations/supabase/client';

// Mock do XLSX para simular leitura de arquivos Excel
vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn()
  }
}));

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn()
        })),
        order: vi.fn(),
        ilike: vi.fn(() => ({
          order: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn()
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      })),
      upsert: vi.fn()
    }))
  }
}));

// Mock dos serviços
vi.mock('@/services/empresasClientesService', () => ({
  empresasClientesService: {
    criarEmpresa: vi.fn(),
    obterEmpresaPorId: vi.fn(),
    listarEmpresas: vi.fn()
  }
}));

vi.mock('@/services/colaboradoresService', () => ({
  colaboradoresService: {
    criarColaborador: vi.fn(),
    listarPorEmpresa: vi.fn()
  }
}));

describe('Testes de Integração - Importação Excel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Importação de empresas via Excel', () => {
    it('deve importar empresas válidas com sucesso', async () => {
      // Dados simulados do Excel
      const dadosExcel = [
        {
          'Nome Completo': 'Empresa Alpha Ltda',
          'Nome Abreviado': 'Alpha',
          'Link SharePoint': 'https://sharepoint.com/alpha',
          'Template Padrão': 'portugues',
          'Status': 'ativo',
          'E-mail Gestor': 'gestor@alpha.com',
          'Produtos': 'CE_PLUS,FISCAL',
          'Grupos': 'CE Plus,Fiscal'
        },
        {
          'Nome Completo': 'Empresa Beta S.A.',
          'Nome Abreviado': 'Beta',
          'Link SharePoint': 'https://sharepoint.com/beta',
          'Template Padrão': 'ingles',
          'Status': 'ativo',
          'E-mail Gestor': 'manager@beta.com',
          'Produtos': 'GALLERY',
          'Grupos': 'Gallery'
        }
      ];

      // Mock do XLSX
      const XLSX = await import('xlsx');
      (XLSX.read as any).mockReturnValue({
        SheetNames: ['Empresas'],
        Sheets: {
          'Empresas': {}
        }
      });
      (XLSX.utils.sheet_to_json as any).mockReturnValue(dadosExcel);

      // Mock para verificar empresas existentes (não existem)
      const mockEmpresasQuery = {
        ilike: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      };

      // Mock para buscar grupos existentes
      const mockGruposQuery = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn()
            .mockResolvedValueOnce({ data: { id: 'grupo-1', nome: 'CE Plus' }, error: null })
            .mockResolvedValueOnce({ data: { id: 'grupo-2', nome: 'Fiscal' }, error: null })
            .mockResolvedValueOnce({ data: { id: 'grupo-3', nome: 'Gallery' }, error: null })
        })
      };

      // Mock para criação das empresas
      (empresasClientesService.criarEmpresa as any)
        .mockResolvedValueOnce({ id: 'empresa-1', nome_completo: 'Empresa Alpha Ltda' })
        .mockResolvedValueOnce({ id: 'empresa-2', nome_completo: 'Empresa Beta S.A.' });

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmpresasQuery) })
        .mockReturnValue({ select: vi.fn().mockReturnValue(mockGruposQuery) });

      // Criar arquivo mock
      const arquivo = new File(['dados excel'], 'empresas.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      // Executar importação
      const resultado = await excelImportService.importarEmpresas(arquivo);

      // Verificações
      expect(resultado.success).toBe(2);
      expect(resultado.errors).toHaveLength(0);
      expect(resultado.total).toBe(2);

      // Verificar que empresas foram criadas
      expect(empresasClientesService.criarEmpresa).toHaveBeenCalledTimes(2);

      // Verificar dados da primeira empresa
      expect(empresasClientesService.criarEmpresa).toHaveBeenCalledWith({
        nomeCompleto: 'Empresa Alpha Ltda',
        nomeAbreviado: 'Alpha',
        linkSharepoint: 'https://sharepoint.com/alpha',
        templatePadrao: 'portugues',
        status: 'ativo',
        emailGestor: 'gestor@alpha.com',
        produtos: ['CE_PLUS', 'FISCAL'],
        grupos: ['grupo-1', 'grupo-2']
      });

      // Verificar dados da segunda empresa
      expect(empresasClientesService.criarEmpresa).toHaveBeenCalledWith({
        nomeCompleto: 'Empresa Beta S.A.',
        nomeAbreviado: 'Beta',
        linkSharepoint: 'https://sharepoint.com/beta',
        templatePadrao: 'ingles',
        status: 'ativo',
        emailGestor: 'manager@beta.com',
        produtos: ['GALLERY'],
        grupos: ['grupo-3']
      });
    });

    it('deve tratar erros de validação corretamente', async () => {
      // Dados com erros
      const dadosExcel = [
        {
          'Nome Completo': '', // Nome vazio - erro
          'Nome Abreviado': 'Test',
          'Template Padrão': 'portugues',
          'Status': 'ativo'
        },
        {
          'Nome Completo': 'Empresa Válida',
          'Nome Abreviado': 'Válida',
          'Template Padrão': 'portugues',
          'Status': 'status_invalido', // Status inválido - erro
          'E-mail Gestor': 'email-invalido' // E-mail inválido - erro
        },
        {
          'Nome Completo': 'Empresa OK',
          'Nome Abreviado': 'OK',
          'Template Padrão': 'portugues',
          'Status': 'ativo'
        }
      ];

      // Mock do XLSX
      const XLSX = await import('xlsx');
      (XLSX.read as any).mockReturnValue({
        SheetNames: ['Empresas'],
        Sheets: { 'Empresas': {} }
      });
      (XLSX.utils.sheet_to_json as any).mockReturnValue(dadosExcel);

      // Mock para verificar empresas existentes
      const mockEmpresasQuery = {
        ilike: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      };

      // Mock para criação - primeira falha, segunda falha, terceira sucesso
      (empresasClientesService.criarEmpresa as any)
        .mockRejectedValueOnce(new Error('Nome completo é obrigatório'))
        .mockRejectedValueOnce(new Error('Status inválido'))
        .mockResolvedValueOnce({ id: 'empresa-3', nome_completo: 'Empresa OK' });

      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue(mockEmpresasQuery) 
      });

      const arquivo = new File(['dados excel'], 'empresas.xlsx');
      const resultado = await excelImportService.importarEmpresas(arquivo);

      expect(resultado.success).toBe(1);
      expect(resultado.errors).toHaveLength(2);
      expect(resultado.total).toBe(3);

      // Verificar erros específicos
      expect(resultado.errors[0]).toMatchObject({
        line: 1,
        message: expect.stringContaining('Nome completo é obrigatório')
      });

      expect(resultado.errors[1]).toMatchObject({
        line: 2,
        message: expect.stringContaining('Status inválido')
      });
    });

    it('deve detectar empresas duplicadas', async () => {
      const dadosExcel = [
        {
          'Nome Completo': 'Empresa Existente',
          'Nome Abreviado': 'Existente',
          'Template Padrão': 'portugues',
          'Status': 'ativo'
        }
      ];

      // Mock do XLSX
      const XLSX = await import('xlsx');
      (XLSX.read as any).mockReturnValue({
        SheetNames: ['Empresas'],
        Sheets: { 'Empresas': {} }
      });
      (XLSX.utils.sheet_to_json as any).mockReturnValue(dadosExcel);

      // Mock para empresa já existente
      const mockEmpresasQuery = {
        ilike: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ 
            data: [{ id: 'empresa-1', nome_completo: 'Empresa Existente' }], 
            error: null 
          })
        })
      };

      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue(mockEmpresasQuery) 
      });

      const arquivo = new File(['dados excel'], 'empresas.xlsx');
      const resultado = await excelImportService.importarEmpresas(arquivo);

      expect(resultado.success).toBe(0);
      expect(resultado.errors).toHaveLength(1);
      expect(resultado.errors[0].message).toContain('já existe');

      // Não deve tentar criar empresa
      expect(empresasClientesService.criarEmpresa).not.toHaveBeenCalled();
    });

    it('deve processar arquivo com múltiplas planilhas', async () => {
      const dadosEmpresas = [
        {
          'Nome Completo': 'Empresa da Planilha',
          'Nome Abreviado': 'Planilha',
          'Template Padrão': 'portugues',
          'Status': 'ativo'
        }
      ];

      const dadosColaboradores = [
        {
          'Nome Completo': 'João Silva',
          'E-mail': 'joao@empresa.com',
          'Função': 'Gerente',
          'Empresa': 'Empresa da Planilha',
          'Status': 'ativo',
          'Principal Contato': 'Sim'
        }
      ];

      // Mock do XLSX com múltiplas planilhas
      const XLSX = await import('xlsx');
      (XLSX.read as any).mockReturnValue({
        SheetNames: ['Empresas', 'Colaboradores'],
        Sheets: {
          'Empresas': {},
          'Colaboradores': {}
        }
      });

      (XLSX.utils.sheet_to_json as any)
        .mockReturnValueOnce(dadosEmpresas)
        .mockReturnValueOnce(dadosColaboradores);

      // Mocks para empresas
      const mockEmpresasQuery = {
        ilike: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      };

      (empresasClientesService.criarEmpresa as any)
        .mockResolvedValue({ id: 'empresa-1', nome_completo: 'Empresa da Planilha' });

      // Mocks para colaboradores
      (empresasClientesService.listarEmpresas as any)
        .mockResolvedValue([{ id: 'empresa-1', nome_completo: 'Empresa da Planilha' }]);

      (colaboradoresService.criarColaborador as any)
        .mockResolvedValue({ id: 'colab-1', nome_completo: 'João Silva' });

      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue(mockEmpresasQuery) 
      });

      const arquivo = new File(['dados excel'], 'dados_completos.xlsx');
      
      // Importar empresas
      const resultadoEmpresas = await excelImportService.importarEmpresas(arquivo);
      expect(resultadoEmpresas.success).toBe(1);

      // Importar colaboradores
      const resultadoColaboradores = await excelImportService.importarColaboradores(arquivo);
      expect(resultadoColaboradores.success).toBe(1);

      // Verificar que colaborador foi associado à empresa correta
      expect(colaboradoresService.criarColaborador).toHaveBeenCalledWith({
        nomeCompleto: 'João Silva',
        email: 'joao@empresa.com',
        funcao: 'Gerente',
        empresaId: 'empresa-1',
        status: 'ativo',
        principalContato: true
      });
    });
  });

  describe('Importação de colaboradores via Excel', () => {
    it('deve importar colaboradores válidos', async () => {
      const dadosExcel = [
        {
          'Nome Completo': 'João Silva',
          'E-mail': 'joao@empresa.com',
          'Função': 'Gerente',
          'Empresa': 'Empresa Alpha',
          'Status': 'ativo',
          'Principal Contato': 'Sim'
        },
        {
          'Nome Completo': 'Maria Santos',
          'E-mail': 'maria@empresa.com',
          'Função': 'Analista',
          'Empresa': 'Empresa Alpha',
          'Status': 'ativo',
          'Principal Contato': 'Não'
        }
      ];

      // Mock do XLSX
      const XLSX = await import('xlsx');
      (XLSX.read as any).mockReturnValue({
        SheetNames: ['Colaboradores'],
        Sheets: { 'Colaboradores': {} }
      });
      (XLSX.utils.sheet_to_json as any).mockReturnValue(dadosExcel);

      // Mock para buscar empresas
      (empresasClientesService.listarEmpresas as any)
        .mockResolvedValue([
          { id: 'empresa-1', nome_completo: 'Empresa Alpha' }
        ]);

      // Mock para criação dos colaboradores
      (colaboradoresService.criarColaborador as any)
        .mockResolvedValueOnce({ id: 'colab-1', nome_completo: 'João Silva' })
        .mockResolvedValueOnce({ id: 'colab-2', nome_completo: 'Maria Santos' });

      const arquivo = new File(['dados excel'], 'colaboradores.xlsx');
      const resultado = await excelImportService.importarColaboradores(arquivo);

      expect(resultado.success).toBe(2);
      expect(resultado.errors).toHaveLength(0);
      expect(resultado.total).toBe(2);

      // Verificar que colaboradores foram criados corretamente
      expect(colaboradoresService.criarColaborador).toHaveBeenCalledWith({
        nomeCompleto: 'João Silva',
        email: 'joao@empresa.com',
        funcao: 'Gerente',
        empresaId: 'empresa-1',
        status: 'ativo',
        principalContato: true
      });

      expect(colaboradoresService.criarColaborador).toHaveBeenCalledWith({
        nomeCompleto: 'Maria Santos',
        email: 'maria@empresa.com',
        funcao: 'Analista',
        empresaId: 'empresa-1',
        status: 'ativo',
        principalContato: false
      });
    });

    it('deve falhar quando empresa não for encontrada', async () => {
      const dadosExcel = [
        {
          'Nome Completo': 'João Silva',
          'E-mail': 'joao@empresa.com',
          'Empresa': 'Empresa Inexistente',
          'Status': 'ativo'
        }
      ];

      // Mock do XLSX
      const XLSX = await import('xlsx');
      (XLSX.read as any).mockReturnValue({
        SheetNames: ['Colaboradores'],
        Sheets: { 'Colaboradores': {} }
      });
      (XLSX.utils.sheet_to_json as any).mockReturnValue(dadosExcel);

      // Mock para empresas (vazio)
      (empresasClientesService.listarEmpresas as any)
        .mockResolvedValue([]);

      const arquivo = new File(['dados excel'], 'colaboradores.xlsx');
      const resultado = await excelImportService.importarColaboradores(arquivo);

      expect(resultado.success).toBe(0);
      expect(resultado.errors).toHaveLength(1);
      expect(resultado.errors[0].message).toContain('Empresa não encontrada');

      // Não deve tentar criar colaborador
      expect(colaboradoresService.criarColaborador).not.toHaveBeenCalled();
    });
  });

  describe('Validação de arquivos Excel', () => {
    it('deve validar formato do arquivo', async () => {
      // Arquivo com formato inválido
      const arquivo = new File(['dados'], 'arquivo.txt', {
        type: 'text/plain'
      });

      await expect(excelImportService.importarEmpresas(arquivo))
        .rejects
        .toThrow('Formato de arquivo inválido');
    });

    it('deve validar estrutura das colunas', async () => {
      const dadosExcel = [
        {
          'Coluna Errada': 'Valor',
          'Outra Coluna': 'Outro Valor'
        }
      ];

      // Mock do XLSX
      const XLSX = await import('xlsx');
      (XLSX.read as any).mockReturnValue({
        SheetNames: ['Empresas'],
        Sheets: { 'Empresas': {} }
      });
      (XLSX.utils.sheet_to_json as any).mockReturnValue(dadosExcel);

      const arquivo = new File(['dados excel'], 'empresas.xlsx');

      await expect(excelImportService.importarEmpresas(arquivo))
        .rejects
        .toThrow('Estrutura do arquivo inválida');
    });

    it('deve tratar arquivo vazio', async () => {
      // Mock do XLSX para arquivo vazio
      const XLSX = await import('xlsx');
      (XLSX.read as any).mockReturnValue({
        SheetNames: ['Empresas'],
        Sheets: { 'Empresas': {} }
      });
      (XLSX.utils.sheet_to_json as any).mockReturnValue([]);

      const arquivo = new File([''], 'empresas_vazio.xlsx');
      const resultado = await excelImportService.importarEmpresas(arquivo);

      expect(resultado.success).toBe(0);
      expect(resultado.errors).toHaveLength(0);
      expect(resultado.total).toBe(0);
    });
  });

  describe('Rollback em caso de falha', () => {
    it('deve fazer rollback quando importação falha parcialmente', async () => {
      const dadosExcel = [
        {
          'Nome Completo': 'Empresa 1',
          'Nome Abreviado': 'Emp1',
          'Template Padrão': 'portugues',
          'Status': 'ativo'
        },
        {
          'Nome Completo': 'Empresa 2',
          'Nome Abreviado': 'Emp2',
          'Template Padrão': 'portugues',
          'Status': 'ativo'
        }
      ];

      // Mock do XLSX
      const XLSX = await import('xlsx');
      (XLSX.read as any).mockReturnValue({
        SheetNames: ['Empresas'],
        Sheets: { 'Empresas': {} }
      });
      (XLSX.utils.sheet_to_json as any).mockReturnValue(dadosExcel);

      // Mock para verificar empresas existentes
      const mockEmpresasQuery = {
        ilike: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      };

      // Mock para criação - primeira sucesso, segunda falha crítica
      (empresasClientesService.criarEmpresa as any)
        .mockResolvedValueOnce({ id: 'empresa-1' })
        .mockRejectedValueOnce(new Error('Erro crítico de banco'));

      // Mock para rollback (deletar empresa criada)
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmpresasQuery) })
        .mockReturnValueOnce({ delete: mockDelete });

      const arquivo = new File(['dados excel'], 'empresas.xlsx');
      
      // Configurar para fazer rollback em caso de falha crítica
      const resultado = await excelImportService.importarEmpresasComRollback(arquivo);

      expect(resultado.success).toBe(0);
      expect(resultado.errors).toHaveLength(2);
      expect(resultado.rollbackExecuted).toBe(true);

      // Verificar que rollback foi executado
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});