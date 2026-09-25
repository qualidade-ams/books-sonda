/**
 * Endereço em que o servidor HTTP escuta.
 *
 * Padrão 127.0.0.1: em produção o acesso externo é só pelo Cloudflare Tunnel
 * (cloudflared na mesma máquina), então a porta não precisa — e não deve —
 * aceitar conexões da rede. Defina HOST=0.0.0.0 apenas se precisar expor a
 * porta na rede de propósito.
 */
export function hostDeEscuta(env: { HOST?: string }): string {
  return env.HOST?.trim() || '127.0.0.1';
}
