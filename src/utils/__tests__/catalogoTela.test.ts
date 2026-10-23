import { describe, it, expect } from 'vitest';
import {
  bancosDoProduto,
  destinoAoDesvincular,
  destinoDoAlvo,
  gruposDaSolucao,
  gruposDoModulo,
  gruposSoDoProduto,
  modulosAClassificar,
  mudancasDeGrupos,
  totaisCatalogo,
  usosDoModulo,
  usosDoProdutoInteiro,
  usosQueAlcancamProduto,
} from '../catalogoTela';
import type { Catalogo, Modulo, Produto, UsoEmBanco } from '@/types/catalogo';
import type { MapeamentoGrupo } from '@/types/dePara';

const autoria = { atualizadoEm: '2026-10-22T12:00:00Z', atualizadoPor: null };
const produto = (id: string, solucaoId: string, extra: Partial<Produto> = {}): Produto => ({
  id,
  solucaoId,
  codigo: id.toUpperCase(),
  nome: id,
  descricao: null,
  ordem: 1,
  ativo: true,
  aClassificar: false,
  ...autoria,
  ...extra,
});
const modulo = (id: string, produtoId: string, ativo = true): Modulo => ({
  id,
  produtoId,
  nome: id,
  descricao: null,
  ordem: 1,
  ativo,
  ...autoria,
});

const CATALOGO: Catalogo = {
  solucoes: [
    { id: 's1', codigo: 'COMEX', nome: 'COMEX', ordem: 1, ativo: true, ...autoria },
    { id: 's2', codigo: 'FISCAIS', nome: 'FISCAIS', ordem: 2, ativo: true, ...autoria },
  ],
  produtos: [
    produto('ce', 's1'),
    produto('fci', 's1', { ativo: false }),
    produto('pa', 's1', { aClassificar: true }),
    produto('comply', 's2'),
  ],
  modulos: [
    modulo('cambio', 'ce'),
    modulo('drawback', 'ce'),
    modulo('antigo', 'ce', false),
    modulo('abap', 'pa'),
    modulo('legem', 'pa'),
    modulo('inativo-pa', 'pa', false),
  ],
};

const mapa = (
  id: string,
  grupoAranda: string,
  destino: Pick<MapeamentoGrupo, 'solucaoId' | 'produtoId' | 'moduloId' | 'classificacao'>
): MapeamentoGrupo => ({ id, grupoAranda, grupoBook: 'B', ...destino, ...autoria });

const MAPEAMENTOS: MapeamentoGrupo[] = [
  mapa('g1', 'AMS APL - CAMBIO - N2', {
    solucaoId: 's1',
    produtoId: 'ce',
    moduloId: 'cambio',
    classificacao: 'modulo',
  }),
  mapa('g2', 'AMS APL - CAMBIO - N3', {
    solucaoId: 's1',
    produtoId: 'ce',
    moduloId: 'cambio',
    classificacao: 'modulo',
  }),
  mapa('g3', 'AMS APL - CE PLUS - N2', {
    solucaoId: 's1',
    produtoId: 'ce',
    moduloId: null,
    classificacao: 'produto',
  }),
  mapa('g4', 'AMS APL - DBA COMEX', {
    solucaoId: 's1',
    produtoId: null,
    moduloId: null,
    classificacao: 'solucao',
  }),
  mapa('g5', 'AMS T&M', {
    solucaoId: null,
    produtoId: null,
    moduloId: null,
    classificacao: 'nao_se_aplica',
  }),
];

const uso = (produtoId: string, moduloId: string | null, banco: string): UsoEmBanco => ({
  produtoId,
  moduloId,
  bancoId: banco,
  banco,
  empresa: 'EMPRESA ALFA',
});
const USOS = [
  uso('ce', null, 'Banco COMEX'),
  uso('ce', 'drawback', 'Banco Drawback'),
  uso('comply', null, 'Banco FISCAL'),
];

describe('grupos de cada nível', () => {
  it('módulo, produto inteiro e solução, em ordem alfabética', () => {
    expect(gruposDoModulo(MAPEAMENTOS, 'cambio')).toEqual([
      'AMS APL - CAMBIO - N2',
      'AMS APL - CAMBIO - N3',
    ]);
    expect(gruposSoDoProduto(MAPEAMENTOS, 'ce')).toEqual(['AMS APL - CE PLUS - N2']);
    expect(gruposDaSolucao(MAPEAMENTOS, 's1')).toEqual(['AMS APL - DBA COMEX']);
    expect(gruposDoModulo(MAPEAMENTOS, 'drawback')).toEqual([]);
  });
});

