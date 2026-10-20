/**
 * Renderização das tabelas do Saldo Parcial como imagem, usando o mesmo endpoint
 * do envio manual (/api/email/render-image na Vercel, com Puppeteer).
 *
 * A imagem é obrigatória (o HTML de tabela distorce conforme o cliente de e-mail):
 * tenta algumas vezes e, se não conseguir, lança o motivo — o envio daquele cliente
 * fica como "erro" no histórico e pode ser refeito com "Enviar agora".
 */

export interface DependenciasRenderizador {
  /** URL pública do /api/email/render-image (variável RENDER_IMAGE_URL) */
  url: string;
  fetch: typeof fetch;
  timeoutMs?: number;
  esperar?: (ms: number) => Promise<void>;
}

const LARGURA_IMAGEM = 1200;
const TIMEOUT_PADRAO_MS = 30_000;
const TENTATIVAS = 3;
const ESPERA_ENTRE_TENTATIVAS_MS = 5_000;

const esperarPadrao = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export function criarRenderizadorImagem(deps: DependenciasRenderizador) {
  const esperar = deps.esperar ?? esperarPadrao;

  async function tentar(html: string): Promise<string> {
    const controle = new AbortController();
    const timer = setTimeout(() => controle.abort(), deps.timeoutMs ?? TIMEOUT_PADRAO_MS);
    try {
      const resposta = await deps.fetch(deps.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, width: LARGURA_IMAGEM }),
        signal: controle.signal
      });
      if (!resposta.ok) throw new Error(`render-image respondeu HTTP ${resposta.status}`);

      const dados = (await resposta.json()) as { success?: boolean; image?: string };
      if (!dados.success || !dados.image) throw new Error('render-image respondeu sem imagem');
      return dados.image;
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') throw new Error('render-image excedeu o tempo limite');
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  async function renderizar(html: string): Promise<string> {
    if (!deps.url) {
      throw new Error('RENDER_IMAGE_URL não configurada no .env do sync-api');
    }

    let ultimoErro: Error = new Error('render-image indisponível');
    for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
      try {
        return await tentar(html);
      } catch (e) {
        ultimoErro = e instanceof Error ? e : new Error(String(e));
        console.warn(`[SALDO PARCIAL] Falha ao gerar a imagem das tabelas (tentativa ${tentativa}/${TENTATIVAS}): ${ultimoErro.message}`);
        if (tentativa < TENTATIVAS) await esperar(ESPERA_ENTRE_TENTATIVAS_MS);
      }
    }
    throw ultimoErro;
  }

  return { renderizar };
}
