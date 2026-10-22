import { describe, it, expect, vi } from 'vitest';
import {
  calcularEmpresaMes,
  type BancoCadastro,
  type LinhaConsumo,
  type LinhaRequerimento,
  type ReajusteBanco,
  type RepositorioBancosHoras,
  type ResultadoBancoMes,
} from '../motorBancosHoras';
import type { GrupoDePara } from '../classificacao';
import type { MesAno } from '../calculo';
import type { TaxaCliente } from '../taxas';

const EMPRESA = 'emp';

const banco = (v: Partial<BancoCadastro> & { bancoId: string }): BancoCadastro => ({
  nome: v.bancoId,
  ordem: 1,
  padrao: false,
  ativo: true,
  visivelCliente: true,
  tipoContrato: 'horas',
  periodoApuracao: 3,
  inicioVigencia: { mes: 1, ano: 2026 },
  diaInicioApuracao: 1,
  diaFimApuracao: 0,
  taxaProduto: 'OUTROS',
  taxaTipoHora: 'excedente',
  repasseEspecial: 'nenhum',
  duracaoPeriodoMeses: null,
  periodosAteZerar: null,
  consomeOutrosBancos: false,
  escopo: [],
  filtroIc: null,
  baselines: [
    {
      dataInicio: '2026-01-01',
      dataFim: null,
      baselineMinutos: 2400,
      baselineTickets: 10,
      credito: 'mensal',
    },
  ],
  repasses: [
    {
      dataInicio: '2026-01-01',
      dataFim: null,
      percentualMensal: 50,
      percentualDentroPeriodo: null,
      percentualEntrePeriodos: null,
    },
  ],
  ...v,
});

const taxaPadrao: TaxaCliente = {
  id: 'tx',
  vigenciaInicio: '2025-01-01',
  tipoProduto: 'OUTROS',
  tipoCalculoAdicional: 'media',
  valorTicketExcedente: 200,
  ticketExcedente2: null,
  ticketExcedente: null,
  funcoesRemotas: [{ funcao: 'Funcional', valorBase: 100, valorAdicional: 150 }],
};

const chave = (m: MesAno) => `${m.mes}/${m.ano}`;
const linha = (
  grupo: string,
  minutos: number,
  extra: Partial<LinhaConsumo> = {}
): LinhaConsumo => ({
  fonte: 'apontamento',
  grupo,
  itemConfiguracao: 'IC',
  minutos,
  tickets: 0,
  ...extra,
});

interface Cenario {
  bancos: BancoCadastro[];
  dePara?: GrupoDePara[];
  /** mês → janela "di-df" → linhas; janela padrão "1-0" */
  consumo?: Record<string, Record<string, LinhaConsumo[]> | LinhaConsumo[]>;
  requerimentos?: Record<string, LinhaRequerimento[]>;
  reajustes?: ReajusteBanco[];
  fechados?: ResultadoBancoMes[];
  taxas?: TaxaCliente[];
}

function repositorio(c: Cenario): RepositorioBancosHoras {
  return {
    bancos: vi.fn(async () => c.bancos),
    dePara: vi.fn(async () => c.dePara ?? []),
    consumo: vi.fn(async (_e: string, m: MesAno, di: number, df: number) => {
      const doMes = c.consumo?.[chave(m)];
      if (!doMes) return [];
      if (Array.isArray(doMes)) return di === 1 ? doMes : [];
      return doMes[`${di}-${df}`] ?? [];
    }),
    requerimentos: vi.fn(async (_e: string, m: MesAno) => c.requerimentos?.[chave(m)] ?? []),
    reajustes: vi.fn(async () => c.reajustes ?? []),
    fechamentos: vi.fn(async () => c.fechados ?? []),
    taxas: vi.fn(async () => c.taxas ?? [taxaPadrao]),
  };
}

const doBanco = (r: { bancos: ResultadoBancoMes[] }, id: string) =>
  r.bancos.find((b) => b.bancoId === id)!;

