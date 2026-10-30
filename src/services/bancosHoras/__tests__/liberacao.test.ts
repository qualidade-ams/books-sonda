import { describe, expect, it, vi } from 'vitest';
import { montarTransicao, type RepositorioLiberacao } from '../liberacao';
import type { MesAno } from '../calculo';
import type { BancoCadastro, LinhaConsumo, ResultadoBancoMes } from '../motorBancosHoras';
import type { ItemConsumo, RepositorioFechamento } from '../fechamento';
import type { GrupoDePara } from '../classificacao';
import type { FechamentoLegado, ItemDoLegado } from '../sombra';

// ---------------------------------------------------------------------------
// Cenário: Jan/2026 fechado no legado; período trimestral, repasse de 50%
// ---------------------------------------------------------------------------

const EMPRESA = 'e1';
const JAN: MesAno = { mes: 1, ano: 2026 };

const banco = (v: Partial<BancoCadastro> & { bancoId: string }): BancoCadastro => ({
  nome: v.bancoId,
  ordem: 1,
  padrao: false,
  ativo: true,
  visivelCliente: true,
  tipoContrato: 'horas',
  periodoApuracao: 3,
  inicioVigencia: JAN,
  fimVigencia: null,
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
      baselineTickets: null,
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

const padrao = banco({ bancoId: 'b1', nome: 'Banco de Horas', padrao: true });
const projetos = banco({
  bancoId: 'b2',
  nome: 'Projetos',
  ordem: 2,
  escopo: [{ produtoId: 'P', moduloId: null }],
  baselines: [
    {
      dataInicio: '2026-01-01',
      dataFim: null,
      baselineMinutos: 600,
      baselineTickets: null,
      credito: 'mensal',
    },
  ],
});
const dePara: GrupoDePara[] = [
  { grupoAranda: 'G-P', vinculos: [{ produtoId: 'P', moduloId: null }], ativo: true },
];

const item = (itemId: string, grupo: string, minutos: number): ItemConsumo => ({
  itemId,
  fonte: 'apontamento',
  grupo,
  itemConfiguracao: 'IC',
  minutos,
  tickets: 0,
});

function motor(bancos: BancoCadastro[], itens: ItemConsumo[], fechados: ResultadoBancoMes[] = []) {
  const repo: RepositorioFechamento = {
    bancos: vi.fn(async () => bancos),
    dePara: vi.fn(async () => dePara),
    consumo: vi.fn(async (_e: string, m: MesAno): Promise<LinhaConsumo[]> =>
      m.mes === 1
        ? itens.map(({ fonte, grupo, itemConfiguracao, minutos, tickets }) => ({
            fonte,
            grupo,
            itemConfiguracao,
            minutos,
            tickets,
          }))
        : []
    ),
    consumoItens: vi.fn(async (_e: string, m: MesAno) => (m.mes === 1 ? itens : [])),
    requerimentos: vi.fn(async () => []),
    reajustes: vi.fn(async () => []),
    fechamentos: vi.fn(async () => fechados),
    taxas: vi.fn(async () => []),
    gravarFechamento: vi.fn(),
  };
  return repo;
}

const hhmm = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}:00`;

const legadoJan = (consumo: number, saldo: number, repasse: number): FechamentoLegado => ({
  mes: JAN,
  fechadoEm: '2026-02-05T12:00:00Z',
  snapshot: {
    consumo_horas: hhmm(consumo),
    requerimentos_horas: '00:00:00',
    reajustes_horas: '00:00:00',
    saldo_horas: hhmm(saldo),
    repasse_horas: hhmm(repasse),
    excedentes_horas: '00:00:00',
  },
  apontamentosIds: ['EXT1', 'EXT-SUMIU'],
  ticketsIds: ['SOL-9'],
});

const doLegado = (
  chave: string,
  idLegado: string,
  fonte: 'apontamento' | 'ticket',
  minutosTexto: number
): ItemDoLegado => ({
  chave,
  idLegado,
  fonte,
  chamado: null,
  data: '2026-01-15T13:00:00Z',
  grupo: 'AMS APL - COMEX - N1',
  organizacao: 'EMPRESA ALFA',
  codigoResolucao: 'RESOLVIDO',
  sincronizadoEm: null,
  lancadoEm: null,
  codigoTrocadoEm: null,
  minutosTexto,
});

function legado(ultimo: FechamentoLegado | null): RepositorioLiberacao {
  return {
    ultimoFechamentoLegado: vi.fn(async () => ultimo),
    itensDoLegado: vi.fn(async () => [
      doLegado('u1', 'EXT1', 'apontamento', 540),
      doLegado('t1', 'SOL-9', 'ticket', 0),
    ]),
  };
}

const bancoDo = (payload: any, id: string) => payload.bancos.find((b: any) => b.banco_id === id);

// ---------------------------------------------------------------------------

describe('montarTransicao', () => {
  it('sem mês fechado no legado: não há transição', async () => {
    const m = motor([padrao], []);
    expect(await montarTransicao(m, legado(null), EMPRESA)).toBeNull();
    expect(m.bancos).not.toHaveBeenCalled();
  });

  it('1 banco: o último Book do legado vira o fechamento de transição (P1)', async () => {
    // O motor calcularia 600 min de consumo; o cliente recebeu 540, saldo 31:00 e repasse 15:30
    const m = motor([padrao], [item('u1', 'AMS APL - COMEX - N1', 600)]);
    const lib = legado(legadoJan(540, 1860, 930));
    const payload = await montarTransicao(m, lib, EMPRESA);

    expect(payload).toMatchObject({ empresa_id: EMPRESA, ano: 2026, mes: 1, motivo: 'transicao' });
    const b1 = bancoDo(payload, 'b1');
    expect(b1.horas).toMatchObject({
      consumo: 540,
      requerimentos: 0,
      reajustes: 0,
      consumo_total: 540,
      saldo: 1860,
      saldo_final: 1860,
      repasse: 930,
      excedente: 0,
    });
    // Itens: os do fechamento do legado; o que sumiu do Aranda não tem id para guardar
    expect(lib.itensDoLegado).toHaveBeenCalledWith(['EXT1', 'EXT-SUMIU'], ['SOL-9']);
    expect(b1.itens).toEqual([
      { tipo: 'apontamento', item_id: 'u1', minutos: 540, tickets: 0 },
      { tipo: 'ticket', item_id: 't1', minutos: 0, tickets: 1 },
    ]);
    expect(m.gravarFechamento).not.toHaveBeenCalled();
  });

  it('ignora o fechamento em sombra do mês: recalcula e grava nova versão', async () => {
    const sombra = { bancoId: 'b1', mes: JAN, fechado: true } as ResultadoBancoMes;
    const m = motor([padrao], [item('u1', 'AMS APL - COMEX - N1', 600)], [sombra]);
    const payload = await montarTransicao(m, legado(legadoJan(540, 1860, 930)), EMPRESA);
    expect(bancoDo(payload, 'b1').horas.repasse).toBe(930);
  });

  it('vários bancos: cada banco fica com o cálculo novo e a diferença vai para o Banco padrão (P2)', async () => {
    // Novo: padrão 2400 − 600 = 1800 (repasse 900); Projetos 600 − 120 = 480 (repasse 240).
    // Legado: saldo 40:00 (2400) e repasse 20:00 (1200): diferença de 120 no saldo e 60 no repasse
    const m = motor(
      [padrao, projetos],
      [item('u1', 'AMS APL - COMEX - N1', 600), item('u2', 'G-P', 120)]
    );
    const payload = await montarTransicao(m, legado(legadoJan(720, 2400, 1200)), EMPRESA);

    expect(bancoDo(payload, 'b2').horas).toMatchObject({ consumo: 120, saldo: 480, repasse: 240 });
    expect(bancoDo(payload, 'b2').itens).toEqual([
      { tipo: 'apontamento', item_id: 'u2', minutos: 120, tickets: 0 },
    ]);
    const b1 = bancoDo(payload, 'b1');
    expect(b1.horas).toMatchObject({ consumo: 600, saldo: 1920, saldo_final: 1920, repasse: 960 });
    // A diferença fica registrada no fechamento do Banco padrão (observação interna)
    expect(b1.parametros.transicao).toEqual({
      horas: {
        saldo_legado: 2400,
        repasse_legado: 1200,
        diferenca_saldo: 120,
        diferenca_repasse: 60,
      },
    });
  });
});
