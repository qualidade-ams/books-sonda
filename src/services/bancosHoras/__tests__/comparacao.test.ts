import { describe, expect, it } from 'vitest';
import {
  compararEmpresa,
  compararMes,
  diferencasDosItens,
  medidasDoLegado,
  medidasDoNovo,
  minutosDoIntervalo,
  type DadosItem,
  type EntradaMesComparacao,
  type ItemLado,
  type MedidasMes,
} from '../comparacao';
import type { ResultadoBancoMes, ResultadoUnidade } from '../motorBancosHoras';

// ---------------------------------------------------------------------------
// Apoio
// ---------------------------------------------------------------------------

const SET = { mes: 9, ano: 2026 };

const unidade = (v: Partial<ResultadoUnidade> = {}): ResultadoUnidade => ({
  baseline: 0,
  repasseAnterior: 0,
  saldoAUtilizar: 0,
  consumo: 0,
  requerimentos: 0,
  reajustes: 0,
  consumoTotal: 0,
  saldo: 0,
  consumidoDeOutros: 0,
  cedidoAOutros: 0,
  saldoFinal: 0,
  repasse: 0,
  excedente: 0,
  valorExcedente: 0,
  taxa: null,
  ...v,
});

const banco = (
  bancoId: string,
  v: {
    horas?: Partial<ResultadoUnidade> | null;
    tickets?: Partial<ResultadoUnidade> | null;
    valor?: number;
  } = {}
): ResultadoBancoMes => ({
  bancoId,
  nome: bancoId,
  mes: SET,
  fechado: false,
  fimPeriodo: false,
  transicaoPeriodo: false,
  percentualRepasse: 0,
  horas: v.horas === null ? null : unidade(v.horas ?? {}),
  tickets: v.tickets ? unidade(v.tickets) : null,
  valorAFaturar: v.valor ?? 0,
  observacoes: [],
  alertas: [],
});

const medidas = (
  horas: Partial<MedidasMes['horas']> = {},
  tickets: Partial<MedidasMes['tickets']> = {},
  valorAFaturar = 0
): MedidasMes => {
  const zero = { consumo: 0, requerimentos: 0, reajustes: 0, saldo: 0, repasse: 0, excedente: 0 };
  return { horas: { ...zero, ...horas }, tickets: { ...zero, ...tickets }, valorAFaturar };
};

// ---------------------------------------------------------------------------
// Legado
// ---------------------------------------------------------------------------

describe('minutosDoIntervalo', () => {
  it.each([
    ['96:40:00', 5800],
    ['-16:40:00', -1000],
    ['00:00:00', 0],
    ['12:30', 750],
    ['1 day 02:00:00', 1560],
    ['3 days', 4320],
    ['-1 days +02:00:00', -1320],
    ['10:00:30', 600],
  ])('%s = %i min', (texto, minutos) => {
    expect(minutosDoIntervalo(texto)).toBe(minutos);
  });

  it('vazio ou nulo é zero', () => {
    expect(minutosDoIntervalo(null)).toBe(0);
    expect(minutosDoIntervalo(undefined)).toBe(0);
    expect(minutosDoIntervalo('')).toBe(0);
  });

  it('texto que não é intervalo é recusado', () => {
    expect(() => minutosDoIntervalo('abc')).toThrow(/intervalo/i);
  });
});

describe('medidasDoLegado', () => {
  it('lê o snapshot_calculo do fechamento do legado em minutos e tickets', () => {
    const snapshot = {
      consumo_horas: '96:40:00',
      consumo_tickets: '3.00',
      requerimentos_horas: '04:00:00',
      requerimentos_tickets: 1,
      reajustes_horas: '-02:00:00',
      reajustes_tickets: '0.00',
      saldo_horas: '-16:40:00',
      saldo_tickets: '2.00',
      repasse_horas: '-16:40:00',
      repasse_tickets: '1.00',
      excedentes_horas: '00:00:00',
      excedentes_tickets: '0.00',
      valor_a_faturar: '1234.50',
    };
    expect(medidasDoLegado(snapshot)).toEqual({
      horas: {
        consumo: 5800,
        requerimentos: 240,
        reajustes: -120,
        saldo: -1000,
        repasse: -1000,
        excedente: 0,
      },
      tickets: { consumo: 3, requerimentos: 1, reajustes: 0, saldo: 2, repasse: 1, excedente: 0 },
      valorAFaturar: 1234.5,
    });
  });

  it('snapshot vazio (fechamento sem cálculo) vale zero', () => {
    expect(medidasDoLegado({})).toEqual(medidas());
  });
});

