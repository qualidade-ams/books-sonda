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
