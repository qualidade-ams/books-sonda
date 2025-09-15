import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { empresasClientesService } from '@/services/empresasClientesService';
import { colaboradoresService } from '@/services/colaboradoresService';
import { gruposResponsaveisService } from '@/services/gruposResponsaveisService';
import { supabase } from '@/integrations/supabase/client';
import type { EmpresaFormData, ColaboradorFormData, GrupoFormData } from '@/types/clientBooks';

// Mock do Supabase para testes de integração
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

describe('Testes de Integração - Cadastro Completo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Fluxo completo de cadastro de empresa com colaboradores', () => {
    it('deve criar empresa, grupos e colaboradores em sequência', async () => {
      // Dados de teste
      const grupoData: GrupoFormData = {
        nome: 'CE Plus',
        descricao: 'Grupo responsável pelo CE Plus',
        emails: [
          { email: 'responsavel1@sonda.com', nome: 'Responsável 1' },
          { email: 'responsavel2@sonda.com', nome: 'Responsável 2' }
        ]
      };

      const empresaData: EmpresaFormData = {
        nomeCompleto: 'Empresa Teste Integração Ltda',
        nomeAbreviado: 'Empresa Teste',
        linkSharepoint: 'https://sharepoint.com/empresa-teste',
        templatePadrao: 'portugues',
        status: 'ativo',
        emailGestor: 'gestor@empresa.com',
        produtos: ['CE_PLUS', 'FISCAL'],
        grupos: ['grupo-1'] // ID do grupo criado
      };

      const colaborador1Data: ColaboradorFormData = {
        nomeCompleto: 'João Silva',
        email: 'joao.silva@empresa.com',
        funcao: 'Gerente',
        empresaId: 'empresa-1', // ID da empresa criada
        status: 'ativo',
        principalContato: true
      };

      const colaborador2Data: ColaboradorFormData = {
        nomeCompleto: 'Maria Santos',
        email: 'maria.santos@empresa.com',
        funcao: 'Analista',
        empresaId: 'empresa-1', // ID da empresa criada
        status: 'ativo',
        principalContato: false
      };

      // Mocks para criação do grupo
      const grupoCriado = {
        id: 'grupo-1',
        nome: 'CE Plus',
        descricao: 'Grupo responsável pelo CE Plus'
      };

      // Mock para verificar nome único do grupo
      const mockGrupoNomeQuery = {
        eq: vi.fn().mockResolvedValue({ data: [], error: null })
      };

      // Mock para inserção do grupo
      const mockGrupoInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: grupoCriado,
            error: null
          })
        })
      });

      // Mock para inserção de e-mails do grupo
      const mockEmailsInsert = vi.fn().mockResolvedValue({ error: null });

      // Mocks para criação da empresa
      const empresaCriada = {
        id: 'empresa-1',
        nome_completo: 'Empresa Teste Integração Ltda',
        nome_abreviado: 'Empresa Teste',
        status: 'ativo'
      };

      const mockEmpresaInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: empresaCriada,
            error: null
          })
        })
      });

      // Mock para associações da empresa (produtos e grupos)
      const mockAssociacoes = vi.fn().mockResolvedValue({ error: null });

      // Mocks para criação dos colaboradores
      const colaborador1Criado = {
        id: 'colaborador-1',
        nome_completo: 'João Silva',
        email: 'joao.silva@empresa.com',
        principal_contato: true
      };

      const colaborador2Criado = {
        id: 'colaborador-2',
        nome_completo: 'Maria Santos',
        email: 'maria.santos@empresa.com',
        principal_contato: false
      };

      // Mock para verificar empresa existe e está ativa
      const mockEmpresaExiste = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'empresa-1', status: 'ativo' },
            error: null
          })
        })
      };

      // Mock para verificar e-mail único
      const mockEmailUnico = {
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis()
      };
      mockEmailUnico.eq.mockResolvedValue({ data: [], error: null });

      // Mock para inserção dos colaboradores
      const mockColaborador1Insert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: colaborador1Criado,
            error: null
          })
        })
      });

      const mockColaborador2Insert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: colaborador2Criado,
            error: null
          })
        })
      });

      // Mock para remover principal contato existente
      const mockUpdatePrincipal = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis()
      });
      mockUpdatePrincipal().eq().eq = vi.fn().mockResolvedValue({ error: null });

      // Configurar sequência de mocks
      (supabase.from as any)
        // Criação do grupo
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockGrupoNomeQuery) })
        .mockReturnValueOnce({ insert: mockGrupoInsert })
        .mockReturnValueOnce({ insert: mockEmailsInsert })
        
        // Criação da empresa
        .mockReturnValueOnce({ insert: mockEmpresaInsert })
        .mockReturnValueOnce({ insert: mockAssociacoes }) // produtos
        .mockReturnValueOnce({ insert: mockAssociacoes }) // grupos
        
        // Criação do colaborador 1
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmpresaExiste) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmailUnico) })
        .mockReturnValueOnce({ update: mockUpdatePrincipal })
        .mockReturnValueOnce({ insert: mockColaborador1Insert })
        
        // Criação do colaborador 2
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmpresaExiste) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmailUnico) })
        .mockReturnValueOnce({ insert: mockColaborador2Insert });

      // Executar fluxo completo
      
      // 1. Criar grupo
      const grupoResultado = await gruposResponsaveisService.criarGrupo(grupoData);
      expect(grupoResultado).toEqual(grupoCriado);

      // 2. Criar empresa (com referência ao grupo)
      empresaData.grupos = [grupoResultado.id];
      const empresaResultado = await empresasClientesService.criarEmpresa(empresaData);
      expect(empresaResultado).toEqual(empresaCriada);

      // 3. Criar colaboradores (com referência à empresa)
      colaborador1Data.empresaId = empresaResultado.id;
      colaborador2Data.empresaId = empresaResultado.id;

      const colaborador1Resultado = await colaboradoresService.criarColaborador(colaborador1Data);
      expect(colaborador1Resultado).toEqual(colaborador1Criado);

      const colaborador2Resultado = await colaboradoresService.criarColaborador(colaborador2Data);
      expect(colaborador2Resultado).toEqual(colaborador2Criado);

      // Verificar que todas as operações foram executadas
      expect(mockGrupoInsert).toHaveBeenCalled();
      expect(mockEmpresaInsert).toHaveBeenCalled();
      expect(mockColaborador1Insert).toHaveBeenCalled();
      expect(mockColaborador2Insert).toHaveBeenCalled();

      // Verificar que apenas um colaborador é principal contato
      expect(colaborador1Resultado.principal_contato).toBe(true);
      expect(colaborador2Resultado.principal_contato).toBe(false);
    });

    it('deve falhar ao criar colaborador se empresa não existir', async () => {
      const colaboradorData: ColaboradorFormData = {
        nomeCompleto: 'João Silva',
        email: 'joao.silva@empresa.com',
        funcao: 'Gerente',
        empresaId: 'empresa-inexistente',
        status: 'ativo',
        principalContato: false
      };

      // Mock para empresa não encontrada
      const mockEmpresaQuery = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' }
          })
        })
      };

      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue(mockEmpresaQuery) 
      });

      await expect(colaboradoresService.criarColaborador(colaboradorData))
        .rejects
        .toThrow('Empresa não encontrada');
    });

    it('deve falhar ao criar empresa com grupo inexistente', async () => {
      const empresaData: EmpresaFormData = {
        nomeCompleto: 'Empresa Teste',
        nomeAbreviado: 'Teste',
        templatePadrao: 'portugues',
        status: 'ativo',
        produtos: ['CE_PLUS'],
        grupos: ['grupo-inexistente']
      };

      // Mock para criação da empresa (sucesso)
      const mockEmpresaInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'empresa-1' },
            error: null
          })
        })
      });

      // Mock para associação de produtos (sucesso)
      const mockProdutosInsert = vi.fn().mockResolvedValue({ error: null });

      // Mock para associação de grupos (falha)
      const mockGruposInsert = vi.fn().mockResolvedValue({ 
        error: { message: 'Foreign key violation' } 
      });

      (supabase.from as any)
        .mockReturnValueOnce({ insert: mockEmpresaInsert })
        .mockReturnValueOnce({ insert: mockProdutosInsert })
        .mockReturnValueOnce({ insert: mockGruposInsert });

      await expect(empresasClientesService.criarEmpresa(empresaData))
        .rejects
        .toThrow('Erro ao associar grupos: Foreign key violation');
    });
  });

  describe('Fluxo de atualização com validações cruzadas', () => {
    it('deve atualizar empresa e refletir mudanças nos colaboradores', async () => {
      const empresaId = 'empresa-1';
      const novoStatus = 'inativo';
      const descricaoStatus = 'Empresa encerrou atividades';

      // Mock para atualização da empresa
      const mockEmpresaUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      // Mock para buscar colaboradores da empresa
      const colaboradoresMock = [
        { id: 'colab-1', nome_completo: 'João Silva', status: 'ativo' },
        { id: 'colab-2', nome_completo: 'Maria Santos', status: 'ativo' }
      ];

      const mockColaboradoresQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: colaboradoresMock, error: null })
      };

      (supabase.from as any)
        .mockReturnValueOnce({ update: mockEmpresaUpdate })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockColaboradoresQuery) });

      // Atualizar empresa
      await empresasClientesService.atualizarEmpresa(empresaId, {
        status: novoStatus as any,
        descricaoStatus
      });

      // Verificar colaboradores da empresa
      const colaboradores = await colaboradoresService.listarColaboradores({
        empresaId
      });

      expect(mockEmpresaUpdate).toHaveBeenCalledWith({
        status: 'inativo',
        data_status: expect.any(String),
        descricao_status: 'Empresa encerrou atividades',
        updated_at: expect.any(String)
      });

      expect(colaboradores).toEqual(colaboradoresMock);
    });

    it('deve validar integridade ao tentar deletar grupo associado a empresa', async () => {
      const grupoId = 'grupo-1';

      // Mock para verificar associações do grupo
      const mockAssociacaoQuery = {
        eq: vi.fn().mockResolvedValue({ 
          data: [{ empresa_id: 'empresa-1' }], 
          error: null 
        })
      };

      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue(mockAssociacaoQuery) 
      });

      await expect(gruposResponsaveisService.deletarGrupo(grupoId))
        .rejects
        .toThrow('Não é possível deletar grupo associado a empresas');
    });
  });

  describe('Fluxo de busca e listagem integrada', () => {
    it('deve buscar dados relacionados corretamente', async () => {
      const empresaId = 'empresa-1';

      // Mock para buscar empresa com dados completos
      const empresaCompletaMock = {
        id: 'empresa-1',
        nome_completo: 'Empresa Teste',
        colaboradores: [
          {
            id: 'colab-1',
            nome_completo: 'João Silva',
            email: 'joao@empresa.com',
            principal_contato: true
          }
        ],
        grupos: [
          {
            grupo_id: 'grupo-1',
            grupos_responsaveis: {
              id: 'grupo-1',
              nome: 'CE Plus',
              emails: [
                { email: 'responsavel@sonda.com', nome: 'Responsável' }
              ]
            }
          }
        ]
      };

      const mockEmpresaQuery = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: empresaCompletaMock,
            error: null
          })
        })
      };

      // Mock para buscar colaboradores da empresa
      const mockColaboradoresQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: empresaCompletaMock.colaboradores,
          error: null
        })
      };

      // Mock para buscar grupos da empresa
      const mockGruposQuery = {
        eq: vi.fn().mockResolvedValue({
          data: empresaCompletaMock.grupos,
          error: null
        })
      };

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmpresaQuery) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockColaboradoresQuery) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockGruposQuery) });

      // Buscar dados integrados
      const empresa = await empresasClientesService.obterEmpresaPorId(empresaId);
      const colaboradores = await colaboradoresService.listarPorEmpresa(empresaId);
      const grupos = await gruposResponsaveisService.obterGruposPorEmpresa(empresaId);

      expect(empresa).toEqual(empresaCompletaMock);
      expect(colaboradores).toEqual(empresaCompletaMock.colaboradores);
      expect(grupos).toHaveLength(1);
      expect(grupos[0].nome).toBe('CE Plus');
    });

    it('deve filtrar dados corretamente em consultas complexas', async () => {
      // Mock para buscar empresas com filtros
      const empresasFiltradas = [
        { id: 'empresa-1', nome_completo: 'Empresa Ativa', status: 'ativo' }
      ];

      const mockEmpresasQuery = {
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: empresasFiltradas,
          error: null
        })
      };

      // Mock para buscar colaboradores com filtros
      const colaboradoresFiltrados = [
        { id: 'colab-1', nome_completo: 'João Silva', status: 'ativo' }
      ];

      const mockColaboradoresQuery = {
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: colaboradoresFiltrados,
          error: null
        })
      };

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmpresasQuery) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockColaboradoresQuery) });

      // Buscar com filtros
      const empresas = await empresasClientesService.listarEmpresas({
        status: 'ativo',
        busca: 'Ativa'
      });

      const colaboradores = await colaboradoresService.listarColaboradores({
        status: 'ativo',
        busca: 'João'
      });

      expect(empresas).toEqual(empresasFiltradas);
      expect(colaboradores).toEqual(colaboradoresFiltrados);
      expect(mockEmpresasQuery.eq).toHaveBeenCalledWith('status', 'ativo');
      expect(mockEmpresasQuery.or).toHaveBeenCalledWith('nome_completo.ilike.%Ativa%,nome_abreviado.ilike.%Ativa%');
      expect(mockColaboradoresQuery.or).toHaveBeenCalledWith('nome_completo.ilike.%João%,email.ilike.%João%,funcao.ilike.%João%');
    });
  });
});