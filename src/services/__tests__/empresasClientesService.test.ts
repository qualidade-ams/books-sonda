import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { empresasClientesService, EMPRESA_STATUS, PRODUTOS } from '../empresasClientesService';
import { ClientBooksError, ClientBooksErrorFactory } from '@/errors/clientBooksErrors';
import { supabase } from '@/integrations/supabase/client';
import type { EmpresaFormData } from '@/types/clientBooks';

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
        or: vi.fn(() => ({
          order: vi.fn()
        })),
        order: vi.fn()
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

describe('EmpresasClientesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('criarEmpresa', () => {
    const empresaValidaData: EmpresaFormData = {
      nomeCompleto: 'Empresa Teste Ltda',
      nomeAbreviado: 'Empresa Teste',
      linkSharepoint: 'https://sharepoint.com/empresa-teste',
      templatePadrao: 'portugues',
      status: 'ativo',
      emailGestor: 'gestor@empresa.com',
      produtos: ['COMEX', 'FISCAL'],
      grupos: ['grupo-1', 'grupo-2'],
      temAms: false,
      tipoBook: 'nao_tem_book'
    };

    it('deve criar uma empresa com dados válidos', async () => {
      const empresaCriada = {
        id: 'empresa-1',
        nome_completo: 'Empresa Teste Ltda',
        nome_abreviado: 'Empresa Teste',
        status: 'ativo'
      };

      // Mock para verificação de duplicatas
      const mockSelectDuplicatas = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      });

      // Mock para inserção da empresa
      const mockInsertEmpresa = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: empresaCriada,
            error: null
          })
        })
      });

      // Mock para inserção de produtos e grupos
      const mockInsertAssociacoes = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any)
        .mockReturnValueOnce({ select: mockSelectDuplicatas }) // Verificação nome completo
        .mockReturnValueOnce({ select: mockSelectDuplicatas }) // Verificação nome abreviado
        .mockReturnValueOnce({ insert: mockInsertEmpresa })    // Inserção empresa
        .mockReturnValueOnce({ insert: mockInsertAssociacoes }) // Inserção produtos
        .mockReturnValueOnce({ insert: mockInsertAssociacoes }); // Inserção grupos

      const resultado = await empresasClientesService.criarEmpresa(empresaValidaData);

      expect(resultado).toEqual(empresaCriada);
    });

    it('deve lançar erro quando nome completo não for fornecido', async () => {
      const dadosInvalidos = { ...empresaValidaData, nomeCompleto: '' };

      await expect(empresasClientesService.criarEmpresa(dadosInvalidos))
        .rejects
        .toThrow(ClientBooksError);
    });

    it('deve lançar erro quando nome abreviado não for fornecido', async () => {
      const dadosInvalidos = { ...empresaValidaData, nomeAbreviado: '' };

      await expect(empresasClientesService.criarEmpresa(dadosInvalidos))
        .rejects
        .toThrow(ClientBooksError);
    });

    it('deve lançar erro quando status for inválido', async () => {
      const dadosInvalidos = { ...empresaValidaData, status: 'status-invalido' as any };

      await expect(empresasClientesService.criarEmpresa(dadosInvalidos))
        .rejects
        .toThrow(ClientBooksError);
    });

    it('deve lançar erro quando nome completo já existe', async () => {
      // Mock para simular empresa existente com mesmo nome
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ 
            data: { id: 'empresa-existente' }, 
            error: null 
          })
        })
      });

      (supabase.from as any).mockReturnValue({ select: mockSelect });

      await expect(empresasClientesService.criarEmpresa(empresaValidaData))
        .rejects
        .toThrow(ClientBooksError);
    });

    it('deve tratar erro do banco de dados', async () => {
      // Mock para verificação de duplicatas (sem duplicatas)
      const mockSelectDuplicatas = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Erro de banco' }
          })
        })
      });

      (supabase.from as any)
        .mockReturnValueOnce({ select: mockSelectDuplicatas }) // Verificação nome completo
        .mockReturnValueOnce({ select: mockSelectDuplicatas }) // Verificação nome abreviado
        .mockReturnValueOnce({ insert: mockInsert });          // Inserção empresa

      await expect(empresasClientesService.criarEmpresa(empresaValidaData))
        .rejects
        .toThrow(ClientBooksError);
    });
  });

  describe('listarEmpresas', () => {
    it('deve listar empresas ativas por padrão', async () => {
      const empresas = [
        { id: '1', nome_completo: 'Empresa 1', status: 'ativo' },
        { id: '2', nome_completo: 'Empresa 2', status: 'ativo' }
      ];

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: empresas, error: null })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const resultado = await empresasClientesService.listarEmpresas();

      expect(resultado).toEqual(empresas);
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'ativo');
    });

    it('deve aplicar filtro de busca', async () => {
      const empresas = [
        { id: '1', nome_completo: 'Empresa Teste', status: 'ativo' }
      ];

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: empresas, error: null })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const resultado = await empresasClientesService.listarEmpresas({ busca: 'Teste' });

      expect(resultado).toEqual(empresas);
      expect(mockQuery.or).toHaveBeenCalledWith('nome_completo.ilike.%Teste%,nome_abreviado.ilike.%Teste%');
    });

    it('deve tratar erro do banco de dados', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Erro de consulta' } 
        })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      await expect(empresasClientesService.listarEmpresas())
        .rejects
        .toThrow(ClientBooksError);
    });
  });

  describe('obterEmpresaPorId', () => {
    it('deve retornar empresa quando encontrada', async () => {
      const empresa = {
        id: '1',
        nome_completo: 'Empresa Teste',
        status: 'ativo'
      };

      const mockQuery = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: empresa, error: null })
        })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const resultado = await empresasClientesService.obterEmpresaPorId('1');

      expect(resultado).toEqual(empresa);
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1');
    });

    it('deve lançar erro quando empresa não for encontrada', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { code: 'PGRST116' } 
          })
        })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      await expect(empresasClientesService.obterEmpresaPorId('inexistente'))
        .rejects
        .toThrow(ClientBooksError);
    });

    it('deve tratar erro do banco de dados', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Erro de consulta', code: 'OTHER_ERROR' } 
          })
        })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      await expect(empresasClientesService.obterEmpresaPorId('1'))
        .rejects
        .toThrow(ClientBooksError);
    });
  });

  describe('atualizarEmpresa', () => {
    it('deve atualizar empresa com dados válidos', async () => {
      const dadosAtualizacao = {
        status: 'ativo' as any // Usar dados simples que não requerem validação de duplicatas
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      (supabase.from as any).mockReturnValue({ update: mockUpdate });

      await empresasClientesService.atualizarEmpresa('1', dadosAtualizacao);

      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'ativo',
        data_status: expect.any(String),
        descricao_status: null,
        updated_at: expect.any(String)
      });
    });

    it('deve tratar erro do banco de dados', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'Erro de atualização' } })
      });

      (supabase.from as any).mockReturnValue({ update: mockUpdate });

      await expect(empresasClientesService.atualizarEmpresa('1', { nomeCompleto: 'Teste' }))
        .rejects
        .toThrow(ClientBooksError);
    });
  });

  describe('deletarEmpresa', () => {
    it('deve deletar empresa quando não há colaboradores ativos', async () => {
      // Mock para obter empresa
      const mockSelectEmpresa = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ 
            data: { id: '1', nome_completo: 'Empresa Teste' }, 
            error: null 
          })
        })
      });

      // Mock para verificar colaboradores
      const mockSelectColaboradores = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      });

      // Mock para deletar empresa
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      (supabase.from as any)
        .mockReturnValueOnce({ select: mockSelectEmpresa })
        .mockReturnValueOnce({ select: mockSelectColaboradores })
        .mockReturnValueOnce({ delete: mockDelete });

      await empresasClientesService.deletarEmpresa('1');

      expect(mockDelete).toHaveBeenCalled();
    });

    it('deve lançar erro quando há colaboradores ativos', async () => {
      // Mock para obter empresa
      const mockSelectEmpresa = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ 
            data: { id: '1', nome_completo: 'Empresa Teste' }, 
            error: null 
          })
        })
      });

      // Mock para verificar colaboradores
      const mockSelectColaboradores = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [{ id: 'colaborador-1' }], error: null })
        })
      });

      (supabase.from as any)
        .mockReturnValueOnce({ select: mockSelectEmpresa })
        .mockReturnValueOnce({ select: mockSelectColaboradores });

      await expect(empresasClientesService.deletarEmpresa('1'))
        .rejects
        .toThrow(ClientBooksError);
    });
  });

  describe('alterarStatusLote', () => {
    it('deve alterar status em lote com dados válidos', async () => {
      const ids = ['1', '2', '3'];
      const status = EMPRESA_STATUS.ATIVO;
      const descricao = '';

      const mockUpdate = vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ error: null })
      });

      (supabase.from as any).mockReturnValue({ update: mockUpdate });

      await empresasClientesService.alterarStatusLote(ids, status, descricao);

      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'ativo',
        data_status: expect.any(String),
        descricao_status: '',
        updated_at: expect.any(String)
      });
    });

    it('deve lançar erro quando lista de IDs estiver vazia', async () => {
      await expect(empresasClientesService.alterarStatusLote([], 'ativo', ''))
        .rejects
        .toThrow(ClientBooksError);
    });

    it('deve lançar erro quando status for inválido', async () => {
      await expect(empresasClientesService.alterarStatusLote(['1'], 'status-invalido', ''))
        .rejects
        .toThrow(ClientBooksError);
    });

    it('deve exigir descrição para status inativo ou suspenso', async () => {
      await expect(empresasClientesService.alterarStatusLote(['1'], EMPRESA_STATUS.INATIVO, ''))
        .rejects
        .toThrow(ClientBooksError);
    });
  });

  describe('importarExcel', () => {
    it('deve lançar erro de não implementado', async () => {
      const arquivo = new File([''], 'test.xlsx');

      await expect(empresasClientesService.importarExcel(arquivo))
        .rejects
        .toThrow(ClientBooksError);
    });
  });
});