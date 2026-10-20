// Nós customizados do editor de fluxo (notação BPMN simplificada) com as cores do design system.
import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { Handle, NodeResizer, Position, type NodeProps, type NodeTypes } from '@xyflow/react';
import { AlertTriangle, ArrowRight, Paperclip, Play, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NoFluxo, PosicaoRotulo } from '../mocks/fluxosProcessos';
import { DISTANCIA_PROXIMO, TAMANHO_TAREFA, validarRaci } from './utils';

export const ContextoSomenteLeitura = createContext(false);
/** Cria o próximo passo a partir da alça de um nó (null quando a criação não está disponível). */
export const ContextoCriarProximo = createContext<((id: string, lado: Position) => void) | null>(
  null
);

const LADOS = [Position.Top, Position.Right, Position.Bottom, Position.Left];

// Posicionamento da prévia do próximo passo em relação ao nó, por lado da alça.
const PREVIA_POR_LADO: Record<Position, { container: string; rotacao: string }> = {
  [Position.Right]: { container: 'left-full top-1/2 -translate-y-1/2 flex-row', rotacao: '' },
  [Position.Left]: {
    container: 'right-full top-1/2 -translate-y-1/2 flex-row-reverse',
    rotacao: 'rotate-180',
  },
  [Position.Bottom]: {
    container: 'top-full left-1/2 -translate-x-1/2 flex-col',
    rotacao: 'rotate-90',
  },
  [Position.Top]: {
    container: 'bottom-full left-1/2 -translate-x-1/2 flex-col-reverse',
    rotacao: '-rotate-90',
  },
};

function PreviaProximo({
  lado,
  onCriar,
  onEntrar,
  onSair,
}: {
  lado: Position;
  onCriar: () => void;
  onEntrar: () => void;
  onSair: () => void;
}) {
  const { container, rotacao } = PREVIA_POR_LADO[lado];
  const horizontal = lado === Position.Left || lado === Position.Right;

  return (
    <div
      className={cn('nodrag nopan absolute z-10 flex items-center', container)}
      onMouseEnter={onEntrar}
      onMouseLeave={onSair}
    >
      <div
        className="flex items-center justify-center"
        style={horizontal ? { width: DISTANCIA_PROXIMO } : { height: DISTANCIA_PROXIMO }}
      >
        <button
          type="button"
          title="Criar próximo passo"
          aria-label="Criar próximo passo"
          onClick={onCriar}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-sonda-blue text-white shadow-md transition-transform hover:scale-110 hover:bg-sonda-dark-blue"
        >
          <ArrowRight className={cn('h-3.5 w-3.5', rotacao)} />
        </button>
      </div>
      <button
        type="button"
        title="Criar próximo passo"
        onClick={onCriar}
        style={{ width: TAMANHO_TAREFA.w, height: TAMANHO_TAREFA.h }}
        className="flex items-center justify-center rounded-lg border-2 border-dashed border-sonda-light-blue bg-blue-50/70 text-sonda-light-blue transition-colors hover:bg-blue-100/80 hover:text-sonda-blue"
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}

function Alcas({ id, permiteProximo = true }: { id: string; permiteProximo?: boolean }) {
  const somenteLeitura = useContext(ContextoSomenteLeitura);
  const criarProximo = useContext(ContextoCriarProximo);
  const [ladoPrevia, setLadoPrevia] = useState<Position | null>(null);
  const fechar = useRef<number>();

  const mostrar = (lado: Position) => {
    window.clearTimeout(fechar.current);
    setLadoPrevia(lado);
  };
  const manter = () => window.clearTimeout(fechar.current);
  // Pequeno atraso para o mouse conseguir sair da alça e chegar no botão/prévia sem fechar.
  const esconder = () => {
    window.clearTimeout(fechar.current);
    fechar.current = window.setTimeout(() => setLadoPrevia(null), 150);
  };

  const comPrevia = !somenteLeitura && permiteProximo && !!criarProximo;

  return (
    <>
      {LADOS.map((lado) => (
        <Handle
          key={lado}
          id={lado}
          type="source"
          position={lado}
          isConnectable={!somenteLeitura}
          onMouseEnter={comPrevia ? () => mostrar(lado) : undefined}
          onMouseLeave={comPrevia ? esconder : undefined}
          className={cn(
            '!h-2.5 !w-2.5 !border-2 !border-white !bg-sonda-blue transition-opacity',
            somenteLeitura ? '!opacity-0' : 'opacity-0 group-hover:opacity-100',
            ladoPrevia === lado && '!opacity-100 !scale-125'
          )}
        />
      ))}
      {comPrevia && ladoPrevia && (
        <PreviaProximo
          lado={ladoPrevia}
          onEntrar={manter}
          onSair={esconder}
          onCriar={() => {
            setLadoPrevia(null);
            criarProximo(id, ladoPrevia);
          }}
        />
      )}
    </>
  );
}

const POSICAO_ROTULO: Record<PosicaoRotulo, string> = {
  acima: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5 text-center',
  abaixo: 'top-full left-1/2 -translate-x-1/2 mt-1.5 text-center',
  esquerda: 'right-full top-1/2 -translate-y-1/2 mr-2 text-right',
};

function RotuloExterno({ texto, posicao = 'acima' }: { texto: string; posicao?: PosicaoRotulo }) {
  if (!texto) return null;
  return (
    <div
      className={cn(
        'pointer-events-none absolute w-40 text-[11px] font-semibold leading-tight text-gray-700 dark:text-gray-200',
        POSICAO_ROTULO[posicao]
      )}
    >
      {texto}
    </div>
  );
}

const anelSelecao = (selected: boolean) => (selected ? 'ring-2 ring-sonda-blue ring-offset-2' : '');

function Circulo({
  id,
  selected,
  classe,
  children,
  data,
  permiteProximo,
}: {
  id: string;
  selected: boolean;
  classe: string;
  children?: ReactNode;
  data: NoFluxo['data'];
  permiteProximo?: boolean;
}) {
  return (
    <div className="group relative">
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full shadow-sm',
          classe,
          anelSelecao(selected)
        )}
      >
        {children}
      </div>
      <RotuloExterno texto={data.rotulo} posicao={data.posicaoRotulo ?? 'abaixo'} />
      <Alcas id={id} permiteProximo={permiteProximo} />
    </div>
  );
}

