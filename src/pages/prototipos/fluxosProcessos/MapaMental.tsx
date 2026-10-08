// Mapa mental do processo: layout automático em duas direções, edição inline e adição de tópicos.
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { LayoutGrid, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CargoProcesso, FluxoProcesso, Processo } from '../mocks/fluxosProcessos';
import { cargosComPapel, nomeCargo, ordenarEtapas } from './utils';

export interface NoMapa {
  id: string;
  rotulo: string;
  filhos: NoMapa[];
}

type Lado = 'centro' | 'direita' | 'esquerda';
type NoMapaFlow = Node<{ rotulo: string; nivel: number; lado: Lado; cor: string }>;

const CORES_RAMO = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#0891b2'];
const LARGURA = (nivel: number) => (nivel === 0 ? 240 : nivel === 1 ? 180 : 220);
const DISTANCIA = (nivel: number) => (nivel === 1 ? 200 : 440 + (nivel - 2) * 280);
const GAP = 12;

const novoId = () => `m-${crypto.randomUUID().slice(0, 8)}`;
const folha = (rotulo: string): NoMapa => ({ id: novoId(), rotulo, filhos: [] });
const ramo = (rotulo: string, itens: string[]): NoMapa => ({
  id: novoId(),
  rotulo,
  filhos: itens.map(folha),
});

export function gerarMapaMental(
  processo: Processo,
  fluxo: FluxoProcesso | undefined,
  cargos: CargoProcesso[]
): NoMapa {
  const etapas = fluxo
    ? ordenarEtapas(fluxo.nodes, fluxo.edges).filter((n) => n.type === 'tarefa')
    : [];
  const contagem = new Map<string, number>();
  etapas.forEach((e) =>
    cargosComPapel(e, 'R').forEach((c) => contagem.set(c, (contagem.get(c) ?? 0) + 1))
  );
  const sistemas = [...new Set(etapas.flatMap((e) => e.data.doc?.sistemas ?? []))];

  return {
    id: 'raiz',
    rotulo: `${processo.codigo} ${processo.nome}`,
    filhos: [
      ramo('Objetivo', processo.objetivo ? [processo.objetivo] : []),
      ramo(
        'Etapas',
        etapas.map((e) => e.data.rotulo)
      ),
      ramo(
        'Responsáveis',
        [...contagem].map(([c, n]) => `${nomeCargo(cargos, c)} (${n} etapa${n > 1 ? 's' : ''})`)
      ),
      ramo('Sistemas', sistemas),
      ramo('Regras de negócio', processo.regras),
      ramo('Indicadores', processo.indicadores),
    ],
  };
}

function alturaNo(no: NoMapa, nivel: number) {
  if (nivel === 0) return 56;
  const linhas = Math.max(1, Math.ceil((no.rotulo.length * 7) / (LARGURA(nivel) - 24)));
  return linhas * 18 + 16;
}