describe('calcularEmpresaMes — cadeia do período', () => {
  const unico = banco({ bancoId: 'p', padrao: true });

  it('encadeia o repasse desde o início do período e não grava nada', async () => {
    const repo = repositorio({
      bancos: [unico],
      consumo: { '1/2026': [linha('G', 1000)], '2/2026': [linha('G', 2000)] },
    });
    const r = await calcularEmpresaMes(repo, EMPRESA, { mes: 2, ano: 2026 });
    const h = doBanco(r, 'p').horas!;
    expect(h.repasseAnterior).toBe(700); // jan: 2400 − 1000 = 1400 → 50%
    expect(h.saldo).toBe(1100); // 2400 + 700 − 2000
    expect(h.repasse).toBe(550);
    expect(doBanco(r, 'p').fechado).toBe(false);
    expect(doBanco(r, 'p').fimPeriodo).toBe(false);
  });

  it('fim de período negativo: excedente, valor pela taxa e observação de faturamento', async () => {
    const repo = repositorio({
      bancos: [unico],
      consumo: {
        '1/2026': [linha('G', 2400)],
        '2/2026': [linha('G', 2400)],
        '3/2026': [linha('G', 2790)],
      },
    });
    const r = await calcularEmpresaMes(repo, EMPRESA, { mes: 3, ano: 2026 });
    const b = doBanco(r, 'p');
    expect(b.fimPeriodo).toBe(true);
    expect(b.horas!.saldo).toBe(-390);
    expect(b.horas!.excedente).toBe(390);
    expect(b.horas!.repasse).toBe(0);
    expect(b.horas!.taxa).toBe(150);
    expect(b.horas!.valorExcedente).toBe(975);
    expect(b.valorAFaturar).toBe(975);
    expect(b.observacoes).toEqual([
      {
        origem: 'faturamento',
        texto: 'Excedente de 6:30 horas no período 03/2026 - Valor: R$ 975,00',
      },
    ]);
  });

  it('sem taxa: excedente com valor 0 e alerta (RC-75)', async () => {
    const repo = repositorio({
      bancos: [unico],
      consumo: { '3/2026': [linha('G', 10000)] },
      taxas: [],
    });
    const r = await calcularEmpresaMes(repo, EMPRESA, { mes: 3, ano: 2026 });
    expect(doBanco(r, 'p').horas!.valorExcedente).toBe(0);
    expect(doBanco(r, 'p').alertas).toContain(
      'Taxa não encontrada para o período. Excedente não pode ser calculado.'
    );
  });

  it('reajustes do banco entram no consumo total', async () => {
    const repo = repositorio({
      bancos: [unico],
      reajustes: [
        { bancoId: 'p', mes: 1, ano: 2026, tipo: 'entrada', minutos: 60, tickets: 0 },
        { bancoId: 'p', mes: 1, ano: 2026, tipo: 'saida', minutos: 30, tickets: 0 },
        { bancoId: 'outro', mes: 1, ano: 2026, tipo: 'saida', minutos: 999, tickets: 0 },
      ],
    });
    const r = await calcularEmpresaMes(repo, EMPRESA, { mes: 1, ano: 2026 });
    expect(doBanco(r, 'p').horas!.reajustes).toBe(30);
    expect(doBanco(r, 'p').horas!.saldo).toBe(2430);
  });
});

