import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { historicoService } from '../historicoService';
import { supabase } from '@/integrations/supabase/client';
import type { FiltrosAvancados, ExportacaoConfig } from '../historicoService';

// Mock do Supabase
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
          lte: vi.fn(() => ({
            order: vi.fn()
          })),
          lt: vi.fn(() => ({
            order: vi.fn()
          })),
          order: vi.fn()
        })),
        lte: vi.fn(() => ({
          order: vi.fn()
        })),
        neq: vi.fn(() => ({
          order: vi.fn()
        })),
        order: vi.fn(),
        count: 'exact',
        head: true
      })),
      insert: vi.fn(),
      update: vi.fn(() => ({
        eq: vi.fn()
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      }))
    }))
  }
}));

describe('HistoricoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('buscarHistoricoDetalhado', () => {
    const historicoMock = [
      {
        id: 'hist-1',
        empresa_id: 'empresa-1',
        colaborador_id: 'colab-1',
        status: 'enviado',
        data_disparo: '2024-03-15T10:00:00Z',
        empresas_clientes: {
          id: 'empresa-1',
          nome_completo: 'Empresa Teste',
          status: 'ativo'
        },
        colaboradores: {
          id: 'colab-1',
          nome_completo: 'João Silva',
          status: 'ativo'
        }
      },
      {
        id: 'hist-2',
        empresa_id: 'empresa-2',
        colaborador_id: 'colab-2',
        status: 'falhou',
        data_disparo: '2024-03-14T09:00:00Z',
        empresas_clientes: {
          id: 'empresa-2',
          nome_completo: 'Empresa Inativa',
          status: 'inativo'
        },
        colaboradores: {
          id: 'colab-2',
          nome_completo: 'Maria Santos',
          status: 'inativo'
        }
      }
    ];

    it('deve buscar histórico com filtros básicos', async () => {
      const filtros: FiltrosAvancados = {
        empresaId: 'empresa-1',
        status: ['enviado'],
        dataInicio: new Date('2024-03-01'),
        dataFim: new Date('2024-03-31')
      };

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: historicoMock, error: null })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const resultado = await historicoService.buscarHistoricoDetalhado(filtros);

      expect(resultado).toEqual(historicoMock);
      expect(mockQuery.eq).toHaveBeenCalledWith('empresa_id', 'empresa-1');
      expect(mockQuery.in).toHaveBeenCalledWith('status', ['enviado']);
      expect(mockQuery.gte).toHaveBeenCalledWith('data_disparo', filtros.dataInicio!.toISOString());
      expect(mockQuery.lte).toHaveBeenCalledWith('data_disparo', filtros.dataFim!.toISOString());
    });

    it('deve aplicar filtro por mês e ano específico', async () => {
      const filtros: FiltrosAvancados = {
        mes: 3,
        ano: 2024
      };

      const mockQuery = {
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: historicoMock, error: null })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const resultado = await historicoService.buscarHistoricoDetalhado(filtros);

      expect(resultado).toEqual(historicoMock);
      expect(mockQuery.gte).toHaveBeenCalledWith('data_disparo', '2024-02-29T21:00:00.000Z');
      expect(mockQuery.lte).toHaveBeenCalledWith('data_disparo', '2024-03-30T20:59:59.000Z');
    });

    it('deve filtrar apenas sucessos quando apenasComSucesso for true', async () => {
      const filtros: FiltrosAvancados = {
        apenasComSucesso: true
      };

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: historicoMock, error: null })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      await historicoService.buscarHistoricoDetalhado(filtros);

      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'enviado');
    });

    it('deve filtrar apenas falhas quando apenasComFalhas for true', async () => {
      const filtros: FiltrosAvancados = {
        apenasComFalhas: true
      };

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: historicoMock, error: null })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      await historicoService.buscarHistoricoDetalhado(filtros);

      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'falhou');
    });

    it('deve excluir inativos quando incluirInativos for false', async () => {
      const filtros: FiltrosAvancados = {
        incluirInativos: false
      };

      const mockQuery = {
        order: vi.fn().mockResolvedValue({ data: historicoMock, error: null })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const resultado = await historicoService.buscarHistoricoDetalhado(filtros);

      // Deve retornar apenas o primeiro item (ativo)
      expect(resultado).toHaveLength(1);
      expect(resultado[0].empresas_clientes?.status).toBe('ativo');
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

      await expect(historicoService.buscarHistoricoDetalhado({}))
        .rejects
        .toThrow('Erro ao buscar histórico detalhado: Erro de consulta');
    });
  });

  describe('gerarRelatorioMensal', () => {
    it('deve gerar relatório completo para um mês', async () => {
      const mes = 3;
      const ano = 2024;

      // Mock para métricas
      const mockCountQueries = {
        count: 'exact',
        head: true
      };

      // Mock para empresas ativas
      const empresasAtivasMock = [
        { id: 'empresa-1', nome_completo: 'Empresa 1', status: 'ativo' },
        { id: 'empresa-2', nome_completo: 'Empresa 2', status: 'ativo' }
      ];

      // Mock para histórico
      const historicoMock = [
        {
          id: 'hist-1',
          status: 'enviado',
          data_disparo: '2024-03-15T10:00:00Z'
        }
      ];

      // Mock para controles mensais
      const controlesMock = [
        {
          id: 'controle-1',
          mes: 3,
          ano: 2024,
          status: 'enviado'
        }
      ];

      // Configurar mocks para diferentes consultas
      (supabase.from as any)
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue({ count: 10 }) 
        })
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 8 })
          })
        })
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue({ count: 15 }) 
        })
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 12 })
          })
        })
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({ count: 5 })
              })
            })
          })
        })
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({ count: 1 })
              })
            })
          })
        })
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: empresasAtivasMock, error: null })
          })
        })
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({ data: [], error: null })
              })
            })
          })
        })
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: historicoMock, error: null })
          })
        })
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: controlesMock, error: null })
          })
        });

      const resultado = await historicoService.gerarRelatorioMensal(mes, ano);

      expect(resultado.mes).toBe(mes);
      expect(resultado.ano).toBe(ano);
      expect(resultado.metricas).toBeDefined();
      expect(resultado.historico).toEqual(historicoMock);
      expect(resultado.controlesMensais).toEqual(controlesMock);
    });

    it('deve tratar erro ao gerar relatório', async () => {
      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue({
          count: vi.fn().mockRejectedValue(new Error('Erro de banco'))
        })
      });

      await expect(historicoService.gerarRelatorioMensal(3, 2024))
        .rejects
        .toThrow('Erro ao gerar relatório mensal');
    });
  });

  describe('calcularMetricasMensais', () => {
    it('deve calcular métricas corretamente', async () => {
      const mes = 3;
      const ano = 2024;

      // Mock para contadores
      (supabase.from as any)
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue({ count: 10 }) 
        })
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 8 })
          })
        })
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue({ count: 25 }) 
        })
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 20 })
          })
        })
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({ count: 15 })
              })
            })
          })
        })
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({ count: 3 })
              })
            })
          })
        })
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null })
          })
        })
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({ data: [], error: null })
              })
            })
          })
        });

      const resultado = await historicoService.calcularMetricasMensais(mes, ano);

      expect(resultado.totalEmpresas).toBe(10);
      expect(resultado.empresasAtivas).toBe(8);
      expect(resultado.totalColaboradores).toBe(25);
      expect(resultado.colaboradoresAtivos).toBe(20);
      expect(resultado.emailsEnviadosMes).toBe(15);
      expect(resultado.emailsFalharamMes).toBe(3);
      expect(resultado.taxaSucessoMes).toBe(83.33);
      expect(resultado.empresasSemBooks).toEqual([]);
    });

    it('deve calcular taxa de sucesso como 0 quando não há e-mails', async () => {
      // Mock para contadores zerados
      (supabase.from as any)
        .mockReturnValue({ 
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({ count: 0 })
              })
            }),
            count: 0
          })
        });

      const resultado = await historicoService.calcularMetricasMensais(3, 2024);

      expect(resultado.taxaSucessoMes).toBe(0);
    });
  });

  describe('identificarEmpresasSemBooks', () => {
    it('deve identificar empresas que não receberam books', async () => {
      const empresasAtivasMock = [
        { id: 'empresa-1', nome_completo: 'Empresa 1' },
        { id: 'empresa-2', nome_completo: 'Empresa 2' },
        { id: 'empresa-3', nome_completo: 'Empresa 3' }
      ];

      const disparosMock = [
        { empresa_id: 'empresa-1' },
        { empresa_id: 'empresa-1' }
      ];

      (supabase.from as any)
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: empresasAtivasMock, error: null })
          })
        })
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({ data: disparosMock, error: null })
              })
            })
          })
        });

      const resultado = await historicoService.identificarEmpresasSemBooks(3, 2024);

      expect(resultado).toHaveLength(2);
      expect(resultado.map(e => e.id)).toEqual(['empresa-2', 'empresa-3']);
    });

    it('deve retornar array vazio quando não há empresas ativas', async () => {
      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      });

      const resultado = await historicoService.identificarEmpresasSemBooks(3, 2024);

      expect(resultado).toEqual([]);
    });
  });

  describe('buscarEstatisticasPerformance', () => {
    it('deve calcular estatísticas de performance', async () => {
      const dataInicio = new Date('2024-03-01');
      const dataFim = new Date('2024-03-31');

      const disparosMock = [
        { id: '1', status: 'enviado', empresa_id: 'emp-1', colaborador_id: 'col-1' },
        { id: '2', status: 'enviado', empresa_id: 'emp-1', colaborador_id: 'col-2' },
        { id: '3', status: 'falhou', empresa_id: 'emp-2', colaborador_id: 'col-3' },
        { id: '4', status: 'enviado', empresa_id: 'emp-2', colaborador_id: 'col-1' }
      ];

      const mockQuery = {
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: disparosMock, error: null })
      };

      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue(mockQuery) 
      });

      const resultado = await historicoService.buscarEstatisticasPerformance(dataInicio, dataFim);

      expect(resultado.totalDisparos).toBe(4);
      expect(resultado.sucessos).toBe(3);
      expect(resultado.falhas).toBe(1);
      expect(resultado.taxaSucesso).toBe(75);
      expect(resultado.empresasAtendidas).toBe(2);
      expect(resultado.colaboradoresAtendidos).toBe(3);
      expect(resultado.mediaDisparosPorDia).toBeGreaterThan(0);
    });

    it('deve retornar estatísticas zeradas quando não há disparos', async () => {
      const mockQuery = {
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: [], error: null })
      };

      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue(mockQuery) 
      });

      const resultado = await historicoService.buscarEstatisticasPerformance(
        new Date('2024-03-01'), 
        new Date('2024-03-31')
      );

      expect(resultado.totalDisparos).toBe(0);
      expect(resultado.sucessos).toBe(0);
      expect(resultado.falhas).toBe(0);
      expect(resultado.taxaSucesso).toBe(0);
      expect(resultado.empresasAtendidas).toBe(0);
      expect(resultado.colaboradoresAtendidos).toBe(0);
      expect(resultado.mediaDisparosPorDia).toBe(0);
    });
  });

  describe('buscarHistoricoEmpresa', () => {
    it('deve retornar histórico completo da empresa', async () => {
      const empresaMock = {
        id: 'empresa-1',
        nome_completo: 'Empresa Teste',
        status: 'ativo'
      };

      const historicoMock = [
        {
          id: 'hist-1',
          status: 'enviado',
          data_disparo: '2024-03-15T10:00:00Z'
        },
        {
          id: 'hist-2',
          status: 'falhou',
          data_disparo: '2024-03-10T09:00:00Z'
        }
      ];

      (supabase.from as any)
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: empresaMock, error: null })
            })
          })
        })
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: historicoMock, error: null })
          })
        });

      const resultado = await historicoService.buscarHistoricoEmpresa('empresa-1', 6);

      expect(resultado.empresa).toEqual(empresaMock);
      expect(resultado.historico).toEqual(historicoMock);
      expect(resultado.estatisticas.totalEnvios).toBe(2);
      expect(resultado.estatisticas.sucessos).toBe(1);
      expect(resultado.estatisticas.falhas).toBe(1);
      expect(resultado.estatisticas.taxaSucesso).toBe(50);
      expect(resultado.estatisticas.ultimoEnvio).toEqual(new Date('2024-03-15T10:00:00Z'));
    });

    it('deve lançar erro quando empresa não for encontrada', async () => {
      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
          })
        })
      });

      await expect(historicoService.buscarHistoricoEmpresa('inexistente'))
        .rejects
        .toThrow('Erro ao buscar histórico da empresa: Empresa não encontrada: Not found');
    });
  });

  describe('buscarColaboradoresComFalhas', () => {
    it('deve retornar colaboradores com mais falhas', async () => {
      const falhasMock = [
        {
          colaborador_id: 'colab-1',
          data_disparo: '2024-03-15T10:00:00Z',
          colaboradores: {
            id: 'colab-1',
            nome_completo: 'João Silva'
          },
          empresas_clientes: {
            id: 'empresa-1',
            nome_completo: 'Empresa 1'
          }
        },
        {
          colaborador_id: 'colab-1',
          data_disparo: '2024-03-10T09:00:00Z',
          colaboradores: {
            id: 'colab-1',
            nome_completo: 'João Silva'
          },
          empresas_clientes: {
            id: 'empresa-1',
            nome_completo: 'Empresa 1'
          }
        },
        {
          colaborador_id: 'colab-2',
          data_disparo: '2024-03-12T11:00:00Z',
          colaboradores: {
            id: 'colab-2',
            nome_completo: 'Maria Santos'
          },
          empresas_clientes: {
            id: 'empresa-2',
            nome_completo: 'Empresa 2'
          }
        }
      ];

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: falhasMock, error: null })
      };

      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue(mockQuery) 
      });

      const resultado = await historicoService.buscarColaboradoresComFalhas(5, 3);

      expect(resultado).toHaveLength(2);
      expect(resultado[0].colaborador.nome_completo).toBe('João Silva');
      expect(resultado[0].totalFalhas).toBe(2);
      expect(resultado[1].colaborador.nome_completo).toBe('Maria Santos');
      expect(resultado[1].totalFalhas).toBe(1);
    });

    it('deve retornar array vazio quando não há falhas', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null })
      };

      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue(mockQuery) 
      });

      const resultado = await historicoService.buscarColaboradoresComFalhas(5, 3);

      expect(resultado).toEqual([]);
    });
  });

  describe('exportarDados', () => {
    it('deve exportar dados com detalhes', async () => {
      const config: ExportacaoConfig = {
        formato: 'csv',
        incluirDetalhes: true,
        incluirMetricas: false,
        filtros: {
          mes: 3,
          ano: 2024
        }
      };

      const historicoMock = [
        {
          id: 'hist-1',
          data_disparo: '2024-03-15T10:00:00Z',
          status: 'enviado',
          assunto: 'Book Mensal',
          erro_detalhes: null,
          emails_cc: ['cc@empresa.com'],
          empresas_clientes: {
            nome_completo: 'Empresa Teste'
          },
          colaboradores: {
            nome_completo: 'João Silva',
            email: 'joao@empresa.com'
          }
        }
      ];

      const mockQuery = {
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: historicoMock, error: null })
      };

      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue(mockQuery) 
      });

      const resultado = await historicoService.exportarDados(config);

      expect(resultado.dados).toHaveLength(1);
      expect(resultado.dados[0]['Empresa']).toBe('Empresa Teste');
      expect(resultado.dados[0]['Colaborador']).toBe('João Silva');
      expect(resultado.dados[0]['Status']).toBe('Enviado');
      expect(resultado.nomeArquivo).toContain('historico_books_');
      expect(resultado.tipo).toBe('csv');
    });

    it('deve incluir métricas quando solicitado', async () => {
      const config: ExportacaoConfig = {
        formato: 'excel',
        incluirDetalhes: true,
        incluirMetricas: true,
        filtros: {
          mes: 3,
          ano: 2024
        }
      };

      // Mock para histórico
      const mockHistoricoQuery = {
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null })
      };

      // Mock para métricas
      (supabase.from as any)
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue(mockHistoricoQuery) 
        })
        .mockReturnValue({ 
          select: vi.fn().mockReturnValue({ count: 0 }) 
        });

      const resultado = await historicoService.exportarDados(config);

      expect(resultado.dados[0]['Data Disparo']).toBe('MÉTRICAS DO MÊS');
      expect(resultado.tipo).toBe('excel');
    });
  });

  describe('Métodos auxiliares', () => {
    it('deve formatar status corretamente', () => {
      const service = historicoService as any;
      
      expect(service.formatarStatus('enviado')).toBe('Enviado');
      expect(service.formatarStatus('falhou')).toBe('Falhou');
      expect(service.formatarStatus('agendado')).toBe('Agendado');
      expect(service.formatarStatus('cancelado')).toBe('Cancelado');
      expect(service.formatarStatus('status_desconhecido')).toBe('status_desconhecido');
    });
  });
});