// ---------------------------------------------------------------------------
// Novo
// ---------------------------------------------------------------------------

describe('medidasDoNovo', () => {
  it('um banco: medidas do banco, saldo antes do consumo entre bancos', () => {
    const r = medidasDoNovo([
      banco('padrao', {
        horas: {
          consumo: 600,
          requerimentos: 60,
          reajustes: 30,
          saldo: -90,
          saldoFinal: -90,
          repasse: -90,
          excedente: 0,
        },
        valor: 10,
      }),
    ]);
    expect(r.unidades).toEqual(['horas']);
    expect(r.bancos).toBe(1);
    expect(r.total).toEqual(
      medidas({ consumo: 600, requerimentos: 60, reajustes: 30, saldo: -90, repasse: -90 }, {}, 10)
    );
    expect(r.porBanco).toEqual([{ bancoId: 'padrao', nome: 'padrao', minutos: 600, tickets: 0 }]);
  });

  it('vários bancos: soma o consumo de cada unidade e junta as unidades usadas', () => {
    const r = medidasDoNovo([
      banco('padrao', { horas: { consumo: 600 } }),
      banco('tickets', { horas: null, tickets: { consumo: 4 } }),
    ]);
    expect(r.unidades).toEqual(['horas', 'tickets']);
    expect(r.bancos).toBe(2);
    expect(r.total.horas.consumo).toBe(600);
    expect(r.total.tickets.consumo).toBe(4);
  });

  it('sem banco no mês: compara as duas unidades', () => {
    expect(medidasDoNovo([]).unidades).toEqual(['horas', 'tickets']);
  });
});

// ---------------------------------------------------------------------------
// Itens
// ---------------------------------------------------------------------------

const dados = (chave: string, v: Partial<DadosItem> = {}): DadosItem => ({
  chave,
  fonte: 'apontamento',
  chamado: `CH-${chave}`,
  data: '2026-09-15T13:00:00Z',
  grupo: 'AMS APL - COMEX - N1',
  organizacao: 'EMPRESA GAMA',
  codigoResolucao: 'RESOLVIDO',
  sincronizadoEm: '2026-09-15T14:00:00Z',
  minutosTexto: 60,
  ...v,
});

const ap = (chave: string, minutos: number): ItemLado => ({
  chave,
  fonte: 'apontamento',
  minutos,
  tickets: 0,
});

const contexto = {
  mes: SET,
  fechadoEm: '2026-10-05T12:00:00Z',
  nomeLegado: 'EMPRESA GAMA',
  organizacoesNovas: ['EMPRESA GAMA'],
  codigoConta: (codigo: string | null) => codigo !== 'CANCELADO',
  semBanco: new Set<string>(),
};

