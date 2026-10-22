/**
 * Testes da trava de testes do CI (scripts/test-baseline.mjs)
 *
 * O CI falha só se aparecer teste falhando (ou arquivo que não carrega) fora
 * da lista de falhas conhecidas; teste da lista que voltou a passar só gera
 * aviso para tirá-lo da lista.
 */

import { describe, it, expect } from 'vitest';
import { extrairFalhas, compararFalhas } from '../test-baseline.mjs';

const raiz = '/repo';

const relatorio = {
  testResults: [
    {
      name: '/repo/src/a/__tests__/a.test.ts',
      status: 'failed',
      message: '',
      assertionResults: [
        { ancestorTitles: ['Serviço A', 'buscar'], title: 'retorna lista', status: 'passed' },
        { ancestorTitles: ['Serviço A', 'buscar'], title: 'lança erro', status: 'failed' },
        { ancestorTitles: [], title: 'teste solto', status: 'failed' },
        { ancestorTitles: ['Serviço A'], title: 'pulado', status: 'skipped' },
      ],
    },
    {
      // Arquivo que nem carregou: falhou sem nenhum teste
      name: '/repo/src/b/__tests__/b.test.tsx',
      status: 'failed',
      message: 'Failed to resolve import "../B"',
      assertionResults: [],
    },
    {
      name: '/repo/src/c/__tests__/c.test.ts',
      status: 'passed',
      message: '',
      assertionResults: [{ ancestorTitles: ['C'], title: 'ok', status: 'passed' }],
    },
  ],
};

describe('extrairFalhas', () => {
  it('lista testes falhando e arquivos que não carregaram, com caminho relativo, ordenados', () => {
    expect(extrairFalhas(relatorio, raiz)).toEqual([
      'src/a/__tests__/a.test.ts > Serviço A > buscar > lança erro',
      'src/a/__tests__/a.test.ts > teste solto',
      'src/b/__tests__/b.test.tsx > (arquivo não carregou)',
    ]);
  });

  it('normaliza caminhos do Windows para barras normais', () => {
    const windows = {
      testResults: [
        {
          name: 'C:\\repo\\src\\a\\a.test.ts',
          status: 'failed',
          message: '',
          assertionResults: [{ ancestorTitles: ['A'], title: 'x', status: 'failed' }],
        },
      ],
    };
    expect(extrairFalhas(windows, 'C:\\repo')).toEqual(['src/a/a.test.ts > A > x']);
  });
});

describe('compararFalhas', () => {
  it('aponta falhas novas e falhas conhecidas que voltaram a passar', () => {
    const r = compararFalhas(['a > 1', 'a > 2', 'b > 3'], ['a > 1', 'c > 4']);
    expect(r.novas).toEqual(['a > 2', 'b > 3']);
    expect(r.corrigidas).toEqual(['c > 4']);
  });

  it('sem diferença quando as falhas são as conhecidas', () => {
    const r = compararFalhas(['a > 1'], ['a > 1']);
    expect(r.novas).toEqual([]);
    expect(r.corrigidas).toEqual([]);
  });
});
