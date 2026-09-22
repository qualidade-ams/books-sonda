/**
 * Tests for gerarExcelDetalhadoBook
 *
 * @module utils/__tests__/gerarExcelDetalhadoBook.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { gerarExcelDetalhadoBook } from '../gerarExcelDetalhadoBook';

const { capturedSheets, mockTicket } = vi.hoisted(() => {
  const capturedSheets: Record<string, any[][]> = {};

  const mockTicket = {
    nro_solicitacao: '12345',
    cod_tipo: 'IM',
    ticket_externo: null,
    numero_pai: null,
    organizacao: 'Empresa Teste',
    empresa: 'Empresa Teste',
    categoria: 'Consultoria',
    item_configuracao: null,
    status: 'Closed',
    nome_grupo: 'AMS SAP',
    nome_responsavel: 'Fulano',
    solicitante: 'Ciclano',
    data_abertura: '2026-01-05T12:00:00.000Z',
    data_solucao: '2026-01-10T12:00:00.000Z',
    data_fechamento: '2026-01-12T12:00:00.000Z',
    cod_resolucao: 'Consultoria',
    tds_cumprido: 'TDS Cumprido',
    prioridade: 'Média',
    resumo: 'Resumo teste',
  };

  return { capturedSheets, mockTicket };
});

vi.mock('xlsx-js-style', () => {
  return {
    utils: {
      book_new: vi.fn(() => ({})),
      aoa_to_sheet: vi.fn((data: any[][]) => ({ __aoa: data })),
      book_append_sheet: vi.fn((_wb: any, sheet: any, name: string) => {
        capturedSheets[name] = sheet.__aoa;
      }),
      encode_cell: vi.fn(() => 'A1'),
    },
    write: vi.fn(() => new Uint8Array([1, 2, 3])),
  };
});

vi.mock('@/integrations/supabase/client', () => {
  function makeBuilder(result: any) {
    const builder: any = {};
    const chainMethods = ['select', 'ilike', 'gte', 'lte', 'lt', 'neq', 'eq', 'or', 'not', 'in', 'order'];
    chainMethods.forEach((method) => {
      builder[method] = vi.fn(() => builder);
    });
    builder.limit = vi.fn(() => Promise.resolve(result));
    builder.single = vi.fn(() => Promise.resolve(result));
    return builder;
  }

  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'empresas_clientes') {
          return makeBuilder({ data: { nome_completo: 'Empresa Teste', tipo_contrato: 'horas' }, error: null });
        }
        if (table === 'apontamentos_tickets_aranda') {
          return makeBuilder({ data: [mockTicket], error: null });
        }
        return makeBuilder({ data: [], error: null });
      }),
    },
  };
});

describe('gerarExcelDetalhadoBook', () => {
  beforeEach(() => {
    for (const key of Object.keys(capturedSheets)) delete capturedSheets[key];
  });

  it('inclui a coluna DATA ENCERRAMENTO logo após DATA SOLUÇÃO na aba Fechados, com o valor de data_fechamento', async () => {
    await gerarExcelDetalhadoBook({
      empresaId: 'empresa-1',
      empresaNome: 'Empresa Teste',
      mes: 1,
      ano: 2026,
    });

    const fechadosSheet = capturedSheets['Fechados'];
    expect(fechadosSheet).toBeDefined();

    const headers = fechadosSheet[0];
    const idxSolucao = headers.indexOf('DATA SOLUÇÃO');
    const idxEncerramento = headers.indexOf('DATA ENCERRAMENTO');

    expect(idxSolucao).toBeGreaterThan(-1);
    expect(idxEncerramento).toBe(idxSolucao + 1);

    const row = fechadosSheet[1];
    expect(row[idxEncerramento]).toBe('12/01/2026');
  });
});
