import { describe, it, expect, vi, beforeEach } from 'vitest';
import { booksService } from '../booksService';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() }
}));

/** Query encadeável que resolve com erro em qualquer ponto */
function queryComErro(mensagem: string) {
  const resultado = Promise.resolve({ data: null, error: new Error(mensagem) });
  const builder: any = new Proxy(
    {},
    {
      get(_alvo, prop: string) {
        if (prop === 'then') return resultado.then.bind(resultado);
        return () => builder;
      }
    }
  );
  return builder;
}

describe('booksService.listarBooks — falha ao consultar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    (supabase.from as any).mockImplementation(() => queryComErro('timeout'));
  });

  it('com propagarErro, lança o erro em vez de devolver dados fictícios (geração automática)', async () => {
    await expect(booksService.listarBooks({ mes: 9, ano: 2026 }, { propagarErro: true })).rejects.toThrow('timeout');
  });

  it('sem a opção mantém o comportamento atual da tela (lista de exemplo)', async () => {
    const lista = await booksService.listarBooks({ mes: 9, ano: 2026 });
    expect(lista.length).toBeGreaterThan(0);
  });
});

describe('booksService.listarEmpresasBook', () => {
  beforeEach(() => vi.clearAllMocks());

  /** Query encadeável que registra as chamadas e resolve com `resposta` */
  function query(resposta: any) {
    const chamadas: Array<[string, any[]]> = [];
    const resultado = Promise.resolve(resposta);
    const builder: any = new Proxy(
      {},
      {
        get(_alvo, prop: string) {
          if (prop === 'then') return resultado.then.bind(resultado);
          return (...args: any[]) => {
            chamadas.push([prop, args]);
            return builder;
          };
        }
      }
    );
    return { builder, chamadas };
  }

  it('lista as empresas com book (ativas, AMS, book de qualidade) pelo nome abreviado', async () => {
    const { builder, chamadas } = query({
      data: [
        { id: 'e1', nome_abreviado: 'ABBOTT', nome_completo: 'Abbott Laboratórios' },
        { id: 'e2', nome_abreviado: null, nome_completo: 'Votorantim S.A.' }
      ],
      error: null
    });
    (supabase.from as any).mockReturnValue(builder);

    const empresas = await booksService.listarEmpresasBook();

    expect(supabase.from).toHaveBeenCalledWith('empresas_clientes');
    expect(chamadas).toContainEqual(['eq', ['status', 'ativo']]);
    expect(chamadas).toContainEqual(['eq', ['tem_ams', true]]);
    expect(chamadas).toContainEqual(['eq', ['tipo_book', 'qualidade']]);
    expect(empresas).toEqual([
      { id: 'e1', nome: 'ABBOTT' },
      { id: 'e2', nome: 'Votorantim S.A.' }
    ]);
  });

  it('propaga erro da consulta', async () => {
    (supabase.from as any).mockReturnValue(query({ data: null, error: new Error('timeout') }).builder);
    await expect(booksService.listarEmpresasBook()).rejects.toThrow('timeout');
  });
});