function NoInicio({ id, data, selected }: NodeProps<NoFluxo>) {
  return (
    <Circulo id={id} data={data} selected={selected} classe="border-2 border-green-500 bg-green-50">
      <Play className="h-4 w-4 fill-green-500 text-green-500" />
    </Circulo>
  );
}

function NoFim({ id, data, selected }: NodeProps<NoFluxo>) {
  return (
    <Circulo
      id={id}
      data={data}
      selected={selected}
      classe="border-[5px] border-red-500 bg-red-50"
      permiteProximo={false}
    />
  );
}

function NoLink({ id, data, selected }: NodeProps<NoFluxo>) {
  return (
    <Circulo id={id} data={data} selected={selected} classe="border-2 border-sonda-blue bg-blue-50">
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-sonda-blue bg-white">
        <ArrowRight className="h-4 w-4 text-sonda-blue" />
      </div>
    </Circulo>
  );
}

function Losango({
  id,
  data,
  selected,
  icone,
}: {
  id: string;
  data: NoFluxo['data'];
  selected: boolean;
  icone: ReactNode;
}) {
  return (
    <div className="group relative h-14 w-14">
      <div
        className={cn(
          'absolute inset-2 rotate-45 rounded-sm border-2 border-yellow-500 bg-yellow-50 shadow-sm',
          anelSelecao(selected)
        )}
      />
      <div className="absolute inset-0 flex items-center justify-center text-yellow-700">
        {icone}
      </div>
      <RotuloExterno texto={data.rotulo} posicao={data.posicaoRotulo ?? 'acima'} />
      <Alcas id={id} />
    </div>
  );
}

function NoDecisao({ id, data, selected }: NodeProps<NoFluxo>) {
  return (
    <Losango
      id={id}
      data={data}
      selected={selected}
      icone={<X className="h-6 w-6" strokeWidth={3} />}
    />
  );
}

function NoParalelo({ id, data, selected }: NodeProps<NoFluxo>) {
  return (
    <Losango
      id={id}
      data={data}
      selected={selected}
      icone={<Plus className="h-6 w-6" strokeWidth={3} />}
    />
  );
}

function NoTarefa({ id, data, selected }: NodeProps<NoFluxo>) {
  const anexos = data.doc?.anexos.length ?? 0;
  const pendenciaRaci = validarRaci({ data } as NoFluxo);

  return (
    <div
      className={cn(
        'group relative flex min-h-[72px] w-40 flex-col justify-center rounded-lg border-2 border-sonda-blue bg-white px-3 py-2 shadow-sm dark:bg-gray-900',
        anelSelecao(selected)
      )}
    >
      <p className="text-center text-xs font-medium leading-snug text-gray-900 dark:text-white">
        {data.rotulo}
      </p>
      {(anexos > 0 || pendenciaRaci) && (
        <div className="absolute -bottom-2.5 right-2 flex gap-1">
          {anexos > 0 && (
            <span className="flex items-center gap-0.5 rounded-full border border-gray-200 bg-white px-1.5 text-[10px] text-gray-600">
              <Paperclip className="h-2.5 w-2.5" />
              {anexos}
            </span>
          )}
          {pendenciaRaci && (
            <span
              title={pendenciaRaci}
              className="flex items-center rounded-full border border-red-200 bg-red-50 px-1 text-[10px] text-red-600"
            >
              <AlertTriangle className="h-2.5 w-2.5" />
            </span>
          )}
        </div>
      )}
      <Alcas id={id} />
    </div>
  );
}

function NoRaia({ data, selected }: NodeProps<NoFluxo>) {
  const somenteLeitura = useContext(ContextoSomenteLeitura);
  return (
    <>
      <NodeResizer
        isVisible={selected && !somenteLeitura}
        minWidth={400}
        minHeight={140}
        color="#2563eb"
      />
      <div
        className={cn(
          'flex h-full w-full overflow-hidden rounded-sm border border-gray-300 dark:border-gray-700',
          selected && 'border-sonda-blue'
        )}
      >
        <div className="flex w-10 shrink-0 items-center justify-center border-r border-gray-300 bg-blue-50 dark:border-gray-700 dark:bg-gray-800">
          <span className="rotate-180 whitespace-nowrap text-sm font-semibold text-sonda-blue [writing-mode:vertical-rl]">
            {data.rotulo}
          </span>
        </div>
        <div className="flex-1 bg-white/70 dark:bg-gray-900/40" />
      </div>
    </>
  );
}

export const TIPOS_NO: NodeTypes = {
  inicio: NoInicio,
  fim: NoFim,
  link: NoLink,
  tarefa: NoTarefa,
  decisao: NoDecisao,
  paralelo: NoParalelo,
  raia: NoRaia,
};
