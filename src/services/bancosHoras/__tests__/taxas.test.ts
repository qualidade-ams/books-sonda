import { describe, it, expect } from 'vitest';
import {
  escolherTaxa,
  taxaHora,
  taxaTicket,
  descricaoFaturamento,
  type TaxaCliente,
} from '../taxas';

const taxa = (v: Partial<TaxaCliente>): TaxaCliente => ({
  id: 't',
  vigenciaInicio: '2026-01-01',
  tipoProduto: 'OUTROS',
  tipoCalculoAdicional: 'media',
  valorTicketExcedente: null,
  ticketExcedente2: null,
  ticketExcedente: null,
  funcoesRemotas: [],
  ...v,
});

const funcional = (valorBase: number, valorAdicional: number | null = null) => ({
  funcao: 'Funcional',
  valorBase,
  valorAdicional,
});

describe('escolherTaxa (RC-71, Q5)', () => {
  const taxas = [
    taxa({ id: 'antiga', vigenciaInicio: '2025-01-01' }),
    taxa({ id: 'recente', vigenciaInicio: '2026-03-01' }),
    taxa({ id: 'futura', vigenciaInicio: '2026-10-01' }),
    taxa({ id: 'gallery', vigenciaInicio: '2026-05-01', tipoProduto: 'GALLERY' }),
  ];

  it('usa a vigência mais recente que começou até o dia 1 do mês, do produto do banco', () => {
    expect(escolherTaxa(taxas, { mes: 9, ano: 2026 }, 'OUTROS')?.id).toBe('recente');
    expect(escolherTaxa(taxas, { mes: 2, ano: 2026 }, 'OUTROS')?.id).toBe('antiga');
    expect(escolherTaxa(taxas, { mes: 9, ano: 2026 }, 'GALLERY')?.id).toBe('gallery');
  });

  it('sem taxa do produto até o mês, devolve nulo', () => {
    expect(escolherTaxa(taxas, { mes: 4, ano: 2026 }, 'GALLERY')).toBeNull();
    expect(escolherTaxa([], { mes: 4, ano: 2026 }, 'OUTROS')).toBeNull();
  });
});

describe('taxaHora — hora excedente (RC-72)', () => {
  it('valor adicional da função Funcional, quando maior que zero', () => {
    expect(taxaHora(taxa({ funcoesRemotas: [funcional(100, 140)] }), 'excedente')).toBe(140);
  });

  it('modo normal: valor base + 15%', () => {
    expect(
      taxaHora(
        taxa({ tipoCalculoAdicional: 'normal', funcoesRemotas: [funcional(100, 0)] }),
        'excedente'
      )
    ).toBe(115);
  });

  it('modo média (também quando vazio): média das 3 funções, cada uma pelo adicional ou base + 15%', () => {
    const t = taxa({
      tipoCalculoAdicional: null,
      funcoesRemotas: [
        funcional(100),
        { funcao: 'Técnico (Instalação / Atualização)', valorBase: 90, valorAdicional: 130 },
        { funcao: 'ABAP - PL/SQL', valorBase: 200, valorAdicional: null },
        { funcao: 'DBA', valorBase: 999, valorAdicional: 999 },
      ],
    });
    expect(taxaHora(t, 'excedente')).toBe(158.33); // (115 + 130 + 230) / 3
  });

  it('sem a função Funcional não há taxa, mesmo no modo média', () => {
    const t = taxa({
      funcoesRemotas: [{ funcao: 'ABAP - PL/SQL', valorBase: 200, valorAdicional: null }],
    });
    expect(taxaHora(t, 'excedente')).toBeNull();
  });
});

describe('taxaHora — hora normal (9.3-1b)', () => {
  it('valor base da função Funcional', () => {
    expect(taxaHora(taxa({ funcoesRemotas: [funcional(100, 140)] }), 'normal')).toBe(100);
  });

  it('sem a função Funcional, nulo', () => {
    expect(taxaHora(taxa({}), 'normal')).toBeNull();
  });
});

describe('taxaTicket (RC-73)', () => {
  it('primeiro valor preenchido: excedente do ticket, depois excedente 2, depois excedente; zero conta como vazio', () => {
    expect(
      taxaTicket(taxa({ valorTicketExcedente: 0, ticketExcedente2: 50, ticketExcedente: 40 }))
    ).toBe(50);
    expect(taxaTicket(taxa({ valorTicketExcedente: 60, ticketExcedente2: 50 }))).toBe(60);
    expect(taxaTicket(taxa({ ticketExcedente: 40 }))).toBe(40);
  });

  it('nenhum preenchido, nulo', () => {
    expect(taxaTicket(taxa({}))).toBeNull();
  });
});

describe('descricaoFaturamento (RC-36)', () => {
  it('horas no formato do texto atual', () => {
    expect(descricaoFaturamento(390, 'horas', { mes: 12, ano: 2026 }, 975)).toBe(
      'Excedente de 6:30 horas no período 12/2026 - Valor: R$ 975,00'
    );
  });

  it('tickets', () => {
    expect(descricaoFaturamento(3, 'tickets', { mes: 3, ano: 2026 }, 631.5)).toBe(
      'Excedente de 3 tickets no período 03/2026 - Valor: R$ 631,50'
    );
  });
});
