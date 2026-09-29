import { describe, it, expect } from 'vitest';
import { calcularNivelEscalacao } from '../nivelEscalacao';

describe('calcularNivelEscalacao', () => {
  it('numera de baixo para cima: a base (Central Priorização) é o 1º nível', () => {
    expect(calcularNivelEscalacao(3)).toBe(1);
  });

  it('coordenadores (3ª linha) são o 2º nível', () => {
    expect(calcularNivelEscalacao(2)).toBe(2);
  });

  it('gestor (2ª linha) é o 3º nível', () => {
    expect(calcularNivelEscalacao(1)).toBe(3);
  });

  it('topo (Head/Diretor) é o 4º nível', () => {
    expect(calcularNivelEscalacao(0)).toBe(4);
  });
});
