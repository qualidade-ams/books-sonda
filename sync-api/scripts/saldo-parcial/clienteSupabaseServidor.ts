/**
 * Substitui `@/integrations/supabase/client` (client do navegador) dentro do pacote
 * vendor/saldoParcial.cjs. O sync-api injeta o client service role que já usa,
 * via definirClienteSupabase, antes de executar o envio.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

let cliente: SupabaseClient | null = null;

export function definirClienteSupabase(novoCliente: SupabaseClient | null): void {
  cliente = novoCliente;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_alvo, propriedade) {
    if (!cliente) {
      throw new Error('client do Supabase do servidor não definido (chame definirClienteSupabase antes do envio)');
    }
    const valor = (cliente as any)[propriedade];
    return typeof valor === 'function' ? valor.bind(cliente) : valor;
  }
});
