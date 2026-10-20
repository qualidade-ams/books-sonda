// Canvas do fluxo (estilo Figma): barra inferior com elementos arrastáveis, conexões, zoom/pan, minimapa e painel de documentação.
import { useEffect, useRef, useState, type CSSProperties, type DragEvent } from 'react';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useReactFlow,
  ViewportPortal,
  type Node,
  type NodeChange,
  type NodePositionChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  ArrowRightCircle,
  ChevronDown,
  Diamond,
  Hand,
  Lock,
  Map,
  Maximize2,
  Minimize2,
  MousePointer2,
  PanelLeft,
  PanelRightClose,
  PanelRightOpen,
  PlayCircle,
  Plus,
  Redo2,
  Square,
  StopCircle,
  Undo2,
  Workflow,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  conexao,
  docVazia,
  ESTILO_ARESTA,
  raia,
  type CargoProcesso,
  type DadosNo,
  type DocumentacaoEtapa,
  type FluxoProcesso,
  type NoFluxo,
  type Processo,
  type TipoNo,
} from '../mocks/fluxosProcessos';
import {
  alinharNos,
  caixaDoNo,
  calcularGuias,
  distribuirNos,
  nosAlinhaveis,
  type EixoDistribuicao,
  type Guia,
  type ModoAlinhamento,
} from './alinhamento';
import { ContextoCriarProximo, ContextoSomenteLeitura, TIPOS_NO } from './NosBpmn';
import { PainelPropriedades } from './PainelPropriedades';
import { ajustarRaias } from './raias';
import { useHistorico } from './useHistorico';

const comRaias = (f: FluxoProcesso): FluxoProcesso => ({ ...f, nodes: ajustarRaias(f.nodes) });
import { DISTANCIA_PROXIMO, TAMANHO_TAREFA } from './utils';

const LADO_OPOSTO: Record<Position, Position> = {
  [Position.Left]: Position.Right,
  [Position.Right]: Position.Left,
  [Position.Top]: Position.Bottom,
  [Position.Bottom]: Position.Top,
};

function BotaoFerramenta({
  rotulo,
  icone: Icone,
  ativo,
  disabled,
  onClick,
}: {
  rotulo: string;
  icone: typeof Square;
  ativo?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={rotulo}
      aria-label={rotulo}
      aria-pressed={ativo}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        ativo
          ? 'bg-sonda-blue text-white'
          : 'text-gray-600 hover:bg-blue-50 hover:text-sonda-blue disabled:hover:bg-transparent disabled:hover:text-gray-600 dark:text-gray-300'
      )}
    >
      <Icone className="h-4 w-4" />
    </button>
  );
}

const BOTOES_ALINHAR: { modo: ModoAlinhamento; rotulo: string; icone: typeof Square }[] = [
  { modo: 'esquerda', rotulo: 'Alinhar à esquerda', icone: AlignStartVertical },
  { modo: 'centroH', rotulo: 'Centralizar na horizontal', icone: AlignCenterVertical },
  { modo: 'direita', rotulo: 'Alinhar à direita', icone: AlignEndVertical },
  { modo: 'topo', rotulo: 'Alinhar ao topo', icone: AlignStartHorizontal },
  { modo: 'centroV', rotulo: 'Centralizar na vertical', icone: AlignCenterHorizontal },
  { modo: 'base', rotulo: 'Alinhar à base', icone: AlignEndHorizontal },
];

const BOTOES_DISTRIBUIR: { eixo: EixoDistribuicao; rotulo: string; icone: typeof Square }[] = [
  {
    eixo: 'horizontal',
    rotulo: 'Distribuir na horizontal',
    icone: AlignHorizontalDistributeCenter,
  },
  { eixo: 'vertical', rotulo: 'Distribuir na vertical', icone: AlignVerticalDistributeCenter },
];

function BotaoAlinhamento({
  rotulo,
  icone: Icone,
  disabled,
  onClick,
}: {
  rotulo: string;
  icone: typeof Square;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={rotulo}
      aria-label={rotulo}
      disabled={disabled}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-blue-50 hover:text-sonda-blue disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-600 dark:text-gray-300"
    >
      <Icone className="h-4 w-4" />
    </button>
  );
}

