// Histórico de desfazer/refazer do editor de fluxo (Ctrl+Z / Ctrl+Y), com agrupamento de edições contínuas.
import { useCallback, useRef, useState } from 'react';
import type { FluxoProcesso } from '../mocks/fluxosProcessos';

const LIMITE = 100;
// Edições seguidas com a mesma chave (ex.: digitação num campo) dentro desta janela viram um único passo.
const JANELA_AGRUPAMENTO_MS = 800;

export function useHistorico(
  fluxo: FluxoProcesso,
  onFluxoChange: (atualizar: (fluxo: FluxoProcesso) => FluxoProcesso) => void
) {
  const atual = useRef(fluxo);
  atual.current = fluxo;

  const passado = useRef<FluxoProcesso[]>([]);
  const futuro = useRef<FluxoProcesso[]>([]);
  const ultimo = useRef<{ chave?: string; em: number }>({ em: 0 });
  const [, setVersao] = useState(0);
  const notificar = () => setVersao((v) => v + 1);

  /** Guarda o estado atual como ponto de retorno antes de uma mudança. */
  const registrar = useCallback((chave?: string) => {
    const agora = Date.now();
    const agrupar =
      chave !== undefined &&
      ultimo.current.chave === chave &&
      agora - ultimo.current.em < JANELA_AGRUPAMENTO_MS;
    ultimo.current = { chave, em: agora };
    futuro.current = [];
    // Mesmo snapshot já no topo (ex.: remoção de nó + arestas no mesmo tick) não vira passo duplicado.
    if (agrupar || passado.current[passado.current.length - 1] === atual.current) return;

    passado.current = [...passado.current.slice(-(LIMITE - 1)), atual.current];
    notificar();
  }, []);

  const desfazer = useCallback(() => {
    const anterior = passado.current.pop();
    if (!anterior) return;
    futuro.current.push(atual.current);
    ultimo.current = { em: 0 };
    onFluxoChange(() => anterior);
    notificar();
  }, [onFluxoChange]);

  const refazer = useCallback(() => {
    const proximo = futuro.current.pop();
    if (!proximo) return;
    passado.current.push(atual.current);
    ultimo.current = { em: 0 };
    onFluxoChange(() => proximo);
    notificar();
  }, [onFluxoChange]);

  return {
    registrar,
    desfazer,
    refazer,
    podeDesfazer: passado.current.length > 0,
    podeRefazer: futuro.current.length > 0,
  };
}
