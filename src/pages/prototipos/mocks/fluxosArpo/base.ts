// Funções de montagem dos fluxos do protótipo FluxosProcessos.
// Os fluxos importados do site ARPO usam as coordenadas do centro de cada objeto na imagem original;
// as funções convertem para a tela do protótipo, com escala para acomodar as caixas um pouco maiores.
import { MarkerType } from '@xyflow/react';
import type {
  ArestaFluxo,
  CargoProcesso,
  DadosNo,
  DocumentacaoEtapa,
  NoFluxo,
  Processo,
} from '../fluxosProcessos';
import { CARGOS_ARPO } from './cargos';

export const CARGOS: CargoProcesso[] = CARGOS_ARPO;

export function docVazia(parcial: Partial<DocumentacaoEtapa> = {}): DocumentacaoEtapa {
  return {
    descricao: '',
    raci: {},
    prazo: '',
    entradas: [],
    saidas: [],
    sistemas: [],
    anexos: [],
    ...parcial,
  };
}

export const raia = (
  id: string,
  cargoId: string,
  x: number,
  y: number,
  width: number,
  height: number
): NoFluxo => ({
  id,
  type: 'raia',
  position: { x, y },
  width,
  height,
  zIndex: -1,
  draggable: false,
  data: { rotulo: CARGOS.find((c) => c.id === cargoId)?.nome ?? 'Nova raia', cargoId },
});

export const ESTILO_ARESTA: Partial<ArestaFluxo> = {
  type: 'smoothstep',
  markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
  labelStyle: { fontSize: 11, fontWeight: 600, fill: '#374151' },
  labelBgStyle: { fill: '#ffffff' },
  labelBgPadding: [4, 2],
  labelBgBorderRadius: 4,
};

export const conexao = (
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string,
  label?: string
): ArestaFluxo => ({
  ...ESTILO_ARESTA,
  id: `e-${source}-${target}`,
  source,
  sourceHandle,
  target,
  targetHandle,
  label,
});

// ---------- Conversão das coordenadas do ARPO ----------

const ESCALA = 1.15;
/** Borda esquerda do pool e largura do cabeçalho da raia na imagem do ARPO. */
const POOL_X = 23;
const CABECALHO_ARPO = 84;
const CABECALHO_RAIA = 40;
const INICIO_CONTEUDO = POOL_X + CABECALHO_ARPO;

const px = (x: number) => CABECALHO_RAIA + (x - INICIO_CONTEUDO) * ESCALA;
const py = (y: number) => (y - POOL_X) * ESCALA;

const TAMANHO: Record<'tarefa' | 'decisao' | 'paralelo' | 'evento', [number, number]> = {
  tarefa: [160, 72],
  decisao: [56, 56],
  paralelo: [56, 56],
  evento: [48, 48],
};

function no(
  type: NoFluxo['type'],
  tamanho: keyof typeof TAMANHO,
  id: string,
  cx: number,
  cy: number,
  rotulo: string,
  doc: Partial<DocumentacaoEtapa>,
  extra: Partial<DadosNo>
): NoFluxo {
  const [w, h] = TAMANHO[tamanho];
  return {
    id,
    type,
    position: { x: Math.round(px(cx) - w / 2), y: Math.round(py(cy) - h / 2) },
    data: { rotulo, doc: docVazia(doc), ...extra },
  };
}

type Doc = Partial<DocumentacaoEtapa>;
type Extra = Partial<DadosNo>;

export const tarefa = (id: string, cx: number, cy: number, rotulo: string, doc: Doc = {}) =>
  no('tarefa', 'tarefa', id, cx, cy, rotulo, doc, {});

export const decisao = (
  id: string,
  cx: number,
  cy: number,
  rotulo: string,
  doc: Doc = {},
  extra: Extra = {}
) => no('decisao', 'decisao', id, cx, cy, rotulo, doc, { posicaoRotulo: 'acima', ...extra });

export const paralelo = (
  id: string,
  cx: number,
  cy: number,
  rotulo: string,
  doc: Doc = {},
  extra: Extra = {}
) => no('paralelo', 'paralelo', id, cx, cy, rotulo, doc, { posicaoRotulo: 'acima', ...extra });

const evento =
  (type: 'inicio' | 'fim' | 'link' | 'intermediario') =>
  (id: string, cx: number, cy: number, rotulo: string, doc: Doc = {}, extra: Extra = {}) =>
    no(type, 'evento', id, cx, cy, rotulo, doc, { posicaoRotulo: 'abaixo', ...extra });

export const inicio = evento('inicio');
export const fim = evento('fim');
export const link = evento('link');
export const intermediario = evento('intermediario');

/** Raia ocupando a faixa vertical y1–y2 da imagem, na largura total do pool. */
export const raiaArpo = (
  id: string,
  cargoId: string,
  y1: number,
  y2: number,
  larguraImagem: number
): NoFluxo =>
  raia(
    id,
    cargoId,
    0,
    Math.round(py(y1)),
    Math.round(CABECALHO_RAIA + (larguraImagem - POOL_X - INICIO_CONTEUDO) * ESCALA),
    Math.round((y2 - y1) * ESCALA)
  );

const IMPORTACAO = '2026-11-03T12:00:00Z';
const AUTOR_IMPORTACAO = 'Importado do ARPO';

/** Processo do site ARPO: só código, nome e grupo existem lá; o restante fica para preencher. */
export const processoArpo = (
  id: string,
  codigo: string,
  nome: string,
  grupoId: string,
  donoCargoId = ''
): Processo => ({
  id,
  codigo,
  nome,
  grupoId,
  status: 'publicado',
  versao: '1.0',
  donoCargoId,
  objetivo: '',
  escopo: '',
  gatilho: '',
  indicadores: [],
  regras: [],
  atualizadoEm: IMPORTACAO,
  atualizadoPor: AUTOR_IMPORTACAO,
  versoes: [
    {
      versao: '1.0',
      status: 'publicado',
      autor: AUTOR_IMPORTACAO,
      data: IMPORTACAO,
      observacao: 'Importado do site de processos ARPO',
    },
  ],
});
