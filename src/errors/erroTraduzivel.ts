/**
 * Erros dos services das telas novas (Fase 3) que a tela mostra no idioma do usuário. O service
 * lança com a chave de tradução e os valores; a mensagem em português fica de reserva (logs e
 * telas que ainda mostram err.message). Quem mostra o erro usa textoDoErro.
 */

type Traduzir = (chave: string, valores?: Record<string, unknown>) => string;

export class ErroTraduzivel extends Error {
  constructor(
    readonly chave: string,
    readonly valores: Record<string, unknown>,
    mensagem: string
  ) {
    super(mensagem);
    this.name = 'ErroTraduzivel';
  }
}

/** Texto do erro para a tela: pela chave, se houver; senão a mensagem como veio */
export function textoDoErro(erro: unknown, t: Traduzir): string {
  if (erro instanceof ErroTraduzivel) {
    const valores = Object.fromEntries(
      Object.entries(erro.valores).map(([nome, valor]) => [
        nome,
        valor instanceof Error ? textoDoErro(valor, t) : valor,
      ])
    );
    return t(erro.chave, valores);
  }
  if (erro instanceof Error) return erro.message;
  return String(erro ?? '');
}

/** "registrar a vigência" → "registrarAVigencia" */
export const chaveDaFalha = (acao: string) =>
  acao
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((parte, i) => (i ? parte[0].toUpperCase() + parte.slice(1) : parte))
    .join('');

/**
 * "Falha ao <ação>: <detalhe do banco>". A ação é traduzida (erros.falhas.<chave>); o detalhe
 * vem do Postgres e vai como veio
 */
export const falhaDoBanco = (acao: string, erro: { message: string }) =>
  new ErroTraduzivel(
    `erros.falhas.${chaveDaFalha(acao)}`,
    { detalhe: erro.message },
    `Falha ao ${acao}: ${erro.message}`
  );
