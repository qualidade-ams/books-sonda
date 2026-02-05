/**
 * Testes para utilitários de período de vigência
 */

import { calcularNomePeriodo } from '../periodoVigenciaUtils';

describe('periodoVigenciaUtils', () => {
  describe('calcularNomePeriodo', () => {
    // Teste do exemplo fornecido pelo usuário
    test('deve calcular 2º Trimestre para janeiro/2026 com vigência 09/2025 e período 3', () => {
      const resultado = calcularNomePeriodo('09/2025', 3, 1, 2026);
      expect(resultado).toBe('2º Trimestre');
    });

    // Testes para diferentes períodos de apuração
    test('deve retornar "Mensal" para período de apuração 1', () => {
      const resultado = calcularNomePeriodo('01/2025', 1, 5, 2025);
      expect(resultado).toBe('Mensal');
    });

    test('deve calcular bimestres corretamente', () => {
      // Período de 2 meses, iniciando em janeiro
      expect(calcularNomePeriodo('01/2025', 2, 1, 2025)).toBe('1º Bimestre'); // Jan-Fev
      expect(calcularNomePeriodo('01/2025', 2, 3, 2025)).toBe('2º Bimestre'); // Mar-Abr
      expect(calcularNomePeriodo('01/2025', 2, 5, 2025)).toBe('3º Bimestre'); // Mai-Jun
    });

    test('deve calcular trimestres corretamente', () => {
      // Período de 3 meses, iniciando em setembro
      expect(calcularNomePeriodo('09/2025', 3, 9, 2025)).toBe('1º Trimestre'); // Set-Nov/2025
      expect(calcularNomePeriodo('09/2025', 3, 12, 2025)).toBe('2º Trimestre'); // Dez/2025-Fev/2026
      expect(calcularNomePeriodo('09/2025', 3, 3, 2026)).toBe('3º Trimestre'); // Mar-Mai/2026
      expect(calcularNomePeriodo('09/2025', 3, 6, 2026)).toBe('4º Trimestre'); // Jun-Ago/2026
    });

    test('deve calcular semestres corretamente', () => {
      // Período de 6 meses, iniciando em janeiro
      expect(calcularNomePeriodo('01/2025', 6, 3, 2025)).toBe('1º Semestre'); // Jan-Jun
      expect(calcularNomePeriodo('01/2025', 6, 8, 2025)).toBe('2º Semestre'); // Jul-Dez
    });

    test('deve retornar "Anual" para período de 12 meses', () => {
      const resultado = calcularNomePeriodo('01/2025', 12, 6, 2025);
      expect(resultado).toBe('Anual');
    });

    test('deve lidar com períodos especiais', () => {
      expect(calcularNomePeriodo('01/2025', 5, 3, 2025)).toBe('5 meses');
      expect(calcularNomePeriodo('01/2025', 7, 4, 2025)).toBe('7 meses');
      expect(calcularNomePeriodo('01/2025', 8, 5, 2025)).toBe('8 meses');
    });

    // Testes de renovação anual
    test('deve reiniciar o ciclo após 12 meses', () => {
      // Vigência inicia em setembro/2025, período trimestral
      // Setembro/2026 deve ser novamente 1º Trimestre
      expect(calcularNomePeriodo('09/2025', 3, 9, 2026)).toBe('1º Trimestre');
      expect(calcularNomePeriodo('09/2025', 3, 12, 2026)).toBe('2º Trimestre');
    });

    // Testes de validação
    test('deve retornar erro para vigência inválida', () => {
      expect(calcularNomePeriodo(null, 3, 1, 2025)).toBe('Período não definido');
      expect(calcularNomePeriodo(undefined, 3, 1, 2025)).toBe('Período não definido');
      expect(calcularNomePeriodo('', 3, 1, 2025)).toBe('Período não definido');
    });

    test('deve retornar erro para período de apuração inválido', () => {
      expect(calcularNomePeriodo('01/2025', null, 1, 2025)).toBe('Período não definido');
      expect(calcularNomePeriodo('01/2025', undefined, 1, 2025)).toBe('Período não definido');
    });

    test('deve lidar com formato de data YYYY-MM-DD', () => {
      const resultado = calcularNomePeriodo('2025-09-01', 3, 1, 2026);
      expect(resultado).toBe('2º Trimestre');
    });

    test('deve retornar "Vigência não iniciada" para datas futuras', () => {
      const resultado = calcularNomePeriodo('12/2025', 3, 6, 2025);
      expect(resultado).toBe('Vigência não iniciada');
    });
  });
});