describe('calcularEmpresaMes — meses fechados (A2, D-11)', () => {
  const unico = banco({ bancoId: 'p', padrao: true });
  const congelado = (m: MesAno, repasse: number): ResultadoBancoMes => ({
    bancoId: 'p',
    nome: 'p',
    mes: m,
    fechado: true,
    fimPeriodo: false,
    transicaoPeriodo: false,
    percentualRepasse: 50,
    horas: {
      baseline: 2400,
      repasseAnterior: 0,
      saldoAUtilizar: 2400,
      consumo: 0,
      requerimentos: 0,
      reajustes: 0,
      consumoTotal: 0,
      saldo: 2400,
      consumidoDeOutros: 0,
      cedidoAOutros: 0,
      saldoFinal: 2400,
      repasse,
      excedente: 0,
      valorExcedente: 0,
      taxa: 150,
    },
    tickets: null,
    valorAFaturar: 0,
    observacoes: [],
    alertas: [],
  });

  it('o mês seguinte a um mês fechado parte do repasse congelado', async () => {
    const repo = repositorio({
      bancos: [unico],
      fechados: [congelado({ mes: 1, ano: 2026 }, 999)],
    });
    const r = await calcularEmpresaMes(repo, EMPRESA, { mes: 2, ano: 2026 });
    expect(doBanco(r, 'p').horas!.repasseAnterior).toBe(999);
    expect(repo.consumo).not.toHaveBeenCalledWith(EMPRESA, { mes: 1, ano: 2026 }, 1, 0);
  });

  it('mês fechado devolve o resultado congelado, sem recalcular', async () => {
    const fechado = congelado({ mes: 2, ano: 2026 }, 123);
    const repo = repositorio({ bancos: [unico], fechados: [fechado] });
    const r = await calcularEmpresaMes(repo, EMPRESA, { mes: 2, ano: 2026 });
    expect(doBanco(r, 'p')).toEqual(fechado);
    expect(repo.consumo).not.toHaveBeenCalled();
  });
});

