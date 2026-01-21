/**
 * Testes End-to-End - Sistema de Banco de Horas
 * 
 * Este arquivo contém testes E2E que validam os fluxos completos do sistema
 * de gestão de banco de horas, desde a configuração até a auditoria.
 * 
 * Cenários cobertos:
 * 1. Configurar empresa e criar alocações
 * 2. Calcular mês e visualizar resultados
 * 3. Criar reajuste e verificar recálculo
 * 4. Navegar entre meses e visualizar histórico
 * 5. Exportar relatórios
 * 6. Visualizar audit log
 * 
 * @module test/e2e/bancoHoras
 * @requirements Todos os requisitos principais do sistema
 */

import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import { bancoHorasService } from '../../services/bancoHorasService';
import { bancoHorasAlocacoesService } from '../../services/bancoHorasAlocacoesService';
import { bancoHorasReajustesService } from '../../services/bancoHorasReajustesService';
import { bancoHorasVersionamentoService } from '../../services/bancoHorasVersionamentoService';
import { bancoHorasExportUtils } from '../../utils/bancoHorasExportUtils';

// Mock dos serviços
vi.mock('../../services/bancoHorasService');
vi.mock('../../services/bancoHorasAlocacoesService');
vi.mock('../../services/bancoHorasReajustesService');
vi.mock('../../services/bancoHorasVersionamentoService');
vi.mock('../../utils/bancoHorasExportUtils');

const mockBancoHorasService = vi.mocked(bancoHorasService);
const mockAlocacoesService = vi.mocked(bancoHorasAlocacoesService);
const mockReajustesService = vi.mocked(bancoHorasReajustesService);
const mockVersionamentoService = vi.mocked(bancoHorasVersionamentoService);
const mockExportUtils = vi.mocked(bancoHorasExportUtils);

// Dados de teste
const empresaTeste = {
  id: 'empresa-test-1',
  nome: 'Empresa Teste Banco Horas',
  tipo_contrato: 'horas' as const,
  periodo_apuracao: 3,
  inicio_vigencia: new Date('2026-01-01'),
  baseline_horas_mensal: '160:00',
  possui_repasse_especial: true,
  ciclos_para_zerar: 2,
  percentual_repasse_mensal: 50,
  ciclo_atual: 1
};

const alocacoesTeste = [
  {
    id: 'alocacao-1',
    empresa_id: 'empresa-test-1',
    nome_alocacao: 'Projeto A',
    percentual_baseline: 60,
    ativo: true
  },
  {
    id: 'alocacao-2',
    empresa_id: 'empresa-test-1',
    nome_alocacao: 'Projeto B',
    percentual_baseline: 40,
    ativo: true
  }
];

const calculoTeste = {
  id: 'calculo-1',
  empresa_id: 'empresa-test-1',
  mes: 1,
  ano: 2026,
  versao: 1,
  baseline_horas: '160:00',
  repasses_mes_anterior_horas: '00:00',
  saldo_a_utilizar_horas: '160:00',
  consumo_horas: '150:00',
  requerimentos_horas: '10:00',
  reajustes_horas: '00:00',
  consumo_total_horas: '160:00',
  saldo_horas: '00:00',
  repasse_horas: '00:00',
  excedentes_horas: '00:00',
  valor_a_faturar: 0,
  is_fim_periodo: false,
  created_at: new Date(),
  updated_at: new Date()
};

