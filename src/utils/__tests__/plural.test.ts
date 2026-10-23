import { describe, it, expect } from 'vitest';
import { plural } from '../plural';

const t = (chave: string, valores?: Record<string, unknown>) => `${chave}:${valores?.n}`;

describe('plural', () => {
  it('singular só para 1; zero e os demais no plural, como nos protótipos', () => {
    expect(plural(t, 'x.modulos', 1)).toBe('x.modulos.um:1');
    expect(plural(t, 'x.modulos', 0)).toBe('x.modulos.varios:0');
    expect(plural(t, 'x.modulos', 3)).toBe('x.modulos.varios:3');
  });

  it('aceita outros valores junto do n', () => {
    const comNomes = (chave: string, valores?: Record<string, unknown>) =>
      `${chave}:${JSON.stringify(valores)}`;
    expect(plural(comNomes, 'x.inativados', 2, { nomes: 'A, B' })).toBe(
      'x.inativados.varios:{"n":2,"nomes":"A, B"}'
    );
  });
});
