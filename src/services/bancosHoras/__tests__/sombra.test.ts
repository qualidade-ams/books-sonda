import { describe, expect, it, vi } from 'vitest';
import {
  executarModoSombra,
  processarEmpresa,
  type FechamentoLegado,
  type ItemDoLegado,
  type PayloadComparacao,
  type RepositorioSombra,
} from '../sombra';
import type { MesAno } from '../calculo';
import type { BancoCadastro, LinhaConsumo, ReajusteBanco } from '../motorBancosHoras';
import type { ItemConsumo, PayloadFechamento, RepositorioFechamento } from '../fechamento';
import type { DadosItem } from '../comparacao';

// ---------------------------------------------------------------------------
// Cenário: empresa de 1 banco (padrão, horas, trimestral, 40 h/mês, repasse 50%)
// ---------------------------------------------------------------------------

const EMPRESA = { id: 'e1', nomeLegado: 'EMPRESA ALFA' };
const HOJE: MesAno = { mes: 4, ano: 2026 };
const JAN = { mes: 1, ano: 2026 };
const FEV = { mes: 2, ano: 2026 };
const chave = (m: MesAno) => `${m.mes}/${m.ano}`;

const padrao = (v: Partial<BancoCadastro> = {}): BancoCadastro => ({
  bancoId: 'b1',
  nome: 'Banco padrão',
  ordem: 1,
  padrao: true,
  ativo: true,
  visivelCliente: false,
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

const item = (itemId: string, minutos: number): ItemConsumo => ({
  itemId,
  fonte: 'apontamento',
  grupo: 'AMS APL - COMEX - N1',
  itemConfiguracao: 'IC',
  minutos,
  tickets: 0,
});

interface CenarioMotor {
  bancos?: BancoCadastro[];
  /** mês → itens que contam (o consumo somado sai deles) */
  itens?: Record<string, ItemConsumo[]>;
  reajustes?: ReajusteBanco[];
}

function motor(c: CenarioMotor = {}) {
  const gravados: PayloadFechamento[] = [];
  const itensDoMes = (m: MesAno) => c.itens?.[chave(m)] ?? [];
  const repo: RepositorioFechamento = {
    bancos: vi.fn(async () => c.bancos ?? [padrao()]),
    dePara: vi.fn(async () => []),
    consumo: vi.fn(async (_e: string, m: MesAno): Promise<LinhaConsumo[]> => {
      const porGrupo = new Map<string, LinhaConsumo>();
      for (const i of itensDoMes(m)) {
        const l = porGrupo.get(i.grupo) ?? { ...i, minutos: 0, tickets: 0 };
        l.minutos += i.minutos;
        l.tickets += i.tickets;
        porGrupo.set(i.grupo, l);
      }
      return [...porGrupo.values()].map(({ fonte, grupo, itemConfiguracao, minutos, tickets }) => ({
        fonte,
        grupo,
        itemConfiguracao,
        minutos,
        tickets,
      }));
    }),
    consumoItens: vi.fn(async (_e: string, m: MesAno) => itensDoMes(m)),
    requerimentos: vi.fn(async () => []),
    reajustes: vi.fn(async () => c.reajustes ?? []),
    fechamentos: vi.fn(async () => []),
    taxas: vi.fn(async () => []),
    gravarFechamento: vi.fn(async (p: PayloadFechamento) => {
      gravados.push(p);
      return { acao: 'criado' as const, fechamentos: [] };
    }),
  };
  return { repo, gravados };
}

// Snapshot do legado com consumo, saldo e repasse do mês (horas em texto de interval)
const hhmm = (min: number) =>
  `${min < 0 ? '-' : ''}${String(Math.floor(Math.abs(min) / 60)).padStart(2, '0')}:${String(Math.abs(min) % 60).padStart(2, '0')}:00`;
const snapshot = (consumo: number, saldo: number, repasse: number) => ({
  consumo_horas: hhmm(consumo),
  saldo_horas: hhmm(saldo),
  repasse_horas: hhmm(repasse),
});

const fechamentoLegado = (
  mes: MesAno,
  snap: Record<string, unknown>,
  v: Partial<FechamentoLegado> = {}
): FechamentoLegado => ({
  mes,
  fechadoEm: `${mes.ano}-${String(mes.mes + 1).padStart(2, '0')}-05T12:00:00Z`,
  snapshot: snap,
  apontamentosIds: [],
  ticketsIds: [],
  ...v,
});

const dados = (chaveItem: string, v: Partial<DadosItem> = {}): DadosItem => ({
  chave: chaveItem,
  fonte: 'apontamento',
  chamado: `CH-${chaveItem}`,
  data: '2026-01-15T13:00:00Z',
  grupo: 'AMS APL - COMEX - N1',
  organizacao: 'EMPRESA ALFA',
  codigoResolucao: 'RESOLVIDO',
  sincronizadoEm: '2026-01-15T14:00:00Z',
  lancadoEm: '2026-01-15T14:00:00Z',
  codigoTrocadoEm: null,
  minutosTexto: 0,
  ...v,
});

interface CenarioSombra {
  legado?: FechamentoLegado[];
  novos?: { mes: MesAno; fechadoEm: string }[];
  itensDoLegado?: ItemDoLegado[];
  dadosNovos?: DadosItem[];
  empresas?: { id: string; nomeLegado: string }[];
  /** chamado → última troca do código de resolução */
  trocas?: Record<string, string>;
  reajustesDepois?: { horas: number; tickets: number };
}

function sombra(c: CenarioSombra = {}) {
  const gravados: PayloadComparacao[] = [];
  const erros: { empresaId: string; mensagem: string }[] = [];
  const repo: RepositorioSombra = {
    empresasEmLegado: vi.fn(async () => c.empresas ?? [EMPRESA]),
    fechamentosLegado: vi.fn(async () => c.legado ?? []),
    ultimoFechamentoLegado: vi.fn(async () => c.legado?.at(-1) ?? null),
    fechamentosNovos: vi.fn(async () => c.novos ?? []),
    itensFechados: vi.fn(async () => []),
    organizacoes: vi.fn(async () => ['EMPRESA ALFA']),
    codigos: vi.fn(async () => [{ codigo: 'RESOLVIDO', contaHoras: true, contaTickets: true }]),
    itensDoLegado: vi.fn(async () => c.itensDoLegado ?? []),
    dadosDosItens: vi.fn(async () => c.dadosNovos ?? []),
    trocasDeCodigo: vi.fn(async () => new Map(Object.entries(c.trocas ?? {}))),
    reajustesDepoisDoFechamento: vi.fn(async () => c.reajustesDepois ?? { horas: 0, tickets: 0 }),
    gravar: vi.fn(async (p: PayloadComparacao) => {
      gravados.push(p);
    }),
    registrarErro: vi.fn(async (empresaId: string, mensagem: string) => {
      erros.push({ empresaId, mensagem });
    }),
  };
  return { repo, gravados, erros };
}

// ---------------------------------------------------------------------------
// processarEmpresa
// ---------------------------------------------------------------------------

describe('processarEmpresa', () => {
  it('compara os últimos 12 meses fechados, sem o mês aberto', async () => {
    const m = motor();
    const s = sombra();
    await processarEmpresa({ motor: m.repo, sombra: s.repo }, EMPRESA, {
      hoje: HOJE,
      fecharDesde: null,
    });
    expect(s.repo.fechamentosLegado).toHaveBeenCalledWith(
      'e1',
      { mes: 4, ano: 2025 },
      { mes: 3, ano: 2026 }
    );
  });

  it('sem fechamento do legado: a empresa sai da comparação', async () => {
    const m = motor();
    const s = sombra();
    const r = await processarEmpresa({ motor: m.repo, sombra: s.repo }, EMPRESA, {
      hoje: HOJE,
      fecharDesde: null,
    });
    expect(s.gravados).toEqual([{ empresa_id: 'e1', meses: [] }]);
    expect(r.situacao).toBeNull();
  });

  it('1 banco, tudo igual: Idêntico, sem buscar itens', async () => {
    // Jan: base 40 h, consumo 10 h, saldo 30 h, repasse 50% = 15 h
    const m = motor({ itens: { '1/2026': [item('u1', 600)] } });
    const s = sombra({ legado: [fechamentoLegado(JAN, snapshot(600, 1800, 900))] });
    const r = await processarEmpresa({ motor: m.repo, sombra: s.repo }, EMPRESA, {
      hoje: HOJE,
      fecharDesde: null,
    });

    expect(r.situacao).toBe('identico');
    expect(s.repo.itensDoLegado).not.toHaveBeenCalled();
    const [p] = s.gravados;
    expect(p).toMatchObject({
      empresa_id: 'e1',
      situacao: 'identico',
      meses_comparados: 1,
      consumo_legado_minutos: 600,
      consumo_novo_minutos: 600,
    });
    expect(p.meses).toHaveLength(1);
    expect(p.meses[0]).toMatchObject({
      ano: 2026,
      mes: 1,
      situacao: 'igual',
      itens: [],
      itens_total: 0,
      origem_saldo: null,
      fechamento_legado_em: '2026-02-05T12:00:00Z',
    });
    expect(p.meses[0].novo.porBanco).toEqual([
      { bancoId: 'b1', nome: 'Banco padrão', minutos: 600, tickets: 0 },
    ]);
  });

  it('consumo diferente: busca os itens dos dois lados e grava o motivo', async () => {
    // Novo tem u2 (60 min), lançado depois do fechamento do legado
    const m = motor({ itens: { '1/2026': [item('u1', 600), item('u2', 60)] } });
    const s = sombra({
      legado: [
        fechamentoLegado(JAN, snapshot(600, 1800, 900), {
          apontamentosIds: ['EXT1', 'EXT-SUMIU'],
        }),
      ],
      itensDoLegado: [{ ...dados('u1', { minutosTexto: 600 }), idLegado: 'EXT1' }],
      dadosNovos: [dados('u2', { sincronizadoEm: '2026-02-10T00:00:00Z' })],
    });
    const r = await processarEmpresa({ motor: m.repo, sombra: s.repo }, EMPRESA, {
      hoje: HOJE,
      fecharDesde: null,
    });

    expect(s.repo.itensDoLegado).toHaveBeenCalledWith(['EXT1', 'EXT-SUMIU'], []);
    expect(s.repo.dadosDosItens).toHaveBeenCalledWith({ apontamentos: ['u2'], tickets: [] });
    const [mes] = s.gravados[0].meses;
    expect(mes.itens.map((i) => [i.chave, i.motivo])).toEqual([
      ['u2', 'depois_do_fechamento'],
      ['legado:EXT-SUMIU', 'removido_do_aranda'],
    ]);
    expect(mes.itens_total).toBe(2);
    // Os 60 min a mais são do item lançado depois do fechamento; o saldo herda a explicação
    expect(r.situacao).toBe('explicada');
  });

  it('busca a troca de código dos chamados que estão só de um lado', async () => {
    const m = motor({ itens: { '1/2026': [item('u1', 600), item('u2', 60)] } });
    const s = sombra({
      legado: [fechamentoLegado(JAN, snapshot(600, 1800, 900), { apontamentosIds: ['EXT1'] })],
      itensDoLegado: [{ ...dados('u1', { minutosTexto: 600 }), idLegado: 'EXT1' }],
      dadosNovos: [dados('u2')],
      trocas: { 'CH-u2': '2026-02-20T10:00:00Z' },
    });
    const r = await processarEmpresa({ motor: m.repo, sombra: s.repo }, EMPRESA, {
      hoje: HOJE,
      fecharDesde: null,
    });

    expect(s.repo.trocasDeCodigo).toHaveBeenCalledWith(['CH-u2']);
    const [mes] = s.gravados[0].meses;
    expect(mes.itens.map((i) => [i.chave, i.motivo])).toEqual([['u2', 'codigo_trocado']]);
    expect(r.situacao).toBe('explicada');
  });

  it('reajuste a mais no novo, lançado depois do fechamento do legado: Explicada', async () => {
    const m = motor({
      itens: { '1/2026': [item('u1', 600)] },
      reajustes: [{ bancoId: 'b1', mes: 1, ano: 2026, tipo: 'entrada', minutos: 540, tickets: 0 }],
    });
    const s = sombra({
      legado: [fechamentoLegado(JAN, snapshot(600, 1800, 900))],
      reajustesDepois: { horas: 540, tickets: 0 },
    });
    const r = await processarEmpresa({ motor: m.repo, sombra: s.repo }, EMPRESA, {
      hoje: HOJE,
      fecharDesde: null,
    });

    expect(s.repo.reajustesDepoisDoFechamento).toHaveBeenCalledWith(
      'e1',
      JAN,
      '2026-02-05T12:00:00Z'
    );
    expect(r.situacao).toBe('explicada');
  });

  it('reajustes iguais: não busca os lançados depois do fechamento', async () => {
    const m = motor({ itens: { '1/2026': [item('u1', 600)] } });
    const s = sombra({ legado: [fechamentoLegado(JAN, snapshot(600, 1800, 900))] });
    await processarEmpresa({ motor: m.repo, sombra: s.repo }, EMPRESA, {
      hoje: HOJE,
      fecharDesde: null,
    });
    expect(s.repo.reajustesDepoisDoFechamento).not.toHaveBeenCalled();
  });

  it('guarda no máximo 500 itens por mês, com o total', async () => {
    const novos = Array.from({ length: 501 }, (_, i) => item(`n${i}`, 1));
    const m = motor({ itens: { '1/2026': novos } });
    const s = sombra({
      legado: [fechamentoLegado(JAN, snapshot(0, 2400, 1200))],
      dadosNovos: novos.map((i) => dados(i.itemId)),
    });
    await processarEmpresa({ motor: m.repo, sombra: s.repo }, EMPRESA, {
      hoje: HOJE,
      fecharDesde: null,
    });
    const [mes] = s.gravados[0].meses;
    expect(mes.itens).toHaveLength(500);
    expect(mes.itens_total).toBe(501);
  });

  describe('fechamento em sombra', () => {
    const legado = [
      fechamentoLegado(JAN, snapshot(600, 1800, 900), { fechadoEm: '2026-02-05T12:00:00Z' }),
      fechamentoLegado(FEV, snapshot(0, 3300, 1650), { fechadoEm: '2026-03-05T12:00:00Z' }),
    ];
    const itens = { '1/2026': [item('u1', 600)] };

    it('fecha no novo o mês que o legado fechou depois da ativação', async () => {
      const m = motor({ itens });
      const s = sombra({ legado });
      const r = await processarEmpresa({ motor: m.repo, sombra: s.repo }, EMPRESA, {
        hoje: HOJE,
        fecharDesde: '2026-03-01T00:00:00Z',
      });
      expect(m.gravados.map((g) => [g.mes, g.motivo])).toEqual([[2, 'geracao_book']]);
      expect(r.fechamentos).toBe(1);
    });

    it('legado reaberto e fechado de novo: retifica o mês no novo', async () => {
      const m = motor({ itens });
      const s = sombra({
        legado,
        novos: [
          { mes: JAN, fechadoEm: '2026-02-06T00:00:00Z' },
          { mes: FEV, fechadoEm: '2026-03-01T00:00:00Z' },
        ],
      });
      await processarEmpresa({ motor: m.repo, sombra: s.repo }, EMPRESA, {
        hoje: HOJE,
        fecharDesde: '2026-01-01T00:00:00Z',
      });
      // Jan: o novo fechou depois do legado, nada a fazer; Fev: o legado fechou depois
      expect(m.gravados.map((g) => [g.mes, g.motivo])).toEqual([[2, 'retificacao']]);
    });

    it('sem data de ativação, não fecha nada', async () => {
      const m = motor({ itens });
      const s = sombra({ legado });
      await processarEmpresa({ motor: m.repo, sombra: s.repo }, EMPRESA, {
        hoje: HOJE,
        fecharDesde: null,
      });
      expect(m.gravados).toEqual([]);
    });

    it('empresa sem banco ativo: não fecha', async () => {
      const m = motor({ itens, bancos: [padrao({ ativo: false })] });
      const s = sombra({ legado });
      await processarEmpresa({ motor: m.repo, sombra: s.repo }, EMPRESA, {
        hoje: HOJE,
        fecharDesde: '2026-01-01T00:00:00Z',
      });
      expect(m.gravados).toEqual([]);
    });

    it('só fechamento: fecha e não compara', async () => {
      const m = motor({ itens });
      const s = sombra({ legado });
      await processarEmpresa({ motor: m.repo, sombra: s.repo }, EMPRESA, {
        hoje: HOJE,
        fecharDesde: '2026-03-01T00:00:00Z',
        somenteFechamento: true,
      });
      expect(m.gravados).toHaveLength(1);
      expect(s.gravados).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// executarModoSombra
// ---------------------------------------------------------------------------

describe('executarModoSombra', () => {
  it('processa todas as empresas em Legado; a falha de uma não para as outras', async () => {
    const m = motor({ itens: { '1/2026': [item('u1', 600)] } });
    const s = sombra({
      empresas: [
        { id: 'e1', nomeLegado: 'EMPRESA ALFA' },
        { id: 'e2', nomeLegado: 'EMPRESA BETA' },
      ],
      legado: [fechamentoLegado(JAN, snapshot(600, 1800, 900))],
    });
    vi.mocked(s.repo.fechamentosLegado).mockImplementation(async (empresaId: string) => {
      if (empresaId === 'e1') throw new Error('Falha ao ler o fechamento do legado: timeout');
      return [fechamentoLegado(JAN, snapshot(600, 1800, 900))];
    });

    const resumo = await executarModoSombra(
      { motor: () => m.repo, sombra: s.repo },
      { hoje: HOJE, fecharDesde: null }
    );

    expect(resumo).toEqual({ empresas: 2, comparadas: 1, removidas: 0, fechamentos: 0, erros: 1 });
    expect(s.erros).toEqual([
      { empresaId: 'e1', mensagem: 'Falha ao ler o fechamento do legado: timeout' },
    ]);
    expect(s.gravados.map((g) => g.empresa_id)).toEqual(['e2']);
  });

  it('uma empresa só (Recalcular da tela)', async () => {
    const m = motor();
    const s = sombra({ empresas: [EMPRESA, { id: 'e2', nomeLegado: 'EMPRESA BETA' }] });
    const resumo = await executarModoSombra(
      { motor: () => m.repo, sombra: s.repo },
      { hoje: HOJE, fecharDesde: null, empresaId: 'e2' }
    );
    expect(resumo.empresas).toBe(1);
    expect(s.gravados.map((g) => g.empresa_id)).toEqual(['e2']);
  });

  it('empresa sem mês para comparar conta como removida', async () => {
    const m = motor();
    const s = sombra();
    const resumo = await executarModoSombra(
      { motor: () => m.repo, sombra: s.repo },
      { hoje: HOJE, fecharDesde: null }
    );
    expect(resumo).toMatchObject({ comparadas: 0, removidas: 1 });
  });
});
