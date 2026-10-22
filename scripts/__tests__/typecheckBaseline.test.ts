/**
 * Testes da trava de contagem do typecheck (scripts/typecheck-baseline.mjs)
 *
 * O CI falha só se o número de erros do tsc passar do limite registrado;
 * abaixo do limite passa e avisa para baixar o limite.
 */

import { describe, it, expect } from 'vitest';
import { contarErrosTypecheck, avaliarTypecheck } from '../typecheck-baseline.mjs';

const saidaTsc = [
  "src/a.ts(10,5): error TS2339: Property 'x' does not exist on type 'Y'.",
  "src/b.tsx(3,1): error TS2322: Type 'number' is not assignable to type 'string'.",
  "  Type 'number' is not assignable to type 'string'.",
  "src/c.ts(7,2): error TS2304: Cannot find name 'Z'.",
  '',
].join('\n');

describe('contarErrosTypecheck', () => {
  it('conta uma vez cada erro, ignorando as linhas de continuação', () => {
    expect(contarErrosTypecheck(saidaTsc)).toBe(3);
  });

  it('aceita quebras de linha do Windows', () => {
    expect(contarErrosTypecheck(saidaTsc.replace(/\n/g, '\r\n'))).toBe(3);
  });

  it('retorna zero quando o tsc não acusa erro', () => {
    expect(contarErrosTypecheck('')).toBe(0);
  });
});

describe('avaliarTypecheck', () => {
  it('falha quando os erros passam do limite', () => {
    const r = avaliarTypecheck(333, 332);
    expect(r.ok).toBe(false);
    expect(r.mensagem).toContain('333');
    expect(r.mensagem).toContain('332');
  });

  it('passa quando os erros são iguais ao limite', () => {
    expect(avaliarTypecheck(332, 332).ok).toBe(true);
  });

  it('passa abaixo do limite e pede para baixar o limite', () => {
    const r = avaliarTypecheck(320, 332);
    expect(r.ok).toBe(true);
    expect(r.mensagem).toContain('320');
    expect(r.mensagem).toContain('typecheck-baseline.json');
  });
});
