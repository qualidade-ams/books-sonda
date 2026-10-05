import { describe, it, expect, vi } from 'vitest';
import { criarExecutorSaldoParcial } from '../envioSaldoParcialService';

describe('envioSaldoParcialService', () => {
  it('injeta o client do Supabase no pacote e encaminha renderização e envio', async () => {
    const supabase = { from: vi.fn() } as any;
    const pacote = {
      definirClienteSupabase: vi.fn(),
      executarEnvioSaldoParcial: vi.fn(async (_e: string, _d: string[], _c: string[], deps: any) => {
        await deps.renderizarImagem('<html/>');
        await deps.enviarEmail({ nome: 'x' });
        return { enviados: 1 };
      })
    };
    const renderizador = { renderizar: vi.fn(async () => 'iVBOR') };
    const enviador = { enviarEmail: vi.fn(async () => undefined) };

    const executar = criarExecutorSaldoParcial({ supabase, renderizador, enviador, pacote });
    const resultado = await executar('emp-1', ['a@cliente.com'], ['cc@sonda.com']);

    expect(pacote.definirClienteSupabase).toHaveBeenCalledWith(supabase);
    expect(pacote.executarEnvioSaldoParcial).toHaveBeenCalledWith('emp-1', ['a@cliente.com'], ['cc@sonda.com'], expect.any(Object));
    expect(renderizador.renderizar).toHaveBeenCalledWith('<html/>');
    expect(enviador.enviarEmail).toHaveBeenCalledWith({ nome: 'x' });
    expect(resultado).toEqual({ enviados: 1 });
  });

  it('carrega o pacote vendor por padrão', () => {
    const executar = criarExecutorSaldoParcial({
      supabase: {} as any,
      renderizador: { renderizar: async () => null },
      enviador: { enviarEmail: async () => undefined }
    });

    expect(typeof executar).toBe('function');
  });
});
