import { describe, it, expect } from 'vitest';
import { bancosVigentesNoMes, descontaDoBanco, faltaBanco } from '../bancoDoRequerimento';
import type { BancoDoRequerimento } from '@/services/requerimentoBancoService';

const banco = (
  id: string,
  inicioVigencia: string,
  fimVigencia: string | null = null
): BancoDoRequerimento => ({
  id,
  nome: id,
  padrao: false,
  ordem: 1,
  inicioVigencia,
  fimVigencia,
  escolhido: false,
});

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

describe('bancosVigentesNoMes', () => {
  const bancos = [
    banco('desde-jul', '2026-07-01'),
    banco('jul-a-set', '2026-07-01', '2026-09-01'),
    banco('desde-nov', '2026-11-01'),
  ];

  it('filtra pelos vigentes no mês de cobrança (MM/AAAA)', () => {
    expect(bancosVigentesNoMes(bancos, '10/2026').map((b) => b.id)).toEqual(['desde-jul']);
  });

  it('o primeiro e o último mês da vigência contam', () => {
    expect(bancosVigentesNoMes(bancos, '07/2026').map((b) => b.id)).toEqual([
      'desde-jul',
      'jul-a-set',
    ]);
    expect(bancosVigentesNoMes(bancos, '09/2026').map((b) => b.id)).toEqual([
      'desde-jul',
      'jul-a-set',
    ]);
    expect(bancosVigentesNoMes(bancos, '11/2026').map((b) => b.id)).toEqual([
      'desde-jul',
      'desde-nov',
    ]);
  });

  it('sem mês de cobrança, usa o mês atual', () => {
    const hoje = new Date(2026, 7, 15); // 15/08/2026
    expect(bancosVigentesNoMes(bancos, '', hoje).map((b) => b.id)).toEqual([
      'desde-jul',
      'jul-a-set',
    ]);
    expect(bancosVigentesNoMes(bancos, undefined, hoje).map((b) => b.id)).toEqual([
      'desde-jul',
      'jul-a-set',
    ]);
  });

  it('mantém a ordem recebida', () => {
    const invertidos = [banco('b', '2026-01-01'), banco('a', '2026-01-01')];
    expect(bancosVigentesNoMes(invertidos, '05/2026').map((b) => b.id)).toEqual(['b', 'a']);
  });
});

describe('faltaBanco', () => {
  it('empresa liberada com Banco de Horas e sem banco: falta', () => {
    expect(faltaBanco({ liberada: true, tipoCobranca: 'Banco de Horas' })).toBe(true);
    expect(faltaBanco({ liberada: true, tipoCobranca: 'Banco de Horas', bancoId: '' })).toBe(true);
  });

  it('com banco escolhido: não falta', () => {
    expect(faltaBanco({ liberada: true, tipoCobranca: 'Banco de Horas', bancoId: 'b1' })).toBe(
      false
    );
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
