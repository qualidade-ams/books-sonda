/**
 * Catálogo em três níveis: Solução › Produto › Módulo (Modelagem_Fase3.md, seção 2).
 * A empresa contrata soluções; o escopo dos bancos marca produtos e módulos.
 */

export interface Autoria {
  atualizadoEm: string;
  /** auth.users.id de quem fez a última alteração (nulo em carga) */
  atualizadoPor: string | null;
}

export interface Solucao extends Autoria {
  id: string;
  /** COMEX, FISCAIS, FINANCEIRAS… Não muda depois de criado */
  codigo: string;
  nome: string;
  ordem: number;
  ativo: boolean;
}

export interface Produto extends Autoria {
  id: string;
  solucaoId: string;
  /** Gerado do nome na criação; não muda depois */
  codigo: string;
  nome: string;
  descricao: string | null;
  /** Ordem dentro da solução */
  ordem: number;
  ativo: boolean;
  /** Produto provisório da carga (P8): não entra no escopo de bancos novos */
  aClassificar: boolean;
}

export interface Modulo extends Autoria {
  id: string;
  produtoId: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
}

export interface Catalogo {
  solucoes: Solucao[];
  produtos: Produto[];
  modulos: Modulo[];
}

/** Banco ativo que tem o produto inteiro (moduloId nulo) ou o módulo no escopo */
export interface UsoEmBanco {
  produtoId: string;
  moduloId: string | null;
  bancoId: string;
  banco: string;
  empresa: string;
}

/** Para onde aponta cada valor de requerimentos.modulo (lista fixa no código) */
export interface ModuloRequerimento {
  id: string;
  moduloRequerimento: string;
  produtoId: string;
  /** Nulo = produto inteiro */
  moduloId: string | null;
}

export interface SolucaoInput {
  /** Ausente = solução nova */
  id?: string;
  /** Só na criação */
  codigo?: string;
  nome: string;
  ativo: boolean;
}

export interface ProdutoInput {
  id?: string;
  solucaoId: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
}

export interface ModuloInput {
  id?: string;
  produtoId: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
}
