/**
 * Lógica do proxy de envio de e-mail (POST /api/email/send).
 *
 * O navegador não conhece mais a URL assinada do webhook (Power Automate):
 * ela é lida no servidor e o payload é repassado sem alterações.
 * Separada do handler para ser testável sem Vercel/Supabase.
 */

export interface DependenciasEncaminhamento {
  /** Valida o JWT do usuário logado (Supabase Auth) */
  validarToken(token: string): Promise<boolean>;
  /** URL do webhook ativo em webhook_config (lida com service role) */
  buscarWebhookUrl(): Promise<string | null>;
  fetch: typeof fetch;
  /** Tempo máximo de espera pelo webhook (padrão 55s, abaixo do maxDuration da função) */
  timeoutMs?: number;
}

export interface RespostaEncaminhamento {
  status: number;
  corpo: string;
}

const TIMEOUT_PADRAO_MS = 55_000;

const json = (status: number, dados: Record<string, unknown>): RespostaEncaminhamento => ({
  status,
  corpo: JSON.stringify(dados)
});

function payloadValido(payload: any): boolean {
  return (
    !!payload &&
    typeof payload === 'object' &&
    typeof payload.nome === 'string' &&
    payload.nome.trim().length > 0 &&
    Array.isArray(payload.email) &&
    payload.email.length > 0 &&
    typeof payload.mensagem === 'string'
  );
}

export async function encaminharEmail(
  authorization: string | undefined,
  payload: unknown,
  deps: DependenciasEncaminhamento
): Promise<RespostaEncaminhamento> {
  const token = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : '';
  if (!token || !(await deps.validarToken(token))) {
    return json(401, { success: false, error: 'Não autenticado' });
  }

  if (!payloadValido(payload)) {
    return json(400, { success: false, error: 'Payload de e-mail inválido (assunto, destinatários e mensagem são obrigatórios)' });
  }

  const webhookUrl = await deps.buscarWebhookUrl();
  if (!webhookUrl) {
    return json(503, { success: false, error: 'Nenhum webhook de e-mail ativo configurado' });
  }

  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), deps.timeoutMs ?? TIMEOUT_PADRAO_MS);

  try {
    const resposta = await deps.fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controle.signal
    });

    // Status e corpo do webhook são repassados: o front decide o retry (ex.: 429)
    const corpo = await resposta.text().catch(() => '');
    return { status: resposta.status, corpo };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return json(504, { success: false, error: 'Tempo limite excedido ao chamar o serviço de e-mail' });
    }
    // Mensagem genérica: o erro original pode conter a URL assinada
    return json(502, { success: false, error: 'Falha ao contatar o serviço de e-mail' });
  } finally {
    clearTimeout(timer);
  }
}
