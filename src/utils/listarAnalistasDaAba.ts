import type { InconsistenciaChamado } from '@/types/inconsistenciasChamados';

/**
 * Analistas para o filtro, apenas dos itens da aba ativa (sem repetição, ordem alfabética).
 * O analista já selecionado é mantido na lista para o Select não ficar em branco ao trocar de aba.
 */
export function listarAnalistasDaAba(itens: InconsistenciaChamado[], analistaSelecionado?: string): string[] {
  const analistas = new Set(
    itens.map(inc => inc.analista).filter(a => a && a.trim() !== '') as string[]
  );
  if (analistaSelecionado) analistas.add(analistaSelecionado);
  return Array.from(analistas).sort();
}