describe('bancos que usam', () => {
  it('produto inteiro, e o que alcança o produto (inteiro ou algum módulo)', () => {
    expect(usosDoProdutoInteiro(USOS, 'ce').map((u) => u.banco)).toEqual(['Banco COMEX']);
    expect(usosQueAlcancamProduto(USOS, 'ce').map((u) => u.banco)).toEqual([
      'Banco COMEX',
      'Banco Drawback',
    ]);
  });

  it('o módulo é usado pelo banco dele e por quem marcou o produto inteiro', () => {
    expect(usosDoModulo(USOS, CATALOGO.modulos[1])).toEqual([
      { ...USOS[0], produtoInteiro: true },
      { ...USOS[1], produtoInteiro: false },
    ]);
    expect(usosDoModulo(USOS, CATALOGO.modulos[0]).map((u) => u.produtoInteiro)).toEqual([true]);
  });
});

describe('totaisCatalogo e modulosAClassificar', () => {
  it('conta os ativos, os grupos ligados e os módulos ativos sem grupo', () => {
    expect(totaisCatalogo(CATALOGO, MAPEAMENTOS)).toEqual({
      produtos: 3,
      modulos: 4,
      grupos: 4,
      semGrupo: 3,
    });
  });

  it('módulos ativos que ainda estão em "A classificar" na solução', () => {
    expect(modulosAClassificar(CATALOGO, 's1')).toBe(2);
    expect(modulosAClassificar(CATALOGO, 's2')).toBe(0);
  });
});

describe('mudancasDeGrupos', () => {
  it('separa os ids a vincular e a desvincular, pelo nome do grupo', () => {
    expect(
      mudancasDeGrupos(
        ['AMS APL - CAMBIO - N2', 'AMS APL - CAMBIO - N3'],
        ['AMS APL - CAMBIO - N2', 'AMS T&M'],
        MAPEAMENTOS
      )
    ).toEqual({ vincular: ['g5'], desvincular: ['g2'] });
    expect(mudancasDeGrupos(['AMS T&M'], ['AMS T&M'], MAPEAMENTOS)).toEqual({
      vincular: [],
      desvincular: [],
    });
  });
});

describe('destino dos grupos', () => {
  it('vincular leva o grupo ao nível escolhido', () => {
    expect(destinoDoAlvo({ tipo: 'modulo', id: 'cambio' }, CATALOGO)).toEqual({
      solucaoId: 's1',
      produtoId: 'ce',
      moduloId: 'cambio',
    });
    expect(destinoDoAlvo({ tipo: 'produto', id: 'comply' }, CATALOGO)).toEqual({
      solucaoId: 's2',
      produtoId: 'comply',
      moduloId: null,
    });
    expect(destinoDoAlvo({ tipo: 'solucao', id: 's2' }, CATALOGO)).toEqual({
      solucaoId: 's2',
      produtoId: null,
      moduloId: null,
    });
  });

  it('desvincular do módulo deixa no produto; do produto ou da solução, não se aplica', () => {
    expect(destinoAoDesvincular({ tipo: 'modulo', id: 'cambio' }, CATALOGO)).toEqual({
      solucaoId: 's1',
      produtoId: 'ce',
      moduloId: null,
    });
    const nenhum = { solucaoId: null, produtoId: null, moduloId: null };
    expect(destinoAoDesvincular({ tipo: 'produto', id: 'ce' }, CATALOGO)).toEqual(nenhum);
    expect(destinoAoDesvincular({ tipo: 'solucao', id: 's1' }, CATALOGO)).toEqual(nenhum);
  });
});

describe('bancosDoProduto', () => {
  it('um por banco, marcando quem cobre o produto inteiro', () => {
    const usos: UsoEmBanco[] = [
      { produtoId: 'ce', moduloId: 'cambio', bancoId: 'b1', banco: 'Banco 1', empresa: 'ALFA' },
      { produtoId: 'ce', moduloId: 'drawback', bancoId: 'b1', banco: 'Banco 1', empresa: 'ALFA' },
      { produtoId: 'ce', moduloId: null, bancoId: 'b2', banco: 'Banco 2', empresa: 'BETA' },
      { produtoId: 'fci', moduloId: null, bancoId: 'b3', banco: 'Banco 3', empresa: 'GAMA' },
    ];
    expect(bancosDoProduto(usos, 'ce').map((u) => [u.bancoId, u.produtoInteiro])).toEqual([
      ['b1', false],
      ['b2', true],
    ]);
  });
});
