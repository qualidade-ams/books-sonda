/**
 * De-para de Grupos: cada grupo de atendimento do Aranda ligado ao Grupo do Book
 * e ao catálogo, que decide o banco de cada hora (Modelagem_Fase3.md, seções 2.4 e 6).
 */

import type { Autoria } from '@/types/catalogo';

/**
 * modulo → banco do módulo ou do produto inteiro · produto → banco do produto
 * inteiro · solucao (grupos de serviço) e nao_se_aplica → sempre o Banco padrão.
 * Sem banco que cubra, o Banco padrão.
 */
export type ClassificacaoGrupo = 'modulo' | 'produto' | 'solucao' | 'nao_se_aplica';

/** Onde o grupo está ligado; tudo nulo = não se aplica */
export interface DestinoGrupo {
  solucaoId: string | null;
  produtoId: string | null;
  moduloId: string | null;
}

export interface MapeamentoGrupo extends Autoria, DestinoGrupo {
  id: string;
  grupoAranda: string;
  grupoBook: string;
  classificacao: ClassificacaoGrupo;
}

/** Consumo do grupo nos últimos 6 meses (coluna Uso) */
export interface UsoGrupo {
  apontamentos: number;
  tickets: number;
  /** Empresas com mais de um banco ativo que têm esse consumo */
  empresasMultiplos: string[];
}

/** Grupo que conta, com consumo nos últimos 12 meses e sem mapeamento ativo */
export interface GrupoNaoMapeado {
  grupoAranda: string;
  apontamentos: number;
  tickets: number;
  empresas: string[];
  /** YYYY-MM-DD */
  primeiraOcorrencia: string;
}

export interface MapeamentoInput {
  /** Ausente = mapeamento novo */
  id?: string;
  /** Só na criação: o grupo do Aranda não muda depois */
  grupoAranda: string;
  grupoBook: string;
  destino: DestinoGrupo;
}
