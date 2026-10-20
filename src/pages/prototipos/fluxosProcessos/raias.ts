// Ajuste automático das raias: cada raia cresce para conter os elementos que estão nela.
import type { NoFluxo } from '../mocks/fluxosProcessos';
import { caixaDoNo, type Caixa } from './alinhamento';

export const MARGEM_RAIA = 40;

/**
 * Garante que cada raia contenha seus elementos: cresce para a esquerda, direita e para baixo,
 * empurrando as raias abaixo (e os elementos delas) quando uma raia aumenta de altura. Nunca encolhe.
 * Um elemento pertence à raia que contém seu centro vertical (ou à mais próxima, se estiver fora de todas).
 * `ignorar` recebe os elementos em arrasto, para a raia não perseguir o elemento enquanto ele é movido.
 */
export function ajustarRaias(nodes: NoFluxo[], ignorar: Set<string> = new Set()): NoFluxo[] {
  const raias = nodes
    .filter((n) => n.type === 'raia')
    .map(caixaDoNo)
    .sort((a, b) => a.y - b.y);
  if (!raias.length) return nodes;

  const elementos = nodes.filter((n) => n.type !== 'raia').map(caixaDoNo);
  const considerados = elementos.filter((c) => !ignorar.has(c.id));

  const raiaDe = (c: Caixa): string => {
    const cy = c.y + c.h / 2;
    const dentro = raias.find((r) => cy >= r.y && cy < r.y + r.h);
    if (dentro) return dentro.id;
    let melhor = raias[0];
    let menor = Infinity;
    raias.forEach((r) => {
      const d = cy < r.y ? r.y - cy : cy - (r.y + r.h);
      if (d < menor) {
        menor = d;
        melhor = r;
      }
    });
    return melhor.id;
  };

  const porRaia = new Map<string, Caixa[]>();
  elementos.forEach((c) => {
    const id = raiaDe(c);
    porRaia.set(id, [...(porRaia.get(id) ?? []), c]);
  });

  // Largura e x são compartilhados por todas as raias (ficam empilhadas e alinhadas).
  const minX = Math.min(...raias.map((r) => r.x), ...considerados.map((c) => c.x - MARGEM_RAIA));
  const maxX = Math.max(
    ...raias.map((r) => r.x + r.w),
    ...considerados.map((c) => c.x + c.w + MARGEM_RAIA)
  );

  const deslocamento = new Map<string, number>();
  const novaCaixa = new Map<string, Caixa>();
  let delta = 0;
  raias.forEach((r) => {
    const filhos = porRaia.get(r.id) ?? [];
    filhos.forEach((c) => deslocamento.set(c.id, delta));
    const fundo = Math.max(
      r.y + r.h,
      ...filhos.filter((c) => !ignorar.has(c.id)).map((c) => c.y + c.h + MARGEM_RAIA)
    );
    const h = fundo - r.y;
    novaCaixa.set(r.id, { id: r.id, x: minX, y: r.y + delta, w: maxX - minX, h });
    delta += h - r.h;
  });

  let mudou = false;
  const resultado = nodes.map((n) => {
    if (n.type === 'raia') {
      const nova = novaCaixa.get(n.id)!;
      const atual = caixaDoNo(n);
      if (nova.x === atual.x && nova.y === atual.y && nova.w === atual.w && nova.h === atual.h)
        return n;
      mudou = true;
      return {
        ...n,
        position: { x: nova.x, y: nova.y },
        width: nova.w,
        height: nova.h,
        measured: { width: nova.w, height: nova.h },
      };
    }
    const dy = deslocamento.get(n.id) ?? 0;
    if (!dy || ignorar.has(n.id)) return n;
    mudou = true;
    return { ...n, position: { x: n.position.x, y: n.position.y + dy } };
  });

  return mudou ? resultado : nodes;
}
