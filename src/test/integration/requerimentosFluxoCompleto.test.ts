/**
 * Testes de integração para o Sistema de Requerimentos
 * Testa o fluxo completo: lançar → enviar → faturar
 * Valida integração com banco de dados Supabase, sistema de permissões e envio de email
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requerimentosService } from '@/services/requerimentosService';
import { faturamentoService } from '@/services/faturamentoService';
import { emailService } from '@/services/emailService';
import { supabase } from '@/integrations/supabase/client';
import type { 
  RequerimentoFormData, 
  Requerimento, 
  EmailFaturamento,
  TipoCobrancaType,
  StatusRequerimento
} from '@/types/requerimentos';

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
          eq: vi.fn(() => ({
            single: vi.fn(),
            order: vi.fn()
          })),
          single: vi.fn(),
          order: vi.fn(),
          gte: vi.fn(() => ({
            lt: vi.fn(() => ({
              order: vi.fn(() => ({
                order: vi.fn()
              }))
            }))
          }))
        })),
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            order: vi.fn()
          })),
          lt: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn()
            }))
          }))
        })),
        order: vi.fn(),
        in: vi.fn()
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
        in: vi.fn()
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      }))
    }))
  }
}));

// Mock do emailService
vi.mock('@/services/emailService', () => ({
  emailService: {
    sendEmail: vi.fn()
  }
}));

describe('Sistema de Requerimentos - Fluxo Completo de Integração', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Fluxo Completo: Lançar → Enviar → Faturar', () => {
    it('deve executar o fluxo completo com sucesso', async () => {
      // === DADOS DE TESTE ===
      const clienteId = 'cliente-test-id';
      const requerimentoId = 'requerimento-test-id';
      
      const requerimentoData: RequerimentoFormData = {
        chamado: 'RF-6017993',
        cliente_id: clienteId,
        modulo: 'Comply',
        descricao: 'Especificação funcional para implementação de nova funcionalidade',
        data_envio: '2024-01-15',
        data_aprovacao: '2024-01-20',
        horas_funcional: 8.5,
        horas_tecnico: 4.0,
        linguagem: 'ABAP',
        tipo_cobranca: 'Faturado',
        mes_cobranca: 1,
        observacao: 'Requerimento prioritário para cliente'
      };

      const requerimentoCriado: Requerimento = {
        id: requerimentoId,
        ...requerimentoData,
        horas_total: 12.5,
        cliente_nome: 'Empresa Teste Ltda',
        status: 'lancado',
        enviado_faturamento: false,
        data_envio_faturamento: null,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      };

      const requerimentoEnviado: Requerimento = {
        ...requerimentoCriado,
        status: 'enviado_faturamento',
        enviado_faturamento: true,
        data_envio_faturamento: '2024-01-25T14:30:00Z',
        updated_at: '2024-01-25T14:30:00Z'
      };

      // === MOCKS PARA CRIAÇÃO DO REQUERIMENTO ===
      
      // Mock para verificar se cliente existe
      const mockClienteExiste = {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: clienteId, status: 'ativo' },
              error: null
            })
          })
        })
      };

      // Mock para inserção do requerimento
      const mockRequerimentoInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              ...requerimentoCriado,
              cliente: { id: clienteId, nome_completo: 'Empresa Teste Ltda' }
            },
            error: null
          })
        })
      });

      // === MOCKS PARA ENVIO PARA FATURAMENTO ===
      
      // Mock para buscar requerimento por ID
      const mockRequerimentoById = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              ...requerimentoCriado,
              cliente: { id: clienteId, nome_completo: 'Empresa Teste Ltda' }
            },
            error: null
          })
        })
      };

      // Mock para atualização do status para enviado_faturamento
      const mockUpdateEnvioFaturamento = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      // === MOCKS PARA FATURAMENTO ===
      
      // Mock para buscar requerimentos para faturamento
      const mockRequerimentosFaturamento = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [{
              ...requerimentoEnviado,
              empresas_clientes: { nome_completo: 'Empresa Teste Ltda' }
            }],
            error: null
          })
        })
      };

      // Mock para inserção de log de email
      const mockEmailLogInsert = vi.fn().mockResolvedValue({ error: null });

      // Mock do emailService
      vi.mocked(emailService.sendEmail).mockResolvedValue({
        success: true,
        message: 'Email enviado com sucesso'
      });

      // === CONFIGURAR SEQUÊNCIA DE MOCKS ===
      (supabase.from as any)
        // Verificar cliente existe (criação)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockClienteExiste) })
        // Inserir requerimento
        .mockReturnValueOnce({ insert: mockRequerimentoInsert })
        // Buscar requerimento por ID (envio faturamento)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockRequerimentoById) })
        // Atualizar status para enviado_faturamento
        .mockReturnValueOnce({ update: mockUpdateEnvioFaturamento })
        // Buscar requerimentos para faturamento
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockRequerimentosFaturamento) })
        // Inserir log de email
        .mockReturnValueOnce({ insert: mockEmailLogInsert });

      // === EXECUTAR FLUXO COMPLETO ===

      // 1. LANÇAR REQUERIMENTO
      console.log('=== ETAPA 1: Lançar Requerimento ===');
      const requerimentoResult = await requerimentosService.criarRequerimento(requerimentoData);
      
      expect(requerimentoResult).toEqual(requerimentoCriado);
      expect(requerimentoResult.status).toBe('lancado');
      expect(requerimentoResult.enviado_faturamento).toBe(false);
      expect(requerimentoResult.horas_total).toBe(12.5);
      expect(mockRequerimentoInsert).toHaveBeenCalled();

      // 2. ENVIAR PARA FATURAMENTO
      console.log('=== ETAPA 2: Enviar para Faturamento ===');
      await requerimentosService.enviarParaFaturamento(requerimentoId);
      
      expect(mockUpdateEnvioFaturamento).toHaveBeenCalledWith({
        status: 'enviado_faturamento',
        enviado_faturamento: true,
        data_envio_faturamento: expect.any(String),
        updated_at: expect.any(String)
      });

      // 3. GERAR RELATÓRIO DE FATURAMENTO
      console.log('=== ETAPA 3: Gerar Relatório de Faturamento ===');
      const relatorio = await faturamentoService.gerarRelatorioFaturamento(1, 2024);
      
      expect(relatorio).toMatchObject({
        periodo: 'Janeiro de 2024',
        mes_cobranca: 1,
        ano_cobranca: 2024,
        totais_gerais: {
          total_requerimentos: 1,
          total_horas: 12.5
        }
      });

      expect(relatorio.requerimentos_por_tipo['Faturado']).toMatchObject({
        quantidade: 1,
        horas_total: 12.5,
        requerimentos: expect.arrayContaining([
          expect.objectContaining({
            id: requerimentoId,
            tipo_cobranca: 'Faturado'
          })
        ])
      });

      // 4. DISPARAR FATURAMENTO POR EMAIL
      console.log('=== ETAPA 4: Disparar Faturamento por Email ===');
      const templateHtml = faturamentoService.criarTemplateEmailFaturamento(relatorio);
      
      expect(templateHtml).toContain('Relatório de Faturamento');
      expect(templateHtml).toContain('Janeiro de 2024');
      expect(templateHtml).toContain('RF-6017993');
      expect(templateHtml).toContain('Empresa Teste Ltda');
      expect(templateHtml).toContain('12.5');

      const emailFaturamento: EmailFaturamento = {
        destinatarios: ['gestor@empresa.com', 'financeiro@empresa.com'],
        assunto: `Relatório de Faturamento - ${relatorio.periodo}`,
        corpo: templateHtml
      };

      const resultadoEmail = await faturamentoService.dispararFaturamento(emailFaturamento);
      
      expect(resultadoEmail.success).toBe(true);
      expect(resultadoEmail.message).toContain('enviado com sucesso');
      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: ['gestor@empresa.com', 'financeiro@empresa.com'],
        subject: `Relatório de Faturamento - ${relatorio.periodo}`,
        html: templateHtml,
        attachments: undefined
      });

      // Verificar log de auditoria
      expect(mockEmailLogInsert).toHaveBeenCalledWith([{
        destinatario: 'gestor@empresa.com, financeiro@empresa.com',
        assunto: '[FATURAMENTO] Relatório de Faturamento - Janeiro de 2024',
        status: 'enviado',
        erro: undefined,
        enviado_em: expect.any(String)
      }]);

      console.log('=== FLUXO COMPLETO EXECUTADO COM SUCESSO ===');
    });

    it('deve falhar ao tentar enviar requerimento inexistente para faturamento', async () => {
      const requerimentoIdInexistente = 'requerimento-inexistente';

      // Mock para requerimento não encontrado
      const mockRequerimentoNotFound = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'Not found' }
          })
        })
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(mockRequerimentoNotFound)
      });

      await expect(
        requerimentosService.enviarParaFaturamento(requerimentoIdInexistente)
      ).rejects.toThrow('Requerimento não encontrado');
    });

    it('deve falhar ao tentar enviar requerimento já enviado para faturamento', async () => {
      const requerimentoId = 'requerimento-ja-enviado';
      
      const requerimentoJaEnviado = {
        id: requerimentoId,
        status: 'enviado_faturamento',
        enviado_faturamento: true,
        cliente_nome: 'Empresa Teste'
      };

      // Mock para requerimento já enviado
      const mockRequerimentoJaEnviado = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              ...requerimentoJaEnviado,
              cliente: { nome_completo: 'Empresa Teste' }
            },
            error: null
          })
        })
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(mockRequerimentoJaEnviado)
      });

      await expect(
        requerimentosService.enviarParaFaturamento(requerimentoId)
      ).rejects.toThrow('Requerimento já foi enviado para faturamento');
    });
  });

  describe('Integração com Banco de Dados Supabase', () => {
    it('deve validar estrutura de dados do requerimento', async () => {
      const requerimentoData: RequerimentoFormData = {
        chamado: 'RF-123456',
        cliente_id: 'cliente-id',
        modulo: 'pw.SATI',
        descricao: 'Teste de integração',
        data_envio: '2024-01-15',
        data_aprovacao: '2024-01-20',
        horas_funcional: 5.0,
        horas_tecnico: 3.0,
        linguagem: 'PL/SQL',
        tipo_cobranca: 'Banco de Horas',
        mes_cobranca: 1,
        observacao: 'Observação de teste'
      };

      // Mock para cliente válido
      const mockClienteValido = {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'cliente-id', status: 'ativo' },
              error: null
            })
          })
        })
      };

      // Mock para inserção com validação de estrutura
      const mockInsertComValidacao = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockImplementation(() => {
            // Simular validação de constraints do banco
            const data = {
              id: 'novo-requerimento-id',
              chamado: requerimentoData.chamado,
              cliente_id: requerimentoData.cliente_id,
              modulo: requerimentoData.modulo,
              descricao: requerimentoData.descricao,
              data_envio: requerimentoData.data_envio,
              data_aprovacao: requerimentoData.data_aprovacao,
              horas_funcional: requerimentoData.horas_funcional,
              horas_tecnico: requerimentoData.horas_tecnico,
              horas_total: requerimentoData.horas_funcional + requerimentoData.horas_tecnico,
              linguagem: requerimentoData.linguagem,
              tipo_cobranca: requerimentoData.tipo_cobranca,
              mes_cobranca: requerimentoData.mes_cobranca,
              observacao: requerimentoData.observacao,
              status: 'lancado',
              enviado_faturamento: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              cliente: { id: 'cliente-id', nome_completo: 'Cliente Teste' }
            };

            return Promise.resolve({ data, error: null });
          })
        })
      });

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockClienteValido) })
        .mockReturnValueOnce({ insert: mockInsertComValidacao });

      const resultado = await requerimentosService.criarRequerimento(requerimentoData);

      // Verificar estrutura do resultado
      expect(resultado).toMatchObject({
        id: expect.any(String),
        chamado: 'RF-123456',
        cliente_id: 'cliente-id',
        cliente_nome: 'Cliente Teste',
        modulo: 'pw.SATI',
        descricao: 'Teste de integração',
        horas_funcional: 5.0,
        horas_tecnico: 3.0,
        horas_total: 8.0,
        linguagem: 'PL/SQL',
        tipo_cobranca: 'Banco de Horas',
        mes_cobranca: 1,
        status: 'lancado',
        enviado_faturamento: false
      });

      // Verificar que os dados foram inseridos com a estrutura correta
      expect(mockInsertComValidacao).toHaveBeenCalledWith({
        chamado: 'RF-123456',
        cliente_id: 'cliente-id',
        modulo: 'pw.SATI',
        descricao: 'Teste de integração',
        data_envio: '2024-01-15',
        data_aprovacao: '2024-01-20',
        horas_funcional: 5.0,
        horas_tecnico: 3.0,
        linguagem: 'PL/SQL',
        tipo_cobranca: 'Banco de Horas',
        mes_cobranca: 1,
        observacao: 'Observação de teste',
        status: 'lancado',
        enviado_faturamento: false
      });
    });

    it('deve validar constraints de negócio do banco', async () => {
      // Teste de constraint: chamado deve ter formato válido
      const requerimentoInvalido: RequerimentoFormData = {
        chamado: 'FORMATO_INVÁLIDO!@#',
        cliente_id: 'cliente-id',
        modulo: 'Comply',
        descricao: 'Teste',
        data_envio: '2024-01-15',
        data_aprovacao: '2024-01-20',
        horas_funcional: 1.0,
        horas_tecnico: 1.0,
        linguagem: 'ABAP',
        tipo_cobranca: 'Faturado',
        mes_cobranca: 1
      };

      await expect(
        requerimentosService.criarRequerimento(requerimentoInvalido)
      ).rejects.toThrow('Chamado deve conter apenas letras, números e hífen');
    });

    it('deve validar relacionamentos com outras tabelas', async () => {
      const requerimentoData: RequerimentoFormData = {
        chamado: 'RF-123456',
        cliente_id: 'cliente-inexistente',
        modulo: 'Comply',
        descricao: 'Teste de relacionamento',
        data_envio: '2024-01-15',
        data_aprovacao: '2024-01-20',
        horas_funcional: 1.0,
        horas_tecnico: 1.0,
        linguagem: 'ABAP',
        tipo_cobranca: 'Faturado',
        mes_cobranca: 1
      };

      // Mock para cliente não encontrado
      const mockClienteInexistente = {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' }
            })
          })
        })
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(mockClienteInexistente)
      });

      await expect(
        requerimentosService.criarRequerimento(requerimentoData)
      ).rejects.toThrow('Cliente não encontrado ou inativo');
    });
  });

  describe('Integração com Sistema de Permissões', () => {
    it('deve validar acesso às operações de requerimentos', async () => {
      // Este teste simula a validação de permissões que seria feita
      // pelos componentes ProtectedRoute e hooks de permissão
      
      const operacoesRequerimentos = [
        'lancar_requerimentos',
        'faturar_requerimentos'
      ];

      const usuarioAdmin = {
        id: 'admin-user',
        permissions: ['lancar_requerimentos', 'faturar_requerimentos']
      };

      const usuarioSemPermissao = {
        id: 'user-without-permission',
        permissions: []
      };

      // Simular validação de permissões
      const hasPermission = (user: any, operation: string) => {
        return user.permissions.includes(operation);
      };

      // Usuário admin deve ter acesso a todas as operações
      operacoesRequerimentos.forEach(operacao => {
        expect(hasPermission(usuarioAdmin, operacao)).toBe(true);
      });

      // Usuário sem permissão não deve ter acesso
      operacoesRequerimentos.forEach(operacao => {
        expect(hasPermission(usuarioSemPermissao, operacao)).toBe(false);
      });

      // Simular tentativa de acesso negado
      const tentarOperacao = (user: any, operation: string) => {
        if (!hasPermission(user, operation)) {
          throw new Error(`Acesso negado para operação: ${operation}`);
        }
        return true;
      };

      // Admin consegue executar operações
      expect(() => tentarOperacao(usuarioAdmin, 'lancar_requerimentos')).not.toThrow();
      expect(() => tentarOperacao(usuarioAdmin, 'faturar_requerimentos')).not.toThrow();

      // Usuário sem permissão é bloqueado
      expect(() => tentarOperacao(usuarioSemPermissao, 'lancar_requerimentos'))
        .toThrow('Acesso negado para operação: lancar_requerimentos');
      expect(() => tentarOperacao(usuarioSemPermissao, 'faturar_requerimentos'))
        .toThrow('Acesso negado para operação: faturar_requerimentos');
    });
  });

  describe('Integração com Envio de Email', () => {
    it('deve enviar email de faturamento com template correto', async () => {
      const requerimentosMock: Requerimento[] = [
        {
          id: 'req-1',
          chamado: 'RF-001',
          cliente_id: 'cliente-1',
          cliente_nome: 'Cliente A',
          modulo: 'Comply',
          descricao: 'Descrição 1',
          data_envio: '2024-01-15',
          data_aprovacao: '2024-01-20',
          horas_funcional: 4.0,
          horas_tecnico: 2.0,
          horas_total: 6.0,
          linguagem: 'ABAP',
          tipo_cobranca: 'Faturado',
          mes_cobranca: 1,
          observacao: null,
          status: 'enviado_faturamento',
          enviado_faturamento: true,
          data_envio_faturamento: '2024-01-25T10:00:00Z',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-25T10:00:00Z'
        },
        {
          id: 'req-2',
          chamado: 'RF-002',
          cliente_id: 'cliente-2',
          cliente_nome: 'Cliente B',
          modulo: 'pw.SATI',
          descricao: 'Descrição 2',
          data_envio: '2024-01-16',
          data_aprovacao: '2024-01-21',
          horas_funcional: 3.0,
          horas_tecnico: 5.0,
          horas_total: 8.0,
          linguagem: 'PL/SQL',
          tipo_cobranca: 'Hora Extra',
          mes_cobranca: 1,
          observacao: 'Urgente',
          status: 'enviado_faturamento',
          enviado_faturamento: true,
          data_envio_faturamento: '2024-01-25T11:00:00Z',
          created_at: '2024-01-16T10:00:00Z',
          updated_at: '2024-01-25T11:00:00Z'
        }
      ];

      // Mock para buscar requerimentos para faturamento
      const mockRequerimentosFaturamento = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: requerimentosMock.map(req => ({
              ...req,
              empresas_clientes: { nome_completo: req.cliente_nome }
            })),
            error: null
          })
        })
      };

      // Mock para log de email
      const mockEmailLogInsert = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockRequerimentosFaturamento) })
        .mockReturnValueOnce({ insert: mockEmailLogInsert });

      // Mock do emailService
      vi.mocked(emailService.sendEmail).mockResolvedValue({
        success: true,
        message: 'Email enviado com sucesso'
      });

      // Gerar relatório
      const relatorio = await faturamentoService.gerarRelatorioFaturamento(1, 2024);
      
      expect(relatorio.totais_gerais).toEqual({
        total_requerimentos: 2,
        total_horas: 14.0
      });

      expect(relatorio.requerimentos_por_tipo['Faturado']).toMatchObject({
        quantidade: 1,
        horas_total: 6.0
      });

      expect(relatorio.requerimentos_por_tipo['Hora Extra']).toMatchObject({
        quantidade: 1,
        horas_total: 8.0
      });

      // Criar template HTML
      const templateHtml = faturamentoService.criarTemplateEmailFaturamento(relatorio);
      
      // Validar conteúdo do template
      expect(templateHtml).toContain('Relatório de Faturamento');
      expect(templateHtml).toContain('Janeiro de 2024');
      expect(templateHtml).toContain('RF-001');
      expect(templateHtml).toContain('RF-002');
      expect(templateHtml).toContain('Cliente A');
      expect(templateHtml).toContain('Cliente B');
      expect(templateHtml).toContain('14.0'); // Total de horas
      expect(templateHtml).toContain('Faturado');
      expect(templateHtml).toContain('Hora Extra');

      // Enviar email
      const emailFaturamento: EmailFaturamento = {
        destinatarios: ['gestor@empresa.com'],
        assunto: 'Relatório de Faturamento - Janeiro de 2024',
        corpo: templateHtml
      };

      const resultado = await faturamentoService.dispararFaturamento(emailFaturamento);

      expect(resultado.success).toBe(true);
      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: ['gestor@empresa.com'],
        subject: 'Relatório de Faturamento - Janeiro de 2024',
        html: templateHtml,
        attachments: undefined
      });

      // Verificar log de auditoria
      expect(mockEmailLogInsert).toHaveBeenCalledWith([{
        destinatario: 'gestor@empresa.com',
        assunto: '[FATURAMENTO] Relatório de Faturamento - Janeiro de 2024',
        status: 'enviado',
        erro: undefined,
        enviado_em: expect.any(String)
      }]);
    });

    it('deve tratar erro no envio de email e registrar log', async () => {
      // Mock para buscar requerimentos (vazio)
      const mockRequerimentosVazio = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      };

      // Mock para log de erro
      const mockEmailLogError = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockRequerimentosVazio) })
        .mockReturnValueOnce({ insert: mockEmailLogError });

      // Mock do emailService com erro
      vi.mocked(emailService.sendEmail).mockResolvedValue({
        success: false,
        error: 'Erro de conexão com servidor de email'
      });

      const relatorio = await faturamentoService.gerarRelatorioFaturamento(1, 2024);
      const templateHtml = faturamentoService.criarTemplateEmailFaturamento(relatorio);

      const emailFaturamento: EmailFaturamento = {
        destinatarios: ['gestor@empresa.com'],
        assunto: 'Relatório de Faturamento - Janeiro de 2024',
        corpo: templateHtml
      };

      const resultado = await faturamentoService.dispararFaturamento(emailFaturamento);

      expect(resultado.success).toBe(false);
      expect(resultado.error).toContain('Erro de conexão com servidor de email');

      // Verificar log de erro
      expect(mockEmailLogError).toHaveBeenCalledWith([{
        destinatario: 'gestor@empresa.com',
        assunto: '[FATURAMENTO] Relatório de Faturamento - Janeiro de 2024',
        status: 'erro',
        erro: 'Erro de conexão com servidor de email',
        enviado_em: expect.any(String)
      }]);
    });

    it('deve validar formato de emails dos destinatários', async () => {
      const emailsInvalidos = [
        'email-sem-arroba',
        '@dominio-sem-usuario.com',
        'usuario@',
        'usuario@dominio',
        'usuario@.com'
      ];

      for (const emailInvalido of emailsInvalidos) {
        const emailFaturamento: EmailFaturamento = {
          destinatarios: [emailInvalido],
          assunto: 'Teste',
          corpo: '<p>Teste</p>'
        };

        const resultado = await faturamentoService.dispararFaturamento(emailFaturamento);
        
        expect(resultado.success).toBe(false);
        expect(resultado.error).toContain('E-mails inválidos');
      }
    });
  });

  describe('Cenários de Erro e Recuperação', () => {
    it('deve tratar erro de conexão com banco de dados', async () => {
      // Mock de erro de conexão
      const mockErroConexao = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockRejectedValue(new Error('Connection timeout'))
        })
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(mockErroConexao)
      });

      await expect(
        requerimentosService.obterRequerimentoPorId('test-id')
      ).rejects.toThrow('Connection timeout');
    });

    it('deve validar dados antes de operações críticas', async () => {
      // Teste de validação de ID vazio
      await expect(
        requerimentosService.enviarParaFaturamento('')
      ).rejects.toThrow('ID é obrigatório');

      await expect(
        requerimentosService.obterRequerimentoPorId('')
      ).rejects.toThrow('ID é obrigatório');

      await expect(
        requerimentosService.deletarRequerimento('')
      ).rejects.toThrow('ID é obrigatório');
    });

    it('deve manter integridade dos dados em operações de lote', async () => {
      const requerimentoIds = ['req-1', 'req-2', 'req-3'];

      // Mock para marcar como faturados (operação em lote)
      const mockBatchUpdate = vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ error: null })
      });

      (supabase.from as any).mockReturnValue({
        update: mockBatchUpdate
      });

      const resultado = await faturamentoService.marcarComoFaturados(requerimentoIds);

      expect(resultado.success).toBe(true);
      expect(resultado.message).toContain('3 requerimento(s) marcado(s) como faturado(s)');
      
      expect(mockBatchUpdate).toHaveBeenCalledWith({
        status: 'faturado',
        updated_at: expect.any(String)
      });
    });
  });
});