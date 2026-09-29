/** Quantidade fixa de níveis de escalação exibidos no organograma. */
const TOTAL_NIVEIS_ESCALACAO = 4;

/**
 * Converte a posição do nó na árvore (0 = topo) no número do nível de escalação.
 * A numeração é fixa e crescente de baixo para cima: a base (Central Priorização)
 * é o 1º nível e o topo (Head/Diretor) é o 4º.
 */
export function calcularNivelEscalacao(posicaoNaArvore: number): number {
  return TOTAL_NIVEIS_ESCALACAO - posicaoNaArvore;
}
