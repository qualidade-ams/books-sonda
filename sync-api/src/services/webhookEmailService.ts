/**
 * Envio de e-mail pelo webhook do Power Automate a partir do servidor.
 *
 * A URL assinada fica em webhook_config (lida com a service key) — nunca em código
 * ou .env versionado. Em 429 (limite de execuções simultâneas do Power Automate)
 * tenta de novo com espera crescente.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface PayloadEmail {
  nome: string;
  email: string[];
  email_cc: string[];
  email_bcc: string[];
  mensagem: string;
  anexos: unknown;
}

export interface DependenciasWebhook {
  supabase: SupabaseClient;
  fetch: typeof fetch;
  esperar?: (ms: number) => Promise<void>;
  timeoutMs?: number;
}

const MAX_RETENTATIVAS_429 = 3;
const BACKOFF_INICIAL_MS = 60_000;
const BACKOFF_MAX_MS = 300_000;
const TIMEOUT_PADRAO_MS = 60_000;

const esperarPadrao = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export function criarEnviadorWebhook(deps: DependenciasWebhook) {
  const db = deps.supabase as any;
  const esperar = deps.esperar ?? esperarPadrao;

  async function buscarUrlWebhook(): Promise<string> {
    const { data, error } = await db
      .from('webhook_config')
      .select('webhook_url')
      .eq('ativo', true)
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`Erro ao ler a configuração do webhook de e-mail: ${error.message}`);
    if (!data?.webhook_url) throw new Error('Nenhum webhook de e-mail ativo configurado');
    return data.webhook_url;
  }

  async function postar(url: string, payload: PayloadEmail) {
    const controle = new AbortController();
    const timer = setTimeout(() => controle.abort(), deps.timeoutMs ?? TIMEOUT_PADRAO_MS);
    try {
      return await deps.fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controle.signal
      });
    } catch (e) {
      // A mensagem original pode conter a URL assinada
      const motivo = e instanceof Error && e.name === 'AbortError' ? 'tempo limite excedido' : 'falha de conexão';
      throw new Error(`Erro ao chamar o webhook de e-mail: ${motivo}`);
    } finally {
      clearTimeout(timer);
    }
  }

  async function enviarEmail(payload: PayloadEmail): Promise<void> {
    const url = await buscarUrlWebhook();

    for (let tentativa = 0; ; tentativa++) {
      const resposta = await postar(url, payload);
      if (resposta.ok) return;

      if (resposta.status === 429 && tentativa < MAX_RETENTATIVAS_429) {
        const espera = Math.min(BACKOFF_INICIAL_MS * 2 ** tentativa, BACKOFF_MAX_MS);
        console.warn(`[WEBHOOK E-MAIL] 429 — nova tentativa em ${espera / 1000}s (${tentativa + 1}/${MAX_RETENTATIVAS_429})`);
        await esperar(espera);
        continue;
      }

      const corpo = await resposta.text().catch(() => '');
      throw new Error(`Erro HTTP ${resposta.status} no webhook de e-mail${corpo ? `: ${corpo.slice(0, 300)}` : ''}`);
    }
  }

  return { enviarEmail };
}
