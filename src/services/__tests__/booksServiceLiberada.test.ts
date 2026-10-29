/**
 * Geração do Book da empresa liberada (Fase 5, Modelagem_Fase5.md seção 5): fecha o mês no
 * modelo novo e grava o snapshot por banco; o fechamento do legado não é chamado.
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
vi.mock('../geracaoBookLiberada', () => ({
  geracaoBookLiberada: { noModeloNovo: vi.fn(), preparar: vi.fn(), gravar: vi.fn() },
}));

import { booksService } from '../booksService';
import { booksDataCollectorService } from '../booksDataCollectorService';
import { bancoHorasQuarentenaService } from '../bancoHorasQuarentenaService';
import { geracaoBookLiberada } from '../geracaoBookLiberada';

const SET = { mes: 9, ano: 2026 };
const LINHAS = [{ banco_id: 'b1', ordem: 1 }];

function cenario(book: { id: string; status: string } | null) {
  estado.respostas['empresas_clientes:single'] = {
    data: { nome_completo: 'EMPRESA ALFA LTDA', nome_abreviado: 'EMPRESA ALFA' },
    error: null,
  };
  estado.respostas['books:maybeSingle'] = { data: book, error: null };
  estado.respostas['books:insert'] = { data: { id: 'book-novo' }, error: null };
  estado.respostas['books:update'] = { data: { id: book?.id }, error: null };
  (booksDataCollectorService.coletarDadosCompletos as any).mockResolvedValue({
    capa: {},
    volumetria: {},
    sla: {},
    backlog: {},
    consumo: {},
    pesquisa: {},
  });
}

const gerar = (forcar = false) =>
  booksService.gerarBooksLote({
    empresa_ids: ['e1'],
    ...SET,
    forcar_atualizacao: forcar,
  } as any);

describe('booksService.gerarBooksLote — empresa liberada', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    estado.respostas = {};
    estado.chamadas = [];
    vi.mocked(geracaoBookLiberada.noModeloNovo).mockResolvedValue(true);
    vi.mocked(geracaoBookLiberada.preparar).mockResolvedValue(LINHAS as any);
    vi.mocked(geracaoBookLiberada.gravar).mockResolvedValue(undefined);
  });

  afterEach(() => vi.clearAllMocks());

  it('primeira geração: fecha no modelo novo, grava o snapshot e não fecha o legado', async () => {
    cenario(null);
    const r = await gerar();

    expect(r.sucesso).toBe(1);
    expect(geracaoBookLiberada.noModeloNovo).toHaveBeenCalledWith('e1', SET);
    expect(geracaoBookLiberada.preparar).toHaveBeenCalledWith('e1', SET, false);
    expect(geracaoBookLiberada.gravar).toHaveBeenCalledWith('book-novo', LINHAS);
    expect(bancoHorasQuarentenaService.fecharPeriodo).not.toHaveBeenCalled();
  });

  it('Book em retificação (desatualizado) com atualização forçada: retifica o mês', async () => {
    cenario({ id: 'existente', status: 'desatualizado' });
    await gerar(true);

    expect(geracaoBookLiberada.preparar).toHaveBeenCalledWith('e1', SET, true);
    expect(bancoHorasQuarentenaService.reabrirPeriodo).not.toHaveBeenCalled();
    expect(geracaoBookLiberada.gravar).toHaveBeenCalledWith('existente', LINHAS);
  });

  it('atualização forçada sem retificação (inclusive a geração automática) não reabre (D-11)', async () => {
    cenario({ id: 'existente', status: 'enviado' });
    await gerar(true);
    expect(geracaoBookLiberada.preparar).toHaveBeenCalledWith('e1', SET, false);
  });

  it('falha ao fechar ou montar o snapshot: o Book não é gravado', async () => {
    cenario(null);
    vi.mocked(geracaoBookLiberada.preparar).mockRejectedValue(new Error('Banco sem baseline'));
    const r = await gerar();

    expect(r.sucesso).toBe(0);
    expect(r.resultados[0].erro).toContain('Banco sem baseline');
    expect(estado.chamadas.some((c) => c.tabela === 'books' && c.metodo === 'insert')).toBe(false);
  });

  it('empresa em Legado: segue o fluxo atual e fecha o legado', async () => {
    vi.mocked(geracaoBookLiberada.noModeloNovo).mockResolvedValue(false);
    cenario(null);
    await gerar();

    expect(geracaoBookLiberada.preparar).not.toHaveBeenCalled();
    expect(geracaoBookLiberada.gravar).not.toHaveBeenCalled();
    expect(bancoHorasQuarentenaService.fecharPeriodo).toHaveBeenCalledWith('e1', 9, 2026, 'u1');
  });
});
