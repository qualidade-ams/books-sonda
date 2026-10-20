/**
 * Liga o pacote do Saldo Parcial (vendor/saldoParcial.cjs, gerado a partir do front)
 * às dependências do servidor: client service role, render-image e webhook de e-mail.
 */

import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PayloadEmail } from './webhookEmailService';

interface DependenciasPacote {
  renderizarImagem(html: string): Promise<string | null>;
  enviarEmail(payload: PayloadEmail): Promise<void>;
}

export interface PacoteSaldoParcial {
  definirClienteSupabase(cliente: SupabaseClient | null): void;
  executarEnvioSaldoParcial(
    empresaId: string,
    destinatarios: string[],
    emailsCc: string[],
    deps: DependenciasPacote
  ): Promise<{ enviados: number }>;
}

/** vendor/ fica na raiz do sync-api: ../../vendor a partir de src/services e de dist/services */
export function carregarPacoteSaldoParcial(): PacoteSaldoParcial {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(path.resolve(__dirname, '..', '..', 'vendor', 'saldoParcial.cjs'));
}

export function criarExecutorSaldoParcial({
  supabase,
  renderizador,
  enviador,
  pacote = carregarPacoteSaldoParcial()
}: {
  supabase: SupabaseClient;
  renderizador: { renderizar(html: string): Promise<string | null> };
  enviador: { enviarEmail(payload: PayloadEmail): Promise<void> };
  pacote?: PacoteSaldoParcial;
}) {
  pacote.definirClienteSupabase(supabase);

  return (empresaId: string, destinatarios: string[], emailsCc: string[]) =>
    pacote.executarEnvioSaldoParcial(empresaId, destinatarios, emailsCc, {
      renderizarImagem: (html) => renderizador.renderizar(html),
      enviarEmail: (payload) => enviador.enviarEmail(payload)
    });
}
