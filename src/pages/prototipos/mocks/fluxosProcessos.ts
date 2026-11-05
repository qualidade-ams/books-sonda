// Dados do protótipo FluxosProcessos: fluxos reais do site de processos ARPO (Sonda - Sustentação),
// refeitos fluxo a fluxo em mocks/fluxosArpo. Nunca incluir nome ou email de pessoas.
import type { Edge, Node } from '@xyflow/react';
import { FLUXOS_INCIDENTE } from './fluxosArpo/g01Incidente';
import { FLUXOS_SOLICITACAO } from './fluxosArpo/g02Solicitacao';

export type PapelRaci = 'R' | 'A' | 'C' | 'I';
export type StatusProcesso = 'rascunho' | 'em_revisao' | 'publicado';
export type TipoNo =
  'inicio' | 'fim' | 'link' | 'intermediario' | 'tarefa' | 'decisao' | 'paralelo' | 'raia';
export type PosicaoRotulo = 'acima' | 'esquerda' | 'direita' | 'abaixo';

export interface CargoProcesso {
  id: string;
  nome: string;
}

export interface AnexoEtapa {
  id: string;
  nome: string;
  tamanho: string;
}

export interface DocumentacaoEtapa {
  descricao: string;
  raci: Record<string, PapelRaci>;
  prazo: string;
  entradas: string[];
  saidas: string[];
  sistemas: string[];
  anexos: AnexoEtapa[];
}

export interface DadosNo {
  [chave: string]: unknown;
  rotulo: string;
  posicaoRotulo?: PosicaoRotulo;
  processoVinculadoId?: string;
  cargoId?: string;
  doc?: DocumentacaoEtapa;
}

export type NoFluxo = Node<DadosNo>;
export type ArestaFluxo = Edge;

export interface FluxoProcesso {
  nodes: NoFluxo[];
  edges: ArestaFluxo[];
}

export interface VersaoProcesso {
  versao: string;
  status: StatusProcesso;
  autor: string;
  data: string;
  observacao: string;
}

export interface Processo {
  id: string;
  codigo: string;
  nome: string;
  grupoId: string;
  status: StatusProcesso;
  versao: string;
  donoCargoId: string;
  objetivo: string;
  escopo: string;
  gatilho: string;
  indicadores: string[];
  regras: string[];
  atualizadoEm: string;
  atualizadoPor: string;
  versoes: VersaoProcesso[];
}

export interface GrupoArvore {
  id: string;
  nome: string;
  filhos: GrupoArvore[];
}

export { CARGOS, conexao, docVazia, ESTILO_ARESTA, raia } from './fluxosArpo/base';
export { ARVORE_GRUPOS, PROCESSOS } from './fluxosArpo/arvore';

export const FLUXOS_INICIAIS: Record<string, FluxoProcesso> = {
  ...FLUXOS_INCIDENTE,
  ...FLUXOS_SOLICITACAO,
};
