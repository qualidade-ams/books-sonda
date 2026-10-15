import { describe, it, expect } from 'vitest';
import {
  calcularConsumoEntreBancos,
  observacoesDaTransferencia,
  type BancoNoFechamento,
} from '../consumoEntreBancos';

const banco = (v: Partial<BancoNoFechamento> & { bancoId: string }): BancoNoFechamento => ({
  nome: v.bancoId,
  ordem: 1,
  ativo: true,
  tipoContrato: 'horas',
  periodoApuracao: 6,
  fimPeriodo: true,
  consomeOutrosBancos: false,
  saldos: { horas: 0 },
  ...v,
});

// Caso 8.3 da spec: fechamento de Dez/2026
const edocs = (consome: boolean) =>
  banco({
    bancoId: 'edocs',
    nome: 'FISCAL – e-DOCS',
    ordem: 2,
    consomeOutrosBancos: consome,
    saldos: { horas: -390 },
  });
const fiscal = (saldo: number) =>
  banco({ bancoId: 'fiscal', nome: 'Banco FISCAL', ordem: 1, saldos: { horas: saldo } });
const comex = banco({
  bancoId: 'comex',
  nome: 'Banco COMEX',
  ordem: 3,
  periodoApuracao: 3,
  saldos: { horas: 5000 },
});

describe('calcularConsumoEntreBancos — caso 8.3 da spec', () => {
  it('parâmetro desmarcado: nada se move, o negativo segue para excedente (CA-11)', () => {
    const r = calcularConsumoEntreBancos([fiscal(3135), edocs(false), comex]);
    expect(r.transferencias).toEqual([]);
    expect(r.porBanco.edocs.horas).toEqual({
      consumidoDeOutros: 0,
      cedidoAOutros: 0,
      saldoAposConsumoEntreBancos: -390,
    });
    expect(r.porBanco.fiscal.horas.saldoAposConsumoEntreBancos).toBe(3135);
  });

  it('saldo do outro banco suficiente: cobre tudo, sem excedente (CA-12)', () => {
    const r = calcularConsumoEntreBancos([fiscal(3135), edocs(true), comex]);
    expect(r.transferencias).toEqual([
      { cedenteId: 'fiscal', consumidorId: 'edocs', unidade: 'horas', quantidade: 390 },
    ]);
    expect(r.porBanco.edocs.horas).toEqual({
      consumidoDeOutros: 390,
      cedidoAOutros: 0,
      saldoAposConsumoEntreBancos: 0,
    });
    expect(r.porBanco.fiscal.horas).toEqual({
      consumidoDeOutros: 0,
      cedidoAOutros: 390,
      saldoAposConsumoEntreBancos: 2745,
    });
    expect(r.porBanco.comex.horas.saldoAposConsumoEntreBancos).toBe(5000);
  });

  it('saldo insuficiente: cobre o que der e o banco que cede para em zero (RN-20, RN-22)', () => {
    const r = calcularConsumoEntreBancos([fiscal(240), edocs(true), comex]);
    expect(r.transferencias).toEqual([
      { cedenteId: 'fiscal', consumidorId: 'edocs', unidade: 'horas', quantidade: 240 },
    ]);
    expect(r.porBanco.edocs.horas.saldoAposConsumoEntreBancos).toBe(-150);
    expect(r.porBanco.fiscal.horas.saldoAposConsumoEntreBancos).toBe(0);
  });
});

describe('calcularConsumoEntreBancos — elegibilidade (RN-18, RN-19)', () => {
  const consumidor = banco({ bancoId: 'c', consomeOutrosBancos: true, saldos: { horas: -100 } });

  it('só no fim do período do banco que consome', () => {
    const r = calcularConsumoEntreBancos([
      { ...consumidor, fimPeriodo: false },
      banco({ bancoId: 'd', saldos: { horas: 500 } }),
    ]);
    expect(r.transferencias).toEqual([]);
  });

  it('não cede: banco de outro ciclo, que não fecha no mês, de outro tipo de contrato ou inativo', () => {
    const r = calcularConsumoEntreBancos([
      consumidor,
      banco({ bancoId: 'outroCiclo', periodoApuracao: 3, saldos: { horas: 500 } }),
      banco({ bancoId: 'naoFecha', fimPeriodo: false, saldos: { horas: 500 } }),
      banco({ bancoId: 'tickets', tipoContrato: 'tickets', saldos: { tickets: 50 } }),
      banco({ bancoId: 'inativo', ativo: false, saldos: { horas: 500 } }),
    ]);
    expect(r.transferencias).toEqual([]);
    expect(r.porBanco.c.horas.saldoAposConsumoEntreBancos).toBe(-100);
  });

  it('banco sem saldo positivo não cede', () => {
    const r = calcularConsumoEntreBancos([
      consumidor,
      banco({ bancoId: 'zero', saldos: { horas: 0 } }),
    ]);
    expect(r.transferencias).toEqual([]);
  });
});

