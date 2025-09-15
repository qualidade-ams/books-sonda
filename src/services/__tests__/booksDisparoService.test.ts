import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { booksDisparoService } from '../booksDisparoService';
import { supabase } from '@/integrations/supabase/client';
import { emailService } from '../emailService';
import { clientBooksTemplateService } from '../clientBooksTemplateService';
import type { AgendamentoDisparo, HistoricoFiltros, ControleMensalFiltros } from '@/types/clientBooks';

// Mock dos serviços dependentes
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(),
          limit: vi.fn()
        })),
        in: vi.fn(() => ({
          order: vi.fn()
        })),
        gte: vi.fn(() => ({
          lt: vi.fn(),
          lte: vi.fn(),
          order: vi.fn()
        })),
        lte: vi.fn(() => ({
          order: vi.fn()
        })),
        order: vi.fn(),
        count: 'exact',
        head: true
      })),
      insert: vi.fn(),
      update: vi.fn(() => ({
        eq: vi.fn(),
        in: vi.fn()
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      })),
      upsert: vi.fn()
    }))
  }
}));

vi.mock('../emailService', () => ({
  emailService: {
    sendEmail: vi.fn()
  }
}));

vi.mock('../clientBooksTemplateService', () => ({
  clientBooksTemplateService: {
    buscarTemplateBooks: vi.fn(),
    validarTemplate: vi.fn(),
    processarTemplate: vi.fn()
  }
}));