function calcularLayout(raiz: NoMapa): { nodes: NoMapaFlow[]; edges: Edge[] } {
  const nodes: NoMapaFlow[] = [];
  const edges: Edge[] = [];
  const cache = new Map<string, number>();

  const alturaSub = (no: NoMapa, nivel: number): number => {
    if (!cache.has(no.id)) {
      const filhos =
        no.filhos.reduce((s, f) => s + alturaSub(f, nivel + 1), 0) +
        GAP * Math.max(0, no.filhos.length - 1);
      cache.set(no.id, Math.max(alturaNo(no, nivel), filhos));
    }
    return cache.get(no.id)!;
  };

  const posicionar = (
    no: NoMapa,
    nivel: number,
    lado: 'direita' | 'esquerda',
    topo: number,
    cor: string,
    paiId: string
  ) => {
    const centro = topo + alturaSub(no, nivel) / 2;
    const x = lado === 'direita' ? DISTANCIA(nivel) : -DISTANCIA(nivel) - LARGURA(nivel);
    nodes.push({
      id: no.id,
      type: 'mapa',
      position: { x, y: centro - alturaNo(no, nivel) / 2 },
      data: { rotulo: no.rotulo, nivel, lado, cor },
    });
    edges.push({
      id: `${paiId}-${no.id}`,
      source: paiId,
      sourceHandle: lado,
      target: no.id,
      targetHandle: lado === 'direita' ? 'alvo-esquerda' : 'alvo-direita',
      style: { stroke: cor, strokeWidth: nivel === 1 ? 3 : 2 },
    });
    let y =
      centro -
      (no.filhos.reduce((s, f) => s + alturaSub(f, nivel + 1), 0) +
        GAP * Math.max(0, no.filhos.length - 1)) /
        2;
    no.filhos.forEach((f) => {
      posicionar(f, nivel + 1, lado, y, cor, no.id);
      y += alturaSub(f, nivel + 1) + GAP;
    });
  };

  nodes.push({
    id: raiz.id,
    type: 'mapa',
    position: { x: -LARGURA(0) / 2, y: -28 },
    deletable: false,
    data: { rotulo: raiz.rotulo, nivel: 0, lado: 'centro', cor: '#2563eb' },
  });

  const metade = Math.ceil(raiz.filhos.length / 2);
  (
    [
      ['direita', raiz.filhos.slice(0, metade), 0],
      ['esquerda', raiz.filhos.slice(metade), metade],
    ] as const
  ).forEach(([lado, filhos, deslocamento]) => {
    let y =
      -(filhos.reduce((s, f) => s + alturaSub(f, 1), 0) + GAP * Math.max(0, filhos.length - 1)) / 2;
    filhos.forEach((f, i) => {
      posicionar(f, 1, lado, y, CORES_RAMO[(i + deslocamento) % CORES_RAMO.length], raiz.id);
      y += alturaSub(f, 1) + GAP;
    });
  });

  return { nodes, edges };
}

function mapear(no: NoMapa, fn: (n: NoMapa) => NoMapa): NoMapa {
  const atual = fn(no);
  return { ...atual, filhos: atual.filhos.map((f) => mapear(f, fn)) };
}

function remover(no: NoMapa, ids: Set<string>): NoMapa {
  return { ...no, filhos: no.filhos.filter((f) => !ids.has(f.id)).map((f) => remover(f, ids)) };
}

interface ContextoMapaValor {
  somenteLeitura: boolean;
  editandoId: string | null;
  setEditandoId: (id: string | null) => void;
  adicionarFilho: (id: string) => void;
  renomear: (id: string, rotulo: string) => void;
}

const ContextoMapa = createContext<ContextoMapaValor>(null);

const ALCA = '!h-1 !w-1 !min-w-0 !border-0 !bg-transparent';

function NoMapaMental({ id, data, selected }: NodeProps<NoMapaFlow>) {
  const ctx = useContext(ContextoMapa);
  const [texto, setTexto] = useState(data.rotulo);
  const editando = ctx.editandoId === id;
  const { nivel, lado, cor } = data;

  useEffect(() => setTexto(data.rotulo), [data.rotulo]);

  const concluir = () => {
    ctx.renomear(id, texto.trim() || data.rotulo);
    ctx.setEditandoId(null);
  };

  return (
    <div
      className={cn(
        'group relative',
        nivel === 0 &&
          'rounded-xl bg-sonda-blue px-5 py-3 text-center text-base font-semibold text-white shadow-md',
        nivel === 1 &&
          'rounded-lg border-2 bg-white px-3 py-2 text-sm font-semibold shadow-sm dark:bg-gray-900',
        nivel >= 2 &&
          'rounded-md border border-l-4 border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 shadow-sm dark:bg-gray-900 dark:text-gray-200',
        selected && 'ring-2 ring-sonda-blue ring-offset-2'
      )}
      style={{
        width: LARGURA(nivel),
        ...(nivel === 1 && { borderColor: cor, color: cor }),
        ...(nivel >= 2 && { borderLeftColor: cor }),
      }}
      onDoubleClick={() => !ctx.somenteLeitura && ctx.setEditandoId(id)}
    >
      {editando ? (
        <textarea
          autoFocus
          value={texto}
          rows={2}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={concluir}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              concluir();
            }
            if (e.key === 'Escape') ctx.setEditandoId(null);
          }}
          className="nodrag w-full resize-none rounded border border-sonda-blue bg-white p-1 text-xs text-gray-900 outline-none"
        />
      ) : (
        <span className="leading-snug">{data.rotulo}</span>
      )}

      {!ctx.somenteLeitura && !editando && (
        <button
          type="button"
          title="Adicionar tópico"
          onClick={() => ctx.adicionarFilho(id)}
          className={cn(
            'nodrag absolute flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-white text-sonda-blue opacity-0 shadow-sm transition-opacity hover:bg-blue-50 group-hover:opacity-100',
            lado === 'esquerda'
              ? '-left-7 top-1/2 -translate-y-1/2'
              : lado === 'direita'
                ? '-right-7 top-1/2 -translate-y-1/2'
                : '-bottom-7 left-1/2 -translate-x-1/2'
          )}
        >
          <Plus className="h-3 w-3" />
        </button>
      )}

      <Handle
        id="direita"
        type="source"
        position={Position.Right}
        className={ALCA}
        isConnectable={false}
      />
      <Handle
        id="esquerda"
        type="source"
        position={Position.Left}
        className={ALCA}
        isConnectable={false}
      />
      <Handle
        id="alvo-esquerda"
        type="target"
        position={Position.Left}
        className={ALCA}
        isConnectable={false}
      />
      <Handle
        id="alvo-direita"
        type="target"
        position={Position.Right}
        className={ALCA}
        isConnectable={false}
      />
    </div>
  );
}

