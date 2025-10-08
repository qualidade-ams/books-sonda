import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { empresasClientesService } from '@/services/empresasClientesService';
import { clientesService } from '@/services/clientesService';
import { gruposResponsaveisService } from '@/services/gruposResponsaveisService';
import { supabase } from '@/integrations/supabase/client';
import type { EmpresaFormData, ClienteFormData, GrupoFormData } from '@/types/clientBooks';

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

  describe('Fluxo completo de cadastro de empresa com clientes', () => {
    it('deve criar empresa, grupos e clientes em sequência', async () => {
      // Dados de teste
      const grupoData: GrupoFormData = {
        nome: 'Comex',
        descricao: 'Grupo responsável pelo Comex',
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
        produtos: ['COMEX', 'FISCAL'],
        grupos: ['grupo-1'] // ID do grupo criado
      };

      const cliente1Data: ClienteFormData = {
        nomeCompleto: 'João Silva',
        email: 'joao.silva@empresa.com',
        funcao: 'Gerente',
        empresaId: 'empresa-1', // ID da empresa criada
        status: 'ativo',
        principalContato: true
      };

      const cliente2Data: ClienteFormData = {
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
        nome: 'Comex',
        descricao: 'Grupo responsável pelo Comex'
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

      // Mocks para criação dos clientes
      const cliente1Criado = {
        id: 'cliente-1',
        nome_completo: 'João Silva',
        email: 'joao.silva@empresa.com',
        principal_contato: true
      };

      const cliente2Criado = {
        id: 'cliente-2',
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

      // Mock para inserção dos clientes
      const mockCliente1Insert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: cliente1Criado,
            error: null
          })
        })
      });

      const mockCliente2Insert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: cliente2Criado,
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

        // Criação do cliente 1
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmpresaExiste) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmailUnico) })
        .mockReturnValueOnce({ update: mockUpdatePrincipal })
        .mockReturnValueOnce({ insert: mockCliente1Insert })

        // Criação do cliente 2
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmpresaExiste) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmailUnico) })
        .mockReturnValueOnce({ insert: mockCliente2Insert });

      // Executar fluxo completo

      // 1. Criar grupo
      const grupoResultado = await gruposResponsaveisService.criarGrupo(grupoData);
      expect(grupoResultado).toEqual(grupoCriado);

      // 2. Criar empresa (com referência ao grupo)
      empresaData.grupos = [grupoResultado.id];
      const empresaResultado = await empresasClientesService.criarEmpresa(empresaData);
      expect(empresaResultado).toEqual(empresaCriada);

      // 3. Criar clientes (com referência à empresa)
      cliente1Data.empresaId = empresaResultado.id;
      cliente2Data.empresaId = empresaResultado.id;

      const cliente1Resultado = await clientesService.criarCliente(cliente1Data);
      expect(cliente1Resultado).toEqual(cliente1Criado);

      const cliente2Resultado = await clientesService.criarCliente(cliente2Data);
      expect(cliente2Resultado).toEqual(cliente2Criado);

      // Verificar que todas as operações foram executadas
      expect(mockGrupoInsert).toHaveBeenCalled();
      expect(mockEmpresaInsert).toHaveBeenCalled();
      expect(mockCliente1Insert).toHaveBeenCalled();
      expect(mockCliente2Insert).toHaveBeenCalled();

      // Verificar que apenas um cliente é principal contato
      expect(cliente1Resultado.principal_contato).toBe(true);
      expect(cliente2Resultado.principal_contato).toBe(false);
    });

    it('deve falhar ao criar cliente se empresa não existir', async () => {
      const clienteData: ClienteFormData = {
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

      await expect(clientesService.criarCliente(clienteData))
        .rejects
        .toThrow('Empresa não encontrada');
    });

    it('deve falhar ao criar empresa com grupo inexistente', async () => {
      const empresaData: EmpresaFormData = {
        nomeCompleto: 'Empresa Teste',
        nomeAbreviado: 'Teste',
        templatePadrao: 'portugues',
        status: 'ativo',
        produtos: ['COMEX'],
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
    it('deve atualizar empresa e refletir mudanças nos clientes', async () => {
      const empresaId = 'empresa-1';
      const novoStatus = 'inativo';
      const descricaoStatus = 'Empresa encerrou atividades';

      // Mock para atualização da empresa
      const mockEmpresaUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      // Mock para buscar clientes da empresa
      const clientesMock = [
        { id: 'colab-1', nome_completo: 'João Silva', status: 'ativo' },
        { id: 'colab-2', nome_completo: 'Maria Santos', status: 'ativo' }
      ];

      const mockClientesQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: clientesMock, error: null })
      };

      (supabase.from as any)
        .mockReturnValueOnce({ update: mockEmpresaUpdate })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockClientesQuery) });

      // Atualizar empresa
      await empresasClientesService.atualizarEmpresa(empresaId, {
        status: novoStatus as any,
        descricaoStatus
      });

      // Verificar clientes da empresa
      const clientes = await clientesService.listarClientes({
        empresaId
      });

      expect(mockEmpresaUpdate).toHaveBeenCalledWith({
        status: 'inativo',
        data_status: expect.any(String),
        descricao_status: 'Empresa encerrou atividades',
        updated_at: expect.any(String)
      });

      expect(clientes).toEqual(clientesMock);
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
        clientes: [
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
              nome: 'Comex',
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

      // Mock para buscar clientes da empresa
      const mockClientesQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: empresaCompletaMock.clientes,
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
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockClientesQuery) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockGruposQuery) });

      // Buscar dados integrados
      const empresa = await empresasClientesService.obterEmpresaPorId(empresaId);
      const clientes = await clientesService.listarPorEmpresa(empresaId);
      const grupos = await gruposResponsaveisService.obterGruposPorEmpresa(empresaId);

      expect(empresa).toEqual(empresaCompletaMock);
      expect(clientes).toEqual(empresaCompletaMock.clientes);
      expect(grupos).toHaveLength(1);
      expect(grupos[0].nome).toBe('Comex');
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

      // Mock para buscar clientes com filtros
      const clientesFiltrados = [
        { id: 'colab-1', nome_completo: 'João Silva', status: 'ativo' }
      ];

      const mockClientesQuery = {
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: clientesFiltrados,
          error: null
        })
      };

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmpresasQuery) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockClientesQuery) });

      // Buscar com filtros
      const empresas = await empresasClientesService.listarEmpresas({
        status: ['ativo'],
        busca: 'Ativa'
      });

      const clientes = await clientesService.listarClientes({
        status: ['ativo'],
        busca: 'João'
      });

      expect(empresas).toEqual(empresasFiltradas);
      expect(clientes).toEqual(clientesFiltrados);
      expect(mockEmpresasQuery.or).toHaveBeenCalledWith('nome_completo.ilike.%Ativa%,nome_abreviado.ilike.%Ativa%');
      expect(mockClientesQuery.or).toHaveBeenCalledWith('nome_completo.ilike.%João%,email.ilike.%João%,funcao.ilike.%João%');
    });
  });
});