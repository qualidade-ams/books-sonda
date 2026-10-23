import { describe, it, expect } from 'vitest';
import {
  codigoNovo,
  filtrarCodigos,
  mudancasRegras,
  paraSalvar,
  problemasDosFiltros,
  totaisRegras,
} from '../regrasTela';
import type { CodigoResolucao, FiltrosContagem } from '@/types/regrasContagem';

const codigo = (c: string, contaHoras = true, contaTickets = true): CodigoResolucao => ({
  codigo: c,
  contaHoras,
  contaTickets,
  apontamentos6m: 5,
  tickets6m: 1,
});
const CODIGOS = [
  codigo('Banco=S|SLA=N'),
  codigo('Banco=S |SLA=N', true, false),
  codigo('Outro', false, true),
];
const FILTROS: FiltrosContagem = {
  gruposQueContam: ['AMS APL', 'AMS T&M'],
  tiposChamado: ['IM', 'RF', 'PM'],
  ignorarAtividadeInterna: true,
  itensExcluidos: ['000000 - PROJETOS APL'],
  soTicketsFechados: true,
};
const SALVO = { codigos: CODIGOS, filtros: FILTROS };

describe('mudancasRegras', () => {
  it('sem mudança, nada', () => {
    expect(mudancasRegras(SALVO, SALVO).algo).toBe(false);
  });

  it('códigos incluídos, retirados e alterados; espaços contam', () => {
    const m = mudancasRegras(
      {
        codigos: [codigoNovo('Banco=S| SLA=N'), { ...CODIGOS[0], contaTickets: false }, CODIGOS[2]],
        filtros: FILTROS,
      },
      SALVO
    );
    expect(m).toMatchObject({
      incluidos: 1,
      retirados: 1,
      alterados: 1,
      filtrosAlterados: false,
      algo: true,
    });
  });

  it('a ordem dos tipos de chamado não é mudança; tirar um grupo é', () => {
    expect(
      mudancasRegras(
        { codigos: CODIGOS, filtros: { ...FILTROS, tiposChamado: ['PM', 'IM', 'RF'] } },
        SALVO
      ).algo
    ).toBe(false);
    expect(
      mudancasRegras(
        { codigos: CODIGOS, filtros: { ...FILTROS, gruposQueContam: ['AMS APL'] } },
        SALVO
      ).filtrosAlterados
    ).toBe(true);
  });
});

describe('paraSalvar', () => {
  it('manda só a parte que mudou, com o motivo', () => {
    const atual = { codigos: CODIGOS, filtros: { ...FILTROS, soTicketsFechados: false } };
    expect(paraSalvar(' novo código ', atual, mudancasRegras(atual, SALVO))).toEqual({
      motivo: 'novo código',
      filtros: atual.filtros,
    });
    const comCodigo = { codigos: [codigoNovo('X'), ...CODIGOS], filtros: FILTROS };
    expect(paraSalvar('x', comCodigo, mudancasRegras(comCodigo, SALVO))).toEqual({
      motivo: 'x',
      codigos: [
        { codigo: 'X', contaHoras: true, contaTickets: true },
        { codigo: 'Banco=S|SLA=N', contaHoras: true, contaTickets: true },
        { codigo: 'Banco=S |SLA=N', contaHoras: true, contaTickets: false },
        { codigo: 'Outro', contaHoras: false, contaTickets: true },
      ],
    });
  });
});

describe('problemasDosFiltros', () => {
  it('sem grupos ou sem tipos de chamado, nada conta: não pode salvar', () => {
    expect(problemasDosFiltros(FILTROS)).toEqual({ semGrupos: false, semTipos: false });
    expect(problemasDosFiltros({ ...FILTROS, gruposQueContam: [], tiposChamado: [] })).toEqual({
      semGrupos: true,
      semTipos: true,
    });
  });
});

describe('totaisRegras', () => {
  it('códigos que contam horas e tickets, filtros ativos e códigos sem regra', () => {
    expect(totaisRegras(CODIGOS, FILTROS, 4)).toEqual({
      horas: 2,
      tickets: 2,
      filtros: 8,
      semRegra: 4,
    });
  });
});

describe('filtrarCodigos', () => {
  it('busca no código e filtra por horas ou tickets', () => {
    expect(filtrarCodigos(CODIGOS, 'outro', []).map((c) => c.codigo)).toEqual(['Outro']);
    expect(filtrarCodigos(CODIGOS, '', ['tickets']).map((c) => c.codigo)).toEqual([
      'Banco=S|SLA=N',
      'Outro',
    ]);
  });
});
