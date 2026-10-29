import { describe, expect, it, vi } from 'vitest';
import {
  detectarRetroativosEmpresa,
  diferencaDosItens,
  executarDeteccaoRetroativos,
  type RepositorioRetroativos,
} from '../retroativos';
import type { MesAno } from '../calculo';
import type { BancoCadastro, LinhaConsumo } from '../motorBancosHoras';
import type { ItemConsumo, RepositorioFechamento } from '../fechamento';

// ---------------------------------------------------------------------------
// Empresa liberada, banco trimestral (Jul a Set/2026); hoje = Set/2026
// ---------------------------------------------------------------------------

const JUL: MesAno = { mes: 7, ano: 2026 };
const AGO: MesAno = { mes: 8, ano: 2026 };
const SET: MesAno = { mes: 9, ano: 2026 };

const banco = (v: Partial<BancoCadastro> = {}): BancoCadastro => ({
  bancoId: 'b1',
  nome: 'Banco COMEX',
  ordem: 1,
  padrao: true,
  ativo: true,
  visivelCliente: true,
  tipoContrato: 'horas',
  periodoApuracao: 3,
  inicioVigencia: { mes: 1, ano: 2026 },
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
  baselines: [],
  repasses: [],
  ...v,
});

const item = (
  itemId: string,
  minutos: number,
  fonte: 'apontamento' | 'ticket' = 'apontamento'
): ItemConsumo => ({
  itemId,
  fonte,
  grupo: 'AMS APL - COMEX',
  itemConfiguracao: 'IC',
  minutos,
  tickets: fonte === 'ticket' ? 1 : 0,
});

function motor(itens: Record<number, ItemConsumo[]>): RepositorioFechamento {
  return {
    bancos: vi.fn(async () => [banco()]),
    dePara: vi.fn(async () => []),
    consumo: vi.fn(async (): Promise<LinhaConsumo[]> => []),
    consumoItens: vi.fn(async (_e: string, m: MesAno) => itens[m.mes] ?? []),
    requerimentos: vi.fn(async () => []),
    reajustes: vi.fn(async () => []),
    fechamentos: vi.fn(async () => []),
    taxas: vi.fn(async () => []),
    gravarFechamento: vi.fn(),
  };
}

function repo(): RepositorioRetroativos & { registrados: any[] } {
  const registrados: any[] = [];
  return {
    registrados,
    empresasLiberadas: vi.fn(async () => ['e1']),
    // Jul: transição (fica de fora); Ago: fechado pelo modelo novo
    fechamentosVigentes: vi.fn(async () => [
      { id: 'f-ago', bancoId: 'b1', mes: AGO, motivo: 'geracao_book' as const },
      { id: 'f-jul', bancoId: 'b1', mes: JUL, motivo: 'transicao' as const },
    ]),
    itensDoFechamento: vi.fn(async () => [
      {
        fechamentoId: 'f-ago',
        tipo: 'apontamento' as const,
        itemId: 'a1',
        minutos: 60,
        tickets: 0,
      },
      {
        fechamentoId: 'f-ago',
        tipo: 'apontamento' as const,
        itemId: 'a2',
        minutos: 30,
        tickets: 0,
      },
    ]),
    registrar: vi.fn(async (p: any) => {
      registrados.push(p);
    }),
  };
}

describe('diferencaDosItens', () => {
  it('lançado depois (+), alterado (diferença) e removido (−); igual não entra', () => {
    const antes = [
      { tipo: 'apontamento' as const, itemId: 'a1', minutos: 60, tickets: 0 },
      { tipo: 'apontamento' as const, itemId: 'a2', minutos: 30, tickets: 0 },
      { tipo: 'ticket' as const, itemId: 't1', minutos: 0, tickets: 1 },
    ];
    const depois = [
      { tipo: 'apontamento' as const, itemId: 'a1', minutos: 90, tickets: 0 },
      { tipo: 'apontamento' as const, itemId: 'a3', minutos: 45, tickets: 0 },
      { tipo: 'ticket' as const, itemId: 't1', minutos: 0, tickets: 1 },
    ];
    expect(diferencaDosItens(antes, depois)).toEqual([
      { tipo: 'apontamento', item_id: 'a1', minutos: 30, tickets: 0 },
      { tipo: 'apontamento', item_id: 'a3', minutos: 45, tickets: 0 },
      { tipo: 'apontamento', item_id: 'a2', minutos: -30, tickets: 0 },
    ]);
  });
});

describe('detectarRetroativosEmpresa', () => {
  it('meses do período aberto fechados pelo modelo novo: compara o fechamento com o Aranda de agora (D-10)', async () => {
    // Agosto: a1 virou 90 min e a3 (45 min) foi lançado depois; a2 sumiu
    const m = motor({ 8: [item('a1', 90), item('a3', 45)] });
    const r = repo();
    await detectarRetroativosEmpresa(m, r, 'e1', SET);

    expect(r.fechamentosVigentes).toHaveBeenCalledWith(['b1'], [JUL, AGO]);
    expect(r.registrados).toEqual([
      {
        banco_id: 'b1',
        ano: 2026,
        mes: 8,
        fechamento_id: 'f-ago',
        consumo_antes_minutos: 90,
        consumo_depois_minutos: 135,
        consumo_antes_tickets: 0,
        consumo_depois_tickets: 0,
        itens: [
          { tipo: 'apontamento', item_id: 'a1', minutos: 30, tickets: 0 },
          { tipo: 'apontamento', item_id: 'a3', minutos: 45, tickets: 0 },
          { tipo: 'apontamento', item_id: 'a2', minutos: -30, tickets: 0 },
        ],
      },
    ]);
  });

  it('sem diferença: registra mesmo assim (a função do banco descarta o aberto que sobrou)', async () => {
    const m = motor({ 8: [item('a1', 60), item('a2', 30)] });
    const r = repo();
    await detectarRetroativosEmpresa(m, r, 'e1', SET);
    expect(r.registrados).toHaveLength(1);
    expect(r.registrados[0].itens).toEqual([]);
  });

  it('o mês da transição fica de fora: os itens dele são os do legado', async () => {
    const m = motor({ 7: [item('x', 999)], 8: [item('a1', 60), item('a2', 30)] });
    const r = repo();
    await detectarRetroativosEmpresa(m, r, 'e1', SET);
    expect(r.registrados.map((p) => p.mes)).toEqual([8]);
  });
});

describe('executarDeteccaoRetroativos', () => {
  it('só as empresas liberadas; a falha de uma não para as outras', async () => {
    const r = repo();
    vi.mocked(r.empresasLiberadas).mockResolvedValue(['e1', 'e2']);
    const motores = { e1: motor({ 8: [item('a1', 60)] }), e2: motor({}) };
    vi.mocked(motores.e2.bancos).mockRejectedValue(new Error('timeout'));

    const resumo = await executarDeteccaoRetroativos(
      { motor: (empresaId) => motores[empresaId as 'e1' | 'e2'], retroativos: r },
      SET
    );
    expect(resumo).toEqual({ empresas: 2, registrados: 1, erros: 1 });
  });
});
