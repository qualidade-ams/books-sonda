/**
 * Regras de contagem (Modelagem_Fase3.md, seção 5): o que entra no consumo dos
 * bancos. Linha única em regras_contagem e a lista codigos_resolucao_banco.
 */

import type { Autoria } from '@/types/catalogo';

export interface FiltrosContagem {
  /** caso_grupo / nome_grupo contém um destes textos (sem diferenciar maiúsculas) */
  gruposQueContam: string[];
  /** Tipos de chamado que contam (IM, RF, PM) */
  tiposChamado: string[];
  /** Apontamento com atividade interna não conta */
  ignorarAtividadeInterna: boolean;
  /** Item de configuração igual a um destes não conta */
  itensExcluidos: string[];
  /** Só tickets fechados, pela data de fechamento */
  soTicketsFechados: boolean;
}

export interface CodigoResolucao {
  /** Valor exato do Aranda: variações de espaço são códigos distintos */
  codigo: string;
  contaHoras: boolean;
  contaTickets: boolean;
  apontamentos6m: number;
  tickets6m: number;
}

/** Código que aparece no consumo e não está na lista: não conta no banco */
export interface CodigoSemRegra {
  codigo: string;
  apontamentos6m: number;
  tickets6m: number;
  /** YYYY-MM-DD */
  primeiraOcorrencia: string | null;
}

export interface RegrasContagem extends Autoria {
  filtros: FiltrosContagem;
  codigos: CodigoResolucao[];
  codigosSemRegra: CodigoSemRegra[];
}

export interface SalvarRegrasInput {
  motivo: string;
  /** Ausente = filtros não mudaram */
  filtros?: FiltrosContagem;
  /** Lista completa; ausente = códigos não mudaram */
  codigos?: Pick<CodigoResolucao, 'codigo' | 'contaHoras' | 'contaTickets'>[];
}
