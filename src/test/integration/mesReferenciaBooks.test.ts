import { describe, it, expect } from 'vitest';
import { mapearVariaveisClientBooks, gerarDadosExemplo } from '@/utils/clientBooksVariableMapping';

describe('Mês de Referência - Sistema de Books', () => {
  it('deve retornar mês anterior quando disparo é em setembro', () => {
    const dadosExemplo = gerarDadosExemplo();
    
    // Simular disparo em setembro
    dadosExemplo.disparo = {
      mes: 9, // Setembro
      ano: 2025,
      dataDisparo: new Date(2025, 8, 15) // 15 de setembro
    };

    const variaveis = mapearVariaveisClientBooks(dadosExemplo);

    // Deve retornar agosto (mês anterior)
    expect(variaveis['disparo.mesNome']).toBe('Agosto');
    expect(variaveis['disparo.mes']).toBe('8');
    expect(variaveis['disparo.ano']).toBe('2025');
  });

  it('deve retornar dezembro do ano anterior quando disparo é em janeiro', () => {
    const dadosExemplo = gerarDadosExemplo();
    
    // Simular disparo em janeiro
    dadosExemplo.disparo = {
      mes: 1, // Janeiro
      ano: 2025,
      dataDisparo: new Date(2025, 0, 15) // 15 de janeiro
    };

    const variaveis = mapearVariaveisClientBooks(dadosExemplo);

    // Deve retornar dezembro do ano anterior
    expect(variaveis['disparo.mesNome']).toBe('Dezembro');
    expect(variaveis['disparo.mes']).toBe('12');
    expect(variaveis['disparo.ano']).toBe('2024'); // Ano anterior
  });

  it('deve retornar janeiro quando disparo é em fevereiro', () => {
    const dadosExemplo = gerarDadosExemplo();
    
    // Simular disparo em fevereiro
    dadosExemplo.disparo = {
      mes: 2, // Fevereiro
      ano: 2025,
      dataDisparo: new Date(2025, 1, 15) // 15 de fevereiro
    };

    const variaveis = mapearVariaveisClientBooks(dadosExemplo);

    // Deve retornar janeiro
    expect(variaveis['disparo.mesNome']).toBe('Janeiro');
    expect(variaveis['disparo.mes']).toBe('1');
    expect(variaveis['disparo.ano']).toBe('2025');
  });

  it('deve retornar novembro quando disparo é em dezembro', () => {
    const dadosExemplo = gerarDadosExemplo();
    
    // Simular disparo em dezembro
    dadosExemplo.disparo = {
      mes: 12, // Dezembro
      ano: 2025,
      dataDisparo: new Date(2025, 11, 15) // 15 de dezembro
    };

    const variaveis = mapearVariaveisClientBooks(dadosExemplo);

    // Deve retornar novembro
    expect(variaveis['disparo.mesNome']).toBe('Novembro');
    expect(variaveis['disparo.mes']).toBe('11');
    expect(variaveis['disparo.ano']).toBe('2025');
  });
});