/** Elemento da barra inferior: clique adiciona (ou troca o tipo do selecionado), arrastar solta no canvas. */
function BotaoElemento({
  tipo,
  rotulo,
  icone: Icone,
  trocando,
  ativo,
  onClick,
}: {
  tipo: TipoNo;
  rotulo: string;
  icone: typeof Square;
  trocando: boolean;
  ativo: boolean;
  onClick: () => void;
}) {
  const dica = trocando
    ? `${rotulo} — clique troca o tipo do selecionado; arraste para adicionar`
    : `${rotulo} — clique ou arraste para adicionar`;
  return (
    <button
      type="button"
      title={dica}
      aria-label={dica}
      aria-pressed={trocando ? ativo : undefined}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/fluxo-tipo', tipo);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={onClick}
      className={cn(
        'flex h-8 w-8 cursor-grab items-center justify-center rounded-md transition-colors hover:bg-blue-50 hover:text-sonda-blue active:cursor-grabbing',
        ativo ? 'bg-blue-50 text-sonda-blue' : 'text-gray-600 dark:text-gray-300'
      )}
    >
      <Icone className="h-4 w-4" />
    </button>
  );
}

const PALETA: { tipo: TipoNo; rotulo: string; icone: typeof Square }[] = [
  { tipo: 'tarefa', rotulo: 'Tarefa', icone: Square },
  { tipo: 'decisao', rotulo: 'Decisão', icone: Diamond },
  { tipo: 'paralelo', rotulo: 'Paralelo', icone: Plus },
  { tipo: 'inicio', rotulo: 'Início', icone: PlayCircle },
  { tipo: 'fim', rotulo: 'Fim', icone: StopCircle },
  { tipo: 'link', rotulo: 'Link', icone: ArrowRightCircle },
  { tipo: 'raia', rotulo: 'Raia', icone: PanelLeft },
];

const ROTULO_PADRAO: Partial<Record<TipoNo, string>> = {
  tarefa: 'Nova tarefa',
  decisao: 'Nova decisão?',
  paralelo: '',
  inicio: 'Início',
  fim: 'Fim',
  link: 'Processo vinculado',
};

const TAMANHO: Partial<Record<TipoNo, { w: number; h: number }>> = {
  tarefa: { w: 160, h: 72 },
  decisao: { w: 56, h: 56 },
  paralelo: { w: 56, h: 56 },
};

const COR_MINIMAPA: Record<string, string> = {
  raia: '#eff6ff',
  tarefa: '#2563eb',
  decisao: '#f59e0b',
  paralelo: '#f59e0b',
  inicio: '#10b981',
  fim: '#ef4444',
  link: '#60a5fa',
};

const VARIAVEIS_ARESTA = {
  '--xy-edge-stroke': '#6b7280',
  '--xy-edge-stroke-selected': '#2563eb',
  '--xy-edge-stroke-width': '1.5',
} as CSSProperties;

interface EditorFluxoProps {
  processo: Processo;
  processos: Processo[];
  cargos: CargoProcesso[];
  fluxo: FluxoProcesso;
  somenteLeitura: boolean;
  onFluxoChange: (atualizar: (fluxo: FluxoProcesso) => FluxoProcesso) => void;
  onAlterarProcesso: (campos: Partial<Processo>) => void;
  onAbrirProcesso: (id: string) => void;
}

