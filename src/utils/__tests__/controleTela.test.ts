import { describe, it, expect } from 'vitest';
import {
  ajustesDosRequerimentos,
  indiceReferencia,
  mesesComSituacao,
  resultadoDoBanco,
  rotuloMesLocal,
  rotuloPeriodoLocal,
  unidadePrincipal,
} from '../controleTela';
import type { QuadroEmpresa } from '@/services/controleBancoHorasService';
import type { RequerimentoControle } from '@/types/controleBancoHoras';

const resultado = (ano: number, mes: number, bancoId: string, fechado: boolean) => ({
  empresaId: 'e1',
  mes: { ano, mes },
  bancos: [
    {
      bancoId,
      nome: bancoId,
      mes: { ano, mes },
      fechado,
      fimPeriodo: false,
      transicaoPeriodo: false,
      percentualRepasse: 100,
      horas: null,
      tickets: null,
      valorAFaturar: 0,
      observacoes: [],
      alertas: [],
    },
  ],
  transferencias: [],
  semBanco: { minutos: 0, tickets: 0 },
  alertas: [],
});

const QUADRO = {
  '2026-07': resultado(2026, 7, 'b1', true),
  '2026-08': resultado(2026, 8, 'b1', false),
  '2026-09': resultado(2026, 9, 'b1', false),
} as unknown as QuadroEmpresa;
const MESES = [
  { ano: 2026, mes: 7 },
  { ano: 2026, mes: 8 },
  { ano: 2026, mes: 9 },
];

describe('unidadePrincipal', () => {
  it('banco só de tickets mostra tickets; os demais, horas', () => {
    expect(unidadePrincipal('tickets')).toBe('tickets');
    expect(unidadePrincipal('horas')).toBe('horas');
    expect(unidadePrincipal('ambos')).toBe('horas');
  });
});

describe('resultadoDoBanco', () => {
  it('o resultado do banco no mês, pela chave AAAA-MM', () => {
    expect(resultadoDoBanco(QUADRO, { ano: 2026, mes: 8 }, 'b1')?.fechado).toBe(false);
    expect(resultadoDoBanco(QUADRO, { ano: 2026, mes: 8 }, 'outro')).toBeUndefined();
    expect(resultadoDoBanco(QUADRO, { ano: 2026, mes: 12 }, 'b1')).toBeUndefined();
  });
});

describe('mesesComSituacao', () => {
  it('fechado pelo resultado; depois do mês atual, futuro', () => {
    expect(
      mesesComSituacao(MESES, QUADRO, 'b1', { ano: 2026, mes: 8 }).map((m) => [m.chave, m.situacao])
    ).toEqual([
      ['2026-07', 'fechado'],
      ['2026-08', 'aberto'],
      ['2026-09', 'futuro'],
    ]);
  });
});

describe('indiceReferencia', () => {
  it('o mês aberto; sem aberto, o último fechado; sem nenhum, o primeiro', () => {
    const s = (...situacoes: string[]) => situacoes.map((situacao) => ({ situacao })) as never;
    expect(indiceReferencia(s('fechado', 'aberto', 'futuro'))).toBe(1);
    expect(indiceReferencia(s('fechado', 'fechado', 'futuro'))).toBe(1);
    expect(indiceReferencia(s('futuro', 'futuro'))).toBe(0);
  });
});

describe('rótulos de mês no idioma', () => {
  it('mês abreviado com a primeira maiúscula e sem ponto', () => {
    expect(rotuloMesLocal({ ano: 2026, mes: 8 }, 'pt-BR')).toBe('Ago/2026');
    expect(rotuloMesLocal({ ano: 2026, mes: 8 }, 'en')).toBe('Aug/2026');
    expect(rotuloMesLocal({ ano: 2026, mes: 1 }, 'es')).toBe('Ene/2026');
  });

  it('período no mesmo ano, atravessando o ano e de um mês só', () => {
    const m = (ano: number, mes: number) => ({ ano, mes });
    expect(rotuloPeriodoLocal([m(2026, 7), m(2026, 8), m(2026, 9)], 'pt-BR')).toBe(
      'Jul – Set/2026'
    );
    expect(rotuloPeriodoLocal([m(2026, 11), m(2026, 12), m(2027, 1)], 'en')).toBe(
      'Nov/2026 – Jan/2027'
    );
    expect(rotuloPeriodoLocal([m(2026, 10)], 'pt-BR')).toBe('Out/2026');
  });
});

describe('ajustesDosRequerimentos', () => {
  const req = (id: string, bancoId: string | null, bancoAutomaticoId: string | null) =>
    ({ id, bancoId, bancoAutomaticoId }) as RequerimentoControle;
  const LISTA = [
    req('r1', 'bA', 'bA'),
    req('r2', 'bB', 'bA'),
    req('r3', 'bA', 'bA'),
    req('r4', null, null),
  ];

  it('só as escolhas que mudam o banco; voltar ao banco do módulo tira o ajuste', () => {
    expect(
      ajustesDosRequerimentos(LISTA, { r1: 'bB', r2: 'bA', r3: 'bA', r4: 'bC', fora: 'bB' })
    ).toEqual([
      { requerimentoId: 'r1', bancoId: 'bB' },
      { requerimentoId: 'r2', bancoId: null },
      { requerimentoId: 'r4', bancoId: 'bC' },
    ]);
    expect(ajustesDosRequerimentos(LISTA, {})).toEqual([]);
  });
});
