import { describe, it, expect } from 'vitest';
import { matrizDaAba } from '@/utils/exportarTabela';
import type { ResultadoBancoMes, ResultadoUnidade } from '@/services/bancosHoras/motorBancosHoras';
import {
  ajustesDosRequerimentos,
  camposAlterados,
  exportacaoControle,
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

describe('camposAlterados', () => {
  it('antes e depois de cada campo alterado, sem os campos de controle', () => {
    expect(
      camposAlterados({
        campos: ['minutos', 'justificativa', 'updated_at', 'updated_by'],
        antes: { minutos: 30, justificativa: null, updated_at: 'x' },
        depois: { minutos: 60, justificativa: 'Revisão', updated_at: 'y' },
      })
    ).toEqual([
      { campo: 'minutos', antes: '30', depois: '60' },
      { campo: 'justificativa', antes: '—', depois: 'Revisão' },
    ]);
  });

  it('inclusão e exclusão não listam campos', () => {
    expect(camposAlterados({ campos: [], antes: null, depois: { a: 1 } })).toEqual([]);
  });
});

describe('exportacaoControle', () => {
  const t = (chave: string, valores?: Record<string, unknown>) =>
    valores ? `${chave} ${JSON.stringify(valores)}` : chave;
  const q = (chave: string) => `controleBancoHoras.quadro.${chave}`;
  const unidade = (extra: Partial<ResultadoUnidade> = {}): ResultadoUnidade => ({
    baseline: 600,
    repasseAnterior: -60,
    saldoAUtilizar: 540,
    consumo: 120,
    requerimentos: 30,
    reajustes: 15,
    consumoTotal: 135,
    saldo: 405,
    repasse: 405,
    consumidoDeOutros: 0,
    cedidoAOutros: 0,
    saldoFinal: 405,
    excedente: 0,
    valorExcedente: 0,
    taxa: null,
    ...extra,
  });
  const mes = (m: number, resultado?: Partial<ResultadoBancoMes>) => ({
    mes: { ano: 2026, mes: m },
    chave: `2026-${String(m).padStart(2, '0')}`,
    situacao: (resultado ? 'aberto' : 'futuro') as 'aberto' | 'futuro',
    resultado: resultado
      ? ({ percentualRepasse: 50, horas: null, tickets: null, ...resultado } as ResultadoBancoMes)
      : undefined,
  });

  it('uma aba por banco: as linhas do quadro nas linhas e os meses nas colunas', () => {
    const exportacao = exportacaoControle(
      'ALFA',
      [
        {
          banco: { nome: 'Banco COMEX', tipoContrato: 'horas' },
          meses: [mes(8, { horas: unidade() }), mes(9)],
        },
      ],
      t,
      'pt-BR'
    );
    expect(exportacao).toMatchObject({
      arquivo: 'controleBancoHoras.exportar.arquivo {"empresa":"ALFA"}',
      titulo: 'controleBancoHoras.exportar.titulo {"empresa":"ALFA"}',
    });
    expect(exportacao.abas.map((a) => a.nome)).toEqual(['Banco COMEX']);
    expect(matrizDaAba(exportacao.abas[0])).toEqual([
      ['controleBancoHoras.exportar.linha', 'Ago/2026', 'Set/2026'],
      [q('baseline'), '10:00', ''],
      [q('repasseAnterior'), '-01:00', ''],
      [q('disponivel'), '09:00', ''],
      [q('chamados'), '02:00', ''],
      [q('requerimentos'), '00:30', ''],
      [q('reajustes'), '+00:15', ''],
      [q('consumoTotal'), '02:15', ''],
      [q('saldo'), '06:45', ''],
      ['controleBancoHoras.quadro.repasse {"n":50}', '06:45', ''],
    ]);
  });

  it('banco de horas e tickets traz as duas unidades; excedente e consumo entre bancos só quando há', () => {
    const exportacao = exportacaoControle(
      'ALFA',
      [
        {
          banco: { nome: 'Banco FISCAL', tipoContrato: 'ambos' },
          meses: [
            mes(8, {
              horas: unidade({ cedidoAOutros: 60, excedente: 30, valorExcedente: 150 }),
              tickets: unidade({ baseline: 10 }),
            }),
          ],
        },
      ],
      t,
      'pt-BR'
    );
    const rotulos = matrizDaAba(exportacao.abas[0]).map((l) => l[0]);
    expect(rotulos).toContain(
      'controleBancoHoras.quadro.cedidoAOutros · controleBancoHoras.quadro.horas'
    );
    expect(rotulos).toContain(
      'controleBancoHoras.quadro.saldoFinal · controleBancoHoras.quadro.horas'
    );
    expect(rotulos).toContain(
      'controleBancoHoras.quadro.valorFaturar · controleBancoHoras.quadro.horas'
    );
    expect(rotulos).not.toContain(
      'controleBancoHoras.quadro.cedidoAOutros · controleBancoHoras.quadro.tickets'
    );
    const linha = (rotulo: string) => matrizDaAba(exportacao.abas[0]).find((l) => l[0] === rotulo);
    expect(linha('controleBancoHoras.quadro.baseline · controleBancoHoras.quadro.tickets')).toEqual(
      ['controleBancoHoras.quadro.baseline · controleBancoHoras.quadro.tickets', 10]
    );
    expect(
      linha('controleBancoHoras.quadro.valorFaturar · controleBancoHoras.quadro.horas')?.[1]
    ).toBe(150);
  });
});
