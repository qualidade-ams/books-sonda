/**
 * Snapshot da aba "Requerimentos Faturados" (coluna books.dados_requerimentos_faturados).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const estado = vi.hoisted(() => ({
  respostas: {} as Record<string, any>,
  chamadas: [] as { tabela: string; metodo: string; args: any[] }[],
}));

vi.mock('@/integrations/supabase/client', () => {
  const from = (tabela: string) => {
    let modo = 'lista';
    const builder: any = new Proxy(
      {},
      {
        get(_alvo, prop: string) {
          if (prop === 'then') {
            const resposta = estado.respostas[`${tabela}:${modo}`] ?? { data: null, error: null };
            return (ok: any, falha: any) => Promise.resolve(resposta).then(ok, falha);
          }
          return (...args: any[]) => {
            if (prop === 'insert' || prop === 'update' || prop === 'maybeSingle') modo = prop;
            if (prop === 'single' && modo === 'lista') modo = 'single';
            estado.chamadas.push({ tabela, metodo: prop, args });
            return builder;
          };
        },
      }
    );
    return builder;
  };
  return {
    supabase: {
      from,
      auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u1' } } }) },
    },
  };
});

vi.mock('../booksDataCollectorService', () => ({
  booksDataCollectorService: { coletarDadosCompletos: vi.fn() },
}));
vi.mock('../bancoHorasService', () => ({ bancoHorasService: { calcularMes: vi.fn() } }));
vi.mock('../bancoHorasQuarentenaService', () => ({
  bancoHorasQuarentenaService: { fecharPeriodo: vi.fn(), reabrirPeriodo: vi.fn() },
}));

import { booksService } from '../booksService';
import { booksDataCollectorService } from '../booksDataCollectorService';

const FATURADO = {
  id: 'req-1',
  numero_chamado: 'RF-1',
  cliente: 'SAINT GOBAIN',
  modulo: 'Comply',
  descricao: 'Ajuste',
  tipo_cobranca: 'Banco de Horas',
  horas_funcional: '00:00',
  horas_tecnica: '24:00',
  total_horas: '24:00',
  status: 'Faturado',
};

describe('booksService — snapshot de requerimentos faturados', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    estado.respostas = {};
    estado.chamadas = [];
  });

  afterEach(() => vi.restoreAllMocks());

  it('buscarBookPorId lê dados_requerimentos_faturados', async () => {
    estado.respostas['books:single'] = {
      data: {
        id: 'b1',
        empresa_id: 'e1',
        mes: 9,
        ano: 2026,
        status: 'enviado',
        created_at: '2026-10-01T12:00:00Z',
        dados_requerimentos_faturados: [FATURADO],
        empresas_clientes: {
          nome_completo: 'SAINT GOBAIN CANALIZACAO LTDA',
          nome_abreviado: 'SAINT GOBAIN',
        },
      },
      error: null,
    };

    const book = await booksService.buscarBookPorId('b1');

    const select = estado.chamadas.find((c) => c.tabela === 'books' && c.metodo === 'select');
    expect(select.args[0]).toContain('dados_requerimentos_faturados');
    expect(book.requerimentos_faturados).toEqual([FATURADO]);
  });

  it('gerarBooksLote grava os requerimentos faturados no snapshot do book novo', async () => {
    estado.respostas['empresas_clientes:single'] = {
      data: { nome_completo: 'SAINT GOBAIN CANALIZACAO LTDA', nome_abreviado: 'SAINT GOBAIN' },
      error: null,
    };
    estado.respostas['books:maybeSingle'] = { data: null, error: null };
    estado.respostas['books:insert'] = { data: { id: 'novo' }, error: null };
    (booksDataCollectorService.coletarDadosCompletos as any).mockResolvedValue({
      capa: {},
      volumetria: {},
      sla: {},
      backlog: {},
      consumo: {},
      pesquisa: {},
      requerimentos_faturados: [FATURADO],
    });

    const resultado = await booksService.gerarBooksLote({
      empresa_ids: ['e1'],
      mes: 9,
      ano: 2026,
    } as any);

    expect(resultado.sucesso).toBe(1);
    const insert = estado.chamadas.find((c) => c.tabela === 'books' && c.metodo === 'insert');
    expect(insert.args[0].dados_requerimentos_faturados).toEqual([FATURADO]);
  });

  it('gerarBooksLote grava null quando a coleta não trouxe os faturados (aba cai na busca em tempo real)', async () => {
    estado.respostas['empresas_clientes:single'] = {
      data: { nome_completo: 'X', nome_abreviado: 'X' },
      error: null,
    };
    estado.respostas['books:maybeSingle'] = { data: null, error: null };
    estado.respostas['books:insert'] = { data: { id: 'novo' }, error: null };
    (booksDataCollectorService.coletarDadosCompletos as any).mockResolvedValue({
      capa: {},
      volumetria: {},
      sla: {},
      backlog: {},
      consumo: {},
      pesquisa: {},
    });

    await booksService.gerarBooksLote({ empresa_ids: ['e1'], mes: 9, ano: 2026 } as any);

    const insert = estado.chamadas.find((c) => c.tabela === 'books' && c.metodo === 'insert');
    expect(insert.args[0].dados_requerimentos_faturados).toBeNull();
  });

  it('gerarBooksLote atualiza o snapshot ao regenerar um book existente', async () => {
    estado.respostas['empresas_clientes:single'] = {
      data: { nome_completo: 'X', nome_abreviado: 'X' },
      error: null,
    };
    estado.respostas['books:maybeSingle'] = { data: { id: 'existente' }, error: null };
    estado.respostas['books:update'] = { data: { id: 'existente' }, error: null };
    (booksDataCollectorService.coletarDadosCompletos as any).mockResolvedValue({
      capa: {},
      volumetria: {},
      sla: {},
      backlog: {},
      consumo: {},
      pesquisa: {},
      requerimentos_faturados: [],
    });

    await booksService.gerarBooksLote({
      empresa_ids: ['e1'],
      mes: 9,
      ano: 2026,
      forcar_atualizacao: true,
    } as any);

    const updates = estado.chamadas.filter((c) => c.tabela === 'books' && c.metodo === 'update');
    expect(updates.at(-1).args[0].dados_requerimentos_faturados).toEqual([]);
  });
});