describe('diferencasDosItens', () => {
  it('item igual dos dois lados não aparece', () => {
    expect(
      diferencasDosItens([ap('a', 60)], [ap('a', 60)], new Map([['a', dados('a')]]), contexto)
    ).toEqual([]);
  });

  it('acima de 24 h: o legado perde os dias inteiros (explicado)', () => {
    const [d] = diferencasDosItens(
      [ap('a', 90)],
      [ap('a', 1530)],
      new Map([['a', dados('a', { minutosTexto: 90 })]]),
      contexto
    );
    expect(d).toMatchObject({
      chave: 'a',
      chamado: 'CH-a',
      minutosLegado: 90,
      minutosNovo: 1530,
      motivo: 'acima_24h',
      explicado: true,
    });
  });

  it('fuso: só no novo, em setembro no horário de Brasília e em outubro em UTC (explicado)', () => {
    const [d] = diferencasDosItens(
      [],
      [ap('a', 60)],
      new Map([['a', dados('a', { data: '2026-10-01T01:40:00Z' })]]),
      contexto
    );
    expect(d).toMatchObject({
      minutosLegado: null,
      minutosNovo: 60,
      motivo: 'fuso',
      explicado: true,
    });
  });

  it('fuso: só no legado, em setembro em UTC e em agosto no horário de Brasília (explicado)', () => {
    const [d] = diferencasDosItens(
      [ap('a', 60)],
      [],
      new Map([['a', dados('a', { data: '2026-09-01T01:00:00Z' })]]),
      contexto
    );
    expect(d).toMatchObject({ motivo: 'fuso', explicado: true });
  });

  it('só no novo, sincronizado depois do fechamento do legado (explicado)', () => {
    const [d] = diferencasDosItens(
      [],
      [ap('a', 60)],
      new Map([['a', dados('a', { sincronizadoEm: '2026-10-10T09:00:00Z' })]]),
      contexto
    );
    expect(d).toMatchObject({ motivo: 'depois_do_fechamento', explicado: true });
  });

  it('só no legado e sumiu do Aranda depois do fechamento (explicado)', () => {
    const [d] = diferencasDosItens([ap('legado:999', 60)], [], new Map(), contexto);
    expect(d).toMatchObject({
      chave: 'legado:999',
      chamado: null,
      motivo: 'removido_do_aranda',
      explicado: true,
    });
  });

  it('só no novo, de organização vinculada só no cadastro novo (explicado)', () => {
    const [d] = diferencasDosItens(
      [],
      [ap('a', 60)],
      new Map([['a', dados('a', { organizacao: 'GAMA FILIAL' })]]),
      { ...contexto, organizacoesNovas: ['EMPRESA GAMA', 'GAMA FILIAL'] }
    );
    expect(d).toMatchObject({ motivo: 'organizacao_so_no_novo', explicado: true });
  });

  it('só no legado, casado por curinga no nome do legado (explicado)', () => {
    const [d] = diferencasDosItens(
      [ap('a', 60)],
      [],
      new Map([['a', dados('a', { organizacao: 'EMPRESAXGAMA' })]]),
      { ...contexto, nomeLegado: 'EMPRESA_GAMA' }
    );
    expect(d).toMatchObject({ motivo: 'organizacao_curinga', explicado: true });
  });

  it('só no legado, de organização que falta no cadastro novo (sem explicação)', () => {
    const [d] = diferencasDosItens(
      [ap('a', 60)],
      [],
      new Map([['a', dados('a', { organizacao: 'OUTRA ORG' })]]),
      contexto
    );
    expect(d).toMatchObject({ motivo: 'organizacao_fora_do_cadastro', explicado: false });
  });

  it('só no legado, com código de resolução que não conta (sem explicação)', () => {
    const [d] = diferencasDosItens(
      [ap('a', 60)],
      [],
      new Map([['a', dados('a', { codigoResolucao: 'CANCELADO' })]]),
      contexto
    );
    expect(d).toMatchObject({ motivo: 'codigo_sem_regra', explicado: false });
  });

  it('só no legado, sem banco que o receba no modelo novo (sem explicação)', () => {
    const [d] = diferencasDosItens([ap('a', 60)], [], new Map([['a', dados('a')]]), {
      ...contexto,
      semBanco: new Set(['a']),
    });
    expect(d).toMatchObject({ motivo: 'fora_do_escopo', explicado: false });
  });

  it('diferença de duração sem motivo (sem explicação)', () => {
    const [d] = diferencasDosItens(
      [ap('a', 60)],
      [ap('a', 90)],
      new Map([['a', dados('a')]]),
      contexto
    );
    expect(d).toMatchObject({ motivo: 'sem_motivo', explicado: false });
  });

  it('ticket só no novo: compara a quantidade de tickets', () => {
    const [d] = diferencasDosItens(
      [],
      [{ chave: 't', fonte: 'ticket', minutos: 0, tickets: 1 }],
      new Map([['t', dados('t', { fonte: 'ticket', sincronizadoEm: '2026-10-10T09:00:00Z' })]]),
      contexto
    );
    expect(d).toMatchObject({
      fonte: 'ticket',
      ticketsLegado: null,
      ticketsNovo: 1,
      motivo: 'depois_do_fechamento',
    });
  });

  it('ordena por data, os sem dados no fim', () => {
    const r = diferencasDosItens(
      [ap('legado:1', 10), ap('b', 10)],
      [ap('a', 10)],
      new Map([
        ['a', dados('a', { data: '2026-09-20T12:00:00Z', sincronizadoEm: '2026-10-10T00:00:00Z' })],
        ['b', dados('b', { data: '2026-09-02T12:00:00Z', organizacao: 'OUTRA' })],
      ]),
      contexto
    );
    expect(r.map((d) => d.chave)).toEqual(['b', 'a', 'legado:1']);
  });
});

