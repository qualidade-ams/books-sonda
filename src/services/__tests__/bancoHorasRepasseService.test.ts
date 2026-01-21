/**
 * Testes para bancoHorasRepasseService
 * 
 * Valida as funções de cálculo de repasse, detecção de fim de período
 * e aplicação de regras de fechamento.
 */

import { describe, it, expect } from 'vitest';
import {
  calcularRepasse,
  isFimPeriodo,
  aplicarFechamento,
  calcularRepasseCompleto,
  RepasseService
} from '../bancoHorasRepasseService';

describe('bancoHorasRepasseService', () => {
  describe('calcularRepasse', () => {
    describe('Saldo Positivo', () => {
      it('deve calcular repasse com 50% de percentual', () => {
        const resultado = calcularRepasse('10:00', 50);
        expect(resultado).toBe('5:00');
      });

      it('deve calcular repasse com 0% de percentual', () => {
        const resultado = calcularRepasse('10:00', 0);
        expect(resultado).toBe('0:00');
      });

      it('deve calcular repasse com 100% de percentual', () => {
        const resultado = calcularRepasse('10:00', 100);
        expect(resultado).toBe('10:00');
      });

      it('deve calcular repasse com 25% de percentual', () => {
        const resultado = calcularRepasse('8:00', 25);
        expect(resultado).toBe('2:00');
      });

      it('deve calcular repasse com 75% de percentual', () => {
        const resultado = calcularRepasse('12:00', 75);
        expect(resultado).toBe('9:00');
      });

      it('deve arredondar para baixo quando resultado tem fração', () => {
        // 10:30 = 630 minutos, 50% = 315 minutos = 5:15
        const resultado = calcularRepasse('10:30', 50);
        expect(resultado).toBe('5:15');
      });

      it('deve lidar com saldo zero', () => {
        const resultado = calcularRepasse('0:00', 50);
        expect(resultado).toBe('0:00');
      });
    });

    describe('Saldo Negativo', () => {
      it('deve repassar 100% do saldo negativo independente do percentual', () => {
        const resultado = calcularRepasse('-10:00', 50);
        expect(resultado).toBe('-10:00');
      });

      it('deve repassar 100% do saldo negativo mesmo com percentual 0%', () => {
        const resultado = calcularRepasse('-10:00', 0);
        expect(resultado).toBe('-10:00');
      });

      it('deve repassar 100% do saldo negativo mesmo com percentual 100%', () => {
        const resultado = calcularRepasse('-10:00', 100);
        expect(resultado).toBe('-10:00');
      });

      it('deve repassar saldo negativo com minutos', () => {
        const resultado = calcularRepasse('-5:30', 50);
        expect(resultado).toBe('-5:30');
      });
    });

    describe('Validações', () => {
      it('deve lançar erro para percentual negativo', () => {
        expect(() => calcularRepasse('10:00', -1)).toThrow('Percentual de repasse inválido');
      });

      it('deve lançar erro para percentual maior que 100', () => {
        expect(() => calcularRepasse('10:00', 101)).toThrow('Percentual de repasse inválido');
      });
    });
  });

  describe('isFimPeriodo', () => {
    describe('Período de 1 mês', () => {
      it('deve retornar true para todo mês quando período é 1', () => {
        const inicioVigencia = new Date('2024-01-01');
        
        expect(isFimPeriodo(1, 2024, inicioVigencia, 1)).toBe(true);
        expect(isFimPeriodo(2, 2024, inicioVigencia, 1)).toBe(true);
        expect(isFimPeriodo(3, 2024, inicioVigencia, 1)).toBe(true);
      });
    });

    describe('Período de 3 meses', () => {
      it('deve retornar true apenas no 3º, 6º, 9º e 12º mês', () => {
        const inicioVigencia = new Date('2024-01-01');
        
        expect(isFimPeriodo(1, 2024, inicioVigencia, 3)).toBe(false);
        expect(isFimPeriodo(2, 2024, inicioVigencia, 3)).toBe(false);
        expect(isFimPeriodo(3, 2024, inicioVigencia, 3)).toBe(true);
        expect(isFimPeriodo(4, 2024, inicioVigencia, 3)).toBe(false);
        expect(isFimPeriodo(5, 2024, inicioVigencia, 3)).toBe(false);
        expect(isFimPeriodo(6, 2024, inicioVigencia, 3)).toBe(true);
        expect(isFimPeriodo(9, 2024, inicioVigencia, 3)).toBe(true);
        expect(isFimPeriodo(12, 2024, inicioVigencia, 3)).toBe(true);
      });
    });

    describe('Período de 6 meses', () => {
      it('deve retornar true no 6º e 12º mês', () => {
        const inicioVigencia = new Date('2024-01-01');
        
        expect(isFimPeriodo(6, 2024, inicioVigencia, 6)).toBe(true);
        expect(isFimPeriodo(12, 2024, inicioVigencia, 6)).toBe(true);
        expect(isFimPeriodo(3, 2024, inicioVigencia, 6)).toBe(false);
        expect(isFimPeriodo(9, 2024, inicioVigencia, 6)).toBe(false);
      });
    });

    describe('Período de 12 meses', () => {
      it('deve retornar true apenas no 12º mês', () => {
        const inicioVigencia = new Date('2024-01-01');
        
        expect(isFimPeriodo(12, 2024, inicioVigencia, 12)).toBe(true);
        expect(isFimPeriodo(6, 2024, inicioVigencia, 12)).toBe(false);
        expect(isFimPeriodo(11, 2024, inicioVigencia, 12)).toBe(false);
      });

      it('deve retornar true no 12º mês do segundo ano', () => {
        const inicioVigencia = new Date('2024-01-01');
        
        expect(isFimPeriodo(12, 2025, inicioVigencia, 12)).toBe(true);
      });
    });

    describe('Vigência iniciando em mês diferente de janeiro', () => {
      it('deve calcular corretamente quando vigência inicia em outubro', () => {
        const inicioVigencia = new Date('2023-10-01');
        
        // Período de 6 meses: out, nov, dez, jan, fev, mar
        expect(isFimPeriodo(3, 2024, inicioVigencia, 6)).toBe(true);
        expect(isFimPeriodo(2, 2024, inicioVigencia, 6)).toBe(false);
        expect(isFimPeriodo(9, 2024, inicioVigencia, 6)).toBe(true); // 12 meses depois
      });

      it('deve calcular corretamente quando vigência inicia em julho', () => {
        const inicioVigencia = new Date('2024-07-01');
        
        // Período de 3 meses: jul, ago, set
        expect(isFimPeriodo(9, 2024, inicioVigencia, 3)).toBe(true);
        expect(isFimPeriodo(8, 2024, inicioVigencia, 3)).toBe(false);
        expect(isFimPeriodo(12, 2024, inicioVigencia, 3)).toBe(true); // 6 meses depois
      });
    });

    describe('Validações', () => {
      it('deve lançar erro para mês inválido (< 1)', () => {
        const inicioVigencia = new Date('2024-01-01');
        expect(() => isFimPeriodo(0, 2024, inicioVigencia, 12)).toThrow('Mês inválido');
      });

      it('deve lançar erro para mês inválido (> 12)', () => {
        const inicioVigencia = new Date('2024-01-01');
        expect(() => isFimPeriodo(13, 2024, inicioVigencia, 12)).toThrow('Mês inválido');
      });

      it('deve lançar erro para período de apuração inválido (< 1)', () => {
        const inicioVigencia = new Date('2024-01-01');
        expect(() => isFimPeriodo(1, 2024, inicioVigencia, 0)).toThrow('Período de apuração inválido');
      });

      it('deve lançar erro para período de apuração inválido (> 12)', () => {
        const inicioVigencia = new Date('2024-01-01');
        expect(() => isFimPeriodo(1, 2024, inicioVigencia, 13)).toThrow('Período de apuração inválido');
      });
    });
  });

  describe('aplicarFechamento', () => {
    describe('Sem Repasse Especial', () => {
      it('deve zerar saldo positivo', () => {
        const resultado = aplicarFechamento('10:00', false, 1, 1);
        
        expect(resultado.saldoFinal).toBe('0:00');
        expect(resultado.gerarExcedente).toBe(false);
        expect(resultado.repasse).toBe('0:00');
      });

      it('deve gerar excedente para saldo negativo', () => {
        const resultado = aplicarFechamento('-10:00', false, 1, 1);
        
        expect(resultado.saldoFinal).toBe('-10:00');
        expect(resultado.gerarExcedente).toBe(true);
        expect(resultado.repasse).toBe('0:00');
      });
    });

    describe('Com Repasse Especial - Ciclo Não Completo', () => {
      it('deve repassar saldo positivo quando ciclo 1 de 3', () => {
        const resultado = aplicarFechamento('10:00', true, 1, 3);
        
        expect(resultado.saldoFinal).toBe('10:00');
        expect(resultado.gerarExcedente).toBe(false);
        expect(resultado.repasse).toBe('10:00');
      });

      it('deve repassar saldo positivo quando ciclo 2 de 3', () => {
        const resultado = aplicarFechamento('15:30', true, 2, 3);
        
        expect(resultado.saldoFinal).toBe('15:30');
        expect(resultado.gerarExcedente).toBe(false);
        expect(resultado.repasse).toBe('15:30');
      });

      it('deve gerar excedente para saldo negativo mesmo em ciclo não completo', () => {
        const resultado = aplicarFechamento('-10:00', true, 1, 3);
        
        expect(resultado.saldoFinal).toBe('-10:00');
        expect(resultado.gerarExcedente).toBe(true);
        expect(resultado.repasse).toBe('0:00');
      });
    });

    describe('Com Repasse Especial - Ciclo Completo', () => {
      it('deve zerar saldo positivo quando ciclo 3 de 3', () => {
        const resultado = aplicarFechamento('10:00', true, 3, 3);
        
        expect(resultado.saldoFinal).toBe('0:00');
        expect(resultado.gerarExcedente).toBe(false);
        expect(resultado.repasse).toBe('0:00');
      });

      it('deve zerar saldo positivo quando ciclo 1 de 1', () => {
        const resultado = aplicarFechamento('10:00', true, 1, 1);
        
        expect(resultado.saldoFinal).toBe('0:00');
        expect(resultado.gerarExcedente).toBe(false);
        expect(resultado.repasse).toBe('0:00');
      });

      it('deve gerar excedente para saldo negativo mesmo em ciclo completo', () => {
        const resultado = aplicarFechamento('-10:00', true, 3, 3);
        
        expect(resultado.saldoFinal).toBe('-10:00');
        expect(resultado.gerarExcedente).toBe(true);
        expect(resultado.repasse).toBe('0:00');
      });
    });

    describe('Validações', () => {
      it('deve lançar erro para ciclo atual inválido', () => {
        expect(() => aplicarFechamento('10:00', true, 0, 3)).toThrow('Ciclo atual inválido');
      });

      it('deve lançar erro para ciclos para zerar inválido', () => {
        expect(() => aplicarFechamento('10:00', true, 1, 0)).toThrow('Ciclos para zerar inválido');
      });
    });
  });

  describe('calcularRepasseCompleto', () => {
    describe('Mês Normal (não é fim de período)', () => {
      it('deve aplicar repasse mensal normal com saldo positivo', () => {
        const inicioVigencia = new Date('2024-01-01');
        const resultado = calcularRepasseCompleto(
          '10:00',
          1,
          2024,
          inicioVigencia,
          12,
          50,
          false,
          1,
          1
        );
        
        expect(resultado.repasse).toBe('5:00');
        expect(resultado.isFimPeriodo).toBe(false);
        expect(resultado.gerarExcedente).toBe(false);
      });

      it('deve aplicar repasse mensal normal com saldo negativo', () => {
        const inicioVigencia = new Date('2024-01-01');
        const resultado = calcularRepasseCompleto(
          '-10:00',
          1,
          2024,
          inicioVigencia,
          12,
          50,
          false,
          1,
          1
        );
        
        expect(resultado.repasse).toBe('-10:00');
        expect(resultado.isFimPeriodo).toBe(false);
        expect(resultado.gerarExcedente).toBe(false);
      });
    });

    describe('Fim de Período - Sem Repasse Especial', () => {
      it('deve zerar saldo positivo no fim do período', () => {
        const inicioVigencia = new Date('2024-01-01');
        const resultado = calcularRepasseCompleto(
          '10:00',
          12,
          2024,
          inicioVigencia,
          12,
          50,
          false,
          1,
          1
        );
        
        expect(resultado.repasse).toBe('0:00');
        expect(resultado.isFimPeriodo).toBe(true);
        expect(resultado.gerarExcedente).toBe(false);
      });

      it('deve gerar excedente para saldo negativo no fim do período', () => {
        const inicioVigencia = new Date('2024-01-01');
        const resultado = calcularRepasseCompleto(
          '-10:00',
          12,
          2024,
          inicioVigencia,
          12,
          50,
          false,
          1,
          1
        );
        
        expect(resultado.repasse).toBe('0:00');
        expect(resultado.isFimPeriodo).toBe(true);
        expect(resultado.gerarExcedente).toBe(true);
      });
    });

    describe('Fim de Período - Com Repasse Especial', () => {
      it('deve repassar saldo positivo quando ciclo não completo', () => {
        const inicioVigencia = new Date('2024-01-01');
        const resultado = calcularRepasseCompleto(
          '10:00',
          12,
          2024,
          inicioVigencia,
          12,
          50,
          true,
          1,
          3
        );
        
        expect(resultado.repasse).toBe('10:00');
        expect(resultado.isFimPeriodo).toBe(true);
        expect(resultado.gerarExcedente).toBe(false);
      });

      it('deve zerar saldo positivo quando ciclo completo', () => {
        const inicioVigencia = new Date('2024-01-01');
        const resultado = calcularRepasseCompleto(
          '10:00',
          12,
          2024,
          inicioVigencia,
          12,
          50,
          true,
          3,
          3
        );
        
        expect(resultado.repasse).toBe('0:00');
        expect(resultado.isFimPeriodo).toBe(true);
        expect(resultado.gerarExcedente).toBe(false);
      });

      it('deve gerar excedente para saldo negativo independente do ciclo', () => {
        const inicioVigencia = new Date('2024-01-01');
        const resultado = calcularRepasseCompleto(
          '-10:00',
          12,
          2024,
          inicioVigencia,
          12,
          50,
          true,
          1,
          3
        );
        
        expect(resultado.repasse).toBe('0:00');
        expect(resultado.isFimPeriodo).toBe(true);
        expect(resultado.gerarExcedente).toBe(true);
      });
    });
  });

  describe('RepasseService (classe)', () => {
    it('deve expor todos os métodos corretamente', () => {
      const service = new RepasseService();
      
      expect(typeof service.calcularRepasse).toBe('function');
      expect(typeof service.isFimPeriodo).toBe('function');
      expect(typeof service.aplicarFechamento).toBe('function');
      expect(typeof service.calcularRepasseCompleto).toBe('function');
    });

    it('deve calcular repasse através da instância da classe', () => {
      const service = new RepasseService();
      const resultado = service.calcularRepasse('10:00', 50);
      
      expect(resultado).toBe('5:00');
    });

    it('deve verificar fim de período através da instância da classe', () => {
      const service = new RepasseService();
      const inicioVigencia = new Date('2024-01-01');
      const resultado = service.isFimPeriodo(12, 2024, inicioVigencia, 12);
      
      expect(resultado).toBe(true);
    });
  });
});