describe('calcularEmpresaMes — vários bancos', () => {
  // Caso 8.1 da spec (simplificado): COMEX, e-DOCS e FISCAL padrão
  const bancos = [
    banco({ bancoId: 'comex', ordem: 1, escopo: [{ produtoId: 'COMEX', moduloId: null }] }),
    banco({ bancoId: 'edocs', ordem: 2, escopo: [{ produtoId: 'FISCAL', moduloId: 'EDOCS' }] }),
    banco({ bancoId: 'fiscal', ordem: 3, padrao: true }),
  ];
  const dePara: GrupoDePara[] = [
    { grupoAranda: 'CAMBIO', produtoId: 'COMEX', moduloId: 'CAMBIO', ativo: true },
    { grupoAranda: 'EDOCS', produtoId: 'FISCAL', moduloId: 'EDOCS', ativo: true },
    { grupoAranda: 'SPED', produtoId: 'FISCAL', moduloId: 'EFD', ativo: true },
  ];

  it('cada banco recebe o seu consumo; o resto vai para o padrão (CA-05)', async () => {
    const repo = repositorio({
      bancos,
      dePara,
      consumo: {
        '1/2026': [
          linha('CAMBIO', 4220),
          linha('EDOCS', 1720),
          linha('SPED', 1865),
          linha('DEDICADOS', 750),
        ],
      },
    });
    const r = await calcularEmpresaMes(repo, EMPRESA, { mes: 1, ano: 2026 });
    expect(doBanco(r, 'comex').horas!.consumo).toBe(4220);
    expect(doBanco(r, 'edocs').horas!.consumo).toBe(1720);
    expect(doBanco(r, 'fiscal').horas!.consumo).toBe(2615);
    expect(r.semBanco).toEqual({ minutos: 0, tickets: 0 });
  });

  it('consumo entre bancos no fim do período (caso 8.3)', async () => {
    const semestral = { periodoApuracao: 6, inicioVigencia: { mes: 7, ano: 2026 } };
    const repo = repositorio({
      bancos: [
        banco({
          bancoId: 'fiscal',
          nome: 'Banco FISCAL',
          ordem: 1,
          padrao: true,
          ...semestral,
          baselines: [],
        }),
        banco({
          bancoId: 'edocs',
          nome: 'FISCAL – e-DOCS',
          ordem: 2,
          consomeOutrosBancos: true,
          escopo: [{ produtoId: 'FISCAL', moduloId: 'EDOCS' }],
          ...semestral,
          baselines: [],
        }),
      ],
      dePara,
      reajustes: [
        { bancoId: 'fiscal', mes: 12, ano: 2026, tipo: 'entrada', minutos: 3135, tickets: 0 },
        { bancoId: 'edocs', mes: 12, ano: 2026, tipo: 'saida', minutos: 390, tickets: 0 },
      ],
    });
    const r = await calcularEmpresaMes(repo, EMPRESA, { mes: 12, ano: 2026 });
    const edocs = doBanco(r, 'edocs');
    const fiscal = doBanco(r, 'fiscal');
    expect(r.transferencias).toEqual([
      { cedenteId: 'fiscal', consumidorId: 'edocs', unidade: 'horas', quantidade: 390 },
    ]);
    expect(edocs.horas).toMatchObject({
      saldo: -390,
      consumidoDeOutros: 390,
      saldoFinal: 0,
      excedente: 0,
    });
    expect(fiscal.horas).toMatchObject({
      saldo: 3135,
      cedidoAOutros: 390,
      saldoFinal: 2745,
      repasse: 0,
    });
    expect(edocs.observacoes).toContainEqual({
      origem: 'consumo_entre_bancos',
      texto: '06:30 horas consumidas do Banco FISCAL',
    });
    expect(fiscal.observacoes).toContainEqual({
      origem: 'consumo_entre_bancos',
      texto: '06:30 horas cedidas ao banco FISCAL – e-DOCS',
    });
  });

  it('banco cuja vigência ainda não começou não aparece; o consumo vai para o padrão', async () => {
    const repo = repositorio({
      bancos: [bancos[0], { ...bancos[2], inicioVigencia: { mes: 1, ano: 2026 } }].map((b, i) =>
        i === 0 ? { ...b, inicioVigencia: { mes: 3, ano: 2026 } } : b
      ),
      dePara,
      consumo: { '1/2026': [linha('CAMBIO', 100)] },
    });
    const r = await calcularEmpresaMes(repo, EMPRESA, { mes: 1, ano: 2026 });
    expect(r.bancos.map((b) => b.bancoId)).toEqual(['fiscal']);
    expect(doBanco(r, 'fiscal').horas!.consumo).toBe(100);
  });

  it('depois do fim da vigência o banco não aparece; o consumo vai para o padrão', async () => {
    const repo = repositorio({
      bancos: [{ ...bancos[0], fimVigencia: { mes: 2, ano: 2026 } }, bancos[2]],
      dePara,
      consumo: { '3/2026': [linha('CAMBIO', 100)] },
    });
    const r = await calcularEmpresaMes(repo, EMPRESA, { mes: 3, ano: 2026 });
    expect(r.bancos.map((b) => b.bancoId)).toEqual(['fiscal']);
    expect(doBanco(r, 'fiscal').horas!.consumo).toBe(100);
  });

  it('no último mês da vigência o banco encerra como num fim de período (P1)', async () => {
    // Trimestral desde janeiro, encerrado em fevereiro, no meio do período
    const repo = repositorio({
      bancos: [{ ...bancos[0], fimVigencia: { mes: 2, ano: 2026 } }, bancos[2]],
      dePara,
      consumo: { '1/2026': [linha('CAMBIO', 1000)], '2/2026': [linha('CAMBIO', 4000)] },
    });
    const r = await calcularEmpresaMes(repo, EMPRESA, { mes: 2, ano: 2026 });
    const comex = doBanco(r, 'comex');
    expect(comex.fimPeriodo).toBe(true);
    // Janeiro: 2400 − 1000 = 1400, repassa 50% = 700. Fevereiro: 2400 + 700 − 4000 = −900
    expect(comex.horas).toMatchObject({
      repasseAnterior: 700,
      saldo: -900,
      repasse: 0,
      excedente: 900,
    });
  });

  it('sem Banco padrão, o que não se encaixa fica sem banco e gera alerta', async () => {
    const repo = repositorio({
      bancos: [bancos[0]],
      dePara,
      consumo: { '1/2026': [linha('CAMBIO', 100), linha('SPED', 50)] },
    });
    const r = await calcularEmpresaMes(repo, EMPRESA, { mes: 1, ano: 2026 });
    expect(r.semBanco).toEqual({ minutos: 50, tickets: 0 });
    expect(r.alertas.join(' ')).toMatch(/sem banco/i);
  });

  it('banco com janela própria (16 a 15) recebe só o consumo da sua janela', async () => {
    const repo = repositorio({
      bancos: [banco({ bancoId: 'p', padrao: true, diaInicioApuracao: 16, diaFimApuracao: 15 })],
      consumo: { '1/2026': { '16-15': [linha('G', 77)], '1-0': [linha('G', 999)] } },
    });
    const r = await calcularEmpresaMes(repo, EMPRESA, { mes: 1, ano: 2026 });
    expect(doBanco(r, 'p').horas!.consumo).toBe(77);
    expect(repo.consumo).toHaveBeenCalledWith(EMPRESA, { mes: 1, ano: 2026 }, 16, 15);
  });
});