const TIPOS = { mapa: NoMapaMental };

interface MapaMentalProps {
  arvore: NoMapa;
  somenteLeitura: boolean;
  onChange: (arvore: NoMapa) => void;
  onRegerar: () => void;
}

function Canvas({ arvore, somenteLeitura, onChange, onRegerar }: MapaMentalProps) {
  const { fitView } = useReactFlow();
  const layout = useMemo(() => calcularLayout(arvore), [arvore]);
  const [nodes, setNodes] = useState<NoMapaFlow[]>(layout.nodes);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // Reaplica o layout automático a cada mudança de estrutura (como XMind/Miro).
  useEffect(() => setNodes(layout.nodes), [layout]);

  const ctx: ContextoMapaValor = {
    somenteLeitura,
    editandoId,
    setEditandoId,
    adicionarFilho: (paiId) => {
      const novo = folha('Novo tópico');
      onChange(mapear(arvore, (n) => (n.id === paiId ? { ...n, filhos: [...n.filhos, novo] } : n)));
      setEditandoId(novo.id);
    },
    renomear: (id, rotulo) => onChange(mapear(arvore, (n) => (n.id === id ? { ...n, rotulo } : n))),
  };

  return (
    <ContextoMapa.Provider value={ctx}>
      <ReactFlow
        nodes={nodes}
        edges={layout.edges}
        nodeTypes={TIPOS}
        onNodesChange={(mudancas) =>
          setNodes((ns) => applyNodeChanges(mudancas, ns) as NoMapaFlow[])
        }
        onNodesDelete={(removidos) =>
          onChange(remover(arvore, new Set(removidos.map((n) => n.id))))
        }
        nodesDraggable={!somenteLeitura}
        nodesConnectable={false}
        deleteKeyCode={somenteLeitura ? null : ['Backspace', 'Delete']}
        zoomOnDoubleClick={false}
        minZoom={0.2}
        fitView
        fitViewOptions={{ padding: 0.1 }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#d1d5db" />
        <Controls showInteractive={false} position="bottom-left" />
        <Panel position="top-right" className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-white"
            onClick={() => {
              setNodes(layout.nodes);
              window.setTimeout(() => fitView({ padding: 0.1, duration: 200 }), 50);
            }}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Reorganizar
          </Button>
          {!somenteLeitura && (
            <Button variant="outline" size="sm" className="bg-white" onClick={onRegerar}>
              <Sparkles className="h-4 w-4 mr-2" />
              Gerar a partir do fluxo
            </Button>
          )}
        </Panel>
        {!somenteLeitura && (
          <Panel position="bottom-center">
            <p className="rounded-md bg-white/90 px-3 py-1 text-xs text-gray-500 shadow-sm">
              Duplo clique para editar · “+” para adicionar tópico · Delete para remover
            </p>
          </Panel>
        )}
      </ReactFlow>
    </ContextoMapa.Provider>
  );
}

export function MapaMental(props: MapaMentalProps) {
  return (
    <div className="h-[680px] overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <ReactFlowProvider>
        <Canvas {...props} />
      </ReactFlowProvider>
    </div>
  );
}
