import { describe, it, expect } from 'vitest';
import { grupoDaComparacao } from '../comparacaoTela';
import type { ComparacaoEmpresa } from '@/types/comparacao';

const empresa = (v: Partial<ComparacaoEmpresa>): ComparacaoEmpresa => ({
  empresaId: 'e',
  empresa: 'EMPRESA',
  bancosAtivos: 1,
  situacao: 'identico',
  mesesComparados: 12,
  consumoLegadoMinutos: 0,
  consumoNovoMinutos: 0,
  consumoLegadoTickets: 0,
  consumoNovoTickets: 0,
  calculadoEm: null,
  erro: null,
  erroEm: null,
  validacao: null,
  ...v,
});

describe('grupoDaComparacao', () => {
  it.each([
    ['identico', 'conferem'],
    ['soma_confere', 'conferem'],
    ['explicada', 'explicada'],
    ['divergente', 'divergente'],
  ] as const)('%s → %s', (situacao, grupo) => {
    expect(grupoDaComparacao(empresa({ situacao }))).toBe(grupo);
  });

  it('validada vale mais que a situação', () => {
    expect(
      grupoDaComparacao(
        empresa({ situacao: 'explicada', validacao: { por: null, em: 'x', situacao: 'explicada' } })
      )
    ).toBe('validada');
  });

  it('sem resultado (só erro da rotina): sem grupo', () => {
    expect(grupoDaComparacao(empresa({ situacao: null }))).toBeNull();
  });
});
