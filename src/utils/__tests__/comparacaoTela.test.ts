import { describe, it, expect } from 'vitest';
import {
  exportacaoComparacao,
  exportacaoMesesComparacao,
  filtrarComparacoes,
  grupoDaComparacao,
  unidadesDosMeses,
} from '../comparacaoTela';
import { matrizDaAba } from '@/utils/exportarTabela';
import type { ComparacaoEmpresa, MesComparacao } from '@/types/comparacao';

const t = (chave: string, valores?: Record<string, unknown>) =>
  valores ? `${chave} ${JSON.stringify(valores)}` : chave;

const zero = { consumo: 0, requerimentos: 0, reajustes: 0, saldo: 0, repasse: 0, excedente: 0 };
const medidas = (horas: Partial<typeof zero> = {}, tickets: Partial<typeof zero> = {}) => ({
  horas: { ...zero, ...horas },
  tickets: { ...zero, ...tickets },
  valorAFaturar: 0,
});
const mes = (m: number, v: Partial<MesComparacao> = {}): MesComparacao => ({
  mes: { mes: m, ano: 2026 },
  situacao: 'igual',
  legado: medidas({ consumo: 600 }),
  novo: { ...medidas({ consumo: 600 }), porBanco: [] },
  origemSaldo: null,
  itens: [],
  itensTotal: 0,
  fechamentoLegadoEm: '2026-02-05T12:00:00Z',
  ...v,
});

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

describe('filtrarComparacoes', () => {
  const lista = [
    empresa({ empresaId: 'a', empresa: 'EMPRESA ÁLFA', situacao: 'identico' }),
    empresa({ empresaId: 'b', empresa: 'EMPRESA BETA', situacao: 'divergente' }),
    empresa({
      empresaId: 'c',
      empresa: 'GAMA',
      situacao: 'explicada',
      validacao: { por: null, em: 'x', situacao: 'explicada' },
    }),
  ];

  it('sem filtro, todas', () => {
    expect(filtrarComparacoes(lista, { busca: '', grupo: null })).toHaveLength(3);
  });

  it('busca pelo nome, sem acento e sem diferenciar maiúsculas', () => {
    expect(
      filtrarComparacoes(lista, { busca: 'alfa', grupo: null }).map((e) => e.empresaId)
    ).toEqual(['a']);
  });

  it('grupo do indicador', () => {
    expect(
      filtrarComparacoes(lista, { busca: '', grupo: 'validada' }).map((e) => e.empresaId)
    ).toEqual(['c']);
    expect(
      filtrarComparacoes(lista, { busca: 'empresa', grupo: 'divergente' }).map((e) => e.empresaId)
    ).toEqual(['b']);
  });
});

describe('unidadesDosMeses', () => {
  it('horas e/ou tickets conforme o que aparece nos meses', () => {
    expect(unidadesDosMeses([mes(1)])).toEqual(['horas']);
    expect(
      unidadesDosMeses([
        mes(1, {
          legado: medidas({}, { consumo: 3 }),
          novo: { ...medidas({}, { consumo: 3 }), porBanco: [] },
        }),
      ])
    ).toEqual(['tickets']);
    expect(
      unidadesDosMeses([mes(1), mes(2, { novo: { ...medidas({}, { saldo: 2 }), porBanco: [] } })])
    ).toEqual(['horas', 'tickets']);
  });

  it('sem nada, horas', () => {
    expect(unidadesDosMeses([])).toEqual(['horas']);
  });
});

describe('exportacaoComparacao', () => {
  it('uma linha por empresa, com horas no formato do relógio e a validação', () => {
    const e = exportacaoComparacao(
      [
        empresa({
          empresa: 'EMPRESA ALFA',
          bancosAtivos: 2,
          situacao: 'soma_confere',
          consumoLegadoMinutos: 600,
          consumoNovoMinutos: 660,
          validacao: { por: 'Usuário Teste', em: '2026-10-27T15:00:00Z', situacao: 'soma_confere' },
        }),
      ],
      t
    );
    expect(e.arquivo).toBe('comparacaoBancosHoras.exportar.arquivo');
    const [cabecalho, linha] = matrizDaAba(e.abas[0]);
    expect(cabecalho).toContain('comparacaoBancosHoras.colunas.empresa');
    expect(linha).toEqual([
      'EMPRESA ALFA',
      2,
      12,
      'comparacaoBancosHoras.situacoes.soma_confere',
      '10:00',
      '11:00',
      '+01:00',
      0,
      0,
      'Usuário Teste',
      '2026-10-27 12:00',
      '',
      '',
    ]);
  });
});

describe('exportacaoMesesComparacao', () => {
  it('aba do mês a mês e aba das diferenças por item', () => {
    const e = exportacaoMesesComparacao(
      'EMPRESA GAMA',
      [
        mes(9, {
          situacao: 'divergente',
          novo: { ...medidas({ consumo: 660, saldo: -60 }), porBanco: [] },
          itens: [
            {
              chave: 'u1',
              fonte: 'apontamento',
              chamado: 'CH-1',
              data: '2026-09-30T23:00:00Z',
              grupo: 'G',
              minutosLegado: null,
              minutosNovo: 60,
              ticketsLegado: null,
              ticketsNovo: null,
              motivo: 'fuso',
              explicado: true,
            },
          ],
          itensTotal: 1,
        }),
      ],
      t,
      'pt-BR'
    );
    expect(e.abas.map((a) => a.nome)).toEqual([
      'comparacaoBancosHoras.detalhe.mesAMes',
      'comparacaoBancosHoras.exportar.abaDiferencas',
    ]);
    const [, linhaMes] = matrizDaAba(e.abas[0]);
    expect(linhaMes.slice(0, 5)).toEqual([
      'Set/2026',
      'comparacaoBancosHoras.situacoesMes.divergente',
      '10:00',
      '11:00',
      '+01:00',
    ]);
    const [, linhaItem] = matrizDaAba(e.abas[1]);
    expect(linhaItem).toEqual([
      'Set/2026',
      'CH-1',
      '2026-09-30 20:00',
      'G',
      '',
      '01:00',
      '',
      '',
      'comparacaoBancosHoras.motivos.fuso',
      'comparacaoBancosHoras.explicado',
    ]);
  });
});
