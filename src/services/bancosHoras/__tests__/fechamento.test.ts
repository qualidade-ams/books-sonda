import { describe, it, expect, vi } from 'vitest';
import { fecharMes, type ItemConsumo, type RepositorioFechamento } from '../fechamento';
import type {
  BancoCadastro,
  ReajusteBanco,
  ResultadoBancoMes,
  LinhaRequerimento,
} from '../motorBancosHoras';
import type { GrupoDePara } from '../classificacao';
import type { MesAno } from '../calculo';

const EMPRESA = 'emp';
const DEZ: MesAno = { mes: 12, ano: 2026 };

const banco = (v: Partial<BancoCadastro> & { bancoId: string }): BancoCadastro => ({
  nome: v.bancoId,
  ordem: 1,
  padrao: false,
  ativo: true,
  visivelCliente: true,
  tipoContrato: 'horas',
  periodoApuracao: 6,
  inicioVigencia: { mes: 7, ano: 2026 },
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
  repasses: [
    {
      dataInicio: '2026-07-01',
      dataFim: null,
      percentualMensal: 50,
      percentualDentroPeriodo: null,
      percentualEntrePeriodos: null,
    },
  ],
  ...v,
});

// Caso 8.3 da spec, com consumo e requerimento
const bancos = [
  banco({ bancoId: 'fiscal', nome: 'Banco FISCAL', ordem: 1, padrao: true }),
  banco({
    bancoId: 'edocs',
    nome: 'FISCAL – e-DOCS',
    ordem: 2,
    consomeOutrosBancos: true,
    escopo: [{ produtoId: 'FISCAL', moduloId: 'EDOCS' }],
  }),
];
const dePara: GrupoDePara[] = [
  { grupoAranda: 'EDOCS', produtoId: 'FISCAL', moduloId: 'EDOCS', ativo: true },
];
const itensDez: ItemConsumo[] = [
  {
    itemId: 'a1',
    fonte: 'apontamento',
    grupo: 'EDOCS',
    itemConfiguracao: 'IC',
    minutos: 300,
    tickets: 0,
  },
  {
    itemId: 'a2',
    fonte: 'apontamento',
    grupo: 'EDOCS',
    itemConfiguracao: 'IC',
    minutos: 90,
    tickets: 0,
  },
  {
    itemId: 'a3',
    fonte: 'apontamento',
    grupo: 'SPED',
    itemConfiguracao: 'IC',
    minutos: 45,
    tickets: 0,
  },
];
const reajustes: ReajusteBanco[] = [
  { id: 'rj1', bancoId: 'fiscal', mes: 12, ano: 2026, tipo: 'entrada', minutos: 3180, tickets: 0 },
];
const requerimentos: LinhaRequerimento[] = [
  {
    requerimentoId: 'rq1',
    produtoId: 'FISCAL',
    moduloId: 'EDOCS',
    bancoAjustadoId: 'fiscal',
    horas: 0.5,
    tickets: 0,
  },
];

function repositorio(
  v: { fechados?: ResultadoBancoMes[]; itens?: ItemConsumo[] } = {}
): RepositorioFechamento {
  const itens = v.itens ?? itensDez;
  return {
    bancos: vi.fn(async () => bancos),
    dePara: vi.fn(async () => dePara),
    consumo: vi.fn(async (_e: string, m: MesAno) =>
      m.mes === 12
        ? itensDez.map((i) => ({
            fonte: i.fonte,
            grupo: i.grupo,
            itemConfiguracao: i.itemConfiguracao,
            minutos: i.minutos,
            tickets: i.tickets,
          }))
        : []
    ),
    consumoItens: vi.fn(async (_e: string, m: MesAno) => (m.mes === 12 ? itens : [])),
    requerimentos: vi.fn(async (_e: string, m: MesAno) => (m.mes === 12 ? requerimentos : [])),
    reajustes: vi.fn(async () => reajustes),
    fechamentos: vi.fn(async () => v.fechados ?? []),
    taxas: vi.fn(async () => []),
    gravarFechamento: vi.fn(async () => ({ acao: 'criado' as const, fechamentos: [] })),
  };
}

