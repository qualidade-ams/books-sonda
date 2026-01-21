/**
 * Testes para o serviço de alocações de banco de horas
 * 
 * Valida as funções principais:
 * - validarSomaPercentuais
 * - calcularValoresSegmentados
 * - validarAlocacoes
 * - verificarSomaSegmentada
 */

import { describe, it, expect } from 'vitest';
import {
  validarSomaPercentuais,
  calcularValoresSegmentados,
  validarAlocacoes,
  verificarSomaSegmentada,
  AlocacaoValidationError,
  alocacoesService
} from '../bancoHorasAlocacoesService';
import type { Alocacao, BancoHorasCalculo } from '@/types/bancoHoras';

describe('bancoHorasAlocacoesService', () => {
  describe('validarSomaPercentuais', () => {
    it('deve retornar true quando soma é exatamente 100%', () => {
      const alocacoes = [
        { percentual_baseline: 50 },
        { percentual_baseline: 30 },
        { percentual_baseline: 20 }
      ];
      
      expect(validarSomaPercentuais(alocacoes)).toBe(true);
    });
    
    it('deve retornar false quando soma é diferente de 100%', () => {
      const alocacoes = [
        { percentual_baseline: 50 },
        { percentual_baseline: 30 }
      ];
      
      expect(validarSomaPercentuais(alocacoes)).toBe(false);
    });
    
    it('deve retornar true para alocação única de 100%', () => {
      const alocacoes = [
        { percentual_baseline: 100 }
      ];
      
      expect(validarSomaPercentuais(alocacoes)).toBe(true);
    });
    
    it('deve lançar erro para lista vazia', () => {
      expect(() => validarSomaPercentuais([])).toThrow(AlocacaoValidationError);
    });
    
    it('deve lançar erro para percentual inválido', () => {
      const alocacoes = [
        { percentual_baseline: 150 }
      ];
      
      expect(() => validarSomaPercentuais(alocacoes)).toThrow(AlocacaoValidationError);
    });
    
    it('deve lançar erro para percentual negativo', () => {
      const alocacoes = [
        { percentual_baseline: -10 }
      ];
      
      expect(() => validarSomaPercentuais(alocacoes)).toThrow(AlocacaoValidationError);
    });
  });
  
  describe('calcularValoresSegmentados', () => {
    it('deve calcular valores proporcionais para horas', () => {
      const calculoConsolidado: BancoHorasCalculo = {
        id: 'calc-1',
        empresa_id: 'emp-1',
        mes: 1,
        ano: 2024,
        versao: 1,
        baseline_horas: '160:00',
        consumo_horas: '80:00',
        saldo_horas: '80:00',
        is_fim_periodo: false,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const alocacao = {
        id: 'aloc-1',
        percentual_baseline: 50
      };
      
      const resultado = calcularValoresSegmentados(calculoConsolidado, alocacao);
      
      expect(resultado.baseline_horas).toBe('80:00');
      expect(resultado.consumo_horas).toBe('40:00');
      expect(resultado.saldo_horas).toBe('40:00');
    });
    
    it('deve calcular valores proporcionais para tickets', () => {
      const calculoConsolidado: BancoHorasCalculo = {
        id: 'calc-1',
        empresa_id: 'emp-1',
        mes: 1,
        ano: 2024,
        versao: 1,
        baseline_tickets: 100,
        consumo_tickets: 60,
        saldo_tickets: 40,
        is_fim_periodo: false,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const alocacao = {
        id: 'aloc-1',
        percentual_baseline: 25
      };
      
      const resultado = calcularValoresSegmentados(calculoConsolidado, alocacao);
      
      expect(resultado.baseline_tickets).toBe(25);
      expect(resultado.consumo_tickets).toBe(15);
      expect(resultado.saldo_tickets).toBe(10);
    });
    
    it('deve manter valores iguais para alocação de 100%', () => {
      const calculoConsolidado: BancoHorasCalculo = {
        id: 'calc-1',
        empresa_id: 'emp-1',
        mes: 1,
        ano: 2024,
        versao: 1,
        baseline_horas: '160:00',
        consumo_horas: '80:00',
        is_fim_periodo: false,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const alocacao = {
        id: 'aloc-1',
        percentual_baseline: 100
      };
      
      const resultado = calcularValoresSegmentados(calculoConsolidado, alocacao);
      
      expect(resultado.baseline_horas).toBe('160:00');
      expect(resultado.consumo_horas).toBe('80:00');
    });
    
    it('deve lidar com valores negativos', () => {
      const calculoConsolidado: BancoHorasCalculo = {
        id: 'calc-1',
        empresa_id: 'emp-1',
        mes: 1,
        ano: 2024,
        versao: 1,
        saldo_horas: '-20:00',
        is_fim_periodo: false,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const alocacao = {
        id: 'aloc-1',
        percentual_baseline: 50
      };
      
      const resultado = calcularValoresSegmentados(calculoConsolidado, alocacao);
      
      expect(resultado.saldo_horas).toBe('-10:00');
    });
    
    it('deve lançar erro para percentual inválido', () => {
      const calculoConsolidado: BancoHorasCalculo = {
        id: 'calc-1',
        empresa_id: 'emp-1',
        mes: 1,
        ano: 2024,
        versao: 1,
        is_fim_periodo: false,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const alocacao = {
        id: 'aloc-1',
        percentual_baseline: 150
      };
      
      expect(() => calcularValoresSegmentados(calculoConsolidado, alocacao)).toThrow(AlocacaoValidationError);
    });
  });
  
  describe('validarAlocacoes', () => {
    it('deve validar alocações corretas', () => {
      const alocacoes = [
        { nome_alocacao: 'TI', percentual_baseline: 60 },
        { nome_alocacao: 'RH', percentual_baseline: 40 }
      ];
      
      const resultado = validarAlocacoes(alocacoes);
      
      expect(resultado.valido).toBe(true);
      expect(resultado.erros).toHaveLength(0);
      expect(resultado.somaPercentuais).toBe(100);
    });
    
    it('deve detectar soma incorreta', () => {
      const alocacoes = [
        { nome_alocacao: 'TI', percentual_baseline: 60 },
        { nome_alocacao: 'RH', percentual_baseline: 30 }
      ];
      
      const resultado = validarAlocacoes(alocacoes);
      
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Soma dos percentuais deve ser 100%. Atual: 90%');
      expect(resultado.somaPercentuais).toBe(90);
    });
    
    it('deve detectar nome vazio', () => {
      const alocacoes = [
        { nome_alocacao: '', percentual_baseline: 100 }
      ];
      
      const resultado = validarAlocacoes(alocacoes);
      
      expect(resultado.valido).toBe(false);
      expect(resultado.erros.some(e => e.includes('não pode estar vazio'))).toBe(true);
    });
    
    it('deve detectar percentual fora do range', () => {
      const alocacoes = [
        { nome_alocacao: 'TI', percentual_baseline: 150 }
      ];
      
      const resultado = validarAlocacoes(alocacoes);
      
      expect(resultado.valido).toBe(false);
      expect(resultado.erros.some(e => e.includes('inválido: 150'))).toBe(true);
    });
    
    it('deve detectar lista vazia', () => {
      const resultado = validarAlocacoes([]);
      
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Deve haver pelo menos uma alocação');
    });
  });
  
  describe('verificarSomaSegmentada', () => {
    it('deve validar soma correta de horas', () => {
      const resultado = verificarSomaSegmentada(
        '160:00',
        ['80:00', '50:00', '30:00'],
        'horas'
      );
      
      expect(resultado).toBe(true);
    });
    
    it('deve validar soma correta de tickets', () => {
      const resultado = verificarSomaSegmentada(
        100,
        [50, 30, 20],
        'tickets'
      );
      
      expect(resultado).toBe(true);
    });
    
    it('deve aceitar pequenas diferenças de arredondamento em horas', () => {
      // 33:20 * 3 = 99:60 = 100:00 (diferença de arredondamento aceitável)
      const resultado = verificarSomaSegmentada(
        '100:00',
        ['33:20', '33:20', '33:20'],
        'horas'
      );
      
      expect(resultado).toBe(true);
    });
    
    it('deve aceitar pequenas diferenças de arredondamento em tickets', () => {
      const resultado = verificarSomaSegmentada(
        100,
        [33.33, 33.33, 33.34],
        'tickets'
      );
      
      expect(resultado).toBe(true);
    });
    
    it('deve detectar soma incorreta de horas', () => {
      const resultado = verificarSomaSegmentada(
        '160:00',
        ['80:00', '50:00'],
        'horas'
      );
      
      expect(resultado).toBe(false);
    });
    
    it('deve detectar soma incorreta de tickets', () => {
      const resultado = verificarSomaSegmentada(
        100,
        [50, 30],
        'tickets'
      );
      
      expect(resultado).toBe(false);
    });
    
    it('deve lidar com valores undefined', () => {
      const resultado = verificarSomaSegmentada(
        undefined,
        [undefined, undefined],
        'horas'
      );
      
      expect(resultado).toBe(true);
    });
  });
  
  describe('AlocacoesService', () => {
    it('deve calcular todos os segmentados corretamente', () => {
      const calculoConsolidado: BancoHorasCalculo = {
        id: 'calc-1',
        empresa_id: 'emp-1',
        mes: 1,
        ano: 2024,
        versao: 1,
        baseline_horas: '160:00',
        consumo_horas: '80:00',
        is_fim_periodo: false,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const alocacoes = [
        { id: 'aloc-1', percentual_baseline: 50 },
        { id: 'aloc-2', percentual_baseline: 30 },
        { id: 'aloc-3', percentual_baseline: 20 }
      ];
      
      const resultados = alocacoesService.calcularTodosSegmentados(calculoConsolidado, alocacoes);
      
      expect(resultados).toHaveLength(3);
      expect(resultados[0].baseline_horas).toBe('80:00');
      expect(resultados[1].baseline_horas).toBe('48:00');
      expect(resultados[2].baseline_horas).toBe('32:00');
    });
    
    it('deve lançar erro se soma de percentuais não for 100%', () => {
      const calculoConsolidado: BancoHorasCalculo = {
        id: 'calc-1',
        empresa_id: 'emp-1',
        mes: 1,
        ano: 2024,
        versao: 1,
        is_fim_periodo: false,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const alocacoes = [
        { id: 'aloc-1', percentual_baseline: 50 },
        { id: 'aloc-2', percentual_baseline: 30 }
      ];
      
      expect(() => alocacoesService.calcularTodosSegmentados(calculoConsolidado, alocacoes))
        .toThrow(AlocacaoValidationError);
    });
  });
});
