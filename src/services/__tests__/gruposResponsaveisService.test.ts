import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { gruposResponsaveisService, GrupoResponsavelError } from '../gruposResponsaveisService';
import { supabase } from '@/integrations/supabase/client';
import type { GrupoFormData } from '@/types/clientBooksTypes';

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
        neq: vi.fn()
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

describe('GruposResponsaveisService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('criarGrupo', () => {
    const grupoValidoData: GrupoFormData = {
      nome: 'Comex',
      descricao: 'Grupo responsável pelo produto Comex',
      emails: [
        { email: 'responsavel1@sonda.com', nome: 'Responsável 1' },
        { email: 'responsavel2@sonda.com', nome: 'Responsável 2' }
      ]
    };

    it('deve criar um grupo com dados válidos', async () => {
      const grupoCriado = {
        id: 'grupo-1',
        nome: 'Comex',
        descricao: 'Grupo responsável pelo produto Comex'
      };

      // Mock para verificar nome único
      const mockNomeQuery = {
        eq: vi.fn().mockResolvedValue({ data: [], error: null })
      };

      // Mock para inserção do grupo
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: grupoCriado,
            error: null
          })
        })
      });

      // Mock para inserção de e-mails
      const mockInsertEmails = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockNomeQuery) })
        .mockReturnValueOnce({ insert: mockInsert })
        .mockReturnValueOnce({ insert: mockInsertEmails });

      const resultado = await gruposResponsaveisService.criarGrupo(grupoValidoData);

      expect(resultado).toEqual(grupoCriado);
      expect(mockInsert).toHaveBeenCalledWith({
        nome: 'Comex',
        descricao: 'Grupo responsável pelo produto Comex'
      });
    });

    it('deve lançar erro quando nome não for fornecido', async () => {
      const dadosInvalidos = { ...grupoValidoData, nome: '' };

      await expect(gruposResponsaveisService.criarGrupo(dadosInvalidos))
        .rejects
        .toThrow(new GrupoResponsavelError('Nome do grupo é obrigatório', 'NOME_REQUIRED'));
    });

    it('deve lançar erro quando nome for muito longo', async () => {
      const dadosInvalidos = { ...grupoValidoData, nome: 'a'.repeat(101) };

      await expect(gruposResponsaveisService.criarGrupo(dadosInvalidos))
        .rejects
        .toThrow(new GrupoResponsavelError('Nome do grupo deve ter no máximo 100 caracteres', 'NOME_TOO_LONG'));
    });

    it('deve lançar erro quando e-mail for inválido', async () => {
      const dadosInvalidos = {
        ...grupoValidoData,
        emails: [{ email: 'email-invalido', nome: 'Teste' }]
      };

      await expect(gruposResponsaveisService.criarGrupo(dadosInvalidos))
        .rejects
        .toThrow(new GrupoResponsavelError('E-mail inválido: email-invalido', 'INVALID_EMAIL'));
    });

    it('deve lançar erro quando houver e-mails duplicados', async () => {
      const dadosInvalidos = {
        ...grupoValidoData,
        emails: [
          { email: 'teste@sonda.com', nome: 'Teste 1' },
          { email: 'teste@sonda.com', nome: 'Teste 2' }
        ]
      };

      await expect(gruposResponsaveisService.criarGrupo(dadosInvalidos))
        .rejects
        .toThrow(new GrupoResponsavelError('Existem e-mails duplicados na lista', 'DUPLICATE_EMAILS'));
    });

    it('deve lançar erro quando nome já existir', async () => {
      // Mock para nome duplicado
      const mockNomeQuery = {
        eq: vi.fn().mockResolvedValue({ 
          data: [{ id: 'grupo-existente' }], 
          error: null 
        })
      };

      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue(mockNomeQuery) 
      });

      await expect(gruposResponsaveisService.criarGrupo(grupoValidoData))
        .rejects
        .toThrow(new GrupoResponsavelError('Já existe um grupo com este nome', 'NAME_ALREADY_EXISTS'));
    });

    it('deve tratar erro do banco de dados', async () => {
      // Mock para nome único
      const mockNomeQuery = {
        eq: vi.fn().mockResolvedValue({ data: [], error: null })
      };

      // Mock para erro na inserção
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Erro de banco' }
          })
        })
      });

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockNomeQuery) })
        .mockReturnValueOnce({ insert: mockInsert });

      await expect(gruposResponsaveisService.criarGrupo(grupoValidoData))
        .rejects
        .toThrow(new GrupoResponsavelError('Erro ao criar grupo: Erro de banco', 'CREATE_ERROR'));
    });
  });

  describe('listarGrupos', () => {
    it('deve listar todos os grupos', async () => {
      const grupos = [
        { 
          id: '1', 
          nome: 'Comex', 
          emails: [
            { id: 'email-1', email: 'teste1@sonda.com', nome: 'Teste 1' }
          ]
        },
        { 
          id: '2', 
          nome: 'Fiscal', 
          emails: [
            { id: 'email-2', email: 'teste2@sonda.com', nome: 'Teste 2' }
          ]
        }
      ];

      const mockQuery = {
        order: vi.fn().mockResolvedValue({ data: grupos, error: null })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const resultado = await gruposResponsaveisService.listarGrupos();

      expect(resultado).toEqual(grupos);
      expect(mockQuery.order).toHaveBeenCalledWith('nome');
    });

    it('deve tratar erro do banco de dados', async () => {
      const mockQuery = {
        order: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Erro de consulta' } 
        })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      await expect(gruposResponsaveisService.listarGrupos())
        .rejects
        .toThrow(new GrupoResponsavelError('Erro ao listar grupos: Erro de consulta', 'LIST_ERROR'));
    });
  });

  describe('obterGrupoPorId', () => {
    it('deve retornar grupo quando encontrado', async () => {
      const grupo = {
        id: '1',
        nome: 'Comex',
        emails: [
          { id: 'email-1', email: 'teste@sonda.com', nome: 'Teste' }
        ]
      };

      const mockQuery = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: grupo, error: null })
        })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const resultado = await gruposResponsaveisService.obterGrupoPorId('1');

      expect(resultado).toEqual(grupo);
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1');
    });

    it('deve retornar null quando grupo não for encontrado', async () => {
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

      const resultado = await gruposResponsaveisService.obterGrupoPorId('inexistente');

      expect(resultado).toBeNull();
    });
  });

  describe('obterGrupoPorNome', () => {
    it('deve retornar grupo quando encontrado pelo nome', async () => {
      const grupo = {
        id: '1',
        nome: 'Comex',
        emails: []
      };

      const mockQuery = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: grupo, error: null })
        })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const resultado = await gruposResponsaveisService.obterGrupoPorNome('Comex');

      expect(resultado).toEqual(grupo);
      expect(mockQuery.eq).toHaveBeenCalledWith('nome', 'Comex');
    });
  });

  describe('atualizarGrupo', () => {
    it('deve atualizar grupo com dados válidos', async () => {
      const grupoAtual = {
        id: '1',
        nome: 'Comex',
        descricao: 'Descrição antiga'
      };

      // Mock para obter grupo atual
      const mockGetQuery = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: grupoAtual, error: null })
        })
      };

      // Mock para atualização
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockGetQuery) })
        .mockReturnValueOnce({ update: mockUpdate });

      const dadosAtualizacao = {
        nome: 'Comex Atualizado',
        descricao: 'Nova descrição'
      };

      await gruposResponsaveisService.atualizarGrupo('1', dadosAtualizacao);

      expect(mockUpdate).toHaveBeenCalledWith({
        nome: 'Comex Atualizado',
        descricao: 'Nova descrição',
        updated_at: expect.any(String)
      });
    });

    it('deve lançar erro quando grupo não for encontrado', async () => {
      const mockGetQuery = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      };

      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue(mockGetQuery) 
      });

      await expect(gruposResponsaveisService.atualizarGrupo('inexistente', { nome: 'Teste' }))
        .rejects
        .toThrow(new GrupoResponsavelError('Grupo não encontrado', 'NOT_FOUND'));
    });
  });

  describe('deletarGrupo', () => {
    it('deve deletar grupo quando não há empresas associadas', async () => {
      // Mock para verificar associações
      const mockAssociacaoQuery = {
        eq: vi.fn().mockResolvedValue({ data: [], error: null })
      };

      // Mock para deletar
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockAssociacaoQuery) })
        .mockReturnValueOnce({ delete: mockDelete });

      await gruposResponsaveisService.deletarGrupo('1');

      expect(mockDelete).toHaveBeenCalled();
    });

    it('deve lançar erro quando há empresas associadas', async () => {
      const mockAssociacaoQuery = {
        eq: vi.fn().mockResolvedValue({ 
          data: [{ empresa_id: 'empresa-1' }], 
          error: null 
        })
      };

      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue(mockAssociacaoQuery) 
      });

      await expect(gruposResponsaveisService.deletarGrupo('1'))
        .rejects
        .toThrow(new GrupoResponsavelError('Não é possível deletar grupo associado a empresas', 'HAS_ASSOCIATED_COMPANIES'));
    });
  });

  describe('adicionarEmailAoGrupo', () => {
    it('deve adicionar e-mail válido ao grupo', async () => {
      const emailAdicionado = {
        id: 'email-1',
        grupo_id: 'grupo-1',
        email: 'novo@sonda.com',
        nome: 'Novo Responsável'
      };

      // Mock para verificar e-mail único
      const mockEmailQuery = {
        eq: vi.fn().mockReturnThis()
      };
      mockEmailQuery.eq.mockResolvedValue({ data: [], error: null });

      // Mock para inserção
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: emailAdicionado,
            error: null
          })
        })
      });

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmailQuery) })
        .mockReturnValueOnce({ insert: mockInsert });

      const resultado = await gruposResponsaveisService.adicionarEmailAoGrupo(
        'grupo-1', 
        'novo@sonda.com', 
        'Novo Responsável'
      );

      expect(resultado).toEqual(emailAdicionado);
      expect(mockInsert).toHaveBeenCalledWith({
        grupo_id: 'grupo-1',
        email: 'novo@sonda.com',
        nome: 'Novo Responsável'
      });
    });

    it('deve lançar erro quando e-mail for inválido', async () => {
      await expect(gruposResponsaveisService.adicionarEmailAoGrupo('grupo-1', 'email-invalido'))
        .rejects
        .toThrow(new GrupoResponsavelError('E-mail inválido', 'INVALID_EMAIL'));
    });

    it('deve lançar erro quando e-mail já existir no grupo', async () => {
      const mockEmailQuery = {
        eq: vi.fn().mockReturnThis()
      };
      mockEmailQuery.eq.mockResolvedValue({ 
        data: [{ id: 'email-existente' }], 
        error: null 
      });

      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue(mockEmailQuery) 
      });

      await expect(gruposResponsaveisService.adicionarEmailAoGrupo('grupo-1', 'existente@sonda.com'))
        .rejects
        .toThrow(new GrupoResponsavelError('E-mail já existe neste grupo', 'EMAIL_ALREADY_EXISTS'));
    });
  });

  describe('removerEmailDoGrupo', () => {
    it('deve remover e-mail do grupo', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      });

      (supabase.from as any).mockReturnValue({ delete: mockDelete });

      await gruposResponsaveisService.removerEmailDoGrupo('grupo-1', 'email-1');

      expect(mockDelete).toHaveBeenCalled();
    });

    it('deve tratar erro do banco de dados', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Erro ao remover' } })
        })
      });

      (supabase.from as any).mockReturnValue({ delete: mockDelete });

      await expect(gruposResponsaveisService.removerEmailDoGrupo('grupo-1', 'email-1'))
        .rejects
        .toThrow(new GrupoResponsavelError('Erro ao remover e-mail: Erro ao remover', 'REMOVE_EMAIL_ERROR'));
    });
  });

  describe('associarGrupoEmpresa', () => {
    it('deve associar grupo à empresa quando não há associação existente', async () => {
      // Mock para verificar associação existente
      const mockAssociacaoQuery = {
        eq: vi.fn().mockReturnThis()
      };
      mockAssociacaoQuery.eq.mockResolvedValue({ data: [], error: null });

      // Mock para inserção
      const mockInsert = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockAssociacaoQuery) })
        .mockReturnValueOnce({ insert: mockInsert });

      await gruposResponsaveisService.associarGrupoEmpresa('grupo-1', 'empresa-1');

      expect(mockInsert).toHaveBeenCalledWith({
        grupo_id: 'grupo-1',
        empresa_id: 'empresa-1'
      });
    });

    it('deve lançar erro quando associação já existir', async () => {
      const mockAssociacaoQuery = {
        eq: vi.fn().mockReturnThis()
      };
      mockAssociacaoQuery.eq.mockResolvedValue({ 
        data: [{ id: 'associacao-existente' }], 
        error: null 
      });

      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue(mockAssociacaoQuery) 
      });

      await expect(gruposResponsaveisService.associarGrupoEmpresa('grupo-1', 'empresa-1'))
        .rejects
        .toThrow(new GrupoResponsavelError('Grupo já está associado a esta empresa', 'ASSOCIATION_ALREADY_EXISTS'));
    });
  });

  describe('desassociarGrupoEmpresa', () => {
    it('deve desassociar grupo da empresa', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      });

      (supabase.from as any).mockReturnValue({ delete: mockDelete });

      await gruposResponsaveisService.desassociarGrupoEmpresa('grupo-1', 'empresa-1');

      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('obterGruposPorEmpresa', () => {
    it('deve retornar grupos associados à empresa', async () => {
      const grupos = [
        {
          grupos_responsaveis: {
            id: '1',
            nome: 'Comex',
            emails: []
          }
        },
        {
          grupos_responsaveis: {
            id: '2',
            nome: 'Fiscal',
            emails: []
          }
        }
      ];

      const mockQuery = {
        eq: vi.fn().mockResolvedValue({ data: grupos, error: null })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const resultado = await gruposResponsaveisService.obterGruposPorEmpresa('empresa-1');

      expect(resultado).toHaveLength(2);
      expect(resultado[0].nome).toBe('Comex');
      expect(resultado[1].nome).toBe('Fiscal');
      expect(mockQuery.eq).toHaveBeenCalledWith('empresa_id', 'empresa-1');
    });
  });

  describe('criarGruposPadrao', () => {
    it('deve criar grupos padrão quando não existem', async () => {
      // Mock para verificar grupos existentes (retorna null para todos)
      const mockGetQuery = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
        })
      };

      // Mock para criação de grupos
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'novo-grupo' },
            error: null
          })
        })
      });

      // Mock para inserção de e-mails
      const mockInsertEmails = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any)
        .mockReturnValue({ select: vi.fn().mockReturnValue(mockGetQuery) })
        .mockReturnValue({ insert: mockInsert })
        .mockReturnValue({ insert: mockInsertEmails });

      await gruposResponsaveisService.criarGruposPadrao();

      // Deve tentar criar 4 grupos padrão
      expect(mockInsert).toHaveBeenCalledTimes(4);
    });

    it('deve pular grupos que já existem', async () => {
      // Mock para grupo existente
      const mockGetQuery = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ 
            data: { id: 'grupo-existente', nome: 'Comex' }, 
            error: null 
          })
        })
      };

      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue(mockGetQuery) 
      });

      await gruposResponsaveisService.criarGruposPadrao();

      // Não deve tentar criar nenhum grupo
      expect(supabase.from).toHaveBeenCalledWith('grupos_responsaveis');
    });
  });

  describe('Validações', () => {
    it('deve validar e-mail corretamente', () => {
      const service = gruposResponsaveisService as any;
      
      expect(service.validarEmail('teste@email.com')).toBe(true);
      expect(service.validarEmail('email.invalido')).toBe(false);
      expect(service.validarEmail('')).toBe(false);
      expect(service.validarEmail('teste@')).toBe(false);
    });

    it('deve validar dados do grupo corretamente', () => {
      const service = gruposResponsaveisService as any;
      
      // Teste sem nome (não é update)
      expect(() => {
        service.validarDadosGrupo({ emails: [] }, false);
      }).toThrow(new GrupoResponsavelError('Nome do grupo é obrigatório', 'NOME_REQUIRED'));

      // Teste de nome muito longo
      expect(() => {
        service.validarDadosGrupo({
          nome: 'a'.repeat(101),
          emails: []
        });
      }).toThrow(new GrupoResponsavelError('Nome do grupo deve ter no máximo 100 caracteres', 'NOME_TOO_LONG'));
    });
  });
});