describe('fecharMes', () => {
  it('monta o fechamento de todos os bancos: resultado, itens, observações e transferências', async () => {
    const repo = repositorio();
    const r = await fecharMes(repo, EMPRESA, DEZ, 'geracao_book');
    expect(r.acao).toBe('criado');

    const payload = (repo.gravarFechamento as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload).toMatchObject({
      empresa_id: EMPRESA,
      ano: 2026,
      mes: 12,
      motivo: 'geracao_book',
    });
    expect(payload.transferencias).toEqual([
      { cedente_id: 'fiscal', consumidor_id: 'edocs', unidade: 'horas', quantidade: 390 },
    ]);

    const fiscal = payload.bancos.find((b: any) => b.banco_id === 'fiscal');
    const edocs = payload.bancos.find((b: any) => b.banco_id === 'edocs');
    // FISCAL: 3180 de entrada − 45 de consumo − 30 do requerimento ajustado = 3105; cede 390
    expect(fiscal.horas).toMatchObject({
      consumo: 45,
      requerimentos: 30,
      reajustes: 3180,
      saldo: 3105,
      cedido_outros: 390,
      saldo_final: 2715,
      repasse: 0,
    });
    expect(fiscal.tickets).toBeNull();
    expect(fiscal).toMatchObject({
      nome_banco: 'Banco FISCAL',
      fim_periodo: true,
      percentual_repasse: 50,
      valor_a_faturar: 0,
    });
    expect(fiscal.itens).toEqual([
      { tipo: 'apontamento', item_id: 'a3', minutos: 45, tickets: 0 },
      { tipo: 'requerimento', item_id: 'rq1', minutos: 30, tickets: 0 },
      { tipo: 'reajuste', item_id: 'rj1', minutos: 3180, tickets: 0 },
    ]);
    expect(fiscal.observacoes).toEqual([
      { origem: 'consumo_entre_bancos', texto: '06:30 horas cedidas ao banco FISCAL – e-DOCS' },
    ]);
    expect(fiscal.parametros).toMatchObject({
      tipo_contrato: 'horas',
      periodo_apuracao: 6,
      inicio_vigencia: '2026-07-01',
    });

    expect(edocs.horas).toMatchObject({
      consumo: 390,
      saldo: -390,
      consumido_outros: 390,
      saldo_final: 0,
      excedente: 0,
    });
    expect(edocs.itens.map((i: any) => i.item_id)).toEqual(['a1', 'a2']);
  });

  it('mês já fechado na geração do Book: não grava de novo (D-11)', async () => {
    const congelado = (bancoId: string): ResultadoBancoMes => ({
      bancoId,
      nome: bancoId,
      mes: DEZ,
      fechado: true,
      fimPeriodo: true,
      transicaoPeriodo: false,
      percentualRepasse: 50,
      horas: null,
      tickets: null,
      valorAFaturar: 0,
      observacoes: [],
      alertas: [],
    });
    const repo = repositorio({ fechados: [congelado('fiscal'), congelado('edocs')] });
    const r = await fecharMes(repo, EMPRESA, DEZ, 'geracao_book');
    expect(r.acao).toBe('existente');
    expect(repo.gravarFechamento).not.toHaveBeenCalled();
  });

  it('retificação recalcula o mês mesmo fechado e grava nova versão (D-05)', async () => {
    const congelado: ResultadoBancoMes = {
      bancoId: 'fiscal',
      nome: 'fiscal',
      mes: DEZ,
      fechado: true,
      fimPeriodo: true,
      transicaoPeriodo: false,
      percentualRepasse: 50,
      horas: null,
      tickets: null,
      valorAFaturar: 0,
      observacoes: [],
      alertas: [],
    };
    const repo = repositorio({ fechados: [congelado] });
    await fecharMes(repo, EMPRESA, DEZ, 'retificacao');
    const payload = (repo.gravarFechamento as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.motivo).toBe('retificacao');
    expect(payload.bancos.find((b: any) => b.banco_id === 'fiscal').horas.saldo).toBe(3105);
  });

  it('se os itens não batem com o consumo calculado, não grava', async () => {
    const repo = repositorio({ itens: itensDez.slice(0, 2) });
    await expect(fecharMes(repo, EMPRESA, DEZ, 'geracao_book')).rejects.toThrow(/não batem/);
    expect(repo.gravarFechamento).not.toHaveBeenCalled();
  });
});
