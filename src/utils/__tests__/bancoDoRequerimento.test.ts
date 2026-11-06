import { describe, it, expect } from 'vitest';
import {
  chaveDestino,
  descontaDoBanco,
  faltaBanco,
  lerDestino,
  produtosDoRequerimento,
} from '../bancoDoRequerimento';
import type { OpcaoDestino } from '@/services/requerimentoBancoService';

/** Uma linha de requerimento_destinos: banco × produto × módulo */
const opcao = (
  banco: [id: string, ordem: number, inicio?: string, fim?: string | null],
  produto: string,
  modulo: string | null,
  totalModulos: number
): OpcaoDestino => ({
  bancoId: banco[0],
  bancoNome: banco[0].toUpperCase(),
  bancoOrdem: banco[1],
  inicioVigencia: banco[2] ?? '2026-07-01',
  fimVigencia: banco[3] ?? null,
  produtoId: produto,
  produtoNome: produto.toUpperCase(),
  produtoOrdem: 1,
  moduloId: modulo,
  moduloNome: modulo ? modulo.toUpperCase() : null,
  moduloOrdem: 1,
  totalModulos,
});

const GALLERY = opcao(['gallery', 2], 'gallery', null, 0);
const CE_EXPORT = opcao(['comex', 3], 'ceplus', 'export', 4);
const CE_IMPORT = opcao(['comex', 3], 'ceplus', 'import', 4);
const COMPLY_A = opcao(['fiscal', 4], 'comply', 'obrig', 2);
const COMPLY_B = opcao(['fiscal', 4], 'comply', 'edocs', 2);

describe('descontaDoBanco', () => {
  it('Banco de Horas desconta do banco', () => {
    expect(descontaDoBanco('Banco de Horas')).toBe(true);
  });

  it('Reprovado com horas de análise EF desconta (gera o requerimento de Banco de Horas da EF)', () => {
    expect(descontaDoBanco('Reprovado', '2:30')).toBe(true);
    expect(descontaDoBanco('Reprovado', 1.5)).toBe(true);
  });

  it('Reprovado sem horas de análise EF não desconta', () => {
    expect(descontaDoBanco('Reprovado')).toBe(false);
    expect(descontaDoBanco('Reprovado', '0:00')).toBe(false);
    expect(descontaDoBanco('Reprovado', 0)).toBe(false);
  });

  it('os demais tipos não descontam', () => {
    expect(descontaDoBanco('Faturado')).toBe(false);
    expect(descontaDoBanco('Hora Extra', '2:00')).toBe(false);
    expect(descontaDoBanco('')).toBe(false);
  });
});