describe('calcularConsumoEntreBancos — ordem do cadastro (RN-20, RN-21)', () => {
  it('os bancos que cedem são usados na ordem do cadastro', () => {
    const r = calcularConsumoEntreBancos([
      banco({ bancoId: 'segundo', ordem: 3, saldos: { horas: 500 } }),
      banco({ bancoId: 'primeiro', ordem: 2, saldos: { horas: 60 } }),
      banco({ bancoId: 'c', ordem: 1, consomeOutrosBancos: true, saldos: { horas: -100 } }),
    ]);
    expect(r.transferencias).toEqual([
      { cedenteId: 'primeiro', consumidorId: 'c', unidade: 'horas', quantidade: 60 },
      { cedenteId: 'segundo', consumidorId: 'c', unidade: 'horas', quantidade: 40 },
    ]);
    expect(r.porBanco.c.horas.consumidoDeOutros).toBe(100);
  });

  it('dois bancos negativos: o primeiro do cadastro é atendido primeiro', () => {
    const r = calcularConsumoEntreBancos([
      banco({ bancoId: 'c2', ordem: 2, consomeOutrosBancos: true, saldos: { horas: -100 } }),
      banco({ bancoId: 'c1', ordem: 1, consomeOutrosBancos: true, saldos: { horas: -100 } }),
      banco({ bancoId: 'd', ordem: 3, saldos: { horas: 150 } }),
    ]);
    expect(r.porBanco.c1.horas.saldoAposConsumoEntreBancos).toBe(0);
    expect(r.porBanco.c2.horas.saldoAposConsumoEntreBancos).toBe(-50);
    expect(r.porBanco.d.horas.saldoAposConsumoEntreBancos).toBe(0);
  });
});

describe('calcularConsumoEntreBancos — contrato "ambos"', () => {
  it('horas cobrem horas e tickets cobrem tickets, em separado', () => {
    const r = calcularConsumoEntreBancos([
      banco({
        bancoId: 'c',
        tipoContrato: 'ambos',
        consomeOutrosBancos: true,
        saldos: { horas: -30, tickets: -2 },
      }),
      banco({ bancoId: 'd', tipoContrato: 'ambos', ordem: 2, saldos: { horas: 100, tickets: 1 } }),
    ]);
    expect(r.transferencias).toEqual([
      { cedenteId: 'd', consumidorId: 'c', unidade: 'horas', quantidade: 30 },
      { cedenteId: 'd', consumidorId: 'c', unidade: 'tickets', quantidade: 1 },
    ]);
    expect(r.porBanco.c.tickets.saldoAposConsumoEntreBancos).toBe(-1);
  });
});

describe('observacoesDaTransferencia (RN-24)', () => {
  it('gera o texto dos dois bancos, como na spec', () => {
    expect(
      observacoesDaTransferencia(
        { unidade: 'horas', quantidade: 390 },
        { cedente: 'Banco FISCAL', consumidor: 'FISCAL – e-DOCS' }
      )
    ).toEqual({
      consumidor: '06:30 horas consumidas do Banco FISCAL',
      cedente: '06:30 horas cedidas ao banco FISCAL – e-DOCS',
    });
  });

  it('tickets e nomes sem a palavra "banco"', () => {
    expect(
      observacoesDaTransferencia(
        { unidade: 'tickets', quantidade: 3 },
        { cedente: 'IOB', consumidor: 'NIQUEL' }
      )
    ).toEqual({
      consumidor: '3 tickets consumidos do banco IOB',
      cedente: '3 tickets cedidos ao banco NIQUEL',
    });
  });

  it('um ticket no singular; horas acima de 99', () => {
    expect(
      observacoesDaTransferencia(
        { unidade: 'tickets', quantidade: 1 },
        { cedente: 'A', consumidor: 'B' }
      ).consumidor
    ).toBe('1 ticket consumido do banco A');
    expect(
      observacoesDaTransferencia(
        { unidade: 'horas', quantidade: 6005 },
        { cedente: 'A', consumidor: 'B' }
      ).cedente
    ).toBe('100:05 horas cedidas ao banco B');
  });
});