describe('calcularEmpresaMes — requerimentos (RN-09, D-01)', () => {
  const bancos = [
    banco({ bancoId: 'comex', ordem: 1, escopo: [{ produtoId: 'COMEX', moduloId: null }] }),
    banco({ bancoId: 'p', ordem: 2, padrao: true }),
  ];
  const req = (v: Partial<LinhaRequerimento>): LinhaRequerimento => ({
    requerimentoId: 'r',
    produtoId: null,
    moduloId: null,
    bancoAjustadoId: null,
    horas: 0,
    tickets: 0,
    ...v,
  });

  it('classifica pelo produto/módulo; o ajuste manual prevalece', async () => {
    const repo = repositorio({
      bancos,
      requerimentos: {
        '1/2026': [
          req({ requerimentoId: 'r1', produtoId: 'COMEX', horas: 2 }),
          req({ requerimentoId: 'r2', produtoId: 'COMEX', horas: 1, bancoAjustadoId: 'p' }),
          req({ requerimentoId: 'r3', produtoId: 'FISCAL', horas: 0.5 }),
        ],
      },
    });
    const r = await calcularEmpresaMes(repo, EMPRESA, { mes: 1, ano: 2026 });
    expect(doBanco(r, 'comex').horas!.requerimentos).toBe(120);
    expect(doBanco(r, 'p').horas!.requerimentos).toBe(90);
  });

  it('soma as horas decimais do banco e só então arredonda, como o cálculo atual', async () => {
    const repo = repositorio({
      bancos,
      requerimentos: {
        '1/2026': [
          req({ requerimentoId: 'a', horas: 0.125 }),
          req({ requerimentoId: 'b', horas: 0.125 }),
        ],
      },
    });
    const r = await calcularEmpresaMes(repo, EMPRESA, { mes: 1, ano: 2026 });
    expect(doBanco(r, 'p').horas!.requerimentos).toBe(15);
  });
});

describe('calcularEmpresaMes — contrato "ambos" (D-02)', () => {
  it('horas: chamados não contam, só requerimentos e reajustes; tickets contam', async () => {
    const repo = repositorio({
      bancos: [banco({ bancoId: 'p', padrao: true, tipoContrato: 'ambos' })],
      consumo: { '1/2026': [linha('G', 500), linha('G', 0, { fonte: 'ticket', tickets: 3 })] },
      requerimentos: {
        '1/2026': [
          {
            requerimentoId: 'r',
            produtoId: null,
            moduloId: null,
            bancoAjustadoId: null,
            horas: 1,
            tickets: 2,
          },
        ],
      },
    });
    const r = await calcularEmpresaMes(repo, EMPRESA, { mes: 1, ano: 2026 });
    const b = doBanco(r, 'p');
    expect(b.horas).toMatchObject({ consumo: 0, requerimentos: 60, saldo: 2340 });
    expect(b.tickets).toMatchObject({ consumo: 3, requerimentos: 2, saldo: 5 });
  });

  it('contrato só de horas não calcula tickets, e vice-versa', async () => {
    const repo = repositorio({
      bancos: [
        banco({ bancoId: 'h', padrao: true }),
        banco({
          bancoId: 't',
          ordem: 2,
          tipoContrato: 'tickets',
          filtroIc: { operador: 'igual', valor: 'NADA' },
        }),
      ],
    });
    const r = await calcularEmpresaMes(repo, EMPRESA, { mes: 1, ano: 2026 });
    expect(doBanco(r, 'h').tickets).toBeNull();
    expect(doBanco(r, 't').horas).toBeNull();
  });
});