// ---------------------------------------------------------------------------
// Mês
// ---------------------------------------------------------------------------

const itemExplicado = (minutosNovo: number) => ({
  chave: 'x',
  fonte: 'apontamento' as const,
  chamado: 'CH-x',
  data: '2026-09-30T23:00:00Z',
  grupo: 'G',
  minutosLegado: null,
  minutosNovo,
  ticketsLegado: null,
  ticketsNovo: null,
  motivo: 'fuso' as const,
  explicado: true,
});

describe('compararMes', () => {
  const base = { unidades: ['horas' as const], umBanco: true, herdada: null };

  it('tudo igual: Igual, sem diferença', () => {
    const m = medidas({ consumo: 600, saldo: 120, repasse: 60 });
    const r = compararMes({ ...base, legado: m, novo: m, itens: [] });
    expect(r.situacao).toBe('igual');
    expect(r.diferencas).toEqual([]);
    expect(r.origem).toBeNull();
  });

  it('consumo diferente e todos os itens explicam a diferença: Explicada, e o mês vira origem', () => {
    const r = compararMes({
      ...base,
      legado: medidas({ consumo: 600, saldo: 120 }),
      novo: medidas({ consumo: 660, saldo: 60 }),
      itens: [itemExplicado(60)],
    });
    expect(r.situacao).toBe('explicada');
    expect(r.origem).toBe('explicada');
    expect(r.diferencas).toEqual([
      { unidade: 'horas', medida: 'consumo', legado: 600, novo: 660 },
      { unidade: 'horas', medida: 'saldo', legado: 120, novo: 60 },
    ]);
  });

  it('itens explicados que não fecham a diferença inteira: Divergente', () => {
    const r = compararMes({
      ...base,
      legado: medidas({ consumo: 600 }),
      novo: medidas({ consumo: 700 }),
      itens: [itemExplicado(60)],
    });
    expect(r.situacao).toBe('divergente');
  });

  it('item sem explicação: Divergente', () => {
    const r = compararMes({
      ...base,
      legado: medidas({ consumo: 600 }),
      novo: medidas({ consumo: 660 }),
      itens: [{ ...itemExplicado(60), motivo: 'sem_motivo', explicado: false }],
    });
    expect(r.situacao).toBe('divergente');
  });

  it('requerimento ou reajuste diferente: Divergente', () => {
    expect(
      compararMes({
        ...base,
        legado: medidas({ requerimentos: 60 }),
        novo: medidas({ requerimentos: 0 }),
        itens: [],
      }).situacao
    ).toBe('divergente');
    expect(
      compararMes({
        ...base,
        legado: medidas({ reajustes: 60 }),
        novo: medidas({ reajustes: 0 }),
        itens: [],
      }).situacao
    ).toBe('divergente');
  });

  it('só saldo diferente, herdado de um mês explicado: Explicada, sem virar origem', () => {
    const r = compararMes({
      ...base,
      herdada: 'explicada',
      legado: medidas({ consumo: 600, saldo: 120, repasse: 60 }),
      novo: medidas({ consumo: 600, saldo: 60, repasse: 30 }),
      itens: [],
    });
    expect(r.situacao).toBe('explicada');
    expect(r.origem).toBe('explicada');
  });

  it('só saldo diferente, sem mês anterior com diferença: Divergente (parâmetro do banco)', () => {
    const r = compararMes({
      ...base,
      legado: medidas({ saldo: 120 }),
      novo: medidas({ saldo: 60 }),
      itens: [],
    });
    expect(r.situacao).toBe('divergente');
    expect(r.origem).toBe('divergente');
  });

  it('vários bancos: saldo, repasse e excedente não entram', () => {
    const r = compararMes({
      ...base,
      umBanco: false,
      legado: medidas({ consumo: 600, saldo: 120, repasse: 60, excedente: 5 }),
      novo: medidas({ consumo: 600, saldo: 0, repasse: 0, excedente: 0 }),
      itens: [],
    });
    expect(r.situacao).toBe('igual');
  });

  it('valor a faturar diferente não muda a situação', () => {
    const r = compararMes({
      ...base,
      legado: medidas({}, {}, 100),
      novo: medidas({}, {}, 101.5),
      itens: [],
    });
    expect(r.situacao).toBe('igual');
  });

  it('unidade fora do contrato não é comparada', () => {
    const r = compararMes({
      ...base,
      legado: medidas({ consumo: 600 }, { consumo: 3 }),
      novo: medidas({ consumo: 600 }, { consumo: 0 }),
      itens: [],
    });
    expect(r.situacao).toBe('igual');
  });

  it('tickets: a diferença é explicada pelos tickets dos itens', () => {
    const r = compararMes({
      ...base,
      unidades: ['tickets'],
      legado: medidas({}, { consumo: 3 }),
      novo: medidas({}, { consumo: 4 }),
      itens: [{ ...itemExplicado(0), fonte: 'ticket', minutosNovo: null, ticketsNovo: 1 }],
    });
    expect(r.situacao).toBe('explicada');
  });
});