describe('BooksDisparoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('dispararBooksMensal', () => {
    const empresasMock = [
      {
        id: 'empresa-1',
        nome_completo: 'Empresa Teste 1',
        nome_abreviado: 'Teste 1',
        status: 'ativo',
        template_padrao: 'portugues',
        email_gestor: 'gestor1@empresa.com',
        colaboradores: [
          {
            id: 'colab-1',
            nome_completo: 'João Silva',
            email: 'joao@empresa.com',
            status: 'ativo'
          }
        ]
      },
      {
        id: 'empresa-2',
        nome_completo: 'Empresa Teste 2',
        nome_abreviado: 'Teste 2',
        status: 'ativo',
        template_padrao: 'portugues',
        email_gestor: 'gestor2@empresa.com',
        colaboradores: [
          {
            id: 'colab-2',
            nome_completo: 'Maria Santos',
            email: 'maria@empresa.com',
            status: 'ativo'
          }
        ]
      }
    ];

    it('deve disparar books mensais para empresas ativas', async () => {
      const mes = 3;
      const ano = 2024;

      // Mock para buscar empresas ativas
      const mockEmpresasQuery = {
        eq: vi.fn().mockReturnThis()
      };
      mockEmpresasQuery.eq.mockResolvedValue({ 
        data: empresasMock, 
        error: null 
      });

      // Mock para verificar controle mensal existente
      const mockControleQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      };

      // Mock para buscar colaboradores
      const mockColaboradoresQuery = {
        eq: vi.fn().mockReturnThis()
      };
      mockColaboradoresQuery.eq.mockResolvedValue({
        data: [empresasMock[0].colaboradores[0]],
        error: null
      });

      // Mock para buscar grupos de e-mail
      const mockGruposQuery = {
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              grupos_responsaveis: {
                grupo_emails: [
                  { email: 'grupo1@sonda.com', nome: 'Grupo 1' }
                ]
              }
            }
          ],
          error: null
        })
      };

      // Mock para template service
      const templateMock = {
        id: 'template-1',
        assunto: 'Book Mensal - {{empresa.nomeCompleto}}',
        corpo: 'Olá {{colaborador.nomeCompleto}}'
      };

      (clientBooksTemplateService.buscarTemplateBooks as any).mockResolvedValue(templateMock);
      (clientBooksTemplateService.validarTemplate as any).mockReturnValue({ valido: true });
      (clientBooksTemplateService.processarTemplate as any).mockResolvedValue({
        assunto: 'Book Mensal - Empresa Teste 1',
        corpo: 'Olá João Silva'
      });

      // Mock para email service
      (emailService.sendEmail as any).mockResolvedValue({ success: true });

      // Mock para inserções no banco
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmpresasQuery) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockControleQuery) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockColaboradoresQuery) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockGruposQuery) })
        .mockReturnValueOnce({ insert: mockInsert })
        .mockReturnValueOnce({ upsert: mockUpsert });

      const resultado = await booksDisparoService.dispararBooksMensal(mes, ano);

      expect(resultado.total).toBe(2);
      expect(resultado.sucesso).toBeGreaterThan(0);
      expect(clientBooksTemplateService.buscarTemplateBooks).toHaveBeenCalled();
      expect(emailService.sendEmail).toHaveBeenCalled();
    });

    it('deve retornar resultado vazio quando não há empresas ativas', async () => {
      const mockEmpresasQuery = {
        eq: vi.fn().mockReturnThis()
      };
      mockEmpresasQuery.eq.mockResolvedValue({ 
        data: [], 
        error: null 
      });

      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue(mockEmpresasQuery) 
      });

      const resultado = await booksDisparoService.dispararBooksMensal(3, 2024);

      expect(resultado).toEqual({
        sucesso: 0,
        falhas: 0,
        total: 0,
        detalhes: []
      });
    });

    it('deve tratar erro ao buscar empresas', async () => {
      const mockEmpresasQuery = {
        eq: vi.fn().mockReturnThis()
      };
      mockEmpresasQuery.eq.mockResolvedValue({ 
        data: null, 
        error: { message: 'Erro de banco' } 
      });

      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue(mockEmpresasQuery) 
      });

      await expect(booksDisparoService.dispararBooksMensal(3, 2024))
        .rejects
        .toThrow('Erro no disparo mensal: Erro ao buscar empresas: Erro de banco');
    });

    it('deve pular empresas que já foram processadas com sucesso', async () => {
      const mockEmpresasQuery = {
        eq: vi.fn().mockReturnThis()
      };
      mockEmpresasQuery.eq.mockResolvedValue({ 
        data: [empresasMock[0]], 
        error: null 
      });

      // Mock para controle mensal já processado
      const mockControleQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ 
          data: { status: 'enviado' }, 
          error: null 
        })
      };

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmpresasQuery) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockControleQuery) });

      const resultado = await booksDisparoService.dispararBooksMensal(3, 2024);

      expect(resultado.total).toBe(1);
      expect(resultado.sucesso).toBe(0);
      expect(resultado.falhas).toBe(0);
    });
  });

  describe('agendarDisparo', () => {
    it('deve agendar disparo para data específica', async () => {
      const agendamento: AgendamentoDisparo = {
        empresaId: 'empresa-1',
        colaboradorIds: ['colab-1', 'colab-2'],
        templateId: 'template-1',
        dataAgendamento: new Date('2024-04-15'),
        observacoes: 'Agendamento de teste'
      };

      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any)
        .mockReturnValueOnce({ insert: mockInsert })
        .mockReturnValueOnce({ upsert: mockUpsert });

      await booksDisparoService.agendarDisparo(agendamento);

      expect(mockInsert).toHaveBeenCalledWith([
        {
          empresa_id: 'empresa-1',
          colaborador_id: 'colab-1',
          template_id: 'template-1',
          status: 'agendado',
          data_agendamento: agendamento.dataAgendamento.toISOString(),
          erro_detalhes: 'Agendamento de teste'
        },
        {
          empresa_id: 'empresa-1',
          colaborador_id: 'colab-2',
          template_id: 'template-1',
          status: 'agendado',
          data_agendamento: agendamento.dataAgendamento.toISOString(),
          erro_detalhes: 'Agendamento de teste'
        }
      ]);
    });

    it('deve tratar erro ao agendar disparo', async () => {
      const agendamento: AgendamentoDisparo = {
        empresaId: 'empresa-1',
        colaboradorIds: ['colab-1'],
        templateId: 'template-1',
        dataAgendamento: new Date('2024-04-15')
      };

      const mockInsert = vi.fn().mockResolvedValue({ 
        error: { message: 'Erro de inserção' } 
      });

      (supabase.from as any).mockReturnValue({ insert: mockInsert });

      await expect(booksDisparoService.agendarDisparo(agendamento))
        .rejects
        .toThrow('Erro ao agendar disparo: Erro ao agendar disparo: Erro de inserção');
    });
  });

  describe('obterStatusMensal', () => {
    it('deve retornar status mensal de todas as empresas', async () => {
      const mes = 3;
      const ano = 2024;

      const controlesMock = [
        {
          id: 'controle-1',
          mes: 3,
          ano: 2024,
          empresa_id: 'empresa-1',
          status: 'enviado',
          data_processamento: '2024-03-15T10:00:00Z',
          empresas_clientes: {
            id: 'empresa-1',
            nome_completo: 'Empresa Teste 1',
            status: 'ativo'
          }
        }
      ];

      const empresasMock = [
        {
          id: 'empresa-1',
          nome_completo: 'Empresa Teste 1',
          status: 'ativo'
        },
        {
          id: 'empresa-2',
          nome_completo: 'Empresa Teste 2',
          status: 'ativo'
        }
      ];

      // Mock para buscar controles mensais
      const mockControlesQuery = {
        eq: vi.fn().mockReturnThis()
      };
      mockControlesQuery.eq.mockResolvedValue({ 
        data: controlesMock, 
        error: null 
      });

      // Mock para buscar todas as empresas
      const mockEmpresasQuery = {
        eq: vi.fn().mockResolvedValue({ data: empresasMock, error: null })
      };

      // Mock para contar colaboradores ativos
      const mockCountColaboradores = {
        eq: vi.fn().mockReturnThis(),
        count: 'exact',
        head: true
      };

      // Mock para contar e-mails enviados
      const mockCountEmails = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        count: 'exact',
        head: true
      };

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockControlesQuery) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmpresasQuery) })
        .mockReturnValue({ 
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 5 })
            }),
            gte: vi.fn().mockReturnValue({
              lt: vi.fn().mockResolvedValue({ count: 3 })
            })
          })
        });

      const resultado = await booksDisparoService.obterStatusMensal(mes, ano);

      expect(resultado).toHaveLength(2);
      expect(resultado[0].empresaId).toBe('empresa-1');
      expect(resultado[0].status).toBe('enviado');
      expect(resultado[1].empresaId).toBe('empresa-2');
      expect(resultado[1].status).toBe('pendente');
    });

    it('deve tratar erro ao buscar status mensal', async () => {
      const mockControlesQuery = {
        eq: vi.fn().mockReturnThis()
      };
      mockControlesQuery.eq.mockResolvedValue({ 
        data: null, 
        error: { message: 'Erro de consulta' } 
      });

      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue(mockControlesQuery) 
      });

      await expect(booksDisparoService.obterStatusMensal(3, 2024))
        .rejects
        .toThrow('Erro ao obter status mensal: Erro ao buscar status mensal: Erro de consulta');
    });
  });

  describe('reenviarFalhas', () => {
    it('deve reenviar disparos que falharam', async () => {
      const mes = 3;
      const ano = 2024;

      const controlesFalhaMock = [
        {
          id: 'controle-1',
          mes: 3,
          ano: 2024,
          empresa_id: 'empresa-1',
          status: 'falhou',
          empresas_clientes: {
            id: 'empresa-1',
            nome_completo: 'Empresa Teste 1',
            template_padrao: 'portugues',
            email_gestor: 'gestor@empresa.com'
          }
        }
      ];

      const colaboradoresMock = [
        {
          id: 'colab-1',
          nome_completo: 'João Silva',
          email: 'joao@empresa.com',
          status: 'ativo'
        }
      ];

      // Mock para buscar controles com falha
      const mockControlesQuery = {
        eq: vi.fn().mockReturnThis()
      };
      mockControlesQuery.eq.mockResolvedValue({ 
        data: controlesFalhaMock, 
        error: null 
      });

      // Mock para buscar colaboradores
      const mockColaboradoresQuery = {
        eq: vi.fn().mockReturnThis()
      };
      mockColaboradoresQuery.eq.mockResolvedValue({
        data: colaboradoresMock,
        error: null
      });

      // Mock para buscar grupos
      const mockGruposQuery = {
        eq: vi.fn().mockResolvedValue({ data: [], error: null })
      };

      // Mock para template service
      const templateMock = {
        id: 'template-1',
        assunto: 'Book Mensal',
        corpo: 'Conteúdo do book'
      };

      (clientBooksTemplateService.buscarTemplateBooks as any).mockResolvedValue(templateMock);
      (clientBooksTemplateService.validarTemplate as any).mockReturnValue({ valido: true });
      (clientBooksTemplateService.processarTemplate as any).mockResolvedValue({
        assunto: 'Book Mensal - Empresa Teste 1',
        corpo: 'Olá João Silva'
      });

      // Mock para email service
      (emailService.sendEmail as any).mockResolvedValue({ success: true });

      // Mock para inserções
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockControlesQuery) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockColaboradoresQuery) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockGruposQuery) })
        .mockReturnValueOnce({ insert: mockInsert })
        .mockReturnValueOnce({ upsert: mockUpsert });

      const resultado = await booksDisparoService.reenviarFalhas(mes, ano);

      expect(resultado.total).toBe(1);
      expect(resultado.sucesso).toBeGreaterThanOrEqual(0);
      expect(emailService.sendEmail).toHaveBeenCalled();
    });

    it('deve retornar resultado vazio quando não há falhas', async () => {
      const mockControlesQuery = {
        eq: vi.fn().mockReturnThis()
      };
      mockControlesQuery.eq.mockResolvedValue({ 
        data: [], 
        error: null 
      });

      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue(mockControlesQuery) 
      });

      const resultado = await booksDisparoService.reenviarFalhas(3, 2024);

      expect(resultado).toEqual({
        sucesso: 0,
        falhas: 0,
        total: 0,
        detalhes: []
      });
    });
  });

  describe('buscarHistorico', () => {
    it('deve buscar histórico com filtros', async () => {
      const filtros: HistoricoFiltros = {
        empresaId: 'empresa-1',
        status: ['enviado'],
        mes: 3,
        ano: 2024
      };

      const historicoMock = [
        {
          id: 'hist-1',
          empresa_id: 'empresa-1',
          colaborador_id: 'colab-1',
          status: 'enviado',
          data_disparo: '2024-03-15T10:00:00Z',
          empresas_clientes: {
            id: 'empresa-1',
            nome_completo: 'Empresa Teste'
          },
          colaboradores: {
            id: 'colab-1',
            nome_completo: 'João Silva'
          }
        }
      ];

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: historicoMock, error: null })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const resultado = await booksDisparoService.buscarHistorico(filtros);

      expect(resultado).toEqual(historicoMock);
      expect(mockQuery.eq).toHaveBeenCalledWith('empresa_id', 'empresa-1');
      expect(mockQuery.in).toHaveBeenCalledWith('status', ['enviado']);
    });

    it('deve tratar erro ao buscar histórico', async () => {
      const mockQuery = {
        order: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Erro de consulta' } 
        })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      await expect(booksDisparoService.buscarHistorico({}))
        .rejects
        .toThrow('Erro ao buscar histórico: Erro ao buscar histórico: Erro de consulta');
    });
  });

  describe('buscarControlesMensais', () => {
    it('deve buscar controles mensais com filtros', async () => {
      const filtros: ControleMensalFiltros = {
        mes: 3,
        ano: 2024,
        status: ['enviado', 'falhou']
      };

      const controlesMock = [
        {
          id: 'controle-1',
          mes: 3,
          ano: 2024,
          status: 'enviado',
          empresas_clientes: {
            id: 'empresa-1',
            nome_completo: 'Empresa Teste'
          }
        }
      ];

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: controlesMock, error: null })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const resultado = await booksDisparoService.buscarControlesMensais(filtros);

      expect(resultado).toEqual(controlesMock);
      expect(mockQuery.eq).toHaveBeenCalledWith('mes', 3);
      expect(mockQuery.eq).toHaveBeenCalledWith('ano', 2024);
      expect(mockQuery.in).toHaveBeenCalledWith('status', ['enviado', 'falhou']);
    });

    it('deve tratar erro ao buscar controles mensais', async () => {
      const mockQuery = {
        order: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Erro de consulta' } 
        })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      await expect(booksDisparoService.buscarControlesMensais({}))
        .rejects
        .toThrow('Erro ao buscar controles mensais: Erro ao buscar controles mensais: Erro de consulta');
    });
  });
});