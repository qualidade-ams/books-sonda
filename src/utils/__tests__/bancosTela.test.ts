import { describe, it, expect } from 'vitest';
import {
  cobertosPorOutros,
  deMes,
  elegiveisParaConsumo,
  escopoDaSelecao,
  mesTexto,
  novoBanco,
  paraMes,
  parametrosDoBanco,
  selecaoDoEscopo,
  vigente,
} from '../bancosTela';
import type { BancoCadastro } from '@/types/bancosHorasCadastro';

const autoria = { atualizadoEm: '2026-10-22T12:00:00Z', atualizadoPor: null };
const banco = (id: string, extra: Partial<BancoCadastro> = {}): BancoCadastro => ({
  id,
  empresaId: 'e1',
  ordem: 1,
  ativo: true,
  visivelCliente: true,
  espelhaLegado: false,
  nome: id.toUpperCase(),
  descricao: null,
  padrao: false,
  tipoContrato: 'horas',
  periodoApuracao: 1,
  inicioVigencia: '2026-01-01',
  fimVigencia: null,
  diaInicioApuracao: 1,
  diaFimApuracao: 0,
  taxaProduto: 'OUTROS',
  taxaTipoHora: 'excedente',
  repasseEspecial: 'nenhum',
  duracaoPeriodoMeses: null,
  periodosAteZerar: null,
  consomeOutrosBancos: false,
  filtroIc: null,
  escopo: [],
  baselines: [],
  repasses: [],
  ...autoria,
  ...extra,
});

describe('meses', () => {
  it('a vigência é sempre no dia 1; o campo mês usa AAAA-MM', () => {
    expect(paraMes('2026-03-01')).toBe('2026-03');
    expect(paraMes(null)).toBe('');
    expect(deMes('2026-03')).toBe('2026-03-01');
    expect(deMes('')).toBeNull();
  });

  it('mês para exibir: MM/AAAA', () => {
    expect(mesTexto('2026-03-01')).toBe('03/2026');
    expect(mesTexto(null)).toBe('');
  });
});

describe('vigente', () => {
  it('a vigência aberta; sem aberta, a de início mais recente', () => {
    const v = (id: string, dataInicio: string, dataFim: string | null) => ({
      id,
      dataInicio,
      dataFim,
    });
    expect(vigente([v('a', '2026-01-01', '2026-05-31'), v('b', '2026-06-01', null)])?.id).toBe('b');
    expect(
      vigente([v('a', '2026-01-01', '2026-05-31'), v('b', '2026-06-01', '2026-08-31')])?.id
    ).toBe('b');
    expect(vigente([])).toBeUndefined();
  });
});

describe('escopo e seleção', () => {
  it('produto inteiro vira "todos"; módulos viram a lista; e volta', () => {
    const escopo = [
      { produtoId: 'ce', moduloId: null },
      { produtoId: 'fci', moduloId: 'm1' },
      { produtoId: 'fci', moduloId: 'm2' },
    ];
    const selecao = selecaoDoEscopo(escopo);
    expect(selecao).toEqual({ ce: 'todos', fci: ['m1', 'm2'] });
    expect(escopoDaSelecao({ ...selecao, vazio: [] })).toEqual(escopo);
  });
});

describe('cobertosPorOutros', () => {
  it('o que os outros bancos ativos cobrem (RN-05); o próprio, inativos e o padrão não contam', () => {
    const bancos = [
      banco('a', { escopo: [{ produtoId: 'ce', moduloId: null }] }),
      banco('b', { escopo: [{ produtoId: 'fci', moduloId: 'm1' }] }),
      banco('c', { ativo: false, escopo: [{ produtoId: 'x', moduloId: null }] }),
      banco('padrao', { padrao: true }),
    ];
    expect(cobertosPorOutros(bancos, 'b')).toEqual({ 'ce|*': 'A' });
    expect(cobertosPorOutros(bancos, null)).toEqual({ 'ce|*': 'A', 'fci|m1': 'B' });
  });
});

describe('elegiveisParaConsumo', () => {
  it('só bancos ativos com o mesmo tipo de contrato e a mesma apuração cedem saldo (RN-19)', () => {
    const bancos = [
      banco('a'),
      banco('b', { tipoContrato: 'tickets' }),
      banco('c', { periodoApuracao: 3 }),
      banco('d', { ativo: false }),
    ];
    expect(
      elegiveisParaConsumo(bancos, 'x', 'horas', 1).map((e) => [e.banco.id, e.motivo])
    ).toEqual([
      ['a', null],
      ['b', 'tipo'],
      ['c', 'periodo'],
    ]);
  });
});

describe('novoBanco e parametrosDoBanco', () => {
  it('o primeiro banco da empresa é o padrão; depois, não', () => {
    expect(novoBanco([], '2026-10-01').padrao).toBe(true);
    const n = novoBanco([banco('a')], '2026-10-01');
    expect(n.padrao).toBe(false);
    expect(n.inicioVigencia).toBe('2026-10-01');
    expect(n.escopo).toEqual([]);
  });

  it('parâmetros editáveis de um banco existente', () => {
    const p = parametrosDoBanco(banco('a', { descricao: 'x' }));
    expect(p).not.toHaveProperty('id');
    expect(p).not.toHaveProperty('baselines');
    expect(p.descricao).toBe('x');
  });
});