// ---------------------------------------------------------------------------
// Empresa
// ---------------------------------------------------------------------------

const mes = (
  m: number,
  legado: MedidasMes,
  novo: MedidasMes,
  v: Partial<EntradaMesComparacao> = {}
): EntradaMesComparacao => ({
  mes: { mes: m, ano: 2026 },
  legado,
  novo,
  unidades: ['horas'],
  bancos: 1,
  itens: [],
  ...v,
});

describe('compararEmpresa', () => {
  it('1 banco e tudo igual: Idêntico, com as somas de consumo', () => {
    const m = medidas({ consumo: 600 }, { consumo: 2 });
    const r = compararEmpresa([mes(7, m, m), mes(8, m, m)]);
    expect(r.situacao).toBe('identico');
    expect(r.mesesComparados).toBe(2);
    expect(r.consumo).toEqual({
      legadoMinutos: 1200,
      novoMinutos: 1200,
      legadoTickets: 4,
      novoTickets: 4,
    });
  });

  it('vários bancos e tudo igual: Soma confere', () => {
    const m = medidas({ consumo: 600 });
    expect(compararEmpresa([mes(8, m, m, { bancos: 2 })]).situacao).toBe('soma_confere');
  });

  it('um mês explicado e o saldo dos seguintes herdando: Explicada, com a origem gravada', () => {
    const r = compararEmpresa([
      mes(7, medidas({ consumo: 600, saldo: 0 }), medidas({ consumo: 660, saldo: -60 }), {
        itens: [itemExplicado(60)],
      }),
      mes(8, medidas({ consumo: 600, saldo: 0 }), medidas({ consumo: 600, saldo: -60 })),
      mes(9, medidas({ consumo: 600, saldo: 0 }), medidas({ consumo: 600, saldo: 0 })),
      mes(10, medidas({ saldo: 0 }), medidas({ saldo: -10 })),
    ]);
    expect(r.meses.map((x) => x.situacao)).toEqual([
      'explicada',
      'explicada',
      'igual',
      'divergente',
    ]);
    expect(r.meses[1].origemSaldo).toEqual({ mes: 7, ano: 2026 });
    expect(r.meses[2].origemSaldo).toBeNull();
    // Em setembro o saldo voltou a bater: a cadeia recomeça, e outubro não herda julho
    expect(r.meses[3].origemSaldo).toEqual({ mes: 10, ano: 2026 });
    expect(r.situacao).toBe('divergente');
  });

  it('meses fora de ordem são comparados em ordem', () => {
    const r = compararEmpresa([
      mes(8, medidas({ saldo: 0 }), medidas({ saldo: -60 })),
      mes(7, medidas({ consumo: 600 }), medidas({ consumo: 660, saldo: -60 }), {
        itens: [itemExplicado(60)],
      }),
    ]);
    expect(r.meses.map((x) => x.mes.mes)).toEqual([7, 8]);
    expect(r.situacao).toBe('explicada');
  });

  it('sem meses: nada a comparar', () => {
    const r = compararEmpresa([]);
    expect(r.mesesComparados).toBe(0);
    expect(r.situacao).toBe('identico');
  });
});
