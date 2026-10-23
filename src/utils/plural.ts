/**
 * Contagem com singular só para 1 ("1 módulo", "0 módulos", "3 módulos"), como nos
 * protótipos. O plural do i18next segue o Unicode, em que o zero é singular em português.
 * A chave tem os filhos "um" e "varios", com {{n}} e os outros valores passados.
 */
export const plural = (
  t: (chave: string, valores?: Record<string, unknown>) => string,
  chave: string,
  n: number,
  valores?: Record<string, unknown>
) => t(`${chave}.${n === 1 ? 'um' : 'varios'}`, { n, ...valores });