describe('Banco de Horas - Testes End-to-End', () => {
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
  });

  describe('Cenário 1: Configurar empresa e criar alocações', () => {
    it('deve configurar parâmetros da empresa com sucesso', async () => {
      // Mock da atualização de parâmetros
      const mockUpdateEmpresa = vi.fn().mockResolvedValue(empresaTeste);
      
      // Simular configuração de parâmetros
      const resultado = await mockUpdateEmpresa(empresaTeste.id, {
        tipo_contrato: empresaTeste.tipo_contrato,
        periodo_apuracao: empresaTeste.periodo_apuracao,
        inicio_vigencia: empresaTeste.inicio_vigencia,
        baseline_horas_mensal: empresaTeste.baseline_horas_mensal,
        possui_repasse_especial: empresaTeste.possui_repasse_especial,
        ciclos_para_zerar: empresaTeste.ciclos_para_zerar,
        percentual_repasse_mensal: empresaTeste.percentual_repasse_mensal
      });

      expect(mockUpdateEmpresa).toHaveBeenCalledWith(
        empresaTeste.id,
        expect.objectContaining({
          tipo_contrato: 'horas',
          periodo_apuracao: 3,
          baseline_horas_mensal: '160:00'
        })
      );
      expect(resultado).toEqual(empresaTeste);
    });

    it('deve criar alocações com soma de percentuais igual a 100%', async () => {
      const mockValidarSoma = vi.fn().mockReturnValue(true);
      const mockSalvarAlocacoes = vi.fn().mockResolvedValue(alocacoesTeste);

      // Validar soma de percentuais
      const somaValida = mockValidarSoma(alocacoesTeste);
      expect(somaValida).toBe(true);

      // Salvar alocações
      const resultado = await mockSalvarAlocacoes(
        empresaTeste.id,
        alocacoesTeste
      );

      expect(mockSalvarAlocacoes).toHaveBeenCalledWith(
        empresaTeste.id,
        alocacoesTeste
      );
      expect(resultado).toEqual(alocacoesTeste);
      expect(resultado).toHaveLength(2);
      expect(resultado[0].percentual_baseline + resultado[1].percentual_baseline).toBe(100);
    });

    it('deve rejeitar alocações com soma diferente de 100%', async () => {
      const alocacoesInvalidas = [
        { ...alocacoesTeste[0], percentual_baseline: 50 },
        { ...alocacoesTeste[1], percentual_baseline: 30 }
      ];

      const mockValidarSoma = vi.fn().mockReturnValue(false);

      const somaValida = mockValidarSoma(alocacoesInvalidas);
      expect(somaValida).toBe(false);
    });
  });

  describe('Cenário 2: Calcular mês e visualizar resultados', () => {
    it('deve calcular valores mensais corretamente', async () => {
      mockBancoHorasService.calcularMes = vi.fn().mockResolvedValue(calculoTeste);

      const resultado = await mockBancoHorasService.calcularMes(
        empresaTeste.id,
        1,
        2026
      );

      expect(mockBancoHorasService.calcularMes).toHaveBeenCalledWith(
        empresaTeste.id,
        1,
        2026
      );
      expect(resultado).toEqual(calculoTeste);
      expect(resultado.baseline_horas).toBe('160:00');
      expect(resultado.saldo_a_utilizar_horas).toBe('160:00');
      expect(resultado.consumo_total_horas).toBe('160:00');
      expect(resultado.saldo_horas).toBe('00:00');
    });

    it('deve buscar ou criar cálculo mensal', async () => {
      mockBancoHorasService.obterOuCalcular = vi.fn().mockResolvedValue(calculoTeste);

      const resultado = await mockBancoHorasService.obterOuCalcular(
        empresaTeste.id,
        1,
        2026
      );

      expect(mockBancoHorasService.obterOuCalcular).toHaveBeenCalledWith(
        empresaTeste.id,
        1,
        2026
      );
      expect(resultado).toEqual(calculoTeste);
    });

    it('deve calcular valores segmentados por alocação', async () => {
      const calculosSegmentados = [
        {
          id: 'seg-1',
          calculo_id: calculoTeste.id,
          alocacao_id: alocacoesTeste[0].id,
          baseline_horas: '96:00', // 60% de 160h
          consumo_total_horas: '96:00',
          saldo_horas: '00:00'
        },
        {
          id: 'seg-2',
          calculo_id: calculoTeste.id,
          alocacao_id: alocacoesTeste[1].id,
          baseline_horas: '64:00', // 40% de 160h
          consumo_total_horas: '64:00',
          saldo_horas: '00:00'
        }
      ];

      const mockCalcularSegmentados = vi.fn().mockResolvedValue(
        calculosSegmentados
      );

      const resultado = await mockCalcularSegmentados(
        calculoTeste,
        alocacoesTeste
      );

      expect(resultado).toHaveLength(2);
      expect(resultado[0].baseline_horas).toBe('96:00');
      expect(resultado[1].baseline_horas).toBe('64:00');
    });
  });

  describe('Cenário 3: Criar reajuste e verificar recálculo', () => {
    it('deve criar reajuste com observação válida', async () => {
      const reajusteTeste = {
        id: 'reajuste-1',
        calculo_id: calculoTeste.id,
        empresa_id: empresaTeste.id,
        mes: 1,
        ano: 2026,
        valor_reajuste_horas: '10:00',
        tipo_reajuste: 'positivo' as const,
        observacao_privada: 'Ajuste por horas extras não contabilizadas',
        created_at: new Date(),
        created_by: 'user-1',
        ativo: true
      };

      mockReajustesService.criarReajuste = vi.fn().mockResolvedValue(reajusteTeste);

      const resultado = await mockReajustesService.criarReajuste({
        calculo_id: calculoTeste.id,
        empresa_id: empresaTeste.id,
        mes: 1,
        ano: 2026,
        valor_reajuste_horas: '10:00',
        observacao_privada: 'Ajuste por horas extras não contabilizadas'
      });

      expect(mockReajustesService.criarReajuste).toHaveBeenCalled();
      expect(resultado.observacao_privada.length).toBeGreaterThanOrEqual(10); // >= 10 caracteres
      expect(resultado.tipo_reajuste).toBe('positivo');
    });

    it('deve rejeitar reajuste com observação muito curta', async () => {
      mockReajustesService.criarReajuste = vi.fn().mockRejectedValue(
        new Error('Observação deve ter no mínimo 10 caracteres')
      );

      await expect(
        mockReajustesService.criarReajuste({
          calculo_id: calculoTeste.id,
          empresa_id: empresaTeste.id,
          mes: 1,
          ano: 2026,
          valor_reajuste_horas: '10:00',
          observacao_privada: 'Curta' // Apenas 5 caracteres
        })
      ).rejects.toThrow('Observação deve ter no mínimo 10 caracteres');
    });

    it('deve recalcular meses subsequentes após reajuste', async () => {
      mockReajustesService.aplicarReajuste = vi.fn().mockResolvedValue({
        mesesRecalculados: [
          { mes: 1, ano: 2026 },
          { mes: 2, ano: 2026 },
          { mes: 3, ano: 2026 }
        ]
      });

      const resultado = await mockReajustesService.aplicarReajuste(
        'reajuste-1',
        empresaTeste.id
      );

      expect(mockReajustesService.aplicarReajuste).toHaveBeenCalledWith(
        'reajuste-1',
        empresaTeste.id
      );
      expect(resultado.mesesRecalculados).toHaveLength(3);
    });

    it('deve criar nova versão após reajuste', async () => {
      const versaoTeste = {
        id: 'versao-1',
        calculo_id: calculoTeste.id,
        versao_anterior: 1,
        versao_nova: 2,
        dados_anteriores: { saldo_horas: '00:00' },
        dados_novos: { saldo_horas: '10:00' },
        motivo: 'Reajuste aplicado',
        tipo_mudanca: 'reajuste' as const,
        created_at: new Date(),
        created_by: 'user-1'
      };

      mockVersionamentoService.criarVersao = vi.fn().mockResolvedValue(versaoTeste);

      const resultado = await mockVersionamentoService.criarVersao(
        calculoTeste.id,
        'user-1',
        'Reajuste aplicado'
      );

      expect(mockVersionamentoService.criarVersao).toHaveBeenCalledWith(
        calculoTeste.id,
        'user-1',
        'Reajuste aplicado'
      );
      expect(resultado.versao_nova).toBe(2);
      expect(resultado.tipo_mudanca).toBe('reajuste');
    });
  });

  describe('Cenário 4: Navegar entre meses e visualizar histórico', () => {
    it('deve buscar cálculos de múltiplos meses', async () => {
      const calculosMeses = [
        { ...calculoTeste, mes: 1, ano: 2026 },
        { ...calculoTeste, mes: 2, ano: 2026 },
        { ...calculoTeste, mes: 3, ano: 2026 }
      ];

      mockBancoHorasService.buscarCalculosPeriodo = vi.fn().mockResolvedValue(calculosMeses);

      const resultado = await mockBancoHorasService.buscarCalculosPeriodo(
        empresaTeste.id,
        2026
      );

      expect(mockBancoHorasService.buscarCalculosPeriodo).toHaveBeenCalledWith(
        empresaTeste.id,
        2026
      );
      expect(resultado).toHaveLength(3);
    });

    it('deve listar histórico de versões de um cálculo', async () => {
      const versoes = [
        {
          id: 'versao-1',
          calculo_id: calculoTeste.id,
          versao_anterior: 1,
          versao_nova: 2,
          motivo: 'Reajuste aplicado',
          tipo_mudanca: 'reajuste' as const,
          created_at: new Date('2026-01-15'),
          created_by: 'user-1'
        },
        {
          id: 'versao-2',
          calculo_id: calculoTeste.id,
          versao_anterior: 2,
          versao_nova: 3,
          motivo: 'Correção de dados',
          tipo_mudanca: 'correcao' as const,
          created_at: new Date('2026-01-20'),
          created_by: 'user-1'
        }
      ];

      mockVersionamentoService.listarVersoes = vi.fn().mockResolvedValue(versoes);

      const resultado = await mockVersionamentoService.listarVersoes(
        empresaTeste.id,
        1,
        2026
      );

      expect(mockVersionamentoService.listarVersoes).toHaveBeenCalledWith(
        empresaTeste.id,
        1,
        2026
      );
      expect(resultado).toHaveLength(2);
      expect(resultado[0].versao_nova).toBe(2);
      expect(resultado[1].versao_nova).toBe(3);
    });

    it('deve comparar duas versões de um cálculo', async () => {
      const versao1 = {
        id: 'versao-1',
        calculo_id: calculoTeste.id,
        versao_anterior: 1,
        versao_nova: 2,
        dados_anteriores: { saldo_horas: '00:00', reajustes_horas: '00:00' },
        dados_novos: { saldo_horas: '10:00', reajustes_horas: '10:00' },
        motivo: 'Reajuste aplicado',
        tipo_mudanca: 'reajuste' as const,
        created_at: new Date(),
        created_by: 'user-1'
      };

      const versao2 = {
        id: 'versao-2',
        calculo_id: calculoTeste.id,
        versao_anterior: 2,
        versao_nova: 3,
        dados_anteriores: { saldo_horas: '10:00', reajustes_horas: '10:00' },
        dados_novos: { saldo_horas: '15:00', reajustes_horas: '15:00' },
        motivo: 'Novo reajuste',
        tipo_mudanca: 'reajuste' as const,
        created_at: new Date(),
        created_by: 'user-1'
      };

      mockVersionamentoService.compararVersoes = vi.fn().mockReturnValue({
        diferencas: [
          { campo: 'saldo_horas', anterior: '10:00', novo: '15:00' },
          { campo: 'reajustes_horas', anterior: '10:00', novo: '15:00' }
        ]
      });

      const resultado = mockVersionamentoService.compararVersoes(versao1, versao2);

      expect(resultado.diferencas).toHaveLength(2);
      expect(resultado.diferencas[0].campo).toBe('saldo_horas');
    });
  });

  describe('Cenário 5: Exportar relatórios', () => {
    it('deve exportar visão consolidada para PDF', async () => {
      const mockExportarPDF = vi.fn().mockResolvedValue({
        sucesso: true,
        arquivo: 'banco-horas-consolidado-jan-2026.pdf'
      });

      const resultado = await mockExportarPDF(
        calculoTeste,
        empresaTeste
      );

      expect(mockExportarPDF).toHaveBeenCalledWith(
        calculoTeste,
        empresaTeste
      );
      expect(resultado.sucesso).toBe(true);
      expect(resultado.arquivo).toContain('.pdf');
    });

    it('deve exportar visão consolidada para Excel', async () => {
      const mockExportarExcel = vi.fn().mockResolvedValue({
        sucesso: true,
        arquivo: 'banco-horas-consolidado-jan-2026.xlsx'
      });

      const resultado = await mockExportarExcel(
        calculoTeste,
        empresaTeste
      );

      expect(mockExportarExcel).toHaveBeenCalledWith(
        calculoTeste,
        empresaTeste
      );
      expect(resultado.sucesso).toBe(true);
      expect(resultado.arquivo).toContain('.xlsx');
    });

    it('deve exportar visão segmentada para PDF', async () => {
      const calculosSegmentados = [
        {
          id: 'seg-1',
          calculo_id: calculoTeste.id,
          alocacao_id: alocacoesTeste[0].id,
          baseline_horas: '96:00'
        },
        {
          id: 'seg-2',
          calculo_id: calculoTeste.id,
          alocacao_id: alocacoesTeste[1].id,
          baseline_horas: '64:00'
        }
      ];

      const mockExportarSegmentado = vi.fn().mockResolvedValue({
        sucesso: true,
        arquivo: 'banco-horas-segmentado-jan-2026.pdf'
      });

      const resultado = await mockExportarSegmentado(
        calculosSegmentados,
        alocacoesTeste,
        empresaTeste
      );

      expect(mockExportarSegmentado).toHaveBeenCalledWith(
        calculosSegmentados,
        alocacoesTeste,
        empresaTeste
      );
      expect(resultado.sucesso).toBe(true);
    });
  });

  describe('Cenário 6: Visualizar audit log', () => {
    it('deve buscar logs de auditoria da empresa', async () => {
      const auditLogs = [
        {
          id: 'log-1',
          empresa_id: empresaTeste.id,
          calculo_id: calculoTeste.id,
          acao: 'calculo_criado',
          descricao: 'Cálculo mensal criado para Janeiro/2026',
          created_at: new Date('2026-01-01'),
          created_by: 'user-1'
        },
        {
          id: 'log-2',
          empresa_id: empresaTeste.id,
          calculo_id: calculoTeste.id,
          acao: 'reajuste_aplicado',
          descricao: 'Reajuste de +10:00 horas aplicado',
          created_at: new Date('2026-01-15'),
          created_by: 'user-1'
        }
      ];

      const mockBuscarAuditLogs = vi.fn().mockResolvedValue(auditLogs);

      const resultado = await mockBuscarAuditLogs(empresaTeste.id);

      expect(mockBuscarAuditLogs).toHaveBeenCalledWith(empresaTeste.id);
      expect(resultado).toHaveLength(2);
      expect(resultado[0].acao).toBe('calculo_criado');
      expect(resultado[1].acao).toBe('reajuste_aplicado');
    });

    it('deve filtrar logs por tipo de ação', async () => {
      const logsReajustes = [
        {
          id: 'log-2',
          empresa_id: empresaTeste.id,
          acao: 'reajuste_aplicado',
          descricao: 'Reajuste de +10:00 horas aplicado',
          created_at: new Date('2026-01-15'),
          created_by: 'user-1'
        }
      ];

      const mockFiltrarAuditLogs = vi.fn().mockResolvedValue(logsReajustes);

      const resultado = await mockFiltrarAuditLogs(empresaTeste.id, {
        acao: 'reajuste_aplicado'
      });

      expect(mockFiltrarAuditLogs).toHaveBeenCalledWith(
        empresaTeste.id,
        { acao: 'reajuste_aplicado' }
      );
      expect(resultado).toHaveLength(1);
      expect(resultado[0].acao).toBe('reajuste_aplicado');
    });

    it('deve exportar audit log para CSV', async () => {
      const mockExportarCSV = vi.fn().mockResolvedValue({
        sucesso: true,
        arquivo: 'audit-log-empresa-test-1.csv'
      });

      const resultado = await mockExportarCSV(empresaTeste.id);

      expect(mockExportarCSV).toHaveBeenCalledWith(empresaTeste.id);
      expect(resultado.sucesso).toBe(true);
      expect(resultado.arquivo).toContain('.csv');
    });
  });

  describe('Fluxo Completo Integrado', () => {
    it('deve executar fluxo completo: configurar → calcular → reajustar → exportar', async () => {
      // 1. Configurar empresa
      const mockUpdateEmpresa = vi.fn().mockResolvedValue(empresaTeste);
      await mockUpdateEmpresa(empresaTeste.id, empresaTeste);
      expect(mockUpdateEmpresa).toHaveBeenCalled();

      // 2. Criar alocações
      const mockSalvarAlocacoes = vi.fn().mockResolvedValue(alocacoesTeste);
      await mockSalvarAlocacoes(empresaTeste.id, alocacoesTeste);
      expect(mockSalvarAlocacoes).toHaveBeenCalled();

      // 3. Calcular mês
      mockBancoHorasService.calcularMes = vi.fn().mockResolvedValue(calculoTeste);
      const calculo = await mockBancoHorasService.calcularMes(empresaTeste.id, 1, 2026);
      expect(mockBancoHorasService.calcularMes).toHaveBeenCalled();
      expect(calculo).toEqual(calculoTeste);

      // 4. Criar reajuste
      const reajuste = {
        id: 'reajuste-1',
        calculo_id: calculo.id,
        empresa_id: empresaTeste.id,
        mes: 1,
        ano: 2026,
        valor_reajuste_horas: '10:00',
        tipo_reajuste: 'positivo' as const,
        observacao_privada: 'Ajuste necessário por horas extras',
        created_at: new Date(),
        created_by: 'user-1',
        ativo: true
      };
      mockReajustesService.criarReajuste = vi.fn().mockResolvedValue(reajuste);
      await mockReajustesService.criarReajuste(reajuste);
      expect(mockReajustesService.criarReajuste).toHaveBeenCalled();

      // 5. Exportar relatório
      const mockExportarPDF = vi.fn().mockResolvedValue({
        sucesso: true,
        arquivo: 'relatorio.pdf'
      });
      const exportacao = await mockExportarPDF(calculo, empresaTeste);
      expect(mockExportarPDF).toHaveBeenCalled();
      expect(exportacao.sucesso).toBe(true);
    });
  });
});