describe('produtosDoRequerimento', () => {
  const OUT = '10/2026';

  it('produto sem módulos: não pede módulo e já diz o banco', () => {
    const [gallery] = produtosDoRequerimento([GALLERY], OUT);
    expect(gallery).toMatchObject({
      produtoId: 'gallery',
      nome: 'GALLERY',
      precisaModulo: false,
      banco: { id: 'gallery', nome: 'GALLERY' },
    });
  });

  it('produto com só alguns módulos no banco: pede o módulo e lista só os marcados', () => {
    const [ceplus] = produtosDoRequerimento([CE_EXPORT, CE_IMPORT], OUT);
    expect(ceplus.precisaModulo).toBe(true);
    expect(ceplus.banco).toBeNull();
    expect(ceplus.modulos).toEqual([
      { moduloId: 'export', nome: 'EXPORT', banco: { id: 'comex', nome: 'COMEX' } },
      { moduloId: 'import', nome: 'IMPORT', banco: { id: 'comex', nome: 'COMEX' } },
    ]);
  });

  it('produto com todos os módulos no mesmo banco: não pede módulo', () => {
    const [comply] = produtosDoRequerimento([COMPLY_A, COMPLY_B], OUT);
    expect(comply.precisaModulo).toBe(false);
    expect(comply.banco).toEqual({ id: 'fiscal', nome: 'FISCAL' });
  });

  it('todos os módulos cobertos, mas em bancos diferentes: pede o módulo', () => {
    const outro = { ...COMPLY_B, bancoId: 'outro', bancoNome: 'OUTRO', bancoOrdem: 9 };
    const [comply] = produtosDoRequerimento([COMPLY_A, outro], OUT);
    expect(comply.precisaModulo).toBe(true);
    expect(comply.modulos.map((m) => m.banco.id)).toEqual(['fiscal', 'outro']);
  });

  it('o mesmo módulo em dois bancos: fica o primeiro na ordem do cadastro', () => {
    const geral = opcao(['geral', 7], 'ceplus', 'export', 4);
    const [ceplus] = produtosDoRequerimento([geral, CE_EXPORT], OUT);
    expect(ceplus.modulos).toEqual([
      { moduloId: 'export', nome: 'EXPORT', banco: { id: 'comex', nome: 'COMEX' } },
    ]);
  });

  it('só os bancos vigentes no mês de cobrança; o primeiro e o último mês contam', () => {
    const encerrado = opcao(['encerrado', 5, '2026-07-01', '2026-09-01'], 'tpone', null, 0);
    expect(produtosDoRequerimento([encerrado], '10/2026')).toEqual([]);
    expect(produtosDoRequerimento([encerrado], '09/2026')).toHaveLength(1);
    expect(produtosDoRequerimento([encerrado], '07/2026')).toHaveLength(1);
    expect(produtosDoRequerimento([encerrado], '06/2026')).toEqual([]);
  });

  it('sem mês de cobrança, usa o mês atual', () => {
    const encerrado = opcao(['encerrado', 5, '2026-07-01', '2026-09-01'], 'tpone', null, 0);
    expect(produtosDoRequerimento([encerrado], '', new Date(2026, 7, 15))).toHaveLength(1);
    expect(produtosDoRequerimento([encerrado], undefined, new Date(2026, 9, 15))).toEqual([]);
  });

  it('um produto por vez, na ordem recebida', () => {
    const produtos = produtosDoRequerimento([GALLERY, CE_EXPORT, CE_IMPORT, COMPLY_A], OUT);
    expect(produtos.map((p) => p.produtoId)).toEqual(['gallery', 'ceplus', 'comply']);
  });
});

describe('chave do destino', () => {
  it('produto e módulo viram uma chave e voltam', () => {
    expect(lerDestino(chaveDestino('ceplus', 'export'))).toEqual({
      produtoId: 'ceplus',
      moduloId: 'export',
    });
    expect(lerDestino(chaveDestino('gallery', null))).toEqual({
      produtoId: 'gallery',
      moduloId: null,
    });
  });

  it('chave vazia: sem destino', () => {
    expect(lerDestino('')).toBeNull();
    expect(lerDestino(undefined)).toBeNull();
  });
});

describe('faltaBanco', () => {
  it('empresa liberada com Banco de Horas e sem produto: falta', () => {
    expect(faltaBanco({ liberada: true, tipoCobranca: 'Banco de Horas' })).toBe(true);
    expect(faltaBanco({ liberada: true, tipoCobranca: 'Banco de Horas', destino: '' })).toBe(true);
  });

  it('com produto (e módulo) escolhido: não falta', () => {
    expect(
      faltaBanco({ liberada: true, tipoCobranca: 'Banco de Horas', destino: 'gallery|' })
    ).toBe(false);
  });

  it('empresa no legado: nunca falta', () => {
    expect(faltaBanco({ liberada: false, tipoCobranca: 'Banco de Horas' })).toBe(false);
  });

  it('Reprovado: falta só com horas de análise EF', () => {
    expect(faltaBanco({ liberada: true, tipoCobranca: 'Reprovado', horasAnaliseEF: '1:00' })).toBe(
      true
    );
    expect(faltaBanco({ liberada: true, tipoCobranca: 'Reprovado' })).toBe(false);
  });

  it('tipo que não desconta: não falta', () => {
    expect(faltaBanco({ liberada: true, tipoCobranca: 'Faturado' })).toBe(false);
  });
});