function Canvas({
  processo,
  processos,
  cargos,
  fluxo,
  somenteLeitura,
  onFluxoChange,
  onAlterarProcesso,
  onAbrirProcesso,
}: EditorFluxoProps) {
  const { screenToFlowPosition, fitView } = useReactFlow();
  const areaRef = useRef<HTMLDivElement>(null);
  const [telaCheia, setTelaCheia] = useState(false);
  const [guias, setGuias] = useState<Guia[]>([]);
  // Seta = clique/arrasto seleciona (Espaço segurado move o canvas); Mão = arrasto move o canvas.
  const [modo, setModo] = useState<'seta' | 'mao'>('seta');
  const [minimapaAberto, setMinimapaAberto] = useState(true);
  // Painel de propriedades fechado por padrão: abre pelo botão ou com duplo clique num elemento.
  const [painelAberto, setPainelAberto] = useState(false);
  const emRedimensionamento = useRef(false);
  const { registrar, desfazer, refazer, podeDesfazer, podeRefazer } = useHistorico(
    fluxo,
    onFluxoChange
  );

  /** Mudança que entra no histórico. `chave` agrupa edições contínuas (digitação) num só passo. */
  const mudar = (atualizar: (f: FluxoProcesso) => FluxoProcesso, chave?: string) => {
    registrar(chave);
    onFluxoChange((f) => comRaias(atualizar(f)));
  };

  useEffect(() => {
    if (somenteLeitura) return;
    const atalhos = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (
        alvo &&
        (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.isContentEditable)
      )
        return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) refazer();
        else desfazer();
      } else if (ctrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        refazer();
      } else if (!ctrl && !e.altKey && e.key.toLowerCase() === 'v') {
        setModo('seta');
      } else if (!ctrl && !e.altKey && e.key.toLowerCase() === 'h') {
        setModo('mao');
      }
    };
    window.addEventListener('keydown', atalhos);
    return () => window.removeEventListener('keydown', atalhos);
  }, [somenteLeitura, desfazer, refazer]);

  const todosSelecionados = fluxo.nodes.filter((n) => n.selected);
  const selecionados = nosAlinhaveis(fluxo.nodes);
  const noSelecionado = todosSelecionados.length === 1 ? todosSelecionados[0] : undefined;
  const arestaSelecionada =
    todosSelecionados.length === 0 ? fluxo.edges.find((e) => e.selected) : undefined;

  // Guias inteligentes: ao arrastar um único nó, encaixa nas bordas/centros dos demais (como no Figma).
  const aplicarGuias = (mudancas: NodeChange<NoFluxo>[], nodes: NoFluxo[]) => {
    const arrastando = mudancas.filter(
      (m): m is NodePositionChange => m.type === 'position' && !!m.dragging && !!m.position
    );
    if (arrastando.length !== 1) {
      if (guias.length) setGuias([]);
      return mudancas;
    }
    const mudanca = arrastando[0];
    const no = nodes.find((n) => n.id === mudanca.id);
    if (!no || no.type === 'raia') return mudancas;

    const arrastada = { ...caixaDoNo(no), x: mudanca.position!.x, y: mudanca.position!.y };
    const outras = nodes.filter((n) => n.id !== no.id && n.type !== 'raia').map(caixaDoNo);
    const resultado = calcularGuias(arrastada, outras);
    setGuias(resultado.guias);
    return mudancas.map((m) =>
      m === mudanca ? { ...m, position: { x: resultado.x, y: resultado.y } } : m
    );
  };

  useEffect(() => {
    const sair = (e: KeyboardEvent) => e.key === 'Escape' && setTelaCheia(false);
    window.addEventListener('keydown', sair);
    return () => window.removeEventListener('keydown', sair);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => fitView({ padding: 0.15, duration: 200 }), 50);
    return () => window.clearTimeout(id);
  }, [telaCheia, processo.id, fitView]);

  const criarNo = (tipo: TipoNo, centro: { x: number; y: number }): NoFluxo => {
    const id = `${tipo}-${crypto.randomUUID().slice(0, 8)}`;
    if (tipo === 'raia') {
      const raias = fluxo.nodes.filter((n) => n.type === 'raia');
      const base = raias.reduce((max, r) => Math.max(max, r.position.y + (r.height ?? 200)), 0);
      const largura = raias.reduce((max, r) => Math.max(max, r.width ?? 0), 1000);
      return raia(id, cargos[0].id, 0, raias.length ? base : centro.y, largura, 200);
    }
    const { w, h } = TAMANHO[tipo] ?? { w: 48, h: 48 };
    return {
      id,
      type: tipo,
      position: { x: centro.x - w / 2, y: centro.y - h / 2 },
      selected: true,
      data: {
        rotulo: ROTULO_PADRAO[tipo] ?? '',
        posicaoRotulo: w === 48 ? 'abaixo' : 'acima',
        doc: docVazia(),
      },
    };
  };

  const adicionar = (tipo: TipoNo, centro?: { x: number; y: number }) => {
    let posicao = centro;
    if (!posicao) {
      const r = areaRef.current!.getBoundingClientRect();
      posicao = screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    }
    const novo = criarNo(tipo, posicao);
    mudar((f) => ({
      ...f,
      nodes: [...f.nodes.map((n) => ({ ...n, selected: false })), novo],
      edges: f.edges.map((e) => ({ ...e, selected: false })),
    }));
  };

  // Troca o tipo dos elementos selecionados mantendo id, conexões, documentação e o centro no lugar.
  const trocarTipo = (tipo: TipoNo) => {
    if (tipo === 'raia') return;
    const { w, h } = TAMANHO[tipo] ?? { w: 48, h: 48 };
    mudar((f) => ({
      ...f,
      nodes: f.nodes.map((n) => {
        if (!n.selected || n.type === 'raia' || n.type === tipo) return n;
        const c = caixaDoNo(n);
        return {
          ...n,
          type: tipo,
          position: { x: c.x + c.w / 2 - w / 2, y: c.y + c.h / 2 - h / 2 },
          data: {
            ...n.data,
            rotulo: n.data.rotulo || ROTULO_PADRAO[tipo] || '',
            posicaoRotulo: w === 48 ? 'abaixo' : 'acima',
          },
        };
      }),
    }));
  };

  // Próximo passo pela alça: nova tarefa a DISTANCIA_PROXIMO do lado escolhido, já conectada.
  const criarProximo = (id: string, lado: Position) => {
    const origem = fluxo.nodes.find((n) => n.id === id);
    if (!origem) return;
    const c = caixaDoNo(origem);
    const { w, h } = TAMANHO_TAREFA;
    const centroOrigem = { x: c.x + c.w / 2, y: c.y + c.h / 2 };
    const centro =
      lado === Position.Right
        ? { x: c.x + c.w + DISTANCIA_PROXIMO + w / 2, y: centroOrigem.y }
        : lado === Position.Left
          ? { x: c.x - DISTANCIA_PROXIMO - w / 2, y: centroOrigem.y }
          : lado === Position.Bottom
            ? { x: centroOrigem.x, y: c.y + c.h + DISTANCIA_PROXIMO + h / 2 }
            : { x: centroOrigem.x, y: c.y - DISTANCIA_PROXIMO - h / 2 };

    const novo = criarNo('tarefa', centro);
    mudar((f) => ({
      nodes: [...f.nodes.map((n) => ({ ...n, selected: false })), novo],
      edges: [
        ...f.edges.map((e) => ({ ...e, selected: false })),
        conexao(id, lado, novo.id, LADO_OPOSTO[lado]),
      ],
    }));
  };

  const aoSoltar = (e: DragEvent) => {
    e.preventDefault();
    const tipo = e.dataTransfer.getData('application/fluxo-tipo') as TipoNo;
    if (tipo) adicionar(tipo, screenToFlowPosition({ x: e.clientX, y: e.clientY }));
  };

  const alterarNo = (id: string, dados: Partial<DadosNo>) =>
    mudar(
      (f) => ({
        ...f,
        nodes: f.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...dados } } : n)),
      }),
      `no:${id}:${Object.keys(dados).join(',')}`
    );

  const alterarDoc = (id: string, doc: Partial<DocumentacaoEtapa>) =>
    mudar(
      (f) => ({
        ...f,
        nodes: f.nodes.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, doc: { ...docVazia(), ...n.data.doc, ...doc } } }
            : n
        ),
      }),
      `doc:${id}:${Object.keys(doc).join(',')}`
    );

  const excluirSelecionado = () =>
    mudar((f) => {
      const removidos = new Set(f.nodes.filter((n) => n.selected).map((n) => n.id));
      return {
        nodes: f.nodes.filter((n) => !removidos.has(n.id)),
        edges: f.edges.filter(
          (e) => !e.selected && !removidos.has(e.source) && !removidos.has(e.target)
        ),
      };
    });

  const vazio = fluxo.nodes.length === 0;

  return (
    <ContextoSomenteLeitura.Provider value={somenteLeitura}>
      <ContextoCriarProximo.Provider value={somenteLeitura ? null : criarProximo}>
        <div
          className={cn(
            'flex overflow-hidden bg-white dark:bg-gray-900',
            telaCheia
              ? 'fixed inset-0 z-50'
              : 'h-[680px] rounded-lg border border-gray-200 dark:border-gray-700'
          )}
        >
          <div
            ref={areaRef}
            className="relative flex-1"
            onDragOver={(e) => e.preventDefault()}
            onDrop={aoSoltar}
          >
            <ReactFlow
              nodes={fluxo.nodes}
              edges={fluxo.edges}
              nodeTypes={TIPOS_NO}
              onNodesChange={(mudancas) => {
                const ajustadas = aplicarGuias(mudancas, fluxo.nodes);
                // Remoção e início de redimensionamento entram no histórico; seleção e arrasto contínuo, não
                // (o arrasto é registrado uma vez em onNodeDragStart).
                const redimensionando = mudancas.some(
                  (m) => m.type === 'dimensions' && m.resizing === true
                );
                if (redimensionando && !emRedimensionamento.current) registrar();
                emRedimensionamento.current = redimensionando;
                if (mudancas.some((m) => m.type === 'remove')) registrar();
                // Raias acompanham os elementos em tempo real, exceto o que está sendo arrastado
                // (senão a raia perseguiria o elemento e ele nunca entraria na raia de baixo).
                const arrastando = new Set(
                  mudancas
                    .filter((m): m is NodePositionChange => m.type === 'position' && !!m.dragging)
                    .map((m) => m.id)
                );
                const moveu = mudancas.some((m) => m.type === 'position');
                onFluxoChange((f) => {
                  const nodes = applyNodeChanges(ajustadas, f.nodes) as NoFluxo[];
                  return { ...f, nodes: moveu ? ajustarRaias(nodes, arrastando) : nodes };
                });
              }}
              onNodeDragStart={() => registrar()}
              onSelectionDragStart={() => registrar()}
              onNodeDoubleClick={() => setPainelAberto(true)}
              onEdgeDoubleClick={() => setPainelAberto(true)}
              onNodeDragStop={() => {
                setGuias([]);
                onFluxoChange(comRaias);
              }}
              onSelectionDragStop={() => onFluxoChange(comRaias)}
              onEdgesChange={(mudancas) => {
                if (mudancas.some((m) => m.type === 'remove')) registrar();
                onFluxoChange((f) => ({ ...f, edges: applyEdgeChanges(mudancas, f.edges) }));
              }}
              onConnect={(c) =>
                mudar((f) => ({ ...f, edges: addEdge({ ...c, ...ESTILO_ARESTA }, f.edges) }))
              }
              connectionMode={ConnectionMode.Loose}
              nodesDraggable={!somenteLeitura}
              nodesConnectable={!somenteLeitura}
              deleteKeyCode={somenteLeitura ? null : ['Backspace', 'Delete']}
              elevateNodesOnSelect={false}
              panOnDrag={modo === 'mao' ? true : [1, 2]}
              panActivationKeyCode="Space"
              selectionOnDrag={modo === 'seta'}
              selectionMode={SelectionMode.Partial}
              className="[&_.react-flow__node.draggable]:cursor-default [&_.react-flow__node.dragging]:cursor-grabbing [&_.react-flow__pane.selection]:cursor-default"
              snapToGrid
              snapGrid={[10, 10]}
              minZoom={0.2}
              fitView
              fitViewOptions={{ padding: 0.15 }}
              style={VARIAVEIS_ARESTA}
            >
              <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#d1d5db" />
              <Controls showInteractive={false} position="bottom-left" />
              {minimapaAberto ? (
                <>
                  <MiniMap
                    pannable
                    zoomable
                    position="bottom-right"
                    style={{ width: 200, height: 150 }}
                    nodeColor={(n: Node) => COR_MINIMAPA[n.type ?? ''] ?? '#9ca3af'}
                    className="!rounded-lg !border !border-gray-200"
                  />
                  {/* Botão no canto superior direito do minimapa (200×150, margem 15px do painel). */}
                  <Panel position="bottom-right" className="!z-[6] !mb-[137px] !mr-[19px]">
                    <button
                      type="button"
                      onClick={() => setMinimapaAberto(false)}
                      title="Minimizar minimapa"
                      aria-label="Minimizar minimapa"
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-blue-50 hover:text-sonda-blue"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </Panel>
                </>
              ) : (
                <Panel position="bottom-right">
                  <button
                    type="button"
                    onClick={() => setMinimapaAberto(true)}
                    title="Mostrar minimapa"
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium text-gray-600 shadow-sm hover:bg-blue-50 hover:text-sonda-blue dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    <Map className="h-4 w-4" />
                    Minimapa
                  </button>
                </Panel>
              )}

              {somenteLeitura && (
                <Panel position="top-left">
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 shadow-sm">
                    <Lock className="h-3.5 w-3.5" />
                    Versão publicada — somente leitura. Use “Nova versão” para editar.
                  </div>
                </Panel>
              )}

              {!somenteLeitura && selecionados.length >= 2 && (
                <Panel position="top-center">
                  <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <span className="px-2 text-xs font-medium text-gray-500">
                      {selecionados.length} selecionados
                    </span>
                    <span className="mx-0.5 h-5 w-px bg-gray-200 dark:bg-gray-700" />
                    {BOTOES_ALINHAR.map(({ modo, rotulo, icone }) => (
                      <BotaoAlinhamento
                        key={modo}
                        rotulo={rotulo}
                        icone={icone}
                        onClick={() => mudar((f) => ({ ...f, nodes: alinharNos(f.nodes, modo) }))}
                      />
                    ))}
                    <span className="mx-0.5 h-5 w-px bg-gray-200 dark:bg-gray-700" />
                    {BOTOES_DISTRIBUIR.map(({ eixo, rotulo, icone }) => (
                      <BotaoAlinhamento
                        key={eixo}
                        rotulo={selecionados.length < 3 ? `${rotulo} (mínimo 3)` : rotulo}
                        icone={icone}
                        disabled={selecionados.length < 3}
                        onClick={() =>
                          mudar((f) => ({ ...f, nodes: distribuirNos(f.nodes, eixo) }))
                        }
                      />
                    ))}
                  </div>
                </Panel>
              )}

              <ViewportPortal>
                {guias.map((g, i) => (
                  <div
                    key={i}
                    className="pointer-events-none absolute bg-sonda-light-blue"
                    style={
                      g.eixo === 'x'
                        ? { left: g.posicao, top: g.inicio, width: 1, height: g.fim - g.inicio }
                        : { left: g.inicio, top: g.posicao, height: 1, width: g.fim - g.inicio }
                    }
                  />
                ))}
              </ViewportPortal>

              {!somenteLeitura && (
                <Panel position="bottom-center">
                  <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <BotaoFerramenta
                      rotulo="Selecionar (V) — segure Espaço para mover o canvas"
                      icone={MousePointer2}
                      ativo={modo === 'seta'}
                      onClick={() => setModo('seta')}
                    />
                    <BotaoFerramenta
                      rotulo="Mover o canvas (H)"
                      icone={Hand}
                      ativo={modo === 'mao'}
                      onClick={() => setModo('mao')}
                    />
                    <span className="mx-0.5 h-5 w-px bg-gray-200 dark:bg-gray-700" />
                    {PALETA.map(({ tipo, rotulo, icone }) => {
                      // Com algo selecionado, o clique troca o tipo; arrastar sempre adiciona.
                      const trocando = selecionados.length > 0 && tipo !== 'raia';
                      return (
                        <BotaoElemento
                          key={tipo}
                          tipo={tipo}
                          rotulo={rotulo}
                          icone={icone}
                          trocando={trocando}
                          ativo={trocando && selecionados.every((n) => n.type === tipo)}
                          onClick={() => (trocando ? trocarTipo(tipo) : adicionar(tipo))}
                        />
                      );
                    })}
                    <span className="mx-0.5 h-5 w-px bg-gray-200 dark:bg-gray-700" />
                    <BotaoFerramenta
                      rotulo="Desfazer (Ctrl+Z)"
                      icone={Undo2}
                      disabled={!podeDesfazer}
                      onClick={desfazer}
                    />
                    <BotaoFerramenta
                      rotulo="Refazer (Ctrl+Y)"
                      icone={Redo2}
                      disabled={!podeRefazer}
                      onClick={refazer}
                    />
                  </div>
                </Panel>
              )}

              <Panel position="top-right" className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white"
                  onClick={() => setPainelAberto((v) => !v)}
                  title={painelAberto ? 'Ocultar propriedades' : 'Mostrar propriedades'}
                >
                  {painelAberto ? (
                    <PanelRightClose className="h-4 w-4 mr-2" />
                  ) : (
                    <PanelRightOpen className="h-4 w-4 mr-2" />
                  )}
                  Propriedades
                  {!painelAberto && (noSelecionado || arestaSelecionada) && (
                    <span
                      className="ml-2 h-2 w-2 rounded-full bg-sonda-blue"
                      title="Há um elemento selecionado"
                    />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white"
                  onClick={() => setTelaCheia((v) => !v)}
                >
                  {telaCheia ? (
                    <Minimize2 className="h-4 w-4 mr-2" />
                  ) : (
                    <Maximize2 className="h-4 w-4 mr-2" />
                  )}
                  {telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}
                </Button>
              </Panel>
            </ReactFlow>

            {vazio && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="pointer-events-auto rounded-lg border border-dashed border-gray-300 bg-white/90">
                  <EmptyState
                    icon={<Workflow className="h-12 w-12 text-gray-400" />}
                    title="Fluxo ainda não desenhado"
                    description={
                      somenteLeitura
                        ? 'Crie uma nova versão do processo para desenhar o fluxo.'
                        : 'Arraste elementos da barra inferior para o canvas ou comece pelo evento de início.'
                    }
                    action={
                      !somenteLeitura && (
                        <Button
                          className="bg-sonda-blue hover:bg-sonda-dark-blue"
                          onClick={() =>
                            mudar(() => ({
                              nodes: [
                                raia(
                                  `raia-${crypto.randomUUID().slice(0, 8)}`,
                                  processo.donoCargoId,
                                  0,
                                  0,
                                  1000,
                                  220
                                ),
                                { ...criarNo('inicio', { x: 114, y: 110 }), selected: false },
                              ],
                              edges: [],
                            }))
                          }
                        >
                          <PlayCircle className="h-4 w-4 mr-2" />
                          Começar o fluxo
                        </Button>
                      )
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {painelAberto && (
            <ScrollArea className="w-[340px] shrink-0 border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              <PainelPropriedades
                processo={processo}
                processos={processos}
                cargos={cargos}
                noSelecionado={noSelecionado}
                arestaSelecionada={arestaSelecionada}
                somenteLeitura={somenteLeitura}
                onAlterarNo={alterarNo}
                onAlterarDoc={alterarDoc}
                onAlterarAresta={(id, rotulo) =>
                  mudar(
                    (f) => ({
                      ...f,
                      edges: f.edges.map((e) => (e.id === id ? { ...e, label: rotulo } : e)),
                    }),
                    `aresta:${id}:label`
                  )
                }
                onExcluirSelecionado={excluirSelecionado}
                onAlterarProcesso={onAlterarProcesso}
                onAbrirProcesso={onAbrirProcesso}
              />
            </ScrollArea>
          )}
        </div>
      </ContextoCriarProximo.Provider>
    </ContextoSomenteLeitura.Provider>
  );
}

export function EditorFluxo(props: EditorFluxoProps) {
  return (
    <ReactFlowProvider key={props.processo.id}>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
