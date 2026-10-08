// Alinhamento, distribuição e guias inteligentes do canvas (estilo Figma). Funções puras sobre os nós.
import type { NoFluxo, TipoNo } from '../mocks/fluxosProcessos';

export type ModoAlinhamento = 'esquerda' | 'centroH' | 'direita' | 'topo' | 'centroV' | 'base';
export type EixoDistribuicao = 'horizontal' | 'vertical';

export interface Caixa {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Guia {
  eixo: 'x' | 'y';
  posicao: number;
  inicio: number;
  fim: number;
}

export const LIMIAR_GUIA = 6;

// Tamanho de referência enquanto o nó ainda não foi medido pelo React Flow.
const TAMANHO_PADRAO: Partial<Record<TipoNo, { w: number; h: number }>> = {
  tarefa: { w: 160, h: 72 },
  decisao: { w: 56, h: 56 },
  paralelo: { w: 56, h: 56 },
  raia: { w: 1000, h: 200 },
};

export function caixaDoNo(no: NoFluxo): Caixa {
  const padrao = TAMANHO_PADRAO[no.type as TipoNo] ?? { w: 48, h: 48 };
  return {
    id: no.id,
    x: no.position.x,
    y: no.position.y,
    w: no.measured?.width ?? no.width ?? padrao.w,
    h: no.measured?.height ?? no.height ?? padrao.h,
  };
}

/** Nós que participam de alinhamento: selecionados e que não são raia. */
export function nosAlinhaveis(nodes: NoFluxo[]): NoFluxo[] {
  return nodes.filter((n) => n.selected && n.type !== 'raia');
}

export function alinharNos(nodes: NoFluxo[], modo: ModoAlinhamento): NoFluxo[] {
  const alvo = nosAlinhaveis(nodes);
  if (alvo.length < 2) return nodes;
  const caixas = alvo.map(caixaDoNo);

  const minX = Math.min(...caixas.map((c) => c.x));
  const maxX = Math.max(...caixas.map((c) => c.x + c.w));
  const minY = Math.min(...caixas.map((c) => c.y));
  const maxY = Math.max(...caixas.map((c) => c.y + c.h));
  const centroX = (minX + maxX) / 2;
  const centroY = (minY + maxY) / 2;

  const novaPosicao = (c: Caixa) => {
    switch (modo) {
      case 'esquerda':
        return { x: minX, y: c.y };
      case 'centroH':
        return { x: centroX - c.w / 2, y: c.y };
      case 'direita':
        return { x: maxX - c.w, y: c.y };
      case 'topo':
        return { x: c.x, y: minY };
      case 'centroV':
        return { x: c.x, y: centroY - c.h / 2 };
      case 'base':
        return { x: c.x, y: maxY - c.h };
    }
  };

  const posicoes = new Map(caixas.map((c) => [c.id, novaPosicao(c)]));
  return nodes.map((n) => (posicoes.has(n.id) ? { ...n, position: posicoes.get(n.id)! } : n));
}

/** Distribui os nós selecionados com espaçamento igual entre eles, mantendo o primeiro e o último no lugar. */
export function distribuirNos(nodes: NoFluxo[], eixo: EixoDistribuicao): NoFluxo[] {
  const alvo = nosAlinhaveis(nodes);
  if (alvo.length < 3) return nodes;

  const pos = eixo === 'horizontal' ? 'x' : 'y';
  const dim = eixo === 'horizontal' ? 'w' : 'h';
  const caixas = alvo.map(caixaDoNo).sort((a, b) => a[pos] - b[pos]);

  const primeira = caixas[0];
  const ultima = caixas[caixas.length - 1];
  const ocupado = caixas.reduce((s, c) => s + c[dim], 0);
  const espaco = (ultima[pos] + ultima[dim] - primeira[pos] - ocupado) / (caixas.length - 1);

  const posicoes = new Map<string, number>();
  let cursor = primeira[pos];
  caixas.forEach((c) => {
    posicoes.set(c.id, cursor);
    cursor += c[dim] + espaco;
  });

  return nodes.map((n) =>
    posicoes.has(n.id) ? { ...n, position: { ...n.position, [pos]: posicoes.get(n.id)! } } : n
  );
}

/**
 * Compara a caixa arrastada com as demais e devolve a posição encaixada (quando dentro do limiar)
 * e as linhas-guia a desenhar.
 */
export function calcularGuias(
  arrastada: Caixa,
  outras: Caixa[],
  limiar = LIMIAR_GUIA
): { x: number; y: number; guias: Guia[] } {
  const guias: Guia[] = [];
  let x = arrastada.x;
  let y = arrastada.y;
  let melhorX = limiar + 1;
  let melhorY = limiar + 1;

  const candidatosX = (c: Caixa) => [c.x, c.x + c.w / 2, c.x + c.w];
  const candidatosY = (c: Caixa) => [c.y, c.y + c.h / 2, c.y + c.h];

  // 1) Encaixe: o par borda/centro mais próximo em cada eixo define a posição final.
  outras.forEach((outra) => {
    candidatosX(arrastada).forEach((ax) => {
      candidatosX(outra).forEach((ox) => {
        const dist = Math.abs(ax - ox);
        if (dist <= limiar && dist < melhorX) {
          melhorX = dist;
          x = arrastada.x + (ox - ax);
        }
      });
    });
    candidatosY(arrastada).forEach((ay) => {
      candidatosY(outra).forEach((oy) => {
        const dist = Math.abs(ay - oy);
        if (dist <= limiar && dist < melhorY) {
          melhorY = dist;
          y = arrastada.y + (oy - ay);
        }
      });
    });
  });

  // 2) Guias: já encaixada, cada borda/centro que coincide com outros elementos vira uma linha
  //    que atravessa todos eles (como no Figma), podendo haver várias por eixo.
  const encaixada: Caixa = { ...arrastada, x, y };
  const coincide = (a: number, b: number) => Math.abs(a - b) < 0.5;

  candidatosX(encaixada).forEach((ax) => {
    const alinhadas = outras.filter((o) => candidatosX(o).some((ox) => coincide(ax, ox)));
    if (!alinhadas.length || guias.some((g) => g.eixo === 'x' && coincide(g.posicao, ax))) return;
    const todas = [encaixada, ...alinhadas];
    guias.push({
      eixo: 'x',
      posicao: ax,
      inicio: Math.min(...todas.map((c) => c.y)) - 20,
      fim: Math.max(...todas.map((c) => c.y + c.h)) + 20,
    });
  });

  candidatosY(encaixada).forEach((ay) => {
    const alinhadas = outras.filter((o) => candidatosY(o).some((oy) => coincide(ay, oy)));
    if (!alinhadas.length || guias.some((g) => g.eixo === 'y' && coincide(g.posicao, ay))) return;
    const todas = [encaixada, ...alinhadas];
    guias.push({
      eixo: 'y',
      posicao: ay,
      inicio: Math.min(...todas.map((c) => c.x)) - 20,
      fim: Math.max(...todas.map((c) => c.x + c.w)) + 20,
    });
  });

  return { x, y, guias };
}
