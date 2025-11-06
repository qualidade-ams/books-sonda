import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { faturamentoService, FaturamentoService } from '../faturamentoService';
import { emailService } from '../emailService';
import { supabase } from '@/integrations/supabase/client';
import type { Requerimento, EmailFaturamento } from '@/types/requerimentos';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lt: vi.fn(() => ({
                order: vi.fn(() => ({
                  order: vi.fn(() => Promise.resolve({ data: [], error: null }))
                }))
              }))
            }))
          }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({
        in: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }))
  }
}));

// Mock do emailService
vi.mock('../emailService', () => ({
  emailService: {
    sendEmail: vi.fn()
  }
}));

describe('FaturamentoService', () => {
  let service: FaturamentoService;

  const mockRequerimentos: Requerimento[] = [
    {
      id: '1',
      chamado: 'RF-001',
      cliente_id: 'cliente-1',
      cliente_nome: 'Cliente Teste 1',
      modulo: 'Comply',
      descricao: 'Teste 1',
      data_envio: '2024-01-15',
      data_aprovacao: '2024-01-16',
      horas_funcional: 10,
      horas_tecnico: 5,
      horas_total: 15,
      linguagem: 'ABAP',
      tipo_cobranca: 'Faturado',
      mes_cobranca: '01/2024',
      observacao: 'Teste',
      status: 'enviado_faturamento',
      enviado_faturamento: true,
      data_envio_faturamento: '2024-01-20T10:00:00Z',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-20T10:00:00Z'
    },
    {
      id: '2',
      chamado: 'RF-002',
      cliente_id: 'cliente-2',
      cliente_nome: 'Cliente Teste 2',
      modulo: 'pw.SATI',
      descricao: 'Teste 2',
      data_envio: '2024-01-16',
      data_aprovacao: '2024-01-17',
      horas_funcional: 8,
      horas_tecnico: 12,
      horas_total: 20,
      linguagem: 'Funcional',
      tipo_cobranca: 'Banco de Horas',
      mes_cobranca: '01/2024',
      status: 'enviado_faturamento',
      enviado_faturamento: true,
      data_envio_faturamento: '2024-01-21T10:00:00Z',
      created_at: '2024-01-16T10:00:00Z',
      updated_at: '2024-01-21T10:00:00Z'
    }
  ];

  beforeEach(() => {
    service = new FaturamentoService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('buscarRequerimentosParaFaturamento', () => {
    it('deve buscar requerimentos para faturamento corretamente', async () => {
      const mockSupabaseResponse = {
        data: mockRequerimentos.map(req => ({
          ...req,
          empresas_clientes: { nome_completo: req.cliente_nome }
        })),
        error: null
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue(mockSupabaseResponse)
                  })
                })
              })
            })
          })
        })
      } as any);

      const resultado = await service.buscarRequerimentosParaFaturamento(1, 2024);

      expect(resultado).toHaveLength(2);
      expect(resultado[0].cliente_nome).toBe('Cliente Teste 1');
      expect(resultado[1].cliente_nome).toBe('Cliente Teste 2');
    });

    it('deve tratar erro na busca de requerimentos', async () => {
      const mockError = { message: 'Erro de conexão' };
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: null, error: mockError })
                  })
                })
              })
            })
          })
        })
      } as any);

      await expect(service.buscarRequerimentosParaFaturamento(1, 2024))
        .rejects.toThrow('Erro ao buscar requerimentos para faturamento: Erro de conexão');
    });
  });

  describe('agruparRequerimentosPorTipo', () => {
    it('deve agrupar requerimentos por tipo de cobrança corretamente', () => {
      const grupos = service.agruparRequerimentosPorTipo(mockRequerimentos);

      expect(grupos['Faturado'].quantidade).toBe(1);
      expect(grupos['Faturado'].horas_total).toBe(15);
      expect(grupos['Faturado'].requerimentos).toHaveLength(1);

      expect(grupos['Banco de Horas'].quantidade).toBe(1);
      expect(grupos['Banco de Horas'].horas_total).toBe(20);
      expect(grupos['Banco de Horas'].requerimentos).toHaveLength(1);

      expect(grupos['Contrato'].quantidade).toBe(0);
      expect(grupos['Contrato'].horas_total).toBe(0);
      expect(grupos['Contrato'].requerimentos).toHaveLength(0);
    });

    it('deve retornar grupos vazios quando não há requerimentos', () => {
      const grupos = service.agruparRequerimentosPorTipo([]);

      Object.values(grupos).forEach(grupo => {
        expect(grupo.quantidade).toBe(0);
        expect(grupo.horas_total).toBe(0);
        expect(grupo.requerimentos).toHaveLength(0);
      });
    });
  });

  describe('calcularTotaisPorCategoria', () => {
    it('deve calcular totais e percentuais corretamente', () => {
      const totais = service.calcularTotaisPorCategoria(mockRequerimentos);

      expect(totais.total_requerimentos).toBe(2);
      expect(totais.total_horas).toBe(35); // 15 + 20

      expect(totais.tipos_cobranca['Faturado'].quantidade).toBe(1);
      expect(totais.tipos_cobranca['Faturado'].horas).toBe(15);
      expect(totais.tipos_cobranca['Faturado'].percentual).toBeCloseTo(42.86, 2); // 15/35 * 100

      expect(totais.tipos_cobranca['Banco de Horas'].quantidade).toBe(1);
      expect(totais.tipos_cobranca['Banco de Horas'].horas).toBe(20);
      expect(totais.tipos_cobranca['Banco de Horas'].percentual).toBeCloseTo(57.14, 2); // 20/35 * 100
    });

    it('deve retornar percentuais zero quando não há horas', () => {
      const totais = service.calcularTotaisPorCategoria([]);

      expect(totais.total_requerimentos).toBe(0);
      expect(totais.total_horas).toBe(0);

      Object.values(totais.tipos_cobranca).forEach(tipo => {
        expect(tipo.percentual).toBe(0);
      });
    });
  });

  describe('gerarRelatorioFaturamento', () => {
    it('deve gerar relatório completo corretamente', async () => {
      const mockSupabaseResponse = {
        data: mockRequerimentos.map(req => ({
          ...req,
          empresas_clientes: { nome_completo: req.cliente_nome }
        })),
        error: null
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue(mockSupabaseResponse)
                  })
                })
              })
            })
          })
        })
      } as any);

      const relatorio = await service.gerarRelatorioFaturamento(1, 2024);

      expect(relatorio.periodo).toBe('Janeiro de 2024');
      expect(relatorio.mes_cobranca).toBe('01/2024');
      expect(relatorio.ano_cobranca).toBe(2024);
      expect(relatorio.totais_gerais.total_requerimentos).toBe(2);
      expect(relatorio.totais_gerais.total_horas).toBe(35);
      expect(relatorio.requerimentos_por_tipo['Faturado'].quantidade).toBe(1);
      expect(relatorio.requerimentos_por_tipo['Banco de Horas'].quantidade).toBe(1);
    });
  });

  describe('criarTemplateEmailFaturamento', () => {
    it('deve criar template HTML válido', async () => {
      const mockSupabaseResponse = {
        data: mockRequerimentos.map(req => ({
          ...req,
          empresas_clientes: { nome_completo: req.cliente_nome }
        })),
        error: null
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue(mockSupabaseResponse)
                  })
                })
              })
            })
          })
        })
      } as any);

      const relatorio = await service.gerarRelatorioFaturamento(1, 2024);
      const template = service.criarTemplateEmailFaturamento(relatorio);

      expect(template).toContain('<!DOCTYPE html>');
      expect(template).toContain('Relatório de Faturamento');
      expect(template).toContain('Janeiro de 2024');
      expect(template).toContain('RF-001');
      expect(template).toContain('RF-002');
      expect(template).toContain('Cliente Teste 1');
      expect(template).toContain('Cliente Teste 2');
      expect(template).toContain('Faturado');
      expect(template).toContain('Banco de Horas');
    });

    it('deve mostrar mensagem quando não há requerimentos', async () => {
      const relatorioVazio = {
        periodo: 'Janeiro de 2024',
        mes_cobranca: '01/2024',
        ano_cobranca: 2024,
        requerimentos_por_tipo: {
          'Banco de Horas': { quantidade: 0, horas_total: 0, requerimentos: [] },
          'Cobro Interno': { quantidade: 0, horas_total: 0, requerimentos: [] },
          'Contrato': { quantidade: 0, horas_total: 0, requerimentos: [] },
          'Faturado': { quantidade: 0, horas_total: 0, requerimentos: [] },
          'Hora Extra': { quantidade: 0, horas_total: 0, requerimentos: [] },
          'Sobreaviso': { quantidade: 0, horas_total: 0, requerimentos: [] },
          'Reprovado': { quantidade: 0, horas_total: 0, requerimentos: [] },
          'Bolsão Enel': { quantidade: 0, horas_total: 0, requerimentos: [] }
        },
        totais_gerais: {
          total_requerimentos: 0,
          total_horas: 0,
          total_faturado: 0
        }
      };

      const template = service.criarTemplateEmailFaturamento(relatorioVazio);

      expect(template).toContain('Nenhum requerimento encontrado para faturamento');
    });
  });

  describe('dispararFaturamento', () => {
    it('deve disparar faturamento com sucesso', async () => {
      vi.mocked(emailService.sendEmail).mockResolvedValue({
        success: true,
        message: 'Email enviado com sucesso'
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null })
      } as any);

      const emailFaturamento: EmailFaturamento = {
        destinatarios: ['teste@exemplo.com'],
        assunto: 'Relatório de Faturamento - Janeiro 2024',
        corpo: '<html><body>Teste</body></html>'
      };

      const resultado = await service.dispararFaturamento(emailFaturamento);

      expect(resultado.success).toBe(true);
      expect(resultado.message).toContain('enviado com sucesso');
      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: ['teste@exemplo.com'],
        subject: 'Relatório de Faturamento - Janeiro 2024',
        html: '<html><body>Teste</body></html>',
        attachments: undefined
      });
    });

    it('deve validar destinatários obrigatórios', async () => {
      const emailFaturamento: EmailFaturamento = {
        destinatarios: [],
        assunto: 'Teste',
        corpo: 'Teste'
      };

      const resultado = await service.dispararFaturamento(emailFaturamento);

      expect(resultado.success).toBe(false);
      expect(resultado.error).toContain('pelo menos um destinatário');
    });

    it('deve validar formato de email', async () => {
      const emailFaturamento: EmailFaturamento = {
        destinatarios: ['email-invalido'],
        assunto: 'Teste',
        corpo: 'Teste'
      };

      const resultado = await service.dispararFaturamento(emailFaturamento);

      expect(resultado.success).toBe(false);
      expect(resultado.error).toContain('E-mails inválidos');
    });

    it('deve tratar erro no envio de email', async () => {
      vi.mocked(emailService.sendEmail).mockResolvedValue({
        success: false,
        error: 'Erro no servidor de email'
      });

      const emailFaturamento: EmailFaturamento = {
        destinatarios: ['teste@exemplo.com'],
        assunto: 'Teste',
        corpo: 'Teste'
      };

      const resultado = await service.dispararFaturamento(emailFaturamento);

      expect(resultado.success).toBe(false);
      expect(resultado.error).toContain('Erro no servidor de email');
    });
  });



  describe('buscarEstatisticasFaturamento', () => {
    it('deve buscar estatísticas por período', async () => {
      const mockData = [
        { tipo_cobranca: 'Faturado', horas_total: 15 },
        { tipo_cobranca: 'Banco de Horas', horas_total: 20 }
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lt: vi.fn().mockResolvedValue({ data: mockData, error: null })
                })
              })
            })
          })
        })
      } as any);

      const estatisticas = await service.buscarEstatisticasFaturamento(1, 2024, 12, 2024);

      expect(estatisticas.total_requerimentos).toBe(2);
      expect(estatisticas.total_horas).toBe(35);
      expect(estatisticas.tipos_cobranca['Faturado'].horas).toBe(15);
      expect(estatisticas.tipos_cobranca['Banco de Horas'].horas).toBe(20);
    });
  });
});